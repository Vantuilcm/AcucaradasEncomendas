import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { loggingService } from './LoggingService';

// DefiniÃ§Ã£o de papÃ©is disponÃ­veis
export enum Role {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  ATENDENTE = 'atendente',
  CLIENTE = 'cliente',
  ENTREGADOR = 'entregador',
}

// DefiniÃ§Ã£o de permissÃµes disponÃ­veis
export enum Permission {
  // PermissÃµes administrativas
  GERENCIAR_USUARIOS = 'gerenciar_usuarios',
  VISUALIZAR_LOGS = 'visualizar_logs',
  CONFIGURAR_SISTEMA = 'configurar_sistema',

  // PermissÃµes de pedidos
  VISUALIZAR_TODOS_PEDIDOS = 'visualizar_todos_pedidos',
  GERENCIAR_PEDIDOS = 'gerenciar_pedidos',
  CANCELAR_PEDIDOS = 'cancelar_pedidos',

  // PermissÃµes de produtos
  GERENCIAR_PRODUTOS = 'gerenciar_produtos',
  VISUALIZAR_PRODUTOS = 'visualizar_produtos',

  // PermissÃµes de perfil
  EDITAR_PERFIL = 'editar_perfil',
  VISUALIZAR_PERFIL = 'visualizar_perfil',

  // PermissÃµes de entregas
  GERENCIAR_ENTREGAS = 'gerenciar_entregas',
  VISUALIZAR_ENTREGAS = 'visualizar_entregas',
  ATUALIZAR_STATUS_ENTREGA = 'atualizar_status_entrega',

  // PermissÃµes de relatÃ³rios
  GERAR_RELATORIOS = 'gerar_relatorios',
  VISUALIZAR_RELATORIOS = 'visualizar_relatorios',

  // PermissÃµes de avaliaÃ§Ãµes
  GERENCIAR_AVALIACOES = 'gerenciar_avaliacoes',
  CRIAR_AVALIACAO = 'criar_avaliacao',
}

// Mapeamento de permissÃµes por papel
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
};

export class PermissionsService {
  private static instance: PermissionsService;
  private permissionsCache: Map<string, Permission[]> = new Map();
  private readonly permissionsCollection = 'permissoes';
  private readonly usersCollection = 'users';

  private constructor() {}

  public static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  /**
   * Verifica se o usuÃ¡rio atual tem permissÃ£o especÃ­fica
   * @param permission Nome da permissÃ£o a verificar
   * @returns Se o usuÃ¡rio tem a permissÃ£o
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
      loggingService.error(
        'Erro ao verificar permissÃ£o',
        error instanceof Error ? error : undefined,
        { permission }
      );
      return false;
    }
  }

  /**
   * Verifica se o usuÃ¡rio atual tem um papel especÃ­fico
   * @param role Papel a verificar
   * @returns Se o usuÃ¡rio tem o papel
   */
  public async hasRole(role: Role): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }

      const userDoc = await getDoc(doc(db, this.usersCollection, currentUser.uid));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const activeRaw = (userData as any)?.activeRole as any;
      const raw = activeRaw ?? (userData as any)?.role;
      const mapped = raw === 'producer' || raw === 'produtor' ? Role.GERENTE
        : raw === 'courier' || raw === 'entregador' ? Role.ENTREGADOR
        : raw === 'admin' ? Role.ADMIN
        : raw === 'atendente' ? Role.ATENDENTE
        : Role.CLIENTE;
      return mapped === role;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar papel do usuÃ¡rio',
        error instanceof Error ? error : undefined,
        { role }
      );
      return false;
    }
  }

  /**
   * ObtÃ©m o papel do usuÃ¡rio atual
   * @returns Papel do usuÃ¡rio ou null se nÃ£o autenticado
   */
  public async getUserRole(): Promise<Role | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }

      const userDoc = await getDoc(doc(db, this.usersCollection, currentUser.uid));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      const activeRaw = (userData as any)?.activeRole as any;
      const raw = activeRaw ?? (userData as any)?.role ?? 'cliente';
      const role = raw === 'producer' || raw === 'produtor' ? Role.GERENTE
        : raw === 'courier' || raw === 'entregador' ? Role.ENTREGADOR
        : raw === 'admin' ? Role.ADMIN
        : raw === 'atendente' ? Role.ATENDENTE
        : Role.CLIENTE;
      return role;
    } catch (error) {
      loggingService.error('Erro ao obter papel do usuÃ¡rio', error instanceof Error ? error : undefined);
      return null;
    }
  }

  public async getUserRoles(): Promise<Role[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return [Role.CLIENTE];
      }
      const userDoc = await getDoc(doc(db, this.usersCollection, currentUser.uid));
      if (!userDoc.exists()) {
        return [Role.CLIENTE];
      }
      const data = userDoc.data() as any;
      const rawList = Array.isArray(data?.roles) ? data.roles : [(data?.role ?? 'cliente')];
      const mapped: Role[] = rawList.map((r: any) => r === 'producer' || r === 'produtor' ? Role.GERENTE
        : r === 'courier' || r === 'entregador' ? Role.ENTREGADOR
        : r === 'admin' ? Role.ADMIN
        : r === 'atendente' ? Role.ATENDENTE
        : Role.CLIENTE);
      const unique = Array.from(new Set(mapped));
      return unique.length ? unique : [Role.CLIENTE];
    } catch (error) {
      loggingService.error('Erro ao obter lista de papÃ©is do usuÃ¡rio', error instanceof Error ? error : undefined);
      return [Role.CLIENTE];
    }
  }

  /**
   * ObtÃ©m todas as permissÃµes do usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @returns Objeto com todas as permissÃµes
   */
  public async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // Verificar cache primeiro
      if (this.permissionsCache.has(userId)) {
        return this.permissionsCache.get(userId)!;
      }

      // Obter o papel do usuÃ¡rio
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      if (!userDoc.exists()) {
        return ROLE_PERMISSIONS[Role.CLIENTE];
      }

      const userData = userDoc.data() as any;
      const rolesArr: Role[] = Array.isArray(userData?.roles)
        ? (userData.roles as any[]).map((r: any) => r === 'producer' || r === 'produtor' ? Role.GERENTE
          : r === 'courier' || r === 'entregador' ? Role.ENTREGADOR
          : r === 'admin' ? Role.ADMIN
          : r === 'atendente' ? Role.ATENDENTE
          : Role.CLIENTE)
        : [];
      const activeRaw = (userData as any)?.activeRole as any;
      const activeRole = activeRaw === 'producer' || activeRaw === 'produtor' ? Role.GERENTE
        : activeRaw === 'courier' || activeRaw === 'entregador' ? Role.ENTREGADOR
        : activeRaw === 'admin' ? Role.ADMIN
        : activeRaw === 'atendente' ? Role.ATENDENTE
        : activeRaw ? Role.CLIENTE : undefined;
      const userRole = activeRole ?? ((userData?.role as Role) || Role.CLIENTE);

      // Verificar se hÃ¡ permissÃµes personalizadas
      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));

      let permissions: Permission[];

      const baseRoles = rolesArr.length ? rolesArr : [userRole];
      const defaultPermissions = Array.from(new Set(baseRoles.flatMap(r => ROLE_PERMISSIONS[r])));

      if (permissionsDoc.exists()) {
        const pdata = permissionsDoc.data();
        const custom = ((pdata as any).permissions ?? []) as Permission[];
        permissions = Array.from(new Set([...defaultPermissions, ...custom]));
      } else {
        permissions = defaultPermissions;
      }

      // Armazenar em cache
      this.permissionsCache.set(userId, permissions);

      return permissions;
    } catch (error) {
      loggingService.error(
        'Erro ao obter permissÃµes do usuÃ¡rio',
        error instanceof Error ? error : undefined,
        { userId }
      );
      return ROLE_PERMISSIONS[Role.CLIENTE];
    }
  }

  public async setActiveRole(newRole: Role): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }
      const ref = doc(db, this.usersCollection, currentUser.uid);
      const snap = await getDoc(ref);
      const data = (snap.exists() ? snap.data() : {}) as any;
      const rawRoles = Array.isArray(data?.roles) ? data.roles : [(data?.role ?? 'cliente')];
      const roleStr = newRole === Role.GERENTE ? 'producer'
        : newRole === Role.ADMIN ? 'admin'
        : newRole === Role.ATENDENTE ? 'atendente'
        : newRole === Role.ENTREGADOR ? 'courier'
        : 'customer';
      const nextRoles = Array.from(new Set([...rawRoles, roleStr]));
      await setDoc(ref, { roles: nextRoles, activeRole: roleStr, role: roleStr }, { merge: true } as any);
      this.permissionsCache.delete(currentUser.uid);
      return true;
    } catch (error) {
      loggingService.error('Erro ao definir papel ativo', error instanceof Error ? error : undefined, { newRole });
      return false;
    }
  }

  public async addUserRole(role: Role, setActive: boolean = false): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }

      // Validação de documentação para papéis específicos
      if (role === Role.ENTREGADOR || role === Role.GERENTE) {
        const isReady = await this.isUserReadyForRole(currentUser.uid, role);
        if (!isReady) {
          loggingService.warn('Tentativa de adicionar papel sem documentação completa', { userId: currentUser.uid, role });
          return false;
        }
      }

      const ref = doc(db, this.usersCollection, currentUser.uid);
      const snap = await getDoc(ref);
      const data = (snap.exists() ? snap.data() : {}) as any;
      const rawRoles: string[] = Array.isArray(data?.roles) ? data.roles : [(data?.role ?? 'customer')];
      const roleStr = role === Role.GERENTE ? 'producer'
        : role === Role.ADMIN ? 'admin'
        : role === Role.ATENDENTE ? 'atendente'
        : role === Role.ENTREGADOR ? 'courier'
        : 'customer';
      const nextRoles = Array.from(new Set([...rawRoles, roleStr]));
      const patch: any = { roles: nextRoles };
      const hasBaseRole = typeof data?.role === 'string' && data.role.length > 0;
      if (setActive) {
        patch.activeRole = roleStr;
      }
      if (setActive || !hasBaseRole) {
        patch.role = roleStr;
      }
      await setDoc(ref, patch, { merge: true } as any);
      this.permissionsCache.delete(currentUser.uid);
      return true;
    } catch (error) {
      loggingService.error('Erro ao adicionar papel do usuário', error instanceof Error ? error : undefined, { role });
      return false;
    }
  }

  /**
   * Verifica se o usuário tem a documentação necessária para um papel
   */
  public async isUserReadyForRole(userId: string, role: Role): Promise<boolean> {
    try {
      if (role === Role.ENTREGADOR) {
        const { DeliveryDriverService } = await import('./DeliveryDriverService');
        const driver = await DeliveryDriverService.getInstance().getDriverByUserId(userId);
        
        // Deve ter cadastro e documentação básica
        if (!driver) return false;

        // Verificar se tem os documentos obrigatórios
        const hasDocuments = driver.cpf && driver.cnh && 
                           driver.documents?.cnhImage && 
                           driver.documents?.vehicleDocument;

        // Só permite se tiver documentos e não estiver bloqueado
        // Nota: Permitimos 'pending' pois ele pode ativar o perfil para ver o dashboard, 
        // mas as permissões de ação serão controladas pelo status em outros lugares se necessário.
        // No entanto, para "ativar o recurso" na conta, ele deve ter enviado os documentos.
        return !!hasDocuments && driver.status !== 'blocked';
      }

      if (role === Role.GERENTE) {
        const { ProducerService } = await import('./ProducerService');
        const producer = await ProducerService.getInstance().getProducerByUserId(userId);
        
        if (!producer) return false;

        // Deve ter CPF ou CNPJ e endereço
        const hasIdentity = !!(producer.cpf || producer.cnpj);
        const hasAddress = !!(producer.address?.street && producer.address?.city);

        return hasIdentity && hasAddress && producer.status !== 'blocked';
      }

      return true; // Outros papéis não exigem documentação especial por enquanto
    } catch (error) {
      loggingService.error('Erro ao verificar prontidão do usuário para o papel', error instanceof Error ? error : undefined, { userId, role });
      return false;
    }
  }

  public async removeUserRole(role: Role): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }
      const ref = doc(db, this.usersCollection, currentUser.uid);
      const snap = await getDoc(ref);
      const data = (snap.exists() ? snap.data() : {}) as any;
      const rawRoles: string[] = Array.isArray(data?.roles) ? data.roles : [(data?.role ?? 'customer')];
      const activeRaw: string | undefined = (data?.activeRole as any) ?? undefined;
      const roleStr = role === Role.GERENTE ? 'producer'
        : role === Role.ADMIN ? 'admin'
        : role === Role.ATENDENTE ? 'atendente'
        : role === Role.ENTREGADOR ? 'courier'
        : 'customer';
      let nextRoles = rawRoles.filter(r => r !== roleStr);
      if (nextRoles.length === 0) {
        nextRoles = ['customer'];
      }
      const patch: any = { roles: nextRoles };
      if (activeRaw === roleStr) {
        const fallback = nextRoles.includes('courier') ? 'courier' : nextRoles.includes('producer') ? 'producer' : 'customer';
        patch.activeRole = fallback;
      }
      await setDoc(ref, patch, { merge: true } as any);
      this.permissionsCache.delete(currentUser.uid);
      return true;
    } catch (error) {
      loggingService.error('Erro ao remover papel do usuário', error instanceof Error ? error : undefined, { role });
      return false;
    }
  }

  /**
   * Altera o papel do usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param newRole Novo papel
   * @returns Sucesso da operaÃ§Ã£o
   */
  public async changeUserRole(userId: string, newRole: Role): Promise<boolean> {
    try {
      // Verificar se o usuÃ¡rio atual Ã© admin
      const hasPermission = await this.hasPermission(Permission.GERENCIAR_USUARIOS);
      if (!hasPermission) {
        loggingService.warn('Tentativa nÃ£o autorizada de alterar papel de usuÃ¡rio', {
          targetUserId: userId,
          requestedRole: newRole,
        });
        return false;
      }

      // Atualizar o papel do usuÃ¡rio
      await updateDoc(
        doc(db, this.usersCollection, userId),
        {
          role: newRole,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      // Redefinir permissÃµes para o padrÃ£o do novo papel
      await setDoc(
        doc(db, this.permissionsCollection, userId),
        {
          permissions: ROLE_PERMISSIONS[newRole],
          updatedAt: serverTimestamp(),
        } as any
      );

      // Limpar cache
      this.permissionsCache.delete(userId);

      // loggingService.info('Papel de usuÃ¡rio alterado com sucesso', {
      //   userId,
      //   newRole
      // });

      return true;
    } catch (error) {
      loggingService.error('Erro ao alterar papel do usuÃ¡rio', { error, userId, newRole });
      return false;
    }
  }

  /**
   * Define permissÃµes personalizadas para um usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param permissions PermissÃµes a definir
   * @returns Sucesso da operaÃ§Ã£o
   */
  public async setCustomPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      // Verificar se o usuÃ¡rio atual Ã© admin
      const hasPermission = await this.hasPermission(Permission.GERENCIAR_USUARIOS);
      if (!hasPermission) {
        loggingService.warn('Tentativa nÃ£o autorizada de definir permissÃµes personalizadas', {
          targetUserId: userId,
        });
        return false;
      }

      // Obter permissÃµes atuais para nÃ£o perder configuraÃ§Ãµes
      const currentPermissions = await this.getUserPermissions(userId);

      // Atualizar com novas permissÃµes
      await setDoc(
        doc(db, this.permissionsCollection, userId),
        {
          permissions: [...new Set([...currentPermissions, ...permissions])],
          updatedAt: serverTimestamp(),
        } as any
      );

      // Limpar cache
      this.permissionsCache.delete(userId);

      // loggingService.info('PermissÃµes personalizadas definidas com sucesso', {
      //   userId
      // });

      return true;
    } catch (error) {
      loggingService.error(
        'Erro ao definir permissÃµes personalizadas',
        error instanceof Error ? error : undefined,
        { userId }
      );
      return false;
    }
  }

  /**
   * Verifica recursos de um usuÃ¡rio especÃ­fico
   * @param userId ID do usuÃ¡rio
   * @param permission PermissÃ£o a verificar
   * @returns Se o usuÃ¡rio tem a permissÃ£o
   */
  public async checkUserPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      loggingService.error(
        'Erro ao verificar permissÃ£o de usuÃ¡rio especÃ­fico',
        error instanceof Error ? error : undefined,
        { userId, permission }
      );
      return false;
    }
  }

  /**
   * Reseta as permissÃµes de um usuÃ¡rio para o padrÃ£o do seu papel
   * @param userId ID do usuÃ¡rio
   * @returns Sucesso da operaÃ§Ã£o
   */
  public async resetPermissionsToDefault(userId: string): Promise<boolean> {
    try {
      // Verificar se o usuÃ¡rio atual Ã© admin
      const hasPermission = await this.hasPermission(Permission.GERENCIAR_USUARIOS);
      if (!hasPermission) {
        loggingService.warn('Tentativa nÃ£o autorizada de redefinir permissÃµes', {
          targetUserId: userId,
        });
        return false;
      }

      // Obter o papel atual do usuÃ¡rio
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const userRole = (userData?.role as Role) || Role.CLIENTE;

      // Redefinir para o padrÃ£o do papel
      await setDoc(
        doc(db, this.permissionsCollection, userId),
        {
          permissions: ROLE_PERMISSIONS[userRole],
          updatedAt: serverTimestamp(),
        } as any
      );

      // Limpar cache
      this.permissionsCache.delete(userId);

      // loggingService.info('PermissÃµes redefinidas para o padrÃ£o', {
      //   userId,
      //   role
      // });

      return true;
    } catch (error) {
      loggingService.error(
        'Erro ao redefinir permissÃµes para o padrÃ£o',
        error instanceof Error ? error : undefined,
        { userId }
      );
      return false;
    }
  }

  /**
   * Limpa o cache de permissÃµes para forÃ§ar recarregamento da prÃ³xima vez
   */
  public clearCache(): void {
    this.permissionsCache.clear();
  }

  /**
   * ObtÃ©m o papel do usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @returns Papel do usuÃ¡rio
   */
  public async getUserRoleById(userId: string): Promise<Role> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      // Verificar se o documento de permissÃµes existe
      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se nÃ£o existir, definir como CLIENTE por padrÃ£o
        await this.changeUserRole(userId, Role.CLIENTE);
        return Role.CLIENTE;
      }

      const permissionsData = permissionsDoc.data();
      if (!permissionsData) {
        return Role.CLIENTE;
      }
      return (permissionsData as any).role as Role;
    } catch (error) {
      loggingService.error(
        'Erro ao obter papel do usuÃ¡rio',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Define o papel do usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param role Novo papel
   * @returns ConfirmaÃ§Ã£o da operaÃ§Ã£o
   */
  public async setUserRole(userId: string, role: Role): Promise<void> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      // Verificar se o papel Ã© vÃ¡lido
      if (!Object.values(Role).includes(role)) {
        throw new Error('Papel invÃ¡lido');
      }

      // Obter permissÃµes para o papel
      const permissions = ROLE_PERMISSIONS[role];

      // Atualizar documento de permissÃµes
      await setDoc(doc(db, this.permissionsCollection, userId), {
        role,
        permissions,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Papel do usuÃ¡rio atualizado', { userId, role });
    } catch (error) {
      loggingService.error(
        'Erro ao definir papel do usuÃ¡rio',
        error instanceof Error ? error : undefined,
        { userId, role }
      );
      throw error;
    }
  }

  /**
   * Verifica se o usuÃ¡rio tem mÃºltiplas permissÃµes
   * @param userId ID do usuÃ¡rio
   * @param permissions Lista de permissÃµes a verificar
   * @param requireAll Se Ã© necessÃ¡rio ter todas as permissÃµes (AND) ou apenas uma (OR)
   * @returns Se o usuÃ¡rio tem as permissÃµes
   */
  public async hasPermissions(
    userId: string,
    permissions: Permission[],
    requireAll: boolean = true
  ): Promise<boolean> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      const userData = userDoc.exists() ? (userDoc.data() as any) : {};
      const rawRoles: string[] = Array.isArray(userData?.roles) ? userData.roles : [((userData?.role ?? 'customer') as any)];
      const mappedRoles: Role[] = rawRoles.map((r: any) => r === 'producer' || r === 'produtor' ? Role.GERENTE
        : r === 'courier' || r === 'entregador' ? Role.ENTREGADOR
        : r === 'admin' ? Role.ADMIN
        : r === 'atendente' ? Role.ATENDENTE
        : Role.CLIENTE);
      const basePermissions = Array.from(new Set(mappedRoles.flatMap(r => ROLE_PERMISSIONS[r])));

      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));
      const customData = permissionsDoc.exists() ? (permissionsDoc.data() as any) : undefined;
      const customPermissions: Permission[] = Array.isArray(customData?.permissions) ? (customData.permissions as Permission[]) : [];
      const userPermissions: Permission[] = Array.from(new Set([...basePermissions, ...customPermissions]));

      if (requireAll) {
        // Verificar se tem todas as permissÃµes (AND)
        return permissions.every(p => userPermissions.includes(p));
      } else {
        // Verificar se tem pelo menos uma permissÃ£o (OR)
        return permissions.some(p => userPermissions.includes(p));
      }
    } catch (error) {
      loggingService.error(
        'Erro ao verificar mÃºltiplas permissÃµes',
        error instanceof Error ? error : undefined,
        { userId, permissions, requireAll }
      );
      return false;
    }
  }

  /**
   * Adiciona permissÃµes personalizadas a um usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param permissions PermissÃµes a adicionar
   * @returns ConfirmaÃ§Ã£o da operaÃ§Ã£o
   */
  public async addCustomPermissions(userId: string, permissions: Permission[]): Promise<void> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      // Verificar se as permissÃµes sÃ£o vÃ¡lidas
      permissions.forEach(permission => {
        if (!Object.values(Permission).includes(permission)) {
          throw new Error(`PermissÃ£o invÃ¡lida: ${permission}`);
        }
      });

      // Obter documento de permissÃµes atual
      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se nÃ£o existir, criar com papel CLIENTE
        await this.changeUserRole(userId, Role.CLIENTE);
      }

      // Obter permissÃµes atuais
      const docDataAdd = permissionsDoc.data() as { permissions?: Permission[] } | undefined;
      const currentPermissions: Permission[] = Array.isArray(docDataAdd?.permissions) ? (docDataAdd!.permissions as Permission[]) : ROLE_PERMISSIONS[Role.CLIENTE];

      // Adicionar novas permissÃµes (sem duplicatas)
      const updatedPermissions = [...new Set([...currentPermissions, ...permissions])];

      // Atualizar documento
      await updateDoc(doc(db, this.permissionsCollection, userId), {
        permissions: updatedPermissions,
        customPermissions: true,
        dataAtualizacao: new Date(),
      });

      // loggingService.info('PermissÃµes personalizadas adicionadas', { userId, permissions });
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar permissÃµes personalizadas',
        error instanceof Error ? error : undefined,
        { userId, permissions }
      );
      throw error;
    }
  }

  /**
   * Remove permissÃµes personalizadas de um usuÃ¡rio
   * @param userId ID do usuÃ¡rio
   * @param permissions PermissÃµes a remover
   * @returns ConfirmaÃ§Ã£o da operaÃ§Ã£o
   */
  public async removeCustomPermissions(userId: string, permissions: Permission[]): Promise<void> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      // Obter documento de permissÃµes
      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        return;
      }

      // Obter permissÃµes atuais
      const docDataRem = permissionsDoc.data() as { permissions?: Permission[] } | undefined;
      const currentPermissions: Permission[] = Array.isArray(docDataRem?.permissions) ? (docDataRem!.permissions as Permission[]) : [];

      // Remover permissÃµes
      const updatedPermissions = currentPermissions.filter(p => !permissions.includes(p));

      // Atualizar documento
      await updateDoc(doc(db, this.permissionsCollection, userId), {
        permissions: updatedPermissions,
        customPermissions: true,
        dataAtualizacao: new Date(),
      });

      // loggingService.info('PermissÃµes personalizadas removidas', { userId, permissions });
    } catch (error) {
      loggingService.error(
        'Erro ao remover permissÃµes personalizadas',
        error instanceof Error ? error : undefined,
        { userId, permissions }
      );
      throw error;
    }
  }

  /**
   * Reseta as permissÃµes de um usuÃ¡rio para o padrÃ£o do seu papel
   * @param userId ID do usuÃ¡rio
   * @returns ConfirmaÃ§Ã£o da operaÃ§Ã£o
   */
  public async resetToRoleDefaults(userId: string): Promise<void> {
    try {
      // Validar ID do usuÃ¡rio
      if (!userId) {
        throw new Error('ID do usuÃ¡rio nÃ£o informado');
      }

      // Obter documento de permissÃµes
      const permissionsDoc = await getDoc(doc(db, this.permissionsCollection, userId));

      if (!permissionsDoc.exists()) {
        // Se nÃ£o existir, definir como CLIENTE por padrÃ£o
        await this.changeUserRole(userId, Role.CLIENTE);
        return;
      }

      // Obter papel atual
      const docDataRole = permissionsDoc.data() as { role?: Role } | undefined;
      const role: Role = docDataRole?.role ?? Role.CLIENTE;

      // Obter permissÃµes padrÃ£o para o papel
      const defaultPermissions = ROLE_PERMISSIONS[role];

      // Atualizar documento
      await updateDoc(doc(db, this.permissionsCollection, userId), {
        permissions: defaultPermissions,
        customPermissions: false,
        dataAtualizacao: new Date(),
      });

      // loggingService.info('PermissÃµes resetadas para o padrÃ£o do papel', { userId, role });
    } catch (error) {
      loggingService.error(
        'Erro ao resetar permissÃµes',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * ObtÃ©m todas as permissÃµes disponÃ­veis
   * @returns Lista de permissÃµes
   */
  public getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * ObtÃ©m todos os papÃ©is disponÃ­veis
   * @returns Lista de papÃ©is
   */
  public getAllRoles(): Role[] {
    return Object.values(Role);
  }

  /**
   * ObtÃ©m as permissÃµes padrÃ£o para um papel
   * @param role Papel
   * @returns Lista de permissÃµes
   */
  public getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  public isProducerRole(raw: Role | string | null | undefined): boolean {
    if (!raw) return false;
    const v = String(raw).toLowerCase();
    return v === Role.ADMIN || v === Role.GERENTE || v === 'admin' || v === 'gerente' || v === 'producer' || v === 'produtor';
  }

  public isCourierRole(raw: Role | string | null | undefined): boolean {
    if (!raw) return false;
    const v = String(raw).toLowerCase();
    return v === Role.ENTREGADOR || v === 'courier' || v === 'entregador';
  }

  public getDefaultTabForRole(raw: Role | string | null | undefined): 'Home' | 'Profile' | 'Orders' {
    const isCourier = this.isCourierRole(raw);
    const isProducer = this.isProducerRole(raw);
    return isCourier ? 'Orders' : isProducer ? 'Profile' : 'Home';
  }
}
