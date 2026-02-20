import { STRIPE_PUBLISHABLE_KEY, STRIPE_CONFIG } from '../config/stripe';
import { Alert } from 'react-native';
import { loggingService } from './LoggingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculatePaymentSplit } from '../utils/paymentCalculations';
import Constants from 'expo-constants';

export class StripeService {
  private static instance: StripeService;
  private stripe: any;
  private publishableKey: string;
  private apiBase: string;

  private constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;

    const defaultApiBase =
      process.env.EXPO_PUBLIC_API_URL ||
      Constants.expoConfig?.extra?.apiUrl ||
      'https://us-central1-acucaradas-encomendas.cloudfunctions.net/api';

    this.apiBase = defaultApiBase.replace(/\/+$/, '');

    if (!__DEV__ && this.apiBase.startsWith('http://')) {
      this.apiBase = this.apiBase.replace(/^http:\/\//, 'https://');
    }

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
  public getApiBase(): string { return this.apiBase; }

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
      const response = await fetch(`${this.apiBase}/api/stripe/customers`, {
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
      const response = await fetch(`${this.apiBase}/api/stripe/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
          cardDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao adicionar método de pagamento');
      }

      loggingService.info('Método de pagamento adicionado com sucesso', {
        customerId,
        paymentMethodId,
      });
    } catch (error) {
      loggingService.error('Erro ao adicionar método de pagamento', { error });
      throw error;
    }
  }

  /**
   * Obtém link de onboarding para uma conta Stripe Connect
   */
  public async getOnboardingLink(userId: string, email: string, userType: 'producer' | 'driver' | 'customer'): Promise<string> {
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/onboarding-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          email,
          userType,
          refresh_url: 'acucaradas-encomendas://stripe-onboarding-refresh',
          return_url: 'acucaradas-encomendas://stripe-onboarding-return'
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        return data.url;
      } else {
        throw new Error(data.error || 'Erro ao gerar link de onboarding');
      }
    } catch (error) {
      loggingService.error('Erro ao obter link de onboarding do Stripe', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Verifica o status de uma conta Stripe Connect
   */
  public async getAccountStatus(stripeAccountId: string): Promise<'not_started' | 'pending' | 'active'> {
    if (!stripeAccountId) return 'not_started';
    
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/account-status/${stripeAccountId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.status; // 'pending' | 'active'
      }

      return 'pending';
    } catch (error) {
      loggingService.error('Erro ao verificar status da conta Stripe', error instanceof Error ? error : undefined);
      return 'pending';
    }
  }

  public async requestPayout(userId: string, stripeAccountId: string, amount: number, userType: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          stripeAccountId,
          amount: Math.round(amount * 100),
          currency: 'brl',
          userType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar saque no Stripe');
      }

      return data;
    } catch (error) {
      loggingService.error('Erro ao processar saque via Stripe', error instanceof Error ? error : undefined);
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
    metadata: Record<string, any> = {}
  ): Promise<{ id: string; clientSecret: string }> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch(`${this.apiBase}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: STRIPE_CONFIG.currency.toLowerCase(),
          metadata: { ...metadata, orderId },
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
   * Busca uma intenção de pagamento pelo ID
   * Nota: Esta operação deve ser realizada através do backend
   */
  public async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/payment-intent/${paymentIntentId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar PaymentIntent');
      }

      return data;
    } catch (error) {
      loggingService.error('Erro ao buscar PaymentIntent', { paymentIntentId, error });
      throw error;
    }
  }

  /**
   * Processa o pagamento de uma intenção já criada com um cartão
   */
  public async processCardPayment(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    try {
      // Usar API do backend em vez de chamar o Stripe diretamente
      const response = await fetch(
        `${this.apiBase}/api/stripe/confirm-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentIntentId, paymentMethodId }),
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
        `${this.apiBase}/api/stripe/payment-methods/${paymentMethodId}`,
        {
          method: 'DELETE',
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
        `${this.apiBase}/api/stripe/payment-methods?customerId=${customerId}`,
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

      return data;
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
   * @param subtotal Subtotal dos produtos
   * @param deliveryFee Taxa de entrega
   * @param paymentMethod Método de pagamento ('credit_card' ou 'pix')
   * @param producerId ID do produtor
   * @param deliveryPersonId ID do entregador (opcional)
   * @returns Objeto com os IDs das transferências criadas
   */
  public async processPaymentWithSplit(
    orderId: string,
    subtotal: number,
    deliveryFee: number,
    paymentMethod: 'credit_card' | 'pix',
    producerId: string,
    deliveryPersonId?: string
  ): Promise<{
    paymentIntentId: string;
    appTransferId: string;
    producerTransferId: string;
    deliveryPersonTransferId: string;
    appFee: number;
    producerAmount: number;
  }> {
    try {
      // 1. Calcular o split usando o utilitário centralizado
      const split = calculatePaymentSplit(subtotal, deliveryFee, paymentMethod);

      // 2. Criar a intenção de pagamento para o valor total com metadados de split
      const paymentIntent = await this.createPaymentIntent(orderId, split.total, {
        productAmount: split.subtotal,
        deliveryFee: split.deliveryFee,
        platformMaintenanceFee: split.platformMaintenanceFee,
        appFee: split.appFee,
        producerAmount: split.producerAmount,
        totalAmount: split.total,
        producerId: producerId,
        deliveryPersonId: deliveryPersonId || ''
      });

      // 3. Buscar a conta Stripe do produtor
      const producerDoc = await getDoc(doc(db, 'producers', producerId));
      if (!producerDoc.exists()) {
        throw new Error('Produtor não encontrado');
      }

      const producerData = producerDoc.data() as any;
      const producerStripeAccountId = producerData.stripeAccountId;

      if (!producerStripeAccountId) {
        throw new Error('Conta Stripe do produtor não configurada');
      }

      // 4. Criar transferência para o produtor
      const producerTransferResponse = await fetch(`${this.apiBase}/api/stripe/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: split.producerAmount, 
          currency: STRIPE_CONFIG.currency.toLowerCase(), 
          destination: producerStripeAccountId, 
          transferGroup: orderId 
        }),
      });

      const producerTransferData = await producerTransferResponse.json();

      if (!producerTransferResponse.ok) {
        throw new Error(
          producerTransferData.error?.message || 'Erro ao transferir para o produtor'
        );
      }

      // 5. Transferência para o entregador (100% da taxa de entrega) - Opcional no checkout
      let deliveryPersonTransferId = '';
      if (deliveryPersonId) {
        const deliveryPersonDoc = await getDoc(doc(db, 'delivery_persons', deliveryPersonId));
        if (deliveryPersonDoc.exists()) {
          const deliveryPersonData = deliveryPersonDoc.data() as any;
          const deliveryPersonStripeAccountId = deliveryPersonData.stripeAccountId;

          if (deliveryPersonStripeAccountId) {
            const deliveryTransferResponse = await fetch(`${this.apiBase}/api/stripe/transfers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                amount: deliveryFee, 
                currency: STRIPE_CONFIG.currency.toLowerCase(), 
                destination: deliveryPersonStripeAccountId, 
                transferGroup: orderId 
              }),
            });

            const deliveryTransferData = await deliveryTransferResponse.json();

            if (deliveryTransferResponse.ok) {
              deliveryPersonTransferId = deliveryTransferData.id;
            } else {
              loggingService.warn('Erro ao transferir para o entregador, será necessário processar manualmente', {
                orderId,
                error: deliveryTransferData.error?.message
              });
            }
          }
        }
      }

      loggingService.info('Pagamento com divisão processado com sucesso', {
        orderId,
        paymentIntentId: paymentIntent.id,
        producerTransferId: producerTransferData.id,
        deliveryPersonTransferId,
        appFee: split.appFee,
        producerAmount: split.producerAmount,
        deliveryFee,
      });

      return {
        paymentIntentId: paymentIntent.id,
        appTransferId: '', // O app retém sua parte diretamente
        producerTransferId: producerTransferData.id,
        deliveryPersonTransferId,
        appFee: split.appFee,
        producerAmount: split.producerAmount,
      };
    } catch (error) {
      loggingService.error('Erro ao processar pagamento com divisão', {
        orderId,
        subtotal,
        deliveryFee,
        producerId,
        deliveryPersonId,
        error,
      });
      throw error;
    }
  }

  public async createPaymentMethodFromCard(card: { number: string; expMonth: number; expYear: number; cvc: string }): Promise<string> {
    const response = await fetch(`${this.apiBase}/api/stripe/payment-methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'card', card }),
    });
    const data = await response.json();
    if (!response.ok) { throw new Error(data.error || 'Erro ao criar método de pagamento'); }
    return data.id;
  }

  /**
   * Cria um pagamento PIX
   * @param amount Valor total em reais (não centavos, o controller converte)
   * @param metadata Metadados opcionais (orderId, etc)
   * @returns QR Code e data de expiração
   */
  public async createPixPayment(
    amount: number, 
    metadata: Record<string, any> = {}
  ): Promise<{ qrCode: string; expiresAt: number; paymentIntentId: string }> {
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/create-pix-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, metadata }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento PIX');
      }

      return {
        qrCode: data.qrCode,
        expiresAt: data.expiresAt,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (error) {
      loggingService.error('Erro ao criar pagamento PIX no Stripe', { amount, error });
      throw error;
    }
  }

  /**
   * Verifica o status de um pagamento (PIX ou Cartão)
   * @param paymentId ID da intenção de pagamento
   * @returns Status do pagamento
   */
  public async checkPaymentStatus(paymentId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiBase}/api/stripe/check-payment-status/${paymentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar status do pagamento');
      }

      return data.status;
    } catch (error) {
      loggingService.error('Erro ao verificar status do pagamento no Stripe', { paymentId, error });
      throw error;
    }
  }
}
export default StripeService;
