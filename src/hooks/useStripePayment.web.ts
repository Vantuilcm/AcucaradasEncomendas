import { useState } from 'react';
import { Alert } from 'react-native';
import { StripeService } from '../services/StripeService';

interface UseStripePaymentProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useStripePayment = ({ onSuccess, onError }: UseStripePaymentProps = {}) => {
  const [loading, setLoading] = useState(false);
  const stripeService = StripeService.getInstance();

  const processPayment = async (
    orderId: string,
    amount: number,
    customerId: string,
    paymentMethodId: string
  ) => {
    Alert.alert(
      'Indisponível na Web',
      'Pagamentos por cartão com Stripe não estão disponíveis no preview web. Utilize um dispositivo físico ou execute um build nativo.'
    );
    onError?.(new Error('Stripe React Native não suportado na web'));
  };

  const addPaymentMethod = async (
    customerId: string,
    cardDetails: {
      number: string;
      expiryDate: string;
      cvc: string;
      holderName: string;
      type: string;
      brand: string;
      isDefault: boolean;
    }
  ) => {
    Alert.alert(
      'Indisponível na Web',
      'Adicionar cartão via Stripe não está disponível no preview web. Utilize um dispositivo físico ou execute um build nativo.'
    );
    onError?.(new Error('Stripe React Native não suportado na web'));
    throw new Error('Stripe React Native não suportado na web');
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      await stripeService.removePaymentMethod(paymentMethodId);
    } catch (error) {
      onError?.(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    processPayment,
    addPaymentMethod,
    removePaymentMethod,
    loading,
  };
};

export default useStripePayment;
