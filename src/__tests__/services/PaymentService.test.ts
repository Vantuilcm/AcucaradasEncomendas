const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: any, name: string) => ({ name })),
  doc: jest.fn((_collectionRef?: any) => ({ id: 'payment123', ref: { id: 'payment123' } })),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  query: jest.fn((...args: any[]) => ({ args })),
  where: jest.fn((...args: any[]) => ({ args })),
  limit: jest.fn((n: number) => ({ n })),
  orderBy: jest.fn((field: string, direction: string) => ({ field, direction })),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

describe('PaymentService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    const { PaymentService } = require('../../services/PaymentService');
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

      const result = await service.savePayment(paymentData);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'payment123' }),
        expect.objectContaining({
          userId: paymentData.userId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          status: paymentData.status,
          paymentId: paymentData.paymentId,
          createdAt: expect.any(String),
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'payment123',
          userId: paymentData.userId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          status: paymentData.status,
          paymentId: paymentData.paymentId,
          createdAt: expect.any(String),
        })
      );
    });
  });

  describe('getPaymentByPaymentId', () => {
    it('deve buscar um pagamento pelo ID com sucesso', async () => {
      const paymentId = 'pi_123';
      const docData = {
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId,
      };

      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'payment123',
            data: () => docData,
          },
        ],
      });

      const result = await service.getPaymentByPaymentId(paymentId);
      expect(result).toEqual({ id: 'payment123', ...docData });
    });
  });

  describe('updatePaymentStatus', () => {
    it('deve atualizar o status de um pagamento com sucesso', async () => {
      const paymentId = 'pi_123';
      const status = 'completed';

      const ref = { id: 'payment123' };
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'payment123',
            ref,
            data: () => ({ paymentId }),
          },
        ],
      });

      mockGetDoc.mockResolvedValue({
        id: 'payment123',
        data: () => ({
          userId: 'user123',
          amount: 100,
          paymentMethod: 'card',
          status,
          paymentId,
        }),
      });

      const result = await service.updatePaymentStatus(paymentId, status);

      expect(mockUpdateDoc).toHaveBeenCalledWith(ref, { status });
      expect(mockGetDoc).toHaveBeenCalledWith(ref);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'payment123',
          status,
          paymentId,
        })
      );
    });
  });

  describe('getUserPayments', () => {
    it('deve listar pagamentos de um usuário com sucesso', async () => {
      const userId = 'user123';

      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'payment1',
            data: () => ({ userId, paymentId: 'pi_1', amount: 100 }),
          },
          {
            id: 'payment2',
            data: () => ({ userId, paymentId: 'pi_2', amount: 200 }),
          },
        ],
      });

      const result = await service.getUserPayments(userId);

      expect(result).toEqual([
        { id: 'payment1', userId, paymentId: 'pi_1', amount: 100 },
        { id: 'payment2', userId, paymentId: 'pi_2', amount: 200 },
      ]);
    });
  });
});
