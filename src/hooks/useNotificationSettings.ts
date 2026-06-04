import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getAuth } from '../config/firebase';
import { UserUtils } from '../utils/UserUtils';
import { notificationSettingsServiceWithCache } from '../services/NotificationSettingsServiceWithCache';
import { NotificationSettings } from '../types/NotificationSettings';
import { loggingService } from '../services/LoggingService';

/** TEMPORÁRIO — diagnóstico Sprint 02 Preferências (remover após confirmar causa raiz) */
const notificationSettingsPath = (uid: string) => `notification_settings/${uid}`;

function showPrefsLoadDebugAlert(details: {
  userId?: string;
  userDotId?: string;
  userDotUid?: string;
  authUid?: string | null;
  path: string;
  code?: string;
  message?: string;
  phase?: string;
}) {
  const body = [
    `UID (UserUtils): ${details.userId ?? '(vazio)'}`,
    `user.id: ${details.userDotId ?? '(vazio)'}`,
    `user.uid: ${details.userDotUid ?? '(vazio)'}`,
    `auth.uid: ${details.authUid ?? '(vazio)'}`,
    '',
    `PATH: ${details.path}`,
    details.phase ? `FASE: ${details.phase}` : '',
    `CODE: ${details.code ?? '(n/a)'}`,
    `MESSAGE: ${details.message ?? '(n/a)'}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  console.warn('[PREFS_LOAD_DEBUG]', details);
  Alert.alert('ALERT DEBUG — Preferências', body);
}

/**
 * Interface para o retorno do hook useNotificationSettings
 */
interface UseNotificationSettingsReturn {
  /** Configurações de notificação do usuário */
  settings: NotificationSettings | null;
  /** Estado de carregamento */
  isLoading: boolean;
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
}

/**
 * Hook para gerenciar configurações de notificação
 * Utiliza o serviço com cache para melhor desempenho
 */
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  /**
   * Carrega as configurações de notificação do usuário
   */
  const loadSettings = useCallback(async () => {
    const userId = UserUtils.getUserId(user);
    const authUid = getAuth().currentUser?.uid ?? null;
    const path = userId ? notificationSettingsPath(userId) : 'notification_settings/(sem uid)';

    if (!userId) {
      showPrefsLoadDebugAlert({
        userId,
        userDotId: (user as { id?: string })?.id,
        userDotUid: (user as { uid?: string })?.uid,
        authUid,
        path,
        code: 'NO_USER_ID',
        message: 'UserUtils.getUserId(user) retornou vazio',
        phase: 'antes do Firestore',
      });
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let userSettings = await notificationSettingsServiceWithCache.getUserSettings(userId);

      // Se não existirem configurações, criar padrão
      if (!userSettings) {
        userSettings = await notificationSettingsServiceWithCache.createDefaultSettings(userId);
      }

      setSettings(userSettings);
    } catch (err) {
      const firebaseErr = err as { code?: string; message?: string };
      const error =
        err instanceof Error ? err : new Error('Erro ao carregar configurações de notificação');
      setError(error);
      loggingService.error('Erro ao carregar configurações de notificação', {
        userId,
        path,
        code: firebaseErr?.code,
        message: firebaseErr?.message,
        error,
      });
      showPrefsLoadDebugAlert({
        userId,
        userDotId: (user as { id?: string })?.id,
        userDotUid: (user as { uid?: string })?.uid,
        authUid,
        path,
        code: firebaseErr?.code ?? (error as { code?: string }).code,
        message: firebaseErr?.message ?? error.message,
        phase: 'getUserSettings ou createDefaultSettings',
      });
      Alert.alert('Erro', 'Não foi possível carregar suas configurações de notificação');
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
        setIsLoading(true);
        setError(null);

        await notificationSettingsServiceWithCache.updateSettings(user.id, updates);
        await loadSettings(); // Recarregar configurações atualizadas
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar configurações de notificação');
        setError(error);
        loggingService.error('Erro ao atualizar configurações de notificação', error);
        Alert.alert('Erro', 'Não foi possível atualizar suas configurações de notificação');
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadSettings]
  );

  /**
   * Alterna um tipo específico de notificação
   */
  const toggleNotificationType = useCallback(
    async (type: keyof NotificationSettings['types']) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        await notificationSettingsServiceWithCache.toggleNotificationType(user.id, type);
        await loadSettings(); // Recarregar configurações atualizadas
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao alternar tipo de notificação');
        setError(error);
        loggingService.error('Erro ao alternar tipo de notificação', error);
        Alert.alert('Erro', 'Não foi possível alternar o tipo de notificação');
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadSettings]
  );

  /**
   * Alterna o modo silencioso
   */
  const toggleQuietHours = useCallback(
    async (enabled: boolean) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        await notificationSettingsServiceWithCache.toggleQuietHours(user.id, enabled);
        await loadSettings(); // Recarregar configurações atualizadas
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao alternar modo silencioso');
        setError(error);
        loggingService.error('Erro ao alternar modo silencioso', error);
        Alert.alert('Erro', 'Não foi possível alternar o modo silencioso');
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadSettings]
  );

  /**
   * Atualiza o horário do modo silencioso
   */
  const updateQuietHoursTime = useCallback(
    async (start: string, end: string) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        await notificationSettingsServiceWithCache.updateQuietHoursTime(user.id, start, end);
        await loadSettings(); // Recarregar configurações atualizadas
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar horário do modo silencioso');
        setError(error);
        loggingService.error('Erro ao atualizar horário do modo silencioso', error);
        Alert.alert('Erro', 'Não foi possível atualizar o horário do modo silencioso');
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadSettings]
  );

  /**
   * Atualiza a frequência de notificações
   */
  const updateFrequency = useCallback(
    async (frequency: NotificationSettings['frequency']) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        await notificationSettingsServiceWithCache.updateFrequency(user.id, frequency);
        await loadSettings(); // Recarregar configurações atualizadas
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Erro ao atualizar frequência de notificações');
        setError(error);
        loggingService.error('Erro ao atualizar frequência de notificações', error);
        Alert.alert('Erro', 'Não foi possível atualizar a frequência de notificações');
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadSettings]
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
      await notificationSettingsServiceWithCache.clearCache(user.id);
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
    error,
    updateSettings,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHoursTime,
    updateFrequency,
    refreshSettings,
  };
}
