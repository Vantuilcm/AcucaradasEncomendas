import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { resetPassword, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = () => {
    try {
      // Validar email usando o serviço de validação
      InputValidationService.validateInputType(email, 'email');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email inválido';
      setError(errorMessage);
      
      // Registrar falha na validação do email
      secureLoggingService.security('Falha na validação de email para recuperação de senha', {
        email,
        reason: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  };

  const handleResetPassword = async () => {
    try {
      setError(null);
      setMessage(null);
      
      // Registrar tentativa de recuperação de senha
      secureLoggingService.security('Tentativa de recuperação de senha', { email });
      
      // Validar email antes de prosseguir
      if (!validateEmail()) {
        return;
      }
      
      // Sanitizar email antes de enviar
      const sanitizedEmail = InputValidationService.validateAndSanitizeInput(email, {
        type: 'email'
      });
      
      await resetPassword(sanitizedEmail);
      
      // Registrar sucesso no envio de email de recuperação
      secureLoggingService.security('Email de recuperação de senha enviado com sucesso', {
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      });
      
      setMessage('Enviamos um e-mail com instruções para redefinir sua senha.');
    } catch (err) {
      const errorMessage = 'Não foi possível enviar o e-mail de redefinição. Verifique o endereço e tente novamente.';
      setError(errorMessage);
      
      // Registrar falha no envio de email de recuperação
      secureLoggingService.security('Falha no envio de email de recuperação de senha', {
        email,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      
      console.error('Erro ao redefinir senha:', err);
    }
  };

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => setError('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.')}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Recuperar Senha
          </Text>
          
          <Text style={styles.subtitle}>
            Informe seu e-mail para receber instruções de recuperação de senha
          </Text>

          {message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          )}

          {(error || authError) && <ErrorMessage message={error || authError} />}

          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          {loading ? (
            <LoadingState />
          ) : (
            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={styles.button}
            >
              Enviar E-mail de Recuperação
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => {
              secureLoggingService.info('Navegação de volta para tela de login');
              navigation.goBack();
            }}
            style={styles.linkButton}
          >
            Voltar para o Login
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 20,
  },
  messageContainer: {
    backgroundColor: '#e6f7e6',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  messageText: {
    color: '#2e7d32',
    textAlign: 'center',
  },
});