import AsyncStorage from '@react-native-async-storage/async-storage';

// Mantém mesma interface pública usada no app para compatibilidade.
export interface TwoFactorAuthResult {
  success: boolean;
  message?: string;
  error?: string;
  backupCodes?: string[];
}

const CODE_EXPIRATION_TIME_MS = 5 * 60 * 1000; // 5 minutos

export class TwoFactorAuthService {
  constructor() {}

  async is2FAEnabled(): Promise<boolean> {
    const flag = await AsyncStorage.getItem('twoFactorEnabled');
    return flag === 'true';
  }

  async generateAndSendVerificationCode(): Promise<TwoFactorAuthResult> {
    // Gera um código de 6 dígitos e salva com expiração em AsyncStorage.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + CODE_EXPIRATION_TIME_MS;
    await AsyncStorage.multiSet([
      ['twoFactorCode', code],
      ['twoFactorCodeExpiresAt', String(expiresAt)],
    ]);

    return {
      success: true,
      message: 'Código de verificação gerado (ambiente web).',
    };
  }

  async verifyCode(inputCode: string): Promise<TwoFactorAuthResult> {
    const [storedCodeEntry, expiresEntry] = await AsyncStorage.multiGet([
      'twoFactorCode',
      'twoFactorCodeExpiresAt',
    ]);
    const storedCode = storedCodeEntry[1];
    const expiresAtStr = expiresEntry[1];
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

    if (!storedCode) {
      return { success: false, error: 'Código de verificação não encontrado.' };
    }
    if (Date.now() > expiresAt) {
      return { success: false, error: 'Código de verificação expirado.' };
    }
    if (storedCode !== inputCode) {
      return { success: false, error: 'Código de verificação incorreto.' };
    }

    // Limpa código após verificação e simula sessão válida.
    await AsyncStorage.multiRemove(['twoFactorCode', 'twoFactorCodeExpiresAt']);
    await AsyncStorage.setItem('twoFactorSessionToken', 'session-token-web');

    return { success: true, message: 'Verificação concluída com sucesso.' };
  }

  async hasValidSession(): Promise<boolean> {
    const token = await AsyncStorage.getItem('twoFactorSessionToken');
    return !!token;
  }

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem('twoFactorSessionToken');
  }
}