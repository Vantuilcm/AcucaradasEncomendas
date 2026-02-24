import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

const CODE_LENGTH = 6;

const TwoFactorAuthScreen = () => {
  const [code, setCode] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const router = useRouter();
  const navigation = useNavigation();
  const { verify2FACode, generate2FACode, signOut, loading, error } = useAuth();

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Impedir navegação para trás
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
    });

    // Configurar o listener de hardware back button
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // Prevenir navegação de volta exceto para rotas específicas
      if (e.data.action.type !== 'GO_BACK') {
        return;
      }

      e.preventDefault();

      // Mostrar alerta para confirmar logout
      Alert.alert(
        'Cancelar autenticação?',
        'Você precisará fazer login novamente. Deseja continuar?',
        [
          { text: 'Não', style: 'cancel', onPress: () => {} },
          {
            text: 'Sim',
            style: 'destructive',
            onPress: async () => {
              await signOut();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  // Contador regressivo para reenviar código
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Manipula a alteração do código
  const handleCodeChange = (text: string, index: number) => {
    // Limitar a um caractere por campo
    const digit = text.replace(/[^0-9]/g, '').slice(0, 1);

    // Atualizar o estado do código
    const newCode = code.split('');
    newCode[index] = digit;
    setCode(newCode.join(''));

    // Se digitar, avança para o próximo campo
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manipula a tecla delete
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // Se o campo estiver vazio e não for o primeiro, volta para o anterior
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Verifica o código
  const handleVerifyCode = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('Código incompleto', 'Por favor, digite o código de 6 dígitos completo.');
      return;
    }

    try {
      const result = await verify2FACode(code);

      if (result.success) {
        // Navegar para a tela principal após verificação bem-sucedida
        router.replace('/home');
      } else {
        Alert.alert('Erro', result.error || 'Código inválido. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível verificar o código. Tente novamente.');
    }
  };

  // Reenvia o código
  const handleResendCode = async () => {
    try {
      setIsResending(true);
      const result = await generate2FACode();

      if (result.success) {
        setCountdown(60);
        Alert.alert('Código enviado', 'Um novo código de verificação foi enviado para seu email.');
      } else {
        Alert.alert(
          'Erro',
          result.error || 'Não foi possível enviar um novo código. Tente novamente mais tarde.'
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar um novo código. Tente novamente mais tarde.');
    } finally {
      setIsResending(false);
    }
  };

  // Manipula o logout
  const handleSignOut = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair? Você precisará fazer login novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <StatusBar style="light" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Verificação de Segurança</Text>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#FF6B6B" style={styles.icon} />

            <Text style={styles.heading}>Autenticação em Duas Etapas</Text>

            <Text style={styles.description}>
              Digite o código de verificação enviado para seu email.
            </Text>

            <View style={styles.codeContainer}>
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <TextInput
                  key={index}
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={styles.codeInput}
                  value={code[index] || ''}
                  onChangeText={text => handleCodeChange(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, code.length !== CODE_LENGTH && styles.disabledButton]}
              onPress={handleVerifyCode}
              disabled={code.length !== CODE_LENGTH || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verificar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Não recebeu o código? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Reenviar em {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                  <Text style={styles.resendButtonText}>
                    {isResending ? 'Enviando...' : 'Reenviar código'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginHorizontal: 5,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  verifyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#FFB5B5',
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  countdownText: {
    color: '#999',
    fontSize: 14,
  },
  resendButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default TwoFactorAuthScreen;
