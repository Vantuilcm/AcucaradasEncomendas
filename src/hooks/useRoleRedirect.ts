import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to handle role-based navigation redirects.
 * Centralizes the logic of where each user should be sent after login or on the home screen.
 */
export const useRoleRedirect = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const redirectToDashboard = useCallback(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    // Authenticated routing is owned by AppNavigator / HomeScreen embeds.
    // Do not reset to unregistered diagnostic routes.
    return false;
  }, [user, navigation]);

  return { redirectToDashboard };
};
