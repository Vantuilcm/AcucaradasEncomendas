import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import jwt_decode from 'jwt-decode';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { secureLoggingService } from './SecureLoggingService';

// Interface para o payload do JWT
interface JwtPayload {
  exp: number;
  sub: string;
  iat: number;
  id?: string;
  email?: string;
}

// Interface para controle de tentativas de login
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blocked: boolean;
  blockExpires: number;
}

// Interface para registro de dispositivos confiáveis
interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  lastAccess: number;
  ip?: string;
  browser?: string;
  os?: string;
}

export class SecurityService {
  private static readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private static readonly SESSION_TIMEOUT_KEY = 'session_timeout';
  private static readonly TRUSTED_DEVICES_KEY = 'trusted_devices';
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
  private static readonly ACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private static readonly MAX_TRUSTED_DEVICES = 5;

  private static loginAttempts: LoginAttempt | null = null;
  private static activityTimer: NodeJS.Timeout | null = null;
  private static lastActivity: number = Date.now();
  private static deviceId: string | null = null;

  // Obter identificador único do dispositivo
  static async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    // Tenta recuperar o ID do dispositivo do armazenamento
    let storedId = await this.getSecureData('device_id');

    if (!storedId) {
      // Gera um novo ID se não existir
      storedId = await this.generateUniqueDeviceId();
      await this.storeSecureData('device_id', storedId);
    }

    this.deviceId = storedId;
    return storedId;
  }

  // Gerar ID único para o dispositivo
  private static async generateUniqueDeviceId(): Promise<string> {
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const uniqueString = `${timestamp}-${randomPart}-${Platform.OS}`;

    return this.encryptData(uniqueString);
  }

  static async encryptData(data: string) {
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
    return key;
  }

  static async storeSecureData(key: string, value: string) {
    if (Platform.OS === 'web') {
      // Em ambiente web, usar localStorage com criptografia básica
      const encryptedValue = await this.encryptData(value);
      localStorage.setItem(key, encryptedValue);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }

  static async getSecureData(key: string) {
    if (Platform.OS === 'web') {
      // Em ambiente web, recuperar e descriptografar
      const value = localStorage.getItem(key);
      return value;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  }

  static async deleteSecureData(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }

  // Validação de token JWT do lado cliente
  static validateToken(token: string): boolean {
    try {
      if (!token) return false;

      const decoded = jwt_decode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;

      // Verifica se o token expirou
      if (decoded.exp < currentTime) {
        secureLoggingService.security('Token JWT expirado', {
          userId: decoded.sub,
          timestamp: new Date().toISOString()
        });
        return false;
      }

      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao validar token JWT', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  // Recuperar payload do token
  static getTokenPayload(token: string): JwtPayload | null {
    try {
      if (!token) return null;
      return jwt_decode<JwtPayload>(token);
    } catch (error) {
      secureLoggingService.security('Erro ao decodificar token JWT', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  // Gerenciamento de tentativas de login
  static async registerLoginAttempt(success: boolean, email: string): Promise<boolean> {
    try {
      // Obter tentativas anteriores
      if (!this.loginAttempts) {
        const storedAttempts = await this.getSecureData(this.LOGIN_ATTEMPTS_KEY);
        this.loginAttempts = storedAttempts
          ? JSON.parse(storedAttempts)
          : { count: 0, lastAttempt: Date.now(), blocked: false, blockExpires: 0 };
      }

      // Se login for bem-sucedido, resetar tentativas
      if (success) {
        this.loginAttempts = { count: 0, lastAttempt: Date.now(), blocked: false, blockExpires: 0 };
        await this.storeSecureData(this.LOGIN_ATTEMPTS_KEY, JSON.stringify(this.loginAttempts));
        return true;
      }

      // Verificar se está bloqueado
      if (this.loginAttempts.blocked) {
        if (Date.now() < this.loginAttempts.blockExpires) {
          const minutesLeft = Math.ceil((this.loginAttempts.blockExpires - Date.now()) / 60000);
          secureLoggingService.security('Tentativa de login bloqueada', { 
            email, 
            minutesLeft, 
            timestamp: new Date().toISOString(),
            severity: 'high'
          });
          Alert.alert(
            'Conta temporariamente bloqueada',
            `Muitas tentativas incorretas. Tente novamente em ${minutesLeft} minutos.`
          );
          return false;
        } else {
          // Desbloquear se o tempo expirou
          this.loginAttempts.blocked = false;
          this.loginAttempts.count = 1;
        }
      } else {
        // Incrementar contador de tentativas
        this.loginAttempts.count += 1;
      }

      this.loginAttempts.lastAttempt = Date.now();

      // Verificar se excedeu o número máximo de tentativas
      if (this.loginAttempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        this.loginAttempts.blocked = true;
        this.loginAttempts.blockExpires = Date.now() + this.BLOCK_DURATION_MS;

        const minutesLeft = Math.ceil(this.BLOCK_DURATION_MS / 60000);
        secureLoggingService.security('Conta bloqueada após múltiplas tentativas', { 
          email, 
          timestamp: new Date().toISOString(),
          severity: 'high',
          attemptCount: this.loginAttempts.count
        });
        Alert.alert(
          'Conta temporariamente bloqueada',
          `Muitas tentativas incorretas. Tente novamente em ${minutesLeft} minutos.`
        );
      }

      // Salvar estado atualizado
      await this.storeSecureData(this.LOGIN_ATTEMPTS_KEY, JSON.stringify(this.loginAttempts));
      return !this.loginAttempts.blocked;
    } catch (error) {
      secureLoggingService.security('Erro ao registrar tentativa de login', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return true; // Em caso de erro, permitir o login para não bloquear usuários legítimos
    }
  }

  // Gerenciamento de dispositivos confiáveis
  static async registerTrustedDevice(userId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const deviceName =
        Platform.OS === 'web' ? navigator.userAgent || 'Web Browser' : `${Platform.OS} Device`;

      // Recuperar lista de dispositivos confiáveis
      const storedDevices = await this.getSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`);
      let devices: TrustedDevice[] = storedDevices ? JSON.parse(storedDevices) : [];

      // Verificar se o dispositivo já está registrado
      const existingDeviceIndex = devices.findIndex(d => d.deviceId === deviceId);

      if (existingDeviceIndex >= 0) {
        // Atualizar último acesso
        devices[existingDeviceIndex].lastAccess = Date.now();
      } else {
        // Adicionar novo dispositivo
        devices.push({
          deviceId,
          deviceName,
          lastAccess: Date.now(),
          browser: Platform.OS === 'web' ? navigator.userAgent : undefined,
          os: Platform.OS,
        });

        // Limitar número de dispositivos (remover o mais antigo se necessário)
        if (devices.length > this.MAX_TRUSTED_DEVICES) {
          devices.sort((a, b) => a.lastAccess - b.lastAccess);
          devices = devices.slice(1);
        }
      }

      // Salvar lista atualizada
      await this.storeSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`, JSON.stringify(devices));
      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao registrar dispositivo', { 
        userId,
        deviceId: await this.getDeviceId(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return false;
    }
  }

  // Verificar se o dispositivo atual é confiável
  static async isDeviceTrusted(userId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const storedDevices = await this.getSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`);

      if (!storedDevices) return false;

      const devices: TrustedDevice[] = JSON.parse(storedDevices);
      return devices.some(d => d.deviceId === deviceId);
    } catch (error) {
      secureLoggingService.security('Erro ao verificar dispositivo confiável', { 
        userId,
        deviceId: await this.getDeviceId(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return false;
    }
  }

  // Remover dispositivo da lista de confiáveis
  static async removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const storedDevices = await this.getSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`);

      if (!storedDevices) return false;

      let devices: TrustedDevice[] = JSON.parse(storedDevices);
      devices = devices.filter(d => d.deviceId !== deviceId);

      await this.storeSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`, JSON.stringify(devices));
      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao remover dispositivo confiável', { 
        userId,
        deviceId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return false;
    }
  }

  // Obter lista de dispositivos confiáveis
  static async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    try {
      const storedDevices = await this.getSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`);

      if (!storedDevices) return [];

      return JSON.parse(storedDevices);
    } catch (error) {
      secureLoggingService.security('Erro ao obter dispositivos confiáveis', { 
        userId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return [];
    }
  }

  // Iniciar monitoramento de inatividade
  static startActivityMonitor(logoutCallback: () => void): void {
    this.resetActivityTimer();

    // Atualizar timestamp de última atividade
    this.updateLastActivity();

    // Configurar timer para verificar inatividade periodicamente
    this.activityTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      if (inactiveTime >= this.ACTIVITY_TIMEOUT_MS) {
        secureLoggingService.security('Sessão encerrada por inatividade', {
          inactiveTime,
          timestamp: new Date().toISOString(),
          severity: 'low'
        });
        this.stopActivityMonitor();
        logoutCallback();
        Alert.alert('Sessão expirada', 'Sua sessão foi encerrada devido à inatividade.');
      }
    }, 60000); // Verificar a cada minuto
  }

  // Parar monitoramento de inatividade
  static stopActivityMonitor(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  // Resetar timer de inatividade
  static resetActivityTimer(): void {
    this.lastActivity = Date.now();
  }

  // Atualizar timestamp de última atividade
  static updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  // Sanitizar inputs para prevenir injeção
  static sanitizeInput(input: string): string {
    if (!input) return '';

    // Escapar caracteres especiais HTML
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Verificar força da senha
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string;
    isStrong: boolean;
  } {
    // Pontuação inicial
    let score = 0;
    let feedback = '';

    if (!password) {
      return { score: 0, feedback: 'Senha é obrigatória', isStrong: false };
    }

    // Comprimento mínimo
    if (password.length < 8) {
      feedback = 'Senha deve ter pelo menos 8 caracteres';
      return { score, feedback, isStrong: false };
    } else {
      score += password.length > 12 ? 2 : 1;
    }

    // Caracteres maiúsculos
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback = 'Adicione letras maiúsculas';
      return { score, feedback, isStrong: false };
    }

    // Caracteres minúsculos
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback = 'Adicione letras minúsculas';
      return { score, feedback, isStrong: false };
    }

    // Números
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback = 'Adicione números';
      return { score, feedback, isStrong: false };
    }

    // Caracteres especiais
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 2;
    } else {
      feedback = 'Adicione caracteres especiais';
      return { score, feedback, isStrong: false };
    }

    // Verificar se a senha é comum
    const commonPasswords = [
      'password',
      '123456',
      'qwerty',
      'admin',
      'welcome',
      'senha',
      '123456789',
      'admin123',
      '12345678',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      score = 1;
      feedback = 'Senha muito comum e fácil de adivinhar';
      return { score, feedback, isStrong: false };
    }

    // Sequências comuns
    if (/123|234|345|456|567|678|789|987|876|765|654|543|432|321/.test(password)) {
      score -= 1;
      feedback = 'Evite sequências numéricas';
    }

    // Avaliação final
    if (score < 4) {
      feedback = 'Senha fraca';
      return { score, feedback, isStrong: false };
    } else if (score < 6) {
      feedback = 'Senha média';
      return { score, feedback, isStrong: score >= 5 };
    } else {
      feedback = 'Senha forte';
      return { score, feedback, isStrong: true };
    }
  }

  // Detectar tentativas de acesso suspeitas
  static async detectSuspiciousActivity(userId: string, ip?: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const isTrusted = await this.isDeviceTrusted(userId);

      // Se o dispositivo já é confiável, não é suspeito
      if (isTrusted) {
        return false;
      }

      // Verificar login de local incomum (simplificado)
      // Em uma implementação real, usaríamos um serviço de geolocalização de IP
      const suspiciousLogin = ip ? false : false; // Implementação base

      if (suspiciousLogin) {
        secureLoggingService.security('Login detectado de local incomum', { 
          userId, 
          deviceId, 
          ip, 
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        return true;
      }

      return false;
    } catch (error) {
      secureLoggingService.security('Erro ao detectar atividade suspeita', { 
        userId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return false;
    }
  }

  // Limpar todos os dados de segurança ao fazer logout completo
  static async clearAllSecurityData(userId: string): Promise<void> {
    try {
      await this.deleteSecureData('authToken');
      await this.deleteSecureData(`${this.TRUSTED_DEVICES_KEY}_${userId}`);
      this.loginAttempts = null;
      this.stopActivityMonitor();
    } catch (error) {
      secureLoggingService.security('Erro ao limpar dados de segurança', { 
        userId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
    }
  }
}
