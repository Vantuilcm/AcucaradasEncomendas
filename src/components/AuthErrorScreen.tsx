import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loggingService } from '../services/LoggingService';

// Tipos de erro de autenticaÃ§Ã£o
export type AuthErrorType =
  | 'unauthorized'
  | 'email_not_verified'
  | 'session_expired'
  | 'account_disabled'
  | 'network_error'
  | 'unknown';

interface AuthErrorScreenProps {
  errorType: AuthErrorType;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
}

/**
 * Componente para exibir erros de autenticaÃ§Ã£o de forma amigÃ¡vel
 */
const AuthErrorScreen: React.FC<AuthErrorScreenProps> = ({
  errorType,
  message,
  onRetry,
  showHomeButton = true,
  showRetryButton = true,
}) => {
  const navigation = useNavigation<any>();

  // Definir tÃ­tulos e mensagens padrÃ£o com base no tipo de erro
  const getErrorDetails = () => {
    switch (errorType) {
      case 'unauthorized':
        return {
          title: 'Acesso NÃ£o Autorizado',
          defaultMessage: 'VocÃª nÃ£o tem permissÃ£o para acessar esta Ã¡rea.',
          icon: require('../assets/images/icons/lock.png'),
        };
      case 'email_not_verified':
        return {
          title: 'E-mail NÃ£o Verificado',
          defaultMessage: 'Verifique seu e-mail para confirmar sua conta.',
          icon: require('../assets/images/icons/mail.png'),
        };
      case 'session_expired':
        return {
          title: 'SessÃ£o Expirada',
          defaultMessage: 'Sua sessÃ£o expirou. Por favor, faÃ§a login novamente.',
          icon: require('../assets/images/icons/timer.png'),
        };
      case 'account_disabled':
        return {
          title: 'Conta Desativada',
          defaultMessage: 'Sua conta foi desativada. Entre em contato com o suporte.',
          icon: require('../assets/images/icons/user-x.png'),
        };
      case 'network_error':
        return {
          title: 'Erro de ConexÃ£o',
          defaultMessage: 'NÃ£o foi possÃ­vel conectar ao servidor. Verifique sua conexÃ£o.',
          icon: require('../assets/images/icons/wifi-off.png'),
        };
      case 'unknown':
      default:
        return {
          title: 'Erro Inesperado',
          defaultMessage: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
          icon: require('../assets/images/icons/alert-triangle.png'),
        };
    }
  };

  const { title, defaultMessage, icon } = getErrorDetails();
  const displayMessage = message || defaultMessage;

  // Registrar erro no log
  React.useEffect(() => {
    loggingService.warn('Erro de autenticaÃ§Ã£o exibido', {
      errorType,
      message: displayMessage,
    });
  }, [errorType, displayMessage]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (errorType === 'session_expired') {
      navigation.replace('Login');
    } else {
      navigation.goBack();
    }
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Image source={icon} style={styles.icon} />

        <Text style={styles.title}>{title}</Text>

        <Text style={styles.message}>{displayMessage}</Text>

        <View style={styles.buttonContainer}>
          {showRetryButton && (
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>
                {errorType === 'email_not_verified'
                  ? 'Reenviar E-mail'
                  : errorType === 'session_expired'
                    ? 'Fazer Login'
                    : 'Tentar Novamente'}
              </Text>
            </TouchableOpacity>
          )}

          {showHomeButton && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoHome}
            >
              <Text style={styles.secondaryButtonText}>Ir para Home</Text>
            </TouchableOpacity>
          )}
        </View>

        {errorType === 'account_disabled' && (
          <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('HelpCenter')}>
            <Text style={styles.supportButtonText}>Contatar Suporte</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 30,
    tintColor: '#FF6B6B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  supportButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default AuthErrorScreen;

