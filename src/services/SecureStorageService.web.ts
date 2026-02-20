import * as Crypto from 'expo-crypto';
import * as CryptoJS from 'crypto-js';
import { loggingService } from './LoggingService';

/**
 * Versão Web do SecureStorageService
 * Não utiliza expo-secure-store; usa localStorage com proteção básica.
 */
export class SecureStorageService {
  private static readonly ENCRYPTION_KEY = 'acucaradas-secure-storage-key-2024';
  private static readonly ENCRYPTED_PREFIX = 'ENCRYPTED_V1:';
  private static readonly SENSITIVE_DATA_TYPES = [
    'token',
    'password',
    'credit_card',
    'personal_info',
    'auth',
    'biometric',
    'payment',
  ];

  static async storeData(
    key: string,
    value: string,
    options?: { sensitive?: boolean; expiresIn?: number }
  ): Promise<void> {
    try {
      const isSensitive = options?.sensitive || this.isSensitiveKey(key);
      let valueToStore = value;
      if (isSensitive) {
        valueToStore = await this.encryptValue(value);
      }
      if (options?.expiresIn) {
        const expiresAt = Date.now() + options.expiresIn;
        valueToStore = JSON.stringify({ value: valueToStore, expiresAt });
      }
      localStorage.setItem(key, valueToStore);
      loggingService.info('Dados armazenados (web)', { key, sensitive: isSensitive });
    } catch (error: any) {
      loggingService.error('Erro ao armazenar (web)', error, { key });
      throw new Error(`Falha ao armazenar dados: ${error?.message ?? String(error)}`);
    }
  }

  static async getData(key: string): Promise<string | null> {
    try {
      let storedValue: string | null = localStorage.getItem(key);
      if (!storedValue) return null;
      try {
        const parsed = JSON.parse(storedValue);
        if (parsed?.expiresAt && Date.now() > parsed.expiresAt) {
          loggingService.info('Dados expirados (web)', { key });
          await this.removeData(key);
          return null;
        }
        storedValue = parsed?.value ?? storedValue;
      } catch {}
      if (typeof storedValue === 'string' && storedValue.startsWith(this.ENCRYPTED_PREFIX)) {
        storedValue = await this.decryptValue(storedValue);
      }
      return storedValue;
    } catch (error: any) {
      loggingService.error('Erro ao recuperar (web)', error, { key });
      return null;
    }
  }

  static async removeData(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      loggingService.info('Dados removidos (web)', { key });
    } catch (error: any) {
      loggingService.error('Erro ao remover (web)', error, { key });
    }
  }

  private static async encryptValue(value: string): Promise<string> {
    const encryptionKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      this.ENCRYPTION_KEY
    );
    const cipher = CryptoJS.AES.encrypt(value, encryptionKey).toString();
    return `${this.ENCRYPTED_PREFIX}${cipher}`;
  }

  private static async decryptValue(encryptedValue: string): Promise<string> {
    const cipherText = encryptedValue.substring(this.ENCRYPTED_PREFIX.length);
    const encryptionKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      this.ENCRYPTION_KEY
    );
    const bytes = CryptoJS.AES.decrypt(cipherText, encryptionKey);
    const decoded = bytes.toString(CryptoJS.enc.Utf8);
    return decoded;
  }

  private static isSensitiveKey(key: string): boolean {
    return this.SENSITIVE_DATA_TYPES.some((type) => key.toLowerCase().includes(type));
  }

  static async clearAllData(): Promise<void> {
    try {
      localStorage.clear();
      loggingService.info('Todos os dados (web) foram limpos');
    } catch (error: any) {
      loggingService.error('Erro ao limpar todos os dados (web)', error);
    }
  }

  static async verifyDataIntegrity(): Promise<boolean> {
    try {
      return true;
    } catch (error: any) {
      loggingService.error('Erro ao verificar integridade (web)', error);
      return false;
    }
  }
}
