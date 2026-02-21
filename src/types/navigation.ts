export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ProductDetails: { productId: string };
  Checkout: undefined;
  DeliveryDriverRegistration: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
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
