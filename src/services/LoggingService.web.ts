export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private readonly STORAGE_KEY = '@acucaradas:logs';
  private maxStoredLogs = 1000;

  private constructor() {}

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  info(message: string, context?: Record<string, any>): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      // console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      // console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

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
      ? { ...ctx, errorName: error.name, errorMessage: error.message }
      : ctx;

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, errorContext || '', error?.stack || '');
    }
    this.storeLog(LogLevel.ERROR, message, errorContext, error?.stack);
  }

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
      ? { ...ctx, errorName: error.name, errorMessage: error.message }
      : ctx;

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[FATAL] ${message}`, errorContext || '', error?.stack || '');
    }
    this.storeLog(LogLevel.FATAL, message, errorContext, error?.stack);
  }

  setUser(_userId: string, _userData?: Record<string, any>): void {
    // no-op on web stub
  }

  clearUser(): void {
    // no-op on web stub
  }

  async getLogs(): Promise<LogEntry[]> {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(this.STORAGE_KEY) : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  private async storeLog(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string
  ): Promise<void> {
    try {
      const logs = await this.getLogs();
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        stackTrace,
      };
      logs.push(entry);
      if (logs.length > this.maxStoredLogs) {
        logs.splice(0, logs.length - this.maxStoredLogs);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      }
    } catch {
      // ignore
    }
  }
}

export const loggingService = LoggingService.getInstance();
export default LoggingService;
