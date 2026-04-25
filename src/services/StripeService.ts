import { STRIPE_PUBLISHABLE_KEY, STRIPE_CONFIG } from '../config/stripe';
import { loggingService } from './LoggingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { api } from './api';

export class StripeService {
  private static instance: StripeService;
  private stripe: any;
  private publishableKey: string;

  private constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
    this.stripe = null; // Será inicializado no método initialize
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
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
      if (!this.publishableKey) {
        throw new Error('Chave do Stripe não configurada');
      }

      this.stripe = stripeInstance;
      loggingService.info('Stripe inicializado com sucesso');
      return !!this.stripe;
    } catch (error) {
      loggingService.error(
        'Erro ao inicializar o Stripe',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Cria um cliente no Stripe
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async createCustomer(email: string, name: string): Promise<string> {
    try {
      const response = await api.post('/stripe/customers', { email, name });
      const data = response.data;

      loggingService.info('Cliente criado com sucesso no Stripe', {
        customerId: data.customerId,
      });

      return data.customerId;
    } catch (error) {
      loggingService.error(
        'Erro ao criar cliente no Stripe',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  public async createPaymentMethod(card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    holderName?: string;
    email?: string;
  }): Promise<string> {
    try {
      const response = await api.post('/stripe/payment-methods/create', {
        card: {
          number: card.number,
          expMonth: card.expMonth,
          expYear: card.expYear,
          cvc: card.cvc,
        },
        billingDetails: {
          name: card.holderName,
          email: card.email,
        },
      });
      return response.data.paymentMethodId;
    } catch (error) {
      loggingService.error(
        'Erro ao criar método de pagamento',
        error instanceof Error ? error : undefined
      );
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
      await api.post('/stripe/payment-methods', {
        customerId,
        paymentMethodId,
        isDefault: cardDetails.isDefault,
      });

      loggingService.info('Método de pagamento adicionado com sucesso', {
        customerId,
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar método de pagamento',
        error instanceof Error ? error : undefined,
        { customerId, paymentMethodId }
      );
      throw error;
    }
  }

  /**
   * Cria uma intenção de pagamento
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async createPaymentIntent(
    orderId: string,
    amount: number,
    customerId?: string
  ): Promise<{ id: string; clientSecret: string }> {
    try {
      const response = await api.post('/stripe/create-payment-intent', {
        amount,
        currency: STRIPE_CONFIG.currency.toLowerCase(),
        metadata: { orderId },
        customerId,
        orderId, // Adicionado para transfer_group no backend
      });
      const data = response.data;

      loggingService.info('Intenção de pagamento criada com sucesso', {
        paymentIntentId: data.id,
        orderId,
      });

      return {
        id: data.id,
        clientSecret: data.clientSecret,
      };
    } catch (error) {
      loggingService.error(
        'Erro ao criar intenção de pagamento',
        error instanceof Error ? error : undefined,
        { orderId, amount }
      );
      throw error;
    }
  }

  /**
   * Processa um pagamento com cartão
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async processCardPayment(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    try {
      const response = await api.post('/stripe/confirm-payment', {
        paymentIntentId,
        paymentMethodId,
      });
      const data = response.data;

      loggingService.info('Pagamento processado com sucesso', {
        paymentIntentId,
        paymentMethodId,
        status: data.status,
      });

      return data;
    } catch (error) {
      loggingService.error(
        'Erro ao processar pagamento',
        error instanceof Error ? error : undefined,
        { paymentIntentId, paymentMethodId }
      );
      throw error;
    }
  }

  /**
   * Remove um método de pagamento
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await api.delete(`/stripe/payment-methods/${paymentMethodId}`);

      loggingService.info('Método de pagamento removido com sucesso', {
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao remover método de pagamento',
        error instanceof Error ? error : undefined,
        { paymentMethodId }
      );
      throw error;
    }
  }

  /**
   * Lista os métodos de pagamento de um cliente
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async listPaymentMethods(customerId: string): Promise<any[]> {
    try {
      const response = await api.get('/stripe/payment-methods', {
        params: { customerId },
      });
      const data = response.data;

      loggingService.info('Métodos de pagamento listados com sucesso', {
        customerId,
      });

      return data.paymentMethods || data;
    } catch (error) {
      loggingService.error(
        'Erro ao listar métodos de pagamento',
        error instanceof Error ? error : undefined,
        { customerId }
      );
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
      const paymentIntent = await this.createPaymentIntent(orderId, amount);
      const producerDoc = await getDoc(doc(db, 'producers', producerId));
      const deliveryPersonDoc = await getDoc(doc(db, 'delivery_drivers', deliveryPersonId));

      if (!producerDoc.exists() || !deliveryPersonDoc.exists()) {
        throw new Error('Produtor ou entregador não encontrado');
      }

      const producerData = producerDoc.data() as any;
      const deliveryPersonData = deliveryPersonDoc.data() as any;

      const producerStripeAccountId = producerData.stripeAccountId;
      const deliveryPersonStripeAccountId = deliveryPersonData.stripeAccountId;

      if (!producerStripeAccountId || !deliveryPersonStripeAccountId) {
        throw new Error('Conta Stripe do produtor ou entregador não configurada');
      }

      const transferResponse = await api.post('/stripe/split-payment', {
        orderId,
        amount,
        deliveryFee,
        producerStripeAccountId,
        deliveryPersonStripeAccountId,
      });
      const transferData = transferResponse.data;

      loggingService.info('Pagamento com divisão processado com sucesso', {
        orderId,
        paymentIntentId: paymentIntent.id,
        producerTransferId: transferData.producerTransferId,
        deliveryPersonTransferId: transferData.deliveryPersonTransferId,
      });

      return {
        paymentIntentId: paymentIntent.id,
        appTransferId: transferData.appTransferId || '',
        producerTransferId: transferData.producerTransferId,
        deliveryPersonTransferId: transferData.deliveryPersonTransferId,
      };
    } catch (error) {
      loggingService.error(
        'Erro ao processar pagamento com divisão',
        error instanceof Error ? error : undefined,
        { orderId, amount, deliveryFee, producerId, deliveryPersonId }
      );
      throw error;
    }
  }
}
