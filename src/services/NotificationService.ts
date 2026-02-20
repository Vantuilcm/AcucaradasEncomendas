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
import { deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationType,
} from '@/types/Notification';
import { loggingService } from '@/services/LoggingService';
import { NotificationType as NotificationConfigType, formatNotificationMessage } from '@/config/notifications';
const mapToConfigType = (type: NotificationType): NotificationConfigType => {
  switch (type) {
    case 'new_order':
      return NotificationConfigType.NEW_ORDER;
    case 'order_status_update':
      return NotificationConfigType.ORDER_STATUS_UPDATE;
    case 'order_delivered':
      return NotificationConfigType.DELIVERY_STATUS_UPDATE;
    case 'order_cancelled':
      return NotificationConfigType.ORDER_STATUS_UPDATE;
    case 'payment_received':
      return NotificationConfigType.PAYMENT_CONFIRMATION;
    case 'security_alert':
      return NotificationConfigType.SECURITY_ALERT;
    default:
      return NotificationConfigType.NEW_ORDER;
  }
};
import { mobileNotificationService } from './MobileNotificationService';
import { PushNotificationService } from './PushNotificationService';

export interface NotificacaoDados {
  titulo: string;
  mensagem: string;
  destinatario: string;
  tipo?: 'email' | 'sms' | 'push';
}

export interface Notificacao extends NotificacaoDados {
  id: string;
  status: 'enviada' | 'enviado' | 'lida' | 'excluida';
  data: Date;
}

export class NotificationService {
  private readonly collection = 'notifications';
  private readonly preferencesCollection = 'notification_preferences';
  private readonly pushNotificationService: PushNotificationService;
  private static instance: NotificationService;
  private notificacoes: Map<string, Notificacao>;

  private constructor() {
    this.pushNotificationService = new PushNotificationService();
    this.notificacoes = new Map();
    this.inicializarDadosTeste();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    try {
      const notificationsRef = collection<Notification>(db, this.collection);
      let q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

      if (options.unreadOnly) {
        q = query(q, where('read', '==', false));
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
    } catch (error) {
      loggingService.error('Erro ao buscar notificações do usuário', {
        userId,
        options,
        error,
      });
      throw error;
    }
  }

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      const notificationDoc = await getDoc(notificationRef);

      if (!notificationDoc.exists()) {
        return null;
      }

      return {
        id: notificationDoc.id,
        ...notificationDoc.data(),
      } as Notification;
    } catch (error) {
      loggingService.error('Erro ao buscar notificação', {
        notificationId,
        error,
      });
      throw error;
    }
  }

  async createNotification(
    notification: Omit<Notification, 'id' | 'createdAt'>
  ): Promise<Notification> {
    try {
      const notificationsRef = collection<Notification>(db, this.collection);
      const newDocRef = doc(notificationsRef);
      const newNotification: Notification = {
        id: newDocRef.id,
        ...notification,
        createdAt: new Date().toISOString(),
      };
      await setDoc(newDocRef, newNotification);

      // Verificar preferências do usuário
      const preferences = await this.getUserPreferences(notification.userId);
      if (preferences?.enabled && preferences.types[notification.type]) {
        // Enviar notificação push
        await this.pushNotificationService.sendPushNotification(
          notification.userId,
          notification.title,
          notification.message,
          {
            notificationId: newDocRef.id,
            type: notification.type,
            ...notification.data,
          }
        );
      }

      // loggingService.info('Notificação criada com sucesso', {
      //   notificationId: newNotificationRef.id,
      // });
      return newNotification;
    } catch (error) {
      loggingService.error('Erro ao criar notificação', { error });
      throw error;
    }
  }

  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const formatted = formatNotificationMessage(mapToConfigType(type), data);
      const ok = await mobileNotificationService.sendPushNotification(
        userId,
        formatted.title,
        formatted.body,
        { ...data },
        type
      );
      if (ok) {
        await this.createNotification({
          userId,
          type,
          title: formatted.title,
          message: formatted.body,
          priority: 'high',
          read: false,
          data,
        } as any);
      }
      return ok;
    } catch (error) {
      loggingService.error('Error sending push notification', { userId, type, data, error });
      return false;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });

      loggingService.info('Notificação marcada como lida', {
        notificationId,
      });
    } catch (error) {
      loggingService.error('Erro ao marcar notificação como lida', {
        notificationId,
        error,
      });
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = collection<Notification>(db, this.collection);
      const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
      const querySnapshot = await getDocs(q);

      const updates = querySnapshot.docs.map(d => updateDoc(d.ref, { read: true }));
      await Promise.all(updates);

      // loggingService.info('Todas as notificações marcadas como lidas', {
      //   userId,
      // });
    } catch (error) {
      loggingService.error('Erro ao marcar todas as notificações como lidas', {
        userId,
        error,
      });
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.collection, notificationId);
      await deleteDoc(notificationRef);

      loggingService.info('Notificação excluída com sucesso', {
        notificationId,
      });
    } catch (error) {
      loggingService.error('Erro ao excluir notificação', {
        notificationId,
        error,
      });
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const preferencesRef = doc(db, this.preferencesCollection, userId);
      const preferencesDoc = await getDoc(preferencesRef);

      if (!preferencesDoc.exists()) {
        return null;
      }

      return {
        userId,
        ...preferencesDoc.data(),
      } as NotificationPreferences;
    } catch (error) {
      loggingService.error('Erro ao buscar preferências de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const preferencesRef = doc(db, this.preferencesCollection, userId);
      await updateDoc(preferencesRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Preferências de notificação atualizadas com sucesso', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar preferências de notificação', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const notificationsRef = collection<Notification>(db, this.collection);
      const q = query(notificationsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as NotificationStats['byType'],
      };

      // Inicializa contadores para cada tipo
      const allTypes: NotificationType[] = [
        'new_order',
        'order_status_update',
        'order_delivered',
        'order_cancelled',
        'payment_received',
        'promotion',
        'system_update',
      ];
      allTypes.forEach(type => {
        stats.byType[type] = 0;
      });

      // Conta notificações por tipo
      notifications.forEach(notification => {
        stats.byType[notification.type]++;
      });

      return stats;
    } catch (error) {
      loggingService.error('Erro ao buscar estatísticas de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  async registerUserForPushNotifications(userId: string): Promise<void> {
    try {
      await this.pushNotificationService.registerForPushNotifications(userId);
    } catch (error) {
      loggingService.error('Erro ao registrar usuário para notificações push', {
        userId,
        error,
      });
      throw error;
    }
  }

  async unregisterUserFromPushNotifications(userId: string): Promise<void> {
    try {
      await this.pushNotificationService.unregisterForPushNotifications(userId);
    } catch (error) {
      loggingService.error('Erro ao remover registro de notificações push', {
        userId,
        error,
      });
      throw error;
    }
  }

    async sendPaymentConfirmation(userId: string, orderId: string): Promise<boolean> {
    try {
      await this.createNotification({
        userId,
        type: 'payment_received',
        title: 'Pagamento confirmado',
        message: 'Seu pagamento do pedido ' + orderId + ' foi confirmado.',
        priority: 'normal',
        read: false,
        data: { orderId }
      });
      loggingService.info('Notificação de confirmação de pagamento enviada', { userId, orderId });
      return true;
    } catch (error) {
      loggingService.error('Erro ao enviar confirmação de pagamento', { userId, orderId, error });
      throw error;
    }
  }

  /**
   * Alias para getUserNotifications para compatibilidade
   */
  public async obterNotificacoesUsuario(userId: string, options: any = {}): Promise<Notification[]> {
    return this.getUserNotifications(userId, options);
  }

  /**
   * Alias para getNotificationById para compatibilidade
   */
  public async obterNotificacaoPorId(notificationId: string): Promise<Notification | null> {
    return this.getNotificationById(notificationId);
  }

  /**
   * Alias para createNotification para compatibilidade
   */
  public async criarNotificacao(notification: any): Promise<Notification> {
    return this.createNotification(notification);
  }

  /**
   * Alias para sendNotification para compatibilidade
   */
  public async enviarNotificacaoPush(userId: string, type: NotificationType, data: any = {}): Promise<boolean> {
    return this.sendNotification(userId, type, data);
  }

  /**
   * Alias para markAsRead para compatibilidade
   */
  public async marcarLida(notificationId: string): Promise<void> {
    return this.markAsRead(notificationId);
  }

  /**
   * Alias para markAllAsRead para compatibilidade
   */
  public async marcarTodasComoLidas(userId: string): Promise<void> {
    return this.markAllAsRead(userId);
  }

  /**
   * Alias para deleteNotification para compatibilidade
   */
  public async excluirNotificacaoFisica(notificationId: string): Promise<void> {
    return this.deleteNotification(notificationId);
  }

  /**
   * Alias para getUserPreferences para compatibilidade
   */
  public async obterPreferenciasUsuario(userId: string): Promise<NotificationPreferences | null> {
    return this.getUserPreferences(userId);
  }

  /**
   * Alias para updateUserPreferences para compatibilidade
   */
  public async atualizarPreferenciasUsuario(userId: string, updates: Partial<NotificationPreferences>): Promise<void> {
    return this.updateUserPreferences(userId, updates);
  }

  /**
   * Alias para getNotificationStats para compatibilidade
   */
  public async obterEstatisticasNotificacao(userId: string): Promise<NotificationStats> {
    return this.getNotificationStats(userId);
  }

  /**
   * Alias para registerUserForPushNotifications para compatibilidade
   */
  public async registrarPushNotifications(userId: string): Promise<void> {
    return this.registerUserForPushNotifications(userId);
  }

  /**
   * Alias para unregisterUserFromPushNotifications para compatibilidade
   */
  public async removerRegistroPushNotifications(userId: string): Promise<void> {
    return this.unregisterUserFromPushNotifications(userId);
  }

  /**
   * Alias para sendPaymentConfirmation para compatibilidade
   */
  public async enviarConfirmacaoPagamento(userId: string, orderId: string): Promise<boolean> {
    return this.sendPaymentConfirmation(userId, orderId);
  }

public async enviarNotificacao(dados: NotificacaoDados): Promise<Notificacao> {
    this.validarDadosNotificacao(dados);

    const notificacao: Notificacao = {
      id: `not_${Date.now()}`,
      ...dados,
      tipo: dados.tipo || 'email',
      status: 'enviada',
      data: new Date(),
    };

    this.notificacoes.set(notificacao.id, notificacao);
    return notificacao;
  }

  public async consultarNotificacao(id: string): Promise<Notificacao> {
    const notificacao = this.notificacoes.get(id);
    if (!notificacao) {
      throw new Error('Notificação não encontrada');
    }
    return notificacao;
  }

  public async marcarComoLida(id: string): Promise<Notificacao> {
    const notificacao = await this.consultarNotificacao(id);
    if (notificacao.status === 'lida') {
      throw new Error('Notificação já está lida');
    }
    const notificacaoAtualizada = {
      ...notificacao,
      status: 'lida' as const,
    };
    this.notificacoes.set(id, notificacaoAtualizada);
    return notificacaoAtualizada;
  }

  public async listarNotificacoes(filtros?: {
    tipo?: string;
    status?: string;
    destinatario?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<Notificacao[]> {
    let notificacoes = Array.from(this.notificacoes.values());

    if (filtros) {
      notificacoes = notificacoes.filter(notificacao => {
        let atendeFiltros = true;
        if (filtros.tipo) {
          atendeFiltros = atendeFiltros && notificacao.tipo === filtros.tipo;
        }
        if (filtros.status) {
          atendeFiltros = atendeFiltros && notificacao.status === filtros.status;
        }
        if (filtros.destinatario) {
          atendeFiltros = atendeFiltros && notificacao.destinatario === filtros.destinatario;
        }

        if (filtros.dataInicio) {
          const inicio = new Date(filtros.dataInicio);
          if (!Number.isNaN(inicio.getTime())) {
            atendeFiltros = atendeFiltros && notificacao.data >= inicio;
          }
        }

        if (filtros.dataFim) {
          const fim = new Date(filtros.dataFim);
          if (!Number.isNaN(fim.getTime())) {
            atendeFiltros = atendeFiltros && notificacao.data <= fim;
          }
        }
        return atendeFiltros;
      });
    }

    return notificacoes;
  }

  public async excluirNotificacao(id: string): Promise<boolean> {
    const notificacao = await this.consultarNotificacao(id);
    const notificacaoAtualizada = {
      ...notificacao,
      status: 'excluida' as const,
    };
    this.notificacoes.set(id, notificacaoAtualizada);
    return true;
  }

  private validarDadosNotificacao(dados: NotificacaoDados): void {
    if (!dados.titulo) {
      throw new Error('Título é obrigatório');
    }
    if (!dados.mensagem) {
      throw new Error('Mensagem é obrigatória');
    }
    if (!dados.destinatario) {
      throw new Error('Destinatário é obrigatório');
    }

    const email = String(dados.destinatario).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
      throw new Error('Destinatário inválido');
    }
    if (dados.tipo && !['email', 'sms', 'push'].includes(dados.tipo)) {
      throw new Error('Tipo de notificação inválido');
    }
  }

  private inicializarDadosTeste(): void {
    const notificacaoTeste: Notificacao = {
      id: 'not_123',
      titulo: 'Teste',
      mensagem: 'Teste',
      destinatario: 'usuario@exemplo.com',
      tipo: 'email',
      status: 'enviada',
      data: new Date('2024-06-01T12:00:00.000Z'),
    };
    this.notificacoes.set(notificacaoTeste.id, notificacaoTeste);

    const notificacaoLida: Notificacao = {
      id: 'not_lida',
      titulo: 'Teste lida',
      mensagem: 'Teste lida',
      destinatario: 'usuario@exemplo.com',
      tipo: 'email',
      status: 'lida',
      data: new Date('2024-07-01T12:00:00.000Z'),
    };
    this.notificacoes.set(notificacaoLida.id, notificacaoLida);
  }
}






