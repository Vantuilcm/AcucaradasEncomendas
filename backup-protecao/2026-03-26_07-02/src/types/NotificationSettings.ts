export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

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
  frequency: NotificationFrequency;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
}
