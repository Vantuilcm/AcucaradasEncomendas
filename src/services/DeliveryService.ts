import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';
import {
  calculateDeliveryFee,
  calculateEstimatedDeliveryTime,
  MAX_DELIVERY_DISTANCE,
} from '../constants/delivery';
import type { DeliveryDetails, DeliveryStatus } from '../types/Delivery';

export class DeliveryService {
  private readonly collection = 'deliveries';

  /**
   * Calcula o valor da entrega com base na distância
   * @param distanceInKm Distância em quilômetros
   * @returns Valor da entrega em reais
   */
  public calculateDeliveryFee(distanceInKm: number): number {
    return calculateDeliveryFee(distanceInKm);
  }

  /**
   * Verifica se a entrega é possível para a distância informada
   * @param distanceInKm Distância em quilômetros
   * @returns true se a entrega for possível, false caso contrário
   */
  public isDeliveryAvailable(distanceInKm: number): boolean {
    return distanceInKm <= MAX_DELIVERY_DISTANCE;
  }

  /**
   * Calcula o tempo estimado de entrega com base na distância
   * @param distanceInKm Distância em quilômetros
   * @returns Tempo estimado em minutos
   */
  public getEstimatedDeliveryTime(distanceInKm: number): number {
    return calculateEstimatedDeliveryTime(distanceInKm);
  }

  /**
   * Registra uma nova entrega no sistema
   * @param delivery Detalhes da entrega
   * @returns Objeto da entrega com ID
   */
  public async createDelivery(delivery: Omit<DeliveryDetails, 'id'>): Promise<DeliveryDetails> {
    try {
      const deliveriesRef = collection(db, this.collection);
      const newDeliveryRef = doc(deliveriesRef);

      const newDelivery: DeliveryDetails = {
        id: newDeliveryRef.id,
        ...delivery,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(newDeliveryRef, newDelivery);

      loggingService.info('Nova entrega criada', { deliveryId: newDeliveryRef.id });
      return newDelivery;
    } catch (error) {
      loggingService.error('Erro ao criar entrega', { error });
      throw error;
    }
  }

  /**
   * Atualiza o status de uma entrega
   * @param deliveryId ID da entrega
   * @param status Novo status
   * @returns Promise<void>
   */
  public async updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void> {
    try {
      const deliveryRef = doc(db, this.collection, deliveryId);

      await updateDoc(deliveryRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      // loggingService.info('Status da entrega atualizado', { deliveryId, status });
    } catch (error) {
      loggingService.error('Erro ao atualizar status da entrega', { deliveryId, status, error });
      throw error;
    }
  }

  /**
   * Busca uma entrega pelo ID
   * @param deliveryId ID da entrega
   * @returns Objeto da entrega ou null se não encontrada
   */
  public async getDeliveryById(deliveryId: string): Promise<DeliveryDetails | null> {
    try {
      const deliveryRef = doc(db, this.collection, deliveryId);
      const deliveryDoc = await getDoc(deliveryRef);

      if (!deliveryDoc.exists()) {
        return null;
      }

      return {
        id: deliveryDoc.id,
        ...deliveryDoc.data(),
      } as DeliveryDetails;
    } catch (error) {
      loggingService.error('Erro ao buscar entrega', { deliveryId, error });
      throw error;
    }
  }

  /**
   * Busca entregas por status
   * @param status Status da entrega
   * @param limit Limite de resultados
   * @returns Lista de entregas
   */
  public async getDeliveriesByStatus(
    status: DeliveryStatus,
    limitResults = 10
  ): Promise<DeliveryDetails[]> {
    try {
      const deliveriesRef = collection(db, this.collection);
      const q = query(
        deliveriesRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const deliveries: DeliveryDetails[] = [];

      querySnapshot.forEach(doc => {
        deliveries.push({
          id: doc.id,
          ...doc.data(),
        } as DeliveryDetails);
      });

      return deliveries;
    } catch (error) {
      loggingService.error('Erro ao buscar entregas por status', { status, error });
      throw error;
    }
  }

  /**
   * Alias para calculateDeliveryFee para compatibilidade
   */
  public calcularTaxaEntrega(distanciaKm: number): number {
    return this.calculateDeliveryFee(distanciaKm);
  }

  /**
   * Alias para isDeliveryAvailable para compatibilidade
   */
  public verificarEntregaDisponivel(distanciaKm: number): boolean {
    return this.isDeliveryAvailable(distanciaKm);
  }

  /**
   * Alias para getEstimatedDeliveryTime para compatibilidade
   */
  public obterTempoEntregaEstimado(distanciaKm: number): number {
    return this.getEstimatedDeliveryTime(distanciaKm);
  }

  /**
   * Alias para createDelivery para compatibilidade
   */
  public async criarEntrega(delivery: Omit<DeliveryDetails, 'id'>): Promise<DeliveryDetails> {
    return this.createDelivery(delivery);
  }

  /**
   * Alias para updateDeliveryStatus para compatibilidade
   */
  public async atualizarStatusEntrega(deliveryId: string, status: DeliveryStatus): Promise<void> {
    return this.updateDeliveryStatus(deliveryId, status);
  }

  /**
   * Alias para getDeliveryById para compatibilidade
   */
  public async obterEntregaPorId(deliveryId: string): Promise<DeliveryDetails | null> {
    return this.getDeliveryById(deliveryId);
  }

  /**
   * Alias para getDeliveriesByStatus para compatibilidade
   */
  public async obterEntregasPorStatus(status: DeliveryStatus, limite: number = 10): Promise<DeliveryDetails[]> {
    return this.getDeliveriesByStatus(status, limite);
  }
}
