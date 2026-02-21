import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Níveis de log disponíveis
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Interface para um log estruturado
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

class LoggingService {
  private static instance: LoggingService;
  private isInitialized: boolean = false;
  private readonly STORAGE_KEY = '@acucaradas:logs';
  private maxStoredLogs: number = 1000;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private initialize(): void {
    if (this.isInitialized) return;

    const dsn = Constants.expoConfig?.extra?.sentryDsn;
    const environment = Constants.expoConfig?.extra?.environment || 'development';

    if (dsn) {
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: environment === 'production' ? 0.2 : 1.0,
        enableNative: true,
        enableNativeFramesTracking: true,
        enableNativeCrashHandling: true,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
      });
    }

    this.isInitialized = true;
  }

  info(message: string, context?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, context || '');
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      data: context,
      level: 'info',
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, context || '');
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      data: context,
      level: 'warning',
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error
      ? {
          ...context,
          errorName: error.name,
          errorMessage: error.message,
        }
      : context;

    console.error(`[ERROR] ${message}`, errorContext || '', error?.stack || '');

    if (error) {
      Sentry.captureException(error, {
        extra: errorContext,
      });
    } else {
      Sentry.captureException(new Error(message), {
        extra: errorContext,
      });
    }

    // Armazenar log localmente
    this.storeLog(LogLevel.ERROR, message, errorContext, error?.stack);
  }

  /**
   * Registra um erro fatal
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error
      ? {
          ...context,
          errorName: error.name,
          errorMessage: error.message,
        }
      : context;

    console.error(`[FATAL] ${message}`, errorContext || '', error?.stack || '');

    if (error) {
      Sentry.captureException(error, {
        level: 'fatal',
        extra: errorContext,
      });
    } else {
      Sentry.captureException(new Error(message), {
        level: 'fatal',
        extra: errorContext,
      });
    }

    // Armazenar log localmente
    this.storeLog(LogLevel.FATAL, message, errorContext, error?.stack);
  }

  setUser(userId: string, userData?: Record<string, any>): void {
    Sentry.setUser({
      id: userId,
      ...userData,
    });
  }

  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Registra um log específico para o sistema de busca
   * @param message - Mensagem a ser registrada
   * @param searchParams - Parâmetros da busca
   * @param error - Erro opcional
   */
  searchError(message: string, searchParams?: any, error?: Error): void {
    this.error(`Erro no sistema de busca: ${message}`, error, {
      component: 'SearchSystem',
      searchParams: this.sanitizeSearchParams(searchParams),
    });
  }

  /**
   * Registra um log de performance do sistema de busca
   * @param operation - Operação realizada
   * @param durationMs - Duração em milissegundos
   * @param params - Parâmetros adicionais
   */
  searchPerformance(operation: string, durationMs: number, params?: any): void {
    this.info(`Performance de busca: ${operation} (${durationMs}ms)`, {
      component: 'SearchSystem',
      operation,
      durationMs,
      ...this.sanitizeSearchParams(params),
    });
  }

  /**
   * Obtém os logs armazenados
   * @returns Promise com array de logs
   */
  async getLogs(): Promise<LogEntry[]> {
    try {
      const storedLogs = await AsyncStorage.getItem(this.STORAGE_KEY);
      return storedLogs ? JSON.parse(storedLogs) : [];
    } catch (error) {
      console.error('Erro ao recuperar logs:', error);
      return [];
    }
  }

  /**
   * Limpa todos os logs armazenados
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
    }
  }

  /**
   * Armazena um log no AsyncStorage
   */
  private async storeLog(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        context,
        stackTrace,
      };

      const storedLogs = await this.getLogs();

      // Adicionar novo log e limitar o tamanho
      storedLogs.push(logEntry);
      if (storedLogs.length > this.maxStoredLogs) {
        storedLogs.shift(); // Remove o log mais antigo
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedLogs));
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }

  /**
   * Sanitiza parâmetros de busca para evitar logging de dados sensíveis
   */
  private sanitizeSearchParams(params?: any): any {
    if (!params) return {};

    // Cria uma cópia para não modificar o original
    const sanitized = { ...params };

    // Remove possíveis dados sensíveis
    const sensitiveFields = ['senha', 'password', 'token', 'apiKey', 'secret'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

export const loggingService = LoggingService.getInstance();
