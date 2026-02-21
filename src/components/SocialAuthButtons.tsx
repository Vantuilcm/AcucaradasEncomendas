import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const router = useRouter();
  const { signInWithGoogle, signInWithFacebook, signInWithApple, is2FAEnabled } = useAuth();

  const handleSocialAuth = async (provider: string) => {
    try {
      setLoadingProvider(provider);

      let result;

      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'facebook':
          result = await signInWithFacebook();
          break;
        case 'apple':
          result = await signInWithApple();
          break;
        default:
          throw new Error('Provedor de autenticação não suportado');
      }

      if (result.success) {
        if (is2FAEnabled) {
          // Se 2FA está habilitado, navegar para tela de verificação
          router.replace('/two-factor-auth');
        } else {
          // Se não tem 2FA, navegar para a tela principal
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace('/home');
          }
        }
      } else {
        Alert.alert(
          'Erro de autenticação',
          result.error || 'Não foi possível realizar login. Tente novamente.'
        );
      }
    } catch (error) {
      console.error(`Erro na autenticação com ${provider}:`, error);
      Alert.alert(
        'Erro de autenticação',
        'Ocorreu um erro durante o processo de login. Por favor, tente novamente.'
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  // Verifica se o dispositivo suporta Apple Authentication
  const showAppleButton = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      <Text style={styles.orText}>ou continue com</Text>

      <View style={styles.socialButtonsContainer}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('google')}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <>
              <View style={styles.socialIconContainer}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
              </View>
              <Text style={styles.socialButtonText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialAuth('facebook')}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'facebook' ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <>
              <View style={styles.socialIconContainer}>
                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
              </View>
              <Text style={styles.socialButtonText}>Facebook</Text>
            </>
          )}
        </TouchableOpacity>

        {showAppleButton && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialAuth('apple')}
            disabled={!!loadingProvider}
          >
            {loadingProvider === 'apple' ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                </View>
                <Text style={styles.socialButtonText}>Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    alignItems: 'center',
  },
  orText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
    position: 'relative',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    marginHorizontal: 5,
    marginBottom: 10,
    minWidth: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  socialIconContainer: {
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default SocialAuthButtons;
