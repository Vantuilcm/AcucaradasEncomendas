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
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getAuth } from '../config/firebase';
import { ENV } from '../config/env';

WebBrowser.maybeCompleteAuthSession();

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  role?: string;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess, role: _role = 'comprador' }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { is2FAEnabled } = useAuth();

  // Configuração Google Auth
  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: ENV.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: ENV.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    clientId: ENV.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    responseType: 'id_token',
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'acucaradas',
      preferLocalhost: true,
    }),
  });

  useEffect(() => {
    console.log('🛡️ [DEBUG_SOCIAL] IDs Carregados:', {
      googleIos: !!ENV.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleWeb: !!ENV.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      facebook: !!ENV.EXPO_PUBLIC_FACEBOOK_APP_ID
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const token = id_token || response.authentication?.idToken;
      
      console.log('🛡️ [DEBUG_GOOGLE] Response Type:', response.type);
      console.log('🛡️ [DEBUG_GOOGLE] Token found:', !!token);
      
      if (token) {
        handleGoogleLogin(token);
      } else {
        console.error('❌ [DEBUG_GOOGLE] No ID Token found in response');
        Alert.alert('Erro Google', 'Não foi possível obter o token de autenticação.');
      }
    } else if (response?.type === 'error') {
      console.error('❌ [DEBUG_GOOGLE] Auth Error:', response.error);
      Alert.alert('Erro Google', 'Falha na comunicação com o Google.');
    }
  }, [response]);

  // Configuração Facebook Auth
  const [, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: ENV.EXPO_PUBLIC_FACEBOOK_APP_ID,
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'acucaradas',
      preferLocalhost: true,
    }),
  });

  useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { access_token } = fbResponse.params;
      if (access_token) {
        handleFacebookLogin(access_token);
      }
    }
  }, [fbResponse]);

  const handleFacebookLogin = async (accessToken: string) => {
    try {
      setLoadingProvider('facebook');
      console.log('🛡️ [DEBUG_FB] AccessToken recebido');
      
      const { FacebookAuthProvider, signInWithCredential: firebaseSignIn } = require('firebase/auth');
      const credential = FacebookAuthProvider.credential(accessToken);
      
      const auth = getAuth();
      const userCredential = await firebaseSignIn(auth, credential);
      console.log('✅ [DEBUG_FB] SUCESSO! UID:', userCredential.user.uid);
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('❌ [DEBUG_FB] Erro no login:', error);
      Alert.alert('Erro Facebook', error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogleLogin = async (idToken: string) => {
    try {
      setLoadingProvider('google');
      console.log('🛡️ [DEBUG_GOOGLE] idToken recebido:', idToken ? '✅ EXISTE' : '❌ AUSENTE');
      
      const { GoogleAuthProvider, signInWithCredential: firebaseSignIn } = require('firebase/auth');
      console.log('🛡️ [DEBUG_GOOGLE] GoogleAuthProvider carregado:', !!GoogleAuthProvider);
      
      const credential = GoogleAuthProvider.credential(idToken);
      console.log('🛡️ [DEBUG_GOOGLE] Credencial criada com sucesso');
      
      const auth = getAuth();
      const userCredential = await firebaseSignIn(auth, credential);
      console.log('✅ [DEBUG_GOOGLE] SUCESSO! UID:', userCredential.user.uid);
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('❌ [DEBUG_GOOGLE] Erro no login:', error);
      Alert.alert('Erro Google', error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    try {
      // Validação de Segurança: Verificar se o ID do provedor existe antes de tentar abrir
      if (provider === 'google' && !ENV.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && !ENV.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
        Alert.alert('Login Social', 'O login via Google está em manutenção técnica. Por favor, use e-mail e senha por enquanto.');
        return;
      }
      
      if (provider === 'facebook' && (!ENV.EXPO_PUBLIC_FACEBOOK_APP_ID || ENV.EXPO_PUBLIC_FACEBOOK_APP_ID.includes('SEU_APP'))) {
        Alert.alert('Login Social', 'O login via Facebook está em manutenção técnica. Por favor, use e-mail e senha por enquanto.');
        return;
      }

      setLoadingProvider(provider);

      let result: { success: boolean; error?: string } | null = null;

      switch (provider) {
        case 'google':
          // Inicia o fluxo do Google via AuthSession
          await promptAsync();
          return; // O useEffect tratará o sucesso
        case 'facebook':
          // Inicia o fluxo do Facebook via AuthSession
          await fbPromptAsync();
          return; // O useEffect tratará o sucesso
        case 'apple':
          const { OAuthProvider, signInWithCredential: firebaseSignInApple } = require('firebase/auth');
          const AppleAuthentication = require('expo-apple-authentication');
          
          const appleCredential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          const provider = new OAuthProvider('apple.com');
          const credential = provider.credential({
            idToken: appleCredential.identityToken!,
          });

          const auth = getAuth();
          await firebaseSignInApple(auth, credential);
          result = { success: true };
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
