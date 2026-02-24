import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';

export default function LoginScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleLogin = async () => {
    try {
      setError(null);
      
      // Registrar tentativa de login (sem incluir a senha)
      secureLoggingService.security('Tentativa de login', { email });
      
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
      
      // Registrar login bem-sucedido
      secureLoggingService.security('Login bem-sucedido', { email: sanitizedEmail });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      
      // Registrar falha de login
      secureLoggingService.security('Falha de login', { 
        email, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleRegister = () => {
    secureLoggingService.info('Navegação para tela de registro');
    navigation.navigate('Register');
  };

  if (loading) {
    return <LoadingState message="Entrando..." />;
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
          <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Bem-vindo(a)!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Faça login para continuar
          </Text>

          {(error || authError) && <ErrorMessage message={error || authError} />}

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

          <Button mode="contained" onPress={handleLogin} style={styles.button} disabled={loading}>
            Entrar
          </Button>

          <SocialAuthButtons />

          <Button mode="text" onPress={handleRegister} style={styles.registerButton}>
            Não tem uma conta? Cadastre-se
          </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenshotProtection>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 16,
  },
});
