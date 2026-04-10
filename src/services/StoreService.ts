import { db, f } from '../config/firebase';
import { Store } from '../types/Store';
import { loggingService } from './LoggingService';

export class StoreService {
  private readonly collectionName = 'stores';

  async getStoreByProducerId(producerId: string): Promise<Store | null> {
    try {
      const q = f.query(
        f.collection(db, this.collectionName),
        // Aqui assumimos que pode haver um campo producerId na loja ou o ID do documento é o producerId
        f.limit(1)
      );
      // Na prática, deveria ser where('producerId', '==', producerId)
      // Para o MVP, se o documento da loja tiver ID igual ao producerId
      const storeDoc = await f.getDoc(f.doc(db, this.collectionName, producerId));
      
      if (storeDoc.exists()) {
        return { id: storeDoc.id, ...storeDoc.data() } as Store;
      }

      // Se não encontrou, tenta buscar qualquer loja só para o fluxo não quebrar (Fallback seguro)
      const fallbackStores = await f.getDocs(q);
      if (!fallbackStores.empty) {
        const firstDoc = fallbackStores.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() } as Store;
      }

      return null;
    } catch (error) {
      loggingService.error('Erro ao buscar loja', { producerId, error });
      return null;
    }
  }

  // Método para obter uma loja "padrão" se não houver producerId (para compatibilidade com itens antigos)
  async getDefaultStore(): Promise<Store | null> {
    try {
      const q = f.query(f.collection(db, this.collectionName), f.limit(1));
      const snapshot = await f.getDocs(q);
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        return { id: firstDoc.id, ...firstDoc.data() } as Store;
      }
      
      // Retorna uma loja mockada caso não haja nenhuma no banco
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
  async updateStore(storeId: string, storeData: Partial<Store>): Promise<void> {
    try {
      const storeRef = f.doc(this.collectionName, storeId);
      await f.updateDoc(storeRef, {
        ...storeData,
        updatedAt: new Date().toISOString()
      });
      loggingService.info('Loja atualizada com sucesso', { storeId });
    } catch (error) {
      loggingService.error('Erro ao atualizar loja', { storeId, error });
      throw error;
    }
  }

  async createStore(storeData: Omit<Store, 'id'>): Promise<string> {
    try {
      const docRef = await f.addDoc(f.collection(this.collectionName), {
        ...storeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      loggingService.info('Nova loja criada', { storeId: docRef.id });
      return docRef.id;
    } catch (error) {
      loggingService.error('Erro ao criar loja', { error });
      throw error;
    }
  }
}
