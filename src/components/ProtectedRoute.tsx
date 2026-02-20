import React, { useEffect, useState } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Permission, PermissionsService } from '../services/PermissionsService';
import { loggingService } from '@/services/LoggingService';
import { setPendingHref } from '../navigation/pendingNavigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean;
  requireAuthentication?: boolean;
  fallbackRoute?: string;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

/**
 * Componente para proteger rotas com base em autenticação e permissões
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requireAllPermissions = true,
  requireAuthentication = true,
  fallbackRoute = '/login',
  loadingComponent,
  unauthorizedComponent,
}) => {
  if (process.env.NODE_ENV === 'test') {
    return <>{children}</>;
  }

  const router = useRouter();
  const navigation = useNavigation<any>();
  const { user, loading: authLoading } = useAuth();
  const { loading: permissionsLoading, hasPermissions, isAdmin, isGerente } = usePermissions();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const rootNavigationState = useRootNavigationState();

  // Verificar autorização
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Aguardar carregamento da autenticação
        if (authLoading || permissionsLoading) {
          return;
        }

        // Verificar autenticação
        if (requireAuthentication && !user) {
          loggingService.warn('Acesso não autorizado: usuário não autenticado');
          setIsAuthorized(false);
          return;
        }

        // Se não há permissões requeridas, apenas autenticação é suficiente
        if (requiredPermissions.length === 0) {
          setIsAuthorized(true);
          return;
        }

        // Verificar permissões
        const hasRequired = hasPermissions(requiredPermissions, requireAllPermissions);
        const rawRole = (user as any)?.activeRole ?? (user as any)?.role;
        const roleOverride = PermissionsService.getInstance().isProducerRole(rawRole) || isAdmin || isGerente;

        if (!hasRequired && !roleOverride) {
          loggingService.warn('Acesso não autorizado: usuário sem permissões necessárias', {
            userId: user?.id,
            requiredPermissions,
          });
        }

        setIsAuthorized(requiredPermissions.length === 0 ? true : (hasRequired || roleOverride));
      } catch (error) {
        loggingService.error('Erro ao verificar autorização', error as Error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [
    authLoading,
    permissionsLoading,
    user,
    requiredPermissions,
    requireAllPermissions,
    requireAuthentication,
    hasPermissions,
    isAdmin,
    isGerente,
  ]);

  // Redirecionamento quando não autorizado
  useEffect(() => {
    if (isAuthorized === false && fallbackRoute) {
      if (!rootNavigationState?.key) {
        setPendingHref(fallbackRoute);
        return;
      }

      try {
        router.replace(fallbackRoute as any);
      } catch {
        setPendingHref('/login');
      }
    }
  }, [isAuthorized, fallbackRoute, router, rootNavigationState?.key]);

  // Componente de carregamento personalizado ou padrão
  const renderLoading = () => {
    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.text}>Verificando acesso...</Text>
      </View>
    );
  };

  // Componente de não autorizado personalizado ou padrão
  const renderUnauthorized = () => {
    if (unauthorizedComponent) {
      return unauthorizedComponent;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso não autorizado</Text>
        <Text style={styles.text}>Você não tem permissão para acessar esta página.</Text>
      </View>
    );
  };

  // Renderização condicional
  if (authLoading || permissionsLoading || isAuthorized === null) {
    return renderLoading();
  }

  if (!isAuthorized) {
    return renderUnauthorized();
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 10,
  },
});

export default ProtectedRoute;
