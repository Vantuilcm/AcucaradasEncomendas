export interface PrivacySettings {
  id: string;
  userId: string;
  showProfile: boolean;
  showOrders: boolean;
  showReviews: boolean;
  showAddresses: boolean;
  showPaymentMethods: boolean;
  allowNotifications: boolean;
  allowLocation: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacySettingsUpdate {
  showProfile?: boolean;
  showOrders?: boolean;
  showReviews?: boolean;
  showAddresses?: boolean;
  showPaymentMethods?: boolean;
  allowNotifications?: boolean;
  allowLocation?: boolean;
  allowAnalytics?: boolean;
  allowMarketing?: boolean;
}
