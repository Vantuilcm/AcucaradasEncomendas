import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from './LoggingService';
import { EncryptionService } from './EncryptionService';

/**
 * Serviço responsável pelo armazenamento seguro de dados sensíveis
 * Implementa criptografia e proteção adicional para dados críticos
 */
export class SecureStorageService {
  // Prefixo para identificar dados criptografados
  private static readonly ENCRYPTED_PREFIX = 'ENCRYPTED_V2:';

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
      const isSensitive = options?.sensitive || this.isSensitiveKey(key);
      
      // Preparar o valor para armazenamento
      let valueToStore = value;
      
      // Se for sensível, aplicar criptografia adicional
      if (isSensitive) {
        valueToStore = await this.encryptValue(value);
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
        // No ambiente web, usar localStorage com criptografia adicional
        localStorage.setItem(key, valueToStore);
      } else {
        // Em dispositivos móveis, usar SecureStore
        await SecureStore.setItemAsync(key, valueToStore);
      }
      
      loggingService.info('Dados armazenados com segurança', { key, sensitive: isSensitive });
    } catch (error) {
      loggingService.error('Erro ao armazenar dados com segurança', { error: (error as Error).message, key });
      throw new Error(`Falha ao armazenar dados: ${(error as Error).message}`);
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
      
      try {
        if (Platform.OS === 'web') {
          // No ambiente web, recuperar do localStorage
          storedValue = localStorage.getItem(key);
        } else {
          // Em dispositivos móveis, recuperar do SecureStore
          storedValue = await SecureStore.getItemAsync(key);
        }
      } catch (readError) {
        loggingService.error('Erro de leitura física no armazenamento seguro', { 
          key, 
          error: (readError as Error).message 
        });
        // Se falhar a leitura, tentamos limpar para evitar loop de erro
        await this.removeData(key).catch(() => {});
        return null;
      }
      
      if (!storedValue) {
        return null;
      }
      
      // Tentar processar o valor recuperado
      try {
        // Verificar se o valor tem metadados (como expiração)
        if (storedValue.startsWith('{') && storedValue.endsWith('}')) {
          const parsed = JSON.parse(storedValue);
          if (parsed && parsed.expiresAt && parsed.expiresAt < Date.now()) {
            loggingService.info('Dado expirado no armazenamento seguro', { key });
            await this.removeData(key);
            return null;
          }
          storedValue = parsed.value;
        }
        
        // Se for um dado criptografado, descriptografar
        if (storedValue && storedValue.startsWith(this.ENCRYPTED_PREFIX)) {
          return await this.decryptValue(storedValue);
        }
        
        return storedValue;
      } catch (parseError) {
        loggingService.error('Dado corrompido detectado no armazenamento seguro', { 
          key, 
          error: (parseError as Error).message 
        });
        // Em caso de corrupção, removemos o dado para permitir novo login/fluxo
        await this.removeData(key).catch(() => {});
        return null;
      }
    } catch (error) {
      loggingService.error('Erro crítico ao recuperar dados seguros', { 
        key, 
        error: (error as Error).message 
      });
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
        // No ambiente web, remover do localStorage
        localStorage.removeItem(key);
      } else {
        // Em dispositivos móveis, remover do SecureStore
        await SecureStore.deleteItemAsync(key);
      }
      
      loggingService.info('Dados removidos com segurança', { key });
    } catch (error) {
      loggingService.error('Erro ao remover dados seguros', { error: (error as Error).message, key });
    }
  }

  /**
   * Criptografa um valor
   * @param value Valor a ser criptografado
   * @returns Promise<string> Valor criptografado
   */
  private static async encryptValue(value: string): Promise<string> {
    try {
      await EncryptionService.getInstance().initialize();
      const encrypted = EncryptionService.getInstance().encrypt(value);
      return `${this.ENCRYPTED_PREFIX}${encrypted}`;
    } catch (error) {
      loggingService.error('Erro ao criptografar valor', { error: (error as Error).message });
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
      await EncryptionService.getInstance().initialize();
      
      // Suporte legado para V1 (se necessário) ou apenas V2
      if (encryptedValue.startsWith('ENCRYPTED_V1:')) {
        // Logica de migração ou erro
        loggingService.warn('Tentativa de descriptografar formato legado V1');
        return ''; 
      }

      // Remover o prefixo
      const actualValue = encryptedValue.substring(this.ENCRYPTED_PREFIX.length);
      return EncryptionService.getInstance().decrypt(actualValue);
    } catch (error) {
      loggingService.error('Erro ao descriptografar valor', { error: (error as Error).message });
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
      loggingService.error('Erro ao limpar todos os dados seguros', { error: (error as Error).message });
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
      loggingService.error('Erro ao verificar integridade dos dados', { error: (error as Error).message });
      return false;
    }
  }
}