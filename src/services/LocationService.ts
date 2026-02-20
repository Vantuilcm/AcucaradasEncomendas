import { Platform } from 'react-native';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';
import Constants from 'expo-constants';

// Chave da API do Google Maps para Geocodificação (idealmente vinda de env)
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 'AIzaSyDtb3R9DyV50vpS_6SI_k-6sv0zh8DQuAc'; 

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
  logoUrl?: string;
  bannerUrl?: string;
  distance?: number; // Distância calculada (opcional)
  estimatedDeliveryTime?: {
    min: number;
    max: number;
  };
  producerName?: string;
  producerPhotoUrl?: string;
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
      if (!Location || !Location.requestForegroundPermissionsAsync) {
        loggingService.error('expo-location não disponível', undefined);
        return false;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      loggingService.error(
        'Erro ao solicitar permissão de localização',
        error instanceof Error ? error : undefined
      );
      return false;
    }
  }

  /**
   * Obtém a localização atual do usuário
   * @returns Coordenadas geográficas atuais ou null em caso de erro
   */
  public async getCurrentLocation(): Promise<GeoCoordinates | null> {
    try {
      if (!Location || !Location.getCurrentPositionAsync || !Location.Accuracy) {
        loggingService.error('expo-location não disponível', undefined);
        return null;
      }
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const options: Location.LocationOptions = {
        accuracy: Location.Accuracy.Balanced,
      };

      // No web, getCurrentPositionAsync pode travar se o navegador demorar a responder
      // Vamos adicionar um timeout razoável para a plataforma web
      if (Platform.OS === 'web') {
        // @ts-ignore - timeout existe na especificação do navegador, mas pode não estar no tipo do expo-location
        options.timeout = 15000; // 15 segundos
      }

      const location = await Location.getCurrentPositionAsync(options);

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      const errorContext = {
        platform: Platform.OS,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      };
      loggingService.error('Erro ao obter localização atual', error instanceof Error ? error : new Error(String(error)), errorContext);
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
      if (!Location || !Location.reverseGeocodeAsync) {
        loggingService.error('expo-location não disponível', undefined, { coordinates });
        return null;
      }
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
      loggingService.error(
        'Erro ao obter endereço das coordenadas',
        error instanceof Error ? error : undefined,
        { coordinates }
      );
      return null;
    }
  }

  /**
   * Obtém coordenadas geográficas a partir de um endereço
   * @param address Endereço completo
   * @returns Coordenadas geográficas ou null em caso de erro
   */
  public async getCoordinatesFromAddress(address: string): Promise<GeoCoordinates | null> {
    try {
      // Tentar via Google Maps API primeiro para maior precisão
      if (GOOGLE_MAPS_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          return { latitude: lat, longitude: lng };
        }
      }

      // Fallback para Expo Location se o Google falhar ou não tiver chave
      if (Location && Location.geocodeAsync) {
        const results = await Location.geocodeAsync(address);
        if (results && results.length > 0) {
          return {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          };
        }
      }

      return null;
    } catch (error) {
      loggingService.error(
        'Erro ao obter coordenadas do endereço',
        error instanceof Error ? error : undefined,
        { address }
      );
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
      loggingService.error(
        'Erro ao salvar localização do usuário',
        error instanceof Error ? error : undefined,
        { userId, location }
      );
    }
  }

  /**
   * Calcula a distância entre dois pontos utilizando a API do Google Maps (distância de estrada)
   * Se a API falhar ou não houver chave, usa a fórmula de Haversine como fallback.
   * @param origin Coordenadas de origem
   * @param destination Coordenadas de destino
   * @returns Distância em quilômetros
   */
  public async getRoadDistance(origin: GeoCoordinates, destination: GeoCoordinates): Promise<number> {
    try {
      if (GOOGLE_MAPS_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
          const distanceInMeters = data.rows[0].elements[0].distance.value;
          return Number((distanceInMeters / 1000).toFixed(1));
        }
      }
    } catch (error) {
      loggingService.warn('Erro ao obter distância via Google Maps, usando Haversine', { error });
    }

    return this.calculateDistance(origin, destination);
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
      querySnapshot.docs.forEach(docSnap => {
        const storeData = docSnap.data() as Omit<Store, 'id'>;

        // Calcular distância
        const distance = this.calculateDistance(location, storeData.coordinates);

        // Verificar se está dentro do raio especificado
        if (distance <= radiusInKm) {
          // Calcular tempo estimado de entrega
          const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(distance);

          // Adicionar à lista de lojas
          stores.push({
            id: docSnap.id,
            ...storeData,
            distance,
            estimatedDeliveryTime,
          });
        }
      });

      // Ordenar por distância (do mais próximo ao mais distante)
      return stores.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      loggingService.error(
        'Erro ao buscar lojas próximas',
        error instanceof Error ? error : undefined,
        { location, radiusInKm }
      );
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
      loggingService.error(
        'Erro ao buscar lojas com produto disponível',
        error instanceof Error ? error : undefined,
        { location, productId, radiusInKm }
      );
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
      loggingService.error(
        'Erro ao verificar disponibilidade do produto',
        error instanceof Error ? error : undefined,
        { storeId, productId }
      );
      return false;
    }
  }
}
