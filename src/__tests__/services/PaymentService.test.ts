import { f } from '../../config/firebase';
import { PaymentService } from '../../services/PaymentService';
const { collection, doc, setDoc, getDoc, updateDoc } = f;

// Mock do Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  getFirestore: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = PaymentService.getInstance();
  });

  describe('savePayment', () => {
    it('deve salvar um pagamento com sucesso', async () => {
      const paymentData = {
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card' as const,
        status: 'completed' as const,
        paymentId: 'pi_123',
      };

      (collection as jest.Mock).mockReturnValue('payments-collection');
      (doc as jest.Mock).mockReturnValue({ id: 'pi_123' });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.savePayment(paymentData);

      expect(collection).toHaveBeenCalledWith(expect.anything(), 'payments');
      expect(doc).toHaveBeenCalledWith('payments-collection', 'pi_123');
      expect(setDoc).toHaveBeenCalledWith(
        { id: 'pi_123' },
        expect.objectContaining({
          ...paymentData,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'pi_123',
        ...paymentData
      }));
    });
  });

  describe('getPaymentByPaymentId', () => {
    it('deve buscar um pagamento pelo ID com sucesso', async () => {
      const paymentId = 'pi_123';
      const mockPaymentData = {
        userId: 'user123',
        amount: 100,
        paymentMethod: 'card',
        status: 'completed',
        paymentId,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      (doc as jest.Mock).mockReturnValue('payment-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'payment-doc-id',
        data: () => mockPaymentData,
      });

      const result = await service.getPaymentByPaymentId(paymentId);

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'payments', paymentId);
      expect(getDoc).toHaveBeenCalledWith('payment-doc-ref');
      expect(result).toEqual({
        id: 'payment-doc-id',
        ...mockPaymentData,
      });
    });

    it('deve retornar null se o pagamento não existir', async () => {
      const paymentId = 'pi_nonexistent';

      (doc as jest.Mock).mockReturnValue('payment-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await service.getPaymentByPaymentId(paymentId);

      expect(result).toBeNull();
    });
  });

  describe('updatePaymentStatus', () => {
    it('deve atualizar o status de um pagamento com sucesso', async () => {
      const paymentId = 'pi_123';
      const status = 'completed';

      (doc as jest.Mock).mockReturnValue('payment-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePaymentStatus(paymentId, status);

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'payments', paymentId);
      expect(updateDoc).toHaveBeenCalledWith(
        'payment-doc-ref',
        expect.objectContaining({
          status,
          updatedAt: expect.any(String),
        })
      );
      expect(result).toBe(true);
    });
  });
});
