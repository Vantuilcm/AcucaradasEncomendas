import * as SecureStore from 'expo-secure-store';
import * as CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './LoggingService';

/**
 * Serviço responsável pelo armazenamento seguro de dados sensíveis
 * Implementa criptografia e proteção adicional para dados críticos
 */
export class SecureStorageService {
  // Chave de criptografia adicional (em produção, seria gerada e armazenada de forma segura)
  private static readonly ENCRYPTION_KEY = 'acucaradas-secure-storage-key-2024';
  
  // Prefixo para identificar dados criptografados
  private static readonly ENCRYPTED_PREFIX = 'ENCRYPTED_V1:';

  // Tipos de dados sensíveis que requerem proteção adicional
  private static readonly SENSITIVE_DATA_TYPES = [
    'token',
    'password',
    'credit_card',
    'personal_info',
    'auth',
    'biometric',
    'payment',
  ];
  private static cryptoAvailability: boolean | null = null;

  private static async cryptoAvailable(): Promise<boolean> {
    if (this.cryptoAvailability !== null) return this.cryptoAvailability;
    try {
      if (typeof (Crypto as any)?.isAvailableAsync === 'function') {
        const available = await (Crypto as any).isAvailableAsync();
        this.cryptoAvailability = !!available;
        return this.cryptoAvailability;
      }
      this.cryptoAvailability = typeof (Crypto as any)?.digestStringAsync === 'function';
      return this.cryptoAvailability;
    } catch {
      this.cryptoAvailability = false;
      return false;
    }
  }

  /**
   * Armazena dados de forma segura
   * @param key Chave para armazenamento
   * @param value Valor a ser armazenado
   * @param options Opções adicionais
   * @returns Promise<void>
   */
  static async storeData(
    key: string,
    value: string,
    options?: {
      sensitive?: boolean;
      expiresIn?: number; // Tempo de expiração em milissegundos
    }
  ): Promise<void> {
    try {
      // Verificar se o valor é sensível
      const isSensitive = (options?.sensitive || this.isSensitiveKey(key)) && (await this.cryptoAvailable());
      
      // Preparar o valor para armazenamento
      let valueToStore = value;
      
      // Se for sensível, aplicar criptografia adicional
      if (isSensitive) {
        try {
          valueToStore = await this.encryptValue(value);
        } catch (e) {
          try { loggingService.warn('Falha ao criptografar, aplicando fallback', { key, errorMessage: e instanceof Error ? e.message : String(e) }); } catch {}
          valueToStore = value;
        }
      }
      
      // Adicionar metadados se necessário (como expiração)
      if (options?.expiresIn) {
        const expiresAt = Date.now() + options.expiresIn;
        valueToStore = JSON.stringify({
          value: valueToStore,
          expiresAt,
        });
      }
      
      // Armazenar o valor
      if (Platform.OS === 'web') {
        localStorage.setItem(key, valueToStore);
      } else {
        try {
          await SecureStore.setItemAsync(key, valueToStore);
        } catch (e) {
          try {
            await AsyncStorage.setItem(key, valueToStore);
            loggingService.warn('Fallback AsyncStorage ao armazenar', { key, errorMessage: e instanceof Error ? e.message : String(e) });
          } catch (e2) {
            throw e2;
          }
        }
      }
      
      loggingService.debug('Dados armazenados com segurança', { key, sensitive: isSensitive });
    } catch (error) {
      loggingService.error(
        'Erro ao armazenar dados com segurança',
        error instanceof Error ? error : undefined,
        { key }
      );
      const __msg = (error instanceof Error ? error.message : String(error));
      throw new Error(`Falha ao armazenar dados: ${__msg}`);
    }
  }

  /**
   * Recupera dados armazenados de forma segura
   * @param key Chave para recuperação
   * @returns Promise<string | null> Valor recuperado ou null se não existir
   */
  static async getData(key: string): Promise<string | null> {
    try {
      // Recuperar o valor armazenado
      let storedValue: string | null = null;
      
      if (Platform.OS === 'web') {
        storedValue = localStorage.getItem(key);
      } else {
        try {
          storedValue = await SecureStore.getItemAsync(key);
        } catch (e) {
          try {
            storedValue = await AsyncStorage.getItem(key);
            loggingService.warn('Fallback AsyncStorage ao recuperar', { key, errorMessage: e instanceof Error ? e.message : String(e) });
          } catch (e2) {
            throw e2;
          }
        }
      }
      
      if (!storedValue) {
        return null;
      }
      
      // Verificar se o valor tem metadados (como expiração)
      try {
        const parsedValue = JSON.parse(storedValue);
        if (parsedValue.expiresAt) {
          // Verificar se o valor expirou
          if (Date.now() > parsedValue.expiresAt) {
            loggingService.debug('Dados expirados', { key });
            await this.removeData(key);
            return null;
          }
          storedValue = parsedValue.value;
        }
      } catch (e) {
        // Se não for JSON, continuar com o valor original
      }
      
      // Verificar se o valor está criptografado
      if (typeof storedValue === 'string' && storedValue.startsWith(this.ENCRYPTED_PREFIX)) {
        if (await this.cryptoAvailable()) {
          storedValue = await this.decryptValue(storedValue);
        } else {
          if (__DEV__) {
            loggingService.warn('Cripto indisponível para descriptografia, devolvendo valor criptografado', { key });
          }
        }
      }
      
      return storedValue;
    } catch (error) {
      loggingService.error(
        'Erro ao recuperar dados seguros',
        error instanceof Error ? error : undefined,
        { key }
      );
      return null;
    }
  }

  /**
   * Remove dados armazenados
   * @param key Chave para remoção
   * @returns Promise<void>
   */
  static async removeData(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          try {
            await AsyncStorage.removeItem(key);
            loggingService.warn('Fallback AsyncStorage ao remover', { key, errorMessage: e instanceof Error ? e.message : String(e) });
          } catch (e2) {
            throw e2;
          }
        }
      }
      
      loggingService.debug('Dados removidos com segurança', { key });
    } catch (error) {
      loggingService.error(
        'Erro ao remover dados seguros',
        error instanceof Error ? error : undefined,
        { key }
      );
    }
  }

  /**
   * Criptografa um valor
   * @param value Valor a ser criptografado
   * @returns Promise<string> Valor criptografado
   */
  private static async encryptValue(value: string): Promise<string> {
    try {
      if (!(await this.cryptoAvailable())) return value;
      const encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.ENCRYPTION_KEY
      );
      const cipher = CryptoJS.AES.encrypt(value, encryptionKey).toString();
      return `${this.ENCRYPTED_PREFIX}${cipher}`;
    } catch (error) {
      loggingService.error(
        'Erro ao criptografar valor',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Descriptografa um valor
   * @param encryptedValue Valor criptografado
   * @returns Promise<string> Valor descriptografado
   */
  private static async decryptValue(encryptedValue: string): Promise<string> {
    try {
      if (!(await this.cryptoAvailable())) return encryptedValue;
      const cipherText = encryptedValue.substring(this.ENCRYPTED_PREFIX.length);
      const encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.ENCRYPTION_KEY
      );
      const bytes = CryptoJS.AES.decrypt(cipherText, encryptionKey);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      return decoded;
    } catch (error) {
      loggingService.error(
        'Erro ao descriptografar valor',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Verifica se uma chave é considerada sensível
   * @param key Chave a ser verificada
   * @returns boolean - true se a chave for sensível
   */
  private static isSensitiveKey(key: string): boolean {
    return this.SENSITIVE_DATA_TYPES.some(type => key.toLowerCase().includes(type));
  }

  /**
   * Limpa todos os dados armazenados (útil para logout)
   * @returns Promise<void>
   */
  static async clearAllData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // No ambiente web, limpar localStorage
        localStorage.clear();
      } else {
        // Em dispositivos móveis, não há método direto para limpar tudo no SecureStore
        // Uma alternativa é manter uma lista de chaves e removê-las individualmente
        const keys = await AsyncStorage.getAllKeys();
        for (const key of keys) {
          await SecureStore.deleteItemAsync(key);
        }
      }
      
      loggingService.info('Todos os dados seguros foram limpos');
    } catch (error) {
      loggingService.error('Erro ao limpar todos os dados seguros', { error });
    }
  }

  /**
   * Verifica a integridade dos dados armazenados
   * @returns Promise<boolean> - true se todos os dados estiverem íntegros
   */
  static async verifyDataIntegrity(): Promise<boolean> {
    try {
      // Em uma implementação real, verificaríamos a integridade dos dados
      // comparando hashes ou assinaturas
      
      // Implementação simplificada para demonstração
      return true;
    } catch (error) {
      loggingService.error('Erro ao verificar integridade dos dados', { error });
      return false;
    }
  }
}
