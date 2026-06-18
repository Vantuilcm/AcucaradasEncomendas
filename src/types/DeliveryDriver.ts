export type DeliveryVehicleType =
  | 'walking'
  | 'bicycle'
  | 'electric_bicycle'
  | 'motorcycle'
  | 'car';

export interface DeliveryDriverDocuments {
  cnhImage?: string;
  vehicleDocument?: string;
  insurance?: string;
  faceImage?: string;
  cnhFront?: string;
  cnhBack?: string;
  vehicleFront?: string;
  vehicleBack?: string;
  insuranceFront?: string;
  insuranceBack?: string;
  [key: string]: string | undefined;
}

export interface DeliveryDriver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  cnh: string;
  vehicle: {
    type: DeliveryVehicleType;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
  };
  documents: DeliveryDriverDocuments;
  status: 'pending' | 'active' | 'inactive' | 'blocked';
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  availability: {
    isAvailable: boolean;
    workingHours: {
      start: string;
      end: string;
    };
    workingDays: (
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday'
    )[];
  };
  location?: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDriverUpdate {
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  cnh?: string;
  vehicle?: {
    type?: DeliveryVehicleType;
    brand?: string;
    model?: string;
    year?: number;
    plate?: string;
    color?: string;
  };
  documents?: DeliveryDriverDocuments;
  status?: 'pending' | 'active' | 'inactive' | 'blocked';
  rating?: number;
  totalDeliveries?: number;
  totalEarnings?: number;
  availability?: {
    isAvailable?: boolean;
    workingHours?: {
      start?: string;
      end?: string;
    };
    workingDays?: (
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday'
    )[];
  };
  location?: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
}

export interface DeliveryDriverStats {
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  completionRate: number;
  onTimeRate: number;
  monthlyEarnings: {
    [key: string]: number; // YYYY-MM: valor
  };
}
