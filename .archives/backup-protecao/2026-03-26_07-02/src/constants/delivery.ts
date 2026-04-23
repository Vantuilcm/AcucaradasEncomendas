/**
 * Constantes relacionadas à entrega e cálculo de frete
 */

// Valor por quilômetro (em reais)
export const DELIVERY_PRICE_PER_KM = 1.5;

// Taxa base de entrega (em reais) - adicionada ao valor por km
export const BASE_DELIVERY_FEE = 5.0;

// Distância mínima cobrada (em km)
export const MIN_DELIVERY_DISTANCE = 1.0;

// Distância máxima para entrega (em km)
export const MAX_DELIVERY_DISTANCE = 25.0;

// Constantes para cálculo de tempo estimado
export const AVERAGE_SPEED_KM_PER_HOUR = 20;
export const PREPARATION_TIME_MINUTES = 15;

/**
 * Calcula o valor da taxa de entrega com base na distância
 * @param distanceInKm Distância em quilômetros
 * @returns Valor da taxa de entrega em reais
 */
export function calculateDeliveryFee(distanceInKm: number): number {
  // Garantir distância mínima
  const distance = Math.max(distanceInKm, MIN_DELIVERY_DISTANCE);

  // Calcular o valor baseado na distância
  const distanceFee = distance * DELIVERY_PRICE_PER_KM;

  // Adicionar taxa base e arredondar para duas casas decimais
  return Number((BASE_DELIVERY_FEE + distanceFee).toFixed(2));
}

/**
 * Calcula o tempo estimado de entrega
 * @param distanceInKm Distância em quilômetros
 * @returns Tempo estimado em minutos
 */
export function calculateEstimatedDeliveryTime(distanceInKm: number): number {
  // Tempo de deslocamento baseado na velocidade média
  const travelTimeMinutes = (distanceInKm / AVERAGE_SPEED_KM_PER_HOUR) * 60;

  // Adicionar tempo de preparação e arredondar para cima
  return Math.ceil(PREPARATION_TIME_MINUTES + travelTimeMinutes);
}
