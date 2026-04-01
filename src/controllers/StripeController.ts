import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/PaymentService';
import * as Sentry from '@sentry/react-native';

export class StripeController {
  private paymentService: PaymentService;
  private stripe: Stripe;

  constructor() {
    this.paymentService = PaymentService.getInstance();
    // A STRIPE_SECRET_KEY deve ser configurada apenas no servidor.
    // Este controller parece ser parte de um mock ou implementação híbrida.
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock_secret_key', {
      apiVersion: '2026-02-25.clover',
    });
  }

  createCustomer = async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      const customer = await this.stripe.customers.create({
        email,
        name,
      });
      return res.json({ customerId: customer.id });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  };

  createPaymentMethod = async (req: Request, res: Response) => {
    try {
      const { card, billingDetails } = req.body;
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: card.number,
          exp_month: card.expMonth,
          exp_year: card.expYear,
          cvc: card.cvc,
        },
        billing_details: billingDetails,
      });
      return res.json({ paymentMethodId: paymentMethod.id });
    } catch (error) {
      console.error('Erro ao criar método de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao criar método de pagamento' });
    }
  };

  createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'brl', metadata, customerId, orderId } = req.body;
      const userId = req.user?.id;

      if (!orderId) {
        return res.status(400).json({ error: 'orderId é obrigatório para o transfer_group' });
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        metadata: { userId, orderId, ...(metadata || {}) },
        customer: customerId,
        transfer_group: orderId, // Crucial para o modelo Separate Charges and Transfers
      });

      return res.json({ id: paymentIntent.id, clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      Sentry.captureException(error, {
        tags: { service: 'Stripe', action: 'createPaymentIntent' },
        extra: { body: req.body, user: req.user }
      });
      return res.status(500).json({ error: 'Erro ao processar pagamento', details: error instanceof Error ? error.message : String(error) });
    }
  };

  confirmPayment = async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, paymentMethodId } = req.body;
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      if (paymentIntent.status === 'succeeded') {
        const receiptUrl =
          typeof paymentIntent.latest_charge === 'string'
            ? ''
            : paymentIntent.latest_charge?.receipt_url || '';

        await this.paymentService.savePayment({
          userId: req.user?.id!,
          amount: paymentIntent.amount,
          paymentMethod: 'card',
          status: 'completed',
          paymentId: paymentIntent.id,
        });

        return res.json({
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          receiptUrl,
        });
      }

      return res.status(400).json({ error: 'Pagamento não confirmado' });
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      return res.status(500).json({ error: 'Erro ao confirmar pagamento' });
    }
  };

  createPixPayment = async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      const userId = req.user?.id;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: 'brl',
        payment_method_types: ['pix'],
        metadata: { userId },
      });

      await this.stripe.paymentMethods.attach(paymentIntent.payment_method as string);

      const pixDetails = await this.stripe.paymentIntents.retrieve(paymentIntent.id, {
        expand: ['payment_method'],
      });

      return res.json({
        qrCode: (pixDetails as any).payment_method?.pix?.qr_code,
        expiresAt: (pixDetails as any).payment_method?.pix?.expires_at,
      });
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      return res.status(500).json({ error: 'Erro ao gerar QR Code PIX' });
    }
  };

  checkPixStatus = async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      if (paymentIntent.status === 'succeeded') {
        await this.paymentService.savePayment({
          userId: req.user?.id!,
          amount: paymentIntent.amount,
          paymentMethod: 'pix',
          status: 'completed',
          paymentId: paymentIntent.id,
        });
      }

      return res.json({ status: paymentIntent.status });
    } catch (error) {
      console.error('Erro ao verificar status do PIX:', error);
      return res.status(500).json({ error: 'Erro ao verificar status' });
    }
  };

  listPaymentMethods = async (req: Request, res: Response) => {
    try {
      const customerId = req.query.customerId as string;
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return res.json({ paymentMethods: paymentMethods.data });
    } catch (error) {
      console.error('Erro ao listar métodos de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao listar métodos de pagamento' });
    }
  };

  addPaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethodId, customerId } = req.body;

      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return res.json(paymentMethod);
    } catch (error) {
      console.error('Erro ao adicionar método de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao adicionar método de pagamento' });
    }
  };

  splitPayment = async (req: Request, res: Response) => {
    try {
      const { orderId, amount, deliveryFee, producerStripeAccountId, deliveryPersonStripeAccountId } =
        req.body;
      const productAmount = amount - deliveryFee;
      const appFee = Math.round(productAmount * 0.1);
      const producerAmount = productAmount - appFee;

      const producerTransfer = await this.stripe.transfers.create({
        amount: producerAmount,
        currency: 'brl',
        destination: producerStripeAccountId,
        transfer_group: orderId,
      });

      const deliveryTransfer = await this.stripe.transfers.create({
        amount: deliveryFee,
        currency: 'brl',
        destination: deliveryPersonStripeAccountId,
        transfer_group: orderId,
      });

      return res.json({
        appTransferId: '',
        producerTransferId: producerTransfer.id,
        deliveryPersonTransferId: deliveryTransfer.id,
      });
    } catch (error) {
      console.error('Erro ao processar split:', error);
      return res.status(500).json({ error: 'Erro ao processar split' });
    }
  };

  removePaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.params;
      await this.stripe.paymentMethods.detach(paymentMethodId);

      return res.json({ message: 'Método de pagamento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover método de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao remover método de pagamento' });
    }
  };

  createConnectedAccount = async (req: Request, res: Response) => {
    try {
      const { email, type = 'express' } = req.body;
      
      const account = await this.stripe.accounts.create({
        type: type as Stripe.AccountCreateParams.Type,
        country: 'BR',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      
      return res.json({ accountId: account.id });
    } catch (error) {
      console.error('Erro ao criar Connected Account:', error);
      return res.status(500).json({ error: 'Erro ao criar conta conectada' });
    }
  };

  createAccountLink = async (req: Request, res: Response) => {
    try {
      const { accountId, refreshUrl, returnUrl } = req.body;
      
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      
      return res.json({ url: accountLink.url });
    } catch (error) {
      console.error('Erro ao criar Account Link:', error);
      return res.status(500).json({ error: 'Erro ao gerar link de onboarding' });
    }
  };

  reverseTransfer = async (req: Request, res: Response) => {
    try {
      const { transferId, amount, reason } = req.body;
      
      const params: any = {
        description: reason || 'Reversão solicitada',
      };
      
      if (amount) {
        params.amount = Math.round(amount);
      }
      
      const reversal = await this.stripe.transfers.createReversal(transferId, params);
      return res.json({ reversalId: reversal.id });
    } catch (error) {
      console.error('Erro ao reverter transferência:', error);
      return res.status(500).json({ error: 'Erro ao reverter transferência' });
    }
  };
}
