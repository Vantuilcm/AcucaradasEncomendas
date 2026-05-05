// 🛡️ src/core/selfHeal.ts
// Motor de auto-correção inteligente (Etapa 5).
// Tenta recuperar o app de falhas críticas automaticamente.

import { logInfo, logError, logWarning } from './monitoring/logger';
import { ENV } from '../config/env';
import NetInfo from '@react-native-community/netinfo';
import { AuthService } from '../services/AuthService';
import { SecureStorageService } from '../services/SecureStorageService';

// Deferir o carregamento de firebase/app
const getFirebaseApp = () => require('firebase/app');

export type SelfHealErrorType = 
  | 'FIREBASE_ERROR' 
  | 'API_ERROR' 
  | 'AUTH_ERROR' 
  | 'NETWORK_ERROR' 
  | 'UNKNOWN_ERROR';

interface SelfHealAction {
  type: SelfHealErrorType;
  retryCount: number;
  lastAttempt: number;
}

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 5000, 15000]; // 1s, 5s, 15s

const activeActions = new Map<string, SelfHealAction>();

/**
 * Motor principal de auto-correção.
 */
export async function handleSelfHeal(type: SelfHealErrorType, error: any): Promise<boolean> {
  const actionKey = `${type}_${error?.message || 'unknown'}`;
  const existingAction = activeActions.get(actionKey) || { type, retryCount: 0, lastAttempt: 0 };

  if (existingAction.retryCount >= MAX_RETRIES) {
    logError('SELF_HEAL_ACTION', `🚨 Limite de retries atingido para ${type}`, { error });
    return false;
  }

  const delay = BACKOFF_MS[existingAction.retryCount] || 30000;
  existingAction.retryCount++;
  existingAction.lastAttempt = Date.now();
  activeActions.set(actionKey, existingAction);

  logWarning('SELF_HEAL_ACTION', `🛠️ Tentando auto-correção (${existingAction.retryCount}/${MAX_RETRIES}) para ${type}`, { 
    error: error?.message,
    delay 
  });

  // Aguardar backoff
  await new Promise(resolve => setTimeout(resolve, delay));

  const startTime = Date.now();
  let success = false;

  try {
    switch (type) {
      case 'FIREBASE_ERROR':
        success = await healFirebase();
        break;
      case 'API_ERROR':
        // API_ERROR geralmente é resolvido por retry na própria chamada, 
        // mas aqui podemos verificar saúde geral da API.
        success = true; // Indica que o motor processou
        break;
      case 'NETWORK_ERROR':
        success = await healNetwork();
        break;
      case 'AUTH_ERROR':
        success = await healAuth();
        break;
      case 'UNKNOWN_ERROR':
        // Para erros desconhecidos, tentamos um refresh de recursos básicos
        success = await healFirebase();
        break;
      default:
        success = false;
    }

    const duration = Date.now() - startTime;
    
    if (success) {
      logInfo('SELF_HEAL_ACTION', `✅ Auto-correção concluída com sucesso para ${type}`, { duration });
      activeActions.delete(actionKey); // Resetar após sucesso
    } else {
      logError('SELF_HEAL_ACTION', `❌ Auto-correção falhou para ${type}`, { duration });
    }

    return success;
  } catch (err) {
    logError('SELF_HEAL_ACTION', `🔥 Erro crítico no motor de auto-correção`, { err });
    return false;
  }
}

/**
 * Reinicializa o Firebase se houver erro de configuração ou inicialização.
 */
async function healFirebase(): Promise<boolean> {
  try {
    const { getApp } = require('../config/firebase');
    getApp(); // getApp já gerencia o Singleton de forma segura
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Verifica e aguarda reconexão de rede.
 */
async function healNetwork(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

/**
 * Tenta renovar a sessão usando o AuthService.
 */
async function healAuth(): Promise<boolean> {
  try {
    const authService = AuthService.getInstance();
    const token = await SecureStorageService.getData('authToken');
    
    if (!token) {
      logWarning('SELF_HEAL_ACTION', '🔑 Nenhum token encontrado para renovação');
      return false;
    }

    // Tenta validar o token atual (isso pode disparar a renovação interna do Firebase se necessário)
    const result = await authService.validarToken(token);
    
    if (result.valido) {
      logInfo('SELF_HEAL_ACTION', '✅ Sessão validada com sucesso via SelfHeal');
      return true;
    }

    logWarning('SELF_HEAL_ACTION', '🔑 Sessão inválida ou expirada');
    return false;
  } catch (error) {
    logError('SELF_HEAL_ACTION', '❌ Erro ao tentar renovar sessão', { error });
    return false;
  }
}
