import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

// Definir o mock do Stripe ANTES de importar as rotas
jest.mock('stripe', () => {
  const mockCreatePaymentIntent = jest.fn();
  const mockRetrievePaymentIntent = jest.fn();
  const mockConfirmPaymentIntent = jest.fn();
  const mockListPaymentMethods = jest.fn();
  const mockCreatePaymentMethod = jest.fn();
  const mockAttachPaymentMethod = jest.fn();
  const mockDetachPaymentMethod = jest.fn();
  const mockCreateCustomer = jest.fn();
  const mockCreateTransfer = jest.fn();

  const stripeMock = jest.fn(() => ({
    paymentIntents: {
      create: mockCreatePaymentIntent,
      retrieve: mockRetrievePaymentIntent,
      confirm: mockConfirmPaymentIntent,
    },
    paymentMethods: {
      list: mockListPaymentMethods,
      create: mockCreatePaymentMethod,
      attach: mockAttachPaymentMethod,
      detach: mockDetachPaymentMethod,
    },
    customers: {
      create: mockCreateCustomer,
    },
    transfers: {
      create: mockCreateTransfer,
    },
  }));

  // Attach mocks to the constructor for access in tests
  (stripeMock as any).mockCreatePaymentIntent = mockCreatePaymentIntent;
  (stripeMock as any).mockRetrievePaymentIntent = mockRetrievePaymentIntent;
  (stripeMock as any).mockConfirmPaymentIntent = mockConfirmPaymentIntent;
  (stripeMock as any).mockListPaymentMethods = mockListPaymentMethods;
  (stripeMock as any).mockCreatePaymentMethod = mockCreatePaymentMethod;
  (stripeMock as any).mockAttachPaymentMethod = mockAttachPaymentMethod;
  (stripeMock as any).mockDetachPaymentMethod = mockDetachPaymentMethod;
  (stripeMock as any).mockCreateCustomer = mockCreateCustomer;
  (stripeMock as any).mockCreateTransfer = mockCreateTransfer;

  return stripeMock;
});

// Mock do PaymentService
jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    getInstance: jest.fn().mockReturnValue({
      savePayment: jest.fn().mockResolvedValue({ id: 'payment_123' }),
      processPaymentWithSplit: jest.fn().mockResolvedValue({ success: true }),
      getPaymentCards: jest.fn().mockResolvedValue([]),
      addPaymentCard: jest.fn().mockResolvedValue({ id: 'card_123' }),
      removePaymentCard: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Importar as rotas DEPOIS de mockar
import stripeRoutes from '../../routes/stripe.routes';

describe('Stripe Routes', () => {
  let authToken: string;
  let app: any;
  let MockStripe: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_jwt_secret';
    authToken = jwt.sign({ uid: 'user123' }, process.env.JWT_SECRET);
    app = express();
    app.use(express.json());
    // Middleware para adicionar user ao request
    app.use((req: any, res: any, next: any) => {
        next();
    });
    app.use('/stripe', stripeRoutes);

    MockStripe = Stripe as unknown as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default implementations to avoid undefined returns
    MockStripe.mockCreatePaymentIntent.mockResolvedValue({ id: 'default_pi' });
    MockStripe.mockRetrievePaymentIntent.mockResolvedValue({ id: 'default_pi' });
    MockStripe.mockConfirmPaymentIntent.mockResolvedValue({ status: 'succeeded' });
    MockStripe.mockListPaymentMethods.mockResolvedValue({ data: [] });
    MockStripe.mockCreatePaymentMethod.mockResolvedValue({ id: 'default_pm' });
    MockStripe.mockAttachPaymentMethod.mockResolvedValue({});
    MockStripe.mockCreateCustomer.mockResolvedValue({ id: 'cus_123' });
    MockStripe.mockCreateTransfer.mockResolvedValue({});
  });

  describe('POST /stripe/create-payment-intent', () => {
    it('deve criar um PaymentIntent com sucesso', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'test_secret',
      };

      MockStripe.mockCreatePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/stripe/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

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
      };

      MockStripe.mockConfirmPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/stripe/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentIntentId: 'pi_123', paymentMethodId: 'pm_123' });

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'succeeded',
        paymentIntentId: 'pi_123',
        receiptUrl: '',
      });
    });
  });

  describe('POST /stripe/create-pix-payment', () => {
    it('deve criar um pagamento PIX com sucesso', async () => {
      const mockCreateResponse = {
        id: 'pi_123',
        client_secret: 'secret_123',
        payment_method: 'pm_123',
      };

      const mockRetrieveResponse = {
        id: 'pi_123',
        payment_method: {
          pix: {
            qr_code: 'pix_qr_code_url',
            expires_at: 1234567890,
          },
        },
      };

      MockStripe.mockCreatePaymentIntent.mockResolvedValue(mockCreateResponse);
      MockStripe.mockAttachPaymentMethod.mockResolvedValue({});
      MockStripe.mockRetrievePaymentIntent.mockResolvedValue(mockRetrieveResponse);

      const response = await request(app)
        .post('/stripe/create-pix-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        qrCode: 'pix_qr_code_url',
        expiresAt: 1234567890,
      });
    });
  });

  describe('GET /stripe/check-pix-status/:paymentId', () => {
    it('deve verificar status do PIX com sucesso', async () => {
      const mockPaymentIntent = {
        status: 'succeeded',
        id: 'pi_123',
      };

      MockStripe.mockRetrievePaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .get('/stripe/check-pix-status/pi_123')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'succeeded' });
    });
  });

  describe('GET /stripe/payment-methods', () => {
    it('deve listar métodos de pagamento com sucesso', async () => {
      const mockMethodsList = {
        data: [{ id: 'pm_123', card: { last4: '4242' } }],
      };

      MockStripe.mockListPaymentMethods.mockResolvedValue(mockMethodsList);

      const response = await request(app)
        .get('/stripe/payment-methods')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ paymentMethods: mockMethodsList.data });
    });
  });

  describe('POST /stripe/payment-methods', () => {
    it('deve adicionar método de pagamento com sucesso', async () => {
      const mockPaymentMethod = {
        id: 'pm_123',
        type: 'card',
        card: {
          last4: '4242',
        },
      };

      MockStripe.mockAttachPaymentMethod.mockResolvedValue(mockPaymentMethod);
      MockStripe.mockCreateCustomer.mockResolvedValue({ id: 'cus_123' });

      const response = await request(app)
        .post('/stripe/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethodId: 'pm_123',
          customerId: 'cus_123'
        });

      if (response.status !== 200) {
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(response.body)}`);
      }

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPaymentMethod);
    });
  });
});
