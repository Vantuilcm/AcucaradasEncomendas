import { useState, useEffect, useCallback } from 'react';
import { PermissionsService, Permission, Role } from '../services/PermissionsService';
import { useAuth } from '../contexts/AuthContext';
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
  isProdutor: boolean;
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
      if (!user || !(user as any).id) {
        setUserRole(null);
        setUserPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const role = await permissionsService.getUserRole((user as any).id);
        setUserRole(role);

        // Obter documento de permissões
        const permissionsDoc = await getDoc(doc(db, 'permissoes', (user as any).id));

        if (permissionsDoc.exists()) {
          const permissions = permissionsDoc.data()?.permissions as Permission[] || [];
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
      if (!user || !(user as any).id) return false;
      return userPermissions.includes(permission);
    },
    [user, userPermissions]
  );

  // Verificar se o usuário tem múltiplas permissões
  const hasPermissions = useCallback(
    (permissions: Permission[], requireAll: boolean = true): boolean => {
      if (!user || !(user as any).id) return false;

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
    if (!user || !(user as any).id) return;

    try {
      setLoading(true);
      const role = await permissionsService.getUserRole((user as any).id);
      setUserRole(role);

      // Obter documento de permissões
      const permissionsDoc = await getDoc(doc(db, 'permissoes', (user as any).id));

      if (permissionsDoc.exists()) {
        const permissions = permissionsDoc.data()?.permissions as Permission[] || [];
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
  const isCliente = userRole === Role.CLIENTE || userRole === 'comprador' as any || userRole === 'customer' as any;
  const isEntregador = userRole === Role.ENTREGADOR;
  const isProdutor = userRole === 'produtor' as any || userRole === 'producer' as any;

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
    isProdutor,
  };
}

export default usePermissions;
