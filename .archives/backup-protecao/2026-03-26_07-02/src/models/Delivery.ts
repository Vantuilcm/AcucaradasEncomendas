export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface DeliveryDetails {
  id: string;
  orderId: string;
  driverId?: string;
  status: DeliveryStatus;
  pickupAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  fee: number;
  estimatedTime: number; // minutes
  distance: number; // km
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryData {
  orderId: string;
  pickupAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  fee: number;
  estimatedTime: number;
  distance: number;
}
