import { Platform } from 'react-native';
import { loggingService } from '@/services/LoggingService';

export enum SecurityEventType {
  SCREENSHOT_ATTEMPT = 'screenshot_attempt',
  MULTIPLE_SCREENSHOT_ATTEMPTS = 'multiple_screenshot_attempts',
  TAMPERING_ATTEMPT = 'tampering_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  details: any;
  userId?: string;
  deviceInfo?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AppSecurityMonitoring {
  private static instance: AppSecurityMonitoring;
  private constructor() {}

  public static getInstance(): AppSecurityMonitoring {
    if (!AppSecurityMonitoring.instance) {
      AppSecurityMonitoring.instance = new AppSecurityMonitoring();
    }
    return AppSecurityMonitoring.instance;
  }

  public trackSecurityEvent(event: SecurityEvent): void {
    // Lógica compartilhada
    loggingService.warn(`Evento de segurança (${Platform.OS}): ${event.type}`, {
      securityEvent: event.type,
      severity: event.severity,
    });

    if (Platform.OS === 'android') {
      // Implementação específica Android (se houver) aqui
    } else {
      // Implementação específica iOS (Stub) aqui
    }
  }

  public getEventHistory(): SecurityEvent[] { return []; }
  public clearEventHistory(): void { }
}

export const securityMonitoring = AppSecurityMonitoring.getInstance();
