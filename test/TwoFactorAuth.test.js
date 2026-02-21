/**
 * Teste do fluxo completo de autenticação em dois fatores
 * Este teste simula um ambiente similar ao de produção para verificar toda a funcionalidade 2FA
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TwoFactorAuthService } from '../src/services/TwoFactorAuthService';
import { auth, db } from '../src/config/firebase';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

// Mocks para Firebase e módulos nativos
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteField: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn(date => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('firebase/auth', () => ({
  sendEmailVerification: jest.fn(),
  updateEmail: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  getRandomValues: jest.fn(array => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

jest.mock('../src/services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TwoFactorAuth - Fluxo Completo', () => {
  let twoFactorAuthService;
  const mockUser = {
    uid: 'test-user-id',
    email: 'teste@acucaradas.com.br',
    emailVerified: true,
  };

  const mockBackupCodes = [
    'AAAA-BBBB',
    'CCCC-DDDD',
    'EEEE-FFFF',
    'GGGG-HHHH',
    'IIII-JJJJ',
    'KKKK-LLLL',
    'MMMM-NNNN',
    'OOOO-PPPP',
    'QQQQ-RRRR',
    'SSSS-TTTT',
  ];

  const mockVerificationCode = '123456';
  const mockDocRef = { id: 'test-user-id' };
  const mockHashedBackupCodes = mockBackupCodes.map((_, i) => `hashed-code-${i}`);
  const mockFunctions = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock auth.currentUser
    Object.defineProperty(auth, 'currentUser', {
      value: mockUser,
      writable: true,
    });

    // Mock doc
    doc.mockReturnValue(mockDocRef);

    // Mock Crypto.digestStringAsync
    Crypto.digestStringAsync.mockImplementation((_, code) => {
      const index = mockBackupCodes.findIndex(
        backupCode => backupCode.replace(/[^a-zA-Z0-9]/g, '') === code.replace(/[^a-zA-Z0-9]/g, '')
      );
      return Promise.resolve(index >= 0 ? mockHashedBackupCodes[index] : 'invalid-hash');
    });

    // Mock SecureStore
    SecureStore.getItemAsync.mockResolvedValue(null); // Inicialmente sem sessão

    // Instanciar o serviço
    twoFactorAuthService = new TwoFactorAuthService();
  });

  describe('1. Verificação do status do 2FA', () => {
    test('Deve retornar false quando 2FA não está habilitado', async () => {
      // Mock getDoc para retornar que 2FA não está habilitado
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: false }),
      });

      const result = await twoFactorAuthService.is2FAEnabled();
      expect(result).toBe(false);
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
    });

    test('Deve retornar true quando 2FA está habilitado', async () => {
      // Mock getDoc para retornar que 2FA está habilitado
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: true }),
      });

      const result = await twoFactorAuthService.is2FAEnabled();
      expect(result).toBe(true);
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
    });
  });

  describe('2. Habilitação do 2FA', () => {
    test('Deve habilitar 2FA e gerar códigos de backup', async () => {
      // Mock setDoc
      setDoc.mockResolvedValueOnce(undefined);

      const result = await twoFactorAuthService.enable2FA();

      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          twoFactorEnabled: true,
          email: mockUser.email,
          backupCodes: expect.any(Array),
          updatedAt: expect.any(Object),
        }),
        { merge: true }
      );
    });

    test('Deve falhar ao habilitar 2FA se email não for verificado', async () => {
      // Simular usuário com email não verificado
      Object.defineProperty(auth, 'currentUser', {
        value: { ...mockUser, emailVerified: false },
        writable: true,
      });

      const result = await twoFactorAuthService.enable2FA();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email não verificado.');
      expect(sendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('3. Geração e verificação de códigos', () => {
    test('Deve gerar e enviar código de verificação', async () => {
      // Mock para Cloud Function
      const mockCloudFunction = jest.fn().mockResolvedValueOnce({
        data: { success: true },
      });
      httpsCallable.mockReturnValueOnce(mockCloudFunction);

      const result = await twoFactorAuthService.generateAndSendVerificationCode();

      expect(result.success).toBe(true);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          verificationCode: expect.any(String),
          codeExpiration: expect.any(Object),
          updatedAt: expect.any(Object),
        }),
        { merge: true }
      );

      // No ambiente de teste, deve simular ambiente de produção
      if (process.env.NODE_ENV === 'production') {
        expect(mockCloudFunction).toHaveBeenCalledWith({
          email: mockUser.email,
          code: expect.any(String),
        });
      }
    });

    test('Deve verificar código correto e criar sessão', async () => {
      // Mock getDoc para retornar código de verificação
      const mockExpiration = new Date();
      mockExpiration.setMinutes(mockExpiration.getMinutes() + 5); // Expiração em 5 minutos

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          verificationCode: mockVerificationCode,
          codeExpiration: {
            toDate: () => mockExpiration,
          },
        }),
      });

      // Mock para geração de token
      const mockSessionToken = 'mock-session-token';
      SecureStore.setItemAsync.mockResolvedValueOnce(undefined);

      const result = await twoFactorAuthService.verifyCode(mockVerificationCode);

      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          verificationCode: deleteField(),
          codeExpiration: deleteField(),
          lastVerifiedAt: expect.any(Object),
        })
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '2fa_session_token',
        expect.any(String)
      );
    });

    test('Deve rejeitar código incorreto', async () => {
      // Mock getDoc para retornar código de verificação
      const mockExpiration = new Date();
      mockExpiration.setMinutes(mockExpiration.getMinutes() + 5); // Expiração em 5 minutos

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          verificationCode: mockVerificationCode,
          codeExpiration: {
            toDate: () => mockExpiration,
          },
        }),
      });

      const result = await twoFactorAuthService.verifyCode('999999'); // Código incorreto

      expect(result.success).toBe(false);
      expect(result.error).toBe('Código de verificação incorreto.');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    test('Deve rejeitar código expirado', async () => {
      // Mock getDoc para retornar código de verificação expirado
      const mockExpiration = new Date();
      mockExpiration.setMinutes(mockExpiration.getMinutes() - 5); // Expirado há 5 minutos

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          verificationCode: mockVerificationCode,
          codeExpiration: {
            toDate: () => mockExpiration,
          },
        }),
      });

      // Mock para verificação de backup code (fallback quando código normal falha)
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ backupCodes: [] }),
      });

      const result = await twoFactorAuthService.verifyCode(mockVerificationCode);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Código de backup inválido.');
    });
  });

  describe('4. Verificação de códigos de backup', () => {
    test('Deve verificar código de backup válido', async () => {
      // Mock getDoc para retornar códigos de backup
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          backupCodes: mockHashedBackupCodes,
        }),
      });

      const result = await twoFactorAuthService.verifyBackupCode(mockBackupCodes[0]);

      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          backupCodes: expect.not.arrayContaining([mockHashedBackupCodes[0]]), // O código usado deve ser removido
          lastVerifiedAt: expect.any(Object),
        })
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '2fa_session_token',
        expect.any(String)
      );
    });

    test('Deve rejeitar código de backup inválido', async () => {
      // Mock getDoc para retornar códigos de backup
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          backupCodes: mockHashedBackupCodes,
        }),
      });

      const result = await twoFactorAuthService.verifyBackupCode('INVALID-CODE');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Código de backup inválido.');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    test('Deve regenerar novos códigos de backup', async () => {
      // Mock getDoc para verificar que 2FA está habilitado
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: true }),
      });

      const result = await twoFactorAuthService.regenerateBackupCodes();

      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          backupCodes: expect.any(Array),
          updatedAt: expect.any(Object),
        })
      );
    });
  });

  describe('5. Verificação de sessão', () => {
    test('Deve detectar sessão válida', async () => {
      // Mock SecureStore para retornar um token de sessão
      SecureStore.getItemAsync.mockResolvedValueOnce('mock-session-token');

      const result = await twoFactorAuthService.hasValidSession();

      expect(result).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('2fa_session_token');
    });

    test('Deve detectar ausência de sessão', async () => {
      // Mock SecureStore para retornar null (sem token)
      SecureStore.getItemAsync.mockResolvedValueOnce(null);

      const result = await twoFactorAuthService.hasValidSession();

      expect(result).toBe(false);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('2fa_session_token');
    });

    test('Deve limpar sessão corretamente', async () => {
      await twoFactorAuthService.clearSession();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('2fa_session_token');
    });
  });

  describe('6. Desativação do 2FA', () => {
    test('Deve desativar 2FA corretamente', async () => {
      const result = await twoFactorAuthService.disable2FA();

      expect(result.success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          twoFactorEnabled: false,
          backupCodes: deleteField(),
          updatedAt: expect.any(Object),
        })
      );
    });
  });

  // Teste do fluxo completo de 2FA
  describe('7. Fluxo completo de autenticação em dois fatores', () => {
    test('Deve executar fluxo completo de 2FA', async () => {
      // 1. Verificar que 2FA não está habilitado inicialmente
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: false }),
      });

      const initialStatus = await twoFactorAuthService.is2FAEnabled();
      expect(initialStatus).toBe(false);

      // 2. Habilitar 2FA
      setDoc.mockResolvedValueOnce(undefined);

      const enableResult = await twoFactorAuthService.enable2FA();
      expect(enableResult.success).toBe(true);
      expect(enableResult.backupCodes).toHaveLength(10);

      const backupCodes = enableResult.backupCodes;

      // 3. Verificar que 2FA está habilitado agora
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: true }),
      });

      const newStatus = await twoFactorAuthService.is2FAEnabled();
      expect(newStatus).toBe(true);

      // 4. Gerar código de verificação
      const mockCloudFunction = jest.fn().mockResolvedValueOnce({
        data: { success: true },
      });
      httpsCallable.mockReturnValueOnce(mockCloudFunction);

      const generateResult = await twoFactorAuthService.generateAndSendVerificationCode();
      expect(generateResult.success).toBe(true);

      // Capturar o código gerado do mock
      const generatedCode = setDoc.mock.calls[1][1].verificationCode;

      // 5. Verificar código
      const mockExpiration = new Date();
      mockExpiration.setMinutes(mockExpiration.getMinutes() + 5);

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          verificationCode: generatedCode,
          codeExpiration: {
            toDate: () => mockExpiration,
          },
        }),
      });

      const verifyResult = await twoFactorAuthService.verifyCode(generatedCode);
      expect(verifyResult.success).toBe(true);

      // 6. Verificar que uma sessão foi criada
      SecureStore.getItemAsync.mockResolvedValueOnce('mock-session-token');

      const hasSession = await twoFactorAuthService.hasValidSession();
      expect(hasSession).toBe(true);

      // 7. Limpar sessão
      await twoFactorAuthService.clearSession();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('2fa_session_token');

      // 8. Verificar código de backup
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          backupCodes: mockHashedBackupCodes,
        }),
      });

      const backupVerifyResult = await twoFactorAuthService.verifyBackupCode(backupCodes[0]);
      expect(backupVerifyResult.success).toBe(true);

      // 9. Desabilitar 2FA
      const disableResult = await twoFactorAuthService.disable2FA();
      expect(disableResult.success).toBe(true);

      // 10. Verificar que 2FA está desabilitado agora
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ twoFactorEnabled: false }),
      });

      const finalStatus = await twoFactorAuthService.is2FAEnabled();
      expect(finalStatus).toBe(false);
    });
  });
});
