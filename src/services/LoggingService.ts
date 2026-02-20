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

export class LoggingService {
  private static instance: LoggingService;
  private isInitialized: boolean = false;
  private readonly STORAGE_KEY = '@acucaradas:logs';
  private maxStoredLogs: number = 1000;
  private readonly suppressErrorPatterns: RegExp[] = [
    /native crypto module could not be used/i,
    /missing or insufficient permissions/i,
    /requires an index/i,
    /cannot read property 'addevent/i,
    /cannot read properties of undefined \(reading 'addevent/i,
  ];

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
    this.isInitialized = true;
  }

  /**
   * Registra um log de reconciliação de pedido
   */
  logReconciliation(orderId: string, result: 'success' | 'failure' | 'cancelled', details?: any): void {
    const message = `[Reconciliation] Order ${orderId}: ${result.toUpperCase()}`;
    this.info(message, {
      orderId,
      result,
      ...details,
      type: 'payment_reconciliation',
      timestamp: new Date().toISOString()
    });

    if (result === 'failure') {
      this.error(`Falha na reconciliação do pedido ${orderId}`, details);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (__DEV__) {
      // Usamos console aqui por ser o serviço base de log, mas apenas em dev
      // console.info(`[INFO] ${message}`, context || '');
    }
    this.storeLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!__DEV__) return;
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, context || '');
    }
    this.storeLog(LogLevel.WARN, message, context);
  }

  /**
   * Registra um log de depuração
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!__DEV__) return;
    if (__DEV__) {
      // Usamos console aqui por ser o serviço base de log, mas apenas em dev
      // console.debug(`[DEBUG] ${message}`, context || '');
    }
    // Armazenar log localmente (opcional)
    this.storeLog(LogLevel.DEBUG, message, context);
  }

  /**
   * Registra um erro. Compatível com chamadas legadas que enviavam um objeto de contexto como segundo argumento.
   * Exemplos suportados:
   * - error(message, err)
   * - error(message, { error: err, foo: 'bar' })
   * - error(message, undefined, { foo: 'bar' })
   */
  error(
    message: string,
    errorOrContext?: Error | Record<string, any>,
    context?: Record<string, any>
  ): void {
    let error: Error | undefined = undefined;
    let ctx: Record<string, any> | undefined = context;

    if (errorOrContext) {
      if (errorOrContext instanceof Error) {
        error = errorOrContext;
      } else {
        // Merge legacy context passed as second argument
        ctx = { ...context, ...errorOrContext };
        const candidate = (errorOrContext as any).error;
        if (candidate instanceof Error) {
          error = candidate;
          // embed simple error fields and omit heavy object
          ctx = { ...ctx, errorName: candidate.name, errorMessage: candidate.message };
          try { delete (ctx as any).error; } catch {}
        }
      }
    }

    const errorContext = error
      ? {
          ...ctx,
          errorName: error.name,
          errorMessage: error.message,
        }
      : ctx;
    
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, errorContext || '', error?.stack || '');
    }

    const errorMessage = error?.message || (errorContext as any)?.errorMessage || '';
    if (!__DEV__ && this.shouldSuppressErrorMessage(errorMessage)) {
      return;
    }

    this.storeLog(LogLevel.ERROR, message, errorContext, error?.stack);
  }

  /**
   * Registra um erro fatal
   */
  fatal(
    message: string,
    errorOrContext?: Error | Record<string, any>,
    context?: Record<string, any>
  ): void {
    let error: Error | undefined = undefined;
    let ctx: Record<string, any> | undefined = context;

    if (errorOrContext) {
      if (errorOrContext instanceof Error) {
        error = errorOrContext;
      } else {
        ctx = { ...context, ...errorOrContext };
        const candidate = (errorOrContext as any).error;
        if (candidate instanceof Error) {
          error = candidate;
          ctx = { ...ctx, errorName: candidate.name, errorMessage: candidate.message };
          try { delete (ctx as any).error; } catch {}
        }
      }
    }

    const errorContext = error
      ? {
          ...ctx,
          errorName: error.name,
          errorMessage: error.message,
        }
      : ctx;

    if (__DEV__) {
      // Usamos console aqui por ser o serviço base de log, mas apenas em dev
      console.error(`[FATAL] ${message}`, errorContext || '', error?.stack || '');
    }

    const errorMessage = error?.message || (errorContext as any)?.errorMessage || '';
    if (!__DEV__ && this.shouldSuppressErrorMessage(errorMessage)) {
      return;
    }

    this.storeLog(LogLevel.FATAL, message, errorContext, error?.stack);
  }

  setUser(userId: string, userData?: Record<string, any>): void {
    void userId
    void userData
  }

  clearUser(): void {
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
    } catch (e) {
      if (__DEV__) {
        console.error('LoggingService: Erro ao recuperar logs:', e);
      }
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
      if (__DEV__) {
        console.error('LoggingService: Erro ao limpar logs:', error);
      }
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
      if (__DEV__) {
        console.error('LoggingService: Erro ao salvar log:', error);
      }
    }
  }

  private shouldSuppressErrorMessage(message?: string): boolean {
    if (!message) return false;
    return this.suppressErrorPatterns.some((pattern) => pattern.test(message));
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
export default LoggingService;
