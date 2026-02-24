import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  PaymentCard,
  PaymentTransaction,
  PaymentRefund,
  PaymentSummary,
  PaymentSettings,
  PaymentMethod,
  PaymentStatus,
} from '../types/Payment';
import { loggingService } from './LoggingService';
import { PrismaClient } from '@prisma/client';
import { ValidationService } from './validationService';
import { StripeService } from './StripeService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

// Interface para detalhes do cartão
interface CardDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  holderName: string;
}

interface PixKey {
  userId: string;
  type: 'cpf' | 'email' | 'phone';
  value: string;
  isDefault: boolean;
  createdAt: string;
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
  private pagamentos: Map<string, any>;

  private stripeService: StripeService;
  private notificationService: NotificationService;

  private constructor() {
    this.pagamentos = new Map();
    this.inicializarDadosTeste();
    this.stripeService = StripeService.getInstance();
    this.notificationService = new NotificationService();
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
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        loggingService.error('Pedido não encontrado', { orderId });
        return false;
      }

      const orderData = orderDoc.data();
      const amount = orderData.totalAmount;
      const userId = orderData.userId;

      // Usar o StripeService para processar o pagamento

      // Criar ou obter cliente no Stripe
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        loggingService.error('Usuário não encontrado', { userId });
        return false;
      }

      const userData = userDoc.data();
      let stripeCustomerId = userData.stripeCustomerId;

      // Se o usuário não tiver um ID de cliente no Stripe, criar um
      if (!stripeCustomerId) {
        stripeCustomerId = await this.stripeService.createCustomer(userData.email, userData.name);

        // Atualizar o documento do usuário com o ID do cliente Stripe
        await updateDoc(userRef, {
          stripeCustomerId: stripeCustomerId,
        });
      }

      // Já verificamos que o pedido existe acima, não precisamos verificar novamente
      const customerId = userData.stripeCustomerId || stripeCustomerId;

      // Criar método de pagamento no Stripe
      const paymentMethodResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.stripeService.getSecretKey()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `type=card&card[number]=${cardDetails.number}&card[exp_month]=${cardDetails.expMonth}&card[exp_year]=${cardDetails.expYear}&card[cvc]=${cardDetails.cvc}`,
      });

      const paymentMethodData = await paymentMethodResponse.json();

      if (!paymentMethodResponse.ok) {
        throw new Error(paymentMethodData.error?.message || 'Erro ao criar método de pagamento');
      }

      const paymentMethod = paymentMethodData;

      // Criar intenção de pagamento
      const paymentIntent = await this.stripeService.createPaymentIntent(orderId, amount);

      // Confirmar pagamento
      const confirmedPayment = await this.stripeService.processCardPayment(
        paymentIntent.id,
        paymentMethod.id
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
        stripePaymentMethodId: paymentMethod.id,
        stripeReceiptUrl: confirmedPayment.charges?.data[0]?.receipt_url || '',
      });

      // Enviar notificação de confirmação de pagamento
      await this.notificationService.sendPaymentConfirmation(customerId, orderId);

      return true;
    } catch (error) {
      console.error('Error processing credit card payment:', error);
      throw error;
    }
  }

  async getPaymentCards(userId: string): Promise<PaymentCard[]> {
    try {
      const cardsRef = collection(db, this.cardsCollection);
      const q = query(cardsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentCard[];
    } catch (error) {
      loggingService.error('Erro ao buscar cartões de pagamento', {
        userId,
        error,
      });
      throw error;
    }
  }

  async addPaymentCard(card: Omit<PaymentCard, 'id' | 'createdAt'>): Promise<PaymentCard> {
    try {
      const cardsRef = collection(db, this.cardsCollection);
      const docRef = await setDoc(doc(cardsRef), {
        ...card,
        createdAt: new Date().toISOString(),
      });

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
      loggingService.error('Erro ao adicionar cartão de pagamento', { error });
      throw error;
    }
  }

  async removePaymentCard(cardId: string): Promise<void> {
    try {
      const cardRef = doc(db, this.cardsCollection, cardId);
      await cardRef.delete();

      loggingService.info('Cartão de pagamento removido com sucesso', {
        cardId,
      });
    } catch (error) {
      loggingService.error('Erro ao remover cartão de pagamento', {
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

      const batch = db.batch();
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isDefault: doc.id === cardId,
        });
      });

      await batch.commit();

      loggingService.info('Cartão padrão definido com sucesso', {
        userId,
        cardId,
      });
    } catch (error) {
      loggingService.error('Erro ao definir cartão padrão', {
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
      const docRef = await setDoc(doc(transactionsRef), {
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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
      loggingService.error('Erro ao criar transação de pagamento', { error });
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

      loggingService.info('Status da transação atualizado com sucesso', {
        transactionId,
        status,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar status da transação', {
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
      loggingService.error('Erro ao buscar transação', {
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

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentTransaction[];
    } catch (error) {
      loggingService.error('Erro ao buscar transações do usuário', {
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
      const docRef = await setDoc(doc(refundsRef), {
        ...refund,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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

      // Inicializar contadores por método
      Object.values(PaymentMethod).forEach(method => {
        summary.byMethod[method] = {
          count: 0,
          total: 0,
        };
      });

      // Inicializar contadores por status
      Object.values(PaymentStatus).forEach(status => {
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
      loggingService.error('Erro ao buscar configurações de pagamento', {
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

      loggingService.info('Configurações de pagamento atualizadas com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configurações de pagamento', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  async getPixKeys(userId: string): Promise<PixKey[]> {
    try {
      const pixKeysRef = collection(db, this.pixKeysCollection);
      const q = query(pixKeysRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PixKey[];
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
      const docRef = await setDoc(doc(pixKeysRef), {
        ...pixKey,
        createdAt: new Date().toISOString(),
      });

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
      loggingService.error('Erro ao adicionar chave PIX', { error });
      throw error;
    }
  }

  async removePixKey(pixKeyId: string): Promise<void> {
    try {
      const pixKeyRef = doc(db, this.pixKeysCollection, pixKeyId);
      await pixKeyRef.delete();

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

      const batch = db.batch();
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isDefault: doc.id === pixKeyId,
        });
      });

      await batch.commit();

      loggingService.info('Chave PIX padrão definida com sucesso', {
        userId,
        pixKeyId,
      });
    } catch (error) {
      loggingService.error('Erro ao definir chave PIX padrão', {
        userId,
        pixKeyId,
        error,
      });
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
      loggingService.error('Erro ao gerar código PIX', {
        orderId,
        pixKeyId: pixKey.id,
        error,
      });
      throw error;
    }
  }

  async savePayment(data: PaymentData) {
    return prisma.payment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        status: data.status,
        paymentId: data.paymentId,
      },
    });
  }

  async getPaymentByPaymentId(paymentId: string) {
    return prisma.payment.findUnique({
      where: { paymentId },
    });
  }

  async updatePaymentStatus(paymentId: string, status: 'pending' | 'completed' | 'failed') {
    return prisma.payment.update({
      where: { paymentId },
      data: { status },
    });
  }

  async getUserPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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

      const orderData = orderDoc.data();
      const amount = orderData.totalAmount;
      const deliveryFee = orderData.deliveryFee || 0;
      const userId = orderData.userId;
      const producerId = orderData.producerId;
      const deliveryPersonId = orderData.deliveryPersonId;

      if (!producerId || !deliveryPersonId) {
        loggingService.error('Produtor ou entregador não definido no pedido', { orderId });
        return { success: false };
      }

      // Criar ou obter cliente no Stripe
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        loggingService.error('Usuário não encontrado', { userId });
        return { success: false };
      }

      const userData = userDoc.data();
      let stripeCustomerId = userData.stripeCustomerId;

      // Se o usuário não tiver um ID de cliente no Stripe, criar um
      if (!stripeCustomerId) {
        stripeCustomerId = await this.stripeService.createCustomer(userData.email, userData.name);

        // Atualizar o documento do usuário com o ID do cliente Stripe
        await updateDoc(userRef, {
          stripeCustomerId: stripeCustomerId,
        });
      }

      // Criar método de pagamento no Stripe
      const paymentMethodResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.stripeService.getSecretKey()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `type=card&card[number]=${cardDetails.number}&card[exp_month]=${cardDetails.expMonth}&card[exp_year]=${cardDetails.expYear}&card[cvc]=${cardDetails.cvc}`,
      });

      const paymentMethodData = await paymentMethodResponse.json();

      if (!paymentMethodResponse.ok) {
        throw new Error(paymentMethodData.error?.message || 'Erro ao criar método de pagamento');
      }

      const paymentMethod = paymentMethodData;

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
        paymentMethod.id
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
        stripePaymentIntentId: paymentResult.paymentIntentId,
        stripePaymentMethodId: paymentMethod.id,
        stripeReceiptUrl: confirmedPayment.charges?.data[0]?.receipt_url || '',
        appTransferId: paymentResult.appTransferId,
        producerTransferId: paymentResult.producerTransferId,
        deliveryPersonTransferId: paymentResult.deliveryPersonTransferId,
        updatedAt: new Date().toISOString(),
        paymentDetails: {
          productAmount: amount - deliveryFee,
          deliveryFee: deliveryFee,
          appFee: Math.round((amount - deliveryFee) * 0.1), // 10% para o app
          producerAmount: Math.round((amount - deliveryFee) * 0.9), // 90% para o produtor
          totalAmount: amount,
        },
      });

      // Calcular valores para notificações detalhadas
      const productAmount = amount - deliveryFee;
      const appFee = Math.round(productAmount * 0.1); // 10% para o app
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
          receiptUrl: confirmedPayment.charges?.data[0]?.receipt_url || '',
        },
      });

      // Enviar notificação detalhada ao produtor
      await this.notificationService.createNotification({
        userId: producerId,
        type: 'payment_received',
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
        type: 'payment_received',
        title: 'Pagamento de entrega recebido',
        message: `Você recebeu ${formatCurrency(deliveryFee)} pela entrega do pedido #${orderId.substring(0, 8)}.`,
        priority: 'high',
        read: false,
        data: {
          orderId: orderId,
          amount: deliveryFee,
          totalOrderAmount: amount,
          transferId: paymentResult.deliveryPersonTransferId,
        },
      });

      // Registrar no log
      loggingService.info('Notificações de pagamento enviadas com sucesso', {
        orderId,
        clientAmount: amount,
        producerAmount,
        deliveryFee,
      });

      return {
        success: true,
        paymentIntentId: paymentResult.paymentIntentId,
        appTransferId: paymentResult.appTransferId,
        producerTransferId: paymentResult.producerTransferId,
        deliveryPersonTransferId: paymentResult.deliveryPersonTransferId,
      };
    } catch (error) {
      console.error('Error processing payment with split:', error);
      loggingService.error('Erro ao processar pagamento com divisão', { orderId, error });
      throw error;
    }
  }

  public async criarPagamento(dados: any): Promise<any> {
    if (dados.valor <= 0) {
      throw new Error('Valor do pagamento deve ser maior que zero');
    }

    const validationService = ValidationService.getInstance();
    if (!validationService.validarCartao(dados.cartao)) {
      throw new Error('Cartão inválido');
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
