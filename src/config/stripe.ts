import Constants from 'expo-constants';
import { Platform } from 'react-native';
import LoggingService from '../services/LoggingService';

// Determinar ambiente (desenvolvimento ou produção)
const isDevelopment = __DEV__;
const ENV = isDevelopment ? 'development' : 'production';

// Usar variáveis de ambiente para as chaves do Stripe
// Prioriza EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY que é o padrão do Expo SDK 49+
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD ||
  process.env.STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_PUBLISHABLE_KEY_PROD ||
  '';

// A chave secreta deve ser usada apenas no backend, nunca exposta no cliente
export const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET_KEY_PROD ||
  process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY ||
  '';

// Configurações do Stripe
export const STRIPE_CONFIG = {
  merchantId: process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID || (ENV === 'production' ? 'merchant.com.acucaradas.encomendas' : 'merchant.com.acucaradas.encomendas'),
  merchantName: 'Açucaradas Encomendas',
  merchantCountryCode: 'BR',
  currency: 'BRL',
  enableGooglePay: Platform.OS === 'android',
  enableApplePay: Platform.OS === 'ios' && !!process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID,
  style: 'automatic',
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#FF69B4',
      colorBackground: '#FFFFFF',
      colorText: '#000000',
      colorDanger: '#FF0000',
      fontFamily: 'System',
      spacingUnit: '4px',
      borderRadius: '4px',
    },
  },
};

// Configurações adicionais para ambiente de produção
export const STRIPE_PRODUCTION_CONFIG = {
  // Configurações específicas para produção
  urlScheme: 'acucaradas-encomendas', // Para redirecionamento após pagamento
  returnURL: 'acucaradas-encomendas://stripe-redirect',
  // Configurações de segurança
  merchantIdentifier: process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID || '',
  allowsDelayedPaymentMethods: true,
  // Configurações de webhook (para backend)
  webhookEndpointSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

// Função para obter a configuração completa do Stripe
export const getStripeConfig = () => {
  return {
    ...STRIPE_CONFIG,
    ...(ENV === 'production' ? STRIPE_PRODUCTION_CONFIG : {}),
  };
};

// Função para inicializar o Stripe
export const initStripe = async () => {
  const logger = LoggingService.getInstance();
  try {
    // Aqui você pode adicionar lógica para inicializar o Stripe
    // Por exemplo, verificar se o dispositivo suporta pagamentos, etc.
    logger.info(`Stripe initialized in ${ENV} environment`);
    return true;
  } catch (error) {
    logger.error('Failed to initialize Stripe:', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};
