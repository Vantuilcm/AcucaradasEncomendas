import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

// Mock do Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      list: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
    },
  }));
});

// Mock do PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

describe('Stripe Routes', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockStripe: jest.Mocked<Stripe>;
  let authToken: string;

  beforeAll(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockStripe = new Stripe('test_key') as jest.Mocked<Stripe>;
    // Gerar token de autenticação para os testes
    authToken = 'test_auth_token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /stripe/create-payment-intent', () => {
    it('deve criar um PaymentIntent com sucesso', async () => {
      const mockPaymentIntent = {
        client_secret: 'test_secret',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/stripe/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ clientSecret: 'test_secret' });
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
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue({
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/stripe/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentIntentId: 'pi_123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
    });
  });

  describe('POST /stripe/create-pix-payment', () => {
    it('deve criar um pagamento PIX com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        payment_method: 'pm_123',
      };

      const mockPixDetails = {
        payment_method: {
          pix: {
            qr_code: 'pix_qr_code',
            expires_at: 1234567890,
          },
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPixDetails);
      mockStripe.paymentMethods.attach.mockResolvedValue({});

      const response = await request(app)
        .post('/stripe/create-pix-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        qrCode: 'pix_qr_code',
        expiresAt: 1234567890,
      });
    });
  });

  describe('GET /stripe/check-pix-status/:paymentId', () => {
    it('deve verificar status do PIX com sucesso', async () => {
      const mockPaymentIntent = {
        status: 'succeeded',
        amount: 10000,
        id: 'pi_123',
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue({
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'pix',
        status: 'completed',
        paymentId: 'pi_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get('/stripe/check-pix-status/pi_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'succeeded' });
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
        .get('/stripe/payment-methods')
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
        .send({ paymentMethodId: 'pm_123' });

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
});
