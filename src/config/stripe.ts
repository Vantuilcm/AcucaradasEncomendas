import { Platform } from 'react-native';
import { ENV as EnvGuardian } from './env';

// Determinar ambiente (desenvolvimento ou produção)
const isDevelopment = __DEV__;
const ENV_NAME = isDevelopment ? 'development' : 'production';

// Usar variáveis de ambiente do ENV Guardian (Apenas Publishable Key no App)
export const STRIPE_PUBLISHABLE_KEY = EnvGuardian.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// 🚨 AVISO: A STRIPE_SECRET_KEY NUNCA deve ser exposta no cliente.
// Se precisar usar no backend, ela deve ser carregada de forma segura lá.
export const STRIPE_SECRET_KEY = ''; 

// Configurações do Stripe
export const STRIPE_CONFIG = {
  merchantId: ENV_NAME === 'production' ? 'acucaradas_prod_merchant' : 'acucaradas_dev_merchant',
  merchantName: 'Açucaradas Encomendas',
  merchantCountryCode: 'BR',
  currency: 'BRL',
  enableGooglePay: Platform.OS === 'android',
  enableApplePay: Platform.OS === 'ios',
  style: 'automatic', // Adapta-se ao tema do dispositivo
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#FF4FD8',
      colorBackground: '#F9F7FF',
      colorText: '#1B1230',
      colorDanger: '#EF4444',
      fontFamily: 'System',
      spacingUnit: '4px',
      borderRadius: '4px',
    },
  },
};

// Configurações adicionais para ambiente de produção
export const STRIPE_PRODUCTION_CONFIG = {
  urlScheme: 'acucaradas-encomendas', // Para redirecionamento após pagamento
  returnURL: 'acucaradas-encomendas://stripe-redirect',
  webhookEndpointSecret: '', // Nunca no app
};
