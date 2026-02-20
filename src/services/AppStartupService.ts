import { AppState, InteractionManager, Platform , Image } from 'react-native';
import { firebaseAvailable } from '../config/firebase';
import { initOneSignal, requestOneSignalPermission } from '../config/onesignal';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import cacheService from './cacheService';
import { PerformanceService } from './PerformanceService';
import { LoggingService } from './LoggingService';

// Manter a tela de splash visível enquanto inicializamos
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignorar erros na prevenção do splash */
});

// Recursos críticos que precisam ser carregados antes da abertura do app
const CRITICAL_FONTS = {} as Record<string, number>;

// Imagens críticas que devem ser carregadas antes da exibição da primeira tela
const CRITICAL_IMAGES = [require('../../assets/splash.png'), require('../../assets/icon.png')];

// Recursos não críticos que podem ser carregados após a exibição do app
const NON_CRITICAL_FONTS = {} as Record<string, number>;

const NON_CRITICAL_IMAGES: any[] = [];

interface StartupOptions {
  preloadAll?: boolean;
  cacheAppData?: boolean;
  skipSplashScreen?: boolean;
  skipFontsLoading?: boolean;
  skipImagesLoading?: boolean;
}

class AppStartupService {
  private static instance: AppStartupService;
  private isInitialized: boolean = false;
  private isStartupComplete: boolean = false;
  private cacheService = cacheService;
  private performanceService: PerformanceService;
  
  private startTime: number = 0;
  private appStateSubscription?: { remove: () => void } | null = null;
private constructor() {
    this.cacheService = cacheService;
    this.performanceService = PerformanceService.getInstance();
    this.startTime = Date.now();

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
   * @param options Opções de inicialização
   * @returns Promise que resolve quando os recursos críticos estiverem carregados
   */
  public async initializeApp(options: StartupOptions = {}): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Iniciar medição de performance
    this.performanceService.startMonitoring();
    const startupTransactionId = this.performanceService.startOperation('app_startup', 'startup');

    try {
      // Registrar tentativa de inicialização
      LoggingService.getInstance().debug('Iniciando AppStartupService...');

      if (Platform.OS !== 'web') {
        initOneSignal();
        // Chamada de permissão removida daqui para evitar race condition no startup
        // requestOneSignalPermission().catch(err => ...);
      }

      // Carregar recursos críticos para a inicialização
      await this.loadCriticalResources(options);

      // NÃO esconder a tela de splash aqui se o RootLayout for cuidar disso
      if (!options.skipSplashScreen) {
        LoggingService.getInstance().debug('Escondendo Splash Screen via AppStartupService');
        await SplashScreen.hideAsync().catch(() => {});
      } else {
        LoggingService.getInstance().debug('Splash Screen será escondida pelo RootLayout');
      }

      // Registrar o tempo de inicialização
      const startupTime = Date.now() - this.startTime;
      this.performanceService.endOperation(startupTransactionId, true, { startupTime });

      // Carregar recursos não críticos após o app ser exibido
      this.loadNonCriticalResourcesAsync(options);

      this.isStartupComplete = true;
    } catch (error: any) {
      LoggingService.getInstance().error('Falha crítica na inicialização do App', error);
      this.performanceService.endOperation(startupTransactionId, false, { error: String(error) });
      // Mesmo em erro, tentamos esconder o splash para o app não ficar travado
      if (!options.skipSplashScreen) {
        await SplashScreen.hideAsync().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Carrega recursos críticos que são necessários antes da exibição do app
   * @param options Opções de inicialização
   */
  private async loadCriticalResources(options: StartupOptions): Promise<void> {
    const tasks: Promise<any>[] = [];

    // Carregar fontes críticas
    if (!options.skipFontsLoading) {
      tasks.push(Font.loadAsync(CRITICAL_FONTS));
    }

    // Pré-carregar imagens críticas
    if (!options.skipImagesLoading) {
      tasks.push(this.cacheImages(CRITICAL_IMAGES));
    }

    // Carregar dados iniciais do cache se necessário
    if (options.cacheAppData) {
      tasks.push(this.preloadAppData());
    }

    // Aguardar todas as tarefas críticas
    await Promise.all(tasks);
  }

  /**
   * Carrega recursos não críticos de forma assíncrona após o app ser exibido
   * @param options Opções de inicialização
   */
  private loadNonCriticalResourcesAsync(options: StartupOptions): void {
    // Usar InteractionManager para garantir que o carregamento não afete a UI
    InteractionManager.runAfterInteractions(() => {
      const loadResources = async () => {
        try {
          const tasks: Promise<any>[] = [];

          // Carregar fontes não críticas
          if (!options.skipFontsLoading) {
            tasks.push(Font.loadAsync(NON_CRITICAL_FONTS));
          }

          // Pré-carregar imagens não críticas
          if (!options.skipImagesLoading) {
            tasks.push(this.cacheImages(NON_CRITICAL_IMAGES));
          }

          // Carregar todos os recursos se a opção estiver habilitada
          if (options.preloadAll) {
            tasks.push(this.preloadAdditionalResources());
          }

          await Promise.all(tasks);
        } catch (error: any) {
          LoggingService.getInstance().warn('Erro ao carregar recursos não críticos:', { error });
        }
      };

      loadResources();
    });
  }

  /**
   * Pré-carrega e armazena em cache as imagens
   * @param images Array de imagens para cache
   */
  private async cacheImages(images: any[]): Promise<void> {
    const imageAssets = images.map(image => {
      if (typeof image === 'string') {
        return Image.prefetch(image);
      } else {
        return Asset.fromModule(image).downloadAsync();
      }
    });

    await Promise.all(imageAssets);
  }

  /**
   * Pré-carrega dados do aplicativo do cache
   */
  private async preloadAppData(): Promise<void> {
    try {
      // Esta função pode carregar dados iniciais do AsyncStorage/cache
      // para acelerar a inicialização do aplicativo
      // Exemplo: carregar configurações do usuário
      // const userSettings = await this.cacheService.get('user_settings');
      // Exemplo: carregar dados de produtos em destaque
      // const featuredProducts = await this.cacheService.getProducts();
      // Aqui você adaptaria para os dados específicos do seu app que precisam
      // estar disponíveis rapidamente na inicialização
    } catch (error: any) {
      LoggingService.getInstance().warn('Erro ao pré-carregar dados do app:', { error });
    }
  }

  /**
   * Carrega recursos adicionais que podem ser necessários
   */
  private async preloadAdditionalResources(): Promise<void> {
    // Implementar conforme necessário para o seu aplicativo
    // Ex: carregar dados de produtos, categorias, etc.
  }

  /**
   * Gerencia mudanças no estado do aplicativo (foreground/background)
   */
  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'active') {
      // O app voltou para o primeiro plano
      // Pode-se implementar lógica de reativação aqui
    } else if (nextAppState === 'background') {
      // O app foi para o background
      // Pode-se implementar lógica de liberação de recursos aqui
    }
  };

  /**
   * Limpa recursos e encerra serviços quando o aplicativo for fechado
   */
  public cleanup(): void {
    // Remover listener do AppState
    this.appStateSubscription?.remove();

    // Outros procedimentos de limpeza
  }
}

export default AppStartupService.getInstance();


