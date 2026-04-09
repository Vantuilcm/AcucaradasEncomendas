import { f } from '../config/firebase';
import { db as firestore } from '../config/firebase';
const { collection, getDocs, doc, getDoc } = f;
import { NotificationSettingsServiceWithCache } from '../services/NotificationSettingsServiceWithCache';
import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { loggingService } from '../services/LoggingService';

/**
 * Utilitário para migrar as configurações de notificação da versão 1 para a versão 2
 */
export class NotificationSettingsMigration {
  private static instance: NotificationSettingsMigration;
  private oldService: NotificationSettingsServiceWithCache;
  private newService: NotificationSettingsServiceWithCacheV2;

  private constructor() {
    this.oldService = NotificationSettingsServiceWithCache.getInstance();
    this.newService = NotificationSettingsServiceWithCacheV2.getInstance();
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
      loggingService.info(
        `Iniciando migração das configurações de notificação para o usuário ${userId}`
      );

      // Obter configurações antigas
      const oldSettings = await this.oldService.getUserSettings(userId);

      if (!oldSettings) {
        loggingService.warn(
          `Nenhuma configuração antiga encontrada para o usuário ${userId}`
        );
        return false;
      }

      // Obter configurações novas (para garantir que o documento exista)
      await this.newService.getUserSettings(userId);

      // Mapear configurações antigas para o formato novo
      const newSettings = {
        userId,
        enabled: oldSettings.enabled,
        types: {
          orderStatus: oldSettings.types?.orderStatus ?? true,
          promotions: oldSettings.types?.promotions ?? true,
          news: oldSettings.types?.news ?? true,
          deliveryUpdates: oldSettings.types?.deliveryUpdates ?? true,
          paymentUpdates: oldSettings.types?.paymentUpdates ?? true,
        },
        quietHours: {
          enabled: oldSettings.quietHours?.enabled ?? false,
          start: oldSettings.quietHours?.start ?? '22:00',
          end: oldSettings.quietHours?.end ?? '06:00',
        },
        frequency: oldSettings.frequency || 'immediate',
      };

      // Atualizar configurações na versão 2
      await this.newService.updateSettings(userId, newSettings as any);

      loggingService.info(`Migração concluída com sucesso para o usuário ${userId}`);
      return true;
    } catch (error) {
      loggingService.error('Erro ao migrar configurações de notificação', error as Error);
      return false;
    }
  }

  /**
   * Migra as configurações de notificação de todos os usuários
   * @returns Promise que resolve para um objeto com contadores de sucesso e falha
   */
  public async migrateAllUsers(): Promise<{ success: number; failed: number }> {
    try {
      loggingService.info(
        'Iniciando migração de configurações de notificação para todos os usuários'
      );

      // Obter todos os documentos da coleção antiga
      const collectionRef = collection(firestore, 'notificationSettings');
      const snapshot = await getDocs(collectionRef);

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

      loggingService.info(
        `Migração concluída. Sucesso: ${successCount}, Falhas: ${failedCount}`
      );
      return { success: successCount, failed: failedCount };
    } catch (error) {
      loggingService.error('Erro ao migrar configurações de todos os usuários', error as Error);
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
      const docRef = doc(firestore, 'notificationSettingsV2', userId);
      const docSnap = await getDoc(docRef);

      return docSnap.exists();
    } catch (error) {
      loggingService.error('Erro ao verificar migração de configurações', error as Error);
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

      loggingService.info(
        `Cache de configurações de notificação limpo para o usuário ${userId}`
      );
    } catch (error) {
      loggingService.error('Erro ao limpar cache de configurações', error as Error);
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
