import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedButtons } from 'react-native-paper';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { PermissionsService, Role as AppRole } from '../services/PermissionsService';
import LoggingService from '../services/LoggingService';
import { setPendingHref } from '../navigation/pendingNavigation';

const logger = LoggingService.getInstance();

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<'customer' | 'producer' | 'courier'>('customer');
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signInWithGoogle, signInWithFacebook, signInWithApple, is2FAEnabled } = useAuth();

  const safeReplace = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    try {
      router.replace(href as any);
    } catch {
      setPendingHref(href);
    }
  };

  const safePush = (href: string) => {
    if (!rootNavigationState?.key) {
      setPendingHref(href);
      return;
    }
    try {
      router.push(href as any);
    } catch {
      setPendingHref(href);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    try {
      setLoadingProvider(provider);
      setErrorMsg(null);

      let result;

      switch (provider) {
        case 'google':
          if (!signInWithGoogle) {
            throw new Error('Autenticação Google não está disponível no momento');
          }
          result = await signInWithGoogle?.(role);
          break;
        case 'facebook':
          if (!signInWithFacebook) {
            throw new Error('Autenticação Facebook não está disponível no momento');
          }
          result = await signInWithFacebook();
          break;
        case 'apple':
          if (!signInWithApple) {
            throw new Error('Autenticação Apple não está disponível no momento');
          }
          result = await signInWithApple?.(role);
          break;
        default:
          throw new Error('Provedor de autenticação não suportado');
      }

      if (result.success) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        if (is2FAEnabled) {
          // Mantemos navigation.navigate para telas internas do AppNavigator se necessário,
          // mas para mudar de contexto (Auth -> App), usamos router.replace
          safePush('/two-factor-auth');
        } else {
          if (onSuccess) {
            onSuccess();
          } else {
            console.log('[SocialAuth] Login bem-sucedido. Redirecionando para /src-app');
            safeReplace('/src-app');
          }
        }
      } else {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
        setErrorMsg(result.error || 'Não foi possível realizar login. Tente novamente.');
      }
    } catch (error) {
      logger.error(`Erro na autenticação com ${provider}:`, error instanceof Error ? error : new Error(String(error)));
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      setErrorMsg('Ocorreu um erro durante o processo de login. Por favor, tente novamente.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // Verifica se o dispositivo suporta Apple Authentication
  const showAppleButton = Platform.OS === 'ios';
  const openHelp = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url as any);
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <Text style={styles.orText}>ou continue com</Text>

      <SegmentedButtons
        value={role}
        onValueChange={v => setRole(v as any)}
        buttons={[
          { value: 'customer', label: 'Comprador', disabled: !!loadingProvider },
          { value: 'producer', label: 'Produtor', disabled: !!loadingProvider },
          { value: 'courier', label: 'Entregador', disabled: !!loadingProvider },
        ]}
        style={{ marginBottom: 12 }}
      />

      <Text style={styles.destinationText}>
        {role === 'producer' ? 'Após login você irá para Perfil' : role === 'courier' ? 'Após login você irá para Painel do Entregador' : 'Após login você irá para Dashboard do Comprador'}
      </Text>

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

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : null}

      <View />
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
  errorText: {
    marginTop: 8,
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  destinationText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default SocialAuthButtons;
