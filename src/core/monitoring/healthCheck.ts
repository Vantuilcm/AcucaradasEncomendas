// 🧠 src/core/monitoring/healthCheck.ts
// Valida o estado de saúde do sistema e dependências.

import { Env } from '../../config/env';
import { logInfo, logCritical } from './logger';

export type HealthStatusLevel = 'ok' | 'warning' | 'critical';

export interface HealthCheckResult {
  status: HealthStatusLevel;
  checks: {
    env: boolean;
    firebase: boolean;
    apiUrl: boolean;
    onesignal: boolean;
  };
  warnings: string[];
  criticalErrors: string[];
}

/**
 * Executa uma verificação detalhada de integridade do app (Etapa 8).
 */
export function runHealthCheck(ENV: Env): HealthCheckResult {
  const result: HealthCheckResult = {
    status: 'ok',
    checks: {
      env: !!ENV,
      firebase: !!ENV.EXPO_PUBLIC_FIREBASE_API_KEY && !!ENV.EXPO_PUBLIC_FIREBASE_APP_ID,
      apiUrl: !!ENV.EXPO_PUBLIC_API_URL && !ENV.EXPO_PUBLIC_API_URL.includes('your-'),
      onesignal: !!ENV.EXPO_PUBLIC_ONESIGNAL_APP_ID && !ENV.EXPO_PUBLIC_ONESIGNAL_APP_ID.includes('your-'),
    },
    warnings: [],
    criticalErrors: [],
  };

  // Validações detalhadas
  if (!result.checks.env) {
    result.criticalErrors.push('Variáveis de ambiente (ENV) não carregadas.');
  }

  if (!result.checks.firebase) {
    result.criticalErrors.push('Firebase API Key ou App ID ausentes.');
  }

  if (!result.checks.apiUrl) {
    result.warnings.push('API URL não configurada ou usando valor padrão.');
  }

  if (!result.checks.onesignal) {
    result.warnings.push('OneSignal App ID não configurado.');
  }

  // Determinar status final
  if (result.criticalErrors.length > 0) {
    result.status = 'critical';
  } else if (result.warnings.length > 0) {
    result.status = 'warning';
  }

  // Logar resultado
  if (result.status === 'critical') {
    logCritical('HEALTH_CHECK', '🚨 Sistema em estado crítico', { 
      errors: result.criticalErrors,
      warnings: result.warnings 
    });
  } else if (result.status === 'warning') {
    logInfo('HEALTH_CHECK', '⚠️ Sistema com avisos', { 
      warnings: result.warnings 
    });
  } else {
    logInfo('HEALTH_CHECK', '✅ Sistema 100% Funcional', result.checks);
  }

  return result;
}
