import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/PaymentService';
import { NotificationService } from '../services/NotificationService';
import { OrderService } from '../services/OrderService';
import LoggingService from '../services/LoggingService';

export class StripeController {
  private paymentService: PaymentService;
  private notificationService: NotificationService;
  private orderService: OrderService;
  private stripe: Stripe;
  private logger = LoggingService.getInstance();

  constructor() {
    this.paymentService = PaymentService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.orderService = new OrderService();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-15.clover' as any,
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
      this.logger.error('Erro ao criar cliente no Stripe:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  };

  createTransfer = async (req: Request, res: Response) => {
    try {
      const { amount, currency, destination, transferGroup } = req.body;
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency,
        destination,
        transfer_group: transferGroup,
      });

      return res.json(transfer);
    } catch (error) {
      this.logger.error('Erro ao criar transferência no Stripe:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao processar transferência' });
    }
  };

  createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { amount, currency = 'brl', metadata = {} } = req.body;
      const userId = (req as any).user?.id;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe trabalha com centavos
        currency,
        metadata: { ...metadata, userId },
      });

      return res.json({ id: paymentIntent.id, clientSecret: paymentIntent.client_secret });
    } catch (error) {
      this.logger.error('Erro ao criar PaymentIntent:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
  };

  getPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
      return res.json(paymentIntent);
    } catch (error) {
      this.logger.error('Erro ao buscar PaymentIntent:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao buscar intenção de pagamento' });
    }
  };

  confirmPayment = async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        await this.paymentService.savePayment({
          userId: (paymentIntent as any).metadata?.userId || (req as any).user?.id!,
          amount: paymentIntent.amount / 100,
          paymentMethod: 'card',
          status: 'completed',
          paymentId: paymentIntent.id,
        });

        return res.json({ status: 'success' });
      }

      return res.status(400).json({ error: 'Pagamento não confirmado' });
    } catch (error) {
      this.logger.error('Erro ao confirmar pagamento:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao confirmar pagamento' });
    }
  };

  createPixPayment = async (req: Request, res: Response) => {
    try {
      const { amount, metadata = {} } = req.body;
      const userId = (req as any).user?.id;

      // 1. Criar a intenção de pagamento para PIX
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Converte para centavos
        currency: 'brl',
        payment_method_types: ['pix'],
        metadata: { ...metadata, userId },
        payment_method_data: {
          type: 'pix',
        },
        confirm: true, // Confirma imediatamente para gerar as instruções de próximo passo
      });

      // 2. Extrair o QR Code e o código "copia e cola"
      const nextAction = paymentIntent.next_action;
      if (!nextAction || !nextAction.pix_display_qr_code) {
        throw new Error('Falha ao gerar QR Code PIX');
      }

      return res.json({
        paymentIntentId: paymentIntent.id,
        qrCode: nextAction.pix_display_qr_code.data,
        pixCode: nextAction.pix_display_qr_code.image_url_png, // Stripe retorna imagem ou dados
        expiresAt: nextAction.pix_display_qr_code.expires_at,
      });
    } catch (error) {
      this.logger.error('Erro ao criar pagamento PIX:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao gerar QR Code PIX' });
    }
  };

  checkPaymentStatus = async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

      if (paymentIntent.status === 'succeeded') {
        const orderId = paymentIntent.metadata.orderId;
        const userId = paymentIntent.metadata.userId;

        // Verificar se já salvamos esse pagamento para evitar duplicidade
        const existingPayment = await this.paymentService.getPaymentByPaymentId(paymentIntent.id);
        
        if (!existingPayment || existingPayment.status !== 'completed') {
          const paymentMethod = paymentIntent.payment_method_types[0] === 'pix' ? 'pix' : 'card';
          
          await this.paymentService.savePayment({
            userId: userId || (req as any).user?.id!,
            amount: paymentIntent.amount / 100,
            paymentMethod: paymentMethod,
            status: 'completed',
            paymentId: paymentIntent.id,
          });

          if (orderId) {
            const order = await this.orderService.getOrderById(orderId);
            if (order) {
              const amount = paymentIntent.amount / 100;
              const details: any = (order as any).paymentDetails || {};
              const deliveryFee = Number(details.deliveryFee ?? (order as any).deliveryFee ?? 0);
              const platformMaintenanceFee = Number(details.platformMaintenanceFee ?? 0);
              const productAmount = Number(details.productAmount ?? (Number((order as any).totalAmount ?? 0) - deliveryFee - platformMaintenanceFee));
              const totalAmount = Number(details.totalAmount ?? (order as any).totalAmount ?? amount);
              const appFee = Number(details.appFee ?? 0);
              const producerAmount = Number(details.producerAmount ?? 0);

              await this.orderService.finalizeOrderPayment(orderId, {
                paymentMethod: 'pix',
                paymentIntentId: paymentIntent.id,
                paymentMethodId: paymentIntent.payment_method as string,
                receiptUrl: (paymentIntent as any).charges?.data?.[0]?.receipt_url || '',
                productAmount,
                deliveryFee,
                platformMaintenanceFee,
                appFee,
                producerAmount,
                totalAmount,
              });

              if (userId) {
                await this.notificationService.createNotification({
                  userId,
                  type: 'payment_received',
                  title: 'Pagamento confirmado',
                  message: `Seu pagamento de R$ ${amount.toFixed(2)} para o pedido #${orderId.substring(0, 8)} foi confirmado.`,
                  priority: 'high',
                  read: false,
                  data: { orderId, amount }
                });
              }
              if (order.producerId) {
                await this.notificationService.createNotification({
                  userId: order.producerId,
                  type: 'new_order',
                  title: 'Novo pedido confirmado',
                  message: `Pagamento do pedido #${orderId.substring(0, 8)} confirmado.`,
                  priority: 'high',
                  read: false,
                  data: { orderId, customerName: order.customerName || 'Cliente' }
                });
              }
            }
          }
        }
      }

      return res.json({ status: paymentIntent.status });
    } catch (error) {
      this.logger.error('Erro ao verificar status do pagamento:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao verificar status' });
    }
  };

  listPaymentMethods = async (req: Request, res: Response) => {
    try {
      const { customerId } = req.query;
      
      if (!customerId) {
        return res.status(400).json({ error: 'customerId é obrigatório' });
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId as string,
        type: 'card',
      });

      return res.json(paymentMethods.data);
    } catch (error) {
      this.logger.error('Erro ao listar métodos de pagamento:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao listar métodos de pagamento' });
    }
  };

  addPaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethodId, customerId } = req.body;

      if (!customerId || !paymentMethodId) {
        return res.status(400).json({ error: 'customerId e paymentMethodId são obrigatórios' });
      }

      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return res.json(paymentMethod);
    } catch (error) {
      this.logger.error('Erro ao adicionar método de pagamento:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao adicionar método de pagamento' });
    }
  };

  removePaymentMethod = async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.params;
      await this.stripe.paymentMethods.detach(paymentMethodId);

      return res.json({ message: 'Método de pagamento removido com sucesso' });
    } catch (error) {
      this.logger.error('Erro ao remover método de pagamento:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao remover método de pagamento' });
    }
  };

  reconcileOrders = async (req: Request, res: Response) => {
    try {
      const result = await this.orderService.reconcilePendingOrders();
      return res.json({ 
        message: 'Reconciliação concluída', 
        reconciled: result.reconciled, 
        failed: result.failed 
      });
    } catch (error) {
      this.logger.error('Erro na reconciliação de pedidos:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao reconciliar pedidos' });
    }
  };

  handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (!sig || !endpointSecret) {
        throw new Error('Webhook secret ou signature ausente');
      }
      event = this.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      this.logger.error('Erro na verificação do Webhook:', err instanceof Error ? err : new Error(String(err)));
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Manipular o evento
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const orderId = paymentIntent.metadata.orderId;

          this.logger.info(`Pagamento bem-sucedido: ${paymentIntent.id} (Pedido: ${orderId})`);
          
          // 1. Atualizar status do pagamento no DB
          await this.paymentService.updatePaymentStatus(paymentIntent.id, 'completed');
          
          // 2. Finalizar o pedido (atualizar status e enviar notificações ricas)
          if (orderId) {
            const metadata = paymentIntent.metadata;
            await this.orderService.finalizeOrderPayment(orderId, {
              paymentMethod: paymentIntent.payment_method_types?.[0] || 'credit_card',
              paymentIntentId: paymentIntent.id,
              paymentMethodId: paymentIntent.payment_method as string,
              receiptUrl: (paymentIntent as any).charges?.data[0]?.receipt_url || '',
              productAmount: Number(metadata.productAmount || 0),
              deliveryFee: Number(metadata.deliveryFee || 0),
              platformMaintenanceFee: Number(metadata.platformMaintenanceFee || 0),
              appFee: Number(metadata.appFee || 0),
              producerAmount: Number(metadata.producerAmount || 0),
              totalAmount: paymentIntent.amount / 100,
            });
          }
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.warn(`Pagamento falhou: ${paymentIntent.id}`);
          
          await this.paymentService.updatePaymentStatus(paymentIntent.id, 'failed');
          break;
        }
        default:
          this.logger.info(`Evento não tratado: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      this.logger.error('Erro ao processar evento do Webhook:', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  };
}
