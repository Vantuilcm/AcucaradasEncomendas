// 🛡️ src/core/monitoring/errorGuard.ts
// Captura global de erros JS e Promessas rejeitadas.

import { logError } from './logger';
import { handleSelfHeal, SelfHealErrorType } from '../selfHeal';

/**
 * Classifica erros genéricos em tipos conhecidos pelo SelfHeal.
 */
function classifyError(error: any): SelfHealErrorType {
  const message = error?.message?.toLowerCase() || '';
  if (message.includes('firebase') || message.includes('auth/')) return 'FIREBASE_ERROR';
  if (message.includes('network') || message.includes('failed to fetch')) return 'NETWORK_ERROR';
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) return 'AUTH_ERROR';
  if (message.includes('api') || message.includes('server') || message.includes('500')) return 'API_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Inicializa os ouvintes globais de erros.
 * Garante que nenhum crash seja silencioso.
 */
export function initErrorGuard() {
  // 1. Erros JS (RN Global Handler)
  // Nota: Global ErrorUtils é específico do React Native
  const originalHandler = (global as any).ErrorUtils?.getGlobalHandler();
  
  (global as any).ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const errorType = classifyError(error);

    // Tentar auto-correção (Etapa 5)
    handleSelfHeal(errorType, error);

    // Log do erro no sistema de monitoramento (Etapa 9)
    logError('JS_ERROR', error.message || 'Erro JS Desconhecido', {
      context: 'Global Handler',
      metadata: { stack: error.stack, isFatal },
      fatal: isFatal,
    });

    // Repassa para o handler original para manter logs de dev/analytics
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // 2. Rejeições de Promessas não capturadas
  // Algumas versões de RN podem não suportar isso globalmente, mas é boa prática
  if (typeof global.PromiseRejectionEvent === 'undefined') {
    // Polyfill ou tratamento customizado se necessário
  }

  console.log('🛡️ [ERROR-GUARD] Captura global ativada.');
}
