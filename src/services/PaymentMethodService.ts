import * as firestore from 'firebase/firestore';
import { db } from '../config/firebase';

const {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} = firestore as any;
import { PaymentMethod, CreditCard, PixPayment } from '../types/PaymentMethod';
import { loggingService } from './LoggingService';

export class PaymentMethodService {
  private readonly collection = 'payment_methods';

  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethodsRef = collection(db, this.collection);
      const q = query(paymentMethodsRef, where('userId', '==', userId));

      const querySnapshot = await getDocs(q);
      const paymentMethods: PaymentMethod[] = [];

      querySnapshot.forEach((doc: any) => {
        paymentMethods.push({
          id: doc.id,
          ...doc.data(),
        } as PaymentMethod);
      });

      return paymentMethods;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar métodos de pagamento do usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async addCreditCard(
    userId: string,
    card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<CreditCard> {
    try {
      const paymentMethodsRef = collection(db, this.collection);
      const docRef = await addDoc(paymentMethodsRef, {
        ...card,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newCard: CreditCard = {
        id: docRef.id,
        ...card,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Cartão adicionado com sucesso', { cardId: docRef.id });
      return newCard;
    } catch (error) {
      loggingService.error('Erro ao adicionar cartão', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async addPixPayment(
    userId: string,
    pix: Omit<PixPayment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<PixPayment> {
    try {
      const paymentMethodsRef = collection(db, this.collection);
      const docRef = await addDoc(paymentMethodsRef, {
        ...pix,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newPix: PixPayment = {
        id: docRef.id,
        ...pix,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Pix adicionado com sucesso', { pixId: docRef.id });
      return newPix;
    } catch (error) {
      loggingService.error('Erro ao adicionar pix', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const paymentMethodRef = doc(db, this.collection, paymentMethodId);
      await deleteDoc(paymentMethodRef);

      loggingService.info('Método de pagamento excluído com sucesso', { paymentMethodId });
    } catch (error) {
      loggingService.error(
        'Erro ao excluir método de pagamento',
        error instanceof Error ? error : undefined,
        { paymentMethodId }
      );
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      // Primeiro, remove o status de padrão de todos os métodos de pagamento do usuário
      const paymentMethodsRef = collection(db, this.collection);
      const q = query(
        paymentMethodsRef,
        where('userId', '==', userId),
        where('isDefault', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc: any) => {
        batch.update(doc.ref, { isDefault: false });
      });

      // Define o novo método de pagamento padrão
      const newDefaultPaymentMethodRef = doc(db, this.collection, paymentMethodId);
      batch.update(newDefaultPaymentMethodRef, { isDefault: true });

      await batch.commit();

      loggingService.info('Método de pagamento padrão atualizado com sucesso', { paymentMethodId });
    } catch (error) {
      loggingService.error(
        'Erro ao definir método de pagamento padrão',
        error instanceof Error ? error : undefined,
        { userId, paymentMethodId }
      );
      throw error;
    }
  }
}
