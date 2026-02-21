/**
 * Sistema de monitoramento de segurança
 * Responsável por monitorar e alertar sobre eventos de segurança
 */

import { loggingService } from '../services/LoggingService';
import securityConfig from '../config/securityConfig';

// Tipos de eventos de segurança monitorados
export enum SecurityEventType {
  SCREENSHOT_ATTEMPT = 'screenshot_attempt',
  MULTIPLE_SCREENSHOT_ATTEMPTS = 'multiple_screenshot_attempts',
  TAMPERING_ATTEMPT = 'tampering_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

// Interface para eventos de segurança
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  details: any;
  userId?: string;
  deviceInfo?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Configuração de alertas
interface AlertConfig {
  enabled: boolean;
  threshold?: number; // Número de eventos antes de disparar alerta
  cooldownPeriod?: number; // Período em ms para resetar contagem
  notifyUser?: boolean; // Notificar o usuário sobre o alerta
  notifyAdmin?: boolean; // Notificar administradores
}

// Configuração de alertas por tipo de evento
const alertConfigs: Record<SecurityEventType, AlertConfig> = {
  [SecurityEventType.SCREENSHOT_ATTEMPT]: {
    enabled: true,
    threshold: 1,
    cooldownPeriod: 60000, // 1 minuto
    notifyUser: true,
    notifyAdmin: false,
  },
  [SecurityEventType.MULTIPLE_SCREENSHOT_ATTEMPTS]: {
    enabled: true,
    threshold: 3,
    cooldownPeriod: 300000, // 5 minutos
    notifyUser: true,
    notifyAdmin: true,
  },
  [SecurityEventType.TAMPERING_ATTEMPT]: {
    enabled: true,
    threshold: 1,
    notifyUser: false,
    notifyAdmin: true,
  },
  [SecurityEventType.SUSPICIOUS_ACTIVITY]: {
    enabled: true,
    threshold: 2,
    cooldownPeriod: 3600000, // 1 hora
    notifyUser: false,
    notifyAdmin: true,
  },
  [SecurityEventType.UNAUTHORIZED_ACCESS]: {
    enabled: true,
    threshold: 1,
    notifyUser: true,
    notifyAdmin: true,
  },
};

// Contadores de eventos por tipo
const eventCounters: Record<SecurityEventType, number> = {
  [SecurityEventType.SCREENSHOT_ATTEMPT]: 0,
  [SecurityEventType.MULTIPLE_SCREENSHOT_ATTEMPTS]: 0,
  [SecurityEventType.TAMPERING_ATTEMPT]: 0,
  [SecurityEventType.SUSPICIOUS_ACTIVITY]: 0,
  [SecurityEventType.UNAUTHORIZED_ACCESS]: 0,
};

// Timestamps do último evento por tipo
const lastEventTimestamps: Record<SecurityEventType, number> = {
  [SecurityEventType.SCREENSHOT_ATTEMPT]: 0,
  [SecurityEventType.MULTIPLE_SCREENSHOT_ATTEMPTS]: 0,
  [SecurityEventType.TAMPERING_ATTEMPT]: 0,
  [SecurityEventType.SUSPICIOUS_ACTIVITY]: 0,
  [SecurityEventType.UNAUTHORIZED_ACCESS]: 0,
};

// Histórico de eventos para análise
const eventHistory: SecurityEvent[] = [];

/**
 * Classe para monitoramento de segurança
 */
export class SecurityMonitoring {
  private static instance: SecurityMonitoring;

  private constructor() {}

  /**
   * Obtém a instância única da classe (Singleton)
   */
  public static getInstance(): SecurityMonitoring {
    if (!SecurityMonitoring.instance) {
      SecurityMonitoring.instance = new SecurityMonitoring();
    }
    return SecurityMonitoring.instance;
  }

  /**
   * Registra um evento de segurança e dispara alertas se necessário
   */
  public trackSecurityEvent(event: SecurityEvent): void {
    try {
      // Registrar evento no histórico
      eventHistory.push(event);
      
      // Limitar tamanho do histórico
      if (eventHistory.length > 100) {
        eventHistory.shift();
      }

      // Registrar no sistema de logs
      loggingService.warn(`Evento de segurança detectado: ${event.type}`, {
        securityEvent: event.type,
        severity: event.severity,
        details: event.details,
      });

      // Verificar configuração de alertas para o tipo de evento
      const config = alertConfigs[event.type];
      if (!config || !config.enabled) return;

      // Verificar período de cooldown
      const now = Date.now();
      const lastTimestamp = lastEventTimestamps[event.type];
      if (config.cooldownPeriod && lastTimestamp && now - lastTimestamp < config.cooldownPeriod) {
        // Incrementar contador dentro do período de cooldown
        eventCounters[event.type]++;
      } else {
        // Resetar contador se passou do período de cooldown
        eventCounters[event.type] = 1;
      }

      // Atualizar timestamp do último evento
      lastEventTimestamps[event.type] = now;

      // Verificar se atingiu o limite para alerta
      if (eventCounters[event.type] >= (config.threshold || 1)) {
        this.triggerAlert(event);
        
        // Resetar contador após disparar alerta
        eventCounters[event.type] = 0;
      }
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      loggingService.error('Erro ao processar evento de segurança', {
        error: extError,
        component: 'SecurityMonitoring',
      });
    }
  }

  /**
   * Dispara um alerta com base no evento de segurança
   */
  private triggerAlert(event: SecurityEvent): void {
    try {
      const config = alertConfigs[event.type];

      // Registrar alerta no sistema de logs
      loggingService.warn(`Alerta de segurança: ${event.type}`, {
        securityAlert: event.type,
        severity: event.severity,
        details: event.details,
      });

      // Enviar alerta para o servidor
      this.sendAlertToServer(event);

      // Notificar usuário se configurado
      if (config.notifyUser) {
        this.notifyUser(event);
      }

      // Notificar administradores se configurado
      if (config.notifyAdmin) {
        this.notifyAdmins(event);
      }
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      loggingService.error('Erro ao disparar alerta de segurança', {
        error: extError,
        component: 'SecurityMonitoring',
      });
    }
  }

  /**
   * Envia alerta para o servidor
   */
  private sendAlertToServer(event: SecurityEvent): void {
    try {
      // Implementar lógica para enviar alerta ao servidor
      fetch('/api/security/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: event.type,
          timestamp: event.timestamp,
          details: event.details,
          user_id: event.userId,
          device_info: event.deviceInfo,
          severity: event.severity,
        }),
      }).catch((error) => {
        // Silenciar erros de rede para não interromper a experiência do usuário
        loggingService.error('Erro ao enviar alerta para o servidor', {
          error,
          component: 'SecurityMonitoring',
        });
      });
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      loggingService.error('Erro ao enviar alerta para o servidor', {
        error: extError,
        component: 'SecurityMonitoring',
      });
    }
  }

  /**
   * Notifica o usuário sobre o evento de segurança
   */
  private notifyUser(event: SecurityEvent): void {
    try {
      // Implementar lógica para notificar o usuário (ex: toast, modal, etc)
      // Esta implementação depende da biblioteca de UI utilizada no projeto
      console.warn(`[ALERTA DE SEGURANÇA] ${this.getAlertMessage(event)}`);
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      loggingService.error('Erro ao notificar usuário', {
        error: extError,
        component: 'SecurityMonitoring',
      });
    }
  }

  /**
   * Notifica administradores sobre o evento de segurança
   */
  private notifyAdmins(event: SecurityEvent): void {
    try {
      // Implementar lógica para notificar administradores
      // Pode envolver envio de emails, notificações push, etc.
      loggingService.warn(`Notificação de administrador enviada: ${event.type}`, {
        securityAlert: event.type,
        severity: event.severity,
        details: event.details,
      });
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      loggingService.error('Erro ao notificar administradores', {
        error: extError,
        component: 'SecurityMonitoring',
      });
    }
  }

  /**
   * Obtém mensagem de alerta com base no tipo de evento
   */
  private getAlertMessage(event: SecurityEvent): string {
    switch (event.type) {
      case SecurityEventType.SCREENSHOT_ATTEMPT:
        return 'Tentativa de captura de tela detectada em conteúdo sensível.';
      case SecurityEventType.MULTIPLE_SCREENSHOT_ATTEMPTS:
        return 'Múltiplas tentativas de captura de tela detectadas. Esta atividade está sendo monitorada.';
      case SecurityEventType.TAMPERING_ATTEMPT:
        return 'Tentativa de adulteração do aplicativo detectada.';
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return 'Atividade suspeita detectada na sua conta.';
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        return 'Tentativa de acesso não autorizado detectada.';
      default:
        return 'Alerta de segurança: atividade suspeita detectada.';
    }
  }

  /**
   * Obtém histórico de eventos de segurança
   */
  public getEventHistory(): SecurityEvent[] {
    return [...eventHistory];
  }

  /**
   * Limpa histórico de eventos (útil para testes)
   */
  public clearEventHistory(): void {
    eventHistory.length = 0;
  }
}

// Exportar instância única
export const securityMonitoring = SecurityMonitoring.getInstance();