import { firestore } from '../firebase/config';
import { NotificationSettingsServiceWithCache } from '../services/NotificationSettingsServiceWithCache';
import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { loggingService } from '../services/loggingService';
import { EnhancedCacheManager } from './EnhancedCacheManager';

/**
 * Utilitário para migrar as configurações de notificação da versão 1 para a versão 2
 */
export class NotificationSettingsMigration {
  private static instance: NotificationSettingsMigration;
  private oldService: NotificationSettingsServiceWithCache;
  private newService: NotificationSettingsServiceWithCacheV2;
  private cacheManager: EnhancedCacheManager;

  private constructor() {
    this.oldService = NotificationSettingsServiceWithCache.getInstance();
    this.newService = NotificationSettingsServiceWithCacheV2.getInstance();
    this.cacheManager = EnhancedCacheManager.getInstance();
  }

  /**
   * Obtém a instância singleton da classe de migração
   */
  public static getInstance(): NotificationSettingsMigration {
    if (!NotificationSettingsMigration.instance) {
      NotificationSettingsMigration.instance = new NotificationSettingsMigration();
    }
    return NotificationSettingsMigration.instance;
  }

  /**
   * Migra as configurações de notificação de um usuário específico
   * @param userId ID do usuário
   * @returns Promise que resolve para true se a migração foi bem-sucedida
   */
  public async migrateUserSettings(userId: string): Promise<boolean> {
    try {
      loggingService.logInfo(
        `Iniciando migração das configurações de notificação para o usuário ${userId}`
      );

      // Obter configurações antigas
      const oldSettings = await this.oldService.getUserSettings(userId);

      if (!oldSettings) {
        loggingService.logWarning(
          `Nenhuma configuração antiga encontrada para o usuário ${userId}`
        );
        return false;
      }

      // Obter configurações novas (para garantir que o documento exista)
      await this.newService.getUserSettings(userId);

      // Mapear configurações antigas para o formato novo
      const newSettings = {
        userId,
        allNotificationsEnabled: oldSettings.allNotificationsEnabled,
        notificationTypes: {
          news: oldSettings.notificationTypes?.news ?? true,
          delivery: oldSettings.notificationTypes?.delivery ?? true,
          payment: oldSettings.notificationTypes?.payment ?? true,
        },
        quietHours: {
          enabled: oldSettings.quietHours?.enabled ?? false,
          startTime: oldSettings.quietHours?.startTime ?? '22:00',
          endTime: oldSettings.quietHours?.endTime ?? '06:00',
        },
        frequency: oldSettings.frequency || 'immediate',
      };

      // Atualizar configurações na versão 2
      await this.newService.updateSettings(userId, newSettings);

      loggingService.logInfo(`Migração concluída com sucesso para o usuário ${userId}`);
      return true;
    } catch (error) {
      loggingService.error('Erro ao migrar configurações de notificação', error);
      return false;
    }
  }

  /**
   * Migra as configurações de notificação de todos os usuários
   * @returns Promise que resolve para um objeto com contadores de sucesso e falha
   */
  public async migrateAllUsers(): Promise<{ success: number; failed: number }> {
    try {
      loggingService.logInfo(
        'Iniciando migração de configurações de notificação para todos os usuários'
      );

      // Obter todos os documentos da coleção antiga
      const snapshot = await firestore.collection('notificationSettings').get();

      let successCount = 0;
      let failedCount = 0;

      // Processar cada documento
      for (const doc of snapshot.docs) {
        const userId = doc.id;
        const success = await this.migrateUserSettings(userId);

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      loggingService.logInfo(
        `Migração concluída. Sucesso: ${successCount}, Falhas: ${failedCount}`
      );
      return { success: successCount, failed: failedCount };
    } catch (error) {
      loggingService.error('Erro ao migrar configurações de todos os usuários', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Verifica se as configurações de um usuário já foram migradas
   * @param userId ID do usuário
   * @returns Promise que resolve para true se as configurações já foram migradas
   */
  public async checkIfMigrated(userId: string): Promise<boolean> {
    try {
      // Verificar se existe um documento na coleção nova para o usuário
      const docRef = firestore.collection('notificationSettingsV2').doc(userId);
      const doc = await docRef.get();

      return doc.exists;
    } catch (error) {
      loggingService.error('Erro ao verificar migração de configurações', error);
      return false;
    }
  }

  /**
   * Limpa o cache de configurações de notificação para um usuário específico
   * @param userId ID do usuário
   */
  public async clearCache(userId: string): Promise<void> {
    try {
      // Limpar cache da versão antiga
      await this.oldService.clearCache(userId);

      // Limpar cache da versão nova
      await this.newService.clearCache(userId);

      loggingService.logInfo(
        `Cache de configurações de notificação limpo para o usuário ${userId}`
      );
    } catch (error) {
      loggingService.error('Erro ao limpar cache de configurações', error);
    }
  }
}

/**
 * Hook para facilitar o uso da migração de configurações de notificação em componentes React
 */
export const useNotificationSettingsMigration = () => {
  const migrationService = NotificationSettingsMigration.getInstance();

  return {
    /**
     * Migra as configurações de notificação de um usuário específico
     * @param userId ID do usuário
     * @returns Promise que resolve para true se a migração foi bem-sucedida
     */
    migrateUserSettings: async (userId: string): Promise<boolean> => {
      return await migrationService.migrateUserSettings(userId);
    },

    /**
     * Migra as configurações de notificação de todos os usuários
     * @returns Promise que resolve para um objeto com contadores de sucesso e falha
     */
    migrateAllUsers: async (): Promise<{ success: number; failed: number }> => {
      return await migrationService.migrateAllUsers();
    },

    /**
     * Verifica se as configurações de um usuário já foram migradas
     * @param userId ID do usuário
     * @returns Promise que resolve para true se as configurações já foram migradas
     */
    checkIfMigrated: async (userId: string): Promise<boolean> => {
      return await migrationService.checkIfMigrated(userId);
    },

    /**
     * Limpa o cache de configurações de notificação para um usuário específico
     * @param userId ID do usuário
     */
    clearCache: async (userId: string): Promise<void> => {
      await migrationService.clearCache(userId);
    },
  };
};
