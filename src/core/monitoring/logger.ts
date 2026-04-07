// 📊 src/core/monitoring/logger.ts
// Logger central de produção com eventos estruturados e sanitização.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { redact } from './redact';
import { enqueueLog } from './logQueue';
import { transportManager } from './TransportManager';

export type LogSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type LogType = 
  | 'APP_START' 
  | 'LOGIN_SUCCESS' 
  | 'LOGIN_ERROR' 
  | 'API_ERROR' 
  | 'FIREBASE_ERROR' 
  | 'JS_ERROR'
  | 'NAV_EVENT'
  | 'HEALTH_CHECK'
  | 'USER_ACTION'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
  | 'INIT_ERROR'
  | 'SELF_HEAL_ACTION';

export interface LogEntry {
  id: string;
  type: LogType;
  severity: LogSeverity;
  message: string;
  context?: string;
  screen?: string;
  timestamp: string;
  appVersion?: string;
  platform?: string;
  stack?: string;
  metadata?: Record<string, any>;
  fatal?: boolean;
}

const MAX_LOCAL_LOGS = 50;
const appVersion = Constants.expoConfig?.version || '0.0.0';
const platform = Platform.OS;

/**
 * Cria uma entrada de log estruturada e sanitizada.
 */
function createLogEntry(
  type: LogType,
  severity: LogSeverity,
  message: string,
  params?: {
    context?: string;
    screen?: string;
    metadata?: any;
    stack?: string;
    fatal?: boolean;
  }
): LogEntry {
  return {
    id: Math.random().toString(36).substring(7),
    type,
    severity,
    message,
    context: params?.context,
    screen: params?.screen,
    timestamp: new Date().toISOString(),
    appVersion,
    platform,
    stack: params?.stack,
    metadata: redact(params?.metadata),
    fatal: params?.fatal,
  };
}

/**
 * Persiste o log localmente no AsyncStorage.
 */
async function persistLogLocally(entry: LogEntry) {
  try {
    const storedLogs = await AsyncStorage.getItem('@app_error_logs');
    let logs: LogEntry[] = storedLogs ? JSON.parse(storedLogs) : [];
    
    // Adicionar no início e limitar tamanho
    logs.unshift(entry);
    logs = logs.slice(0, MAX_LOCAL_LOGS);
    
    await AsyncStorage.setItem('@app_error_logs', JSON.stringify(logs));
  } catch (error) {
    // Falha silenciosa para evitar loops
  }
}

/**
 * Log genérico estruturado.
 */
export async function log(
  type: LogType,
  severity: LogSeverity,
  message: string,
  params?: any
) {
  const entry = createLogEntry(type, severity, message, params);

  // Console output formatado
  const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '🔥' : severity === 'MEDIUM' ? '⚠️' : '📊';
  const consoleMethod = severity === 'LOW' ? 'log' : severity === 'MEDIUM' ? 'warn' : 'error';
  
  console[consoleMethod](`${emoji} [${type}:${severity}] ${message}`, entry.metadata || '');

  // Persistência local (Buffer)
  await persistLogLocally(entry);

  // Enfileirar para envio remoto (Etapa 3)
  await enqueueLog(entry);

  // Se o log for de alta severidade, tentar enviar imediatamente
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    transportManager.flushLogs();
  }
}

// Helpers de nível (Etapa 9)
export const logInfo = (type: LogType, msg: string, data?: any) => log(type, 'LOW', msg, { metadata: data });
export const logWarning = (type: LogType, msg: string, data?: any) => log(type, 'MEDIUM', msg, { metadata: data });
export const logError = (type: LogType, msg: string, data?: any) => log(type, 'HIGH', msg, { metadata: data });
export const logCritical = (type: LogType, msg: string, data?: any) => log(type, 'CRITICAL', msg, { metadata: data, fatal: true });

// Retrocompatibilidade
export { log as logStructured };
export const logEvent = (type: LogType, message: string, data?: any) => logInfo(type, message, data);

/**
 * Recupera os últimos erros registrados localmente.
 */
export async function getLocalLogs(): Promise<LogEntry[]> {
  try {
    const storedLogs = await AsyncStorage.getItem('@app_error_logs');
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    return [];
  }
}
