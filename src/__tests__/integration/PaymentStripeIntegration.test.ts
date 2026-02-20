import { PaymentService } from '../../services/PaymentService';
import StripeService from '../../services/StripeService';
import { NotificationService } from '../../services/NotificationService';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { STRIPE_CONFIG } from '../../config/stripe';
import Stripe from 'stripe';

// Mock das dependências
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock('firebase/firestore');
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    charges: {
      retrieve: jest.fn(),
    },
  }));
});

describe('Payment Stripe Integration Tests', () => {
  const mockOrderId = 'ORDER_123';
  const mockAmount = 150.0;
  const mockCustomer = {
    uid: 'customer-123',
    name: 'João Cliente',
  };
  const mockProducer = {
    uid: 'producer-123',
    name: 'Maria Confeiteira',
  };
  const mockCardDetails = {
    number: '4111111111111111',
    expMonth: 12,
    expYear: 2025,
    cvc: '123',
    holderName: 'John Doe',
  };

  let paymentService: PaymentService;
  let stripeService: StripeService;
  let notificationService: NotificationService;
  let stripeMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar mocks
    paymentService = PaymentService.getInstance();
    stripeService = StripeService.getInstance();
    notificationService = NotificationService.getInstance();
    stripeMock = Stripe as unknown as jest.Mock;

    // Mock do documento de pedido
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        status: 'aguardando_pagamento',
        customerId: mockCustomer.uid,
        producerId: mockProducer.uid,
        total: mockAmount,
        deliveryFee: 10.0,
      }),
    });

    // Mock da operação de atualização
    updateDoc.mockResolvedValue({});

    // Mock do envio de notificação
    jest.spyOn(notificationService, 'sendPaymentConfirmation').mockResolvedValue();
  });

  describe('Credit Card Payment Flow', () => {
    it('should process credit card payment successfully through Stripe', async () => {
      // Mock do método de pagamento criado
      const mockPaymentMethod = {
        id: 'pm_123456789',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '1111',
          expMonth: 12,
          expYear: 2025,
        },
      };

      // Mock da intenção de pagamento criada
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'secret_123',
        status: 'requires_confirmation',
        amount: mockAmount * 100,
      };

      // Mock da confirmação de pagamento
      const mockConfirmedPayment = {
        id: 'pi_123456789',
        status: 'succeeded',
        client_secret: 'secret_123',
        charges: {
          data: [
            {
              receipt_url: 'https://receipt.stripe.com/123',
            },
          ],
        },
      };

      // Configurar mocks do Stripe
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.paymentMethods.create.mockResolvedValue(mockPaymentMethod);
      stripeMockInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      stripeMockInstance.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);

      // Processar pagamento
      const result = await paymentService.processCreditCardPayment(mockOrderId, mockCardDetails);

      // Verificar resultado
      expect(result).toBe(true);

      // Verificar se o método de pagamento foi criado
      expect(stripeMockInstance.paymentMethods.create).toHaveBeenCalledWith({
        type: 'card',
        card: {
          number: mockCardDetails.number,
          exp_month: mockCardDetails.expMonth,
          exp_year: mockCardDetails.expYear,
          cvc: mockCardDetails.cvc,
        },
        billing_details: {
          name: mockCardDetails.holderName,
        },
      });

      // Verificar se a intenção de pagamento foi criada
      expect(stripeMockInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: mockAmount * 100,
        currency: 'brl',
        description: expect.stringContaining(mockOrderId),
        metadata: expect.objectContaining({
          orderId: mockOrderId,
        }),
        payment_method_types: ['card'],
        capture_method: 'automatic',
      });

      // Verificar se o pagamento foi confirmado
      expect(stripeMockInstance.paymentIntents.confirm).toHaveBeenCalledWith(mockPaymentIntent.id, {
        payment_method: mockPaymentMethod.id,
      });

      // Verificar atualização do pedido
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'confirmado',
          paymentStatus: 'completed',
          paymentMethod: 'credit_card',
          stripePaymentIntentId: mockPaymentIntent.id,
          stripePaymentMethodId: mockPaymentMethod.id,
          stripeReceiptUrl: mockConfirmedPayment.charges.data[0].receipt_url,
        })
      );

      // Verificar envio de notificação
      expect(notificationService.sendPaymentConfirmation).toHaveBeenCalledWith(
        mockCustomer.uid,
        mockOrderId
      );
    });

    it('should handle credit card payment failure', async () => {
      // Mock do método de pagamento criado
      const mockPaymentMethod = {
        id: 'pm_123456789',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '1111',
          expMonth: 12,
          expYear: 2025,
        },
      };

      // Mock da intenção de pagamento criada
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'secret_123',
        status: 'requires_confirmation',
        amount: mockAmount * 100,
      };

      // Mock da confirmação de pagamento com falha
      const mockFailedPayment = {
        id: 'pi_123456789',
        status: 'requires_payment_method',
        client_secret: 'secret_123',
        last_payment_error: {
          message: 'Your card was declined.',
        },
        charges: {
          data: [],
        },
      };

      // Configurar mocks do Stripe
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.paymentMethods.create.mockResolvedValue(mockPaymentMethod);
      stripeMockInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      stripeMockInstance.paymentIntents.confirm.mockResolvedValue(mockFailedPayment);

      // Processar pagamento e esperar erro
      await expect(
        paymentService.processCreditCardPayment(mockOrderId, mockCardDetails)
      ).rejects.toThrow('Payment failed with status: requires_payment_method');

      // Verificar que o pedido não foi atualizado para confirmado
      expect(updateDoc).not.toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'confirmado',
          paymentStatus: 'completed',
        })
      );

      // Verificar que a notificação de confirmação não foi enviada
      expect(notificationService.sendPaymentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('Stripe Webhook Handling', () => {
    it('should process payment_intent.succeeded webhook', async () => {
      // Mock do evento do Stripe
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456789',
            metadata: {
              orderId: mockOrderId,
            },
            status: 'succeeded',
            charges: {
              data: [
                {
                  receipt_url: 'https://receipt.stripe.com/123',
                },
              ],
            },
          },
        },
      };

      // Configurar mock do Stripe
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Processar webhook
      await stripeService.handleWebhook(
        JSON.stringify({ type: 'payment_intent.succeeded' }),
        'whsec_test_signature'
      );

      // Verificar atualização do pedido
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 'confirmado',
          paymentStatus: 'completed',
          stripePaymentStatus: 'succeeded',
        })
      );
    });

    it('should process payment_intent.payment_failed webhook', async () => {
      // Mock do evento do Stripe
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_123456789',
            metadata: {
              orderId: mockOrderId,
            },
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
            },
          },
        },
      };

      // Configurar mock do Stripe
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Processar webhook
      await stripeService.handleWebhook(
        JSON.stringify({ type: 'payment_intent.payment_failed' }),
        'whsec_test_signature'
      );

      // Verificar atualização do pedido
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          paymentStatus: 'failed',
          stripePaymentStatus: 'requires_payment_method',
        })
      );
    });

    it('should handle invalid webhook signature', async () => {
      // Configurar mock do Stripe para lançar erro
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Processar webhook e esperar erro
      await expect(
        stripeService.handleWebhook(
          JSON.stringify({ type: 'payment_intent.succeeded' }),
          'invalid_signature'
        )
      ).rejects.toThrow('Failed to handle webhook');

      // Verificar que o pedido não foi atualizado
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  describe('Payment Dispute Handling', () => {
    it('should handle charge.dispute.created webhook', async () => {
      // Mock do evento de disputa
      const mockDispute = {
        id: 'dp_123456789',
        charge: 'ch_123456789',
        status: 'needs_response',
        reason: 'fraudulent',
        amount: 15000, // 150.00 em centavos
        created: Math.floor(Date.now() / 1000), // timestamp em segundos
      };

      const mockEvent = {
        type: 'charge.dispute.created',
        data: {
          object: mockDispute,
        },
      };

      // Mock da cobrança
      const mockCharge = {
        id: 'ch_123456789',
        payment_intent: 'pi_123456789',
      };

      // Mock do payment intent
      const mockPaymentIntent = {
        id: 'pi_123456789',
        metadata: {
          orderId: mockOrderId,
        },
      };

      // Configurar mocks do Stripe
      const stripeMockInstance = stripeMock.mock.results[0].value;
      stripeMockInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      stripeMockInstance.charges.retrieve.mockResolvedValue(mockCharge);
      stripeMockInstance.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      // Processar webhook
      await stripeService.handleWebhook(
        JSON.stringify({ type: 'charge.dispute.created' }),
        'whsec_test_signature'
      );

      // Verificar atualização do pedido
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          paymentStatus: 'disputed',
          disputeStatus: 'needs_response',
          disputeReason: 'fraudulent',
          disputeAmount: 150.0,
        })
      );
    });
  });

  describe('', () => {});
});
