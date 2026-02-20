import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Alert } from 'react-native';
import { MonitoringSetup } from '../src/scripts/setupMonitoring';
import ErrorBoundary from '../src/components/ErrorBoundary.web';
import { OptimizedStateProvider } from '../src/hooks/useOptimizedState';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { MonitoringStatusBadge } from '../src/components/monitoring/MonitoringStatusBadge';
import { NetworkSecurityService } from '../src/services/NetworkSecurityService';
import { secureLoggingService } from '../src/services/SecureLoggingService';
import { PermissionsService, Role as AppRole } from '../src/services/PermissionsService';
import LoggingService from '../src/services/LoggingService';

const logger = LoggingService.getInstance();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [monitoringStatus, setMonitoringStatus] = useState<'initializing' | 'success' | 'error' | 'timeout'>('timeout');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [monitoringError, setMonitoringError] = useState<Error | null>(null);
  const [networkSecurityInitialized, setNetworkSecurityInitialized] = useState<boolean>(true);

  useEffect(() => {
    setNetworkSecurityInitialized(true);
    setTimeout(() => {
      const initializeNetworkSecurity = async () => {
        try {
          const networkSecurityService = new NetworkSecurityService();
          await networkSecurityService.initialize();
          networkSecurityService.checkConnectionSecurity().then(connectionSecurityResult => {
            if (!connectionSecurityResult.secure) {
              secureLoggingService.security('Conexão insegura detectada', {
                details: connectionSecurityResult.details,
                mitm: connectionSecurityResult.possibleMitm
              });
              if (connectionSecurityResult.possibleMitm) {
                Alert.alert(
                  'Alerta de Segurança',
                  'Detectamos uma possível interceptação na conexão de rede. Suas informações podem estar em risco.',
                  [{ text: 'Entendi', style: 'cancel' }]
                );
              }
            }
          }).catch(error => {
            secureLoggingService.error('Erro ao verificar segurança da conexão', { error });
          });
          secureLoggingService.info('Serviço de segurança de rede inicializado com sucesso');
        } catch (error) {
          secureLoggingService.error('Erro ao inicializar serviço de segurança de rede', { error });
        }
      };
      initializeNetworkSecurity();
    }, 100);
  }, []);

  useEffect(() => {
    const onUnhandledRejection = (e: any) => {
      const msg = String(e?.reason?.message || e?.message || '');
      const stack = String(e?.reason?.stack || e?.stack || '');
      const isMetaMask = msg.includes('MetaMask') || stack.includes('inpage.js');
      if (isMetaMask) {
        try {
          secureLoggingService.warn('Erro MetaMask ignorado no web', { message: msg });
        } catch {}
        if (typeof e?.preventDefault === 'function') e.preventDefault();
        return false;
      }
      return undefined;
    };
    const onError = (e: any) => {
      const msg = String(e?.message || '');
      const filename = String(e?.filename || '');
      const isMetaMask = msg.includes('MetaMask') || filename.includes('inpage.js');
      if (isMetaMask) {
        try {
          secureLoggingService.warn('Erro MetaMask ignorado no web', { message: msg });
        } catch {}
        if (typeof e?.preventDefault === 'function') e.preventDefault();
        return false;
      }
      return undefined;
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', onUnhandledRejection);
      window.addEventListener('error', onError);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
        window.removeEventListener('error', onError);
      }
    };
  }, []);

  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        setMonitoringStatus('timeout');
        if (__DEV__) {
          logger.info('⚠️ Pulando inicialização do monitoramento para evitar bloqueio da UI');
        }
        setTimeout(() => {
          try {
            const setup = new MonitoringSetup();
            setup.initialize().then(() => {
              setMonitoringStatus('success');
              if (__DEV__) {
                logger.info('✅ Sistema de monitoramento inicializado com sucesso');
              }
            }).catch((error) => {
              if (__DEV__) {
                logger.error('❌ Erro ao inicializar monitoramento:', error instanceof Error ? error : new Error(String(error)));
                logger.info('⚠️ Aplicativo continuará funcionando sem o sistema de monitoramento');
              }
            });
          } catch (error) {
            if (__DEV__) {
              logger.error('❌ Erro ao criar instância de monitoramento:', error instanceof Error ? error : new Error(String(error)));
            }
          }
        }, 100);
        // Nenhum retorno necessário em função assíncrona
      } catch (error) {
        setMonitoringError(error instanceof Error ? error : new Error(String(error)));
        setMonitoringStatus('error');
        if (__DEV__) {
          logger.error('❌ Erro ao inicializar monitoramento:', error instanceof Error ? error : new Error(String(error)));
          logger.info('⚠️ Aplicativo continuará funcionando sem o sistema de monitoramento');
        }
      }
    };
    initializeMonitoring();
  }, []);

  // Leitura explícita dos estados para evitar avisos TS6133, sem alterar a UI
  useEffect(() => {
    if (__DEV__) {
      logger.debug('Monitoring debug (web layout):', {
        monitoringStatus,
        monitoringError,
        networkSecurityInitialized,
      });
    }
  }, [monitoringStatus, monitoringError, networkSecurityInitialized]);

  return (
    <OptimizedStateProvider>
      <AuthProvider>
        <ThemeProvider>
        <ErrorBoundary>
          <View style={{ position: 'absolute', top: 40, right: 10, zIndex: 1000 }}>
            <MonitoringStatusBadge />
          </View>
          {(() => {
            function NavigationGate() {
              const router = useRouter();
              const segments = useSegments();
              const rootNavigation = useRootNavigationState();
              const { loading } = useAuth();

              useEffect(() => {
                if (!rootNavigation?.key || loading) return;
                const first = segments[0] ?? '';
                if (first !== 'src-app') {
                  router.replace('/src-app');
                }
              }, [rootNavigation?.key, segments, loading]);

              return (
                <Stack
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                    },
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                    animation: 'none'
                  }}
                />
              );
            }
            return <NavigationGate />;
          })()}
        </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </OptimizedStateProvider>
  );
}
