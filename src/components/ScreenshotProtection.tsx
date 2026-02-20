import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, AppState, AppStateStatus, Platform } from 'react-native';
import { DynamicWatermark } from '@/components/DynamicWatermark';
import * as ScreenCapture from 'expo-screen-capture';
import { loggingService } from '@/services/LoggingService';
import securityConfig from '@/config/appSecurityConfig';
import { securityMonitoring, SecurityEventType } from '@/monitoring/AppSecurityMonitoring';
import { getUserInfo } from '@/services/UserService';

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
  /** Tempo em ms para mostrar o aviso antes de escondê-lo */
  warningDuration?: number;
  /** Registrar tentativas de captura no sistema de logs */
  logAttempts?: boolean;
  /** Enviar alertas para o servidor quando capturas são detectadas */
  reportToServer?: boolean;
  /** Exibir marca d'água dinâmica sobre o conteúdo protegido */
  enableWatermark?: boolean;
}

/**
 * Componente que protege o conteúdo contra capturas de tela
 * Usa expo-screen-capture para detectar e prevenir screenshots
 */
export const ScreenshotProtection: React.FC<ScreenshotProtectionProps> = ({
  children,
  enabled,
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
  const isWeb = Platform.OS === 'web';
  const envFlag = (process.env.EXPO_PUBLIC_ENABLE_SCREENSHOT_PROTECTION ?? '').toString().toLowerCase();
  const defaultEnabled = envFlag === 'false' || envFlag === '0' ? false : securityConfig.screenshotProtection.enabled;
  const isEnabled = (enabled ?? defaultEnabled) && !isWeb;

  // Ativar proteção contra capturas de tela
  useEffect(() => {
    if (!isEnabled) return;

    let subscription: any;
    let appStateSubscription: any;
    let resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScreenshot = () => {
      // Registrar tentativa no sistema de logs
      if (logAttempts) {
        loggingService.warn('Captura de tela detectada em conteÃºdo protegido', {
          timestamp: new Date().toISOString(),
          component: 'ScreenshotProtection',
          securityEvent: 'screenshot_attempt',
        });
      }

      // Registrar no sistema de monitoramento de segurança
      securityMonitoring.trackSecurityEvent({
        type: SecurityEventType.SCREENSHOT_ATTEMPT,
        timestamp: new Date(),
        details: {
          component: 'ScreenshotProtection',
          screen: 'CurrentScreen',
        },
        userId: getUserInfo()?.id,
        deviceInfo: {
          platform: Platform.OS,
          appVersion: '1.0.0',
          timestamp: new Date().toISOString(),
        },
        severity: 'medium',
      });

      // Atualizar estado para mostrar aviso/borrar conteúdo
      setScreenshotDetected(true);

      // Executar callback personalizado
      if (onScreenshotDetected) {
        onScreenshotDetected();
      }

      // Enviar alerta para o servidor se configurado
      if (reportToServer) {
        try {
          // Implementação de exemplo - substituir pela API real
          fetch('/api/security/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'screenshot_attempt',
              timestamp: new Date().toISOString(),
              component: 'ScreenshotProtection',
            }),
          }).catch((err) => {
            if (__DEV__) {
              const extError = err as ExtendedError;
              loggingService.error('Falha ao reportar evento de segurança', {
                error: extError as Error,
                component: 'ScreenshotProtection',
              });
            }
          });
          fetch('/api/security/report-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'screenshot_attempt',
              timestamp: new Date().toISOString(),
              component: 'ScreenshotProtection',
            }),
          }).catch((err) => {
            if (__DEV__) {
              const extError = err as ExtendedError;
              loggingService.error('Falha ao reportar evento de segurança', {
                error: extError as Error,
                component: 'ScreenshotProtection',
              });
            }
          });
        } catch (error) {
          if (__DEV__) {
            const extError = error as ExtendedError;
            loggingService.error('Erro ao reportar evento de segurança', {
              error: extError as Error,
              component: 'ScreenshotProtection',
            });
          }
        }
      }

      // Resetar o estado após o tempo configurado
      if (resetTimeoutId) {
        clearTimeout(resetTimeoutId);
        resetTimeoutId = null;
      }
      resetTimeoutId = setTimeout(() => {
        setScreenshotDetected(false);
      }, warningDuration);
    };

    const activateProtection = async () => {
      try {
        const addScreenshotListener = (ScreenCapture as any)?.addScreenshotListener;
        if (typeof addScreenshotListener === 'function') {
          subscription = addScreenshotListener(handleScreenshot);
        }

        const addAppStateListener = (AppState as any)?.addEventListener;
        if (typeof addAppStateListener === 'function') {
          appStateSubscription = addAppStateListener('change', handleAppStateChange);
        }

        const preventCapture = (ScreenCapture as any)?.preventScreenCaptureAsync;
        if (typeof preventCapture === 'function') {
          await preventCapture();
        }

        // loggingService.info('Proteção contra capturas de tela ativada');
      } catch (error) {
        if (__DEV__) {
          const extError = error as ExtendedError;
          loggingService.error('Erro ao ativar proteÃ§Ã£o contra capturas de tela', {
            error: extError as Error,
            component: 'ScreenshotProtection',
          });
        }
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isWeb) {
        // Quando for para background/inactive, permitir captura novamente
        if (nextAppState.match(/inactive|background/)) {
          const allowCapture = (ScreenCapture as any)?.allowScreenCaptureAsync;
          if (typeof allowCapture === 'function') {
            allowCapture();
          }
        }
        // Quando estiver ativo, reativar proteção sem re-registrar listeners
        if (nextAppState === 'active') {
          const preventCapture = (ScreenCapture as any)?.preventScreenCaptureAsync;
          if (typeof preventCapture === 'function') {
            preventCapture();
          }
        }
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
      if (resetTimeoutId) {
        clearTimeout(resetTimeoutId);
        resetTimeoutId = null;
      }
      // Permitir capturas de tela novamente
      if (!isWeb) {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [isEnabled, onScreenshotDetected]);
  // Renderizar conteúdo protegido
  return (
    <View style={styles.container}>
      {/* Conteúdo normal ou borrado */}
      <View
        style={[
          styles.contentContainer,
          screenshotDetected && blurContent && styles.blurredContent,
        ]}
      >
        {children}
      </View>

      {/* Marca d'água dinâmica */}
      {enableWatermark && (
        <DynamicWatermark 
          userInfo={undefined}
          enableLogging={logAttempts}
        />
      )}

      {/* Aviso de captura de tela */}
      {screenshotDetected && showWarning && (
        <View style={styles.warningContainer} pointerEvents="none">
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
    opacity: 0.4,
  },
  warningContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  warningText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

/**
 * Hook para usar proteção contra capturas de tela em componentes funcionais
 * @param options Opções de configuração
 * @returns Objeto com funções para controlar a proteção
 */
export const useScreenshotProtection = (options?: {
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}) => {
  const [isProtectionEnabled, setIsProtectionEnabled] = useState(options?.enabled ?? true);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isProtectionEnabled || isWeb) return;

    let subscription: any;

    const activateProtection = async () => {
      try {
        // Adicionar listener imediatamente
        subscription = ScreenCapture.addScreenshotListener(() => {
          loggingService.warn('Captura de tela detectada via hook');
          if (options?.onScreenshotDetected) {
            options.onScreenshotDetected();
          }
        });

        // Prevenir capturas de tela
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        const extError = error as ExtendedError;
        loggingService.error('Erro ao ativar proteÃ§Ã£o contra capturas de tela (hook)', {
          error: extError as Error,
          component: 'ScreenshotProtection',
        });
      }
    };

    activateProtection();

    // Limpar ao desmontar
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (!isWeb) {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [isProtectionEnabled, options?.onScreenshotDetected, isWeb]);

  return {
    enable: () => setIsProtectionEnabled(true),
    disable: () => {
      setIsProtectionEnabled(false);
      if (!isWeb) {
        ScreenCapture.allowScreenCaptureAsync();
      }
    },
    isEnabled: isProtectionEnabled,
  };
};





