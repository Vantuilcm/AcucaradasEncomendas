// @ts-ignore
import * as CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Serviço de criptografia para dados sensíveis
 * Implementa criptografia AES para proteger dados do usuário
 * Usa chaves dinâmicas geradas no dispositivo e armazenadas no SecureStore
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private secretKey: string | null = null;
  private readonly KEY_STORAGE_ALIAS = 'app_encryption_key_v1';

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.secretKey) return;

    try {
      let key: string | null = null;

      if (Platform.OS !== 'web') {
        key = await SecureStore.getItemAsync(this.KEY_STORAGE_ALIAS);
      } else {
        key = localStorage.getItem(this.KEY_STORAGE_ALIAS);
      }

      if (!key) {
        // Gerar nova chave forte de 256 bits (32 bytes)
        key = CryptoJS.lib.WordArray.random(32).toString();
        
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync(this.KEY_STORAGE_ALIAS, key!);
        } else {
          localStorage.setItem(this.KEY_STORAGE_ALIAS, key!);
        }
      }

      this.secretKey = key;
    } catch (error) {
      console.error('Falha crítica na inicialização da criptografia:', error);
      // Fallback de emergência (não ideal, mas evita crash)
      this.secretKey = CryptoJS.SHA256(Platform.OS + '_fallback_key').toString();
    }
  }

  private ensureInitialized(): void {
    if (!this.secretKey) {
      console.warn('EncryptionService não inicializado. Usando chave temporária.');
      this.secretKey = 'temp-key-should-not-happen-in-prod';
    }
  }

  /**
   * Criptografa dados sensíveis
   * @param data Dados a serem criptografados
   * @returns Dados criptografados em formato string
   */
  encrypt(data: string): string {
    if (!data) return '';
    this.ensureInitialized();
    
    try {
      // @ts-ignore - CryptoJS types mismatch sometimes
      const encrypted = CryptoJS.AES.encrypt(data || '', this.secretKey!).toString();
      return encrypted;
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      return '';
    }
  }

  /**
   * Descriptografa dados
   * @param encryptedData Dados criptografados
   * @returns Dados descriptografados
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    this.ensureInitialized();
    
    try {
      // @ts-ignore
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.secretKey!);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      return '';
    }
  }

  /**
   * Verifica se uma string estÃ¡ criptografada
   * @param data String a ser verificada
   * @returns Verdadeiro se a string parece estar criptografada
   */
  isEncrypted(data: string): boolean {
    if (!data) return false;
    
    // Strings criptografadas pelo CryptoJS AES geralmente seguem um padrÃ£o
    const encryptedPattern = /^U2FsdGVkX1.*$/;
    return encryptedPattern.test(data);
  }
}

