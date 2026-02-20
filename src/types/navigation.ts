import type { DeliverySchedule } from './Order';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth & Tabs
  Login: undefined;
  Register: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;

  // Core screens
  Home: undefined;
  Catalog: undefined;
  Cart: undefined;
  ProductDetails: { productId: string; storeId?: string; storeName?: string };
  Checkout: { scheduledDelivery?: DeliverySchedule } | undefined;
  ScheduleDelivery: undefined;
  AddressForm: { addressId?: string } | undefined;
  HelpCenter: undefined;
  HelpCategory: { categoryId: string };
  HelpArticle: { articleId: string };
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  PrivacySettings: undefined;
  StoreList: { productId?: string; title?: string } | undefined;
  StoreFront: { storeId: string; storeName?: string; storeLogoUrl?: string; storeBannerUrl?: string };
  Configuracoes: undefined;
  VoiceTest: undefined;

  // Orders
  Orders: undefined;
  OrderDetails: { orderId: string };
  OrderCompleted: { order: any } | undefined;
  Chat: { 
    orderId: string; 
    orderNumber?: string; 
    recipientId?: string; 
    recipientName?: string; 
  };

  // Other
  DeliveryDriverRegistration: undefined;
  ProducerRegistration: undefined;
  TwoFactorAuth: undefined;
  ForgotPassword: undefined;
  Address: undefined;
  PaymentMethods: undefined;
  EditProfile: undefined;
  AdminPanel: undefined;
  AdminDashboard: undefined;
  ShopSettings: undefined;
  ProductManagement: undefined;
  InventoryManagement: { openForecast?: boolean } | undefined;
  CustomerManagement: undefined;
  PromotionManagement: undefined;
  OrderManagement: undefined;
  ScheduledOrders: undefined;
  AdminRealTimeMonitoring: undefined;
  DeliveryDriverProfile: { driverId: string };
  CustomerFinanceDashboard: undefined;
  ProducerFinanceDashboard: undefined;
  DriverFinanceDashboard: undefined;
  AddEditProduct: { product?: any; isEditing?: boolean } | undefined;
  ProductTechnicalSheet: { product: import('./Product').Product } | undefined;
  NotificationSettings: undefined;
  NotificationSettingsV2: undefined;
  NotificationSettingsMigration: undefined;
  ReportsScreen: undefined;
  // Fallback to support additional routes not yet typed
  [key: string]: any;
};

export type MainTabParamList = {
  Home: undefined;
  Catalog?: undefined;
  Orders: undefined;
  Cart?: undefined;
  Profile: undefined;
};

export type Order = {
  id: string;
  date: string;
  status: 'Em andamento' | 'Entregue' | 'Cancelado';
  total: string;
  items: string[];
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
};
