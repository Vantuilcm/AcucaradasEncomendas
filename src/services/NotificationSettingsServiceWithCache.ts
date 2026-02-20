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
import { CacheManager } from '../utils/cache';

/**
 * Serviço para gerenciar configurações de notificação com suporte a cache local
 * Implementa o padrão Singleton para garantir uma única instância em toda a aplicação
 */
export class NotificationSettingsServiceWithCache {
  private static instance: NotificationSettingsServiceWithCache;
  private readonly collection = 'notification_settings';
  private readonly cacheKeyPrefix = 'notification_settings_';
  private readonly cacheExpirationMinutes = 60; // 1 hora de cache

  /**
   * Construtor privado para implementar o padrão Singleton
   */
  private constructor() {}

  /**
   * Obtém a instância única do serviço
   */
  public static getInstance(): NotificationSettingsServiceWithCache {
    if (!NotificationSettingsServiceWithCache.instance) {
      NotificationSettingsServiceWithCache.instance = new NotificationSettingsServiceWithCache();
    }
    return NotificationSettingsServiceWithCache.instance;
  }

  /**
   * Gera a chave de cache para um usuário específico
   * @param userId ID do usuário
   * @returns Chave de cache
   */
  private getCacheKey(userId: string): string {
    return `${this.cacheKeyPrefix}${userId}`;
  }

  /**
   * Obtém as configurações de notificação de um usuário
   * Primeiro verifica no cache local, se não encontrar ou estiver expirado, busca no Firestore
   * @param userId ID do usuário
   * @returns Configurações de notificação ou null se não existirem
   */
  async getUserSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      // Tentar obter do cache primeiro
      const cacheKey = this.getCacheKey(userId);
      const cachedSettings = await CacheManager.getData(cacheKey);

      if (cachedSettings) {
        loggingService.info('Configurações de notificação obtidas do cache', {
          userId,
        });
        return cachedSettings as NotificationSettings;
      }

      // Se não estiver no cache, buscar do Firestore
      const settingsRef = doc(db, this.collection, userId);
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return null;
      }

      const settings = {
        id: settingsDoc.id,
        ...settingsDoc.data(),
      } as NotificationSettings;

      // Armazenar no cache para futuras consultas
      await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('Configurações de notificação obtidas do Firestore', {
        userId,
      });

      return settings;
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

      const settings = {
        id: userId,
        ...defaultSettings,
      };

      // Armazenar no cache
      const cacheKey = this.getCacheKey(userId);
      await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('Configurações de notificação padrão criadas', {
        userId,
      });

      return settings;
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
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(settingsRef, updatedData);

      // Atualizar o cache
      const currentSettings = await this.getUserSettings(userId);
      if (currentSettings) {
        const updatedSettings = {
          ...currentSettings,
          ...updatedData,
        };

        const cacheKey = this.getCacheKey(userId);
        await CacheManager.setData(cacheKey, updatedSettings, this.cacheExpirationMinutes);
      }

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
      const newValue = !settings.types[type];

      await updateDoc(settingsRef, {
        [`types.${type}`]: newValue,
        updatedAt: new Date().toISOString(),
      });

      // Atualizar o cache
      settings.types[type] = newValue;
      settings.updatedAt = new Date().toISOString();

      const cacheKey = this.getCacheKey(userId);
      await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('Tipo de notificação alternado', {
        userId,
        type,
        newValue,
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

      // Atualizar o cache
      const settings = await this.getUserSettings(userId);
      if (settings) {
        settings.quietHours.enabled = enabled;
        settings.updatedAt = new Date().toISOString();

        const cacheKey = this.getCacheKey(userId);
        await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
      }

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

      // Atualizar o cache
      const settings = await this.getUserSettings(userId);
      if (settings) {
        settings.quietHours.start = start;
        settings.quietHours.end = end;
        settings.updatedAt = new Date().toISOString();

        const cacheKey = this.getCacheKey(userId);
        await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
      }

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

      // Atualizar o cache
      const settings = await this.getUserSettings(userId);
      if (settings) {
        settings.frequency = frequency;
        settings.updatedAt = new Date().toISOString();

        const cacheKey = this.getCacheKey(userId);
        await CacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
      }

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
   * Limpa o cache de configurações de notificação para um usuário específico
   * @param userId ID do usuário
   */
  async clearCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      await CacheManager.setData(cacheKey, null, 0); // Expirar imediatamente
      loggingService.info('Cache de configurações de notificação limpo', { userId });
    } catch (error) {
      loggingService.error(
        'Erro ao limpar cache de configurações',
        error instanceof Error ? error : undefined,
        { userId }
      );
    }
  }

  /**
   * Verifica se um usuário deve receber notificações com base em suas configurações
   * Utiliza cache para melhorar o desempenho
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

// Exporta a instância única do serviço
export const notificationSettingsServiceWithCache =
  NotificationSettingsServiceWithCache.getInstance();
