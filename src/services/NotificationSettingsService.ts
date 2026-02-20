import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationSettings } from '../types/NotificationSettings';
import { loggingService } from './LoggingService';

export class NotificationSettingsService {
  private readonly collection = 'notification_settings';

  /**
   * Obtém as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @returns Configurações de notificação ou null se não existirem
   */
  async getUserSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return null;
      }

      return {
        id: settingsDoc.id,
        ...settingsDoc.data(),
      } as NotificationSettings;
    } catch (error) {
      loggingService.error('Erro ao buscar configurações de notificação', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Cria configurações de notificação padrão para um usuário
   * @param userId ID do usuário
   * @returns Configurações de notificação criadas
   */
  async createDefaultSettings(userId: string): Promise<NotificationSettings> {
    try {
      const now = new Date().toISOString();
      const defaultSettings: Omit<NotificationSettings, 'id'> = {
        userId,
        enabled: true,
        types: {
          orderStatus: true,
          promotions: true,
          news: true,
          deliveryUpdates: true,
          paymentUpdates: true,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        createdAt: now,
        updatedAt: now,
      };

      const settingsRef = doc(db, this.collection, userId);
      await setDoc(settingsRef, defaultSettings);

      loggingService.info('Configurações de notificação padrão criadas', {
        userId,
      });

      return {
        id: userId,
        ...defaultSettings,
      };
    } catch (error) {
      loggingService.error('Erro ao criar configurações de notificação padrão', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Atualiza as configurações de notificação de um usuário
   * @param userId ID do usuário
   * @param updates Atualizações a serem aplicadas
   */
  async updateSettings(userId: string, updates: Partial<NotificationSettings>): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Configurações de notificação atualizadas', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configurações de notificação', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * Alterna um tipo específico de notificação
   * @param userId ID do usuário
   * @param type Tipo de notificação a ser alternado
   */
  async toggleNotificationType(
    userId: string,
    type: keyof NotificationSettings['types']
  ): Promise<void> {
    try {
      const settings = await this.getUserSettings(userId);
      if (!settings) {
        throw new Error('Configurações de notificação não encontradas');
      }

      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        [`types.${type}`]: !settings.types[type],
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Tipo de notificação alternado', {
        userId,
        type,
        newValue: !settings.types[type],
      });
    } catch (error) {
      loggingService.error('Erro ao alternar tipo de notificação', {
        userId,
        type,
        error,
      });
      throw error;
    }
  }

  /**
   * Alterna o modo silencioso
   * @param userId ID do usuário
   * @param enabled Estado do modo silencioso
   */
  async toggleQuietHours(userId: string, enabled: boolean): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        'quietHours.enabled': enabled,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Modo silencioso alternado', {
        userId,
        enabled,
      });
    } catch (error) {
      loggingService.error('Erro ao alternar modo silencioso', {
        userId,
        enabled,
        error,
      });
      throw error;
    }
  }

  /**
   * Atualiza o horário do modo silencioso
   * @param userId ID do usuário
   * @param start Horário de início (formato HH:mm)
   * @param end Horário de término (formato HH:mm)
   */
  async updateQuietHoursTime(userId: string, start: string, end: string): Promise<void> {
    try {
      // Validar formato de hora (HH:mm)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        throw new Error('Formato de hora inválido. Use o formato HH:mm');
      }

      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        'quietHours.start': start,
        'quietHours.end': end,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Horário do modo silencioso atualizado', {
        userId,
        start,
        end,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar horário do modo silencioso', {
        userId,
        start,
        end,
        error,
      });
      throw error;
    }
  }

  /**
   * Atualiza a frequência de notificações
   * @param userId ID do usuário
   * @param frequency Frequência de notificações
   */
  async updateFrequency(
    userId: string,
    frequency: NotificationSettings['frequency']
  ): Promise<void> {
    try {
      const settingsRef = doc(db, this.collection, userId);
      await updateDoc(settingsRef, {
        frequency,
        updatedAt: new Date().toISOString(),
      });

      loggingService.info('Frequência de notificações atualizada', {
        userId,
        frequency,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar frequência de notificações', {
        userId,
        frequency,
        error,
      });
      throw error;
    }
  }

  /**
   * Verifica se um usuário deve receber notificações com base em suas configurações
   * @param userId ID do usuário
   * @param notificationType Tipo de notificação a ser verificado
   * @returns true se o usuário deve receber a notificação, false caso contrário
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: keyof NotificationSettings['types']
  ): Promise<boolean> {
    try {
      const settings = await this.getUserSettings(userId);
      if (!settings) {
        // Se não houver configurações, criar padrão e retornar true
        await this.createDefaultSettings(userId);
        return true;
      }

      // Verificar se as notificações estão habilitadas globalmente
      if (!settings.enabled) {
        return false;
      }

      // Verificar se o tipo específico está habilitado
      if (!settings.types[notificationType]) {
        return false;
      }

      // Verificar modo silencioso
      if (settings.quietHours.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

        const start = settings.quietHours.start;
        const end = settings.quietHours.end;

        // Verificar se o horário atual está dentro do período silencioso
        if (this.isTimeInRange(currentTime, start, end)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      loggingService.error('Erro ao verificar se deve receber notificação', {
        userId,
        notificationType,
        error,
      });
      // Em caso de erro, permitir a notificação por segurança
      return true;
    }
  }

  /**
   * Verifica se um horário está dentro de um intervalo
   * @param time Horário a ser verificado (formato HH:mm)
   * @param start Início do intervalo (formato HH:mm)
   * @param end Fim do intervalo (formato HH:mm)
   * @returns true se o horário estiver dentro do intervalo, false caso contrário
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    // Converter para minutos desde meia-noite para facilitar comparação
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    // Lidar com intervalos que cruzam a meia-noite
    if (startMinutes > endMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    } else {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }
  }

  /**
   * Converte um horário no formato HH:mm para minutos desde meia-noite
   * @param time Horário no formato HH:mm
   * @returns Minutos desde meia-noite
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
