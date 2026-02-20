import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { StripeService } from '../services/StripeService';
import { Alert } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface UseStripePaymentProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useStripePayment = ({ onSuccess, onError }: UseStripePaymentProps = {}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const stripeService = StripeService.getInstance();

  const processPayment = async (
    orderId: string,
    amount: number,
    customerId: string,
    paymentMethodId: string
  ) => {
    try {
      setLoading(true);

      // Criar intenção de pagamento
      const { id: paymentIntentId, clientSecret } = await stripeService.createPaymentIntent(
        orderId,
        amount
      );

      // Inicializar a sheet de pagamento
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Açucaradas Encomendas',
        style: 'alwaysDark',
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
      });

      if (initError) {
        throw initError;
      }

      // Apresentar a sheet de pagamento
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        throw paymentError;
      }

      // Processar o pagamento
      const success = await stripeService.processCardPayment(paymentIntentId, paymentMethodId);

      if (success) {
        loggingService.info('Pagamento processado com sucesso', {
          orderId,
          paymentIntentId,
        });
        onSuccess?.();
      } else {
        throw new Error('Falha ao processar pagamento');
      }
    } catch (error) {
      loggingService.error('Erro ao processar pagamento', {
        orderId,
        error,
      });
      Alert.alert('Erro', 'Não foi possível processar o pagamento.');
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
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
    try {
      setLoading(true);

      // Criar método de pagamento
      const { paymentMethod, error } = await initPaymentSheet({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: cardDetails.holderName,
          },
          card: {
            number: cardDetails.number.replace(/\s/g, ''),
            exp_month: parseInt(cardDetails.expiryDate.split('/')[0]),
            exp_year: parseInt('20' + cardDetails.expiryDate.split('/')[1]),
            cvc: cardDetails.cvc,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Adicionar método de pagamento ao cliente
      await stripeService.addPaymentMethod(customerId, paymentMethod.id, cardDetails);

      loggingService.info('Método de pagamento adicionado com sucesso', {
        customerId,
        paymentMethodId: paymentMethod.id,
      });

      return paymentMethod.id;
    } catch (error) {
      loggingService.error('Erro ao adicionar método de pagamento', {
        customerId,
        error,
      });
      Alert.alert('Erro', 'Não foi possível adicionar o método de pagamento.');
      onError?.(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      await stripeService.removePaymentMethod(paymentMethodId);
      loggingService.info('Método de pagamento removido com sucesso', {
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error('Erro ao remover método de pagamento', {
        paymentMethodId,
        error,
      });
      Alert.alert('Erro', 'Não foi possível remover o método de pagamento.');
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
