import { PaymentService } from '../../services/PaymentService';
import { NotificationService } from '../../services/NotificationService';
import { NotificationType } from '../../config/notifications';
import { db } from '../../config/firebase';
import Stripe from 'stripe';

// Mock das dependências
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock do Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
    },
  }));
});

describe('Payment Notification Integration Tests', () => {
  let paymentService: PaymentService;
  let notificationService: NotificationService;
  let stripeMock: jest.Mock;
  let stripeMockInstance: any; // Variável para guardar a instância

  const mockOrderId = 'ORDER_123';
  const mockCustomerId = 'CUSTOMER_123';

  beforeEach(() => {
    jest.clearAllMocks();

    paymentService = PaymentService.getInstance();
    notificationService = NotificationService.getInstance();
    stripeMock = Stripe as unknown as jest.Mock;

    // Garantir que o construtor mockado foi chamado e pegar a instância
    stripeMockInstance = new (Stripe as any)('test_key'); // Chama o construtor mockado
    // Ou, se StripeService instancia o Stripe internamente no getInstance:
    // stripeService = StripeService.getInstance(); // Chamar primeiro
    // stripeMockInstance = stripeMock.mock.results[0]?.value; // Tentar pegar depois
    // if (!stripeMockInstance) throw new Error('Stripe mock instance not found');

    // Mock do envio de notificação
    jest.spyOn(notificationService, 'sendPaymentConfirmation').mockResolvedValue(true);

    // Mock dos métodos do Stripe usando a instância garantida
    // const stripeMockInstance = stripeMock.mock.results[0].value; // linha original removida

    // Mock do método de pagamento
    const mockPaymentMethod = {
      id: 'pm_123456789',
      type: 'card',
    };

    // Mock da intenção de pagamento
    const mockPaymentIntent = {
      id: 'pi_123456789',
      status: 'requires_confirmation',
    };

    // Mock da confirmação de pagamento
    const mockConfirmedPayment = {
      id: 'pi_123456789',
      status: 'succeeded',
      charges: {
        data: [
          {
            receipt_url: 'https://receipt.stripe.com/123',
          },
        ],
      },
    };

    stripeMockInstance.paymentMethods.create.mockResolvedValue(mockPaymentMethod);
    stripeMockInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
    stripeMockInstance.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);
  });

  test('should send payment confirmation notification after successful payment', async () => {
    // Espionar o método de envio de notificação
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendPaymentConfirmation');

    // Simular um pagamento bem-sucedido
    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    // Verificar se a notificação foi enviada
    expect(sendNotificationSpy).toHaveBeenCalledWith(mockCustomerId, mockOrderId);
  });

  test('should handle notification failure gracefully', async () => {
    // Mock do envio de notificação para simular falha
    jest
      .spyOn(notificationService, 'sendPaymentConfirmation')
      .mockRejectedValue(new Error('Failed to send notification'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Simular um pagamento
    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error sending payment confirmation:',
      expect.any(Error)
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should format payment confirmation notification correctly', async () => {
    // Mock do método sendNotification para capturar os parâmetros
    const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification');

    // Simular um pagamento bem-sucedido
    await paymentService.processCreditCardPayment(mockOrderId, {
      number: '4111111111111111',
      expMonth: 12,
      expYear: 2025,
      cvc: '123',
      holderName: 'John Doe',
    });

    // Verificar se a notificação foi formatada corretamente
    expect(sendNotificationSpy).toHaveBeenCalledWith(
      mockCustomerId,
      NotificationType.PAYMENT_CONFIRMATION,
      expect.objectContaining({
        orderId: mockOrderId,
        orderNumber: '123',
      })
    );
  });
});
