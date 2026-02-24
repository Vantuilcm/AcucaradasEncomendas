import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/PaymentService';

export class StripeController {
  private paymentService: PaymentService;
  private stripe: Stripe;

  constructor() {
    this.paymentService = PaymentService.getInstance();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
  }

  createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'brl' } = req.body;
      const userId = req.user?.id;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe trabalha com centavos
        currency,
        metadata: { userId },
      });

      return res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Erro ao criar PaymentIntent:', error);
      return res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
  };

  confirmPayment = async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        await this.paymentService.savePayment({
          userId: req.user?.id!,
          amount: paymentIntent.amount / 100,
          paymentMethod: 'card',
          status: 'completed',
          paymentId: paymentIntent.id,
        });

        return res.json({ status: 'success' });
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
        amount: Math.round(amount * 100),
        currency: 'brl',
        payment_method_types: ['pix'],
        metadata: { userId },
      });

      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentIntent.payment_method as string,
        {
          payment_method_type: 'pix',
        }
      );

      const pixDetails = await this.stripe.paymentIntents.retrieve(paymentIntent.id, {
        expand: ['payment_method'],
      });

      return res.json({
        qrCode: pixDetails.payment_method?.pix?.qr_code,
        expiresAt: pixDetails.payment_method?.pix?.expires_at,
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
          amount: paymentIntent.amount / 100,
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
      const userId = req.user?.id;
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: userId,
        type: 'card',
      });

      return res.json(paymentMethods.data);
    } catch (error) {
      console.error('Erro ao listar métodos de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao listar métodos de pagamento' });
    }
  };

  addPaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user?.id;

      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: userId,
      });

      return res.json(paymentMethod);
    } catch (error) {
      console.error('Erro ao adicionar método de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao adicionar método de pagamento' });
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
}
