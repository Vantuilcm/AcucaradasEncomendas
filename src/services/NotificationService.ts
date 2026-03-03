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
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationType,
} from '../types/Notification';
import { loggingService } from './LoggingService';
import { PushNotificationService } from './PushNotificationService';

export interface NotificacaoDados {
  titulo: string;
  mensagem: string;
  destinatario: string;
  tipo?: 'email' | 'sms' | 'push';
}

export interface Notificacao extends NotificacaoDados {
  id: string;
  status: 'enviado' | 'lida' | 'excluida';
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
      const notificationsRef = collection(db, this.collection);
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
      const notificationsRef = collection(db, this.collection);
      const docRef = await setDoc(doc(notificationsRef), {
        ...notification,
        createdAt: new Date().toISOString(),
      });

      const newNotification: Notification = {
        id: docRef.id,
        ...notification,
        createdAt: new Date().toISOString(),
      };

      // Verificar preferências do usuário
      const preferences = await this.getUserPreferences(notification.userId);
      if (preferences?.enabled && preferences.types[notification.type]) {
        // Enviar notificação push
        await this.pushNotificationService.sendPushNotification(
          notification.userId,
          notification.title,
          notification.message,
          {
            notificationId: docRef.id,
            type: notification.type,
            ...notification.data,
          }
        );
      }

      loggingService.info('Notificação criada com sucesso', {
        notificationId: docRef.id,
      });
      return newNotification;
    } catch (error) {
      loggingService.error('Erro ao criar notificação', { error });
      throw error;
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
      const notificationsRef = collection(db, this.collection);
      const q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
      const querySnapshot = await getDocs(q);

      const batch = db.batch();
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();

      loggingService.info('Todas as notificações marcadas como lidas', {
        userId,
      });
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
      await notificationRef.delete();

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
      const notificationsRef = collection(db, this.collection);
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
      Object.values(NotificationType).forEach(type => {
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

  public async enviarNotificacao(dados: NotificacaoDados): Promise<Notificacao> {
    this.validarDadosNotificacao(dados);

    const notificacao: Notificacao = {
      id: `not_${Date.now()}`,
      ...dados,
      tipo: dados.tipo || 'email',
      status: 'enviado',
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
    if (dados.tipo && !['email', 'sms', 'push'].includes(dados.tipo)) {
      throw new Error('Tipo de notificação inválido');
    }
  }

  private inicializarDadosTeste(): void {
    const notificacaoTeste: Notificacao = {
      id: 'not_123',
      titulo: 'Teste',
      mensagem: 'Teste',
      destinatario: 'teste@teste.com',
      tipo: 'email',
      status: 'enviado',
      data: new Date(),
    };
    this.notificacoes.set(notificacaoTeste.id, notificacaoTeste);
  }
}
