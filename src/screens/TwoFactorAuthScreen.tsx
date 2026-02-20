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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

const CODE_LENGTH = 6;

const TwoFactorAuthScreen = () => {
  const [code, setCode] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const navigation = useNavigation<any>();
  const { verify2FACode, generate2FACode, signOut, loading, error } = useAuth();

  const inputRefs = useRef<Array<TextInput | null>>([]);

  

  // Contador regressivo para reenviar cÃ³digo
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Manipula a alteraÃ§Ã£o do cÃ³digo
  const handleCodeChange = (text: string, index: number) => {
    // Limitar a um caractere por campo
    const digit = text.replace(/[^0-9]/g, '').slice(0, 1);

    // Atualizar o estado do cÃ³digo
    const newCode = code.split('');
    newCode[index] = digit;
    setCode(newCode.join(''));

    // Se digitar, avanÃ§a para o prÃ³ximo campo
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Manipula a tecla delete
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      // Se o campo estiver vazio e nÃ£o for o primeiro, volta para o anterior
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Verifica o cÃ³digo
  const handleVerifyCode = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert('CÃ³digo incompleto', 'Por favor, digite o cÃ³digo de 6 dÃ­gitos completo.');
      return;
    }

    try {
      const result = await verify2FACode(code);

      if (result.success) {
        try {
          const role = await (await import('../services/PermissionsService')).PermissionsService.getInstance().getUserRole();
          const AppRole = (await import('../services/PermissionsService')).Role;
          const isProducer = role === AppRole.GERENTE || role === AppRole.ADMIN;
          const isCourier = role === AppRole.ENTREGADOR;
          const nextTab = isCourier ? 'Orders' : isProducer ? 'Profile' : 'Home';
          navigation.navigate('MainTabs');
          navigation.navigate('MainTabs', { screen: nextTab });
        } catch {
          navigation.navigate('MainTabs');
        }
      } else {
        Alert.alert('Erro', result.error || 'CÃ³digo invÃ¡lido. Tente novamente.');
      }
    } catch (error) {
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel verificar o cÃ³digo. Tente novamente.');
    }
  };

  // Reenvia o cÃ³digo
  const handleResendCode = async () => {
    try {
      setIsResending(true);
      const result = await generate2FACode();

      if (result.success) {
        setCountdown(60);
        Alert.alert('CÃ³digo enviado', 'Um novo cÃ³digo de verificaÃ§Ã£o foi enviado para seu email.');
      } else {
        Alert.alert(
          'Erro',
          result.error || 'NÃ£o foi possÃ­vel enviar um novo cÃ³digo. Tente novamente mais tarde.'
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel enviar um novo cÃ³digo. Tente novamente mais tarde.');
    } finally {
      setIsResending(false);
    }
  };

  // Manipula o logout
  const handleSignOut = async () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair? VocÃª precisarÃ¡ fazer login novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.replace('Login');
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
            <Text style={styles.title}>VerificaÃ§Ã£o de SeguranÃ§a</Text>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#FF6B6B" style={styles.icon} />

            <Text style={styles.heading}>AutenticaÃ§Ã£o em Duas Etapas</Text>

            <Text style={styles.description}>
              Digite o cÃ³digo de verificaÃ§Ã£o enviado para seu email.
            </Text>

            <View style={styles.codeContainer}>
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
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
              <Text style={styles.resendText}>NÃ£o recebeu o cÃ³digo? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Reenviar em {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                  <Text style={styles.resendButtonText}>
                    {isResending ? 'Enviando...' : 'Reenviar cÃ³digo'}
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
