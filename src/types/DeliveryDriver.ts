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
  totalWithdrawn?: number;
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
  badges?: DriverBadge[];
  stripeAccountId?: string;
}

export interface DeliveryDriverUpdate {
  name?: string;
  phone?: string;
  email?: string;
  stripeAccountId?: string;
  totalWithdrawn?: number;
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

export interface DriverEarning {
  id: string;
  driverId: string;
  orderId: string;
  amount: number;
  type: 'delivery_fee' | 'tip' | 'bonus' | 'adjustment';
  status: 'pending' | 'available' | 'paid';
  createdAt: string;
  paidAt?: string;
  description?: string;
}

export interface DriverFinanceSummary {
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  nextPaymentDate?: string;
  recentEarnings: DriverEarning[];
}

export interface DriverLocationLog {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface DriverDailyRoute {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  points: DriverLocationLog[];
  totalDistanceKm: number;
  startTime: string;
  endTime?: string;
}

export interface DriverBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'performance' | 'reliability' | 'seniority' | 'special';
  unlockedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}
