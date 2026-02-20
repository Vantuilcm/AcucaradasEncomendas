import LoggingService from './LoggingService';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class SecureLoggingService {
  private static instance: SecureLoggingService;
  private readonly STORAGE_KEY = 'secure_app_logs_web';
  private userId: string | null = null;
  private sessionId: string = this.generateSessionId();
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SecureLoggingService {
    if (!SecureLoggingService.instance) {
      SecureLoggingService.instance = new SecureLoggingService();
    }
    return SecureLoggingService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      this.isInitialized = true;
      // this.info('Serviço de logging (web) inicializado');
    } catch (error) {
      const logger = LoggingService.getInstance();
      logger.error('Erro ao inicializar serviço de logging (web)', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public security(message: string, data?: any): void {
    this.log(LogLevel.SECURITY, message, data);
  }

  private async log(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!this.isInitialized && level !== LogLevel.ERROR) {
      const logger = LoggingService.getInstance();
      logger.warn('Serviço de logging (web) ainda não inicializado');
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    };

    // Console output in dev via LoggingService
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      const logger = LoggingService.getInstance();
      const context = { ...this.sanitizeData(data), sessionId: this.sessionId, userId: this.userId };
      
      switch (level) {
        case LogLevel.DEBUG:
          logger.debug(`[SECURE-WEB] ${message}`, context);
          break;
        case LogLevel.INFO:
          logger.info(`[SECURE-WEB] ${message}`, context);
          break;
        case LogLevel.WARN:
          logger.warn(`[SECURE-WEB] ${message}`, context);
          break;
        case LogLevel.ERROR:
        case LogLevel.SECURITY:
          logger.error(`[SECURE-WEB] ${message}`, new Error(message), context);
          break;
      }
    } else if (level === LogLevel.ERROR || level === LogLevel.SECURITY) {
      const logger = LoggingService.getInstance();
      logger.error(`[SECURE-WEB] ${message}`, new Error(message), this.sanitizeData(data));
    }

    // Persist to localStorage
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(this.STORAGE_KEY);
        const logs: LogEntry[] = raw ? JSON.parse(raw) : [];
        logs.push(logEntry);
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      }
    } catch {
      // ignore storage errors
    }
  }

  private sanitizeData(data: any): any {
    if (data == null) return undefined;
    try {
      if (typeof data === 'object') {
        return JSON.parse(JSON.stringify(data));
      }
      return data;
    } catch {
      return undefined;
    }
  }
}

export const secureLoggingService = SecureLoggingService.getInstance();
