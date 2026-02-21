import { STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_CONFIG } from '../config/stripe';
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { loggingService } from './LoggingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class StripeService {
  private static instance: StripeService;
  private stripe: any;
  private publishableKey: string;
  private secretKey: string;

  private constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
    this.secretKey = ''; // A chave secreta não deve ser usada no frontend
    this.stripe = null; // Será inicializado no método initialize
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Retorna a chave secreta do Stripe
   * Usado para integração com outros serviços
   */
  public getSecretKey(): string {
    return this.secretKey;
  }

  /**
   * Inicializa o Stripe com as configurações necessárias
   * @param stripeInstance Instância do Stripe obtida do hook useStripe
   */
  public initialize(stripeInstance: any) {
    try {
      if (!stripeInstance) {
        throw new Error('Instância do Stripe não fornecida');
      }

      this.stripe = stripeInstance;
      loggingService.info('Stripe inicializado com sucesso');
      return true;
    } catch (error) {
      loggingService.error('Erro ao inicializar o Stripe', { error });
      throw error;
    }
  }

  /**
   * Cria um cliente no Stripe
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async createCustomer(email: string, name: string): Promise<string> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch('http://localhost:3000/api/stripe/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao criar cliente');
      }

      loggingService.info('Cliente criado com sucesso no Stripe', {
        customerId: data.customerId,
      });

      return data.customerId;
    } catch (error) {
      loggingService.error('Erro ao criar cliente no Stripe', { error });
      throw error;
    }
  }

  /**
   * Adiciona um método de pagamento ao cliente
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    cardDetails: {
      number: string;
      expiryDate: string;
      cvc: string;
      holderName: string;
      type: string;
      brand: string;
      isDefault: boolean;
    }
  ): Promise<void> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch('http://localhost:3000/api/stripe/payment-methods/attach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
          isDefault: cardDetails.isDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao adicionar método de pagamento');
      }

      loggingService.info('Método de pagamento adicionado com sucesso', {
        customerId,
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error('Erro ao adicionar método de pagamento', {
        customerId,
        paymentMethodId,
        error,
      });
      throw error;
    }
  }

  /**
   * Cria uma intenção de pagamento
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async createPaymentIntent(
    orderId: string,
    amount: number
  ): Promise<{ id: string; clientSecret: string }> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch('http://localhost:3000/api/stripe/payment-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: STRIPE_CONFIG.currency.toLowerCase(),
          metadata: { orderId },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar intenção de pagamento');
      }

      loggingService.info('Intenção de pagamento criada com sucesso', {
        paymentIntentId: data.id,
        orderId,
      });

      return {
        id: data.id,
        clientSecret: data.clientSecret,
      };
    } catch (error) {
      loggingService.error('Erro ao criar intenção de pagamento', {
        orderId,
        amount,
        error,
      });
      throw error;
    }
  }

  /**
   * Processa um pagamento com cartão
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async processCardPayment(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch(
        `http://localhost:3000/api/stripe/payment-intents/${paymentIntentId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentMethodId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      loggingService.info('Pagamento processado com sucesso', {
        paymentIntentId,
        paymentMethodId,
        status: data.status,
      });

      return data;
    } catch (error) {
      loggingService.error('Erro ao processar pagamento', {
        paymentIntentId,
        paymentMethodId,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove um método de pagamento
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch(
        `http://localhost:3000/api/stripe/payment-methods/${paymentMethodId}/detach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao remover método de pagamento');
      }

      loggingService.info('Método de pagamento removido com sucesso', {
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error('Erro ao remover método de pagamento', {
        paymentMethodId,
        error,
      });
      throw error;
    }
  }

  /**
   * Lista os métodos de pagamento de um cliente
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async listPaymentMethods(customerId: string): Promise<any[]> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch(
        `http://localhost:3000/api/stripe/customers/${customerId}/payment-methods`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao listar métodos de pagamento');
      }

      loggingService.info('Métodos de pagamento listados com sucesso', {
        customerId,
      });

      return data.paymentMethods;
    } catch (error) {
      loggingService.error('Erro ao listar métodos de pagamento', {
        customerId,
        error,
      });
      throw error;
    }
  }

  /**
   * Processa um pagamento com divisão entre app, produtor e entregador
   * @param orderId ID do pedido
   * @param amount Valor total do pedido
   * @param deliveryFee Taxa de entrega
   * @param producerId ID do produtor
   * @param deliveryPersonId ID do entregador
   * @returns Objeto com os IDs das transferências criadas
   */
  public async processPaymentWithSplit(
    orderId: string,
    amount: number,
    deliveryFee: number,
    producerId: string,
    deliveryPersonId: string
  ): Promise<{
    paymentIntentId: string;
    appTransferId: string;
    producerTransferId: string;
    deliveryPersonTransferId: string;
  }> {
    try {
      // 1. Criar a intenção de pagamento para o valor total
      const paymentIntent = await this.createPaymentIntent(orderId, amount);

      // 2. Calcular os valores para cada parte
      const productAmount = amount - deliveryFee; // Valor dos produtos sem a taxa de entrega
      const appFee = Math.round(productAmount * 0.1); // 10% para o app
      const producerAmount = productAmount - appFee; // 90% para o produtor

      // 3. Buscar as contas Stripe dos destinatários
      const producerDoc = await getDoc(doc(db, 'producers', producerId));
      const deliveryPersonDoc = await getDoc(doc(db, 'delivery_persons', deliveryPersonId));

      if (!producerDoc.exists() || !deliveryPersonDoc.exists()) {
        throw new Error('Produtor ou entregador não encontrado');
      }

      const producerData = producerDoc.data();
      const deliveryPersonData = deliveryPersonDoc.data();

      const producerStripeAccountId = producerData.stripeAccountId;
      const deliveryPersonStripeAccountId = deliveryPersonData.stripeAccountId;

      if (!producerStripeAccountId || !deliveryPersonStripeAccountId) {
        throw new Error('Conta Stripe do produtor ou entregador não configurada');
      }

      // 4. Criar transferências para cada parte
      // Transferência para o produtor (90% do valor dos produtos)
      const producerTransferResponse = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `amount=${producerAmount}&currency=${STRIPE_CONFIG.currency.toLowerCase()}&destination=${producerStripeAccountId}&transfer_group=${orderId}`,
      });

      const producerTransferData = await producerTransferResponse.json();

      if (!producerTransferResponse.ok) {
        throw new Error(
          producerTransferData.error?.message || 'Erro ao transferir para o produtor'
        );
      }

      // Transferência para o entregador (100% da taxa de entrega)
      const deliveryTransferResponse = await fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `amount=${deliveryFee}&currency=${STRIPE_CONFIG.currency.toLowerCase()}&destination=${deliveryPersonStripeAccountId}&transfer_group=${orderId}`,
      });

      const deliveryTransferData = await deliveryTransferResponse.json();

      if (!deliveryTransferResponse.ok) {
        throw new Error(
          deliveryTransferData.error?.message || 'Erro ao transferir para o entregador'
        );
      }

      loggingService.info('Pagamento com divisão processado com sucesso', {
        orderId,
        paymentIntentId: paymentIntent.id,
        producerTransferId: producerTransferData.id,
        deliveryPersonTransferId: deliveryTransferData.id,
        appFee,
        producerAmount,
        deliveryFee,
      });

      return {
        paymentIntentId: paymentIntent.id,
        appTransferId: '', // O app retém sua parte diretamente
        producerTransferId: producerTransferData.id,
        deliveryPersonTransferId: deliveryTransferData.id,
      };
    } catch (error) {
      loggingService.error('Erro ao processar pagamento com divisão', {
        orderId,
        amount,
        deliveryFee,
        producerId,
        deliveryPersonId,
        error,
      });
      throw error;
    }
  }
}
