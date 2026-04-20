import { f, getAuth } from '../config/firebase';
import { Store } from '../types/Store';
import { loggingService } from './LoggingService';

export class StoreService {
  private readonly collectionName = 'stores';

  private getAuthUid(): string {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      throw new Error('Usuário não autenticado no Firebase Auth');
    }
    return uid;
  }

  async getStoreByProducerId(producerId: string): Promise<Store | null> {
    try {
      const uid = producerId || this.getAuthUid();
      const q = f.query(
        f.collection(this.collectionName),
        f.where('ownerId', '==', uid),
        f.limit(1)
      );
      
      const snapshot = await f.getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Store;
      }

      // Fallback para producerId se ownerId não retornar nada
      const q2 = f.query(
        f.collection(this.collectionName),
        f.where('producerId', '==', uid),
        f.limit(1)
      );
      const snapshot2 = await f.getDocs(q2);
      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0];
        return { id: doc.id, ...doc.data() } as Store;
      }

      return null;
    } catch (error) {
      loggingService.error('Erro ao buscar loja', { producerId, error });
      return null;
    }
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<void> {
    try {
      const uid = this.getAuthUid();
      const storeRef = f.doc(this.collectionName, storeId);
      
      // ETAPA 3 — PADRONIZAÇÃO STORES NO UPDATE (BUILD 1161)
      const updatedData = {
        ...storeData,
        ownerId: uid,
        userId: uid,
        producerId: uid,
        active: true,
        updatedAt: new Date().toISOString()
      };

      await f.updateDoc(storeRef, updatedData);
      loggingService.info('Loja atualizada com sucesso', { storeId, ownerId: uid });
    } catch (error) {
      loggingService.error('Erro ao atualizar loja', { storeId, error });
      throw error;
    }
  }

  async createStore(storeData: Omit<Store, 'id'>): Promise<string> {
    try {
      const uid = this.getAuthUid();
      // ETAPA 3 — PADRONIZAÇÃO STORES NA CRIAÇÃO (BUILD 1161)
      const normalizedData = {
        ...storeData,
        ownerId: uid,
        userId: uid,
        producerId: uid,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await f.addDoc(f.collection(this.collectionName), normalizedData);
      loggingService.info('Nova loja criada', { storeId: docRef.id, ownerId: uid });
      return docRef.id;
    } catch (error) {
      loggingService.error('Erro ao criar loja', { error });
      throw error;
    }
  }

  // Método para obter uma loja "padrão" se não houver producerId (para compatibilidade com itens antigos)
  async getDefaultStore(): Promise<Store | null> {
    try {
      const q = f.query(f.collection(this.collectionName), f.limit(1));
      const snapshot = await f.getDocs(q);
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() } as Store;
      }
      
      return {
        id: 'default_store',
        producerId: 'default_producer',
        name: 'Açucaradas Encomendas',
        isOpen: true,
        leadTime: 60,
        cutoffTime: '18:00',
        businessHours: {
          0: { open: '08:00', close: '12:00', isClosed: false },
          1: { open: '08:00', close: '18:00', isClosed: false },
          2: { open: '08:00', close: '18:00', isClosed: false },
          3: { open: '08:00', close: '18:00', isClosed: false },
          4: { open: '08:00', close: '18:00', isClosed: false },
          5: { open: '08:00', close: '18:00', isClosed: false },
          6: { open: '08:00', close: '14:00', isClosed: false },
        }
      };
    } catch (error) {
      loggingService.error('Erro ao buscar loja padrão', { error });
      return null;
    }
  }
}
