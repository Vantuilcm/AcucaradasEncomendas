import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { loggingService } from '../services/LoggingService';

interface HapticsHandlers {
  lightImpact: () => Promise<void>;
  mediumImpact: () => Promise<void>;
  heavyImpact: () => Promise<void>;
  softImpact: () => Promise<void>;
  rigidImpact: () => Promise<void>;
  success: () => Promise<void>;
  warning: () => Promise<void>;
  error: () => Promise<void>;
  selection: () => Promise<void>;
  notification: () => Promise<void>;
}

export function useHaptics(): HapticsHandlers {
  const lightImpact = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loggingService.debug('Feedback tátil leve executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil leve', { error: err });
    }
  }, []);

  const mediumImpact = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      loggingService.debug('Feedback tátil médio executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil médio', { error: err });
    }
  }, []);

  const heavyImpact = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      loggingService.debug('Feedback tátil forte executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil forte', { error: err });
    }
  }, []);

  const softImpact = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      loggingService.debug('Feedback tátil suave executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil suave', { error: err });
    }
  }, []);

  const rigidImpact = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      loggingService.debug('Feedback tátil rígido executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil rígido', { error: err });
    }
  }, []);

  const success = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loggingService.debug('Feedback tátil de sucesso executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil de sucesso', { error: err });
    }
  }, []);

  const warning = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      loggingService.debug('Feedback tátil de aviso executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil de aviso', { error: err });
    }
  }, []);

  const error = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      loggingService.debug('Feedback tátil de erro executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil de erro', { error: err });
    }
  }, []);

  const selection = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
      loggingService.debug('Feedback tátil de seleção executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil de seleção', { error: err });
    }
  }, []);

  const notification = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loggingService.debug('Feedback tátil de notificação executado');
    } catch (err) {
      loggingService.error('Erro ao executar feedback tátil de notificação', { error: err });
    }
  }, []);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    softImpact,
    rigidImpact,
    success,
    warning,
    error,
    selection,
    notification,
  };
}
