/**
 * Utilitários para cálculos geográficos e de rota
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine (em km)
 */
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
  const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * (Math.PI / 180)) * 
    Math.cos(point2.latitude * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
};

/**
 * Estima o tempo de entrega baseado na distância e velocidade média (em minutos)
 * @param distanceInKm Distância em quilômetros
 * @param averageSpeedKmH Velocidade média em km/h (padrão 30km/h para entregas urbanas)
 * @param prepTimeMinutes Tempo adicional de preparação/espera (padrão 5 min)
 */
export const estimateDeliveryTime = (
  distanceInKm: number, 
  averageSpeedKmH: number = 30, 
  prepTimeMinutes: number = 5
): number => {
  const travelTimeHours = distanceInKm / averageSpeedKmH;
  const travelTimeMinutes = travelTimeHours * 60;
  return Math.ceil(travelTimeMinutes + prepTimeMinutes);
};
