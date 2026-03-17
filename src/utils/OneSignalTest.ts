import { OneSignal } from 'react-native-onesignal';
import { loggingService } from '../services/LoggingService';

/**
 * Utilitário para testar e diagnosticar o OneSignal
 * Use este arquivo para verificar se o OneSignal está funcionando corretamente
 */
export class OneSignalTest {
  /**
   * Executa uma bateria de testes do OneSignal
   */
  static async runDiagnostics(): Promise<void> {
    loggingService.info('🔍 OneSignal: Iniciando diagnósticos...');

    try {
      // 1. Verificar se o OneSignal foi inicializado
      await this.checkInitialization();

      // 2. Verificar estado do dispositivo
      await this.checkDeviceState();

      // 3. Verificar permissões
      await this.checkPermissions();

      // 4. Verificar ID do usuário
      await this.checkUserId();

      // 5. Verificar tags
      await this.checkTags();

      loggingService.info('✅ OneSignal: Diagnósticos concluídos');
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro durante diagnósticos', { error });
    }
  }

  /**
   * Verifica se o OneSignal foi inicializado
   */
  private static async checkInitialization(): Promise<void> {
    try {
      const deviceState = await OneSignal.User.getOnesignalId();
      if (deviceState) {
        loggingService.info('✅ OneSignal: Inicializado corretamente');
      } else {
        loggingService.warn('⚠️ OneSignal: Não inicializado ou sem estado do dispositivo');
      }
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao verificar inicialização', { error });
    }
  }

  /**
   * Verifica o estado do dispositivo
   */
  private static async checkDeviceState(): Promise<void> {
    try {
      const userId = await OneSignal.User.getOnesignalId();
      const pushSubscription = OneSignal.User.pushSubscription;
      const pushToken = pushSubscription.getPushSubscriptionToken();
      const isSubscribed = pushSubscription.getOptedIn();
      const hasNotificationPermission = await OneSignal.Notifications.getPermissionAsync();

      loggingService.info('📱 OneSignal: Estado do dispositivo', {
        userId: userId,
        pushToken: pushToken,
        isSubscribed: isSubscribed,
        hasNotificationPermission: hasNotificationPermission
      });

      if (!userId) {
        loggingService.warn('⚠️ OneSignal: Usuário não possui ID - pode não estar inscrito');
      }

      if (!pushToken) {
        loggingService.warn('⚠️ OneSignal: Dispositivo não possui push token');
      }

      if (!isSubscribed) {
        loggingService.warn('⚠️ OneSignal: Usuário não está inscrito para notificações');
      }

      if (!hasNotificationPermission) {
        loggingService.warn('⚠️ OneSignal: Usuário não concedeu permissão para notificações');
      }
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao verificar estado do dispositivo', { error });
    }
  }

  /**
   * Verifica permissões de notificação
   */
  private static async checkPermissions(): Promise<void> {
    try {
      const hasNotificationPermission = await OneSignal.Notifications.getPermissionAsync();
      
      if (hasNotificationPermission) {
        loggingService.info('✅ OneSignal: Permissões concedidas');
      } else {
        loggingService.warn('⚠️ OneSignal: Permissões não concedidas');
        
        // Tentar solicitar permissão novamente
        loggingService.info('🔄 OneSignal: Solicitando permissões...');
        const response = await OneSignal.Notifications.requestPermission(true);
        loggingService.info('📝 OneSignal: Resposta da permissão', { response });
      }
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao verificar permissões', { error });
    }
  }

  /**
   * Verifica ID do usuário
   */
  private static async checkUserId(): Promise<void> {
    try {
      const userId = await OneSignal.User.getOnesignalId();
      
      if (userId) {
        loggingService.info('✅ OneSignal: ID do usuário encontrado', { userId });
      } else {
        loggingService.warn('⚠️ OneSignal: ID do usuário não encontrado');
        loggingService.info('💡 OneSignal: Isso pode indicar que o usuário não está inscrito');
      }
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao verificar ID do usuário', { error });
    }
  }

  /**
   * Verifica e define tags de teste
   */
  private static async checkTags(): Promise<void> {
    try {
      // Definir tags de teste
      const testTags = {
        test_mode: 'true',
        app_version: '1.0.0',
        platform: 'android',
        test_timestamp: new Date().toISOString()
      };

      OneSignal.User.addTags(testTags);
      loggingService.info('✅ OneSignal: Tags de teste definidas', { testTags });

      // Verificar tags após um pequeno delay
      setTimeout(async () => {
        try {
          const tags = OneSignal.User.getTags();
          loggingService.info('📋 OneSignal: Tags atuais', { tags });
        } catch (error) {
          loggingService.error('❌ OneSignal: Erro ao obter tags', { error });
        }
      }, 2000);
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao verificar tags', { error });
    }
  }

  /**
   * Força uma nova tentativa de inscrição
   */
  static async forceSubscription(): Promise<void> {
    try {
      loggingService.info('🔄 OneSignal: Forçando nova inscrição...');
      
      // Solicitar permissão
      const response = await OneSignal.Notifications.requestPermission(true);
      loggingService.info('📝 OneSignal: Resposta da permissão', { response });
      
      // Aguardar um pouco e verificar estado
      setTimeout(async () => {
        const userId = await OneSignal.User.getOnesignalId();
        const pushSubscription = OneSignal.User.pushSubscription;
        const isSubscribed = pushSubscription.getOptedIn();
        const hasNotificationPermission = await OneSignal.Notifications.getPermissionAsync();

        loggingService.info('📱 OneSignal: Estado após forçar inscrição', {
          userId: userId,
          isSubscribed: isSubscribed,
          hasNotificationPermission: hasNotificationPermission
        });
      }, 3000);
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao forçar inscrição', { error });
    }
  }

  /**
   * Envia uma notificação de teste local
   */
  static async sendTestNotification(): Promise<void> {
    try {
      loggingService.info('📤 OneSignal: Enviando notificação de teste...');
      
      // Nota: Para enviar notificações reais, você precisa usar a API REST do OneSignal
      // Este é apenas um exemplo de como estruturar
      loggingService.info('💡 OneSignal: Para enviar notificações reais, use o dashboard do OneSignal');
      loggingService.info('🔗 OneSignal: https://app.onesignal.com');
    } catch (error) {
      loggingService.error('❌ OneSignal: Erro ao enviar notificação de teste', { error });
    }
  }
}

/**
 * Hook para executar diagnósticos do OneSignal automaticamente
 */
export const useOneSignalDiagnostics = () => {
  const runDiagnostics = () => OneSignalTest.runDiagnostics();
  const forceSubscription = () => OneSignalTest.forceSubscription();
  const sendTestNotification = () => OneSignalTest.sendTestNotification();

  return {
    runDiagnostics,
    forceSubscription,
    sendTestNotification
  };
};