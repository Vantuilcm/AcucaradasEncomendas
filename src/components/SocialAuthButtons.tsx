import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authFunctions } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  role?: string;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess, role = 'comprador' }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { signInWithGoogle, signInWithFacebook, signInWithApple, signInWithCredential, is2FAEnabled } = useAuth();

  // Configuração Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '6756029389-google-ios-id.apps.googleusercontent.com', // TODO: Substituir pelo ID real se necessário
    androidClientId: 'google-android-id.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      setLoadingProvider('google');
      const credential = authFunctions.GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(credential, role);
      
      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Erro Google', result.error);
      }
    } catch (error: any) {
      Alert.alert('Erro Google', error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    try {
      setLoadingProvider(provider);

      let result;

      switch (provider) {
        case 'google':
          // Inicia o fluxo do Google via AuthSession
          await promptAsync();
          return; // O useEffect tratará o sucesso
        case 'facebook':
          if (signInWithFacebook) result = await signInWithFacebook(role);
          break;
        case 'apple':
          if (signInWithApple) result = await signInWithApple(role);
          break;
        default:
          throw new Error('Provedor de autenticação não suportado');
      }

      if (result && result.success) {
        if (is2FAEnabled) {
          navigation.navigate('TwoFactorAuth');
        } else {
          if (onSuccess) {
            onSuccess();
          }
        }
      } else if (result) {
        Alert.alert(
          'Erro de autenticação',
          result.error || 'Não foi possível realizar login. Tente novamente.'
        );
      }
    } catch (error) {
      console.error(`Erro na autenticação com ${provider}:`, error);
      Alert.alert(
        'Erro de autenticação',
        'Ocorreu um erro durante o processo de login.'
      );
    } finally {
      if (provider !== 'google') setLoadingProvider(null);
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
