import React, { useEffect, useState } from 'react';
import { LogBox, View, AppState, AppStateStatus, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider, useAppTheme } from './components/ThemeProvider';
import { ENV } from './config/env';

// 🛡️ Monitoramento e Resiliência
import { initErrorGuard } from './core/monitoring/errorGuard';
import { logEvent, logInfo } from './core/monitoring/logger';
import { runHealthCheck } from './core/monitoring/healthCheck';
import { ErrorBoundary } from './core/monitoring/ErrorBoundary';
import { transportManager } from './core/monitoring/TransportManager';
import { DiagnosticScreen } from './core/monitoring/DiagnosticScreen';

// Inicializar Proteção Global de Erros
initErrorGuard();

/**
 * 🛡️ RuntimeCrashDetectorAI - Safe Init Wrapper
 */
function safeInit(fn: () => void, name: string) {
  try {
    console.info(`🔧 [INIT] Inicializando ${name}...`);
    fn();
    console.info(`✅ [INIT] ${name} pronto.`);
  } catch (e) {
    console.error(`❌ [INIT ERROR] Falha ao inicializar ${name}:`, e);
    logEvent('INIT_ERROR', `Falha em ${name}: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// Ignorar warnings específicos durante desenvolvimento
if (LogBox) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Sending `onAnimatedValueUpdate` with no listeners registered',
    'Require cycle:',
  ]);
}

function ThemedApp() {
  const { isDark, theme } = useAppTheme();

  // 🔄 Gerenciamento do Ciclo de Vida para Monitoramento
  useEffect(() => {
    let subscription: any;
    
    try {
      // Tentar enviar logs pendentes na inicialização
      if (transportManager && typeof transportManager.flushLogs === 'function') {
        transportManager.flushLogs();
      }

      subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          logInfo('APP_START', '📱 App voltou para o foreground');
          if (transportManager && typeof transportManager.flushLogs === 'function') {
            transportManager.flushLogs();
          }
        }
      });
    } catch (e) {
      console.warn('⚠️ Erro no ciclo de vida do monitoramento:', e);
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  
  // Mesclar o tema do Paper com o nosso tema customizado
  const paperTheme = isDark 
    ? { 
        ...MD3DarkTheme, 
        colors: { 
          ...MD3DarkTheme.colors, 
          primary: theme?.colors?.primary || '#000000', 
          secondary: theme?.colors?.secondary || '#000000', 
          tertiary: theme?.colors?.tertiary || '#000000',
          background: theme?.colors?.background || '#000000', 
          surface: theme?.colors?.surface || '#000000', 
          error: theme?.colors?.error || '#FF0000', 
          onSurface: theme?.colors?.text?.primary || '#FFFFFF', 
          onBackground: theme?.colors?.text?.primary || '#FFFFFF',
          surfaceVariant: theme?.colors?.surfaceVariant || '#000000',
          outline: theme?.colors?.outline || '#000000',
        },
        roundness: 3.5, // 3.5 * 4 = 14px (md borderRadius)
      } 
    : { 
        ...MD3LightTheme, 
        colors: { 
          ...MD3LightTheme.colors, 
          primary: theme?.colors?.primary || '#000000', 
          secondary: theme?.colors?.secondary || '#000000', 
          tertiary: theme?.colors?.tertiary || '#000000',
          background: theme?.colors?.background || '#FFFFFF', 
          surface: theme?.colors?.surface || '#FFFFFF', 
          error: theme?.colors?.error || '#B00020', 
          onSurface: theme?.colors?.text?.primary || '#000000', 
          onBackground: theme?.colors?.text?.primary || '#000000',
          surfaceVariant: theme?.colors?.surfaceVariant || '#EEEEEE',
          outline: theme?.colors?.outline || '#79747E',
        },
        roundness: 3.5,
      };

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1, backgroundColor: theme?.colors?.background || (isDark ? '#000000' : '#FFFFFF') }} testID="app-container">
        <StatusBar style={isDark ? "light" : "dark"} />
        <AppNavigator />
      </View>
    </PaperProvider>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // 🔄 Bootstrap do App (Nível Raiz)
  useEffect(() => {
    const bootstrap = async () => {
      console.info("🚀 [STARTUP] Root bootstrap starting (Fase 1: Navigation)...");
      
      try {
        // 1. Garantir que a Splash Screen não suma antes do tempo
        await SplashScreen.preventAutoHideAsync().catch(() => {});

        // 2. Delay maior para estabilidade total do bridge nativo
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. Inicialização de serviços (Safe)
        safeInit(() => { runHealthCheck(ENV); }, 'HealthCheck');
        
        // Fase 1: Ignorar Sentry e OneSignal para garantir estabilidade da UI

        console.info("✅ [STARTUP] Root bootstrap complete (Fase 1).");
      } catch (e) {
        console.error("❌ [STARTUP ERROR] Fatal during bootstrap:", e);
      } finally {
        setIsReady(true);
        // Esconder splash após o React renderizar o primeiro frame
        setTimeout(async () => {
          try {
            await SplashScreen.hideAsync();
            console.info("🚀 [STARTUP] Splash hidden from root.");
          } catch (e) {
            console.warn('⚠️ Erro ao esconder splash na raiz:', e);
          }
        }, 500);
      }
    };

    bootstrap();
  }, []);

  // Enquanto não está pronto, mostra apenas um container vazio (Splash ainda visível)
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <ThemedApp />
                {__DEV__ && !showDiagnostic && (
                  <TouchableOpacity 
                    style={{ 
                      position: 'absolute', 
                      bottom: 20, 
                      right: 20, 
                      backgroundColor: 'rgba(0,0,0,0.5)', 
                      padding: 8, 
                      borderRadius: 20,
                      zIndex: 9999
                    }} 
                    onPress={() => setShowDiagnostic(true)}
                  >
                    <Text style={{ color: '#FFF', fontSize: 10 }}>🛠️ DIAG</Text>
                  </TouchableOpacity>
                )}
                {__DEV__ && showDiagnostic && (
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10000 }}>
                    <DiagnosticScreen onClose={() => setShowDiagnostic(false)} />
                  </View>
                )}
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
