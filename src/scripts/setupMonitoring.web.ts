import LoggingService from '../services/LoggingService';

/**
 * Variante web simplificada do setupMonitoring
 * Evita dependências de serviços que usam Firebase/Firestore e SearchService.
 */

export class MonitoringSetup {
  private isInitialized = false;
  private fallbackMode = false;
  private fallbackError: Error | null = null;
  private logger = LoggingService.getInstance();

  constructor() {}

  async initialize(): Promise<void> {
    try {
      if (__DEV__) {
        this.logger.info('🧪 [web] Inicializando setupMonitoring.web (stub)');
      }

      // No-op: em web, não configuramos SearchService nem WebSocket reais aqui
      // Apenas simulamos uma inicialização rápida para não bloquear a UI
      await new Promise<void>(resolve => setTimeout(() => resolve(), 50));

      this.isInitialized = true;
      this.fallbackMode = false;
      this.fallbackError = null;
      if (__DEV__) {
        this.logger.info('✅ [web] setupMonitoring.web inicializado (sem integrações nativas)');
      }
    } catch (error) {
      // Nunca propagar erro para não bloquear app no web
      if (__DEV__) {
        this.logger.warn('⚠️ [web] setupMonitoring.web em modo de fallback:', { error });
      }
      this.isInitialized = true;
      this.fallbackMode = true;
      this.fallbackError = error instanceof Error ? error : new Error(String(error));
    }
  }

  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  getInitializationError(): Error | null {
    return this.fallbackError;
  }
}

export const monitoringSetup = new MonitoringSetup();

export async function initializeMonitoring(): Promise<void> {
  return monitoringSetup.initialize();
}