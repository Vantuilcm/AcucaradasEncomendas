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
import { DeliveryDriver, DeliveryDriverUpdate, DeliveryDriverStats } from '../types/DeliveryDriver';
import { loggingService } from './LoggingService';

export class DeliveryDriverService {
  private readonly collection = 'delivery_drivers';

  async getDriverById(driverId: string): Promise<DeliveryDriver | null> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      const driverDoc = await getDoc(driverRef);

      if (!driverDoc.exists()) {
        return null;
      }

      return {
        id: driverDoc.id,
        ...driverDoc.data(),
      } as DeliveryDriver;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregador',
        error instanceof Error ? error : undefined,
        { driverId }
      );
      throw error;
    }
  }

  async getDriverByUserId(userId: string): Promise<DeliveryDriver | null> {
    try {
      const driversRef = collection(db, this.collection);
      const q = query(driversRef, where('userId', '==', userId));
      const querySnapshot = (await getDocs(q as any)) as any;

      if (querySnapshot.empty) {
        return null;
      }

      const driverDoc = querySnapshot.docs?.[0];
      if (!driverDoc) {
        return null;
      }
      return {
        id: driverDoc.id,
        ...driverDoc.data(),
      } as DeliveryDriver;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregador por usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async createDriver(
    driver: Omit<DeliveryDriver, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DeliveryDriver> {
    try {
      const driversRef = collection(db, this.collection);
      const docRef = doc(driversRef as any);
      const now = new Date().toISOString();
      await setDoc(
        docRef,
        {
          ...driver,
          createdAt: now,
          updatedAt: now,
        } as any
      );

      const newDriver: DeliveryDriver = {
        id: docRef.id,
        ...driver,
        createdAt: now,
        updatedAt: now,
      };

      loggingService.info('Entregador criado com sucesso', { driverId: docRef.id });
      return newDriver;
    } catch (error) {
      loggingService.error(
        'Erro ao criar entregador',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async updateDriver(driverId: string, updates: DeliveryDriverUpdate): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(
        driverRef,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Entregador atualizado com sucesso', { driverId });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar entregador',
        error instanceof Error ? error : undefined,
        { driverId, updates }
      );
      throw error;
    }
  }

  async updateDriverStatus(driverId: string, status: DeliveryDriver['status']): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(
        driverRef,
        {
          status,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Status do entregador atualizado com sucesso', {
        driverId,
        status,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar status do entregador',
        error instanceof Error ? error : undefined,
        { driverId, status }
      );
      throw error;
    }
  }

  async updateDriverAvailability(driverId: string, isAvailable: boolean): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(
        driverRef,
        {
          'availability.isAvailable': isAvailable,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Disponibilidade do entregador atualizada com sucesso', {
        driverId,
        isAvailable,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar disponibilidade do entregador',
        error instanceof Error ? error : undefined,
        { driverId, isAvailable }
      );
      throw error;
    }
  }

  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    try {
      const driverRef = doc(db, this.collection, driverId);
      await updateDoc(
        driverRef,
        {
          location: {
            latitude,
            longitude,
            lastUpdate: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Localização do entregador atualizada com sucesso', {
        driverId,
        latitude,
        longitude,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar localização do entregador',
        error instanceof Error ? error : undefined,
        { driverId, latitude, longitude }
      );
      throw error;
    }
  }

  async getDriverStats(driverId: string): Promise<DeliveryDriverStats> {
    try {
      // TODO: Implementar cálculo de estatísticas baseado nos pedidos
      const stats: DeliveryDriverStats = {
        totalDeliveries: 0,
        totalEarnings: 0,
        averageRating: 0,
        completionRate: 0,
        onTimeRate: 0,
        monthlyEarnings: {},
      };

      return stats;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar estatísticas do entregador',
        error instanceof Error ? error : undefined,
        { driverId }
      );
      throw error;
    }
  }

  async getAvailableDrivers(): Promise<DeliveryDriver[]> {
    try {
      const driversRef = collection(db, this.collection);
      const q = query(
        driversRef,
        where('status', '==', 'active'),
        where('availability.isAvailable', '==', true)
      );
      const querySnapshot = (await getDocs(q as any)) as any;

      return (querySnapshot.docs || []).map((snapshot: any) => ({
        id: snapshot.id,
        ...snapshot.data(),
      })) as DeliveryDriver[];
    } catch (error) {
      loggingService.error(
        'Erro ao buscar entregadores disponíveis',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }
}
