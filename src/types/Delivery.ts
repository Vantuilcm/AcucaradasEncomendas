/**
 * Tipos relacionados à entrega e gerenciamento de entregas
 */

export type DeliveryStatus =
  | 'pending' // Aguardando motorista aceitar
  | 'accepted' // Aceito pelo motorista
  | 'picking_up' // Em rota para retirada
  | 'in_transit' // Em trânsito para o cliente
  | 'delivered' // Entregue ao cliente
  | 'cancelled' // Cancelado
  | 'failed'; // Falha na entrega

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  lastUpdate: string; // ISO String
}

export interface DeliveryDetails {
  id: string;
  orderId: string;
  driverId?: string;
  userId: string;
  status: DeliveryStatus;
  pickupAddress: Address;
  deliveryAddress: Address;
  distanceInKm: number;
  deliveryFee: number;
  estimatedTime: number; // em minutos
  actualTime?: number; // em minutos
  currentLocation?: DeliveryLocation;
  notes?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  startedAt?: string; // ISO String
  deliveredAt?: string; // ISO String
}

export interface DeliveryFeeCalculation {
  distanceInKm: number;
  baseFee: number;
  distanceFee: number;
  totalFee: number;
}
