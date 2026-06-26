export type OrderStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export type OrderPaymentMethodType = 'credit_card' | 'debit_card' | 'pix';

export type OrderPaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'expired';

export interface OrderItem {
  id: string;
  productId: string;
  producerId?: string; // ID do produtor/loja deste item
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
  preparationHours: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: {
    type: OrderPaymentMethodType | string;
    id: string;
  };
  paymentStatus?: OrderPaymentStatus;
  paymentIntentId?: string;
  paidAt?: string;
  pixExpiresAt?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
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

  createdAt: string;
  updatedAt: string;
  producerId: string; // ID da loja/produtor responsável pelo pedido
  deliveryFee: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  cancellationReason?: string;
  cityId?: string;
  region?: string;
}

export interface OrderFilters {
  status?: OrderStatus[];
  startDate?: string;
  endDate?: string;
  search?: string;
  isScheduled?: boolean; // Novo filtro para pedidos agendados
}

export interface OrderSummary {
  total: number;
  pending: number;
  pendingPayment?: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivering: number;
  delivered: number;
  cancelled: number;
  scheduledOrders: number; // Contagem de pedidos agendados
}
