import { f } from '../config/firebase';
const { doc, getDoc, collection, getDocs, query, limit } = f;
import { db } from '../config/firebase';
import { Store } from '../types/Store';
import { loggingService } from './LoggingService';

export class StoreService {
  private readonly collectionName = 'stores';

  async getStoreByProducerId(producerId: string): Promise<Store | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        // Aqui assumimos que pode haver um campo producerId na loja ou o ID do documento é o producerId
        limit(1)
      );
      // Na prática, deveria ser where('producerId', '==', producerId)
      // Para o MVP, se o documento da loja tiver ID igual ao producerId
      const storeDoc = await getDoc(doc(db, this.collectionName, producerId));
      
      if (storeDoc.exists()) {
        return { id: storeDoc.id, ...storeDoc.data() } as Store;
      }

      // Se não encontrou, tenta buscar qualquer loja só para o fluxo não quebrar (Fallback seguro)
      const fallbackStores = await getDocs(q);
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
      const q = query(collection(db, this.collectionName), limit(1));
      const snapshot = await getDocs(q);
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
    } catch (error) {
      loggingService.error('Erro ao buscar loja padrão', { error });
      return null;
    }
  }
}
