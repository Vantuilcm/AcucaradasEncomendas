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
  let mockReq: any;
  let mockRes: Partial<Response>;
  const StripeCtor = Stripe as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as Partial<Response>;
  });

  describe('createPaymentIntent', () => {
    it('deve criar um PaymentIntent com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'test_secret',
      };

      StripeCtor.mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent),
          retrieve: jest.fn(),
        },
        paymentMethods: {
          list: jest.fn(),
          attach: jest.fn(),
          detach: jest.fn(),
        },
      }));

      controller = new StripeController();

      mockReq = {
        body: { amount: 100 },
        user: { id: 'user123' },
      };

      await controller.createPaymentIntent(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ id: 'pi_123', clientSecret: 'test_secret' });
    });

    it('deve retornar erro quando falhar', async () => {
      StripeCtor.mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockRejectedValue(new Error('Stripe error')),
          retrieve: jest.fn(),
        },
        paymentMethods: {
          list: jest.fn(),
          attach: jest.fn(),
          detach: jest.fn(),
        },
      }));

      controller = new StripeController();

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
        metadata: {},
      };

      StripeCtor.mockImplementation(() => ({
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
          create: jest.fn(),
        },
        paymentMethods: {
          list: jest.fn(),
          attach: jest.fn(),
          detach: jest.fn(),
        },
      }));

      const savePaymentMock = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(PaymentService, 'getInstance').mockReturnValue({
        savePayment: savePaymentMock,
      } as unknown as PaymentService);

      controller = new StripeController();

      mockReq = {
        body: { paymentIntentId: 'pi_123' },
        user: { id: 'user123' },
      };

      await controller.confirmPayment(mockReq as Request, mockRes as Response);

      expect(savePaymentMock).toHaveBeenCalledWith({
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

      StripeCtor.mockImplementation(() => ({
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
          create: jest.fn(),
        },
        paymentMethods: {
          list: jest.fn(),
          attach: jest.fn(),
          detach: jest.fn(),
        },
      }));

      controller = new StripeController();

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
        next_action: {
          pix_display_qr_code: {
            data: 'pix_qr_code',
            image_url_png: 'https://example.com/pix.png',
            expires_at: 1234567890,
          },
        },
      };

      StripeCtor.mockImplementation(() => ({
        paymentIntents: {
          create: jest.fn().mockResolvedValue(mockPaymentIntent),
          retrieve: jest.fn(),
        },
        paymentMethods: {
          attach: jest.fn().mockResolvedValue({}),
          list: jest.fn(),
          detach: jest.fn(),
        },
      }));

      controller = new StripeController();

      mockReq = {
        body: { amount: 100 },
        user: { id: 'user123' },
      };

      await controller.createPixPayment(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        qrCode: 'pix_qr_code',
        pixCode: 'https://example.com/pix.png',
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

      StripeCtor.mockImplementation(() => ({
        paymentMethods: {
          list: jest.fn().mockResolvedValue(mockPaymentMethods),
          attach: jest.fn(),
          detach: jest.fn(),
        },
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      }));

      controller = new StripeController();

      mockReq = {
        query: { customerId: 'cus_123' } as any,
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

      StripeCtor.mockImplementation(() => ({
        paymentMethods: {
          attach: jest.fn().mockResolvedValue(mockPaymentMethod),
          list: jest.fn(),
          detach: jest.fn(),
        },
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      }));

      controller = new StripeController();

      mockReq = {
        body: { paymentMethodId: 'pm_123', customerId: 'cus_123' },
        user: { id: 'user123' },
      };

      await controller.addPaymentMethod(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockPaymentMethod);
    });
  });

  describe('removePaymentMethod', () => {
    it('deve remover método de pagamento com sucesso', async () => {
      StripeCtor.mockImplementation(() => ({
        paymentMethods: {
          detach: jest.fn().mockResolvedValue({}),
          list: jest.fn(),
          attach: jest.fn(),
        },
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      }));

      controller = new StripeController();

      mockReq = {
        params: { paymentMethodId: 'pm_123' } as any,
      };

      await controller.removePaymentMethod(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Método de pagamento removido com sucesso',
      });
    });
  });
});
