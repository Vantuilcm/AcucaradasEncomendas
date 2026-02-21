import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Determinar ambiente (desenvolvimento ou produção)
const isDevelopment = __DEV__;
const ENV = isDevelopment ? 'development' : 'production';

// Usar variáveis de ambiente para as chaves do Stripe
// Suporta tanto o formato EXPO_PUBLIC_* quanto o formato tradicional para compatibilidade
export const STRIPE_PUBLISHABLE_KEY =
  ENV === 'production'
    ? process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD ||
      process.env.STRIPE_PUBLISHABLE_KEY_PROD ||
      ''
    : process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';

// A chave secreta deve ser usada apenas no backend, nunca exposta no cliente
// Esta variável é incluída apenas para referência e deve ser usada apenas no servidor
export const STRIPE_SECRET_KEY =
  ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY_PROD || ''
    : process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';

// Configurações do Stripe
export const STRIPE_CONFIG = {
  merchantId: ENV === 'production' ? 'acucaradas_prod_merchant' : 'acucaradas_dev_merchant',
  merchantName: 'Açucaradas Encomendas',
  merchantCountryCode: 'BR',
  currency: 'BRL',
  enableGooglePay: Platform.OS === 'android',
  enableApplePay: Platform.OS === 'ios',
  style: 'automatic', // Adapta-se ao tema do dispositivo
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#FF69B4', // Cor rosa do tema
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
  merchantIdentifier: 'merchant.com.acucaradas.encomendas',
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
  try {
    // Aqui você pode adicionar lógica para inicializar o Stripe
    // Por exemplo, verificar se o dispositivo suporta pagamentos, etc.
    console.log(`Stripe initialized in ${ENV} environment`);
    return true;
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return false;
  }
};
