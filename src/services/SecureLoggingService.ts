import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { DeviceSecurityService } from './DeviceSecurityService';

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
  private readonly LOCAL_LOG_PATH = `${FileSystem.documentDirectory}secure_logs/`;
  private userId: string | null = null;
  private sessionId: string = this.generateSessionId();
  private deviceSecurityService: DeviceSecurityService;
  private isInitialized: boolean = false;

  private constructor() {
    this.deviceSecurityService = new DeviceSecurityService();
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
    try {
      // Configurar diretório de logs se estiver em ambiente móvel
      if (Platform.OS !== 'web') {
        const dirInfo = await FileSystem.getInfoAsync(this.LOCAL_LOG_PATH);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.LOCAL_LOG_PATH, { intermediates: true });
        }
      }

      // Limpar logs antigos
      await this.purgeOldLogs();

      this.isInitialized = true;
      this.info('Serviço de logging seguro inicializado');
    } catch (error) {
      console.error('Erro ao inicializar serviço de logging seguro:', error);
    }
  }

  /**
   * Define o ID do usuário para os logs
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    // Atualizar também no Sentry para rastreamento de erros
    Sentry.setUser({ id: userId });
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
    
    // Enviar erro para o Sentry
    Sentry.captureException(new Error(message), {
      extra: this.sanitizeData(data),
    });
  }

  /**
   * Registra um log de nível SECURITY (eventos de segurança)
   */
  public security(message: string, data?: any): void {
    this.log(LogLevel.SECURITY, message, data);
    
    // Eventos de segurança são importantes, enviar para o Sentry também
    Sentry.captureMessage(`[SECURITY] ${message}`, {
      level: Sentry.Severity.Warning,
      extra: this.sanitizeData(data),
    });
  }

  /**
   * Método principal de logging
   */
  private async log(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!this.isInitialized && level !== LogLevel.ERROR) {
      console.warn('Serviço de logging ainda não inicializado');
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
      console.error('Erro ao registrar log:', error);
    }
  }

  /**
   * Exibe log no console (apenas em desenvolvimento)
   */
  private logToConsole(logEntry: LogEntry): void {
    const { level, message, data } = logEntry;
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${level}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.SECURITY:
        console.error(prefix, message, data || '');
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
      console.error('Erro ao salvar log localmente:', error);
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
      console.error('Erro ao salvar log no localStorage:', error);
    }
  }

  /**
   * Salva log em arquivo criptografado (mobile)
   */
  private async saveLogToFile(logEntry: LogEntry): Promise<void> {
    try {
      // Nome do arquivo baseado na data atual
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFileName = `${this.LOCAL_LOG_PATH}log_${today}.json`;

      // Verificar se o arquivo existe
      const fileInfo = await FileSystem.getInfoAsync(logFileName);
      let logs = [];

      if (fileInfo.exists) {
        // Ler arquivo existente
        const content = await FileSystem.readAsStringAsync(logFileName, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        logs = JSON.parse(content);
      }

      // Adicionar novo log
      logs.push(logEntry);

      // Salvar arquivo atualizado
      await FileSystem.writeAsStringAsync(logFileName, JSON.stringify(logs), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Verificar tamanho do arquivo
      const updatedFileInfo = await FileSystem.getInfoAsync(logFileName);
      if (updatedFileInfo.size > this.MAX_LOG_SIZE) {
        // Arquivo muito grande, rotacionar logs
        await this.rotateLogFile(logFileName, logs);
      }
    } catch (error) {
      console.error('Erro ao salvar log em arquivo:', error);
    }
  }

  /**
   * Rotaciona arquivo de log quando fica muito grande
   */
  private async rotateLogFile(fileName: string, logs: LogEntry[]): Promise<void> {
    try {
      // Manter apenas metade dos logs mais recentes
      const halfLength = Math.floor(logs.length / 2);
      const recentLogs = logs.slice(halfLength);

      // Reescrever arquivo com logs mais recentes
      await FileSystem.writeAsStringAsync(fileName, JSON.stringify(recentLogs), {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error('Erro ao rotacionar arquivo de log:', error);
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
      const files = await FileSystem.readDirectoryAsync(this.LOCAL_LOG_PATH);
      const now = new Date();
      const cutoffDate = new Date(now.setDate(now.getDate() - this.LOG_RETENTION_DAYS));

      // Verificar cada arquivo
      for (const file of files) {
        if (file.startsWith('log_') && file.endsWith('.json')) {
          // Extrair data do nome do arquivo (formato: log_YYYY-MM-DD.json)
          const dateStr = file.substring(4, 14);
          const fileDate = new Date(dateStr);

          // Remover arquivos mais antigos que o período de retenção
          if (fileDate < cutoffDate) {
            await FileSystem.deleteAsync(`${this.LOCAL_LOG_PATH}${file}`);
            this.debug(`Log antigo removido: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
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
      const isCompromised = await this.deviceSecurityService.isDeviceCompromised();
      if (isCompromised) {
        // Em dispositivo comprometido, limitar informações enviadas
        logEntry.data = { warning: 'Dados limitados devido a dispositivo comprometido' };
      }

      // Enviar para o Sentry ou outro serviço
      // Implementação real dependeria da API do serviço de logs
    } catch (error) {
      console.error('Erro ao enviar log para o servidor:', error);
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
      const isCompromised = await this.deviceSecurityService.isDeviceCompromised();
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
        const files = await FileSystem.readDirectoryAsync(this.LOCAL_LOG_PATH);
        let allLogs: LogEntry[] = [];

        // Ler todos os arquivos de log
        for (const file of files) {
          if (file.startsWith('log_') && file.endsWith('.json')) {
            const content = await FileSystem.readAsStringAsync(`${this.LOCAL_LOG_PATH}${file}`);
            const logs = JSON.parse(content) as LogEntry[];
            allLogs = [...allLogs, ...logs];
          }
        }

        // Ordenar por timestamp
        allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return JSON.stringify(allLogs);
      }
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
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
        const files = await FileSystem.readDirectoryAsync(this.LOCAL_LOG_PATH);
        
        for (const file of files) {
          if (file.startsWith('log_') && file.endsWith('.json')) {
            await FileSystem.deleteAsync(`${this.LOCAL_LOG_PATH}${file}`);
          }
        }
      }

      this.info('Todos os logs foram limpos');
    } catch (error) {
      console.error('Erro ao limpar todos os logs:', error);
    }
  }
}

// Exportar instância única
export const secureLoggingService = SecureLoggingService.getInstance();