import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText, TextInput as RNTextInput, Platform, Image, ScrollView } from 'react-native';
import { useTheme, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PermissionsService, Role as AppRole } from '../services/PermissionsService';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { SecureStorageService } from '../services/SecureStorageService';
import { LegalDocumentLinks } from '../components/LegalDocumentLinks';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { setPendingHref } from '../navigation/pendingNavigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, loading, error: authError, resetPassword, validateSession, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [canLogin, setCanLogin] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);
  const passwordRef = useRef<any>(null);
  

  useEffect(() => {
    (async () => {
      try {
        const last = await SecureStorageService.getData('lastLoginEmail');
        if (last) setEmail(String(last));
      } catch {}
      try {
        const tok = await SecureStorageService.getData('authToken');
        setHasSavedSession(!!tok);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const validEmail = (() => { try { InputValidationService.validateInputType(email, 'email'); return true; } catch { return false; } })();
    const validPassword = password.trim().length >= 6;
    setCanLogin(validEmail && validPassword && agreed);
  }, [email, password, agreed]);

  

  const validateInputs = () => {
    try {
      // Validar email
      InputValidationService.validateInputType(email, 'email');
      
      // Validar senha (não vazia)
      if (!password.trim()) {
        throw new Error('Senha é obrigatória');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dados de entrada inválidos');
      return false;
    }
  };

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }

    try {
      router.replace(href as any);
    } catch {
      setPendingHref(href);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      
      // Registrar tentativa de login (sem incluir a senha)
      secureLoggingService.security('Tentativa de login', { email });
      
      if (!agreed) {
        const msg = 'Você precisa concordar com os Termos de Uso e a Política de Privacidade para continuar.';
        setError(msg);
        setHighlightConsent(true);
        secureLoggingService.security('Tentativa de login sem aceitar termos', { email });
        return;
      }

      // Validar entradas antes de tentar login
      if (!validateInputs()) {
        secureLoggingService.security('Falha na validação de login', { email, reason: error });
        return;
      }
      
      // Sanitizar email antes de enviar
      const sanitizedEmail = InputValidationService.validateAndSanitizeInput(email, {
        type: 'email'
      });
      
      await login(sanitizedEmail, password);
      setHasSavedSession(true);
      try { await SecureStorageService.storeData('lastLoginEmail', sanitizedEmail, {} as any); } catch {}
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      
      // No Expo Router, redirecionamos para a raiz ou para o container do app
      console.log('[LoginScreen] Login bem-sucedido. Redirecionando para /src-app');
      safeReplace('/src-app');
      
      // Registrar login bem-sucedido
      secureLoggingService.security('Login bem-sucedido', { email: sanitizedEmail });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      
      // Registrar falha de login
      secureLoggingService.security('Falha de login', { 
        email, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!email.trim()) {
        setError('Digite seu e-mail para recuperar a senha');
        return;
      }
      setResetting(true);
      await resetPassword?.(email.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao solicitar recuperação';
      setError(msg);
    }
    finally {
      setResetting(false);
    }
  };

  const handleRegister = () => {
    secureLoggingService.info('Navegação para tela de registro');
    navigation.navigate('Register');
  };

  const handleBiometricLogin = async () => {
    try {
      setError(null);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware) {
        setError('Dispositivo sem suporte a biometria');
        return;
      }
      if (!isEnrolled) {
        setError('Nenhuma biometria cadastrada no dispositivo');
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Autenticar com Face ID/Touch ID', cancelLabel: 'Cancelar', fallbackLabel: 'Usar senha', disableDeviceFallback: false });
      if (!res.success) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
        setError('Autenticação biométrica cancelada ou falhou');
        return;
      }
      const ok = await validateSession();
      if (!ok) {
        setError('Sessão ausente ou expirada. Faça login com email e senha.');
        return;
      }
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      
      console.log('[LoginScreen] Login biométrico bem-sucedido. Redirecionando para /src-app');
      safeReplace('/src-app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação biométrica');
    }
  };

  const toggleConsent = () => {
    setAgreed(prev => {
      const next = !prev;
      if (next) {
        setHighlightConsent(false);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} testID="login-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <RNText style={styles.brandName}>Açucaradas Encomendas</RNText>
          <RNText style={styles.phrase}>
            Você está a um clique de adoçar o mundo: venda, compre ou entregue com propósito
          </RNText>
        </View>

        <RNText style={styles.subtitle}>Faça login para continuar</RNText>

        {(error || authError) && (
          <RNText testID="error-message">{(error ?? authError) || ''}</RNText>
        )}

        <RNTextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={() => passwordRef.current?.focus?.()}
          style={styles.input}
          placeholder="E-mail"
          testID="email-input"
        />

        <View style={styles.passwordContainer}>
          <RNTextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            ref={passwordRef}
            onSubmitEditing={handleLogin}
            style={styles.passwordInput}
            placeholder="Senha"
            testID="password-input"
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(prev => !prev)}
            style={styles.passwordToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleResetPassword} testID="forgot-button" style={styles.forgotButton} disabled={resetting as any}>
          <RNText>Esqueci minha senha</RNText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleConsent}
          testID="consent-toggle"
          style={[styles.consentRow, highlightConsent ? styles.consentRowError : null]}
        >
          <Checkbox
            status={agreed ? 'checked' : 'unchecked'}
            onPress={toggleConsent}
            color={highlightConsent ? theme.colors.error : theme.colors.primary}
          />
          <RNText style={[styles.consentText, highlightConsent ? styles.consentTextError : null]}>
            Eu concordo com os Termos de Uso e a Política de Privacidade
          </RNText>
        </TouchableOpacity>

        <LegalDocumentLinks
          style={styles.legalLinks}
          horizontal
          contextMessage="Ao continuar, você concorda com nossos"
        />

        <TouchableOpacity onPress={handleLogin} testID="login-button" style={styles.button} disabled={loading as any}>
          <RNText style={styles.buttonText}>Entrar</RNText>
        </TouchableOpacity>

        {hasSavedSession && Platform.OS !== 'web' ? (
          <TouchableOpacity
            onPress={handleBiometricLogin}
            testID="biometric-login-button"
            style={styles.biometricButton}
          >
            <RNText style={styles.biometricText}>Entrar com Face ID / Touch ID</RNText>
          </TouchableOpacity>
        ) : null}

        {!hasSavedSession && Platform.OS !== 'web' ? (
          <RNText style={styles.passwordHint}>
            Para habilitar Face ID / Touch ID, faça login uma vez.
          </RNText>
        ) : null}

        <TouchableOpacity onPress={handleRegister} testID="register-button" style={styles.registerButton}>
          <RNText>Não tem uma conta? Cadastre-se</RNText>
        </TouchableOpacity>
        <SocialAuthButtons />
        {loading ? <LoadingState message="Entrando..." /> : null}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
    textAlign: 'center',
    marginBottom: 12,
  },
  phrase: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#888',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#333',
  },
  passwordContainer: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 16,
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  biometricButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  biometricText: {
    fontSize: 14,
    color: '#333',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  consentText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333',
  },
  consentRowError: {
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  consentTextError: {
    color: '#d32f2f',
  },
  legalLinks: {
    alignSelf: 'center',
  },
  passwordHint: {
    marginTop: 8,
    marginBottom: 12,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
