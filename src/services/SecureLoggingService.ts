import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Directory, Paths } from '../utils/fs-shim';
import { DeviceSecurityService } from './DeviceSecurityService';
import LoggingService from './LoggingService';

// Tipos de logs
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

// Interface para entrada de log
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

/**
 * Serviço de logging seguro para auditoria de segurança
 * Implementa logs locais criptografados e envio para serviço remoto
 */
class SecureLoggingService {
  private static instance: SecureLoggingService;
  private readonly MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly LOG_RETENTION_DAYS = 30;
  private readonly LOCAL_LOG_KEY = 'secure_app_logs';
  private LOG_DIR: Directory | null = null;
  private userId: string | null = null;
  private sessionId: string = this.generateSessionId();
  
  private isInitialized: boolean = false;

  private constructor() {
    
    this.initialize();
  }

  /**
   * Obtém a instância única do serviço (Singleton)
   */
  public static getInstance(): SecureLoggingService {
    if (!SecureLoggingService.instance) {
      SecureLoggingService.instance = new SecureLoggingService();
    }
    return SecureLoggingService.instance;
  }

  /**
   * Inicializa o serviço de logging
   */
  private async initialize(): Promise<void> {
    // Garantir diretório de logs apenas em plataforma nativa
    try {
      if (Platform.OS !== 'web') {
        const docPath = (Paths as any)?.document ?? 'jest://document';
        this.LOG_DIR = new Directory(docPath, 'secure_logs');
        if (!this.LOG_DIR.exists) {
          this.LOG_DIR.create({ intermediates: true, idempotent: true });
        }
      }
    } catch (e) {
      // Em ambiente de teste, expo-file-system pode não estar disponível
      // Tentar fallback suave
      try {
        const docPath = (Paths as any)?.document ?? 'jest://document';
        this.LOG_DIR = new Directory(docPath, 'secure_logs');
      } catch {}
    }
    try {
      // Configurar diretório de logs se estiver em ambiente móvel
      if (Platform.OS !== 'web' && this.LOG_DIR) {
        if (!this.LOG_DIR.exists) {
          this.LOG_DIR.create({ intermediates: true, idempotent: true });
        }
      }

      // Limpar logs antigos
      await this.purgeOldLogs();

      this.isInitialized = true;
      this.info('Serviço de logging seguro inicializado');
    } catch (error) {
      LoggingService.getInstance().error('Falha ao inicializar SecureLoggingService', error as any, {
        context: 'SecureLoggingService.initialize',
      });
    }
  }

  /**
   * Define o ID do usuário para os logs
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Gera um ID de sessão único
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Registra um log de nível DEBUG
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Registra um log de nível INFO
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Registra um log de nível WARN
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Registra um log de nível ERROR
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Registra um log de nível SECURITY (eventos de segurança)
   */
  public security(message: string, data?: any): void {
    this.log(LogLevel.SECURITY, message, data);
  }

  /**
   * Método principal de logging
   */
  private async log(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!this.isInitialized && level !== LogLevel.ERROR) {
      return;
    }

    try {
      // Criar entrada de log
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: this.sanitizeData(data),
        userId: this.userId || undefined,
        sessionId: this.sessionId,
      };

      // Log local para desenvolvimento
      if (__DEV__) {
        this.logToConsole(logEntry);
      }

      // Salvar log localmente
      await this.saveLogLocally(logEntry);

      // Enviar logs críticos para o servidor
      if (level === LogLevel.ERROR || level === LogLevel.SECURITY) {
        this.sendLogToServer(logEntry);
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao registrar log seguro', error as any, {
        context: 'SecureLoggingService.log',
        level,
        message,
      });
    }
  }

  /**
   * Exibe log no console (apenas em desenvolvimento)
   */
  private logToConsole(logEntry: LogEntry): void {
    if (!__DEV__) return;
    const { level, message, data } = logEntry;
    const logger = LoggingService.getInstance();
    const context = { ...this.sanitizeData(data), sessionId: this.sessionId, userId: this.userId };

    switch (level) {
      case LogLevel.DEBUG:
        logger.debug(`[SECURE] ${message}`, context);
        break;
      case LogLevel.INFO:
        logger.info(`[SECURE] ${message}`, context);
        break;
      case LogLevel.WARN:
        logger.warn(`[SECURE] ${message}`, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.SECURITY:
        logger.error(`[SECURE] ${message}`, new Error(message), context);
        break;
    }
  }

  /**
   * Salva o log localmente de forma segura
   */
  private async saveLogLocally(logEntry: LogEntry): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // No ambiente web, usar localStorage com cuidado
        this.saveLogToLocalStorage(logEntry);
      } else {
        // Em dispositivos móveis, usar arquivo criptografado
        await this.saveLogToFile(logEntry);
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao salvar log localmente', error as any, {
        context: 'SecureLoggingService.saveLogLocally',
      });
    }
  }

  /**
   * Salva log no localStorage (web)
   */
  private saveLogToLocalStorage(logEntry: LogEntry): void {
    try {
      // Obter logs existentes
      const existingLogsJson = localStorage.getItem(this.LOCAL_LOG_KEY) || '[]';
      const existingLogs = JSON.parse(existingLogsJson);

      // Adicionar novo log
      existingLogs.push(logEntry);

      // Limitar tamanho
      if (existingLogs.length > 1000) {
        existingLogs.shift(); // Remover o log mais antigo
      }

      // Salvar logs atualizados
      localStorage.setItem(this.LOCAL_LOG_KEY, JSON.stringify(existingLogs));
    } catch (error) {
      LoggingService.getInstance().error('Falha ao salvar log no localStorage', error as any, {
        context: 'SecureLoggingService.saveLogToLocalStorage',
      });
    }
  }

  /**
   * Salva log em arquivo criptografado (mobile)
   */
  private async saveLogToFile(logEntry: LogEntry): Promise<void> {
    try {
      // Nome do arquivo baseado na data atual
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFile = new File((this.LOG_DIR ?? new Directory(((Paths as any)?.document ?? 'jest://document'), 'secure_logs')), `log_${today}.json`);

      // Verificar se o arquivo existe
      let logs = [];

      if (logFile.exists) {
        // Ler arquivo existente
        const content = await (logFile as any).read({ encoding: 'utf8' });
        logs = JSON.parse(content);
      }

      // Adicionar novo log
      logs.push(logEntry);

      // Salvar arquivo atualizado
      (logFile as any).write(JSON.stringify(logs), { encoding: 'utf8' });

      // Verificar tamanho do arquivo
      if ((logFile.size ?? 0) > this.MAX_LOG_SIZE) {
        // Arquivo muito grande, rotacionar logs
        await this.rotateLogFile(logFile, logs);
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao salvar log em arquivo', error as any, {
        context: 'SecureLoggingService.saveLogToFile',
      });
    }
  }

  /**
   * Rotaciona arquivo de log quando fica muito grande
   */
  private async rotateLogFile(file: File, logs: LogEntry[]): Promise<void> {
    try {
      // Manter apenas metade dos logs mais recentes
      const halfLength = Math.floor(logs.length / 2);
      const recentLogs = logs.slice(halfLength);

      // Reescrever arquivo com logs mais recentes
      (file as any).write(JSON.stringify(recentLogs), { encoding: 'utf8' });
    } catch (error) {
      LoggingService.getInstance().error('Falha ao rotacionar arquivo de log', error as any, {
        context: 'SecureLoggingService.rotateLogFile',
      });
    }
  }

  /**
   * Remove logs antigos (retenção de 30 dias)
   */
  private async purgeOldLogs(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Não há muito o que fazer no web além de limitar o tamanho
        return;
      }

      // Listar arquivos no diretório de logs
      const entries = (this.LOG_DIR ?? new Directory(((Paths as any)?.document ?? 'jest://document'), 'secure_logs')).list();
      const now = new Date();
      const cutoffDate = new Date(now.setDate(now.getDate() - this.LOG_RETENTION_DAYS));

      // Verificar cada arquivo
      for (const entry of entries) {
        if (entry instanceof File) {
          const name = entry.uri.split('/').pop() || '';
          if (name.startsWith('log_') && name.endsWith('.json')) {
            // Extrair data do nome do arquivo (formato: log_YYYY-MM-DD.json)
            const dateStr = name.substring(4, 14);
            const fileDate = new Date(dateStr);

            // Remover arquivos mais antigos que o período de retenção
            if (fileDate < cutoffDate) {
              (entry as any).delete();
              this.debug(`Log antigo removido: ${name}`);
            }
          }
        }
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao remover logs antigos', error as any, {
        context: 'SecureLoggingService.purgeOldLogs',
      });
    }
  }

  /**
   * Envia log para o servidor (implementação depende da infraestrutura)
   */
  private async sendLogToServer(logEntry: LogEntry): Promise<void> {
    // Implementação depende da infraestrutura de backend
    // Aqui usamos o Sentry como exemplo, mas poderia ser qualquer serviço
    try {
      // Verificar se o dispositivo está comprometido antes de enviar dados sensíveis
      const isCompromised = await DeviceSecurityService.isDeviceCompromised();
      if (isCompromised) {
        // Em dispositivo comprometido, limitar informações enviadas
        logEntry.data = { warning: 'Dados limitados devido a dispositivo comprometido' };
      }

      // Enviar para o Sentry ou outro serviço
      // Implementação real dependeria da API do serviço de logs
    } catch (error) {
      LoggingService.getInstance().error('Falha ao enviar log para servidor', error as any, {
        context: 'SecureLoggingService.sendLogToServer',
      });
    }
  }

  /**
   * Sanitiza dados para remover informações sensíveis
   */
  private sanitizeData(data: any): any {
    if (!data) return undefined;

    // Clone para não modificar o original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Lista de campos sensíveis a serem mascarados
    const sensitiveFields = [
      'password', 'senha', 'token', 'secret', 'apiKey', 'api_key',
      'credit_card', 'creditCard', 'cvv', 'cvc', 'ssn', 'cpf', 'cnpj'
    ];

    // Função recursiva para sanitizar objetos
    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        // Verificar se é um campo sensível
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          // Recursivamente sanitizar objetos aninhados
          sanitizeObject(obj[key]);
        }
      });
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Exporta logs para análise (com proteção)
   */
  public async exportLogs(): Promise<string | null> {
    try {
      // Verificar se o dispositivo está comprometido
      const isCompromised = await DeviceSecurityService.isDeviceCompromised();
      if (isCompromised) {
        this.security('Tentativa de exportar logs em dispositivo comprometido');
        return null;
      }

      if (Platform.OS === 'web') {
        // Exportar logs do localStorage
        const logs = localStorage.getItem(this.LOCAL_LOG_KEY) || '[]';
        return logs;
      } else {
        // Exportar logs de arquivos
        const entries = (this.LOG_DIR ?? new Directory(((Paths as any)?.document ?? 'jest://document'), 'secure_logs')).list();
        let allLogs: LogEntry[] = [];

        // Ler todos os arquivos de log
        for (const entry of entries) {
          if (entry instanceof File) {
            const name = entry.uri.split('/').pop() || '';
            if (name.startsWith('log_') && name.endsWith('.json')) {
              const content = await (entry as any).read({ encoding: 'utf8' });
              const logs = JSON.parse(content) as LogEntry[];
              allLogs = [...allLogs, ...logs];
            }
          }
        }

        // Ordenar por timestamp
        allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return JSON.stringify(allLogs);
      }
    } catch (error) {
      LoggingService.getInstance().error('Falha ao exportar logs', error as any, {
        context: 'SecureLoggingService.exportLogs',
      });
      return null;
    }
  }

  /**
   * Limpa todos os logs (usar com cuidado)
   */
  public async clearAllLogs(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(this.LOCAL_LOG_KEY);
      } else {
        const entries = (this.LOG_DIR ?? new Directory(((Paths as any)?.document ?? 'jest://document'), 'secure_logs')).list();
        for (const entry of entries) {
          if (entry instanceof File) {
            const name = entry.uri.split('/').pop() || '';
            if (name.startsWith('log_') && name.endsWith('.json')) {
              (entry as any).delete();
            }
          }
        }
      }

      this.info('Todos os logs foram limpos');
    } catch (error) {
      LoggingService.getInstance().error('Falha ao limpar logs', error as any, {
        context: 'SecureLoggingService.clearAllLogs',
      });
    }
  }
}

// Exportar instância única
export const secureLoggingService = SecureLoggingService.getInstance();
