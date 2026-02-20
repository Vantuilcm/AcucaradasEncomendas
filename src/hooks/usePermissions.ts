import { useState, useEffect, useCallback } from 'react';
import { PermissionsService, Permission, Role } from '../services/PermissionsService';
import { useAuth } from '../contexts/AuthContext';
import { loggingService } from '@/services/LoggingService';
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
      const userId = user?.id;
      if (!userId) {
        setUserRole(null);
        setUserPermissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', userId));
        let effectiveRole: Role = Role.CLIENTE;
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          const activeRaw = (data?.activeRole as any);
          const baseRawDoc = activeRaw ?? (data?.role as any);
          const baseRaw = baseRawDoc ?? (((user as any)?.activeRole as any) ?? ((user as any)?.role as any) ?? 'cliente');
          const mappedRole: Role = baseRaw === 'producer' || baseRaw === 'produtor' ? Role.GERENTE
            : baseRaw === 'courier' || baseRaw === 'entregador' ? Role.ENTREGADOR
            : baseRaw === 'admin' ? Role.ADMIN
            : baseRaw === 'atendente' ? Role.ATENDENTE
            : Role.CLIENTE;
          setUserRole(mappedRole);
          effectiveRole = mappedRole;
        } else {
          const role = await permissionsService.getUserRoleById(userId);
          setUserRole(role);
          effectiveRole = role;
        }

        // Obter permissões personalizadas, se existirem
        const permissionsDoc = await getDoc(doc(db, 'permissoes', userId));
        const defaultPermissions = permissionsService.getRolePermissions(effectiveRole);
        if (permissionsDoc.exists()) {
          const data = permissionsDoc.data() as { permissions?: Permission[] } | undefined;
          const custom = data?.permissions ?? [];
          const merged = Array.from(new Set([...defaultPermissions, ...custom]));
          setUserPermissions(merged);
        } else {
          setUserPermissions(defaultPermissions);
        }
      } catch (error) {
        loggingService.error(
          'Erro ao carregar permissões',
          error instanceof Error ? error : undefined,
          { userId }
        );
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
      if (!user?.id) return false;
      return userPermissions.includes(permission);
    },
    [user, userPermissions]
  );

      // Verificar se o usuário tem múltiplas permissões
  const hasPermissions = useCallback(
    (permissions: Permission[], requireAll: boolean = true): boolean => {
      if (!user?.id) return false;

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
    const userId = user?.id;
    if (!userId) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));
      let effectiveRole: Role = Role.CLIENTE;
      if (userDoc.exists()) {
        const data = userDoc.data() as any;
        const activeRaw = (data?.activeRole as any);
        const baseRawDoc = activeRaw ?? (data?.role as any);
        const baseRaw = baseRawDoc ?? (((user as any)?.activeRole as any) ?? ((user as any)?.role as any) ?? 'cliente');
        const mappedRole: Role = baseRaw === 'producer' || baseRaw === 'produtor' ? Role.GERENTE
          : baseRaw === 'courier' || baseRaw === 'entregador' ? Role.ENTREGADOR
          : baseRaw === 'admin' ? Role.ADMIN
          : baseRaw === 'atendente' ? Role.ATENDENTE
          : Role.CLIENTE;
        setUserRole(mappedRole);
        effectiveRole = mappedRole;
      } else {
        const role = await permissionsService.getUserRoleById(userId);
        setUserRole(role);
        effectiveRole = role;
      }

      const permissionsDoc = await getDoc(doc(db, 'permissoes', userId));
      const defaultPermissions = permissionsService.getRolePermissions(effectiveRole);
      if (permissionsDoc.exists()) {
        const data = permissionsDoc.data() as { permissions?: Permission[] } | undefined;
        const custom = data?.permissions ?? [];
        const merged = Array.from(new Set([...defaultPermissions, ...custom]));
        setUserPermissions(merged);
      } else {
        setUserPermissions(defaultPermissions);
      }
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar permissões',
        error instanceof Error ? error : undefined,
        { userId }
      );
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
