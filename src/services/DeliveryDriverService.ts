import { f, db, getDb } from '../config/firebase';
import {
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  setDoc as firestoreSetDoc,
} from 'firebase/firestore';
const { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot } = f;
import { DeliveryDriver, DeliveryDriverUpdate, DeliveryDriverStats } from '../types/DeliveryDriver';
import { loggingService } from './LoggingService';

function stripUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }

    if (
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      !(entry instanceof Date)
    ) {
      sanitized[key] = stripUndefinedFields(entry as Record<string, unknown>);
      continue;
    }

    sanitized[key] = entry;
  }

  return sanitized as T;
}

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
      if (!userId) {
        throw new Error('userId is required to load delivery driver');
      }

      const firestoreDb = getDb();
      const driverRef = firestoreDoc(firestoreDb, this.collection, userId);

      if (!driverRef) {
        throw new Error('Invalid Firestore document reference for delivery driver lookup');
      }

      const snapshot = await firestoreGetDoc(driverRef);

      console.error('[DRIVER_LOAD_FORENSIC]', {
        uid: userId,
        documentPath: `delivery_drivers/${userId}`,
        documentExists: snapshot.exists(),
        documentId: snapshot.exists() ? snapshot.id : null,
        driverUserIdField: snapshot.exists() ? snapshot.data()?.userId ?? null : null,
      });

      if (!snapshot.exists()) {
        return null;
      }

      const mappedDriver = {
        id: snapshot.id,
        ...snapshot.data(),
      } as DeliveryDriver;

      console.error('[DRIVER_LOAD_FORENSIC_RESULT]', {
        uid: userId,
        documentPath: `delivery_drivers/${snapshot.id}`,
        documentExists: true,
        documentId: snapshot.id,
        driverId: mappedDriver.id,
        driverUserId: mappedDriver.userId,
      });

      return mappedDriver;
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
      if (!driver.userId) {
        throw new Error('userId is required to create delivery driver');
      }

      const firestoreDb = getDb();
      const driverRef = firestoreDoc(firestoreDb, this.collection, driver.userId);

      if (!driverRef) {
        throw new Error('Invalid Firestore document reference for delivery driver');
      }

      const now = new Date().toISOString();
      const payload = stripUndefinedFields({
        ...driver,
        createdAt: now,
        updatedAt: now,
      });

      console.error('[CREATE_DRIVER_START]', {
        userId: driver.userId,
      });

      await firestoreSetDoc(driverRef, payload, { merge: true });

      console.error('[CREATE_DRIVER_SUCCESS]', {
        userId: driver.userId,
      });

      const newDriver: DeliveryDriver = {
        id: driverRef.id,
        ...driver,
        createdAt: now,
        updatedAt: now,
      };

      loggingService.info('Entregador criado com sucesso', { driverId: driverRef.id });
      return newDriver;
    } catch (error) {
      const createError = error as Error & { code?: string };
      console.error('[CREATE_DRIVER_ERROR]', {
        message: createError?.message,
        code: createError?.code,
        stack: createError?.stack,
      });
      loggingService.error(
        'Erro ao criar entregador',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async updateDriver(driverId: string, updates: DeliveryDriverUpdate): Promise<void> {
    try {
      if (!driverId) {
        throw new Error('driverId is required to update delivery driver');
      }

      const firestoreDb = getDb();
      const driverRef = firestoreDoc(firestoreDb, this.collection, driverId);

      if (!driverRef) {
        throw new Error('Invalid Firestore document reference for delivery driver update');
      }

      const payload = stripUndefinedFields({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      await firestoreSetDoc(driverRef, payload, { merge: true });

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

  public subscribeToActiveDrivers(callback: (drivers: DeliveryDriver[]) => void): () => void {
    const driversRef = collection(db, this.collection);
    const q = query(
      driversRef,
      where('status', '==', 'active'),
      where('availability.isAvailable', '==', true)
    );

    return onSnapshot(q, (snapshot: any) => {
      const drivers = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as DeliveryDriver[];
      callback(drivers);
    }, (error: any) => {
      loggingService.error('Erro ao monitorar entregadores ativos', error);
    });
  }
}
