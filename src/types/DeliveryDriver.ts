export interface DeliveryDriver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  cnh: string;
  vehicle: {
    type: 'motorcycle' | 'car' | 'bicycle';
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
  };
  documents: {
    cnhImage: string;
    vehicleDocument: string;
    insurance: string;
  };
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
  name?: string;
  phone?: string;
  email?: string;
  vehicle?: {
    type?: 'motorcycle' | 'car' | 'bicycle';
    brand?: string;
    model?: string;
    year?: number;
    plate?: string;
    color?: string;
  };
  documents?: {
    cnhImage?: string;
    vehicleDocument?: string;
    insurance?: string;
  };
  status?: 'pending' | 'active' | 'inactive' | 'blocked';
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
