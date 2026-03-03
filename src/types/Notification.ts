export type NotificationType =
  | 'new_order'
  | 'order_status_update'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'promotion'
  | 'system_update';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    orderId?: string;
    amount?: number;
    promotionId?: string;
    [key: string]: string | number | boolean | null;
  };
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key in NotificationType]: number;
  };
}
