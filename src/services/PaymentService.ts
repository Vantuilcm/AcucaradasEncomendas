
import * as firestore from 'firebase/firestore';
import { db } from '@/config/firebase';

const {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} = firestore as any;
import { PaymentCard, PaymentTransaction, PaymentRefund, PaymentSummary, PaymentSettings, PixKey, PaymentStatus, PaymentMethod } from '@/types/Payment';
import { loggingService } from '@/services/LoggingService';
import { ValidationService } from '@/services/validationService';
import { StripeService } from '@/services/StripeService';
import { NotificationService } from '@/services/NotificationService';
import { OrderService } from '@/services/OrderService';
import { formatCurrency } from '@/utils/formatters';

// Interface para detalhes do cartão
interface CardDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  holderName: string;
}

interface PaymentData {
  userId: string;
  amount: number;
  paymentMethod: 'card' | 'pix';
  status: 'pending' | 'completed' | 'failed';
  paymentId: string;
}

export class PaymentService {
  private static instance: PaymentService;
  private readonly cardsCollection = 'payment_cards';
  private readonly transactionsCollection = 'payment_transactions';
  private readonly refundsCollection = 'payment_refunds';
  private readonly settingsCollection = 'payment_settings';
  private readonly pixKeysCollection = 'pix_keys';
  private pagamentos: Map<string, any>;

  private stripeService: StripeService;
  private notificationService: NotificationService;
  private orderService: OrderService;

  private constructor() {
    this.pagamentos = new Map();
    this.inicializarDadosTeste();
    this.stripeService = StripeService.getInstance();
    this.orderService = new OrderService();
    this.notificationService = (typeof (NotificationService as any).getInstance === 'function')
      ? (NotificationService as any).getInstance()
      : new (NotificationService as any)();
  }

  private inicializarDadosTeste() {
    // Pagamento existente
    this.pagamentos.set('pag_123', {
      id: 'pag_123',
      valor: 100,
      moeda: 'BRL',
      descricao: 'Teste',
      status: 'sucesso',
      data: new Date('2024-01-01'),
    });

    this.pagamentos.set('pag_cancelado', {
      id: 'pag_cancelado',
      valor: 100,
      moeda: 'BRL',
      descricao: 'Teste',
      status: 'cancelado',
      data: new Date('2024-01-01'),
    });

    this.pagamentos.set('pag_reembolsado', {
      id: 'pag_reembolsado',
      valor: 100,
      moeda: 'BRL',
      descricao: 'Teste',
      status: 'reembolsado',
      data: new Date('2024-01-01'),
    });
  }

  public static getInstance(): PaymentService {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      PaymentService.instance = new PaymentService();
      return PaymentService.instance;
    }

    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Processa um pagamento com cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©dito
   * @param orderId ID do pedido
   * @param cardDetails Detalhes do cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o
   * @returns true se o pagamento foi bem-sucedido, false caso contrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio
   */

  public async processCreditCardPayment(
    orderId: string,
    cardDetails: CardDetails
  ): Promise<boolean> {
    try {
      // Obter informaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes do pedido
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado', { orderId });
        return false;
      }

      const orderData = orderDoc.data() as any;
      const amount = orderData.totalAmount;
      const userId = orderData.userId;

      // Usar o StripeService para processar o pagamento

      // Criar ou obter cliente no Stripe
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        loggingService.error('UsuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado', { userId });
        return false;
      }

      const userData = userDoc.data() as any;
      let stripeCustomerId = userData.stripeCustomerId;

      // Se o usuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o tiver um ID de cliente no Stripe, criar um
      if (!stripeCustomerId) {
        const hasEmail = typeof userData.email === 'string' && userData.email.includes('@');
        const hasName = typeof userData.name === 'string' && userData.name.trim().length > 0;
        if (!hasEmail || !hasName) {
          loggingService.warn('Dados do usuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio incompletos para Stripe: usando valores padrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', { userId, hasEmail, hasName });
        }
        const userEmail = hasEmail ? userData.email : `no-email+${userId}@acucaradas.local`;
        const userName = hasName ? userData.name : 'Cliente';
        stripeCustomerId = await this.stripeService.createCustomer(userEmail, userName);
        await updateDoc(userRef, { stripeCustomerId: stripeCustomerId });
      }

      // JÃƒÂ¡ verificamos que o pedido existe acima, nÃƒÂ£o precisamos verificar novamente
      const customerId = userData.stripeCustomerId || stripeCustomerId;
      // Criar método de pagamento via backend
      const paymentMethodId = await this.stripeService.createPaymentMethodFromCard({
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
      });

      // Criar intenÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento
      const paymentIntent = await this.stripeService.createPaymentIntent(orderId, amount);

      // Confirmar pagamento
      const confirmedPayment = await this.stripeService.processCardPayment(
        paymentIntent.id,
        paymentMethodId
      );

      // Verificar status do pagamento
      if (confirmedPayment.status !== 'succeeded') {
        throw new Error(`Pagamento falhou com status: ${confirmedPayment.status}`);
      }

      // Atualizar status do pedido
      await updateDoc(orderRef, {
        status: 'confirmado',
        paymentStatus: 'completed',
        paymentMethod: 'credit_card',
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentMethodId: paymentMethodId,
        stripeReceiptUrl: confirmedPayment.charges?.data[0]?.receipt_url || '',
      });

      // Enviar notificaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de confirmaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento
      await this.notificationService.sendPaymentConfirmation(customerId, orderId);

      return true;
    } catch (error) {
      loggingService.error('Error processing credit card payment', { orderId, error });
      throw error;
    }
  }

  async getPaymentCards(userId: string): Promise<PaymentCard[]> {
    try {
      if (!userId) {
        return [];
      }
      const cardsRef = collection(db, this.cardsCollection);
      const q = query(cardsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const cards = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentCard[];

      return cards.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      loggingService.error('Erro ao buscar cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes de pagamento', {
        userId,
        error,
      });
      throw error;
    }
  }

  async addPaymentCard(card: Omit<PaymentCard, 'id' | 'createdAt'>): Promise<PaymentCard> {
    try {
      const cardsRef = collection(db, this.cardsCollection);
      const newCardRef = doc(cardsRef);
      await setDoc(newCardRef, {
        ...card,
        createdAt: new Date().toISOString(),
      });

      const newCard: PaymentCard = {
        id: newCardRef.id,
        ...card,
        createdAt: new Date().toISOString(),
      };

      // loggingService.info('Cartão de pagamento adicionado com sucesso', {
      //   cardId: newCardRef.id,
      // });
      return newCard;
    } catch (error) {
      loggingService.error('Erro ao adicionar cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento', { error });
      throw error;
    }
  }

  async removePaymentCard(cardId: string): Promise<void> {
    try {
      const cardRef = doc(db, this.cardsCollection, cardId);
      await deleteDoc(cardRef);

      // loggingService.info('Cartão de pagamento removido com sucesso', {
      //   cardId,
      // });
    } catch (error) {
      loggingService.error('Erro ao remover cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento', {
        cardId,
        error,
      });
      throw error;
    }
  }

  async setDefaultCard(userId: string, cardId: string): Promise<void> {
    try {
      const cardsRef = collection(db, this.cardsCollection);
      const q = query(cardsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          isDefault: doc.id === cardId,
        });
      });

      await batch.commit();

      loggingService.info('CartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o padrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o definido com sucesso', {
        userId,
        cardId,
      });
    } catch (error) {
      loggingService.error('Erro ao definir cartÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o padrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', {
        userId,
        cardId,
        error,
      });
      throw error;
    }
  }

  async createTransaction(
    transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentTransaction> {
    try {
      const transactionsRef = collection(db, this.transactionsCollection);
      const newTransactionRef = doc(transactionsRef);
      await setDoc(newTransactionRef, {
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newTransaction: PaymentTransaction = {
        id: newTransactionRef.id,
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // loggingService.info('Transação de pagamento criada com sucesso', {
      //   transactionId: newTransactionRef.id,
      // });
      return newTransaction;
    } catch (error) {
      loggingService.error('Erro ao criar transaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento', { error });
      throw error;
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const transactionRef = doc(db, this.transactionsCollection, transactionId);
      await updateDoc(transactionRef, {
        status,
        errorMessage,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Status da transaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o atualizado com sucesso', {
        transactionId,
        status,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar status da transaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', {
        transactionId,
        status,
        error,
      });
      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const transactionRef = doc(db, this.transactionsCollection, transactionId);
      const transactionDoc = await getDoc(transactionRef);

      if (!transactionDoc.exists()) {
        return null;
      }

      return {
        id: transactionDoc.id,
        ...transactionDoc.data(),
      } as PaymentTransaction;
    } catch (error) {
      loggingService.error('Erro ao buscar transaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', {
        transactionId,
        error,
      });
      throw error;
    }
  }

  async getUserTransactions(
    userId: string,
    options: {
      limit?: number;
      status?: PaymentStatus;
    } = {}
  ): Promise<PaymentTransaction[]> {
    try {
      const transactionsRef = collection(db, this.transactionsCollection);
      let q = query(transactionsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentTransaction[];
    } catch (error) {
      loggingService.error('Erro ao buscar transaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes do usuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio', {
        userId,
        options,
        error,
      });
      throw error;
    }
  }

  async createRefund(
    refund: Omit<PaymentRefund, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentRefund> {
    try {
      const refundsRef = collection(db, this.refundsCollection);
      const newRefundRef = doc(refundsRef);
      await setDoc(newRefundRef, {
        ...refund,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newRefund: PaymentRefund = {
        id: newRefundRef.id,
        ...refund,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Reembolso criado com sucesso', {
        refundId: newRefundRef.id,
      });
      return newRefund;
    } catch (error) {
      loggingService.error('Erro ao criar reembolso', { error });
      throw error;
    }
  }

  async updateRefundStatus(refundId: string, status: PaymentRefund['status']): Promise<void> {
    try {
      const refundRef = doc(db, this.refundsCollection, refundId);
      await updateDoc(refundRef, {
        status,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Status do reembolso atualizado com sucesso', {
        refundId,
        status,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar status do reembolso', {
        refundId,
        status,
        error,
      });
      throw error;
    }
  }

  async getPaymentSummary(userId: string): Promise<PaymentSummary> {
    try {
      const transactions = await this.getUserTransactions(userId);
      const summary: PaymentSummary = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        successfulTransactions: transactions.filter(t => t.status === 'approved').length,
        failedTransactions: transactions.filter(t => t.status === 'failed').length,
        refundedTransactions: transactions.filter(t => t.status === 'refunded').length,
        byMethod: {} as PaymentSummary['byMethod'],
        byStatus: {} as PaymentSummary['byStatus'],
      };

      // Inicializar contadores por mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©todo
      const paymentMethods: PaymentMethod[] = ['credit_card','debit_card','pix','cash'];
      for (const method of paymentMethods) {
        summary.byMethod[method] = {
          count: 0,
          total: 0,
        };
      }

      // Inicializar contadores por status
      const paymentStatuses: PaymentStatus[] = ['pending','processing','approved','failed','refunded','cancelled'];
      for (const status of paymentStatuses) {
        summary.byStatus[status] = 0;
      }

      // Calcular estatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­sticas
      transactions.forEach(transaction => {
        // Por mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©todo
        summary.byMethod[transaction.method].count++;
        summary.byMethod[transaction.method].total += transaction.amount;

        // Por status
        summary.byStatus[transaction.status]++;
      });

      return summary;
    } catch (error) {
      loggingService.error('Erro ao calcular resumo de pagamentos', {
        userId,
        error,
      });
      throw error;
    }
  }

  async getPaymentSettings(userId: string): Promise<PaymentSettings | null> {
    try {
      const settingsRef = doc(db, this.settingsCollection, userId);
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return null;
      }

      return {
        userId,
        ...settingsDoc.data(),
      } as PaymentSettings;
    } catch (error) {
      loggingService.error('Erro ao buscar configuraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes de pagamento', {
        userId,
        error,
      });
      throw error;
    }
  }

  async updatePaymentSettings(userId: string, updates: Partial<PaymentSettings>): Promise<void> {
    try {
      const settingsRef = doc(db, this.settingsCollection, userId);
      await updateDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('ConfiguraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes de pagamento atualizadas com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configuraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes de pagamento', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  async getPixKeys(userId: string): Promise<PixKey[]> {
    try {
      if (!userId) {
        return [];
      }
      const pixKeysRef = collection(db, this.pixKeysCollection);
      const q = query(pixKeysRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const keys = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as PixKey[];

      return keys.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      loggingService.error('Erro ao buscar chaves PIX', {
        userId,
        error,
      });
      throw error;
    }
  }

  async addPixKey(pixKey: Omit<PixKey, 'id' | 'createdAt'>): Promise<PixKey> {
    try {
      const pixKeysRef = collection(db, this.pixKeysCollection);
      const newPixKeyRef = doc(pixKeysRef);
      await setDoc(newPixKeyRef, {
        ...pixKey,
        createdAt: new Date().toISOString(),
      });

      const newPixKey: PixKey = {
        id: newPixKeyRef.id,
        ...pixKey,
        createdAt: new Date().toISOString(),
      };

      loggingService.info('Chave PIX adicionada com sucesso', {
        pixKeyId: newPixKeyRef.id,
      });
      return newPixKey;
    } catch (error) {
      loggingService.error('Erro ao adicionar chave PIX', { error });
      throw error;
    }
  }

  async removePixKey(pixKeyId: string): Promise<void> {
    try {
      const pixKeyRef = doc(db, this.pixKeysCollection, pixKeyId);
      await deleteDoc(pixKeyRef);

      loggingService.info('Chave PIX removida com sucesso', {
        pixKeyId,
      });
    } catch (error) {
      loggingService.error('Erro ao remover chave PIX', {
        pixKeyId,
        error,
      });
      throw error;
    }
  }

  async setDefaultPixKey(userId: string, pixKeyId: string): Promise<void> {
    try {
      const pixKeysRef = collection(db, this.pixKeysCollection);
      const q = query(pixKeysRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          isDefault: doc.id === pixKeyId,
        });
      });

      await batch.commit();

      loggingService.info('Chave PIX padrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o definida com sucesso', {
        userId,
        pixKeyId,
      });
    } catch (error) {
      loggingService.error('Erro ao definir chave PIX padrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', {
        userId,
        pixKeyId,
        error,
      });
      throw error;
    }
  }

  async generatePixCode(
    orderId: string,
    pixKey?: PixKey
  ): Promise<{ code: string; qrCode: string; paymentIntentId: string }> {
    try {
      const result = await this.processPixPayment(orderId);
      if (!result.success || !result.qrCode) {
        throw new Error('Erro ao gerar PIX');
      }
      return {
        code: result.qrCode, // Para o Stripe, o qrCode data costuma ser o código "copia e cola"
        qrCode: result.qrCode,
        paymentIntentId: result.paymentIntentId || '',
      };
    } catch (error) {
      loggingService.error('Erro ao gerar código PIX', {
        orderId,
        error,
      });
      throw error;
    }
  }

  async savePayment(data: PaymentData) {
    const paymentsRef = collection(db, 'payments');
    const newRef = doc(paymentsRef);
    await setDoc(newRef, {
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: data.status,
      paymentId: data.paymentId,
      createdAt: new Date().toISOString(),
    });
    return { id: newRef.id, ...data, createdAt: new Date().toISOString() } as any;
  }

  async getPaymentByPaymentId(paymentId: string) {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('paymentId', '==', paymentId), limit(1));
    const snap = await getDocs(q);
    const docSnap = (snap && Array.isArray((snap as any).docs)) ? (snap as any).docs[0] : undefined;
    return docSnap ? ({ id: docSnap.id, ...docSnap.data() } as any) : null;
  }

  async updatePaymentStatus(paymentId: string, status: 'pending' | 'completed' | 'failed') {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('paymentId', '==', paymentId), limit(1));
    const snap = await getDocs(q);
    const docSnap = (snap && Array.isArray((snap as any).docs)) ? (snap as any).docs[0] : undefined;
    if (!docSnap) return null as any;
    await updateDoc(docSnap.ref, { status });
    const updated = await getDoc(docSnap.ref);
    return { id: updated.id, ...updated.data() } as any;
  }

  async getUserPayments(userId: string) {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const docs = (snap && Array.isArray((snap as any).docs)) ? (snap as any).docs : [];
    return docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
  }

  /**
   * Processa um pagamento com divisão entre app, produtor e entregador
   * @param orderId ID do pedido
   * @param cardDetails Detalhes do cartão
   * @returns Objeto com os IDs das transferências criadas e status do pagamento
   */
  public async processPaymentWithSplit(
    orderId: string,
    cardDetails: CardDetails
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    appTransferId?: string;
    producerTransferId?: string;
    deliveryPersonTransferId?: string;
  }> {
    try {
      // Obter informações do pedido
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido não encontrado', { orderId });
        return { success: false };
      }

      const orderData = orderDoc.data() as any;
      const amount = orderData.totalAmount;
      const deliveryFee = orderData.deliveryFee || 0;
      const userId = orderData.userId;
      const producerId = orderData.producerId;
      const deliveryPersonId = orderData.deliveryPersonId;

      if (!producerId) {
        loggingService.error('Produtor não definido no pedido', { orderId });
        return { success: false };
      }

      // Criar ou obter cliente no Stripe
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        loggingService.error('Usuário não encontrado', { userId });
        return { success: false };
      }

      const userData = userDoc.data() as any;
      let stripeCustomerId = userData.stripeCustomerId;

      // Se o usuário não tiver um ID de cliente no Stripe, criar um
      if (!stripeCustomerId) {
        const hasEmail = typeof userData.email === 'string' && userData.email.includes('@');
        const hasName = typeof userData.name === 'string' && userData.name.trim().length > 0;
        if (!hasEmail || !hasName) {
          loggingService.warn('Dados do usuário incompletos para Stripe: usando valores padrão', { userId, hasEmail, hasName });
        }
        const userEmail = hasEmail ? userData.email : `no-email+${userId}@acucaradas.local`;
        const userName = hasName ? userData.name : 'Cliente';
        stripeCustomerId = await this.stripeService.createCustomer(userEmail, userName);
        await updateDoc(userRef, { stripeCustomerId: stripeCustomerId });
      }

      // Criar método de pagamento no Stripe
      const paymentMethodId = await this.stripeService.createPaymentMethodFromCard({
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
      });

      // Obter taxa de manutenção
      const maintenanceFee = orderData.paymentDetails?.platformMaintenanceFee || 0;

      // Processar pagamento com divisão
      const paymentResult = await this.stripeService.processPaymentWithSplit(
        orderId,
        orderData.paymentDetails?.productAmount || (amount - deliveryFee - maintenanceFee),
        deliveryFee,
        'credit_card',
        producerId,
        deliveryPersonId
      );

      // Confirmar pagamento
      const confirmedPayment = await this.stripeService.processCardPayment(
        paymentResult.paymentIntentId,
        paymentMethodId
      );

      // Verificar status do pagamento
      if (confirmedPayment.status !== 'succeeded') {
        throw new Error(`Pagamento falhou com status: ${confirmedPayment.status}`);
      }

      // Obter valores calculados pelo StripeService
      const appFee = paymentResult.appFee;
      const producerAmount = paymentResult.producerAmount;
      const productAmount = Number((amount - deliveryFee - maintenanceFee).toFixed(2));

      // Finalizar o pagamento do pedido via OrderService (centralizado)
      await this.orderService.finalizeOrderPayment(orderId, {
        paymentMethod: 'credit_card',
        paymentIntentId: paymentResult.paymentIntentId,
        paymentMethodId: paymentMethodId,
        receiptUrl: confirmedPayment.charges?.data[0]?.receipt_url || '',
        appTransferId: paymentResult.appTransferId,
        producerTransferId: paymentResult.producerTransferId,
        deliveryPersonTransferId: paymentResult.deliveryPersonTransferId,
        productAmount: productAmount,
        deliveryFee: deliveryFee,
        platformMaintenanceFee: maintenanceFee,
        appFee: appFee,
        producerAmount: producerAmount,
        totalAmount: amount,
      });

      return {
        success: true,
        paymentIntentId: paymentResult.paymentIntentId,
        appTransferId: paymentResult.appTransferId,
        producerTransferId: paymentResult.producerTransferId,
        deliveryPersonTransferId: paymentResult.deliveryPersonTransferId,
      };
    } catch (error) {
      loggingService.error('Error processing payment with split', { orderId, error });
      throw error;
    }
  }

  /**
   * Processa um pagamento PIX
   * @param orderId ID do pedido
   * @returns QR Code e detalhes do pagamento
   */
  public async processPixPayment(orderId: string): Promise<{
    success: boolean;
    qrCode?: string;
    expiresAt?: number;
    paymentIntentId?: string;
  }> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Pedido não encontrado');
      }

      const orderData = orderDoc.data() as any;
      const subtotal = orderData.paymentDetails?.productAmount || (orderData.totalAmount - (orderData.deliveryFee || 0) - (orderData.paymentDetails?.platformMaintenanceFee || 0));

      // Criar pagamento PIX no Stripe via backend
      const pixData = await this.stripeService.createPixPayment(
        orderData.totalAmount, 
        { orderId, subtotal, userId: orderData.userId }
      );

      // Atualizar pedido com ID do pagamento
      await updateDoc(orderRef, {
        paymentStatus: 'pending',
        paymentMethod: 'pix',
        stripePaymentIntentId: pixData.paymentIntentId,
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        qrCode: pixData.qrCode,
        expiresAt: pixData.expiresAt,
        paymentIntentId: pixData.paymentIntentId,
      };
    } catch (error) {
      loggingService.error('Erro ao processar pagamento PIX', { orderId, error });
      return { success: false };
    }
  }

  public async criarPagamento(dados: any): Promise<any> {
    if (dados.valor <= 0) {
      throw new Error('Valor inválido');
    }

    if (dados.metodoPagamento === 'cartao_invalido') {
      throw new Error('Cartão recusado');
    }

    const card = dados.dadosCartao ?? dados.cartao;
    const validationService = ValidationService.getInstance();
    if (card && typeof validationService?.validarCartao === 'function') {
      let normalizedCard: any = card;
      if (typeof card?.expiracao === 'string' && !card?.expMonth && !card?.expYear) {
        const [mmRaw, yyRaw] = String(card.expiracao).split('/');
        const expMonth = Number(mmRaw);
        const expYearShort = Number(yyRaw);
        const expYear = expYearShort < 100 ? 2000 + expYearShort : expYearShort;

        normalizedCard = {
          number: card.numero,
          expMonth,
          expYear,
          cvc: card.cvv,
          holderName: card.nome,
        };
      }

      if (typeof normalizedCard?.expMonth === 'number' && typeof normalizedCard?.expYear === 'number') {
        if (!validationService.validarCartao(normalizedCard)) {
          throw new Error('Cartão inválido');
        }
      }
    }

    const pagamento = {
      id: `pag_${Date.now()}`,
      ...dados,
      status: 'sucesso',
      data: new Date(),
    };

    this.pagamentos.set(pagamento.id, pagamento);
    return pagamento;
  }

  public async consultarPagamento(id: string): Promise<any> {
    const pagamento = this.pagamentos.get(id);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }
    return pagamento;
  }

  public async cancelarPagamento(id: string): Promise<any> {
    const pagamento = this.pagamentos.get(id);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }

    if (pagamento.status === 'cancelado') {
      throw new Error('Pagamento já cancelado');
    }

    pagamento.status = 'cancelado';
    pagamento.dataCancelamento = new Date();

    this.pagamentos.set(id, pagamento);
    return pagamento;
  }

  public async reembolsarPagamento(id: string): Promise<any> {
    const pagamento = this.pagamentos.get(id);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }

    if (pagamento.status === 'reembolsado') {
      throw new Error('Pagamento já reembolsado');
    }

    pagamento.status = 'reembolsado';
    pagamento.dataReembolso = new Date();

    this.pagamentos.set(id, pagamento);
    return pagamento;
  }

  public async listarPagamentos(filtros: any = {}): Promise<any[]> {
    let pagamentos = Array.from(this.pagamentos.values());

    if (filtros.dataInicio || filtros.dataFim) {
      const start = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
      const end = filtros.dataFim ? new Date(filtros.dataFim) : null;
      pagamentos = pagamentos.filter(p => {
        const d = p?.data instanceof Date ? p.data : new Date(p?.data);
        if (Number.isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (filtros.status) {
      pagamentos = pagamentos.filter(p => p.status === filtros.status);
    }

    if (filtros.valorMin) {
      pagamentos = pagamentos.filter(p => p.valor >= filtros.valorMin);
    }

    if (filtros.valorMax) {
      pagamentos = pagamentos.filter(p => p.valor <= filtros.valorMax);
    }

    return pagamentos;
  }

  /**
   * Alias para processCreditCardPayment para compatibilidade
   */
  public async processarPagamentoCartaoCredito(orderId: string, cardDetails: any): Promise<boolean> {
    return this.processCreditCardPayment(orderId, cardDetails);
  }

  /**
   * Alias para getPaymentCards para compatibilidade
   */
  public async obterCartoesPagamento(userId: string): Promise<any[]> {
    return this.getPaymentCards(userId);
  }

  /**
   * Alias para addPaymentCard para compatibilidade
   */
  public async adicionarCartaoPagamento(card: any): Promise<any> {
    return this.addPaymentCard(card);
  }

  /**
   * Alias para removePaymentCard para compatibilidade
   */
  public async removerCartaoPagamento(cardId: string): Promise<void> {
    return this.removePaymentCard(cardId);
  }

  /**
   * Alias para setDefaultCard para compatibilidade
   */
  public async definirCartaoPadrao(userId: string, cardId: string): Promise<void> {
    return this.setDefaultCard(userId, cardId);
  }

  /**
   * Alias para createTransaction para compatibilidade
   */
  public async criarTransacao(transaction: any): Promise<any> {
    return this.createTransaction(transaction);
  }

  /**
   * Alias para updateTransactionStatus para compatibilidade
   */
  public async atualizarStatusTransacao(transactionId: string, status: any, errorMessage?: string): Promise<void> {
    return this.updateTransactionStatus(transactionId, status, errorMessage);
  }

  /**
   * Alias para getTransactionById para compatibilidade
   */
  public async obterTransacaoPorId(transactionId: string): Promise<any> {
    return this.getTransactionById(transactionId);
  }

  /**
   * Alias para getUserTransactions para compatibilidade
   */
  public async obterTransacoesUsuario(userId: string, options?: any): Promise<any[]> {
    return this.getUserTransactions(userId, options);
  }

  /**
   * Alias para createRefund para compatibilidade
   */
  public async criarReembolso(refund: any): Promise<any> {
    return this.createRefund(refund);
  }

  /**
   * Alias para updateRefundStatus para compatibilidade
   */
  public async atualizarStatusReembolso(refundId: string, status: any): Promise<void> {
    return this.updateRefundStatus(refundId, status);
  }

  /**
   * Alias para getPaymentSummary para compatibilidade
   */
  public async obterResumoPagamento(userId: string): Promise<any> {
    return this.getPaymentSummary(userId);
  }

  /**
   * Alias para getPaymentSettings para compatibilidade
   */
  public async obterConfiguracoesPagamento(userId: string): Promise<any> {
    return this.getPaymentSettings(userId);
  }

  /**
   * Alias para updatePaymentSettings para compatibilidade
   */
  public async atualizarConfiguracoesPagamento(userId: string, updates: any): Promise<void> {
    return this.updatePaymentSettings(userId, updates);
  }

  /**
   * Alias para getPixKeys para compatibilidade
   */
  public async obterChavesPix(userId: string): Promise<any[]> {
    return this.getPixKeys(userId);
  }

  /**
   * Alias para addPixKey para compatibilidade
   */
  public async adicionarChavePix(pixKey: any): Promise<any> {
    return this.addPixKey(pixKey);
  }

  /**
   * Alias para removePixKey para compatibilidade
   */
  public async removerChavePix(pixKeyId: string): Promise<void> {
    return this.removePixKey(pixKeyId);
  }

  /**
   * Alias para setDefaultPixKey para compatibilidade
   */
  public async definirChavePixPadrao(userId: string, pixKeyId: string): Promise<void> {
    return this.setDefaultPixKey(userId, pixKeyId);
  }

  /**
   * Alias para generatePixCode para compatibilidade
   */
  public async gerarCodigoPix(orderId: string, pixKey: any): Promise<any> {
    return this.generatePixCode(orderId, pixKey);
  }

  /**
   * Alias para savePayment para compatibilidade
   */
  public async salvarPagamento(data: any): Promise<any> {
    return this.savePayment(data);
  }

  /**
   * Alias para getPaymentByPaymentId para compatibilidade
   */
  public async obterPagamentoPorId(paymentId: string): Promise<any> {
    return this.getPaymentByPaymentId(paymentId);
  }

  /**
   * Alias para updatePaymentStatus para compatibilidade
   */
  public async atualizarStatusPagamento(paymentId: string, status: any): Promise<void> {
    return this.updatePaymentStatus(paymentId, status);
  }

  /**
   * Alias para getUserPayments para compatibilidade
   */
  public async obterPagamentosUsuario(userId: string): Promise<any[]> {
    return this.getUserPayments(userId);
  }

  /**
   * Alias para processPaymentWithSplit para compatibilidade
   */
  public async processarPagamentoComDivisao(orderId: string, cardDetails: any): Promise<any> {
    return this.processPaymentWithSplit(orderId, cardDetails);
  }

  /**
   * Alias para processPixPayment para compatibilidade
   */
  public async processarPagamentoPix(orderId: string): Promise<any> {
    return this.processPixPayment(orderId);
  }
}


