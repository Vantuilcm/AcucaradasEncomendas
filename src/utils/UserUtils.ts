import { loggingService } from '../services/LoggingService';

/**
 * Utilitário para centralização de identidade e resolução de papéis (roles)
 * Garante que o acesso a propriedades do usuário seja consistente em todo o app.
 */
export const UserUtils = {
  /**
   * Obtém o ID único do usuário de forma segura, tratando diferentes provedores (Firebase/Contexto)
   */
  getUserId: (user: any): string | undefined => {
    if (!user) return undefined;
    const userId = user.id || user.uid || (user as any).id || (user as any).uid;
    if (!userId) {
      loggingService.warn('Tentativa de obter ID de usuário resultou em undefined', { 
        hasUser: !!user,
        keys: user ? Object.keys(user) : [] 
      });
    }
    return userId;
  },

  /**
   * Obtém o email do usuário de forma segura
   */
  getUserEmail: (user: any): string | undefined => {
    if (!user) return undefined;
    return user.email || (user as any).email || (user as any).emailAddress;
  },

  /**
   * Obtém o nome do usuário de forma segura
   */
  getUserName: (user: any): string | undefined => {
    if (!user) return undefined;
    return user.nome || user.name || user.displayName || (user as any).nome || (user as any).name;
  },

  /**
   * Resolve a role do usuário a partir do perfil ou objeto de usuário
   * Suporta os tipos: 'comprador', 'produtor', 'entregador', 'admin'
   * Mapeia variações (producer -> produtor, driver -> entregador)
   */
  getUserRole: (user: any): string | undefined => {
    if (!user) return undefined;
    
    // Prioridade para role explícita no objeto de usuário/perfil
    let role = user.role || user.activeRole || (user as any).role || (user as any).activeRole;
    
    if (role) {
      role = role.toLowerCase();
      // Mapeamento de normalização
      if (role === 'producer') return 'produtor';
      if (role === 'driver' || role === 'delivery') return 'entregador';
      if (role === 'customer' || role === 'cliente') return 'comprador';
      return role;
    }
    
    // Fallback para isAdmin
    if (user.isAdmin) return 'admin';
    
    return undefined;
  },

  /**
   * Valida se a role é uma das permitidas pelo sistema
   */
  isValidRole: (role: string | undefined): boolean => {
    if (!role) return false;
    const validRoles = ['comprador', 'produtor', 'entregador', 'admin', 'cliente', 'customer', 'producer', 'driver', 'delivery'];
    return validRoles.includes(role.toLowerCase());
  },

  /**
   * Mapeia a role para o fluxo de navegação correspondente (Alinhado com AppNavigator)
   */
  getNavigationTarget: (role: string | undefined): string => {
    if (!role) return 'RoleSelection'; 
    
    const normalizedRole = UserUtils.getUserRole({ role });
    
    switch (normalizedRole) {
      case 'comprador':
        return 'MainTabs';
      case 'produtor':
        return 'AdminPanel';
      case 'entregador':
        return 'DriverTabs';
      case 'admin':
        return 'AdminDashboard';
      default:
        return 'RoleSelection';
    }
  }
};
