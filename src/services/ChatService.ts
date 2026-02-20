import * as firestore from 'firebase/firestore';
import { db } from '../config/firebase';

const {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} = firestore as any;

import type {
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { ChatMessage } from '../types/Chat';
import { loggingService } from './LoggingService';

export class ChatService {
  private static instance: ChatService;
  private readonly collectionName = 'chats';

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Envia uma mensagem em um pedido específico
   */
  public async sendMessage(
    orderId: string,
    senderId: string,
    senderRole: 'admin' | 'courier' | 'customer',
    senderName: string,
    text: string
  ): Promise<void> {
    try {
      const messageData: Omit<ChatMessage, 'id'> = {
        orderId,
        senderId,
        senderRole,
        senderName,
        text,
        createdAt: serverTimestamp() as any,
        read: false,
      };

      await addDoc(collection(db, this.collectionName), messageData);

      // Atualizar a sessão do chat (opcional, para lista de conversas)
      // Aqui poderíamos ter uma coleção separada 'chat_sessions'
      
      loggingService.info('Mensagem de chat enviada', { orderId, senderRole });
    } catch (error) {
      loggingService.error('Erro ao enviar mensagem de chat', error as Error);
      throw error;
    }
  }

  /**
   * Subscreve para mensagens de um pedido em tempo real
   */
  public subscribeToMessages(orderId: string, onMessages: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, this.collectionName),
      where('orderId', '==', orderId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date(),
      })) as ChatMessage[];
      
      onMessages(messages);
    });
  }

  /**
   * Marca mensagens como lidas para um papel específico
   */
  public async markAsRead(orderId: string, role: 'admin' | 'courier' | 'customer'): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('orderId', '==', orderId),
        where('senderRole', '!=', role),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      loggingService.error('Erro ao marcar mensagens como lidas', error as Error);
    }
  }
}
