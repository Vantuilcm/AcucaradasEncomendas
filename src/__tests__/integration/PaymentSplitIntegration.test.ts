import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PaymentService } from '../../services/PaymentService';
import { StripeService } from '../../services/StripeService';
import { NotificationService } from '../../services/NotificationService';
import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { STRIPE_CONFIG } from '../../config/stripe';
import { loggingService } from '../../services/LoggingService';

// Tipagem para mocks do Firebase
const mockedGetDoc = getDoc as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

// Mock do Firebase
jest.mock('../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: any, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock do NotificationService
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getInstance: jest.fn().mockReturnValue({
      createNotification: (jest.fn() as any).mockResolvedValue({ id: 'notif_123' }),
    }),
  },
}));

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
    jest.spyOn(loggingService, 'error').mockImplementation(() => ({} as any));
    jest.spyOn(loggingService, 'info').mockImplementation(() => ({} as any));
    jest.spyOn(loggingService, 'warn').mockImplementation(() => ({} as any));
    jest.spyOn(console, 'error').mockImplementation(() => ({} as any));

    // Configurar mocks
    paymentService = PaymentService.getInstance();
    stripeService = StripeService.getInstance();
    // Usar a mesma instância que o serviço consome
    // @ts-ignore
    notificationService = (NotificationService as any).getInstance();

    // Mock do documento de pedido
    mockedGetDoc.mockImplementation((docRef: any) => {
      if (docRef.path.includes('orders')) {
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
      } else if (docRef.path.includes('users')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            email: 'user@example.com',
            name: 'Test User',
            stripeCustomerId: 'cus_123456',
          }),
          id: mockUserId,
        });
      } else if (docRef.path.includes('producers')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            name: 'Test Producer',
            stripeAccountId: 'acct_producer123',
          }),
          id: mockProducerId,
        });
      } else if (docRef.path.includes('delivery_persons')) {
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

    // Mock do StripeService
    jest.spyOn(stripeService, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_123456',
      clientSecret: 'pi_123456_secret_789',
    });

    jest.spyOn(stripeService, 'processPaymentWithSplit').mockResolvedValue({
      paymentIntentId: 'pi_123456',
      appTransferId: 'tr_app_123',
      producerTransferId: 'tr_producer_123',
      deliveryPersonTransferId: 'tr_delivery_123',
      appFee: 1401.99,
      producerAmount: 12600,
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
        14000, // mockAmount (15000) - mockDeliveryFee (1000)
        mockDeliveryFee,
        'credit_card',
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
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentMethod: 'credit_card',
          paymentDetails: {
            productAmount: productAmount,
            deliveryFee: expectedDeliveryFee,
            platformMaintenanceFee: 0,
            appFee: 1401.99,
            producerAmount: 12600,
            totalAmount: mockAmount,
          },
        })
      );

      // Verificar se as notificações foram criadas
      const notificationService = NotificationService.getInstance();
      
      // Notificação para o Cliente
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          type: 'payment_received',
          title: 'Pagamento confirmado',
          data: expect.objectContaining({
            orderId: mockOrderId,
            amount: mockAmount,
          }),
        })
      );

      // Notificação para o Produtor
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockProducerId,
          type: 'payment_received',
          title: 'Novo pagamento recebido',
          data: expect.objectContaining({
            orderId: mockOrderId,
            amount: 12600,
          }),
        })
      );

      // Notificação para o Entregador
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockDeliveryPersonId,
          type: 'payment_received',
          title: 'Pagamento de entrega recebido',
          data: expect.objectContaining({
            orderId: mockOrderId,
            amount: mockDeliveryFee,
          }),
        })
      );
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
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\] Error processing payment with split/i),
        expect.objectContaining({ orderId: mockOrderId }),
        expect.any(String)
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
      mockedGetDoc.mockImplementationOnce(() =>
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
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/Pedido.*encontrado/i),
        expect.objectContaining({ orderId: 'INVALID_ORDER' }),
        expect.any(String)
      );

      // Verificar que o pagamento não foi processado
      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
    });

    it('should validate producer and delivery person exist before processing payment', async () => {
      // Simular pedido sem produtor ou entregador
      mockedGetDoc.mockImplementationOnce(() =>
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
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\] Produtor não definido no pedido/i),
        expect.objectContaining({ orderId: mockOrderId }),
        expect.any(String)
      );

      // Verificar que o pagamento não foi processado
      expect(stripeService.processPaymentWithSplit).not.toHaveBeenCalled();
    });
  });
});
