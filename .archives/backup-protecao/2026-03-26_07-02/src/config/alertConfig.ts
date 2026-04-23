export interface AlertConfig {
  enablePushNotifications: boolean;
  enableEmailAlerts: boolean;
  enableSmsAlerts: boolean;
  lowStockThreshold: number;
  orderDelayMinutes: number;
  paymentFailureThreshold: number;
}

export const getAlertConfig = (): AlertConfig => ({
  enablePushNotifications: true,
  enableEmailAlerts: true,
  enableSmsAlerts: false,
  lowStockThreshold: 5,
  orderDelayMinutes: 30,
  paymentFailureThreshold: 3,
});
