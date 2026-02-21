import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  GeoPoint,
  updateDoc,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../config/firebase';
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
        addressData.district && addressData.district !== addressData.city
          ? `- ${addressData.district}`
          : '',
        `${addressData.city}, ${addressData.region}`,
      ].filter(Boolean);

      return parts.join(' ');
    } catch (error) {
      loggingService.error('Erro ao obter endereço das coordenadas', { coordinates, error });
      return null;
    }
  }

  /**
   * Salva a última localização usada pelo usuário
   * @param userId ID do usuário
   * @param location Coordenadas geográficas
   */
  public async saveUserLocation(userId: string, location: GeoCoordinates): Promise<void> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        lastLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          updatedAt: new Date().toISOString(),
        },
      });

      loggingService.info('Localização do usuário salva com sucesso', {
        userId,
        location,
      });
    } catch (error) {
      loggingService.error('Erro ao salvar localização do usuário', {
        userId,
        location,
        error,
      });
      throw error;
    }
  }

  /**
   * Calcula a distância entre dois pontos utilizando a fórmula de Haversine
   * @param point1 Coordenadas do primeiro ponto
   * @param point2 Coordenadas do segundo ponto
   * @returns Distância em quilômetros
   */
  public calculateDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distância em km

    return Number(distance.toFixed(1));
  }

  /**
   * Converte graus para radianos
   * @param degrees Valor em graus
   * @returns Valor em radianos
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcula o tempo estimado de entrega com base na distância
   * @param distanceInKm Distância em quilômetros
   * @returns Objeto com tempo mínimo e máximo em minutos
   */
  public calculateEstimatedDeliveryTime(distanceInKm: number): { min: number; max: number } {
    // Base: 15 minutos de preparo + 3 minutos por km (min) até 5 minutos por km (max)
    const preparationTime = 15;
    const minTimePerKm = 3;
    const maxTimePerKm = 5;

    const minTime = Math.round(preparationTime + distanceInKm * minTimePerKm);
    const maxTime = Math.round(preparationTime + distanceInKm * maxTimePerKm);

    return { min: minTime, max: maxTime };
  }

  /**
   * Busca lojas próximas à localização fornecida dentro do raio especificado
   * @param location Coordenadas de referência
   * @param radiusInKm Raio máximo de busca em quilômetros (padrão: 15km)
   * @returns Lista de lojas ordenadas por distância
   */
  public async getNearbyStores(
    location: GeoCoordinates,
    radiusInKm: number = MAX_PROXIMITY_RADIUS
  ): Promise<Store[]> {
    try {
      // Buscar todas as lojas (em uma implementação real, usaríamos uma consulta geoespacial do Firestore)
      const storesRef = collection(db, this.storesCollection);
      const querySnapshot = await getDocs(storesRef);

      // Array para armazenar as lojas encontradas
      const stores: Store[] = [];

      // Para cada loja, calcular a distância e adicionar se estiver dentro do raio
      querySnapshot.forEach(doc => {
        const storeData = doc.data() as Omit<Store, 'id'>;

        // Calcular distância
        const distance = this.calculateDistance(location, storeData.coordinates);

        // Verificar se está dentro do raio especificado
        if (distance <= radiusInKm) {
          // Calcular tempo estimado de entrega
          const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(distance);

          // Adicionar à lista de lojas
          stores.push({
            id: doc.id,
            ...storeData,
            distance,
            estimatedDeliveryTime,
          });
        }
      });

      // Ordenar por distância (do mais próximo ao mais distante)
      return stores.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      loggingService.error('Erro ao buscar lojas próximas', {
        location,
        radiusInKm,
        error,
      });
      throw error;
    }
  }

  /**
   * Busca lojas dentro do raio máximo que têm o produto disponível
   * @param location Coordenadas de referência
   * @param productId ID do produto
   * @param radiusInKm Raio máximo em quilômetros (padrão: 15km)
   * @returns Lista de lojas que têm o produto, ordenadas por distância
   */
  public async getStoresWithProduct(
    location: GeoCoordinates,
    productId: string,
    radiusInKm: number = MAX_PROXIMITY_RADIUS
  ): Promise<Store[]> {
    try {
      // Primeiro, obter todas as lojas próximas
      const nearbyStores = await this.getNearbyStores(location, radiusInKm);

      // Array para armazenar as lojas que têm o produto
      const storesWithProduct: Store[] = [];

      // Para cada loja, verificar se tem o produto disponível
      for (const store of nearbyStores) {
        // Em uma implementação real, verificaríamos o estoque do produto na loja
        // Aqui, estamos fazendo uma simulação
        const hasProduct = await this.checkProductAvailability(store.id, productId);

        if (hasProduct) {
          storesWithProduct.push(store);
        }
      }

      return storesWithProduct;
    } catch (error) {
      loggingService.error('Erro ao buscar lojas com produto disponível', {
        location,
        productId,
        radiusInKm,
        error,
      });
      throw error;
    }
  }

  /**
   * Verifica se um produto está disponível em uma loja específica
   * @param storeId ID da loja
   * @param productId ID do produto
   * @returns True se o produto estiver disponível, false caso contrário
   */
  private async checkProductAvailability(storeId: string, productId: string): Promise<boolean> {
    try {
      // Em uma implementação real, consultaríamos o Firestore
      // Para este exemplo, vamos retornar true com 80% de probabilidade
      return Math.random() < 0.8;
    } catch (error) {
      loggingService.error('Erro ao verificar disponibilidade do produto', {
        storeId,
        productId,
        error,
      });
      return false;
    }
  }
}
