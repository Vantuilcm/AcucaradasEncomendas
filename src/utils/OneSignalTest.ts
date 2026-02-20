import { Platform } from 'react-native';
import { LoggingService } from '@/services/LoggingService';
import { OneSignal } from '@/config/onesignal';

const logger = LoggingService.getInstance();

/**
 * Utilitário para testar e diagnosticar o OneSignal v5
 */
export class OneSignalTest {
  /**
   * Executa uma bateria de testes do OneSignal
   */
  static async runDiagnostics(): Promise<void> {
    logger.info('🔍 OneSignal: Iniciando diagnósticos v5...');

    try {
      if (!OneSignal) {
        logger.warn('⚠️ OneSignal: SDK não disponível no ambiente atual');
        return;
      }
      
      // 2. Verificar estado do dispositivo
      const pushSubscriptionId = OneSignal.User.pushSubscription.getPushSubscriptionId();
      const pushToken = OneSignal.User.pushSubscription.getPushToken();
      const isOptedIn = OneSignal.User.pushSubscription.getOptedIn();
      const hasNotificationPermission = OneSignal.Notifications.permission;

      logger.info('📱 OneSignal: Estado do dispositivo', {
        pushSubscriptionId,
        pushToken,
        isOptedIn,
        hasNotificationPermission
      });

      // 3. Verificar tags
      const testTags = {
        test_mode: 'true',
        app_version: '1.0.0',
        platform: Platform.OS,
        test_timestamp: new Date().toISOString()
      };

      OneSignal.User.addTags(testTags);
      logger.info('✅ OneSignal: Tags de teste enviadas', { testTags });

      logger.info('✅ OneSignal: Diagnósticos concluídos');
    } catch (error) {
      logger.error('❌ OneSignal: Erro durante diagnósticos', error as Error);
    }
  }

  /**
   * Força uma nova tentativa de inscrição
   */
  static async forceSubscription(): Promise<void> {
    try {
      logger.info('🔄 OneSignal: Solicitando permissões...');
      if (!OneSignal) return;
      
      const response = await OneSignal.Notifications.requestPermission(true);
      logger.info('📝 OneSignal: Resposta da permissão', { response });
      
      const pushSubscriptionId = OneSignal.User.pushSubscription.getPushSubscriptionId();
      logger.info('📱 OneSignal: Subscription ID atual', { pushSubscriptionId });
    } catch (error) {
      logger.error('❌ OneSignal: Erro ao forçar inscrição', error as Error);
    }
  }
}
