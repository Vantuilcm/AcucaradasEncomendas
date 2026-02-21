import { PaymentService } from '../../services/PaymentService';
import { PrismaClient } from '@prisma/client';

// Garante que este teste use a implementação real, não o mock global
jest.unmock('../../services/PaymentService');

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

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = PaymentService.getInstance();
  });

  describe('savePayment', () => {
    it('deve salvar um pagamento com sucesso', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId: 'pi_123',
      };

      const mockPayment = {
        id: 'payment123',
        ...paymentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.savePayment(paymentData);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: paymentData,
      });
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentByPaymentId', () => {
    it('deve buscar um pagamento pelo ID com sucesso', async () => {
      const paymentId = 'pi_123';
      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentByPaymentId(paymentId);

      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { paymentId },
      });
      expect(result).toEqual(mockPayment);
    });
  });

  describe('updatePaymentStatus', () => {
    it('deve atualizar o status de um pagamento com sucesso', async () => {
      const paymentId = 'pi_123';
      const status = 'completed';
      const mockPayment = {
        id: 'payment123',
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status,
        paymentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.payment.update.mockResolvedValue(mockPayment);

      const result = await service.updatePaymentStatus(paymentId, status);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { paymentId },
        data: { status },
      });
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getUserPayments', () => {
    it('deve listar pagamentos de um usuário com sucesso', async () => {
      const userId = 'user123';
      const mockPayments = [
        {
          id: 'payment1',
          userId,
          amount: 100,
          paymentMethod: 'card',
          status: 'completed',
          paymentId: 'pi_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'payment2',
          userId,
          amount: 200,
          paymentMethod: 'pix',
          status: 'completed',
          paymentId: 'pi_2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getUserPayments(userId);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPayments);
    });
  });
});
