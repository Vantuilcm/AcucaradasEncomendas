import { AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { PerformanceService } from './PerformanceService';

// Manter a tela de splash visível enquanto inicializamos
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignorar erros na prevenção do splash */
});

interface StartupOptions {
  preloadAll?: boolean;
  cacheAppData?: boolean;
  skipSplashScreen?: boolean;
  skipFontsLoading?: boolean;
  skipImagesLoading?: boolean;
}

class AppStartupService {
  private static instance: AppStartupService;
  private performanceService: PerformanceService;
  private appStateSubscription?: { remove: () => void };

  private constructor() {
    this.performanceService = PerformanceService.getInstance();

    // Monitorar o estado da aplicação
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  public static getInstance(): AppStartupService {
    if (!AppStartupService.instance) {
      AppStartupService.instance = new AppStartupService();
    }
    return AppStartupService.instance;
  }

  /**
   * Inicia o processo de inicialização da aplicação
   * @param _options Opções de inicialização
   * @returns Promise que resolve quando os recursos críticos estiverem carregados
   */
  public async initializeApp(_options: StartupOptions = {}): Promise<void> {
    console.log('MISSÃO: [5/3] AppStartupService - BYPASS TOTAL para debug de boot');
    try {
      await SplashScreen.hideAsync();
    } catch (e) {}
    
    return;
  }

  /**
   * Gerencia mudanças no estado do aplicativo (foreground/background)
   */
  private handleAppStateChange = (_nextAppState: string): void => {
    // Lógica de mudança de estado desativada temporariamente
  };

  /**
   * Limpa recursos e encerra serviços quando o aplicativo for fechado
   */
  public cleanup(): void {
    // Parar monitoramento de performance
    if (this.performanceService) {
      try {
        this.performanceService.stopMonitoring();
      } catch (e) {}
    }
    
    this.appStateSubscription?.remove();
  }

  // Mocks exportados para evitar erros de referência em outros arquivos durante o debug
  public preloadAdditionalResources(): void {}
  public preloadAppData(): void {}
  public cacheImages(_images: any[]): void {}
  public loadNonCriticalResourcesAsync(_options: StartupOptions): void {}
  public loadCriticalResources(_options: StartupOptions): void {}
}

export default AppStartupService.getInstance();
