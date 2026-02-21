import { SecurityService } from '../../services/securityService';
import { PerformanceService } from '../../services/PerformanceService';
import { CacheService } from '../../services/CacheService';

// Mock para o PerformanceService
jest.mock('../../services/PerformanceService', () => ({
  PerformanceService: {
    getInstance: jest.fn().mockReturnValue({
      trackOperation: jest.fn().mockImplementation((name, callback) => callback()),
    }),
  },
}));

// Mock para o CacheService
jest.mock('../../services/CacheService', () => ({
  CacheService: {
    getInstance: jest.fn().mockReturnValue({
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    }),
  },
}));

// Mock para crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('encrypted-data'),
    }),
    decrypt: jest.fn().mockReturnValue({
      toString: jest.fn(decoder => {
        if (decoder) {
          return '{"data":"test-data"}';
        }
        return 'decrypted-data';
      }),
    }),
  },
  enc: {
    Utf8: 'utf8-encoder',
  },
}));

describe('SecurityService Integration Tests', () => {
  let securityService: SecurityService;
  let performanceService: any;
  let cacheService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    securityService = SecurityService.getInstance();
    performanceService = PerformanceService.getInstance();
    cacheService = CacheService.getInstance();
  });

  test('should encrypt and decrypt data correctly', () => {
    // Dados para teste
    const testData = { userId: '123', name: 'João Silva' };
    const secretKey = 'test-secret-key';

    // Encriptar dados
    const encryptedData = securityService.encryptData(testData, secretKey);

    // Verificar se o resultado da encriptação é uma string
    expect(typeof encryptedData).toBe('string');
    expect(encryptedData).toBe('encrypted-data');

    // Decriptar dados
    const decryptedData = securityService.decryptData(encryptedData, secretKey);

    // Verificar se os dados decriptados correspondem aos dados originais
    expect(decryptedData).toEqual(testData);
  });

  test('should securely store sensitive data in cache', async () => {
    // Dados para teste
    const key = 'user-payment-info';
    const data = {
      cardNumber: '4111111111111111',
      expiryDate: '12/25',
      cvv: '123',
    };

    // Armazenar dados sensíveis no cache
    await securityService.secureStore(key, data);

    // Verificar se o CacheService foi chamado com os dados encriptados
    expect(cacheService.setItem).toHaveBeenCalledWith(
      `secure_${key}`,
      expect.any(String),
      expect.any(Object)
    );
  });

  test('should retrieve and decrypt sensitive data from cache', async () => {
    // Configurar mock para simular dados encriptados no cache
    cacheService.getItem.mockResolvedValue('encrypted-data');

    // Recuperar dados sensíveis do cache
    const key = 'user-payment-info';
    const retrievedData = await securityService.secureRetrieve(key);

    // Verificar se o CacheService foi chamado com a chave correta
    expect(cacheService.getItem).toHaveBeenCalledWith(`secure_${key}`);

    // Verificar se os dados foram decriptados corretamente
    expect(retrievedData).toEqual({ data: 'test-data' });
  });

  test('should handle null or undefined data gracefully', () => {
    // Testar com dados nulos
    const nullData = null;
    const secretKey = 'test-secret-key';

    // A encriptação deve retornar null para dados nulos
    const encryptedNull = securityService.encryptData(nullData, secretKey);
    expect(encryptedNull).toBeNull();

    // A decriptação deve retornar null para dados nulos
    const decryptedNull = securityService.decryptData(null, secretKey);
    expect(decryptedNull).toBeNull();
  });

  test('should handle invalid encrypted data during decryption', () => {
    // Configurar mock para simular erro durante decriptação
    const cryptoJs = require('crypto-js');
    cryptoJs.AES.decrypt.mockImplementationOnce(() => {
      throw new Error('Invalid encrypted data');
    });

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar decriptar dados inválidos
    const invalidData = 'invalid-encrypted-data';
    const secretKey = 'test-secret-key';

    // A operação deve retornar null para dados inválidos
    const result = securityService.decryptData(invalidData, secretKey);
    expect(result).toBeNull();

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error decrypting data:', expect.any(Error));

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should integrate with PerformanceService for tracking', async () => {
    // Dados para teste
    const key = 'user-profile';
    const data = { name: 'Maria Silva', email: 'maria@exemplo.com' };

    // Armazenar dados no cache seguro
    await securityService.secureStore(key, data);

    // Recuperar dados do cache seguro
    await securityService.secureRetrieve(key);

    // Verificar se o PerformanceService foi utilizado para rastrear as operações
    expect(performanceService.trackOperation).toHaveBeenCalledTimes(2);
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'security_store',
      expect.any(Function)
    );
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'security_retrieve',
      expect.any(Function)
    );
  });

  test('should handle errors when storing secure data', async () => {
    // Configurar mock para simular erro
    cacheService.setItem.mockRejectedValueOnce(new Error('Storage error'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar armazenar dados
    const key = 'user-payment-info';
    const data = {
      cardNumber: '4111111111111111',
      expiryDate: '12/25',
      cvv: '123',
    };

    // A operação deve retornar false em caso de erro
    const result = await securityService.secureStore(key, data);
    expect(result).toBe(false);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error storing secure data:', expect.any(Error));

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle errors when retrieving secure data', async () => {
    // Configurar mock para simular erro
    cacheService.getItem.mockRejectedValueOnce(new Error('Storage error'));

    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Tentar recuperar dados
    const key = 'user-payment-info';

    // A operação deve retornar null em caso de erro
    const result = await securityService.secureRetrieve(key);
    expect(result).toBeNull();

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error retrieving secure data:',
      expect.any(Error)
    );

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });
});
