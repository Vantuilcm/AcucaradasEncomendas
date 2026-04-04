import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Checkbox } from 'react-native-paper';
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
  const { login, loading, profileLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>(Role.COMPRADOR);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isSyncing = loading || profileLoading;

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
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo-original.png')} 
                style={styles.logo} 
                resizeMode="contain"
              />
            </View>
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

            {error && <ErrorMessage message={error || 'Erro'} />}


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
            <Checkbox
              status={termsAccepted ? 'checked' : 'unchecked'}
              onPress={() => setTermsAccepted(!termsAccepted)}
              color={theme.colors.primary}
            />
            <View style={styles.termsTextContainer}>
              <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
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
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    color: theme?.colors?.text?.secondary || '#757575',
  },
  termsLink: {
    color: theme?.colors?.primary || '#E91E63',
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 16,
  },
});
