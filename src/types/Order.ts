export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface DeliverySchedule {
  type: 'scheduled' | 'custom';
  date: string;
  timeSlot?: string; // Formato: "09:00 - 11:00"
  customTime?: string; // Formato: "14:30"
  deliveryMode?: 'delivery' | 'pickup';
  preparationTimeType: 'normal' | 'extended' | 'custom';
  preparationHours: number;
  specialInstructions?: string;
}

export interface PaymentDetails {
  productAmount: number;
  deliveryFee: number;
  appFee: number;
  producerAmount: number;
  platformMaintenanceFee?: number;
  totalAmount: number;
}

export interface OrderRating {
  rating: number;
  comment?: string;
  createdAt: string | Date;
}

export interface ProofOfDelivery {
  photoUrl?: string;
  pickupPhotoUrl?: string; // Foto tirada no momento da coleta
  signatureUrl?: string;
  recipientName?: string;
  recipientRelation?: string;
  completedAt: string | Date;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Order {
  id: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentDetails?: PaymentDetails;
  paymentMethod: {
    type: string;
    id: string;
  };
  deliveryAddress: {
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    reference?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryDriver?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
  };

  // Informações de agendamento
  scheduledDelivery?: DeliverySchedule;
  isScheduledOrder: boolean;

  createdAt: string | Date;
  updatedAt: string | Date;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  isArrivingNotified?: boolean; // Se o cliente já foi notificado da proximidade (geofencing)
  cancellationReason?: string;
  storeId?: string;
  storeName?: string;
  storeImage?: string;
  producerId?: string;
  deliveryPersonId?: string;
  paymentSplit?: PaymentSplit;
  deliveryCode?: string; // Código de segurança para entrega
  rating?: OrderRating;
  proofOfDelivery?: ProofOfDelivery;
  etaData?: any; // Dados detalhados do ETAService
}

export interface OrderFilters {
  status?: OrderStatus[];
  startDate?: string;
  endDate?: string;
  search?: string;
  isScheduled?: boolean; // Novo filtro para pedidos agendados
}

export interface CreateOrderInput {
  userId: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  status?: OrderStatus;
  paymentDetails?: PaymentDetails;
  paymentMethod?: {
    type: string;
    id: string;
  };
  deliveryAddress?: {
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    reference?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  scheduledDelivery?: DeliverySchedule;
  isScheduledOrder?: boolean;
  storeId?: string;
  storeName?: string;
  storeImage?: string;
  producerId?: string;
  deliveryPersonId?: string;
  paymentSplit?: PaymentSplit;
}

export interface OrderSummary {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivering: number;
  delivered: number;
  cancelled: number;
  scheduledOrders: number; // Contagem de pedidos agendados
}

export type PaymentSplitRecipient = 'store' | 'courier' | 'platform';

export interface PaymentSplitShare {
  recipient: PaymentSplitRecipient;
  percentage: number;
  amount: number;
  accountId?: string;
}

export interface PaymentSplit {
  total: number;
  currency: string;
  method: string;
  shares: PaymentSplitShare[];
}
