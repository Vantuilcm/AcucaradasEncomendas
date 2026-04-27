import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// Use the actual implementation of SecurityService explicitly
jest.unmock('../../services/securityService');
const actualModule = jest.requireActual('../../services/securityService') as any;
const { SecurityService } = actualModule;

// Mock para expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock para expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock para secureLoggingService
jest.mock('../../services/SecureLoggingService', () => ({
  secureLoggingService: {
    security: jest.fn(),
  },
}));

describe('SecurityService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecurityService as any).deviceId = null;
  });

  test('should hash data correctly (encryptData)', async () => {
    const data = 'test-data';
    const expectedHash = 'hashed-data';

    (Crypto.digestStringAsync as jest.Mock<any>).mockResolvedValue(expectedHash);

    const result = await SecurityService.encryptData(data);

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    expect(result).toBe(expectedHash);
  });

  test('should store secure data', async () => {
    const key = 'test-key';
    const value = 'test-value';

    (SecureStore.setItemAsync as jest.Mock<any>).mockResolvedValue(undefined);

    await SecurityService.storeSecureData(key, value);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
  });

  test('should retrieve secure data', async () => {
    const key = 'test-key';
    const value = 'test-value';

    (SecureStore.getItemAsync as jest.Mock<any>).mockResolvedValue(value);

    const result = await SecurityService.getSecureData(key);

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
    expect(result).toBe(value);
  });

  test('should delete secure data', async () => {
    const key = 'test-key';

    (SecureStore.deleteItemAsync as jest.Mock<any>).mockResolvedValue(undefined);

    await SecurityService.deleteSecureData(key);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
  });

  test('should generate unique device id', async () => {
    const mockHash = 'mock-device-id-hash';
    (Crypto.digestStringAsync as jest.Mock<any>).mockResolvedValue(mockHash);
    (SecureStore.getItemAsync as jest.Mock<any>).mockResolvedValue(null); // No stored ID
    (SecureStore.setItemAsync as jest.Mock<any>).mockResolvedValue(undefined);

    const deviceId = await SecurityService.getDeviceId();

    expect(deviceId).toBe(mockHash);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('device_id', mockHash);
  });

  test('should retrieve existing device id', async () => {
    const storedId = 'existing-device-id';
    (SecureStore.getItemAsync as jest.Mock<any>).mockResolvedValue(storedId);

    const deviceId = await SecurityService.getDeviceId();

    expect(deviceId).toBe(storedId);
    // Should not generate new ID if one exists
    expect(Crypto.digestStringAsync).not.toHaveBeenCalled(); 
  });
});
