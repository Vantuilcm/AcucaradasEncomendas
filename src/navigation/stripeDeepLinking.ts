import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

/**
 * Deep link Stripe Connect onboarding → Conta Bancária (Recebimentos).
 * Landing: https://acucaradasencomendas.com.br/stripe-success → acucaradas://stripe/success
 */
export const stripeNavigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['acucaradas://'],
  config: {
    screens: {
      ContaBancaria: 'stripe/success',
    },
  },
};
