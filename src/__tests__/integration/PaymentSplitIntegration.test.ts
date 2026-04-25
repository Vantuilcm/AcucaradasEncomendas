import { PaymentService } from '../../services/PaymentService';
import { StripeService } from '../../services/StripeService';
import { NotificationService } from '../../services/NotificationService';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { loggingService } from '../../services/LoggingService';

// Ensure we use the real PaymentService
jest.unmock('../../services/PaymentService');

// Mock das dependências
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock('firebase/firestore');
jest.mock('../../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockReturnThis(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

jest.mock('../../services/NotificationService', () => {
  const instance = {
    createNotification: jest.fn().mockResolvedValue({}),
    sendPaymentConfirmation: jest.fn().mockResolvedValue({}),
  };
  return {
    NotificationService: {
      getInstance: jest.fn(() => instance),
    },
  };
});

describe('Payment Split Integration Tests', () => {
  const mockOrderId = 'ORDER_123';
  const mockAmount = 15000; // R$ 150,00 em centavos
  const mockDeliveryFee = 1000; // R$ 10,00 em centavos
  const mockUserId = 'user-123';
  const mockProducerId = 'producer-123';
  const mockDeliveryPersonId = 'delivery-123';
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar mocks
    paymentService = PaymentService.getInstance();
    stripeService = StripeService.getInstance();
    notificationService = NotificationService.getInstance();

    // Mock doc to return an object with path
    (doc as any).mockImplementation((_db: any, collection: string, id: string) => ({
      path: `${collection}/${id}`,
      id: id,
    }));

    // Mock do documento de pedido
    (getDoc as any).mockImplementation((docRef: any) => {
      // Verifica se docRef e path existem antes de acessar
      const path = docRef?.path || '';
      
      if (path.includes('orders')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            userId: mockUserId,
            producerId: mockProducerId,
            deliveryPersonId: mockDeliveryPersonId,
            totalAmount: mockAmount,
            deliveryFee: mockDeliveryFee,
            status: 'aguardando_pagamento',
          }),
          id: mockOrderId,
        });
      } else if (path.includes('users')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            email: 'user@example.com',
            name: 'Test User',
            stripeCustomerId: 'cus_123456',
          }),
          id: mockUserId,
        });
      } else if (path.includes('producers')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            name: 'Test Producer',
            stripeAccountId: 'acct_producer123',
          }),
          id: mockProducerId,
        });
      } else if (path.includes('delivery_drivers')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            name: 'Test Delivery Person',
            stripeAccountId: 'acct_delivery123',
          }),
          id: mockDeliveryPersonId,
        });
      }
      return Promise.resolve({
        exists: () => false,
      });
    });

    // Mock da operação de atualização
    (updateDoc as any).mockResolvedValue({});

    // Mock do StripeService
    jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_123456',
      client_secret: 'pi_123456_secret_789',
    });

    jest.spyOn(stripeService, 'createPaymentMethod').mockResolvedValue('pm_123456');

    jest.spyOn(stripeService, 'processPaymentWithSplit').mockResolvedValue({
      paymentIntentId: 'pi_123456',
      appTransferId: 'tr_app_123',
      producerTransferId: 'tr_producer_123',
      deliveryPersonTransferId: 'tr_delivery_123',
    });

    jest.spyOn(stripeService, 'processCardPayment').mockResolvedValue({
      id: 'pi_123456',
      status: 'succeeded',
      charges: {
        data: [
          {
            receipt_url: 'https://receipt.url',
          },
        ],
      },
    });
  });

  describe('processPaymentWithSplit', () => {
    it('should correctly split payment between app, producer and delivery person', async () => {
      // Calcular os valores esperados
      const productAmount = mockAmount - mockDeliveryFee; // 14000 (R$ 140,00)
      const expectedAppFee = Math.round(productAmount * 0.1); // 1400 (R$ 14,00)
      const expectedProducerAmount = productAmount - expectedAppFee; // 12600 (R$ 126,00)
      const expectedDeliveryFee = mockDeliveryFee; // 1000 (R$ 10,00)

      // Executar o método
      const result = await paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails);

      // Verificar se o método foi chamado com os parâmetros corretos
      expect(stripeService.processPaymentWithSplit).toHaveBeenCalledWith(
        mockOrderId,
        mockAmount,
        mockDeliveryFee,
        mockProducerId,
        mockDeliveryPersonId
      );

      // Verificar se o resultado é o esperado
      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_123456',
        appTransferId: 'tr_app_123',
        producerTransferId: 'tr_producer_123',
        deliveryPersonTransferId: 'tr_delivery_123',
      });

      // Verificar se o pedido foi atualizado com os valores corretos
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'confirmado',
          paymentStatus: 'completed',
          paymentMethod: 'credit_card',
          paymentDetails: {
            productAmount: productAmount,
            deliveryFee: expectedDeliveryFee,
            appFee: expectedAppFee,
            producerAmount: expectedProducerAmount,
            totalAmount: mockAmount,
          },
        })
      );

      // Verificar se as notificações foram enviadas
      expect(notificationService.createNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during payment processing', async () => {
      // Simular erro no processamento do pagamento
      jest
        .spyOn(stripeService, 'processPaymentWithSplit')
        .mockRejectedValue(new Error('Erro ao processar pagamento'));

      // Executar o método e verificar se o erro é propagado
      await expect(
        paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails)
      ).rejects.toThrow('Erro ao processar pagamento');

      // Verificar se o erro foi registrado
      expect(loggingService.error).toHaveBeenCalledWith(
        'Erro ao processar pagamento com divisão',
        expect.any(Error),
        expect.objectContaining({
          orderId: mockOrderId,
        })
      );

      // Verificar que o pedido não foi atualizado
      expect(updateDoc).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'confirmado',
        })
      );
    });

    it('should validate order exists before processing payment', async () => {
      // Simular pedido não encontrado
      (getDoc as any).mockImplementationOnce(() =>
        Promise.resolve({
          exists: () => false,
        })
      );

      // Executar o método
      const result = await paymentService.processPaymentWithSplit('INVALID_ORDER', mockCardDetails);

      // Verificar que o resultado indica falha
      expect(result).toEqual({
        success: false,
      });

      // Verificar que o erro foi registrado
      expect(loggingService.error).toHaveBeenCalledWith(
        'Pedido não encontrado',
        undefined,
        expect.objectContaining({
          orderId: 'INVALID_ORDER',
        })
      );

      // Verificar que o pagamento não foi processado
      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
    });

    it('should validate producer and delivery person exist before processing payment', async () => {
      // Simular pedido sem produtor ou entregador
      (getDoc as any).mockImplementationOnce(() =>
        Promise.resolve({
          exists: () => true,
          data: () => ({
            userId: mockUserId,
            totalAmount: mockAmount,
            deliveryFee: mockDeliveryFee,
            status: 'aguardando_pagamento',
            // Sem producerId ou deliveryPersonId
          }),
          id: mockOrderId,
        })
      );

      // Executar o método
      const result = await paymentService.processPaymentWithSplit(mockOrderId, mockCardDetails);

      // Verificar que o resultado indica falha
      expect(result).toEqual({
        success: false,
      });

      // Verificar que o erro foi registrado
      expect(loggingService.error).toHaveBeenCalledWith(
        'Produtor ou entregador não definido no pedido',
        undefined,
        expect.objectContaining({
          orderId: mockOrderId,
        })
      );

      // Verificar que o pagamento não foi processado
      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
    });
  });
});
