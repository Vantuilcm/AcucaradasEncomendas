import { Request, Response } from 'express';
import { StripeController } from '../../controllers/StripeController';
import { PaymentService } from '../../services/PaymentService';
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

describe('StripeController', () => {
  let controller: StripeController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockPaymentService: jest.Mocked<PaymentService>;

  beforeEach(() => {
    mockPaymentService = PaymentService.getInstance() as jest.Mocked<PaymentService>;

    controller = new StripeController();
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('createPaymentIntent', () => {
    it('deve criar um PaymentIntent com sucesso', async () => {
      const mockPaymentIntent = {
        client_secret: 'test_secret',
      };

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent),
        },
      }));

      mockReq = {
        body: { amount: 100 },
        user: { id: 'user123' },
      };

      await controller.createPaymentIntent(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ clientSecret: 'test_secret' });
    });

    it('deve retornar erro quando falhar', async () => {
      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockRejectedValue(new Error('Stripe error')),
        },
      }));

      mockReq = {
        body: { amount: 100 },
        user: { id: 'user123' },
      };

      await controller.createPaymentIntent(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Erro ao processar pagamento' });
    });
  });

  describe('confirmPayment', () => {
    it('deve confirmar pagamento com sucesso', async () => {
      const mockPaymentIntent = {
        status: 'succeeded',
        amount: 10000,
        id: 'pi_123',
      };

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
        },
      }));

      mockReq = {
        body: { paymentIntentId: 'pi_123' },
        user: { id: 'user123' },
      };

      await controller.confirmPayment(mockReq as Request, mockRes as Response);

      expect(mockPaymentService.savePayment).toHaveBeenCalledWith({
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId: 'pi_123',
      });
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success' });
    });

    it('deve retornar erro quando pagamento não confirmado', async () => {
      const mockPaymentIntent = {
        status: 'processing',
      };

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
        },
      }));

      mockReq = {
        body: { paymentIntentId: 'pi_123' },
        user: { id: 'user123' },
      };

      await controller.confirmPayment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Pagamento não confirmado' });
    });
  });

  describe('createPixPayment', () => {
    it('deve criar pagamento PIX com sucesso', async () => {
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

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent),
          retrieve: jest.fn().mockResolvedValue(mockPixDetails),
        },
        paymentMethods: {
          attach: jest.fn().mockResolvedValue({}),
        },
      }));

      mockReq = {
        body: { amount: 100 },
        user: { id: 'user123' },
      };

      await controller.createPixPayment(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        qrCode: 'pix_qr_code',
        expiresAt: 1234567890,
      });
    });
  });

  describe('listPaymentMethods', () => {
    it('deve listar métodos de pagamento com sucesso', async () => {
      const mockPaymentMethods = {
        data: [
          { id: 'pm_1', type: 'card' },
          { id: 'pm_2', type: 'card' },
        ],
      };

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentMethods: {
          list: jest.fn().mockResolvedValue(mockPaymentMethods),
        },
      }));

      mockReq = {
        user: { id: 'user123' },
      };

      await controller.listPaymentMethods(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockPaymentMethods.data);
    });
  });

  describe('addPaymentMethod', () => {
    it('deve adicionar método de pagamento com sucesso', async () => {
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
      };

      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentMethods: {
          attach: jest.fn().mockResolvedValue(mockPaymentMethod),
        },
      }));

      mockReq = {
        body: { paymentMethodId: 'pm_123' },
        user: { id: 'user123' },
      };

      await controller.addPaymentMethod(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockPaymentMethod);
    });
  });

  describe('removePaymentMethod', () => {
    it('deve remover método de pagamento com sucesso', async () => {
      (Stripe as jest.Mock).mockImplementation(() => ({
        paymentMethods: {
          detach: jest.fn().mockResolvedValue({}),
        },
      }));

      mockReq = {
        params: { paymentMethodId: 'pm_123' },
      };

      await controller.removePaymentMethod(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Método de pagamento removido com sucesso',
      });
    });
  });
});
