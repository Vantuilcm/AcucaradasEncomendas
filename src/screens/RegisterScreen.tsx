import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';

export function RegisterScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

      await register(sanitizedEmail, password, sanitizedName);
      
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

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              disabled={loading}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  loginButton: {
    marginTop: 16,
  },
});
