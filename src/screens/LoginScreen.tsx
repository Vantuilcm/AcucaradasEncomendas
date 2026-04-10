import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert, Pressable } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Checkbox, Portal, Modal } from 'react-native-paper';
import { ENV } from '../config/env';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { useAppTheme } from '../components/ThemeProvider';

import { Role } from '../services/PermissionsService';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const { login, loading, profileLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combinar erros locais e do AuthContext para exibição
  const displayError = error || authError;
  const [role, setRole] = useState<string>(Role.COMPRADOR);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const isSyncing = loading || profileLoading;

  const showDebugInfo = () => {
    const extra = Constants.expoConfig?.extra || {};
    const info = `
    ENV KEY: ${ENV.EXPO_PUBLIC_FIREBASE_API_KEY ? ENV.EXPO_PUBLIC_FIREBASE_API_KEY.substring(0, 8) + '...' : 'MISSING'}
    EXTRA KEY: ${extra.firebaseApiKey ? extra.firebaseApiKey.substring(0, 8) + '...' : 'MISSING'}
    PROJECT ID: ${ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID}
    DOMAIN: ${ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}
    BUILD: ${Constants.expoConfig?.ios?.buildNumber || 'N/A'}
    `;
    Alert.alert('🛡️ Firebase Debug Info', info);
  };

  const validateInputs = useCallback(() => {
    try {
      // Validar email
      InputValidationService.validateInputType(email, 'email');
      
      // Validar senha (não vazia)
      if (!password.trim()) {
        throw new Error('Senha é obrigatória');
      }

      // Validar termos de uso
      if (!termsAccepted) {
        throw new Error('Você precisa aceitar os Termos de Uso e Política de Privacidade para continuar');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dados de entrada inválidos');
      return false;
    }
  }, [email, password, termsAccepted]);

  const handleLogin = async () => {
    if (isSyncing) return;

    try {
      setError(null);
      
      // Validar entradas antes de tentar login
      if (!validateInputs()) {
        secureLoggingService.security('LOGIN_VALIDATION_FAILED', { email });
        return;
      }
      
      // Sanitizar email antes de enviar
      const sanitizedEmail = InputValidationService.validateAndSanitizeInput(email, {
        type: 'email'
      });
      
      secureLoggingService.security('USER_LOGIN_ATTEMPT', { email: sanitizedEmail, role });
      
      await login(sanitizedEmail, password, role);
      
      // O redirecionamento agora é tratado pelo AppNavigator automaticamente 
      // assim que o estado 'user' for atualizado no AuthContext.
      
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar login';
      setError(errorMessage);
      
      secureLoggingService.error('LOGIN_PROCESS_ERROR', { 
        email, 
        error: errorMessage 
      });

      Alert.alert(
        'Falha no Login',
        errorMessage,
        [{ text: 'Tentar Novamente' }]
      );
    }
  };

  const handleRegister = () => {
    try {
      secureLoggingService.info('NAVIGATION_TO_REGISTER', { role });
      navigation.navigate('Register', { role });
    } catch (err) {
      secureLoggingService.error('NAVIGATION_ERROR', { screen: 'Register', error: err });
    }
  };

  if (isSyncing) {
    return <LoadingState message={profileLoading ? "Carregando perfil..." : "Entrando..."} />;
  }

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => setError('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.')}
    >
      <SafeAreaView style={styles.container} testID="login-screen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={styles.content}>
            <Pressable 
              onLongPress={showDebugInfo} 
              style={styles.logoContainer}
              delayLongPress={2000}
            >
              <Image 
                source={require('../../assets/logo-original.png')} 
                style={styles.logo} 
                resizeMode="contain"
              />
            </Pressable>
            <Text variant="headlineMedium" style={styles.title}>
              Bem-vindo(a)!
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Você está a um clique de adoçar o mundo
            </Text>

            <SegmentedButtons
              value={role}
              onValueChange={setRole}
              buttons={[
                { value: Role.COMPRADOR, label: 'Comprador' },
                { value: Role.PRODUTOR, label: 'Produtor' },
                { value: Role.ENTREGADOR, label: 'Entregador' },
              ]}
              style={styles.segmentedButtons}
            />

            {displayError && <ErrorMessage message={displayError} />}


          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            testID="email-input"
          />

          <TextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
            style={styles.input}
            testID="password-input"
          />

          <View style={styles.forgotPasswordContainer}>
            <Button mode="text" onPress={() => navigation.navigate('ForgotPassword')} labelStyle={styles.forgotPasswordText}>
              Esqueci minha senha
            </Button>
          </View>

          <View style={styles.termsContainer}>
            <View style={styles.checkboxWrapper}>
              <Checkbox
                status={termsAccepted ? 'checked' : 'unchecked'}
                onPress={() => setTermsAccepted(!termsAccepted)}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.termsTextContainer}>
              <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsLabelClickable}>
                <Text style={styles.termsText}>
                  Marque eu aceito os{' '}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')}>
                <Text style={[styles.termsText, styles.termsLink]}>
                  Termos de Uso
                </Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                {' '}e a{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('PrivacySettings')}>
                <Text style={[styles.termsText, styles.termsLink]}>
                  Política de uso da aplicação
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button mode="contained" onPress={handleLogin} style={styles.button} disabled={loading || !termsAccepted} testID="login-button">
                      Entrar
                    </Button>

                    <SocialAuthButtons role={role} />

                    <Button mode="text" onPress={handleRegister} style={styles.registerButton}>
            Não tem uma conta? Cadastre-se
          </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenshotProtection>
  );
}

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.colors?.background || '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: theme?.colors?.background || '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30, // Aumentado um pouco
  },
  logo: {
    width: 160, // Aumentado um pouco
    height: 160, // Aumentado um pouco
  },
  segmentedButtons: {
    marginBottom: 30, // Aumentado um pouco
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme?.colors?.text?.primary || '#000000',
    fontWeight: 'bold', // Adicionado bold
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 36, // Aumentado um pouco
    color: theme?.colors?.text?.secondary || '#757575',
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme?.colors?.surface || '#FFFFFF',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: theme?.colors?.text?.primary || '#000000',
    fontSize: 14,
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 30, 99, 0.05)', // Leve destaque rosa
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.1)',
  },
  checkboxWrapper: {
    borderWidth: 2,
    borderColor: theme?.colors?.primary || '#E91E63',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 4,
  },
  termsLabelClickable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14, // Aumentado para melhor leitura
    color: theme?.colors?.text?.primary || '#212121',
    lineHeight: 20,
  },
  termsLink: {
    color: theme?.colors?.primary || '#E91E63',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 16,
  },
});
