import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Producer, ProducerUpdate } from '../types/Producer';
import { loggingService } from './LoggingService';

export class ProducerService {
  private static instance: ProducerService;
  private readonly collection = 'producers';

  private constructor() {}

  public static getInstance(): ProducerService {
    if (!ProducerService.instance) {
      ProducerService.instance = new ProducerService();
    }
    return ProducerService.instance;
  }

  async getProducerById(producerId: string): Promise<Producer | null> {
    try {
      const producerRef = doc(db, this.collection, producerId);
      const producerDoc = await getDoc(producerRef);

      if (!producerDoc.exists()) {
        return null;
      }

      return {
        id: producerDoc.id,
        ...producerDoc.data(),
      } as Producer;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar produtor',
        error instanceof Error ? error : undefined,
        { producerId }
      );
      throw error;
    }
  }

  async getProducerByUserId(userId: string): Promise<Producer | null> {
    try {
      const producersRef = collection(db, this.collection);
      const q = query(producersRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const producerDoc = querySnapshot.docs[0];
      return {
        id: producerDoc.id,
        ...producerDoc.data(),
      } as Producer;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar produtor por usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async createProducer(
    producer: Omit<Producer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Producer> {
    try {
      const producersRef = collection(db, this.collection);
      const newDocRef = doc(producersRef);
      const timestamp = new Date().toISOString();
      
      const newProducerData = {
        ...producer,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await setDoc(newDocRef, newProducerData);

      const newProducer: Producer = {
        id: newDocRef.id,
        ...newProducerData,
      };

      loggingService.info('Produtor criado com sucesso', { producerId: newDocRef.id });
      return newProducer;
    } catch (error) {
      loggingService.error('Erro ao criar produtor', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async updateProducer(producerId: string, updates: ProducerUpdate): Promise<void> {
    try {
      const producerRef = doc(db, this.collection, producerId);
      await updateDoc(producerRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Produtor atualizado com sucesso', { producerId });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar produtor',
        error instanceof Error ? error : undefined,
        { producerId, updates }
      );
      throw error;
    }
  }

  /**
   * Alias para getProducerById para compatibilidade
   */
  public async obterProdutorPorId(producerId: string): Promise<Producer | null> {
    return this.getProducerById(producerId);
  }

  /**
   * Alias para getProducerByUserId para compatibilidade
   */
  public async obterProdutorPorUsuario(userId: string): Promise<Producer | null> {
    return this.getProducerByUserId(userId);
  }

  /**
   * Alias para createProducer para compatibilidade
   */
  public async criarProdutor(producer: Omit<Producer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Producer> {
    return this.createProducer(producer);
  }

  /**
   * Alias para updateProducer para compatibilidade
   */
  public async atualizarProdutor(producerId: string, updates: ProducerUpdate): Promise<void> {
    return this.updateProducer(producerId, updates);
  }
}

export const producerService = ProducerService.getInstance();
