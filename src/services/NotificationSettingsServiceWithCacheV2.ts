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
const LoggingServiceModule = require('./LoggingService');
const loggingService = LoggingServiceModule.loggingService || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
import { EnhancedCacheManager } from '../utils/EnhancedCacheManager';

/**
 * ServiÃ§o aprimorado para gerenciar configuraÃ§Ãµes de notificaÃ§Ã£o com suporte a cache otimizado
 * Implementa o padrÃ£o Singleton para garantir uma Ãºnica instÃ¢ncia em toda a aplicaÃ§Ã£o
 */
export class NotificationSettingsServiceWithCacheV2 {
  private static instance: NotificationSettingsServiceWithCacheV2;
  private readonly collection = 'notification_settings';
  private readonly cacheKeyPrefix = 'notification_settings_v2_';
  private readonly cacheExpirationMinutes = 60; // 1 hora de cache

  /**
   * Construtor privado para implementar o padrÃ£o Singleton
   */
  private constructor() {}

  /**
   * ObtÃ©m a instÃ¢ncia Ãºnica do serviÃ§o
   */
  public static getInstance(): NotificationSettingsServiceWithCacheV2 {
    if (!NotificationSettingsServiceWithCacheV2.instance) {
      NotificationSettingsServiceWithCacheV2.instance =
        new NotificationSettingsServiceWithCacheV2();
    }
    return NotificationSettingsServiceWithCacheV2.instance;
  }

  /**
   * Gera a chave de cache para um usuÃ¡rio especÃ­fico
   * @param userId ID do usuÃ¡rio
   * @returns Chave de cache
   */
  private getCacheKey(userId: string): string {
    return `${this.cacheKeyPrefix}${userId}`;
  }

  /**
   * ObtÃ©m as configuraÃ§Ãµes de notificaÃ§Ã£o de um usuÃ¡rio
   * Primeiro verifica no cache local, se nÃ£o encontrar ou estiver expirado, busca no Firestore
   * @param userId ID do usuÃ¡rio
   * @returns ConfiguraÃ§Ãµes de notificaÃ§Ã£o ou null se nÃ£o existirem
   */
  async getUserSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      // Tentar obter do cache primeiro
      const cacheKey = this.getCacheKey(userId);
      const cachedSettings = await EnhancedCacheManager.getData<NotificationSettings>(cacheKey);

      if (cachedSettings) {
        loggingService.info('ConfiguraÃ§Ãµes de notificaÃ§Ã£o obtidas do cache', {
          userId,
          source: 'cache',
        });
        return cachedSettings;
      }

      // Se nÃ£o estiver no cache, buscar do Firestore
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
      await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('ConfiguraÃ§Ãµes de notificaÃ§Ã£o obtidas do Firestore', {
        userId,
        source: 'firestore',
      });

      return settings;
    } catch (error) {
      loggingService.error('Erro ao buscar configuraÃ§Ãµes de notificaÃ§Ã£o', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Cria configuraÃ§Ãµes de notificaÃ§Ã£o padrÃ£o para um usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @returns ConfiguraÃ§Ãµes de notificaÃ§Ã£o criadas
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
      await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('ConfiguraÃ§Ãµes de notificaÃ§Ã£o padrÃ£o criadas', {
        userId,
      });

      return settings;
    } catch (error) {
      loggingService.error('Erro ao criar configuraÃ§Ãµes de notificaÃ§Ã£o padrÃ£o', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Atualiza as configuraÃ§Ãµes de notificaÃ§Ã£o de um usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param updates AtualizaÃ§Ãµes a serem aplicadas
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
        await EnhancedCacheManager.setData(cacheKey, updatedSettings, this.cacheExpirationMinutes);
      }

      loggingService.info('ConfiguraÃ§Ãµes de notificaÃ§Ã£o atualizadas', {
        userId,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar configuraÃ§Ãµes de notificaÃ§Ã£o', {
        userId,
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * Alterna um tipo especÃ­fico de notificaÃ§Ã£o
   * @param userId ID do usuÃ¡rio
   * @param type Tipo de notificaÃ§Ã£o a ser alternado
   */
  async toggleNotificationType(
    userId: string,
    type: keyof NotificationSettings['types']
  ): Promise<void> {
    try {
      const settings = await this.getUserSettings(userId);
      if (!settings) {
        throw new Error('ConfiguraÃ§Ãµes de notificaÃ§Ã£o nÃ£o encontradas');
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
      await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);

      loggingService.info('Tipo de notificaÃ§Ã£o alternado', {
        userId,
        type,
        newValue,
      });
    } catch (error) {
      loggingService.error('Erro ao alternar tipo de notificaÃ§Ã£o', {
        userId,
        type,
        error,
      });
      throw error;
    }
  }

  /**
   * Alterna o modo silencioso
   * @param userId ID do usuÃ¡rio
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
        await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
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
   * Atualiza o horÃ¡rio do modo silencioso
   * @param userId ID do usuÃ¡rio
   * @param start HorÃ¡rio de inÃ­cio (formato HH:mm)
   * @param end HorÃ¡rio de tÃ©rmino (formato HH:mm)
   */
  async updateQuietHoursTime(userId: string, start: string, end: string): Promise<void> {
    try {
      // Validar formato de hora (HH:mm)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        throw new Error('Formato de hora invÃ¡lido. Use o formato HH:mm');
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
        await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
      }

      loggingService.info('HorÃ¡rio do modo silencioso atualizado', {
        userId,
        start,
        end,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar horÃ¡rio do modo silencioso', {
        userId,
        start,
        end,
        error,
      });
      throw error;
    }
  }

  /**
   * Atualiza a frequÃªncia de notificaÃ§Ãµes
   * @param userId ID do usuÃ¡rio
   * @param frequency FrequÃªncia de notificaÃ§Ãµes
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
        await EnhancedCacheManager.setData(cacheKey, settings, this.cacheExpirationMinutes);
      }

      loggingService.info('FrequÃªncia de notificaÃ§Ãµes atualizada', {
        userId,
        frequency,
      });
    } catch (error) {
      loggingService.error('Erro ao atualizar frequÃªncia de notificaÃ§Ãµes', {
        userId,
        frequency,
        error,
      });
      throw error;
    }
  }

  /**
   * Limpa o cache de configuraÃ§Ãµes de notificaÃ§Ã£o para um usuÃ¡rio especÃ­fico
   * @param userId ID do usuÃ¡rio
   */
  async clearCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId);
      await EnhancedCacheManager.removeData(cacheKey);
      loggingService.info('Cache de configuraÃ§Ãµes de notificaÃ§Ã£o limpo', { userId });
    } catch (error) {
      loggingService.error(
        'Erro ao limpar cache de configuraÃ§Ãµes',
        error instanceof Error ? error : undefined,
        { userId }
      );
    }
  }

  /**
   * Verifica se um usuÃ¡rio deve receber notificaÃ§Ãµes com base em suas configuraÃ§Ãµes
   * Utiliza cache para melhorar o desempenho
   * @param userId ID do usuÃ¡rio
   * @param notificationType Tipo de notificaÃ§Ã£o a ser verificado
   * @returns true se o usuÃ¡rio deve receber a notificaÃ§Ã£o, false caso contrÃ¡rio
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: keyof NotificationSettings['types']
  ): Promise<boolean> {
    try {
      const settings = await this.getUserSettings(userId);
      if (!settings) {
        // Se nÃ£o houver configuraÃ§Ãµes, criar padrÃ£o e retornar true
        await this.createDefaultSettings(userId);
        return true;
      }

      // Verificar se as notificaÃ§Ãµes estÃ£o habilitadas globalmente
      if (!settings.enabled) {
        return false;
      }

      // Verificar se o tipo especÃ­fico estÃ¡ habilitado
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

        // Verificar se o horÃ¡rio atual estÃ¡ dentro do perÃ­odo silencioso
        if (this.isTimeInRange(currentTime, start, end)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      loggingService.error('Erro ao verificar se deve receber notificaÃ§Ã£o', {
        userId,
        notificationType,
        error,
      });
      // Em caso de erro, permitir a notificaÃ§Ã£o por seguranÃ§a
      return true;
    }
  }

  /**
   * Verifica se um horÃ¡rio estÃ¡ dentro de um intervalo
   * @param time HorÃ¡rio a ser verificado (formato HH:mm)
   * @param start InÃ­cio do intervalo (formato HH:mm)
   * @param end Fim do intervalo (formato HH:mm)
   * @returns true se o horÃ¡rio estiver dentro do intervalo, false caso contrÃ¡rio
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    // Converter para minutos desde meia-noite para facilitar comparaÃ§Ã£o
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
   * Converte um horÃ¡rio no formato HH:mm para minutos desde meia-noite
   * @param time HorÃ¡rio no formato HH:mm
   * @returns Minutos desde meia-noite
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

// Exporta a instÃ¢ncia Ãºnica do serviÃ§o
export const notificationSettingsServiceWithCacheV2 =
  NotificationSettingsServiceWithCacheV2.getInstance();


