import { loggingService } from './LoggingService';
import { f, auth } from '../config/firebase';

// Definição de papéis disponíveis
export enum Role {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  ATENDENTE = 'atendente',
  CLIENTE = 'cliente',
  ENTREGADOR = 'entregador',
  PRODUTOR = 'produtor',
  COMPRADOR = 'comprador',
}

// Definição de permissões disponíveis
export enum Permission {
  // Permissões administrativas
  GERENCIAR_USUARIOS = 'gerenciar_usuarios',
  VISUALIZAR_LOGS = 'visualizar_logs',
  CONFIGURAR_SISTEMA = 'configurar_sistema',

  // Permissões de pedidos
  VISUALIZAR_TODOS_PEDIDOS = 'visualizar_todos_pedidos',
  GERENCIAR_PEDIDOS = 'gerenciar_pedidos',
  CANCELAR_PEDIDOS = 'cancelar_pedidos',

  // Permissões de produtos
  GERENCIAR_PRODUTOS = 'gerenciar_produtos',
  VISUALIZAR_PRODUTOS = 'visualizar_produtos',

  // Permissões de perfil
  EDITAR_PERFIL = 'editar_perfil',
  VISUALIZAR_PERFIL = 'visualizar_perfil',

  // Permissões de entregas
  GERENCIAR_ENTREGAS = 'gerenciar_entregas',
  VISUALIZAR_ENTREGAS = 'visualizar_entregas',
  ATUALIZAR_STATUS_ENTREGA = 'atualizar_status_entrega',

  // Permissões de relatórios
  GERAR_RELATORIOS = 'gerar_relatorios',
  VISUALIZAR_RELATORIOS = 'visualizar_relatorios',

  // Permissões de avaliações
  GERENCIAR_AVALIACOES = 'gerenciar_avaliacoes',
  CRIAR_AVALIACAO = 'criar_avaliacao',
}

// Mapeamento de permissões por papel
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.GERENTE]: [
    Permission.VISUALIZAR_TODOS_PEDIDOS,
    Permission.GERENCIAR_PEDIDOS,
    Permission.CANCELAR_PEDIDOS,
    Permission.GERENCIAR_PRODUTOS,
    Permission.VISUALIZAR_PRODUTOS,
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.GERENCIAR_ENTREGAS,
    Permission.VISUALIZAR_ENTREGAS,
    Permission.ATUALIZAR_STATUS_ENTREGA,
    Permission.GERAR_RELATORIOS,
    Permission.VISUALIZAR_RELATORIOS,
    Permission.GERENCIAR_AVALIACOES,
  ],
  [Role.ATENDENTE]: [
    Permission.VISUALIZAR_TODOS_PEDIDOS,
    Permission.GERENCIAR_PEDIDOS,
    Permission.VISUALIZAR_PRODUTOS,
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.VISUALIZAR_ENTREGAS,
    Permission.VISUALIZAR_RELATORIOS,
  ],
  [Role.CLIENTE]: [
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.VISUALIZAR_PRODUTOS,
    Permission.CRIAR_AVALIACAO,
  ],
  [Role.ENTREGADOR]: [
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.VISUALIZAR_ENTREGAS,
    Permission.ATUALIZAR_STATUS_ENTREGA,
  ],
  [Role.PRODUTOR]: [
    Permission.GERENCIAR_PRODUTOS,
    Permission.VISUALIZAR_PRODUTOS,
    Permission.VISUALIZAR_TODOS_PEDIDOS,
    Permission.GERENCIAR_PEDIDOS,
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.GERAR_RELATORIOS,
    Permission.VISUALIZAR_RELATORIOS,
  ],
  [Role.COMPRADOR]: [
    Permission.EDITAR_PERFIL,
    Permission.VISUALIZAR_PERFIL,
    Permission.VISUALIZAR_PRODUTOS,
    Permission.CRIAR_AVALIACAO,
  ],
};

export class PermissionsService {
  private static instance: PermissionsService;
  private permissionsCache: Map<string, Permission[]> = new Map();
  private readonly permissionsCollection = 'permissoes';
  private readonly usersCollection = 'users'; // PADRONIZADO: users

  private constructor() {}

  public static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  /**
   * Obtém as permissões padrão para um papel
   * @param role Papel do usuário
   * @returns Lista de permissões padrão
   */
  public getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[Role.CLIENTE];
  }

  /**
   * Verifica se o usuário atual tem permissão específica
   * @param permission Nome da permissão a verificar
   * @returns Se o usuário tem a permissão
   */
  public async hasPermission(permission: Permission): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }

      const permissions = await this.getUserPermissions(currentUser.uid);
      return permissions.includes(permission);
    } catch (error) {
      loggingService.error('Erro ao verificar permissão', { error, permission });
      return false;
    }
  }

  /**
   * Verifica se o usuário atual tem um papel específico
   * @param role Papel a verificar
   * @returns Se o usuário tem o papel
   */
  public async hasRole(role: Role): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }

      const userDoc = await f.getDoc(f.doc(this.usersCollection, currentUser.uid));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      return userData?.role === role;
    } catch (error) {
      loggingService.error('Erro ao verificar papel do usuário', { error, role });
      return false;
    }
  }

  /**
   * Obtém todas as permissões do usuário
   * @param userId ID do usuário
   * @returns Objeto com todas as permissões
   */
  public async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Verificar cache primeiro
      if (this.permissionsCache.has(userId)) {
        return this.permissionsCache.get(userId)!;
      }

      // Obter o papel do usuário
      const userDoc = await f.getDoc(f.doc(this.usersCollection, userId));
      if (!userDoc.exists()) {
        return ROLE_PERMISSIONS[Role.CLIENTE];
      }

      const userData = userDoc.data();
      const userRole = (userData?.role as Role) || Role.CLIENTE;

      // Verificar se há permissões personalizadas
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      let permissions: Permission[];

      if (permissionsDoc.exists()) {
        // Usar permissões personalizadas
        const docData = permissionsDoc.data();
        permissions = docData ? (docData.permissions as Permission[] || docData as unknown as Permission[]) : ROLE_PERMISSIONS[userRole];
      } else {
        // Usar permissões padrão do papel
        permissions = ROLE_PERMISSIONS[userRole];
      }

      // Armazenar em cache
      this.permissionsCache.set(userId, permissions);

      return permissions;
    } catch (error) {
      loggingService.error('Erro ao obter permissões do usuário', { error, userId });
      return ROLE_PERMISSIONS[Role.CLIENTE];
    }
  }

  /**
   * Altera o papel do usuário
   * @param userId ID do usuário
   * @param newRole Novo papel
   * @returns Sucesso da operação
   */
  public async changeUserRole(userId: string, newRole: Role): Promise<boolean> {
    try {
      // Verificar se o usuário atual é admin
      // Não chamamos hasPermission aqui para evitar recursão infinita se estivermos inicializando
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      // Atualizar o papel do usuário
      await f.updateDoc(f.doc(this.usersCollection, userId), {
        role: newRole,
        dataAtualizacao: f.serverTimestamp(),
      });

      // Redefinir permissões para o padrão do novo papel
      await f.setDoc(f.doc(this.permissionsCollection, userId), {
        permissions: ROLE_PERMISSIONS[newRole],
        updatedAt: f.serverTimestamp(),
      });

      // Limpar cache
      this.permissionsCache.delete(userId);

      loggingService.info('Papel de usuário alterado com sucesso', {
        userId,
        newRole,
      });

      return true;
    } catch (error) {
      loggingService.error('Erro ao alterar papel do usuário', { error, userId, newRole });
      return false;
    }
  }

  /**
   * Define permissões personalizadas para um usuário
   * @param userId ID do usuário
   * @param permissions Permissões a definir
   * @returns Sucesso da operação
   */
  public async setCustomPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      // Verificar se o usuário atual é admin
      // Usamos getAuth().currentUser diretamente para evitar recursão
      if (!auth.currentUser) return false;

      // Obter permissões atuais para não perder configurações
      const currentPermissions = await this.getUserPermissions(userId);

      // Atualizar com novas permissões
      await f.setDoc(f.doc(this.permissionsCollection, userId), {
        permissions: [...new Set([...currentPermissions, ...permissions])],
        updatedAt: f.serverTimestamp(),
      });

      // Limpar cache
      this.permissionsCache.delete(userId);

      loggingService.info('Permissões personalizadas definidas com sucesso', {
        userId,
      });

      return true;
    } catch (error) {
      loggingService.error('Erro ao definir permissões personalizadas', { error, userId });
      return false;
    }
  }

  /**
   * Verifica recursos de um usuário específico
   * @param userId ID do usuário
   * @param permission Permissão a verificar
   * @returns Se o usuário tem a permissão
   */
  public async checkUserPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      loggingService.error('Erro ao verificar permissão de usuário específico', {
        error,
        userId,
        permission,
      });
      return false;
    }
  }

  /**
   * Reseta as permissões de um usuário para o padrão do seu papel
   * @param userId ID do usuário
   * @returns Sucesso da operação
   */
  public async resetPermissionsToDefault(userId: string): Promise<boolean> {
    try {
      if (!auth.currentUser) return false;

      // Obter o papel atual do usuário
      const userDoc = await f.getDoc(f.doc(this.usersCollection, userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const userRole = (userData?.role as Role) || Role.CLIENTE;

      // Redefinir para o padrão do papel
      await f.setDoc(f.doc(this.permissionsCollection, userId), {
        permissions: ROLE_PERMISSIONS[userRole],
        updatedAt: f.serverTimestamp(),
      });

      // Limpar cache
      this.permissionsCache.delete(userId);

      loggingService.info('Permissões redefinidas para o padrão', {
        userId,
        role: userRole,
      });

      return true;
    } catch (error) {
      loggingService.error('Erro ao redefinir permissões para o padrão', { error, userId });
      return false;
    }
  }

  /**
   * Limpa o cache de permissões para forçar recarregamento da próxima vez
   */
  public clearCache(): void {
    this.permissionsCache.clear();
  }

  /**
   * Obtém o papel do usuário
   * @param userId ID do usuário
   * @returns Papel do usuário
   */
  public async getUserRole(userId: string): Promise<Role> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // 🚨 [RECOVERY] Priorizar o documento principal do usuário (users)
      const userDoc = await f.getDoc(f.doc(this.usersCollection, userId));
      if (userDoc.exists()) {
        const role = (userDoc.data()?.role || userDoc.data()?.activeRole) as Role;
        if (role) return role;
      }

      // Fallback para o documento de permissões
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se não existir em nenhum lugar, definir como CLIENTE por padrão no users
        await f.updateDoc(f.doc(this.usersCollection, userId), {
          role: Role.CLIENTE,
          updatedAt: f.serverTimestamp()
        }).catch(() => {});
        return Role.CLIENTE;
      }

      const permissionsData = permissionsDoc.data();
      return (permissionsData?.role || Role.CLIENTE) as Role;
    } catch (error) {
      loggingService.error('Erro ao obter papel do usuário', { error, userId });
      return Role.CLIENTE;
    }
  }

  /**
   * Define o papel do usuário (Apenas Admin)
   * @param userId ID do usuário
   * @param role Novo papel
   * @returns Confirmação da operação
   */
  public async setUserRole(userId: string, role: Role): Promise<void> {
    try {
      if (!auth.currentUser) throw new Error('Acesso negado: Usuário não autenticado.');

      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Verificar se o papel é válido
      if (!Object.values(Role).includes(role)) {
        throw new Error('Papel inválido');
      }

      // Obter permissões para o papel
      const permissions = ROLE_PERMISSIONS[role];

      // Atualizar documento de permissões
      await f.setDoc(f.doc(this.permissionsCollection, userId), {
        role,
        permissions,
        dataAtualizacao: new Date(),
      });
      
      // Sincronizar também no documento de usuário
      await f.updateDoc(f.doc(this.usersCollection, userId), {
        role,
        updatedAt: f.serverTimestamp()
      });

      loggingService.info('Papel do usuário atualizado', { userId, role });
    } catch (error) {
      loggingService.error('Erro ao definir papel do usuário', { error, userId, role });
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem múltiplas permissões
   * @param userId ID do usuário
   * @param permissions Lista de permissões a verificar
   * @param requireAll Se é necessário ter todas as permissões (AND) ou apenas uma (OR)
   * @returns Se o usuário tem as permissões
   */
  public async hasPermissions(
    userId: string,
    permissions: Permission[],
    requireAll: boolean = true
  ): Promise<boolean> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Obter documento de permissões
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Fallback: usar permissões padrão baseadas no papel do users
        const role = await this.getUserRole(userId);
        const defaultPermissions = ROLE_PERMISSIONS[role] || [];
        if (requireAll) {
          return permissions.every(p => defaultPermissions.includes(p));
        } else {
          return permissions.some(p => defaultPermissions.includes(p));
        }
      }

      const permissionsData = permissionsDoc.data();
      const userPermissions = permissionsData?.permissions as Permission[] || [];

      if (requireAll) {
        // Verificar se tem todas as permissões (AND)
        return permissions.every(p => userPermissions.includes(p));
      } else {
        // Verificar se tem pelo menos uma permissão (OR)
        return permissions.some(p => userPermissions.includes(p));
      }
    } catch (error) {
      loggingService.error('Erro ao verificar múltiplas permissões', {
        error,
        userId,
        permissions,
        requireAll,
      });
      return false;
    }
  }

  /**
   * Adiciona permissões personalizadas a um usuário
   * @param userId ID do usuário
   * @param permissions Permissões a adicionar
   * @returns Confirmação da operação
   */
  public async addCustomPermissions(userId: string, permissions: Permission[]): Promise<void> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Verificar se as permissões são válidas
      permissions.forEach(permission => {
        if (!Object.values(Permission).includes(permission)) {
          throw new Error(`Permissão inválida: ${permission}`);
        }
      });

      // Obter documento de permissões atual
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se não existir, criar com papel CLIENTE
        await this.changeUserRole(userId, Role.CLIENTE);
      }

      // Obter permissões atuais
      const permissionsData = permissionsDoc.exists() ? permissionsDoc.data() : null;
      const currentPermissions = permissionsData?.permissions as Permission[] || ROLE_PERMISSIONS[Role.CLIENTE];

      // Adicionar novas permissões (sem duplicatas)
      const updatedPermissions = [...new Set([...currentPermissions, ...permissions])];

      // Atualizar documento
      await f.updateDoc(f.doc(this.permissionsCollection, userId), {
        permissions: updatedPermissions,
        customPermissions: true,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Permissões personalizadas adicionadas', { userId, permissions });
    } catch (error) {
      loggingService.error('Erro ao adicionar permissões personalizadas', {
        error,
        userId,
        permissions,
      });
      throw error;
    }
  }

  /**
   * Remove permissões personalizadas de um usuário
   * @param userId ID do usuário
   * @param permissions Permissões a remover
   * @returns Confirmação da operação
   */
  public async removeCustomPermissions(userId: string, permissions: Permission[]): Promise<void> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Obter documento de permissões
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        return;
      }

      // Obter permissões atuais
      const permissionsData = permissionsDoc.data();
      const currentPermissions = permissionsData?.permissions as Permission[] || [];

      // Remover permissões
      const updatedPermissions = currentPermissions.filter(p => !permissions.includes(p));

      // Atualizar documento
      await f.updateDoc(f.doc(this.permissionsCollection, userId), {
        permissions: updatedPermissions,
        customPermissions: true,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Permissões personalizadas removidas', { userId, permissions });
    } catch (error) {
      loggingService.error('Erro ao remover permissões personalizadas', {
        error,
        userId,
        permissions,
      });
      throw error;
    }
  }

  /**
   * Reseta as permissões de um usuário para o padrão do seu papel
   * @param userId ID do usuário
   * @returns Confirmação da operação
   */
  public async resetToRoleDefaults(userId: string): Promise<void> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Obter documento de permissões
      const permissionsDoc = await f.getDoc(f.doc(this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se não existir, definir como CLIENTE por padrão
        await this.changeUserRole(userId, Role.CLIENTE);
        return;
      }

      // Obter papel atual
      const permissionsData = permissionsDoc.data();
      const role = permissionsData?.role as Role || Role.CLIENTE;

      // Obter permissões padrão para o papel
      const defaultPermissions = ROLE_PERMISSIONS[role];

      // Atualizar documento
      await f.updateDoc(f.doc(this.permissionsCollection, userId), {
        permissions: defaultPermissions,
        customPermissions: false,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Permissões resetadas para o padrão do papel', { userId, role });
    } catch (error) {
      loggingService.error('Erro ao resetar permissões', { error, userId });
      throw error;
    }
  }

  /**
   * Obtém todas as permissões disponíveis
   * @returns Lista de permissões
   */
  public getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Obtém todos os papéis disponíveis
   * @returns Lista de papéis
   */
  public getAllRoles(): Role[] {
    return Object.values(Role);
  }
}
