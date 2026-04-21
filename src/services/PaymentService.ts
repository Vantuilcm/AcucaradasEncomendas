import { getDb, dbFunctions as f } from '../config/firebase';
import {
  PaymentCard,
  PaymentTransaction,
  PaymentRefund,
  PaymentSummary,
  PaymentSettings,
  PaymentMethod,
  PaymentStatus,
  PixKey,
} from '../types/Payment';
import { loggingService } from './LoggingService';
import { StripeService } from './StripeService';
import { NotificationService } from './NotificationService';

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

// Classe Singleton para o serviço de pagamento
export class PaymentService {
  private static instance: PaymentService;
  private readonly cardsCollection = 'payment_cards';
  private readonly transactionsCollection = 'payment_transactions';
  private readonly refundsCollection = 'payment_refunds';
  private readonly settingsCollection = 'payment_settings';
  private readonly pixKeysCollection = 'pix_keys';
  private readonly paymentsCollection = 'payments';
  private pagamentos: Map<string, any>;
  private readonly db = getDb();

  private stripeService: StripeService;
  private notificationService: NotificationService;

  private constructor() {
    this.pagamentos = new Map();
    this.inicializarDadosTeste();
    this.stripeService = StripeService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }

  private inicializarDadosTeste() {
    // Pagamento existente
    this.pagamentos.set('pag_123', {
      id: 'pag_123',
      valor: 100,
      moeda: 'BRL',
      descricao: 'Teste',
      status: 'aprovado',
      data: new Date('2024-01-01'),
    });
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Processa um pagamento com cartão de crédito
   * @param orderId ID do pedido
   * @param cardDetails Detalhes do cartão
   * @returns true se o pagamento foi bem-sucedido, false caso contrário
   */
  public async processCreditCardPayment(
    orderId: string,
    cardDetails: CardDetails
  ): Promise<boolean> {
    try {
      // Obter informações do pedido
      const orderRef = f.doc(this.db, 'orders', orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido não encontrado', undefined, { orderId });
        return false;
      }

      const orderData = orderDoc.data() as any;
      const amount = orderData.totalAmount;
      const userId = orderData.userId;

      // Usar o StripeService para processar o pagamento
      const stripeService = StripeService.getInstance();
      const customerId = await stripeService.createCustomer(
        orderData.customerEmail,
        orderData.customerName
      );

      const paymentMethodId = await stripeService.createPaymentMethod({
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
        holderName: cardDetails.holderName,
        email: orderData.customerEmail,
      });

      const { id: paymentIntentId } = await stripeService.createPaymentIntent(
        orderId,
        amount,
        customerId
      );

      const result = await stripeService.processCardPayment(paymentIntentId, paymentMethodId);

      if (result.status === 'succeeded') {
        // Atualizar pedido para pago
        await f.updateDoc(orderRef, {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentIntentId,
          updatedAt: f.serverTimestamp(),
        } as any);

        // Registrar transação
        await f.addDoc(f.collection(this.db, this.transactionsCollection), {
          orderId,
          userId,
          amount,
          paymentIntentId,
          status: 'succeeded',
          createdAt: f.serverTimestamp(),
        } as any);

        return true;
      }

      return false;
    } catch (error: any) {
      loggingService.error('Erro ao processar pagamento com cartão', { error: error.message });
      return false;
    }
  }

  /**
   * Processa um pagamento com divisão entre app, produtor e entregador
   * @param orderId ID do pedido
   * @param cardDetails Detalhes do cartão
   * @returns Resultado do processamento
   */
  public async processPaymentWithSplit(
    orderId: string,
    _cardDetails: CardDetails
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    appTransferId?: string;
    producerTransferId?: string;
    deliveryPersonTransferId?: string;
    error?: any;
  }> {
    try {
      // 1. Buscar dados do pedido
      const orderRef = f.doc(this.db, 'orders', orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido não encontrado', undefined, { orderId });
        return { success: false };
      }

      const orderData = orderDoc.data() as any;

      // Validações básicas
      if (!orderData.producerId || !orderData.deliveryPersonId) {
        loggingService.error('Produtor ou entregador não definido no pedido', undefined, {
          orderId,
        });
        return { success: false };
      }

      const { totalAmount, deliveryFee, producerId, deliveryPersonId, userId } = orderData;

      // Calcular valores para atualização (conforme teste)
      const productAmount = totalAmount - deliveryFee;
      const appFee = Math.round(productAmount * 0.1);
      const producerAmount = productAmount - appFee;

      // 2. Chamar StripeService para processar o split
      const result = await this.stripeService.processPaymentWithSplit(
        orderId,
        totalAmount,
        deliveryFee,
        producerId,
        deliveryPersonId
      );

      // 3. Atualizar Order
      await f.updateDoc(orderRef, {
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentMethod: {
          type: 'credit_card',
          id: result.paymentIntentId || '',
        },
        paymentDetails: {
          productAmount,
          deliveryFee,
          appFee,
          producerAmount,
          totalAmount,
        },
        updatedAt: new Date().toISOString(),
      } as any);

      // 4. Enviar Notificações
      // Para o usuário
      await this.notificationService.createNotification({
        userId,
        type: 'payment_received',
        title: 'Pagamento confirmado',
        message: `Seu pagamento do pedido #${orderId.substring(0, 8)} foi confirmado com sucesso.`,
        priority: 'high',
        read: false,
        data: {
          orderId,
          amount: totalAmount,
          receiptUrl: '',
        },
      });

      // Para o produtor
      await this.notificationService.createNotification({
        userId: producerId,
        type: 'new_order',
        title: 'Novo pedido pago',
        message: `Você recebeu um novo pagamento para o pedido #${orderId.substring(0, 8)}.`,
        priority: 'high',
        read: false,
        data: { orderId, amount: producerAmount },
      });

      // Para o entregador
      await this.notificationService.createNotification({
        userId: deliveryPersonId,
        type: 'delivery_available',
        title: 'Nova entrega disponível',
        message: `Pagamento confirmado para a entrega do pedido #${orderId.substring(0, 8)}.`,
        priority: 'high',
        read: false,
        data: { orderId, amount: deliveryFee },
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      loggingService.error(
        'Erro ao processar pagamento com divisão',
        error instanceof Error ? error : undefined,
        { orderId }
      );
      throw error;
    }
  }

  /**
   * Obtém os cartões de pagamento de um usuário
   * @param userId ID do usuário
   * @returns Lista de cartões
   */
  public async getPaymentCards(userId: string): Promise<PaymentCard[]> {
    try {
      const q = f.query(f.collection(this.db, this.cardsCollection), f.where('userId', '==', userId));
      const snapshot = await f.getDocs(q);
      return snapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as PaymentCard));
    } catch (error) {
      loggingService.error('Erro ao buscar cartões do usuário', error instanceof Error ? error : undefined, { userId });
      throw error;
    }
  }

  async addPaymentCard(card: Omit<PaymentCard, 'id' | 'createdAt'>): Promise<PaymentCard> {
    try {
      const cardsRef = f.collection(this.db, this.cardsCollection);
      const docRef = f.doc(cardsRef);
      await f.setDoc(
        docRef,
        {
          ...card,
          createdAt: new Date().toISOString(),
        } as any
      );

      const newCard: PaymentCard = {
        id: docRef.id,
        ...card,
        createdAt: new Date().toISOString(),
      };

      loggingService.info('Cartão de pagamento adicionado com sucesso', {
        cardId: docRef.id,
      });
      return newCard;
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar cartão de pagamento',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async removePaymentCard(cardId: string): Promise<void> {
    try {
      const cardRef = f.doc(this.db, this.cardsCollection, cardId);
      await f.deleteDoc(cardRef);

      loggingService.info('Cartão de pagamento removido com sucesso', {
        cardId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao remover cartão de pagamento',
        error instanceof Error ? error : undefined,
        { cardId }
      );
      throw error;
    }
  }

  async setDefaultCard(userId: string, cardId: string): Promise<void> {
    try {
      const cardsRef = f.collection(this.db, this.cardsCollection);
      const q = f.query(cardsRef, f.where('userId', '==', userId));
      const querySnapshot = await f.getDocs(q);

      const batch = f.writeBatch(this.db as any);
      querySnapshot.docs.forEach((docSnapshot: any) => {
        batch.update(docSnapshot.ref, {
          isDefault: docSnapshot.id === cardId,
        });
      });

      await batch.commit();

      loggingService.info('Cartão padrão definido com sucesso', {
        userId,
        cardId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao definir cartão padrão',
        error instanceof Error ? error : undefined,
        { userId, cardId }
      );
      throw error;
    }
  }

  async createTransaction(
    transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentTransaction> {
    try {
      const transactionsRef = f.collection(this.db, this.transactionsCollection);
      const docRef = f.doc(transactionsRef);
      await f.setDoc(
        docRef,
        {
          ...transaction,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any
      );

      const newTransaction: PaymentTransaction = {
        id: docRef.id,
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Transação de pagamento criada com sucesso', {
        transactionId: docRef.id,
      });
      return newTransaction;
    } catch (error) {
      loggingService.error(
        'Erro ao criar transação de pagamento',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const transactionRef = f.doc(this.db, this.transactionsCollection, transactionId);
      await f.updateDoc(
        transactionRef,
        {
          status,
          errorMessage,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Status da transação atualizado com sucesso', {
        transactionId,
        status,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar status da transação',
        error instanceof Error ? error : undefined,
        { transactionId, status }
      );
      throw error;
    }
  }

  async getTransactionById(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const transactionRef = f.doc(this.db, this.transactionsCollection, transactionId);
      const transactionDoc = await f.getDoc(transactionRef);

      if (!transactionDoc.exists()) {
        return null;
      }

      return {
        id: transactionDoc.id,
        ...transactionDoc.data(),
      } as PaymentTransaction;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar transação',
        error instanceof Error ? error : undefined,
        { transactionId }
      );
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
      const transactionsRef = f.collection(this.db, this.transactionsCollection);
      let q = f.query(transactionsRef, f.where('userId', '==', userId), f.orderBy('createdAt', 'desc'));

      if (options.status) {
        q = f.query(q, f.where('status', '==', options.status));
      }

      if (options.limit) {
        q = f.query(q, f.limit(options.limit));
      }

      const querySnapshot = await f.getDocs(q);

      return querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as PaymentTransaction[];
    } catch (error) {
      loggingService.error(
        'Erro ao buscar transações do usuário',
        error instanceof Error ? error : undefined,
        { userId, options }
      );
      throw error;
    }
  }

  async createRefund(
    refund: Omit<PaymentRefund, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentRefund> {
    try {
      const refundsRef = f.collection(this.db, this.refundsCollection);
      const docRef = f.doc(refundsRef);
      await f.setDoc(
        docRef,
        {
          ...refund,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any
      );

      const newRefund: PaymentRefund = {
        id: docRef.id,
        ...refund,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      loggingService.info('Reembolso criado com sucesso', {
        refundId: docRef.id,
      });
      return newRefund;
    } catch (error) {
      loggingService.error(
        'Erro ao criar reembolso',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async updateRefundStatus(refundId: string, status: PaymentRefund['status']): Promise<void> {
    try {
      const refundRef = f.doc(this.db, this.refundsCollection, refundId);
      await f.updateDoc(
        refundRef,
        {
          status,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Status do reembolso atualizado com sucesso', {
        refundId,
        status,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar status do reembolso',
        error instanceof Error ? error : undefined,
        { refundId, status }
      );
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

      // Inicializar contadores por método
      const paymentMethods: PaymentMethod[] = ['credit_card', 'debit_card', 'pix'];
      paymentMethods.forEach(method => {
        summary.byMethod[method] = {
          count: 0,
          total: 0,
        };
      });

      // Inicializar contadores por status
      const paymentStatuses: PaymentStatus[] = [
        'pending',
        'processing',
        'approved',
        'failed',
        'refunded',
        'cancelled',
      ];
      paymentStatuses.forEach(status => {
        summary.byStatus[status] = 0;
      });

      // Calcular estatísticas
      transactions.forEach(transaction => {
        // Por método
        summary.byMethod[transaction.method].count++;
        summary.byMethod[transaction.method].total += transaction.amount;

        // Por status
        summary.byStatus[transaction.status]++;
      });

      return summary;
    } catch (error) {
      loggingService.error(
        'Erro ao calcular resumo de pagamentos',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async getPaymentSettings(userId: string): Promise<PaymentSettings | null> {
    try {
      const settingsRef = f.doc(this.db, this.settingsCollection, userId);
      const settingsDoc = await f.getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return null;
      }

      return {
        userId,
        ...settingsDoc.data(),
      } as PaymentSettings;
    } catch (error) {
      loggingService.error(
        'Erro ao buscar configurações de pagamento',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async updatePaymentSettings(userId: string, updates: Partial<PaymentSettings>): Promise<void> {
    try {
      const settingsRef = f.doc(this.db, this.settingsCollection, userId);
      await f.updateDoc(
        settingsRef,
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        } as any
      );

      loggingService.info('Configurações de pagamento atualizadas com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar configurações de pagamento',
        error instanceof Error ? error : undefined,
        { userId, updates }
      );
      throw error;
    }
  }

  /**
   * Obtém as chaves PIX de um usuário
   * @param userId ID do usuário
   * @returns Lista de chaves PIX
   */
  public async getPixKeys(userId: string): Promise<PixKey[]> {
    try {
      const q = f.query(f.collection(this.db, this.pixKeysCollection), f.where('userId', '==', userId));
      const snapshot = await f.getDocs(q);
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as PixKey));
    } catch (error: any) {
      loggingService.error('Erro ao obter chaves PIX', { error: error.message });
      return [];
    }
  }

  async addPixKey(pixKey: Omit<PixKey, 'id' | 'createdAt'>): Promise<PixKey> {
    try {
      const pixKeysRef = f.collection(this.db, this.pixKeysCollection);
      const docRef = f.doc(pixKeysRef);
      await f.setDoc(
        docRef,
        {
          ...pixKey,
          createdAt: new Date().toISOString(),
        } as any
      );

      const newPixKey: PixKey = {
        id: docRef.id,
        ...pixKey,
        createdAt: new Date().toISOString(),
      };

      loggingService.info('Chave PIX adicionada com sucesso', {
        pixKeyId: docRef.id,
      });
      return newPixKey;
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar chave PIX',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  async removePixKey(pixKeyId: string): Promise<void> {
    try {
      const pixKeyRef = f.doc(this.db, this.pixKeysCollection, pixKeyId);
      await f.deleteDoc(pixKeyRef);

      loggingService.info('Chave PIX removida com sucesso', {
        pixKeyId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao remover chave PIX',
        error instanceof Error ? error : undefined,
        { pixKeyId }
      );
      throw error;
    }
  }

  async setDefaultPixKey(userId: string, pixKeyId: string): Promise<void> {
    try {
      const pixKeysRef = f.collection(this.db, this.pixKeysCollection);
      const q = f.query(pixKeysRef, f.where('userId', '==', userId));
      const querySnapshot = await f.getDocs(q);

      const batch = f.writeBatch(this.db as any);
      querySnapshot.docs.forEach((docSnapshot: any) => {
        batch.update(docSnapshot.ref, {
          isDefault: docSnapshot.id === pixKeyId,
        });
      });

      await batch.commit();

      loggingService.info('Chave PIX padrão definida com sucesso', {
        userId,
        pixKeyId,
      });
    } catch (error) {
      loggingService.error(
        'Erro ao definir chave PIX padrão',
        error instanceof Error ? error : undefined,
        { userId, pixKeyId }
      );
      throw error;
    }
  }

  async generatePixCode(
    orderId: string,
    pixKey: PixKey
  ): Promise<{ code: string; qrCode: string }> {
    try {
      // TODO: Implementar integração com o serviço de PIX
      // Por enquanto, retornamos um código fictício
      return {
        code: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000',
        qrCode:
          'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000',
      };
    } catch (error) {
      loggingService.error(
        'Erro ao gerar código PIX',
        error instanceof Error ? error : undefined,
        { orderId, pixKeyId: pixKey.id }
      );
      throw error;
    }
  }

  async savePayment(data: PaymentData) {
    const paymentsRef = f.collection(this.db, this.paymentsCollection);
    const paymentRef = f.doc(paymentsRef, data.paymentId);
    const payload = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await f.setDoc(paymentRef, payload as any);
    return {
      id: paymentRef.id,
      ...payload,
    };
  }

  async getPaymentByPaymentId(paymentId: string) {
    const paymentRef = f.doc(this.db, this.paymentsCollection, paymentId);
    const paymentDoc = await f.getDoc(paymentRef);
    if (!paymentDoc.exists()) {
      return null;
    }
    return {
      id: paymentDoc.id,
      ...paymentDoc.data(),
    };
  }

  async updatePaymentStatus(paymentId: string, status: 'pending' | 'completed' | 'failed') {
    const paymentRef = f.doc(this.db, this.paymentsCollection, paymentId);
    await f.updateDoc(
      paymentRef,
      {
        status,
        updatedAt: new Date().toISOString(),
      } as any
    );
    return true;
  }

  async getUserPayments(userId: string) {
    const paymentsRef = f.collection(this.db, this.paymentsCollection);
    const q = f.query(paymentsRef, f.where('userId', '==', userId), f.orderBy('createdAt', 'desc'));
    const querySnapshot = await f.getDocs(q);
    return querySnapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }));
  }

  /**
   * Processa um pagamento com divisão entre app, produtor e entregador
   * @param orderId ID do pedido
   * @param cardDetails Detalhes do cartão
   * @returns Objeto com os IDs das transferências criadas e status do pagamento
   */
  public async processPaymentWithSplitAlternative(
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
      const orderRef = f.doc(this.db, 'orders', orderId);
      const orderDoc = await f.getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido não encontrado', undefined, { orderId });
        return { success: false };
      }

      const orderData = orderDoc.data() as any;
      const amount = orderData.totalAmount;
      const deliveryFee = orderData.deliveryFee || 0;
      const userId = orderData.userId;
      const producerId = orderData.producerId;
      const deliveryPersonId = orderData.deliveryPersonId;

      if (!producerId || !deliveryPersonId) {
        loggingService.error('Produtor ou entregador não definido no pedido', undefined, {
          orderId,
        });
        return { success: false };
      }

      // Criar ou obter cliente no Stripe
      const userRef = f.doc(this.db, 'users', userId);
      const userDoc = await f.getDoc(userRef);

      if (!userDoc.exists()) {
        loggingService.error('Usuário não encontrado', undefined, { userId });
        return { success: false };
      }

      const userData = userDoc.data() as any;
      let stripeCustomerId = userData.stripeCustomerId;

      // Se o usuário não tiver um ID de cliente no Stripe, criar um
      if (!stripeCustomerId) {
        stripeCustomerId = await this.stripeService.createCustomer(userData.email, userData.name);

        // Atualizar o documento do usuário com o ID do cliente Stripe
        await f.updateDoc(
          userRef,
          {
            stripeCustomerId: stripeCustomerId,
          } as any
        );
      }

      const paymentMethodId = await this.stripeService.createPaymentMethod({
        number: cardDetails.number,
        expMonth: cardDetails.expMonth,
        expYear: cardDetails.expYear,
        cvc: cardDetails.cvc,
        holderName: cardDetails.holderName,
        email: userData.email,
      });

      // Processar pagamento com divisão
      const paymentResult = await this.stripeService.processPaymentWithSplit(
        orderId,
        amount,
        deliveryFee,
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

      const receiptUrl =
        confirmedPayment.receiptUrl || confirmedPayment.charges?.data?.[0]?.receipt_url || '';

      // Atualizar status do pedido
      await f.updateDoc(
        orderRef,
        {
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentMethod: {
            type: 'credit_card',
            id: paymentResult.paymentIntentId || '',
          },
          stripePaymentIntentId: paymentResult.paymentIntentId,
          stripePaymentMethodId: paymentMethodId,
          stripeReceiptUrl: receiptUrl,
          appTransferId: paymentResult.appTransferId,
          producerTransferId: paymentResult.producerTransferId,
          deliveryPersonTransferId: paymentResult.deliveryPersonTransferId,
          updatedAt: new Date().toISOString(),
          paymentDetails: {
            productAmount: amount - deliveryFee,
            deliveryFee: deliveryFee,
            appFee: Math.round((amount - deliveryFee) * 0.1),
            producerAmount: Math.round((amount - deliveryFee) * 0.9),
            totalAmount: amount,
          },
        } as any
      );

      // Calcular valores para notificações detalhadas
      const productAmount = amount - deliveryFee;
      const producerAmount = Math.round(productAmount * 0.9); // 90% para o produtor

      // Formatar valores para exibição
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value / 100); // Convertendo de centavos para reais
      };

      // Enviar notificação detalhada ao cliente
      await this.notificationService.createNotification({
        userId: userId,
        type: 'payment_received',
        title: 'Pagamento confirmado',
        message: `Seu pagamento de ${formatCurrency(amount)} para o pedido #${orderId.substring(0, 8)} foi confirmado com sucesso.`,
        priority: 'high',
        read: false,
        data: {
          orderId: orderId,
          amount: amount,
          receiptUrl,
        },
      });

      // Enviar notificação detalhada ao produtor
      await this.notificationService.createNotification({
        userId: producerId,
        type: 'new_order',
        title: 'Novo pagamento recebido',
        message: `Você recebeu ${formatCurrency(producerAmount)} pelo pedido #${orderId.substring(0, 8)}. Este valor corresponde a 90% do valor dos produtos.`,
        priority: 'high',
        read: false,
        data: {
          orderId: orderId,
          amount: producerAmount,
          totalOrderAmount: amount,
          productAmount: productAmount,
          transferId: paymentResult.producerTransferId,
        },
      });

      // Enviar notificação detalhada ao entregador
      await this.notificationService.createNotification({
        userId: deliveryPersonId,
        type: 'delivery_available',
        title: 'Pagamento de entrega recebido',
        message: `Você recebeu ${formatCurrency(deliveryFee)} pela entrega do pedido #${orderId.substring(0, 8)}.`,
        priority: 'high',
        read: false,
        data: {
          orderId: orderId,
          amount: deliveryFee,
          totalOrderAmount: amount,
        },
      });

      return {
        success: true,
        ...paymentResult,
      };
    } catch (error) {
      loggingService.error(
        'Erro ao processar pagamento com divisão alternativa',
        error instanceof Error ? error : undefined,
        { orderId }
      );
      throw error;
    }
  }

  async getTransactionHistory(userId: string): Promise<PaymentTransaction[]> {
    try {
      const q = f.query(
        f.collection(this.db, this.transactionsCollection),
        f.where('userId', '==', userId),
        f.orderBy('createdAt', 'desc')
      );
      const querySnapshot = await f.getDocs(q);
      return querySnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as PaymentTransaction[];
    } catch (error) {
      loggingService.error(
        'Erro ao buscar histórico de transações',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  async processPixPayment(orderId: string, _amount: number): Promise<{ success: boolean; qrCode: string; code: string }> {
    try {
      // Simulação de geração de PIX
      const code = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000';
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${code}`;
      
      return {
        success: true,
        qrCode,
        code
      };
    } catch (error) {
      loggingService.error('Erro ao processar pagamento PIX', error instanceof Error ? error : undefined, { orderId });
      throw error;
    }
  }

  public async criarPagamento(dados: any): Promise<any> {
    if (dados.valor <= 0) {
      throw new Error('Valor do pagamento deve ser maior que zero');
    }

    if (!dados?.cartao && !dados?.dadosCartao) {
      throw new Error('Cartão inválido');
    }

    if (dados.metodoPagamento === 'cartao_invalido') {
      throw new Error('Cartão recusado');
    }

    const pagamento = {
      id: `pag_${Date.now()}`,
      ...dados,
      status: 'aprovado',
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
}
