import React, { createContext, useContext, useEffect, useState } from 'react';
import { OneSignal } from '@/config/onesignal';
import { db as firestore, auth, db as fdb, firebaseAvailable } from '@/config/firebase';
import { Alert, TouchableWithoutFeedback, InteractionManager } from 'react-native';
import { User } from '@/models/User';
import { AuthService } from '@/services/AuthService';
// Normalize import casing to match actual file path on case-insensitive filesystems
import { SecurityService as SecurityServiceBase } from '@/services/AppSecurityService';
const SecurityService = SecurityServiceBase;
// import { loggingService } from '@/services/LoggingService';
import { DeviceSecurityService } from '@/services/DeviceSecurityService';
import { secureLoggingService } from '@/services/SecureLoggingService';
import { SecureStorageService } from '@/services/SecureStorageService';
import { clearPendingHref } from '../navigation/pendingNavigation';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { signInWithCredential, GoogleAuthProvider, OAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import * as CryptoJS from 'crypto-js';

const bytesToHex = (bytes: Uint8Array): string => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
const generateNonceAsync = async (length: number = 32): Promise<string> => {
  return generateNonceSync(length);
};
const generateNonceSync = (length: number = 32): string => {
  try {
    const cryptoObj = (globalThis as any)?.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      const bytes = new Uint8Array(length);
      cryptoObj.getRandomValues(bytes);
      return bytesToHex(bytes);
    }
  } catch {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};
const base64Url = (input: string): string => input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/[^a-fA-F0-9]/g, '');
  const len = clean.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
};
const toBase64 = (bytes: Uint8Array): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  if (i < bytes.length) {
    let n = bytes[i] << 16;
    const rem = bytes.length - i;
    if (rem === 2) n |= bytes[i + 1] << 8;
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + (rem === 2 ? chars[(n >> 6) & 63] : '=') + '=';
  }
  return result;
};
const generateCodeVerifierAsync = async (): Promise<string> => {
  return generateNonceSync(32);
};
const codeChallengeFromVerifierAsync = async (verifier: string): Promise<string> => {
  const wa = CryptoJS.SHA256(verifier);
  const b64std = CryptoJS.enc.Base64.stringify(wa as any);
  return base64Url(b64std);
};
const parseIdTokenFromUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('id_token');
    if (q) return q;
    const h = u.hash || '';
    const m = h.match(/id_token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    const m = url.match(/id_token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }
};
const parseGoogleErrorFromUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    const err = u.searchParams.get('error') || undefined;
    const desc = u.searchParams.get('error_description') || undefined;
    if (err && desc) return `${err}: ${desc}`;
    if (err) return err;
    const h = u.hash || '';
    const mhErr = h.match(/error=([^&]+)/);
    const mhDesc = h.match(/error_description=([^&]+)/);
    const he = mhErr ? decodeURIComponent(mhErr[1]) : undefined;
    const hd = mhDesc ? decodeURIComponent(mhDesc[1]) : undefined;
    if (he && hd) return `${he}: ${hd}`;
    return he ?? hd ?? undefined;
  } catch {
    const mhErr = url.match(/error=([^&]+)/);
    const mhDesc = url.match(/error_description=([^&]+)/);
    const he = mhErr ? decodeURIComponent(mhErr[1]) : undefined;
    const hd = mhDesc ? decodeURIComponent(mhDesc[1]) : undefined;
    if (he && hd) return `${he}: ${hd}`;
    return he ?? hd ?? undefined;
  }
};
const parseAccessTokenFromUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('access_token');
    if (q) return q;
    const h = u.hash || '';
    const m = h.match(/access_token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    const m = url.match(/access_token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }
};
const GOOGLE_WEB_CLIENT_ID_FALLBACK = '627855691834-d3jm1hc7o3p6l6j26mc8u3ouhve27iqv.apps.googleusercontent.com';
const FACEBOOK_APP_ID =
  (process.env.EXPO_PUBLIC_FACEBOOK_APP_ID as string | undefined) ||
  (Constants.expoConfig?.extra as any)?.facebookAppId ||
  '';
const parseCodeFromUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('code');
    if (q) return q;
    const h = u.hash || '';
    const m = h.match(/code=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    const m = url.match(/code=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([
      promise.finally(() => {
        try {
          if (timeoutId) clearTimeout(timeoutId);
        } catch {}
      }),
      timeoutPromise,
    ]);
  } catch {
    try {
      if (timeoutId) clearTimeout(timeoutId);
    } catch {}
    return fallback;
  }
};

// Interface para o contexto de autenticação
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error?: string;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: User, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshUserActivity: () => void;
  deleteAccount?: () => Promise<void>;
  // Métodos opcionais para autenticação social (podem não estar implementados)
  signInWithGoogle?: (preferredRole?: 'customer' | 'producer' | 'courier') => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook?: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple?: (preferredRole?: 'customer' | 'producer' | 'courier') => Promise<{ success: boolean; error?: string }>;
  is2FAEnabled?: boolean;
}

// Criar o contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provedor do contexto de autenticação
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isDeviceSecure, setIsDeviceSecure] = useState<boolean>(true);
  const [noncePrecomputed, setNoncePrecomputed] = useState<string | null>(null);

  const authService = new AuthService();

  // Verificar segurança do dispositivo
  useEffect(() => {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);

    let cancelled = false;
    let timeoutId: any = null;
    let interactionHandle: any = null;

    const checkDeviceSecurity = async () => {
      try {
        if (cancelled || isTestEnv) return;
        const securityCheck = await DeviceSecurityService.performSecurityCheck();
        if (cancelled) return;
        if (securityCheck.compromised) {
          setIsDeviceSecure(false);
          secureLoggingService.security('Dispositivo comprometido detectado', {
            compromised: securityCheck.compromised,
            emulator: securityCheck.emulator,
            debugging: securityCheck.debugging
          });
        }
      } catch (error) {
        if (!cancelled) {
          secureLoggingService.error('Erro ao verificar segurança do dispositivo', {
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };
    
    if (!isTestEnv) {
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        timeoutId = setTimeout(() => {
          checkDeviceSecurity();
        }, 1000);
      });
    }

    if (!isTestEnv) {
      generateNonceAsync(32)
        .then(nonce => {
          if (!cancelled) setNoncePrecomputed(nonce);
        })
        .catch(() => {});
    }
    if (Platform.OS !== 'web') {
      if (!isTestEnv) {
        try { (WebBrowser as any)?.warmUpAsync?.(); } catch (_) {}
        return () => {
          cancelled = true;
          try { if (timeoutId) clearTimeout(timeoutId); } catch {}
          try { interactionHandle?.cancel?.(); } catch {}
          try { (WebBrowser as any)?.coolDownAsync?.(); } catch (_) {}
        };
      }

      return () => {
        cancelled = true;
        try { if (timeoutId) clearTimeout(timeoutId); } catch {}
        try { interactionHandle?.cancel?.(); } catch {}
      };
    }

    return () => {
      cancelled = true;
      try { if (timeoutId) clearTimeout(timeoutId); } catch {}
      try { interactionHandle?.cancel?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    let unsub: any = null;
    if (firebaseAvailable) {
      const uid = (user as any)?.id;
      if (uid) {
        const ref: any = doc(fdb as any, 'users', uid);
        unsub = onSnapshot(ref, (snap: any) => {
          if (snap && typeof snap.exists === 'function' ? snap.exists() : false) {
            const data = snap.data() as User;
            setUser({ ...data, id: uid } as any);
          }
        });
      }
    }
    return () => { try { typeof unsub === 'function' && unsub(); } catch {} };
  }, [firebaseAvailable, (user as any)?.id]);

  // Verificar autenticação ao iniciar o app
  useEffect(() => {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) {
      setLoading(false);
      return () => {
        SecurityService.stopActivityMonitor();
      };
    }

    const checkAuth = async () => {
      try {
        // Verificar se existe um token salvo
        const token = await withTimeout(SecureStorageService.getData('authToken'), 2500, null);
        if (token) {
          setAuthToken(token);
          const tokenOkRemote = await withTimeout(
            (async () => {
              try {
                await authService.validarToken(token as any);
                return true;
              } catch {
                return false;
              }
            })(),
            6000,
            false
          );
          const tokenOk = SecurityService.validateToken(token) || tokenOkRemote;
          if (!tokenOk) {
            await logout();
            return;
          }
          const payload = SecurityService.getTokenPayload(token) as any;
          const userId: string | undefined = payload?.id ?? payload?.uid ?? payload?.sub;

          const resolvedUserId = userId || (firebaseAvailable && (auth as any)?.currentUser?.uid) || undefined;

          if (resolvedUserId) {
            if (firebaseAvailable) {
              const snap = await withTimeout(
                getDoc(doc(fdb as any, 'users', resolvedUserId)),
                6000,
                null as any
              );
              if (snap && typeof snap.exists === 'function' && snap.exists()) {
                const userData = (snap.data ? (snap.data() as User) : ({} as User)) as User;
                setUser({ ...(userData as any), id: resolvedUserId } as any);
                try {
                  const d: any = userData || {};
                  const roleRaw: any = (d.role as any) ?? 'customer';
                  const activeRaw: any = (d.activeRole as any) ?? undefined;
                  const rolesArr: string[] = Array.isArray(d.roles) ? d.roles : [roleRaw];
                  const hasProducer = rolesArr.includes('producer') || rolesArr.includes('produtor') || roleRaw === 'producer' || roleRaw === 'produtor' || roleRaw === 'admin';
                  const normalizedActive: any = hasProducer ? 'producer' : (activeRaw ?? roleRaw ?? 'customer');
                  const nextRoles = Array.from(new Set([...rolesArr, normalizedActive]));
                  if (activeRaw !== normalizedActive || !Array.isArray(d.roles)) {
                    await withTimeout(
                      setDoc(
                        doc(fdb as any, 'users', resolvedUserId),
                        { activeRole: normalizedActive, roles: nextRoles } as any,
                        { merge: true } as any
                      ),
                      6000,
                      undefined as any
                    );
                  }
                } catch {}
                try { secureLoggingService.setUserId(resolvedUserId); } catch {}
                SecurityService.startActivityMonitor(() => logout());
              } else {
                setUser({ id: resolvedUserId } as any);
                try { secureLoggingService.setUserId(resolvedUserId); } catch {}
                SecurityService.startActivityMonitor(() => logout());
              }
            } else {
              setUser({ id: resolvedUserId } as any);
              try { secureLoggingService.setUserId(resolvedUserId); } catch {}
              SecurityService.startActivityMonitor(() => logout());
            }
          } else {
            await logout();
          }
        } else {
          await logout();
        }
      } catch (error) {
        secureLoggingService.security('Erro ao verificar autenticação', { 
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        await logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Limpar monitor de atividade ao desmontar
    return () => {
      SecurityService.stopActivityMonitor();
    };
  }, []);

  useEffect(() => {
    if (user?.id && Platform.OS !== 'web') {
      try {
        if (typeof (OneSignal as any)?.login === 'function') {
          (OneSignal as any).login(user.id);
        }
        secureLoggingService.security('OneSignal Login realizado', { userId: user.id });
      } catch (err) {
        console.warn('[AuthContext] Erro ao realizar login no OneSignal:', err);
      }
    }
  }, [user?.id]);

  // Método de login
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(undefined);
      
      // Registrar tentativa de login (antes da verificação de segurança)
      secureLoggingService.security('Tentativa de login iniciada', { email });
      
      // Verificar segurança do dispositivo antes do login
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Tentativa de login em dispositivo comprometido', {
          email,
          compromised: securityCheck.compromised,
          emulator: securityCheck.emulator,
          debugging: securityCheck.debugging
        });
        
        // Permitir login, mas com alerta
        try { (Alert as any)?.alert?.(
          'Alerta de Segurança',
          'Este dispositivo pode estar comprometido. Algumas funcionalidades podem ser limitadas para sua segurança.',
          [{ text: 'Continuar', style: 'cancel' }]
        ); } catch {}
      }

      // Sanitizar entradas
      const sanitizedEmail = SecurityService.sanitizeInput(email);

      // Verificar bloqueio por tentativas incorretas
      const canAttempt = await SecurityService.registerLoginAttempt(false, sanitizedEmail);
      if (!canAttempt) {
        secureLoggingService.security('Tentativa de login bloqueada por excesso de tentativas', { email: sanitizedEmail });
        setError('Muitas tentativas de login. Tente novamente mais tarde.');
        try { (Alert as any)?.alert?.('Conta bloqueada', 'Muitas tentativas de login. Tente novamente mais tarde.'); } catch {}
        return;
      }

      // Realizar autenticação
      const { user: authUser, token } = await authService.autenticarUsuario(
        sanitizedEmail,
        password
      );

      if (authUser && token) {
        // Registrar tentativa bem-sucedida
        await SecurityService.registerLoginAttempt(true, sanitizedEmail);

        // Armazenar token
        await SecureStorageService.storeData('authToken', token);
        setAuthToken(token);

        if (firebaseAvailable) {
          const snap = await getDoc(doc(fdb as any, 'users', authUser.id));
          if (snap.exists()) {
            const userData = snap.data() as User;
            const activeRaw = (userData as any)?.activeRole as any;
            const roleRaw = (userData as any)?.role as any;
            const rolesArr: string[] = Array.isArray((userData as any)?.roles) ? ((userData as any)?.roles as string[]) : [roleRaw ?? 'customer'];
            const hasProducer = rolesArr.includes('producer') || rolesArr.includes('produtor') || roleRaw === 'producer' || roleRaw === 'produtor' || roleRaw === 'admin';
            const normalizedActive: any = hasProducer ? 'producer' : (activeRaw ?? roleRaw ?? 'customer');
            if (activeRaw !== normalizedActive) {
              try { await setDoc(doc(fdb as any, 'users', authUser.id), { activeRole: normalizedActive } as any, { merge: true } as any); } catch {}
            }
            setUser({ ...userData, id: authUser.id, activeRole: normalizedActive } as any);
            try { secureLoggingService.setUserId(authUser.id as any); } catch {}
            SecurityService.startActivityMonitor(() => logout());
            secureLoggingService.security('Login bem-sucedido', { userId: authUser.id, timestamp: new Date().toISOString() });
          } else {
            setUser(authUser);
            try { secureLoggingService.setUserId(authUser.id as any); } catch {}
            SecurityService.startActivityMonitor(() => logout());
            secureLoggingService.security('Login bem-sucedido (sem perfil no Firestore)', { userId: authUser.id, timestamp: new Date().toISOString() });
          }
        } else {
          setUser(authUser);
          try { secureLoggingService.setUserId(authUser.id as any); } catch {}
          SecurityService.startActivityMonitor(() => logout());
          secureLoggingService.security('Login bem-sucedido (Firebase indisponível)', { userId: authUser.id, timestamp: new Date().toISOString() });
        }
      } else {
        secureLoggingService.security('Falha na autenticação', { email: sanitizedEmail });
        throw new Error('Falha na autenticação');
      }
    } catch (error) {
      const err = error as any;
      const code = (err && err.code) ? String(err.code) : '';
      let msg = (err && err.message) ? String(err.message) : 'Erro desconhecido';
      if (code === 'auth/invalid-email') msg = 'Email inválido';
      else if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) msg = 'E-mail ou senha incorretos';
      else if (code === 'auth/too-many-requests') msg = 'Muitas tentativas de login. Tente novamente mais tarde.';
      else if (code === 'auth/network-request-failed') msg = 'Falha de rede. Verifique sua conexão.';
      else if (code === 'auth/user-disabled') msg = 'Conta desativada. Contate o suporte.';
      else if (code === 'auth/operation-not-allowed') msg = 'Método de login desativado no Firebase. Ative "Email/Senha".';
      secureLoggingService.security('Erro ao fazer login', { 
        email: email, 
        errorMessage: msg,
        errorCode: code || 'unknown'
      });
      setError(msg);
      try { (Alert as any)?.alert?.('Erro', msg); } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!firebaseAvailable) return;
    const uid = (user as any)?.id;
    if (!uid) return;
    const ref = doc(fdb as any, 'users', uid);
    const unsub = onSnapshot(ref, (snap: any) => {
      if (snap && typeof snap.exists === 'function' ? snap.exists() : false) {
        const data = snap.data() as User;
        setUser({ ...data, id: uid } as any);
      }
    });
    return () => { try { typeof unsub === 'function' && unsub(); } catch {} };
  }, [firebaseAvailable, (user as any)?.id]);

  const signInWithGoogleImpl = async (preferredRole?: 'customer' | 'producer' | 'courier'): Promise<{ success: boolean; error?: string }> => {
    try {
      if (typeof (WebBrowser as any)?.maybeCompleteAuthSession === 'function') {
        (WebBrowser as any).maybeCompleteAuthSession();
      }
      const iosClientId =
        (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS as string | undefined) ||
        (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string | undefined) ||
        (Constants.expoConfig?.extra as any)?.googleClientIdIos ||
        (Constants.expoConfig?.extra as any)?.googleIosClientId;
      const androidClientId =
        (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID as string | undefined) ||
        (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string | undefined) ||
        (Constants.expoConfig?.extra as any)?.googleClientIdAndroid ||
        (Constants.expoConfig?.extra as any)?.googleAndroidClientId;
      const webClientId =
        (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB as string | undefined) ||
        (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string | undefined) ||
        (Constants.expoConfig?.extra as any)?.googleClientIdWeb ||
        (Constants.expoConfig?.extra as any)?.googleWebClientId ||
        GOOGLE_WEB_CLIENT_ID_FALLBACK;
      const clientId = webClientId ?? iosClientId ?? androidClientId;
      if (!clientId) {
        return { success: false, error: 'Configuração do Google ausente' };
      }
      const nonce = noncePrecomputed ?? generateNonceSync(32);

      let idToken: string | undefined;
      let accessToken: string | undefined;
      const isStandalone = String(Constants.appOwnership) === 'standalone';
      const useIosNativeRedirect = Platform.OS === 'ios' && !!iosClientId && isStandalone;
      try { secureLoggingService.security('Google OAuth config', { platform: Platform.OS, iosClientId, androidClientId, webClientId, useIosNativeRedirect }); } catch (_) {}
      if (useIosNativeRedirect) {
        const scheme = `com.googleusercontent.apps.${String(iosClientId).replace(/\.apps\.googleusercontent\.com$/,'')}`;
        const redirectUriNative = `${scheme}:/oauthredirect`;
        const verifier = await generateCodeVerifierAsync();
        const challenge = await codeChallengeFromVerifierAsync(verifier);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(iosClientId!)}&redirect_uri=${encodeURIComponent(redirectUriNative)}&response_type=${encodeURIComponent('code')}&scope=${encodeURIComponent('openid email profile')}&prompt=${encodeURIComponent('select_account')}&state=${encodeURIComponent(nonce)}&code_challenge_method=S256&code_challenge=${encodeURIComponent(challenge)}`;
        let code: string | undefined;
        if (typeof (WebBrowser as any)?.openAuthSessionAsync === 'function') {
          try {
            const wbRes = await (WebBrowser as any).openAuthSessionAsync(authUrl, redirectUriNative, { preferEphemeralSession: true } as any);
            try { secureLoggingService.security('Google OAuth iOS wbRes', { wbRes }); } catch (_) {}
            if (wbRes?.type === 'success' && typeof wbRes?.url === 'string') {
              code = parseCodeFromUrl(wbRes.url);
              if (!code) {
                const errDetail = parseGoogleErrorFromUrl(wbRes.url);
                if (errDetail) throw new Error(errDetail);
              }
            }
          } finally {
            try { (WebBrowser as any)?.dismissBrowser?.(); } catch (_) {}
          }
        }
        if (!code && typeof (AuthSession as any)?.startAsync === 'function') {
          const res = await (AuthSession as any).startAsync({ authUrl, returnUrl: redirectUriNative });
          try { secureLoggingService.security('Google OAuth iOS res', { res }); } catch (_) {}
          if (res?.type === 'success') {
            code = (res.params as any)?.code as string | undefined;
            if (!code && typeof (res as any)?.url === 'string') {
              code = parseCodeFromUrl((res as any).url);
              if (!code) {
                const errDetail = parseGoogleErrorFromUrl((res as any).url);
                if (errDetail) throw new Error(errDetail);
              }
            }
          }
        }
        if (code) {
          const body = new URLSearchParams({
            client_id: iosClientId!,
            code,
            redirect_uri: redirectUriNative,
            grant_type: 'authorization_code',
            code_verifier: verifier,
          }).toString();
          const resp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          let tok: any = null;
          try { tok = await resp.json(); } catch (_) { tok = null; }
          const it = tok?.id_token as string | undefined;
          if (it) idToken = it;
          if (!it) accessToken = tok?.access_token as string | undefined;
        }
        if (!idToken && !accessToken) {
          const hasMakeRedirect = typeof (AuthSession as any)?.makeRedirectUri === 'function';
          const hasStartAsync = typeof (AuthSession as any)?.startAsync === 'function';
          const redirectUriProxy = hasMakeRedirect ? (AuthSession as any).makeRedirectUri({ useProxy: true, projectNameForProxy: '@acucaradaencomendas/acucaradas-encomendas' }) : `${Constants.expoConfig?.scheme ?? 'acucaradas-encomendas'}://redirect`;
          const cid = webClientId || iosClientId!;
          const authUrlP = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirectUriProxy)}&response_type=${encodeURIComponent('token id_token')}&scope=${encodeURIComponent('openid profile email')}&nonce=${encodeURIComponent(nonce)}&prompt=${encodeURIComponent('select_account')}&state=${encodeURIComponent(nonce)}`;
          if (typeof (WebBrowser as any)?.openAuthSessionAsync === 'function') {
            try {
              const r = await (WebBrowser as any).openAuthSessionAsync(authUrlP, redirectUriProxy, { preferEphemeralSession: true } as any);
              if (r?.type === 'success' && typeof r?.url === 'string') {
                idToken = parseIdTokenFromUrl(r.url);
                if (!idToken) accessToken = parseAccessTokenFromUrl(r.url);
                if (!idToken) {
                  const errDetail = parseGoogleErrorFromUrl(r.url);
                  if (errDetail) throw new Error(errDetail);
                }
              }
            } finally {
              try { (WebBrowser as any)?.dismissBrowser?.(); } catch (_) {}
            }
          }
          if (!idToken && hasStartAsync) {
            const r2 = await (AuthSession as any).startAsync({ authUrl: authUrlP, returnUrl: redirectUriProxy });
            if (r2?.type === 'success') {
              idToken = (r2.params as any)?.id_token as string | undefined;
              if (!idToken) accessToken = (r2.params as any)?.access_token as string | undefined;
              if (!idToken && typeof (r2 as any)?.url === 'string') {
                idToken = parseIdTokenFromUrl((r2 as any).url);
                if (!idToken) accessToken = parseAccessTokenFromUrl((r2 as any).url);
                if (!idToken) {
                  const errDetail = parseGoogleErrorFromUrl((r2 as any).url);
                  if (errDetail) throw new Error(errDetail);
                }
              }
            }
          }
        }
      } else {
        if (Platform.OS === 'web' && firebaseAvailable) {
          const signInWithPopupFn = (require('firebase/auth') as any).signInWithPopup;
          const provider = new GoogleAuthProvider();
          const userCred = await signInWithPopupFn(auth, provider);
          const uid = userCred.user.uid;
          const userRef = doc(fdb as any, 'users', uid);
          let snap: any = null;
          try {
            snap = await getDoc(userRef);
          } catch (_) {
            snap = null;
          }
          if (!snap || !snap.exists()) {
            try {
              await setDoc(userRef, {
                uid,
                email: userCred.user.email ?? '',
                name: userCred.user.displayName ?? '',
                phone: '',
                emailVerified: !!userCred.user.emailVerified,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                role: preferredRole ?? 'customer',
                roles: [preferredRole ?? 'customer'],
                activeRole: preferredRole ?? 'customer',
                active: true,
              } as any);
            } catch (e) { }
          } else {
            try {
              await setDoc(userRef, { lastLogin: serverTimestamp() } as any, { merge: true });
            } catch (e) { }
          }
          const token = await userCred.user.getIdToken(true);
          await SecureStorageService.storeData('authToken', token);
          setAuthToken(token);
          setUser({ id: uid, email: userCred.user.email ?? '', nome: userCred.user.displayName ?? '' } as any);
          return { success: true };
        }
      }
      if (!idToken && !accessToken) {
        const hasMakeRedirect = typeof (AuthSession as any)?.makeRedirectUri === 'function';
        const expoScheme = Constants.expoConfig?.scheme ?? 'acucaradas-encomendas';
        const redirectUriStd = hasMakeRedirect ? (AuthSession as any).makeRedirectUri({ scheme: expoScheme }) : `${expoScheme}://redirect`;
        const verifier2 = await generateCodeVerifierAsync();
        const challenge2 = await codeChallengeFromVerifierAsync(verifier2);
        const cid2 = webClientId || iosClientId || androidClientId || clientId;
        const authUrlStd = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(String(cid2))}&redirect_uri=${encodeURIComponent(redirectUriStd)}&response_type=${encodeURIComponent('code')}&scope=${encodeURIComponent('openid email profile')}&prompt=${encodeURIComponent('select_account')}&state=${encodeURIComponent(nonce)}&code_challenge_method=S256&code_challenge=${encodeURIComponent(challenge2)}`;
        let code2: string | undefined;
        if (typeof (WebBrowser as any)?.openAuthSessionAsync === 'function') {
          try {
            const wb2 = await (WebBrowser as any).openAuthSessionAsync(authUrlStd, redirectUriStd, { preferEphemeralSession: true } as any);
            if (wb2?.type === 'success' && typeof wb2?.url === 'string') {
              code2 = parseCodeFromUrl(wb2.url);
              if (!code2) {
                const errDetail = parseGoogleErrorFromUrl(wb2.url);
                if (errDetail) throw new Error(errDetail);
              }
            }
          } finally {
            try { (WebBrowser as any)?.dismissBrowser?.(); } catch (_) {}
          }
        }
        if (!code2 && typeof (AuthSession as any)?.startAsync === 'function') {
          const r3 = await (AuthSession as any).startAsync({ authUrl: authUrlStd, returnUrl: redirectUriStd });
          if (r3?.type === 'success') {
            code2 = (r3.params as any)?.code as string | undefined;
            if (!code2 && typeof (r3 as any)?.url === 'string') {
              code2 = parseCodeFromUrl((r3 as any).url);
              if (!code2) {
                const errDetail = parseGoogleErrorFromUrl((r3 as any).url);
                if (errDetail) throw new Error(errDetail);
              }
            }
          }
        }
        if (code2) {
          const body2 = new URLSearchParams({
            client_id: String(cid2),
            code: code2,
            redirect_uri: redirectUriStd,
            grant_type: 'authorization_code',
            code_verifier: verifier2,
          }).toString();
          const resp2 = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body2,
          });
          let tok2: any = null;
          try { tok2 = await resp2.json(); } catch (_) { tok2 = null; }
          const it2 = tok2?.id_token as string | undefined;
          if (it2) idToken = it2;
          if (!it2) accessToken = tok2?.access_token as string | undefined;
        }
      }
      if (!idToken && !accessToken) {
        return { success: false, error: 'Token Google ausente' };
      }
      if (!firebaseAvailable) {
        return { success: false, error: 'Firebase não disponível' };
      }
      if (typeof (GoogleAuthProvider as any)?.credential !== 'function') {
        return { success: false, error: 'Provedor Google indisponível' };
      }
      if (typeof (signInWithCredential as any) !== 'function') {
        return { success: false, error: 'Método de credencial indisponível' };
      }
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCred = await signInWithCredential(auth, credential);
      const uid = userCred.user.uid;
      const userRef = doc(fdb as any, 'users', uid);
      let snap: any = null;
      try {
        snap = await getDoc(userRef);
      } catch (_) {
        snap = null;
      }
      if (!snap || !snap.exists()) {
        try {
          await setDoc(userRef, {
            uid,
            email: userCred.user.email ?? '',
            name: userCred.user.displayName ?? '',
            phone: '',
            emailVerified: !!userCred.user.emailVerified,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            role: preferredRole ?? 'customer',
            roles: [preferredRole ?? 'customer'],
            activeRole: preferredRole ?? 'customer',
            active: true,
          } as any);
        } catch (e) { }
      } else {
        try {
          const roleStr = preferredRole ?? undefined;
          const patch: any = { lastLogin: serverTimestamp() };
          if (roleStr) {
            patch.activeRole = roleStr;
            patch.roles = Array.from(new Set([roleStr, ...(Array.isArray((snap.data() as any)?.roles) ? (snap.data() as any).roles : [((snap.data() as any)?.role ?? 'customer')])]))
          }
          await setDoc(userRef, patch, { merge: true });
        } catch (e) { }
      }
      const token = await userCred.user.getIdToken(true);
      await SecureStorageService.storeData('authToken', token);
      setAuthToken(token);
      setUser({
        id: uid,
        email: userCred.user.email ?? '',
        nome: userCred.user.displayName ?? '',
        telefone: '',
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
        isAdmin: false,
        perfil: { fotoPerfil: '', notificacoes: true, preferencias: {} },
      } as any);
      try { secureLoggingService.setUserId(uid as any); } catch {}
      SecurityService.startActivityMonitor(() => logout());
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Erro Google' };
    }
  };

  const signInWithFacebookImpl = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!FACEBOOK_APP_ID) {
        return { success: false, error: 'Configuração do Facebook ausente' };
      }

      if (typeof (WebBrowser as any)?.maybeCompleteAuthSession === 'function') {
        (WebBrowser as any).maybeCompleteAuthSession();
      }

      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);

      const useProxy = !isTestEnv;
      const hasMakeRedirect = typeof (AuthSession as any)?.makeRedirectUri === 'function';
      const expoScheme = Constants.expoConfig?.scheme ?? 'acucaradas-encomendas';
      const redirectUri = hasMakeRedirect
        ? (AuthSession as any).makeRedirectUri({
            useProxy,
            scheme: expoScheme,
          })
        : `${expoScheme}://redirect`;

      const state = generateNonceSync(16);
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(
        FACEBOOK_APP_ID,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token&scope=${encodeURIComponent(
        'public_profile,email',
      )}&state=${encodeURIComponent(state)}`;

      let result: any = null;
      if (typeof (AuthSession as any)?.startAsync === 'function') {
        result = await (AuthSession as any).startAsync({ authUrl, returnUrl: redirectUri });
      }

      if (!result || result.type !== 'success') {
        return { success: false, error: 'Autenticação cancelada ou não concluída' };
      }

      let accessToken = (result.params as any)?.access_token as string | undefined;
      if (!accessToken && typeof (result as any)?.url === 'string') {
        accessToken = parseAccessTokenFromUrl((result as any).url);
      }
      if (!accessToken) {
        return { success: false, error: 'Token do Facebook ausente' };
      }

      const profileResp = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${encodeURIComponent(
          accessToken,
        )}`,
      );
      let profile: any = null;
      try {
        profile = await profileResp.json();
      } catch {
        profile = null;
      }

      if (!firebaseAvailable) {
        return { success: false, error: 'Firebase não disponível' };
      }
      if (typeof (FacebookAuthProvider as any)?.credential !== 'function') {
        return { success: false, error: 'Provedor Facebook indisponível' };
      }
      if (typeof (signInWithCredential as any) !== 'function') {
        return { success: false, error: 'Método de credencial indisponível' };
      }

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCred = await signInWithCredential(auth, credential);
      const uid = userCred.user.uid;

      const emailFinal = userCred.user.email ?? profile?.email ?? '';
      const displayNameFinal = userCred.user.displayName ?? profile?.name ?? '';

      const userRef = doc(fdb as any, 'users', uid);
      let snap: any = null;
      try {
        snap = await getDoc(userRef);
      } catch {
        snap = null;
      }

      if (!snap || !snap.exists()) {
        try {
          await setDoc(userRef, {
            uid,
            email: emailFinal,
            name: displayNameFinal,
            phone: '',
            emailVerified: !!userCred.user.emailVerified,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            role: 'customer',
            roles: ['customer'],
            activeRole: 'customer',
            active: true,
          } as any);
        } catch {}
      } else {
        try {
          await setDoc(
            userRef,
            {
              lastLogin: serverTimestamp(),
            } as any,
            { merge: true },
          );
        } catch {}
      }

      const token = await userCred.user.getIdToken(true);
      await SecureStorageService.storeData('authToken', token);
      setAuthToken(token);
      setUser({
        id: uid,
        email: emailFinal,
        nome: displayNameFinal,
        telefone: '',
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
        isAdmin: false,
        perfil: { fotoPerfil: '', notificacoes: true, preferencias: {} },
      } as any);
      try {
        secureLoggingService.setUserId(uid as any);
      } catch {}
      SecurityService.startActivityMonitor(() => logout());

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Erro Facebook' };
    }
  };

  const signInWithAppleImpl = async (preferredRole?: 'customer' | 'producer' | 'courier'): Promise<{ success: boolean; error?: string }> => {
    try {
      const AppleAuthentication = require('expo-apple-authentication');
      if (typeof AppleAuthentication?.isAvailableAsync === 'function') {
        const available = await AppleAuthentication.isAvailableAsync();
        if (!available) {
          return { success: false, error: 'Apple Authentication indisponível' };
        }
      } else {
        return { success: false, error: 'Apple Authentication não suportado' };
      }
      if (typeof AppleAuthentication?.signInAsync !== 'function') {
        return { success: false, error: 'Apple Authentication indisponível' };
      }
      const rawNonce = await generateNonceAsync(32);
      const hashedNonce = CryptoJS.SHA256(rawNonce).toString();
      const res = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      const idToken = res?.identityToken as string | undefined;
      if (!idToken) {
        return { success: false, error: 'Token Apple ausente' };
      }
      const provider = new OAuthProvider('apple.com');
      if (typeof (provider as any)?.credential !== 'function') {
        return { success: false, error: 'Provedor Apple indisponível' };
      }
      const credential = provider.credential({ idToken, rawNonce });
      if (!firebaseAvailable) {
        return { success: false, error: 'Firebase não disponível' };
      }
      if (typeof (signInWithCredential as any) !== 'function') {
        return { success: false, error: 'Método de credencial indisponível' };
      }
      const userCred = await signInWithCredential(auth, credential);
      const uid = userCred.user.uid;
      const userRef = doc(fdb as any, 'users', uid);
      let snap: any = null;
      try {
        snap = await getDoc(userRef);
      } catch (_) {
        snap = null;
      }
      if (!snap || !snap.exists()) {
        try {
          await setDoc(userRef, {
            uid,
            email: userCred.user.email ?? res?.email ?? '',
            name: userCred.user.displayName ?? `${res?.fullName?.givenName ?? ''} ${res?.fullName?.familyName ?? ''}`.trim(),
            phone: '',
            emailVerified: !!userCred.user.emailVerified,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            role: preferredRole ?? 'customer',
            roles: [preferredRole ?? 'customer'],
            activeRole: preferredRole ?? 'customer',
            active: true,
          } as any);
        } catch (e) { }
      } else {
        try {
          const roleStr = preferredRole ?? undefined;
          const patch: any = { lastLogin: serverTimestamp() };
          if (roleStr) {
            patch.activeRole = roleStr;
            patch.roles = Array.from(new Set([roleStr, ...(Array.isArray((snap.data() as any)?.roles) ? (snap.data() as any).roles : [((snap.data() as any)?.role ?? 'customer')])]))
          }
          await setDoc(userRef, patch, { merge: true });
        } catch (e) { }
      }
      const token = await userCred.user.getIdToken(true);
      await SecureStorageService.storeData('authToken', token);
      setAuthToken(token);
      setUser({
        id: uid,
        email: userCred.user.email ?? '',
        nome: userCred.user.displayName ?? '',
        telefone: '',
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
        isAdmin: false,
        perfil: { fotoPerfil: '', notificacoes: true, preferencias: {} },
      } as any);
      try { secureLoggingService.setUserId(uid as any); } catch {}
      SecurityService.startActivityMonitor(() => logout());
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Erro Apple' };
    }
  };

  // Método de cadastro
  const register = async (userData: User, password: string) => {
    try {
      setLoading(true);
      setError(undefined);
      
      // Verificar segurança do dispositivo antes do registro
      const securityCheck = await DeviceSecurityService.performSecurityCheck();
      if (securityCheck.compromised) {
        secureLoggingService.security('Tentativa de registro em dispositivo comprometido', {
          email: userData.email,
          compromised: securityCheck.compromised,
          emulator: securityCheck.emulator,
          debugging: securityCheck.debugging
        });
        
        // Permitir registro, mas com alerta
        Alert.alert(
          'Alerta de Segurança',
          'Este dispositivo pode estar comprometido. Algumas funcionalidades podem ser limitadas para sua segurança.',
          [{ text: 'Continuar', style: 'cancel' }]
        );
      }

      // Sanitizar entradas
      const sanitizedEmail = SecurityService.sanitizeInput(userData.email);
      const sanitizedName = SecurityService.sanitizeInput(userData.nome);
      const sanitizedPhone = SecurityService.sanitizeInput(userData.telefone || '');

      // Validar telefone obrigatório para registro
      if (!sanitizedPhone) {
        secureLoggingService.security('Falha ao registrar usuário - telefone ausente', { email: sanitizedEmail });
        throw new Error('Telefone é obrigatório para registro');
      }

      // Registrar tentativa de criação de usuário
      secureLoggingService.security('Tentativa de registro de novo usuário', { email: sanitizedEmail });
      
      // Criar o usuário
      const desiredRoleRaw = (userData as any)?.role;
      const desiredRole = desiredRoleRaw === 'producer' || desiredRoleRaw === 'produtor'
        ? 'producer'
        : desiredRoleRaw === 'courier' || desiredRoleRaw === 'entregador'
        ? 'courier'
        : desiredRoleRaw === 'admin'
        ? 'admin'
        : 'customer';
      const { user: newUser, token } = await authService.registrarUsuario(
        {
          email: sanitizedEmail,
          nome: sanitizedName,
          telefone: sanitizedPhone,
          role: desiredRole,
          producerProfile: (userData as any)?.producerProfile,
          courierProfile: (userData as any)?.courierProfile,
        } as any,
        password
      );

      if (newUser && token) {
        // Armazenar token
      await SecureStorageService.storeData('authToken', token);
      setAuthToken(token);

        // Atualizar estado
        setUser(newUser);
        try { secureLoggingService.setUserId(newUser.id as any); } catch {}
        
        // Iniciar monitoramento de inatividade
        SecurityService.startActivityMonitor(() => logout());

        secureLoggingService.security('Registro bem-sucedido', { userId: newUser.id, timestamp: new Date().toISOString() });
      } else {
        secureLoggingService.security('Falha ao registrar usuário', { email: sanitizedEmail });
        throw new Error('Falha ao registrar usuário');
      }
    } catch (error: unknown) {
      const err = error as any;
      secureLoggingService.security('Erro ao registrar usuário', { 
        email: userData.email, 
        errorMessage: (err && err.message) ? err.message : 'Erro desconhecido',
        errorCode: (err && err.code) ? err.code : 'unknown'
      });
      setError((err && err.message) ? err.message : 'Erro desconhecido');
      Alert.alert('Erro', (err && err.message) ? err.message : 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Método de logout
  const logout = async () => {
    try {
      setLoading(true);

      SecurityService.stopActivityMonitor();

      let resolvedUserId = user?.id || (firebaseAvailable && (auth as any)?.currentUser?.uid) || undefined;
      if (!resolvedUserId) {
        try {
          const existingToken = authToken ?? (await withTimeout(SecureStorageService.getData('authToken'), 2500, null));
          if (existingToken) {
            const payload = SecurityService.getTokenPayload(existingToken) as any;
            resolvedUserId = payload?.id ?? payload?.uid ?? payload?.sub ?? undefined;
          }
        } catch {}
      }

      if (Platform.OS !== 'web') {
        try {
        if (typeof (OneSignal as any)?.logout === 'function') {
          (OneSignal as any).logout();
        }
        } catch (err) {
          console.warn('[AuthContext] Erro ao realizar logout no OneSignal:', err);
        }
      }

      await withTimeout(SecureStorageService.removeData('authToken'), 2500, undefined as any);
      setAuthToken(null);

      try {
        clearPendingHref();
      } catch {}

      setUser(null);

      secureLoggingService.security('Logout realizado', { userId: resolvedUserId, timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      secureLoggingService.security('Erro ao fazer logout', { 
        userId: user?.id,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Método para redefinir senha
  const resetPassword = async (email: string) => {
    const sanitizedEmail = SecurityService.sanitizeInput(email);
    try {
      setLoading(true);

      // Enviar email de recuperação
      await authService.resetPassword(sanitizedEmail);

      Alert.alert(
        'Recuperação de senha',
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.'
      );

      secureLoggingService.security('Solicitação de recuperação de senha', { 
        email: sanitizedEmail,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      secureLoggingService.security('Erro ao solicitar recuperação de senha', { 
        email: sanitizedEmail,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      Alert.alert(
        'Recuperação de senha',
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Método para atualizar dados do usuário
  const updateUser = async (userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(undefined);

      if (!user || !user.id) {
        throw new Error('Usuário não autenticado');
      }

      // Sanitizar dados
      const sanitizedData: Partial<User> = {};
      if (userData.nome) sanitizedData.nome = SecurityService.sanitizeInput(userData.nome);
      if (userData.email) sanitizedData.email = SecurityService.sanitizeInput(userData.email);
      if (userData.telefone)
        sanitizedData.telefone = SecurityService.sanitizeInput(userData.telefone);
      if (userData.endereco) sanitizedData.endereco = userData.endereco;

      // Atualizar no Firestore
      const userRef = doc(fdb, 'users', user.id);
      await setDoc(
        userRef,
        {
          ...sanitizedData,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Atualizar estado local
      setUser({
        ...user,
        ...sanitizedData,
      });

      secureLoggingService.security('Dados do usuário atualizados', { 
        userId: user.id,
        fieldsUpdated: Object.keys(sanitizedData),
        timestamp: new Date().toISOString() 
      });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso.');
    } catch (error: unknown) {
      const err = error as any;
      secureLoggingService.security('Erro ao atualizar dados do usuário', { 
        userId: user?.id,
        fieldsAttempted: Object.keys(userData),
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      setError((err && err.message) ? err.message : 'Erro desconhecido');
      Alert.alert('Erro', 'Não foi possível atualizar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Alias method to satisfy screens that call updateUserProfile
  const updateUserProfile = async (userData: Partial<User>) => {
    return updateUser(userData);
  };

  // Validar sessão atual
  const validateSession = async (): Promise<boolean> => {
    try {
      // Verificar token existente
      let token = authToken ?? (await SecureStorageService.getData('authToken'));
      if (!token) {
        return false;
      }
      setAuthToken(token);

      // Validar token
      const ok = SecurityService.validateToken(token) || (await (async () => {
        try { await authService.validarToken(token as any); return true; } catch { return false; }
      })());
      if (!ok) {
        await logout();
        return false;
      }

      // Atualizar timestamp de atividade
      SecurityService.resetActivityTimer();

      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao validar sessão', { 
        userId: user?.id,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString() 
      });
      await logout();
      return false;
    }
  };

  // Atualizar timestamp de atividade
  const refreshUserActivity = () => {
    SecurityService.updateLastActivity();
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Excluir conta',
          'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });

      if (!confirmed) {
        setLoading(false);
        return;
      }

      await authService.deleteCurrentUserAccount();
      await logout();
    } catch (error: any) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível excluir sua conta. Tente novamente.';
      Alert.alert('Erro ao excluir conta', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={refreshUserActivity}>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          loading,
          error,
          login,
          register,
          logout,
          resetPassword,
          updateUser,
          updateUserProfile,
          validateSession,
          refreshUserActivity,
          deleteAccount,
          signInWithGoogle: signInWithGoogleImpl,
          signInWithFacebook: signInWithFacebookImpl,
          signInWithApple: signInWithAppleImpl,
          is2FAEnabled: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    </TouchableWithoutFeedback>
  );
};

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};
