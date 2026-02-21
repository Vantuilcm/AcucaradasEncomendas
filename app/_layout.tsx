import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Alert } from 'react-native';
// Reimportando o MonitoringSetup com a nova implementação assíncrona
import { MonitoringSetup } from '../src/scripts/setupMonitoring';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { OptimizedStateProvider } from '../src/hooks/useOptimizedState';
import { ThemeProvider } from '../src/components/ThemeProvider';
import { MonitoringStatusBadge } from '../src/components/monitoring/MonitoringStatusBadge';
import { NetworkSecurityService } from '../src/services/NetworkSecurityService';
import { secureLoggingService } from '../src/services/SecureLoggingService';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [monitoringStatus, setMonitoringStatus] = useState<'initializing' | 'success' | 'error' | 'timeout'>('initializing');
  // Mantemos o monitoringError para diagnóstico e logs, mas não exibimos na UI para não confundir o usuário
  // Esta variável é utilizada apenas para registro de erros e diagnóstico em ambiente de desenvolvimento
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [monitoringError, setMonitoringError] = useState<Error | null>(null);
  const [networkSecurityInitialized, setNetworkSecurityInitialized] = useState<boolean>(false);

  // Inicializar o serviço de segurança de rede (SSL Pinning)
  useEffect(() => {
    const initializeNetworkSecurity = async () => {
      try {
        // Inicializar o serviço de segurança de rede
        const networkSecurityService = new NetworkSecurityService();
        await networkSecurityService.initialize();
        
        // Verificar a segurança da conexão
        const connectionSecurityResult = await networkSecurityService.checkConnectionSecurity();
        
        if (!connectionSecurityResult.secure) {
          secureLoggingService.security('Conexão insegura detectada', {
            details: connectionSecurityResult.details,
            mitm: connectionSecurityResult.possibleMitm
          });
          
          // Alertar o usuário sobre possível ataque MITM
          if (connectionSecurityResult.possibleMitm) {
            Alert.alert(
              'Alerta de Segurança',
              'Detectamos uma possível interceptação na conexão de rede. Suas informações podem estar em risco.',
              [{ text: 'Entendi', style: 'cancel' }]
            );
          }
        }
        
        setNetworkSecurityInitialized(true);
        secureLoggingService.info('Serviço de segurança de rede inicializado com sucesso');
      } catch (error) {
        secureLoggingService.error('Erro ao inicializar serviço de segurança de rede', { error });
        // Continuar mesmo com erro, mas registrar
        setNetworkSecurityInitialized(false);
      }
    };
    
    initializeNetworkSecurity();
  }, []);

  useEffect(() => {
    // Inicialização assíncrona do sistema de monitoramento com timeout
    const initializeMonitoring = async () => {
      try {
        // Definimos um timeout curto para garantir que a UI não trave
        const timeoutMs = 1000; // 1 segundo é suficiente para não bloquear a UI
        
        // Criamos a instância do MonitoringSetup
        const setup = new MonitoringSetup();
        
        // Iniciamos o monitoramento em um setTimeout para não bloquear a thread principal
        const initTimeout = setTimeout(() => {
          // Iniciamos o monitoramento em background sem bloquear a navegação
          setup.initialize().then(() => {
            setMonitoringStatus('success');
            if (__DEV__) {
              console.log('✅ Sistema de monitoramento inicializado com sucesso');
            }
          }).catch((error) => {
            setMonitoringError(error instanceof Error ? error : new Error(String(error)));
            setMonitoringStatus('error');
            if (__DEV__) {
              console.error('❌ Erro ao inicializar monitoramento:', error);
              console.log('⚠️ Aplicativo continuará funcionando sem o sistema de monitoramento');
            }
          });
        }, 50); // Atraso reduzido para iniciar mais rápido
        
        // Definimos um timeout para garantir que o aplicativo continue mesmo se o monitoramento demorar
        const statusTimeout = setTimeout(() => {
          if (monitoringStatus === 'initializing') {
            setMonitoringStatus('timeout');
            if (__DEV__) {
              console.log('⚠️ Timeout ao inicializar o sistema de monitoramento, continuando com o aplicativo');
            }
          }
        }, timeoutMs);
        
        // Limpeza dos timeouts quando o componente for desmontado
        return () => {
          clearTimeout(initTimeout);
          clearTimeout(statusTimeout);
        };
      } catch (error) {
        // Capturando o erro para análise
        setMonitoringError(error instanceof Error ? error : new Error(String(error)));
        setMonitoringStatus('error');
        
        if (__DEV__) {
          console.error('❌ Erro ao inicializar monitoramento:', error);
          console.log('⚠️ Aplicativo continuará funcionando sem o sistema de monitoramento');
        }
      }
    };

    // Iniciando o monitoramento de forma não bloqueante
    initializeMonitoring();
    
    // Não é necessário cancelar a inicialização, pois o WebSocketManager
    // já possui mecanismos de limpeza internos
  }, [monitoringStatus]);
  
  // Garantir que o aplicativo continue após um tempo máximo, independente do status do monitoramento
  useEffect(() => {
    const forceNavigationTimeout = setTimeout(() => {
      if (monitoringStatus === 'initializing') {
        setMonitoringStatus('timeout');
        if (__DEV__) {
          console.log('⚠️ Forçando continuação do aplicativo após timeout de segurança');
        }
      }
    }, 5000); // Timeout de segurança
    
    return () => clearTimeout(forceNavigationTimeout);
  }, [monitoringStatus]);

  return (
    <OptimizedStateProvider>
      <ThemeProvider>
        <ErrorBoundary fallback={(          <Stack
            screenOptions={{
              headerShown: false
            }}
          />
        )}>
          {/* Badge de status do monitoramento */}
          <View style={{ position: 'absolute', top: 40, right: 10, zIndex: 1000 }}>
            <MonitoringStatusBadge />
          </View>
          
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
              },
              headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </ErrorBoundary>
      </ThemeProvider>
    </OptimizedStateProvider>
  );
}
