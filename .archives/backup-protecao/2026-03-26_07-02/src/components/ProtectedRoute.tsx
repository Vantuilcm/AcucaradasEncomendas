import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../services/PermissionsService';
import { loggingService } from '../services/LoggingService';

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
  fallbackRoute = '/',
  loadingComponent,
  unauthorizedComponent,
}) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: permissionsLoading, hasPermissions } = usePermissions();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

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

        if (!hasRequired) {
          loggingService.warn('Acesso não autorizado: usuário sem permissões necessárias', {
            userId: user?.id,
            requiredPermissions,
          });
        }

        setIsAuthorized(hasRequired);
      } catch (error) {
        loggingService.error('Erro ao verificar autorização', { error });
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
  ]);

  // Redirecionamento quando não autorizado
  useEffect(() => {
    if (isAuthorized === false && fallbackRoute) {
      router.replace(fallbackRoute);
    }
  }, [isAuthorized, fallbackRoute, router]);

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
