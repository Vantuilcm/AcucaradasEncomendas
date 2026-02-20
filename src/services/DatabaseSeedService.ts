import { db } from '@/config/firebase';
import * as firestore from 'firebase/firestore';

const { 
  collection, 
  getDocs, 
  addDoc, 
  writeBatch,
  GeoPoint,
  doc
} = firestore as any;

export type DocumentData = any;
export type DocumentSnapshot<T> = any;
export type GeoPoint = any;

export interface HotspotData {
  name: string;
  center: GeoPoint;
  radiusMeters: number;
  demandLevel: 'low' | 'medium' | 'high';
  active: boolean;
  message: string;
  updatedAt: string;
}

export class DatabaseSeedService {
  private static instance: DatabaseSeedService;

  private constructor() {}

  public static getInstance(): DatabaseSeedService {
    if (!DatabaseSeedService.instance) {
      DatabaseSeedService.instance = new DatabaseSeedService();
    }
    return DatabaseSeedService.instance;
  }

  /**
   * Popula a coleção de hotspots de demanda
   */
  public async seedHotspots(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const hotspotsRef = collection(db, 'demand_hotspots');
      const snapshot = await getDocs(hotspotsRef);
      
      // Limpar existentes
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach((document: DocumentSnapshot<DocumentData>) => {
          batch.delete(document.ref);
        });
        await batch.commit();
      }

      const initialHotspots: HotspotData[] = [
        {
          name: 'Centro Comercial',
          center: new GeoPoint(-23.5505, -46.6333),
          radiusMeters: 1000,
          demandLevel: 'high',
          active: true,
          message: 'Alta demanda de pedidos no Centro! Muitos clientes aguardando.',
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Parque Ibirapuera',
          center: new GeoPoint(-23.5874, -46.6576),
          radiusMeters: 1500,
          demandLevel: 'medium',
          active: true,
          message: 'Movimentação moderada no Parque. Boa oportunidade para entregas.',
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Avenida Paulista',
          center: new GeoPoint(-23.5615, -46.6559),
          radiusMeters: 800,
          demandLevel: 'high',
          active: true,
          message: 'Pico de pedidos na Paulista! Entregadores na região terão prioridade.',
          updatedAt: new Date().toISOString()
        },
        {
          name: 'Vila Madalena',
          center: new GeoPoint(-23.5552, -46.6889),
          radiusMeters: 1200,
          demandLevel: 'medium',
          active: true,
          message: 'Bares e restaurantes com alta demanda na Vila Madalena.',
          updatedAt: new Date().toISOString()
        }
      ];

      let count = 0;
      for (const hotspot of initialHotspots) {
        await addDoc(hotspotsRef, hotspot);
        count++;
      }

      return { success: true, count };
    } catch (error: any) {
      console.error('Erro ao semear hotspots:', error);
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * Cria dados de teste para o fluxo de 2FA (opcional)
   */
  public async setupTest2FAUser(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      // Aqui poderíamos configurar flags de teste no usuário
      return true;
    } catch (error) {
      console.error('Erro ao configurar usuário de teste:', error);
      return false;
    }
  }
}
