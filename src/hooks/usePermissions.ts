import { useState, useEffect, useCallback } from 'react';
import { PermissionsService, Permission, Role } from '../services/PermissionsService';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '../services/LoggingService';
import { f } from '../config/firebase';

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
        // Se já temos a role no objeto user, não precisamos travar a UI com loading=true
        const existingRole = (user as any).role || (user as any).activeRole;
        if (!existingRole) {
          setLoading(true);
        }
        
        const role = await permissionsService.getUserRole((user as any).id);
        setUserRole(role);

        // Obter documento de permissões
        const permissionsDoc = await f.getDoc(f.doc('permissoes', (user as any).id));

        if (permissionsDoc.exists()) {
          const permissions = permissionsDoc.data()?.permissions as Permission[] || [];
          setUserPermissions(permissions);
        } else {
          // Fallback para permissões padrão do papel se não houver doc de permissões
          const defaultPermissions = permissionsService.getRolePermissions(role);
          setUserPermissions(defaultPermissions);
        }
      } catch (error) {
        loggingService.error('Erro ao carregar permissões do usuário', { error });
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
      const permissionsDoc = await f.getDoc(f.doc('permissoes', (user as any).id));

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
  // Priorizar o que está no objeto user do AuthContext (Sincronizado no Build 1160)
  const activeRole = (userRole || (user as any)?.role || (user as any)?.activeRole || '').toLowerCase();
  
  const isAdmin = activeRole === Role.ADMIN || (user as any)?.role === 'admin';
  const isGerente = activeRole === Role.GERENTE;
  const isAtendente = activeRole === Role.ATENDENTE;
  const isCliente = activeRole === Role.CLIENTE || activeRole === 'comprador' || activeRole === 'customer';
  const isEntregador = activeRole === Role.ENTREGADOR || (user as any)?.role === 'entregador';
  const isProdutor = activeRole === 'produtor' || activeRole === 'producer' || (user as any)?.role === 'produtor';

  return {
    loading,
    userRole: activeRole as Role,
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
