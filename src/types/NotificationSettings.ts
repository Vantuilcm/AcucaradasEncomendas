export interface NotificationSettings {
  id: string;
  userId: string;
  enabled: boolean;
  types: {
    orderStatus: boolean;
    promotions: boolean;
    news: boolean;
    deliveryUpdates: boolean;
    paymentUpdates: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // formato HH:mm
    end: string; // formato HH:mm
  };
  createdAt: string;
  updatedAt: string;
}
