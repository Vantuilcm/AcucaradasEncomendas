import {
  DELIVERY_PRICE_PER_KM,
  BASE_DELIVERY_FEE,
  MAX_DELIVERY_DISTANCE,
} from '../constants/delivery';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PricingResult {
  distanceKm: number;
  deliveryFee: number;
  withinRange: boolean;
  error?: boolean;
}

export class DeliveryPricingService {
  /**
   * Calcula a distância entre duas coordenadas usando a Fórmula de Haversine
   */
  private static calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const toRadian = (angle: number) => (Math.PI / 180) * angle;
    const distance = (a: number, b: number) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(coord2.latitude, coord1.latitude);
    const dLon = distance(coord2.longitude, coord1.longitude);

    const lat1 = toRadian(coord1.latitude);
    const lat2 = toRadian(coord2.latitude);

    const a =
      Math.pow(Math.sin(dLat / 2), 2) +
      Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    
    const c = 2 * Math.asin(Math.sqrt(a));
    const finalDistance = RADIUS_OF_EARTH_IN_KM * c;

    return finalDistance;
  }

  /**
   * Mock temporário de conversão de CEP para coordenadas
   * Em produção, isso seria substituído por uma API leve de Geocoding.
   */
  private static async getCoordinatesFromZipCode(_zipCode: string): Promise<Coordinates | null> {
    // TODO: Integrar com API real de Geocoding.
    // Retornando null intencionalmente para forçar o fallback seguro 
    // enquanto não temos API de Geocoding configurada,
    // garantindo que o app não quebre e aplique a taxa base.
    return null;
  }

  /**
   * Calcula a taxa de entrega completa com base nas coordenadas de origem e destino
   */
  public static calculatePricingByCoordinates(origin: Coordinates, destination: Coordinates): PricingResult {
    try {
      if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
        throw new Error('Coordenadas inválidas');
      }

      const distanceKm = this.calculateHaversineDistance(origin, destination);
      
      if (isNaN(distanceKm)) {
        throw new Error('Falha matemática no cálculo de distância');
      }

      const withinRange = distanceKm <= MAX_DELIVERY_DISTANCE;
      const fee = BASE_DELIVERY_FEE + (distanceKm * DELIVERY_PRICE_PER_KM);

      return {
        distanceKm: Number(distanceKm.toFixed(2)),
        deliveryFee: Number(fee.toFixed(2)),
        withinRange,
      };

    } catch (error) {
      console.warn('[DeliveryPricingService] Fallback de segurança acionado:', error);
      return {
        distanceKm: 0,
        deliveryFee: BASE_DELIVERY_FEE,
        withinRange: false,
        error: true
      };
    }
  }

  /**
   * Calcula a taxa de entrega com base nos CEPs (usa Fallback temporário)
   */
  public static async calculatePricingByZipCode(originZip: string, destinationZip: string): Promise<PricingResult> {
    try {
      const originCoords = await this.getCoordinatesFromZipCode(originZip);
      const destCoords = await this.getCoordinatesFromZipCode(destinationZip);

      if (!originCoords || !destCoords) {
        // Fallback: se não conseguir coordenadas, cobra a taxa base e libera a entrega 
        // (comportamento provisório para não travar o fluxo atual de quem não tem lat/lng)
        return {
          distanceKm: 0,
          deliveryFee: BASE_DELIVERY_FEE,
          withinRange: true, // Libera para não travar o checkout legado
        };
      }

      return this.calculatePricingByCoordinates(originCoords, destCoords);
    } catch (error) {
      return {
        distanceKm: 0,
        deliveryFee: BASE_DELIVERY_FEE,
        withinRange: true, // Libera para não travar
        error: true
      };
    }
  }
}