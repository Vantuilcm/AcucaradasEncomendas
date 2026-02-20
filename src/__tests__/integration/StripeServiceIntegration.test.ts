import { PaymentService } from '../../services/PaymentService';
import { StripeService } from '../../services/StripeService';
import { NotificationService } from '../../services/NotificationService';
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

// Mock global do Stripe para todos os testes
const mockPaymentIntents = {
  create: jest.fn(),
  confirm: jest.fn(),
  retrieve: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
};

const mockPaymentMethods = {
  create: jest.fn(),
  attach: jest.fn(),
  detach: jest.fn(),
};

const mockWebhooks = {
  constructEvent: jest.fn(),
};

const mockCharges = {
  retrieve: jest.fn(),
};

const mockRefunds = {
  create: jest.fn(),
};

// Mock simplificado do Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: mockPaymentIntents,
    paymentMethods: mockPaymentMethods,
    webhooks: mockWebhooks,
    charges: mockCharges,
    refunds: mockRefunds,
  }));
});

describe('StripeService Integration Tests', () => {
  const mockOrderId = 'ORDER_123';
  const mockAmount = 150.0;
  const mockCustomer = {
    uid: 'customer-123',
    name: 'João Cliente',
    email: 'joao@exemplo.com',
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

  let stripeService: StripeService;
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    stripeService = StripeService.getInstance();
    notificationService = NotificationService.getInstance();

    // Mock do envio de notificação
    jest.spyOn(notificationService, 'sendPaymentConfirmation').mockResolvedValue();
  });

  describe('Payment Intent Management', () => {
    it('should create a payment intent successfully', async () => {
      // Mock da intenção de pagamento criada
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'secret_123',
        status: 'requires_payment_method',
        amount: mockAmount * 100,
        currency: 'brl',
      };

      // Configurar mock do Stripe
      mockPaymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Criar intenção de pagamento
      const result = await stripeService.createPaymentIntent(mockOrderId, mockAmount);

      // Verificar resultado
      expect(result).toEqual(mockPaymentIntent);

      // Verificar se a intenção de pagamento foi criada corretamente
      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: mockAmount * 100,
        currency: 'brl',
        description: expect.stringContaining(mockOrderId),
        metadata: expect.objectContaining({
          orderId: mockOrderId,
        }),
        payment_method_types: ['card'],
        capture_method: 'automatic',
      });
    });

    it('should update a payment intent successfully', async () => {
      // Mock da intenção de pagamento
      const mockPaymentIntentId = 'pi_123456789';
      const updatedAmount = 200.0;

      const mockUpdatedPaymentIntent = {
        id: mockPaymentIntentId,
        client_secret: 'secret_123',
        status: 'requires_payment_method',
        amount: updatedAmount * 100,
        currency: 'brl',
      };

      // Configurar mock do Stripe
      mockPaymentIntents.update.mockResolvedValue(mockUpdatedPaymentIntent);

      // Atualizar intenção de pagamento
      const result = await stripeService.updatePaymentIntent(mockPaymentIntentId, updatedAmount);

      // Verificar resultado
      expect(result).toEqual(mockUpdatedPaymentIntent);

      // Verificar se a intenção de pagamento foi atualizada corretamente
      expect(mockPaymentIntents.update).toHaveBeenCalledWith(mockPaymentIntentId, {
        amount: updatedAmount * 100,
      });
    });

    it('should cancel a payment intent successfully', async () => {
      // Mock da intenção de pagamento cancelada
      const mockPaymentIntentId = 'pi_123456789';
      const mockCanceledPaymentIntent = {
        id: mockPaymentIntentId,
        status: 'canceled',
        cancellation_reason: 'requested_by_customer',
      };

      // Configurar mock do Stripe
      mockPaymentIntents.cancel.mockResolvedValue(mockCanceledPaymentIntent);

      // Cancelar intenção de pagamento
      const result = await stripeService.cancelPaymentIntent(
        mockPaymentIntentId,
        'requested_by_customer'
      );

      // Verificar resultado
      expect(result).toEqual(mockCanceledPaymentIntent);

      // Verificar se a intenção de pagamento foi cancelada corretamente
      expect(mockPaymentIntents.cancel).toHaveBeenCalledWith(mockPaymentIntentId, {
        cancellation_reason: 'requested_by_customer',
      });
    });
  });

  describe('Payment Method Management', () => {
    it('should create a payment method successfully', async () => {
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

      // Configurar mock do Stripe
      mockPaymentMethods.create.mockResolvedValue(mockPaymentMethod);

      // Criar método de pagamento
      const result = await stripeService.createPaymentMethod(mockCardDetails);

      // Verificar resultado
      expect(result).toEqual(mockPaymentMethod);

      // Verificar se o método de pagamento foi criado corretamente
      expect(mockPaymentMethods.create).toHaveBeenCalledWith({
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
    });

    it('should attach a payment method to a customer successfully', async () => {
      // Mock do método de pagamento anexado
      const mockPaymentMethodId = 'pm_123456789';
      const mockCustomerId = 'cus_123456789';
      const mockAttachedPaymentMethod = {
        id: mockPaymentMethodId,
        customer: mockCustomerId,
      };

      // Configurar mock do Stripe
      mockPaymentMethods.attach.mockResolvedValue(mockAttachedPaymentMethod);

      // Anexar método de pagamento
      const result = await stripeService.attachPaymentMethodToCustomer(
        mockPaymentMethodId,
        mockCustomerId
      );

      // Verificar resultado
      expect(result).toEqual(mockAttachedPaymentMethod);

      // Verificar se o método de pagamento foi anexado corretamente
      expect(mockPaymentMethods.attach).toHaveBeenCalledWith(mockPaymentMethodId, {
        customer: mockCustomerId,
      });
    });
  });

  describe('Refund Processing', () => {
    it('should process a refund successfully', async () => {
      // Mock da intenção de pagamento
      const mockPaymentIntentId = 'pi_123456789';
      const mockRefundAmount = 75.0; // Reembolso parcial

      // Mock do reembolso criado
      const mockRefund = {
        id: 're_123456789',
        payment_intent: mockPaymentIntentId,
        amount: mockRefundAmount * 100,
        status: 'succeeded',
      };

      // Configurar mock do Stripe
      mockRefunds.create.mockResolvedValue(mockRefund);

      // Processar reembolso
      const result = await stripeService.processRefund(mockPaymentIntentId, mockRefundAmount);

      // Verificar resultado
      expect(result).toEqual(mockRefund);

      // Verificar se o reembolso foi criado corretamente
      expect(mockRefunds.create).toHaveBeenCalledWith({
        payment_intent: mockPaymentIntentId,
        amount: mockRefundAmount * 100,
        reason: 'requested_by_customer',
      });

      // Verificar atualização do pedido
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          refundStatus: 'completed',
          refundAmount: mockRefundAmount,
          refundId: mockRefund.id,
        })
      );
    });

    it('should handle refund failure', async () => {
      // Mock da intenção de pagamento
      const mockPaymentIntentId = 'pi_123456789';
      const mockRefundAmount = 75.0;

      // Configurar mock do Stripe para simular falha
      mockRefunds.create.mockRejectedValue(new Error('Refund failed'));

      // Espionar console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Processar reembolso e esperar erro
      await expect(
        stripeService.processRefund(mockPaymentIntentId, mockRefundAmount)
      ).rejects.toThrow('Failed to process refund');

      // Verificar se o erro foi registrado
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing refund:', expect.any(Error));

      // Verificar que o pedido não foi atualizado
      expect(updateDoc).not.toHaveBeenCalled();

      // Restaurar console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Configurar mock do Stripe para simular erro de API
      mockPaymentIntents.create.mockRejectedValue({
        type: 'StripeCardError',
        message: 'Your card was declined',
        code: 'card_declined',
      });

      // Espionar console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Tentar criar intenção de pagamento e esperar erro
      await expect(stripeService.createPaymentIntent(mockOrderId, mockAmount)).rejects.toThrow(
        'Failed to create payment intent'
      );

      // Verificar se o erro foi registrado
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating payment intent:',
        expect.any(Object)
      );

      // Restaurar console.error
      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      // Configurar mock do Stripe para simular erro de rede
      mockPaymentIntents.create.mockRejectedValue(new Error('Network error'));

      // Espionar console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Tentar criar intenção de pagamento e esperar erro
      await expect(stripeService.createPaymentIntent(mockOrderId, mockAmount)).rejects.toThrow(
        'Failed to create payment intent'
      );

      // Verificar se o erro foi registrado
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error creating payment intent:',
        expect.any(Error)
      );

      // Restaurar console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
