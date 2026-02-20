import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { notificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';
import { NotificationSettings } from '../types/NotificationSettings';
import { loggingService } from '../services/LoggingService';

/**
 * Interface para o retorno do hook useNotificationSettingsV2
 */
interface UseNotificationSettingsReturn {
  /** Configurações de notificação do usuário */
  settings: NotificationSettings | null;
  /** Estado de carregamento */
  isLoading: boolean;
  /** Estado de atualização em andamento */
  isUpdating: boolean;
  /** Erro durante operações */
  error: Error | null;
  /** Função para atualizar as configurações */
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  /** Função para alternar um tipo específico de notificação */
  toggleNotificationType: (type: keyof NotificationSettings['types']) => Promise<void>;
  /** Função para alternar o modo silencioso */
  toggleQuietHours: (enabled: boolean) => Promise<void>;
  /** Função para atualizar o horário do modo silencioso */
  updateQuietHoursTime: (start: string, end: string) => Promise<void>;
  /** Função para atualizar a frequência de notificações */
  updateFrequency: (frequency: NotificationSettings['frequency']) => Promise<void>;
  /** Função para recarregar as configurações */
  refreshSettings: () => Promise<void>;
  /** Função para alternar todas as notificações */
  toggleAllNotifications: (enabled: boolean) => Promise<void>;
}

/**
 * Hook aprimorado para gerenciar configurações de notificação
 * Utiliza o serviço com cache otimizado para melhor desempenho
 */
export function useNotificationSettingsV2(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  /**
   * Carrega as configurações de notificação do usuário
   */
  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let userSettings = await notificationSettingsServiceWithCacheV2.getUserSettings(user.id);

      // Se não existirem configurações, criar padrão
      if (!userSettings) {
        userSettings = await notificationSettingsServiceWithCacheV2.createDefaultSettings(user.id);
      }

      setSettings(userSettings);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao carregar configurações de notificação');
      setError(error);
      loggingService.error('Erro ao carregar configurações de notificação', error);
      
      let message = 'Não foi possível carregar suas configurações de notificação';
      if (error.message.includes('index')) {
        message = 'Erro de índice no Firestore. Por favor, verifique os logs do console para o link de criação do índice.';
      }
      
      Alert.alert('Erro de Sincronização', message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Atualiza as configurações de notificação
   */
  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!user) return;

      try {
        setIsUpdating(true);
        setError(null);

        await notificationSettingsServiceWithCacheV2.updateSettings(user.id, updates);

        // Atualização otimista da UI
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        });

        // Recarregar configurações do servidor para garantir sincronização
        await loadSettings();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar configurações de notificação');
        setError(error);
        loggingService.error('Erro ao atualizar configurações de notificação', error);
        Alert.alert('Erro', 'Não foi possível atualizar suas configurações de notificação');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, loadSettings]
  );

  /**
   * Alterna um tipo específico de notificação
   */
  const toggleNotificationType = useCallback(
    async (type: keyof NotificationSettings['types']) => {
      if (!user || !settings) return;

      try {
        setIsUpdating(true);
        setError(null);

        // Atualização otimista da UI
        const newValue = !settings.types[type];
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            types: {
              ...prevSettings.types,
              [type]: newValue,
            },
            updatedAt: new Date().toISOString(),
          };
        });

        await notificationSettingsServiceWithCacheV2.toggleNotificationType(user.id, type);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao alternar tipo de notificação');
        setError(error);
        loggingService.error('Erro ao alternar tipo de notificação', error);
        Alert.alert('Erro', 'Não foi possível alternar o tipo de notificação');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, settings, loadSettings]
  );

  /**
   * Alterna o modo silencioso
   */
  const toggleQuietHours = useCallback(
    async (enabled: boolean) => {
      if (!user || !settings) return;

      try {
        setIsUpdating(true);
        setError(null);

        // Atualização otimista da UI
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            quietHours: {
              ...prevSettings.quietHours,
              enabled,
            },
            updatedAt: new Date().toISOString(),
          };
        });

        await notificationSettingsServiceWithCacheV2.toggleQuietHours(user.id, enabled);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao alternar modo silencioso');
        setError(error);
        loggingService.error('Erro ao alternar modo silencioso', err instanceof Error ? err : { error: String(err) });
        Alert.alert('Erro', 'Não foi possível alternar o modo silencioso');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, settings, loadSettings]
  );

  /**
   * Atualiza o horário do modo silencioso
   */
  const updateQuietHoursTime = useCallback(
    async (start: string, end: string) => {
      if (!user || !settings) return;

      try {
        setIsUpdating(true);
        setError(null);

        // Validar formato de hora (HH:mm)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          throw new Error('Formato de hora inválido. Use o formato HH:mm');
        }

        // Atualização otimista da UI
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            quietHours: {
              ...prevSettings.quietHours,
              start,
              end,
            },
            updatedAt: new Date().toISOString(),
          };
        });

        await notificationSettingsServiceWithCacheV2.updateQuietHoursTime(user.id, start, end);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar horário do modo silencioso');
        setError(error);
        loggingService.error('Erro ao atualizar horário do modo silencioso', err instanceof Error ? err : { error: String(err) });
        Alert.alert('Erro', 'Não foi possível atualizar o horário do modo silencioso');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, settings, loadSettings]
  );

  /**
   * Atualiza a frequência de notificações
   */
  const updateFrequency = useCallback(
    async (frequency: NotificationSettings['frequency']) => {
      if (!user || !settings) return;

      try {
        setIsUpdating(true);
        setError(null);

        // Atualização otimista da UI
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            frequency,
            updatedAt: new Date().toISOString(),
          };
        });

        await notificationSettingsServiceWithCacheV2.updateFrequency(user.id, frequency);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar frequência de notificações');
        setError(error);
        loggingService.error('Erro ao atualizar frequência de notificações', err instanceof Error ? err : { error: String(err) });
        Alert.alert('Erro', 'Não foi possível atualizar a frequência de notificações');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, settings, loadSettings]
  );

  /**
   * Alterna todas as notificações (habilita/desabilita globalmente)
   */
  const toggleAllNotifications = useCallback(
    async (enabled: boolean) => {
      if (!user || !settings) return;

      try {
        setIsUpdating(true);
        setError(null);

        // Atualização otimista da UI
        setSettings(prevSettings => {
          if (!prevSettings) return null;
          return {
            ...prevSettings,
            enabled,
            updatedAt: new Date().toISOString(),
          };
        });

        await notificationSettingsServiceWithCacheV2.updateSettings(user.id, { enabled });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao alternar notificações');
        setError(error);
        loggingService.error('Erro ao alternar notificações', error);
        Alert.alert('Erro', 'Não foi possível alternar as notificações');

        // Recarregar configurações em caso de erro para restaurar estado correto
        await loadSettings();
      } finally {
        setIsUpdating(false);
      }
    },
    [user, settings, loadSettings]
  );

  /**
   * Recarrega as configurações de notificação
   * Útil quando é necessário forçar uma atualização dos dados
   */
  const refreshSettings = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Limpar o cache para forçar uma nova consulta ao Firestore
      await notificationSettingsServiceWithCacheV2.clearCache(user.id);
      await loadSettings();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Erro ao recarregar configurações de notificação');
      setError(error);
      loggingService.error('Erro ao recarregar configurações de notificação', error);
      Alert.alert('Erro', 'Não foi possível recarregar suas configurações de notificação');
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSettings]);

  // Carregar configurações quando o usuário mudar
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isUpdating,
    error,
    updateSettings,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHoursTime,
    updateFrequency,
    refreshSettings,
    toggleAllNotifications,
  };
}
