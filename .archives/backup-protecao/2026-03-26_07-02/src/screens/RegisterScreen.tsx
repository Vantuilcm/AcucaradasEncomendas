import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { useAppTheme } from '../components/ThemeProvider';

export function RegisterScreen({ route }: { route?: any }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const role = route?.params?.role || 'comprador';
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateForm = () => {
    try {
      // Validar nome (não vazio)
      if (!name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      
      // Validar email usando o serviço de validação
      InputValidationService.validateInputType(email, 'email');
      
      // Validar senha usando o serviço de validação
      InputValidationService.validateInputType(password, 'password');
      
      // Verificar se as senhas coincidem
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Validar termos de uso
      if (!termsAccepted) {
        throw new Error('Você precisa aceitar os Termos de Uso e Política de Privacidade para continuar');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dados de entrada inválidos';
      setError(errorMessage);
      
      // Registrar falha na validação do formulário
      secureLoggingService.security('Falha na validação do formulário de registro', {
        email,
        reason: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  };

  const handleRegister = async () => {
    try {
      setError(null);
      
      // Registrar tentativa de registro (sem incluir a senha)
      secureLoggingService.security('Tentativa de registro de nova conta', { email, name });

      if (!validateForm()) {
        return;
      }
      
      // Sanitizar entradas antes de enviar
      const sanitizedName = InputValidationService.validateAndSanitizeInput(name, {
        maxLength: 100
      });
      
      const sanitizedEmail = InputValidationService.validateAndSanitizeInput(email, {
        type: 'email'
      });

      await register({ email: sanitizedEmail, nome: sanitizedName, role } as any, password);
      
      // Registrar registro bem-sucedido
      secureLoggingService.security('Registro de conta bem-sucedido', { 
        email: sanitizedEmail,
        name: sanitizedName
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(errorMessage);
      
      // Registrar falha no registro
      secureLoggingService.security('Falha no registro de conta', { 
        email, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return <LoadingState message="Criando conta..." />;
  }

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => setError('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.')}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Criar Conta
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Preencha seus dados para se cadastrar
            </Text>

            {error && <ErrorMessage message={error} />}

            <TextInput label="Nome" value={name} onChangeText={setName} style={styles.input} />

            <TextInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <TextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />

            <View style={styles.termsContainer}>
              <Checkbox
                status={termsAccepted ? 'checked' : 'unchecked'}
                onPress={() => setTermsAccepted(!termsAccepted)}
                color={theme.colors.primary}
              />
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  Eu concordo com os{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse' as never)}>
                  <Text style={[styles.termsText, styles.termsLink]}>
                    Termos de Uso
                  </Text>
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  {' '}e a{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacySettings' as never)}>
                  <Text style={[styles.termsText, styles.termsLink]}>
                    Política de Privacidade
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              disabled={loading || !termsAccepted}
            >
              Criar Conta
            </Button>

            <Button 
              mode="text" 
              onPress={() => {
                secureLoggingService.info('Navegação de volta para tela de login');
                navigation.goBack();
              }} 
              style={styles.loginButton}
            >
              Já tem uma conta? Faça login
            </Button>
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
    backgroundColor: theme.colors.surface,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: theme.colors.text.secondary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.background,
  },
  termsContainer: {
    marginBottom: 24,
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
    color: theme.colors.text.secondary,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});
