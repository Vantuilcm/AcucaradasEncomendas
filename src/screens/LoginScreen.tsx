import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert, Pressable, ScrollView } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { InputValidationService } from '../services/InputValidationService';
import { AppVersion } from '../utils/AppVersion';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { useAppTheme } from '../components/ThemeProvider';
import { useRoleRedirect } from '../hooks/useRoleRedirect';

import { Role } from '../services/PermissionsService';

import { DiagnosticScreen } from '../core/monitoring/DiagnosticScreen';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const { login, loading, profileLoading, error: authError, user } = useAuth();
  const { redirectToDashboard } = useRoleRedirect();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Redirecionamento automático após login bem-sucedido
  React.useEffect(() => {
    if (user && !profileLoading) {
      redirectToDashboard();
    }
  }, [user, profileLoading, redirectToDashboard]);

  // Combinar erros locais e do AuthContext para exibição
  const displayError = error || authError;
  const [role, setRole] = useState<string>(Role.COMPRADOR);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isSyncing = loading || profileLoading;

  const showDebugInfo = () => {
    setShowDiagnostic(true);
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
      
      // Validar entradas básicas (não vazias, formato e-mail)
      if (!validateInputs()) return;
      
      // Normalização e Sanitização rigorosa
      const normalizedEmail = email.trim().toLowerCase();
      
      secureLoggingService.security('USER_LOGIN_ATTEMPT', { email: normalizedEmail, selectedRole: role });
      
      // Chamada de login universal (o role serve apenas para log de tentativa)
      await login(normalizedEmail, password, role);
      
      // Se chegou aqui, login foi sucesso!
      
    } catch (err: any) {
      console.error('❌ [LOGIN_SCREEN] Erro capturado:', err.code, err.message);
      
      let alertTitle = 'Falha no Acesso';
      let friendlyMessage = '';
      
      // Mapeamento Transparente de Erros (CTO Directives)
      switch (err.code) {
        case 'auth/invalid-credential':
          friendlyMessage = 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
          break;
        case 'auth/user-not-found':
          friendlyMessage = 'Este usuário não foi encontrado no sistema.';
          break;
        case 'auth/wrong-password':
          friendlyMessage = 'A senha digitada está incorreta.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'O formato do e-mail é inválido (ex: nome@dominio.com).';
          break;
        case 'auth/too-many-requests':
          alertTitle = 'Acesso Bloqueado';
          friendlyMessage = 'Muitas tentativas sem sucesso. Por favor, tente novamente em alguns minutos.';
          break;
        case 'firestore/profile-not-found':
          alertTitle = 'Perfil Inexistente';
          friendlyMessage = 'Sua conta de autenticação é válida, mas não encontramos seu perfil de usuário no banco de dados.';
          break;
        case 'auth/network-request-failed':
          alertTitle = 'Erro de Conexão';
          friendlyMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
          break;
        default:
          friendlyMessage = err.message || 'Ocorreu um erro inesperado ao tentar entrar.';
      }

      setError(friendlyMessage);
      
      Alert.alert(
        alertTitle,
        friendlyMessage,
        [{ text: 'Tentar Novamente' }]
      );

      secureLoggingService.error('LOGIN_PROCESS_ERROR', { 
        email, 
        errorCode: err.code,
        errorMessage: err.message 
      });
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

  if (showDiagnostic) {
    return <DiagnosticScreen onClose={() => setShowDiagnostic(false)} />;
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
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

              <View style={styles.partnerPhraseContainer}>
                <Text variant="bodyMedium" style={styles.partnerPhrase}>
                  {role === Role.PRODUTOR && 'Seja um parceiro produtor e venda seus doces!'}
                  {role === Role.ENTREGADOR && 'Seja um parceiro entregador e ganhe com suas entregas!'}
                </Text>
              </View>

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

              <View style={styles.footer}>
                <Text style={styles.versionText}>{AppVersion.getDisplayString()}</Text>
              </View>
            </View>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 40,
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme?.colors?.text?.primary || '#000000',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
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
    marginBottom: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.1)',
  },
  partnerPhraseContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  partnerPhrase: {
    color: theme?.colors?.primary || '#E91E63',
    fontWeight: 'bold',
    textAlign: 'center',
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
    fontSize: 14,
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
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9E9E9E',
    opacity: 0.8,
  },
});
