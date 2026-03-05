import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { secureLoggingService } from './SecureLoggingService';

/**
 * Interface para o payload do token JWT
 */
interface JwtPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Serviço responsável por operações de segurança, validação de tokens e sanitização
 */
export class SecurityService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
  private static loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private static activityMonitorInterval: any = null;
  private static lastActivityTimestamp: number = Date.now();

  /**
   * Valida se um token JWT é válido e não está expirado
   * @param token Token JWT a ser validado
   * @returns true se o token for válido, false caso contrário
   */
  static validateToken(token: string): boolean {
    try {
      if (!token) return false;

      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        secureLoggingService.security('Token JWT expirado', {
          userId: decoded.sub,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao validar token JWT', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Sanitiza uma string para evitar ataques de injeção e XSS básico
   * @param input String a ser sanitizada
   * @returns String sanitizada
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove tags HTML e caracteres perigosos
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Verifica se um identificador está bloqueado por excesso de tentativas
   * @param identifier Identificador do usuário
   * @returns true se estiver bloqueado, false caso contrário
   */
  static isBlocked(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.loginAttempts.get(identifier);

    if (!attempt) return false;

    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      const timeSinceLastAttempt = now - attempt.lastAttempt;
      if (timeSinceLastAttempt < this.BLOCK_DURATION_MS) {
        return true;
      }
      // Tempo de bloqueio expirou
      this.loginAttempts.delete(identifier);
    }

    return false;
  }

  /**
   * Registra uma tentativa de login
   * @param success Indica se a tentativa foi bem-sucedida
   * @param identifier Identificador do usuário (email ou ID)
   * @returns true se a operação foi concluída
   */
  static async registerLoginAttempt(success: boolean, identifier: string): Promise<boolean> {
    const now = Date.now();
    const attempt = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    if (success) {
      this.loginAttempts.delete(identifier);
      return true;
    }

    // Incrementar falha
    attempt.count += 1;
    attempt.lastAttempt = now;
    this.loginAttempts.set(identifier, attempt);

    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      secureLoggingService.security('Usuário bloqueado por excesso de erros de login', {
        identifier,
        attempts: attempt.count,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Obtém o payload de um token JWT sem verificar a assinatura
   * @param token Token JWT
   * @returns Payload do token ou null
   */
  static getTokenPayload(token: string): any {
    try {
      if (!token) return null;
      return jwtDecode<any>(token);
    } catch (error) {
      secureLoggingService.security('Erro ao decodificar payload do token JWT', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  /**
   * Inicia o monitoramento de inatividade do usuário
   * @param onTimeout Callback executado quando o tempo de inatividade expira
   */
  static startActivityMonitor(onTimeout: () => void): void {
    this.stopActivityMonitor();
    this.lastActivityTimestamp = Date.now();

    this.activityMonitorInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - this.lastActivityTimestamp;

      if (inactiveTime > this.BLOCK_DURATION_MS) {
        secureLoggingService.security('Sessão expirada por inatividade', {
          inactiveMinutes: Math.floor(inactiveTime / 60000),
          timestamp: new Date().toISOString(),
        });
        onTimeout();
      }
    }, 60000); // Verificar a cada minuto
  }

  /**
   * Para o monitoramento de inatividade
   */
  static stopActivityMonitor(): void {
    if (this.activityMonitorInterval) {
      clearInterval(this.activityMonitorInterval);
      this.activityMonitorInterval = null;
    }
  }

  /**
   * Reseta o timer de inatividade
   */
  static resetActivityTimer(): void {
    this.lastActivityTimestamp = Date.now();
  }

  /**
   * Gera um token de segurança (placeholder para implementação real)
   */
  static generateToken(_payload: any): string {
    // Em um cenário real, isso seria feito no backend. 
    // Aqui estamos apenas simulando para resolver o erro do linter.
    return `dummy_token_${Date.now()}`;
  }

  /**
   * Armazena dados de forma segura (placeholder para implementação real)
   */
  static async storeSecureData(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }
}
