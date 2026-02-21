import * as CryptoJS from 'crypto-js';

/**
 * ServiÃ§o de criptografia para dados sensÃ­veis
 * Implementa criptografia AES para proteger dados do usuÃ¡rio
 */
export class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    // A chave deve ser armazenada em variÃ¡vel de ambiente em produÃ§Ã£o
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || 'default-dev-key-change-in-production';
  }

  /**
   * Criptografa dados sensÃ­veis
   * @param data Dados a serem criptografados
   * @returns Dados criptografados em formato string
   */
  encrypt(data: string): string {
    if (!data) return '';
    
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
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
    
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
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

