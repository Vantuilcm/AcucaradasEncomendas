import { auth, db } from '../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  deleteField,
  DocumentReference,
  Firestore,
} from 'firebase/firestore';
import {
  sendEmailVerification,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  User,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { loggingService } from './LoggingService';
import { secureLoggingService } from './SecureLoggingService';
import { AuthWithCurrentUser } from '../types/firebase';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';

// Tempo de validade do código em segundos (5 minutos)
const CODE_EXPIRATION_TIME = 5 * 60;
// Número de códigos de backup a gerar
const BACKUP_CODES_COUNT = 10;
// Comprimento dos códigos de backup
const BACKUP_CODE_LENGTH = 8;

export interface TwoFactorAuthResult {
  success: boolean;
  message?: string;
  error?: string;
  backupCodes?: string[];
}

export class TwoFactorAuthService {
  // Nome da coleção no Firestore
  private readonly collection = 'usersAuth';
  private readonly firestore: Firestore;
  private readonly authService: AuthWithCurrentUser;
  private readonly functions: Functions;

  constructor() {
    this.firestore = db;
    this.authService = auth as AuthWithCurrentUser;
    this.functions = getFunctions();
  }

  /**
   * Verificar se o 2FA está habilitado para o usuário atual
   */
  async is2FAEnabled(): Promise<boolean> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return false;
      }

      const userDoc = await getDoc(doc(this.firestore, this.collection, currentUser.uid));
      return userDoc.exists() && userDoc.data()?.twoFactorEnabled === true;
    } catch (error) {
      secureLoggingService.security('Erro ao verificar status do 2FA', { 
        userId: this.authService.currentUser?.uid,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Habilitar autenticação de dois fatores para o usuário atual
   */
  async enable2FA(): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      if (!currentUser.email) {
        return {
          success: false,
          error: 'O usuário precisa ter um email para habilitar 2FA.',
        };
      }

      if (!currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
        return {
          success: false,
          message:
            'Você precisa verificar seu email antes de habilitar 2FA. Um email de verificação foi enviado.',
          error: 'Email não verificado.',
        };
      }

      // Gerar códigos de backup
      const backupCodes = await this.generateBackupCodes();

      // Hash dos códigos para armazenar com segurança
      const backupCodesHashes = await Promise.all(
        backupCodes.map(async code => this.hashBackupCode(code))
      );

      // Atualizar o documento do usuário
      await setDoc(
        doc(this.firestore, this.collection, currentUser.uid),
        {
          twoFactorEnabled: true,
          email: currentUser.email,
          backupCodes: backupCodesHashes,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      secureLoggingService.security('2FA habilitado com sucesso', { 
        userId: currentUser.uid,
        email: currentUser.email,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Autenticação de dois fatores habilitada com sucesso.',
        backupCodes: backupCodes,
      };
    } catch (error) {
      secureLoggingService.security('Erro ao habilitar 2FA', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao habilitar a autenticação de dois fatores.',
      };
    }
  }

  /**
   * Desabilitar a autenticação de dois fatores
   */
  async disable2FA(): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      // Atualizar o documento do usuário
      await updateDoc(doc(this.firestore, this.collection, currentUser.uid), {
        twoFactorEnabled: false,
        backupCodes: deleteField(),
        updatedAt: new Date(),
      });

      secureLoggingService.security('2FA desabilitado com sucesso', { 
        userId: currentUser.uid,
        email: currentUser.email,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Autenticação de dois fatores desabilitada com sucesso.',
      };
    } catch (error) {
      secureLoggingService.security('Erro ao desabilitar 2FA', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao desabilitar a autenticação de dois fatores.',
      };
    }
  }

  /**
   * Gerar novos códigos de backup para o usuário
   */
  async regenerateBackupCodes(): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      const userDoc = await getDoc(doc(this.firestore, this.collection, currentUser.uid));
      if (!userDoc.exists() || !userDoc.data()?.twoFactorEnabled) {
        return {
          success: false,
          error: 'Autenticação de dois fatores não está habilitada.',
        };
      }

      // Gerar novos códigos de backup
      const backupCodes = await this.generateBackupCodes();

      // Hash dos códigos para armazenar com segurança
      const backupCodesHashes = await Promise.all(
        backupCodes.map(async code => this.hashBackupCode(code))
      );

      // Atualizar o documento do usuário
      await updateDoc(doc(this.firestore, this.collection, currentUser.uid), {
        backupCodes: backupCodesHashes,
        updatedAt: new Date(),
      });

      secureLoggingService.security('Códigos de backup regenerados com sucesso', { 
        userId: currentUser.uid,
        email: currentUser.email,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Novos códigos de backup gerados com sucesso.',
        backupCodes: backupCodes,
      };
    } catch (error) {
      secureLoggingService.security('Erro ao regenerar códigos de backup', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar novos códigos de backup.',
      };
    }
  }

  /**
   * Gerar e enviar código de verificação por email
   */
  async generateAndSendVerificationCode(): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser || !currentUser.email) {
        return {
          success: false,
          error: 'Usuário não autenticado ou sem email.',
        };
      }

      // Gerar código aleatório de 6 dígitos
      const randomValues = new Uint8Array(4);
      try {
        const cryptoObj = (globalThis as any)?.crypto;
        if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
          cryptoObj.getRandomValues(randomValues);
        } else {
          for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 256);
        }
      } catch {
        for (let i = 0; i < randomValues.length; i++) randomValues[i] = Math.floor(Math.random() * 256);
      }
      const code = Array.from(randomValues)
        .map(byte => (byte as number) % 10)
        .join('')
        .substring(0, 6)
        .padStart(6, '0');

      // Salvar o código junto com o timestamp de expiração
      const expirationTimeDate = new Date(Date.now() + CODE_EXPIRATION_TIME * 1000);

      await setDoc(
        doc(this.firestore, this.collection, currentUser.uid),
        {
          verificationCode: code,
          codeExpiration: expirationTimeDate,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // No ambiente de desenvolvimento, vamos registrar o código no console
      if (__DEV__) {
        loggingService.debug('Código de verificação 2FA (DEV)', { code });
        return {
          success: true,
          message: 'Código de verificação gerado em modo de desenvolvimento. Verifique o console.',
        };
      } else {
        // Em produção, usar o Firebase Cloud Functions para enviar o email
        try {
          // Chamar a Cloud Function
          const sendVerificationCode = httpsCallable<
            { email: string; code: string },
            { success: boolean }
          >(this.functions, 'sendVerificationCode');

          const result = await sendVerificationCode({
            email: currentUser.email,
            code: code,
          });

          // Log da resposta
          secureLoggingService.security('Enviado código de verificação via Cloud Function', {
            userId: currentUser.uid,
            email: currentUser.email,
            result: result.data,
            timestamp: new Date().toISOString()
          });

          return {
            success: true,
            message: 'Código de verificação enviado para seu email.',
          };
        } catch (emailError) {
          secureLoggingService.security('Erro ao enviar email de verificação', { 
            userId: currentUser.uid,
            email: currentUser.email,
            errorMessage: (emailError instanceof Error) ? emailError.message : 'Erro desconhecido',
            timestamp: new Date().toISOString()
          });

          // Se houver erro ao enviar o email, ainda retornamos sucesso para o usuário
          // pois o código foi gerado e salvo, mas logamos o erro internamente
          return {
            success: true,
            message: 'Código de verificação gerado. Verifique seu email ou tente novamente.',
          };
        }
      }
    } catch (error) {
      secureLoggingService.security('Erro ao gerar código de verificação', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar código de verificação.',
      };
    }
  }

  /**
   * Verificar código de autenticação de dois fatores
   */
  async verifyCode(inputCode: string): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      const userDoc = await getDoc(doc(this.firestore, this.collection, currentUser.uid));
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Configuração de 2FA não encontrada.',
        };
      }

      const userData = userDoc.data();
      if (!userData) {
        return {
          success: false,
          error: 'Dados de usuário não encontrados.',
        };
      }

      const storedCode = userData.verificationCode;
      let codeExpiration: Date | undefined;
const rawExpiration = (userData as any).codeExpiration;
if (rawExpiration) {
  if (rawExpiration instanceof Date) {
    codeExpiration = rawExpiration;
  } else if (typeof rawExpiration?.toDate === "function") {
    codeExpiration = rawExpiration.toDate();
  } else if (typeof rawExpiration === "string") {
    const parsed = new Date(rawExpiration);
    if (!isNaN(parsed.getTime())) codeExpiration = parsed;
  }
}


      // Verificar se o código existe e não expirou
      if (storedCode && codeExpiration && codeExpiration >= new Date()) {
        // Verificar se o código está correto
        if (storedCode === inputCode) {
          // Limpar o código usado
          await updateDoc(doc(this.firestore, this.collection, currentUser.uid), {
            verificationCode: deleteField(),
            codeExpiration: deleteField(),
            lastVerifiedAt: new Date(),
          });

          // Gerar token de sessão para evitar verificações repetidas
          const sessionToken = await this.generateSessionToken();
          await SecureStore.setItemAsync('2fa_session_token', sessionToken);

          secureLoggingService.security('Verificação 2FA concluída com sucesso', { 
            userId: currentUser.uid,
            email: currentUser.email,
            timestamp: new Date().toISOString()
          });

          return {
            success: true,
            message: 'Verificação concluída com sucesso.',
          };
        } else {
          return {
            success: false,
            error: 'Código de verificação incorreto.',
          };
        }
      }

      // Se chegou aqui, talvez seja um código de backup
      return await this.verifyBackupCode(inputCode);
    } catch (error) {
      secureLoggingService.security('Erro ao verificar código 2FA', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: (error instanceof Error) ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar código.',
      };
    }
  }

  /**
   * Verificar código de backup
   */
  async verifyBackupCode(backupCode: string): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      const userDoc = await getDoc(doc(this.firestore, this.collection, currentUser.uid));
      if (!userDoc.exists()) {
        return {
          success: false,
          error: 'Configuração de 2FA não encontrada.',
        };
      }

      const userData = userDoc.data();
      if (!userData) {
        return {
          success: false,
          error: 'Dados de usuário não encontrados.',
        };
      }

      const storedBackupCodesRaw = (userData as any).backupCodes || [];
const storedBackupCodes: string[] = Array.isArray(storedBackupCodesRaw) ? storedBackupCodesRaw.map((v: any) => String(v)) : [];

      // Hash do código informado
      const inputCodeHash = await this.hashBackupCode(backupCode);

      // Verificar se o código está na lista
      const codeIndex = storedBackupCodes.indexOf(inputCodeHash);
      if (codeIndex >= 0) {
        // Remover o código usado
        storedBackupCodes.splice(codeIndex, 1);

        await updateDoc(doc(this.firestore, this.collection, currentUser.uid), {
          backupCodes: storedBackupCodes,
          lastVerifiedAt: new Date(),
        });

        // Gerar token de sessão para evitar verificações repetidas
        const sessionToken = await this.generateSessionToken();
        await SecureStore.setItemAsync('2fa_session_token', sessionToken);

        secureLoggingService.security('Verificação 2FA com código de backup concluída', {
          userId: currentUser.uid,
          timestamp: new Date().toISOString(),
          method: 'backup_code'
        });

        return {
          success: true,
          message:
            'Código de backup aceito. Por favor, gere novos códigos de backup, pois este foi consumido.',
        };
      }

      return {
        success: false,
        error: 'Código de backup inválido.',
      };
    } catch (error) {
      secureLoggingService.security('Erro ao verificar código de backup', { 
        userId: this.authService.currentUser?.uid,
        email: this.authService.currentUser?.email,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar código de backup.',
      };
    }
  }

  /**
   * Verificar email do usuário
   */
  async verifyEmail(): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: 'Usuário não autenticado.',
        };
      }

      await sendEmailVerification(currentUser);

      loggingService.info('Email de verificação enviado', { userId: currentUser.uid });

      return {
        success: true,
        message: 'Email de verificação enviado. Verifique sua caixa de entrada.',
      };
    } catch (error) {
      loggingService.error(
        'Erro ao enviar email de verificação',
        error instanceof Error ? error : undefined,
        { userId: this.authService.currentUser?.uid }
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar email de verificação.',
      };
    }
  }

  /**
   * Alterar email do usuário com verificação
   */
  async updateEmail(newEmail: string, password: string): Promise<TwoFactorAuthResult> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser || !currentUser.email) {
        return {
          success: false,
          error: 'Usuário não autenticado ou sem email.',
        };
      }

      // Reautenticar usuário antes de alterar email
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // Atualizar email (irá enviar email de verificação automaticamente)
      await updateEmail(currentUser, newEmail);
      await sendEmailVerification(currentUser);

      // Atualizar dados no Firestore
      await updateDoc(doc(this.firestore, this.collection, currentUser.uid), {
        email: newEmail,
        updatedAt: new Date(),
      });

      loggingService.info('Solicitação de atualização de email enviada', {
        userId: currentUser.uid,
      });

      return {
        success: true,
        message:
          'Enviamos um email de verificação para o novo endereço. Por favor, verifique sua caixa de entrada.',
      };
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar email',
        error instanceof Error ? error : undefined,
        { userId: this.authService.currentUser?.uid, newEmail }
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar email.',
      };
    }
  }

  /**
   * Gerar códigos de backup
   * @private
   */
  private async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      // Gerar bytes aleatórios com WebCrypto se disponível, caso contrário fallback
      const randomBytes = new Uint8Array(BACKUP_CODE_LENGTH / 2);
      try {
        const cryptoObj = (globalThis as any)?.crypto;
        if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
          cryptoObj.getRandomValues(randomBytes);
        } else {
          for (let j = 0; j < randomBytes.length; j++) {
            randomBytes[j] = Math.floor(Math.random() * 256);
          }
        }
      } catch {
        for (let j = 0; j < randomBytes.length; j++) {
          randomBytes[j] = Math.floor(Math.random() * 256);
        }
      }

      // Converter para formato legível e memorável (grupos de 4 caracteres)
      const code = Array.from(randomBytes)
        .map(byte => (byte as number).toString(16).padStart(2, '0'))
        .join('')
        .substring(0, BACKUP_CODE_LENGTH);

      // Formatar em grupos para facilitar a leitura (ex: ABCD-EFGH)
      const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;

      codes.push(formattedCode);
    }

    return codes;
  }

  /**
   * Hash do código de backup para armazenamento seguro
   * @private
   */
  private async hashBackupCode(code: string): Promise<string> {
    // Remover formatação
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');

    // Criar hash SHA-256 usando CryptoJS
    return CryptoJS.SHA256(cleanCode).toString();
  }

  /**
   * Gerar um token de sessão para 2FA
   */
  private async generateSessionToken(): Promise<string> {
    const randomBytes = new Uint8Array(32);
    try {
      const cryptoObj = (globalThis as any)?.crypto;
      if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        cryptoObj.getRandomValues(randomBytes);
      } else {
        for (let i = 0; i < randomBytes.length; i++) {
          randomBytes[i] = Math.floor(Math.random() * 256);
        }
      }
    } catch {
      for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(randomBytes)
      .map(byte => (byte as number).toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verificar se o usuário tem uma sessão 2FA válida
   */
  async hasValidSession(): Promise<boolean> {
    try {
      const sessionToken = await SecureStore.getItemAsync('2fa_session_token');
      return !!sessionToken;
    } catch (error) {
      secureLoggingService.security('Erro ao verificar sessão 2FA', { 
        userId: this.authService.currentUser?.uid,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'low'
      });
      return false;
    }
  }

  /**
   * Limpar a sessão 2FA
   */
  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('2fa_session_token');
    } catch (error) {
      secureLoggingService.security('Erro ao limpar sessão 2FA', { 
        userId: this.authService.currentUser?.uid,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'low'
      });
    }
  }
}




