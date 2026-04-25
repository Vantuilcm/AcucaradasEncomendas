import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';

export type { RootStackParamList, MainTabParamList, DriverTabParamList } from '../navigation/AppNavigator';

export type MainTabNavigationProp<Screen extends keyof MainTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, Screen>,
  StackNavigationProp<RootStackParamList>
>;

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
