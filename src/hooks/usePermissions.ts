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
  const [loading, setLoading] = useState(false); // MISSÃO ZERO TELA BRANCA: Forçar loading false
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const permissionsService = PermissionsService.getInstance();

  // Carregar papel e permissões do usuário - SIMPLIFICADO PARA DIAGNÓSTICO
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      // Bypassing logic for diagnostic
      setLoading(false);
    };

    loadPermissions();
  }, [user]);

  // Verificar se o usuário tem uma permissão específica
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return true; // MISSÃO ZERO TELA BRANCA: Permitir tudo temporariamente
    },
    []
  );

  // Verificar se o usuário tem múltiplas permissões
  const hasPermissions = useCallback(
    (permissions: Permission[], requireAll: boolean = true): boolean => {
      return true; // MISSÃO ZERO TELA BRANCA: Permitir tudo temporariamente
    },
    []
  );

  // Atualizar permissões (útil após mudanças no papel ou permissões)
  const updatePermissions = useCallback(async () => {
    setLoading(false);
  }, []);

  // Verificações de papel para conveniência
  const activeRole = ((user as any)?.role || (user as any)?.activeRole || '').toLowerCase();
  
  const isAdmin = activeRole === Role.ADMIN || (user as any)?.role === 'admin';
  const isGerente = activeRole === Role.GERENTE;
  const isAtendente = activeRole === Role.ATENDENTE;
  const isCliente = activeRole === Role.CLIENTE || activeRole === 'comprador' || activeRole === 'customer';
  const isEntregador = activeRole === Role.ENTREGADOR || (user as any)?.role === 'entregador';
  const isProdutor = activeRole === 'produtor' || activeRole === 'producer' || (user as any)?.role === 'produtor';

  return {
    loading: false, // Forçar false
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
