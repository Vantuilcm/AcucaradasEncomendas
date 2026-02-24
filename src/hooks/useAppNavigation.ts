import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useAppNavigation() {
  const navigation = useNavigation<NavigationProp>();
  return navigation;
}
