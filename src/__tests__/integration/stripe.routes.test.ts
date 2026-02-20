import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import Stripe from 'stripe';

const mockPaymentService: any = {
  savePayment: jest.fn(),
  getPaymentByPaymentId: jest.fn(),
  updatePaymentStatus: jest.fn(),
};

const mockNotificationService: any = {
  createNotification: jest.fn(),
};

const mockOrderService: any = {
  getOrderById: jest.fn(),
  reconcilePendingOrders: jest.fn(),
  finalizeOrderPayment: jest.fn(),
};

// Mocks devem ser definidos antes de importar o app
jest.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      list: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    }
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockStripe),
  };
});

jest.mock('../../services/PaymentService', () => {
  return {
    __esModule: true,
    PaymentService: {
      getInstance: jest.fn(() => mockPaymentService),
    },
  };
});

jest.mock('../../services/NotificationService', () => {
  return {
    __esModule: true,
    NotificationService: {
      getInstance: jest.fn(() => mockNotificationService),
    },
  };
});

jest.mock('../../services/OrderService', () => {
  return {
    __esModule: true,
    OrderService: jest.fn().mockImplementation(() => mockOrderService),
  };
});

jest.mock('../../services/LoggingService', () => {
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      })),
    },
  };
});

jest.mock('../../utils/robust-auth', () => {
  const authMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req?.headers?.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    req.user = { id: 'user123' };
    return next();
  };

  return {
    __esModule: true,
    authMiddleware,
  };
});

let app: any;

describe('Stripe Routes', () => {
  let mockStripe: any;
  let authToken: string;

  beforeAll(() => {
    mockStripe = new Stripe('test_key');
    // Gerar token de autenticação para os testes
    authToken = 'test_auth_token';

    const express = require('express');
    const stripeRouter = require('../../routes/stripe.routes').default;
    app = express();
    app.use(express.json());
    app.use('/stripe', stripeRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /stripe/create-payment-intent', () => {
    it('deve criar um PaymentIntent com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'test_secret',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/stripe/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 'pi_123', clientSecret: 'test_secret' });
    });

    it('deve retornar erro quando não autenticado', async () => {
      const response = await request(app)
        .post('/stripe/create-payment-intent')
        .send({ amount: 100 });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /stripe/confirm-payment', () => {
    it('deve confirmar um pagamento com sucesso', async () => {
      const mockPaymentIntent = {
        status: 'succeeded',
        amount: 10000,
        id: 'pi_123',
        metadata: { userId: 'user123' },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPaymentService.savePayment.mockResolvedValue({
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId: 'pi_123',
      });

      const response = await request(app)
        .post('/stripe/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentIntentId: 'pi_123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(mockPaymentService.savePayment).toHaveBeenCalled();
    });
  });

  describe('POST /stripe/create-pix-payment', () => {
    it('deve criar um pagamento PIX com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        next_action: {
          pix_display_qr_code: {
            data: 'pix_qr_code',
            image_url_png: 'https://example.com/pix.png',
            expires_at: 1234567890,
          },
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/stripe/create-pix-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        paymentIntentId: 'pi_123',
        qrCode: 'pix_qr_code',
        pixCode: 'https://example.com/pix.png',
        expiresAt: 1234567890,
      });
    });
  });

  describe('GET /stripe/check-payment-status/:paymentId', () => {
    it('deve verificar status do pagamento com sucesso', async () => {
      const mockPaymentIntent = {
        status: 'succeeded',
        amount: 10000,
        id: 'pi_123',
        payment_method_types: ['pix'],
        payment_method: 'pm_pix_123',
        metadata: {
          orderId: 'order_123',
          userId: 'user123',
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPaymentService.getPaymentByPaymentId.mockResolvedValue(null);
      mockPaymentService.savePayment.mockResolvedValue({
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'pix',
        status: 'completed',
        paymentId: 'pi_123',
      });
      mockOrderService.getOrderById.mockResolvedValue({
        id: 'order_123',
        producerId: 'producer_123',
        customerName: 'Cliente',
        totalAmount: 100,
        deliveryFee: 10,
        paymentDetails: {
          productAmount: 80,
          deliveryFee: 10,
          platformMaintenanceFee: 2,
          appFee: 5,
          producerAmount: 75,
          totalAmount: 100,
        },
      });
      mockNotificationService.createNotification.mockResolvedValue({ id: 'notif_123' });

      const response = await request(app)
        .get('/stripe/check-payment-status/pi_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'succeeded' });
      expect(mockPaymentService.savePayment).toHaveBeenCalled();
      expect(mockOrderService.finalizeOrderPayment).toHaveBeenCalled();
    });
  });

  describe('GET /stripe/payment-intent/:id', () => {
    it('deve buscar um PaymentIntent pelo ID com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 10000,
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .get('/stripe/payment-intent/pi_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPaymentIntent);
    });
  });

  describe('GET /stripe/payment-methods', () => {
    it('deve listar métodos de pagamento com sucesso', async () => {
      const mockPaymentMethods = {
        data: [
          { id: 'pm_1', type: 'card' },
          { id: 'pm_2', type: 'card' },
        ],
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const response = await request(app)
        .get('/stripe/payment-methods?customerId=cus_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPaymentMethods.data);
    });
  });

  describe('POST /stripe/payment-methods', () => {
    it('deve adicionar método de pagamento com sucesso', async () => {
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
      };

      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const response = await request(app)
        .post('/stripe/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentMethodId: 'pm_123', customerId: 'cus_123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPaymentMethod);
    });
  });

  describe('DELETE /stripe/payment-methods/:paymentMethodId', () => {
    it('deve remover método de pagamento com sucesso', async () => {
      mockStripe.paymentMethods.detach.mockResolvedValue({});

      const response = await request(app)
        .delete('/stripe/payment-methods/pm_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Método de pagamento removido com sucesso',
      });
    });
  });

  describe('POST /stripe/reconcile-orders', () => {
    it('deve reconciliar pedidos pendentes com sucesso', async () => {
      mockOrderService.reconcilePendingOrders.mockResolvedValue({ reconciled: 1, failed: 0 });

      const response = await request(app)
        .post('/stripe/reconcile-orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reconciled');
      expect(response.body).toHaveProperty('failed');
    });

    it('deve retornar erro 401 quando não autenticado', async () => {
      const response = await request(app)
        .post('/stripe/reconcile-orders');

      expect(response.status).toBe(401);
    });
  });
});
