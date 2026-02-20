import { GeoCoordinates } from './LocationService';
import { loggingService } from './LoggingService';
import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 'AIzaSyDtb3R9DyV50vpS_6SI_k-6sv0zh8DQuAc';

export interface RouteData {
  points: GeoCoordinates[];
  distance: number; // metros
  duration: number; // segundos
}

export class RouteService {
  /**
   * Obtém os dados de uma rota entre dois pontos usando a API do Google Directions
   * @param origin Coordenadas de origem
   * @param destination Coordenadas de destino
   * @returns Dados da rota ou null em caso de erro
   */
  public async getRouteData(origin: GeoCoordinates, destination: GeoCoordinates): Promise<RouteData | null> {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        loggingService.warn('Não foi possível obter rota do Google Maps', { status: data.status });
        return null;
      }
      
      const route = data.routes[0];
      const leg = route.legs[0];
      
      const points = this.decodePolyline(route.overview_polyline.points);
      
      return {
        points,
        distance: leg.distance.value,
        duration: leg.duration.value,
      };
    } catch (error) {
      loggingService.error('Erro ao buscar rota do Google Maps', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Obtém os pontos de uma rota entre dois pontos usando a API do Google Directions
   * @param origin Coordenadas de origem
   * @param destination Coordenadas de destino
   * @returns Lista de coordenadas que formam a rota ou null em caso de erro
   */
  public async getRoutePoints(origin: GeoCoordinates, destination: GeoCoordinates): Promise<GeoCoordinates[] | null> {
    const data = await this.getRouteData(origin, destination);
    return data ? data.points : null;
  }

  /**
   * Obtém dados de rota para múltiplos pares de origem e destino (batch)
   * Útil para otimização de múltiplos entregadores
   */
  public async getBatchRouteData(routes: { origin: GeoCoordinates; destination: GeoCoordinates }[]): Promise<(RouteData | null)[]> {
    const results: (RouteData | null)[] = [];
    
    // Processamento sequencial para evitar rate limiting agressivo, mas pode ser otimizado
    for (const route of routes) {
      const result = await this.getRouteData(route.origin, route.destination);
      results.push(result);
    }
    
    loggingService.info('Batch route data retrieved', {
      routeCount: routes.length,
      successfulCount: results.filter(r => r !== null).length
    });
    
    return results;
  }

  /**
   * Realiza um teste de estresse simulado no serviço de rotas
   * @param routeCount Número de rotas para simular
   * @param origin Origem base
   * @param destination Destino base
   */
  public async stressTestRouteService(routeCount: number, origin: GeoCoordinates, destination: GeoCoordinates): Promise<{
    averageLatency: number;
    successfulCount: number;
    failedCount: number;
    errorRates: { [status: string]: number };
  }> {
    const startTime = Date.now();
    const routes = Array.from({ length: routeCount }, () => ({ origin, destination }));
    
    loggingService.info('Starting RouteService stress test', { routeCount });
    
    const results = await this.getBatchRouteData(routes);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageLatency = totalTime / routeCount;
    const successfulCount = results.filter(r => r !== null).length;
    const failedCount = routeCount - successfulCount;
    
    const metrics = {
      averageLatency,
      successfulCount,
      failedCount,
      errorRates: {
        'success': successfulCount / routeCount,
        'failure': failedCount / routeCount
      }
    };
    
    loggingService.info('Route service stress test completed', metrics);
    
    return metrics;
  }

  /**
   * Decodifica uma string de polilinha do Google Maps para uma lista de coordenadas
   * Algoritmo padrão do Google Maps
   */
  private decodePolyline(encoded: string): GeoCoordinates[] {
    const points: GeoCoordinates[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }

    return points;
  }
}
