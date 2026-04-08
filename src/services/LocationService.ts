import * as Location from '../compat/expoLocation';
import { loggingService } from './LoggingService';

// Raio máximo em km para busca de lojas próximas
export const MAX_PROXIMITY_RADIUS = 15;

// Interface para representar uma coordenada geográfica
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

// Interface para representar uma loja
export interface Store {
  id: string;
  name: string;
  address: string;
  coordinates: GeoCoordinates;
  isOpen: boolean;
  openingHours: {
    [key: string]: { open: string; close: string };
  };
  distance?: number; // Distância calculada (opcional)
  estimatedDeliveryTime?: {
    min: number;
    max: number;
  };
}

export class LocationService {
  private readonly storesCollection = 'stores';
  private readonly usersCollection = 'users';
  private firebaseInstance: any = null;

  private async getFirebase() {
    if (this.firebaseInstance) return this.firebaseInstance;
    try {
      const firebase = await import('../config/firebase');
      const firestore = await import('firebase/firestore');
      this.firebaseInstance = { ...firebase, f: firestore };
      return this.firebaseInstance;
    } catch (e) {
      loggingService.error('Erro ao carregar Firebase dinamicamente no LocationService', { e });
      throw e;
    }
  }

  /**
   * Solicita permissão de localização ao usuário
   * @returns True se a permissão foi concedida, false caso contrário
   */
  public async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      loggingService.error('Erro ao solicitar permissão de localização', { error });
      return false;
    }
  }

  /**
   * Obtém a localização atual do usuário
   * @returns Coordenadas geográficas atuais ou null em caso de erro
   */
  public async getCurrentLocation(): Promise<GeoCoordinates | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      loggingService.error('Erro ao obter localização atual', { error });
      return null;
    }
  }

  /**
   * Obtém endereço a partir de coordenadas geográficas
   * @param coordinates Coordenadas geográficas
   * @returns Endereço formatado ou null em caso de erro
   */
  public async getAddressFromCoordinates(coordinates: GeoCoordinates): Promise<string | null> {
    try {
      const [addressData] = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (!addressData) {
        return null;
      }

      // Formatar o endereço
      const parts = [
        addressData.street,
        addressData.streetNumber,
        addressData.district && addressData.district !== addressData.city ? addressData.district : null,
        addressData.city,
        addressData.region,
        addressData.postalCode,
      ].filter(Boolean);

      return parts.join(', ');
    } catch (error) {
      loggingService.error('Erro ao converter coordenadas em endereço', { error });
      return null;
    }
  }

  /**
   * Busca todas as lojas próximas à localização informada
   * @param coordinates Coordenadas geográficas centrais
   * @param radius Raio de busca em km
   * @param onlyOpen Se true, retorna apenas as lojas abertas
   * @returns Lista de lojas encontradas
   */
  public async getNearbyStores(
    coordinates: GeoCoordinates,
    radius: number = MAX_PROXIMITY_RADIUS,
    onlyOpen: boolean = false
  ): Promise<Store[]> {
    try {
      const { db, f } = await this.getFirebase();
      const storesRef = f.collection(db, this.storesCollection);
      const querySnapshot = await f.getDocs(storesRef);
      
      const stores: Store[] = [];
      
      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        const store: Store = {
          id: doc.id,
          name: data.name,
          address: data.address,
          coordinates: data.coordinates,
          isOpen: data.isOpen,
          openingHours: data.openingHours,
        };

        // Calcular distância
        const distance = this.calculateDistance(coordinates, store.coordinates);
        
        if (distance <= radius) {
          if (!onlyOpen || store.isOpen) {
            stores.push({ ...store, distance });
          }
        }
      });

      // Ordenar por distância
      return stores.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      loggingService.error('Erro ao buscar lojas próximas', { error });
      return [];
    }
  }

  /**
   * Busca lojas que possuem um produto específico
   * @param coordinates Coordenadas geográficas centrais
   * @param productId ID do produto
   * @param radius Raio de busca em km
   * @returns Lista de lojas encontradas
   */
  public async getStoresWithProduct(
    coordinates: GeoCoordinates,
    productId: string,
    radius: number = MAX_PROXIMITY_RADIUS
  ): Promise<Store[]> {
    try {
      const { db, f } = await this.getFirebase();
      // Esta é uma implementação simplificada. No Firebase real, 
      // você provavelmente faria uma consulta filtrada.
      const stores = await this.getNearbyStores(coordinates, radius);
      
      // Simular verificação de estoque (em um app real seria via consulta)
      // Por enquanto retorna todas as lojas próximas como se tivessem o produto
      return stores;
    } catch (error) {
      loggingService.error('Erro ao buscar lojas com produto', { productId, error });
      return [];
    }
  }

  /**
   * Salva a última localização conhecida do usuário
   * @param userId ID do usuário
   * @param coordinates Coordenadas geográficas
   */
  public async saveUserLocation(userId: string, coordinates: GeoCoordinates): Promise<void> {
    try {
      const { db, f } = await this.getFirebase();
      const userRef = f.doc(db, this.usersCollection, userId);
      await f.updateDoc(userRef, {
        lastLocation: coordinates,
        lastLocationUpdate: f.serverTimestamp(),
      });
    } catch (error) {
      loggingService.error('Erro ao salvar localização do usuário', { userId, error });
    }
  }

  /**
   * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
   * @param p1 Ponto 1
   * @param p2 Ponto 2
   * @returns Distância em km
   */
  private calculateDistance(p1: GeoCoordinates, p2: GeoCoordinates): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(p2.latitude - p1.latitude);
    const dLon = this.deg2rad(p2.longitude - p1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(p1.latitude)) *
        Math.cos(this.deg2rad(p2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
