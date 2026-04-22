import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './usePermissions';
import { Role } from '../services/PermissionsService';

/**
 * Hook to handle role-based navigation redirects.
 * Centralizes the logic of where each user should be sent after login or on the home screen.
 */
export const useRoleRedirect = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isProdutor, isEntregador, isAdmin } = usePermissions();

  const redirectToDashboard = useCallback(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    const role = (user.role || '').toLowerCase();

    // MISSÃO ZERO TELA BRANCA: Forçar todos para BootDiagnostic
    navigation.reset({
      index: 0,
      routes: [{ name: 'BootDiagnostic' }],
    });
    return true;

    /* Original Logic Commented Out for Debugging
    if (isProdutor || isAdmin || role === Role.PRODUTOR || role === Role.ADMIN) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AdminPanel' }],
      });
      return true;
    }

    if (isEntregador || role === Role.ENTREGADOR) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'DriverHome' }],
      });
      return true;
    }

    // Default for Comprador
    return false;
    */
  }, [user, isProdutor, isEntregador, isAdmin, navigation]);

  return { redirectToDashboard };
};
