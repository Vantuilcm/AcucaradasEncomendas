import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, AppState, AppStateStatus, Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { loggingService } from '../services/LoggingService';
import securityConfig from '../config/securityConfig';
import { securityMonitoring, SecurityEventType } from '../monitoring/SecurityMonitoring';
import { getUserInfo } from '../services/UserService';

// Interface para erros com propriedades adicionais
interface ExtendedError extends Error {
  [key: string]: any;
}

// Interface para erros com propriedades adicionais
interface ExtendedError extends Error {
  [key: string]: any;
}

interface ScreenshotProtectionProps {
  children: React.ReactNode;
  enabled?: boolean;
  onScreenshotDetected?: () => void;
  blurContent?: boolean;
  showWarning?: boolean;
  warningText?: string;
  /** Tempo em ms para mostrar o aviso antes de escondÃª-lo */
  warningDuration?: number;
  /** Registrar tentativas de captura no sistema de logs */
  logAttempts?: boolean;
  /** Enviar alertas para o servidor quando capturas sÃ£o detectadas */
  reportToServer?: boolean;
}

/**
 * Componente que protege o conteÃºdo contra capturas de tela
 * Usa expo-screen-capture para detectar e prevenir screenshots
 */
export const ScreenshotProtection: React.FC<ScreenshotProtectionProps> = ({
  children,
  enabled = securityConfig.screenshotProtection.enabled,
  onScreenshotDetected,
  blurContent = securityConfig.screenshotProtection.blurContent,
  showWarning = securityConfig.screenshotProtection.showWarning,
  warningText = securityConfig.screenshotProtection.warningText,
  warningDuration = securityConfig.screenshotProtection.warningDuration,
  logAttempts = securityConfig.screenshotProtection.logAttempts,
  reportToServer = securityConfig.screenshotProtection.reportToServer,
  enableWatermark = securityConfig.screenshotProtection.enableWatermark,
}) => {
  const [screenshotDetected, setScreenshotDetected] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Ativar proteÃ§Ã£o contra capturas de tela
  useEffect(() => {
    if (!enabled) return;

    let subscription: any;
    let appStateSubscription: any;

    const activateProtection = async () => {
      try {
        // Prevenir capturas de tela (iOS e Android)
        await ScreenCapture.preventScreenCaptureAsync();

        // Adicionar listener para detectar capturas de tela
subscription = ScreenCapture.addScreenshotListener(() => {
  // Registrar tentativa no sistema de logs
  if (logAttempts) {
    loggingService.warn('Captura de tela detectada em conteÃºdo protegido', {
      timestamp: new Date().toISOString(),
      component: 'ScreenshotProtection',
      securityEvent: 'screenshot_attempt'
    });
  }
  
  // Registrar no sistema de monitoramento de seguranÃ§a
  securityMonitoring.trackSecurityEvent({
    type: SecurityEventType.SCREENSHOT_ATTEMPT,
    timestamp: new Date(),
    details: {
      component: 'ScreenshotProtection',
      screen: 'CurrentScreen'
    },
    userId: getUserInfo()?.id,
    deviceInfo: {
      platform: Platform.OS,
      appVersion: '1.0.0',
      timestamp: new Date().toISOString()
    },
    severity: 'medium'
  });
  
  // Atualizar estado para mostrar aviso/borrar conteÃºdo
  setScreenshotDetected(true);
  
  // Executar callback personalizado
  if (onScreenshotDetected) {
    onScreenshotDetected();
  }
  
  // Enviar alerta para o servidor se configurado
  if (reportToServer) {
    try {
      // ImplementaÃ§Ã£o de exemplo - substituir pela API real
      fetch('/api/security/report-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'screenshot_attempt',
          timestamp: new Date().toISOString(),
          component: 'ScreenshotProtection'
        })
      }).catch(err => {
        // Silenciar erros de rede para nÃ£o interromper a experiÃªncia
        const extError = err as ExtendedError;
        loggingService.error('Falha ao reportar evento de seguranÃ§a', { error: extError });
      });
    } catch (error) {
      // Capturar quaisquer erros para nÃ£o interromper a experiÃªncia
      const extError = error as ExtendedError;
      loggingService.error('Erro ao reportar evento de seguranÃ§a', { error: extError });
    }
  }

  // Resetar o estado apÃ³s o tempo configurado
  setTimeout(() => {
    setScreenshotDetected(false);
  }, warningDuration);
});

        // Monitorar mudanÃ§as de estado do aplicativo
        appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        loggingService.info('ProteÃ§Ã£o contra capturas de tela ativada');
      } catch (error) {
        const extError = error as ExtendedError;
        loggingService.error('Erro ao ativar proteÃ§Ã£o contra capturas de tela', { error: extError });
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // Aplicativo voltou ao primeiro plano, reativar proteÃ§Ã£o
        activateProtection();
      }
      setAppState(nextAppState);
    };

    activateProtection();

    // Limpar ao desmontar
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      // Permitir capturas de tela novamente
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, [enabled, onScreenshotDetected, appState]);

  // Renderizar conteÃºdo protegido
  return (
    <View style={styles.container}>
      {/* ConteÃºdo normal ou borrado */}
      <View
        style={[
          styles.contentContainer,
          screenshotDetected && blurContent && styles.blurredContent,
        ]}
      >
        {children}
      </View>

      {/* Marca d'Ã¡gua dinÃ¢mica */}
      {enableWatermark && (
        <DynamicWatermark 
          userInfo={getUserInfo()}
          enableLogging={logAttempts}
        />
      )}

      {/* Aviso de captura de tela */}
      {screenshotDetected && showWarning && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>{warningText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
  },
  blurredContent: {
    opacity: 0.1,
  },
  warningContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

/**
 * Hook para usar proteÃ§Ã£o contra capturas de tela em componentes funcionais
 * @param options OpÃ§Ãµes de configuraÃ§Ã£o
 * @returns Objeto com funÃ§Ãµes para controlar a proteÃ§Ã£o
 */
export const useScreenshotProtection = (options?: {
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}) => {
  const [isProtectionEnabled, setIsProtectionEnabled] = useState(options?.enabled ?? true);

  useEffect(() => {
    if (!isProtectionEnabled) return;

    let subscription: any;

    const activateProtection = async () => {
      try {
        // Prevenir capturas de tela
        await ScreenCapture.preventScreenCaptureAsync();

        // Adicionar listener para detectar capturas de tela
        subscription = ScreenCapture.addScreenshotListener(() => {
          loggingService.warn('Captura de tela detectada via hook');
          if (options?.onScreenshotDetected) {
            options.onScreenshotDetected();
          }
        });
      } catch (error) {
        const extError = error as ExtendedError;
        loggingService.error('Erro ao ativar proteÃ§Ã£o contra capturas de tela (hook)', { error: extError });
      }
    };

    activateProtection();

    // Limpar ao desmontar
    return () => {
      if (subscription) {
        subscription.remove();
      }
      // Permitir capturas de tela novamente se o componente for desmontado
      if (isProtectionEnabled) {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [isProtectionEnabled, options?.onScreenshotDetected]);

  // FunÃ§Ãµes para controlar a proteÃ§Ã£o
  const enableProtection = async () => {
    try {
      await ScreenCapture.preventScreenCaptureAsync();
      setIsProtectionEnabled(true);
    } catch (error) {
      const extError = error as ExtendedError;
      loggingService.error('Erro ao habilitar proteÃ§Ã£o contra capturas de tela', { error: extError });
    }
  };

  const disableProtection = async () => {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      setIsProtectionEnabled(false);
    } catch (error) {
      const extError = error as ExtendedError;
      loggingService.error('Erro ao desabilitar proteÃ§Ã£o contra capturas de tela', { error: extError });
    }
  };

  return {
    isProtectionEnabled,
    enableProtection,
    disableProtection,
  };
};
