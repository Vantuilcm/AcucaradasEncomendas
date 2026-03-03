import { useState, useEffect, useCallback } from 'react';
import { PermissionsService, Permission, Role } from '../services/PermissionsService';
import { useAuth } from './useAuth';
import { loggingService } from '../services/LoggingService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface UsePermissionsReturn {
  loading: boolean;
  userRole: Role | null;
  hasPermission: (permission: Permission) => boolean;
  hasPermissions: (permissions: Permission[], requireAll?: boolean) => boolean;
  updatePermissions: () => Promise<void>;
  isAdmin: boolean;
  isGerente: boolean;
  isAtendente: boolean;
  isCliente: boolean;
  isEntregador: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const permissionsService = PermissionsService.getInstance();

  // Carregar papel e permissões do usuário
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user || !user.id) {
        setUserRole(null);
        setUserPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const role = await permissionsService.getUserRole(user.id);
        setUserRole(role);

        // Obter documento de permissões
        const permissionsDoc = await getDoc(doc(db, 'permissoes', user.id));

        if (permissionsDoc.exists()) {
          const permissions = permissionsDoc.data().permissions as Permission[];
          setUserPermissions(permissions);
        } else {
          // Se não existir, usar permissões padrão do papel
          const defaultPermissions = permissionsService.getRolePermissions(role);
          setUserPermissions(defaultPermissions);
        }
      } catch (error) {
        loggingService.error('Erro ao carregar permissões', { error });
        setUserRole(null);
        setUserPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  // Verificar se o usuário tem uma permissão específica
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user || !user.id) return false;
      return userPermissions.includes(permission);
    },
    [user, userPermissions]
  );

  // Verificar se o usuário tem múltiplas permissões
  const hasPermissions = useCallback(
    (permissions: Permission[], requireAll: boolean = true): boolean => {
      if (!user || !user.id) return false;

      if (requireAll) {
        // Verificar se tem todas as permissões (AND)
        return permissions.every(p => userPermissions.includes(p));
      } else {
        // Verificar se tem pelo menos uma permissão (OR)
        return permissions.some(p => userPermissions.includes(p));
      }
    },
    [user, userPermissions]
  );

  // Atualizar permissões (útil após mudanças no papel ou permissões)
  const updatePermissions = useCallback(async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      const role = await permissionsService.getUserRole(user.id);
      setUserRole(role);

      // Obter documento de permissões
      const permissionsDoc = await getDoc(doc(db, 'permissoes', user.id));

      if (permissionsDoc.exists()) {
        const permissions = permissionsDoc.data().permissions as Permission[];
        setUserPermissions(permissions);
      } else {
        // Se não existir, usar permissões padrão do papel
        const defaultPermissions = permissionsService.getRolePermissions(role);
        setUserPermissions(defaultPermissions);
      }
    } catch (error) {
      loggingService.error('Erro ao atualizar permissões', { error });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Verificações de papel para conveniência
  const isAdmin = userRole === Role.ADMIN;
  const isGerente = userRole === Role.GERENTE;
  const isAtendente = userRole === Role.ATENDENTE;
  const isCliente = userRole === Role.CLIENTE;
  const isEntregador = userRole === Role.ENTREGADOR;

  return {
    loading,
    userRole,
    hasPermission,
    hasPermissions,
    updatePermissions,
    isAdmin,
    isGerente,
    isAtendente,
    isCliente,
    isEntregador,
  };
}

export default usePermissions;
