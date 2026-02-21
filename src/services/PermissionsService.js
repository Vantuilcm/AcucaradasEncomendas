import api from '../api/api';
import { getLocalStorage, setLocalStorage } from '../utils/localStorage';

// Constantes de papéis (roles)
export const ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  ATENDENTE: 'atendente',
  CLIENTE: 'cliente',
  ENTREGADOR: 'entregador',
};

// Constantes de permissões
export const PERMISSIONS = {
  // Pedidos
  VIEW_ALL_ORDERS: 'view_all_orders',
  VIEW_OWN_ORDERS: 'view_own_orders',
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER: 'update_order',
  CANCEL_ORDER: 'cancel_order',
  ASSIGN_ORDER: 'assign_order',

  // Produtos
  VIEW_PRODUCTS: 'view_products',
  CREATE_PRODUCT: 'create_product',
  UPDATE_PRODUCT: 'update_product',
  DELETE_PRODUCT: 'delete_product',

  // Clientes
  VIEW_ALL_CUSTOMERS: 'view_all_customers',
  UPDATE_ANY_CUSTOMER: 'update_any_customer',

  // Entregas
  MANAGE_DELIVERIES: 'manage_deliveries',
  VIEW_OWN_DELIVERIES: 'view_own_deliveries',

  // Relatórios
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',

  // Configurações
  MANAGE_SETTINGS: 'manage_settings',

  // Usuários
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
};

// Mapeamento padrão de permissões por papel (role)
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.GERENTE]: [
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.ASSIGN_ORDER,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.CREATE_PRODUCT,
    PERMISSIONS.UPDATE_PRODUCT,
    PERMISSIONS.VIEW_ALL_CUSTOMERS,
    PERMISSIONS.MANAGE_DELIVERIES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_USERS,
  ],
  [ROLES.ATENDENTE]: [
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.UPDATE_ORDER,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_ALL_CUSTOMERS,
  ],
  [ROLES.CLIENTE]: [
    PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.CREATE_ORDER,
    PERMISSIONS.CANCEL_ORDER,
    PERMISSIONS.VIEW_PRODUCTS,
  ],
  [ROLES.ENTREGADOR]: [PERMISSIONS.VIEW_OWN_DELIVERIES, PERMISSIONS.VIEW_PRODUCTS],
};

// Chaves para armazenamento no localStorage
const USER_ROLES_KEY = 'user_roles';
const USER_PERMISSIONS_KEY = 'user_permissions';

class PermissionsService {
  constructor() {
    this.userRoles = [];
    this.userPermissions = [];
    this.isInitialized = false;
  }

  /**
   * Inicializa o serviço de permissões carregando dados do localStorage ou API
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Tenta carregar do localStorage primeiro
      const cachedRoles = getLocalStorage(USER_ROLES_KEY);
      const cachedPermissions = getLocalStorage(USER_PERMISSIONS_KEY);

      if (cachedRoles && cachedPermissions) {
        this.userRoles = JSON.parse(cachedRoles);
        this.userPermissions = JSON.parse(cachedPermissions);
      } else {
        // Carrega do servidor se não estiver em cache
        await this.fetchUserPermissions();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Erro ao inicializar serviço de permissões:', error);
      throw error;
    }
  }

  /**
   * Busca as permissões do usuário na API
   * @returns {Promise<void>}
   */
  async fetchUserPermissions() {
    try {
      const response = await api.get('/auth/permissions');
      const { roles, permissions } = response.data;

      this.userRoles = roles;
      this.userPermissions = permissions;

      // Salva no cache
      setLocalStorage(USER_ROLES_KEY, JSON.stringify(roles));
      setLocalStorage(USER_PERMISSIONS_KEY, JSON.stringify(permissions));
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário possui determinada permissão
   * @param {string} permission Permissão a ser verificada
   * @returns {boolean}
   */
  hasPermission(permission) {
    if (!this.isInitialized) {
      console.warn('PermissionsService não inicializado. Chamando initialize()');
      this.initialize();
      return false;
    }

    return this.userPermissions.includes(permission);
  }

  /**
   * Verifica se o usuário possui ao menos uma das permissões informadas
   * @param {Array<string>} permissions Lista de permissões
   * @returns {boolean}
   */
  hasAnyPermission(permissions) {
    if (!this.isInitialized) {
      console.warn('PermissionsService não inicializado. Chamando initialize()');
      this.initialize();
      return false;
    }

    return permissions.some(permission => this.userPermissions.includes(permission));
  }

  /**
   * Verifica se o usuário possui todas as permissões informadas
   * @param {Array<string>} permissions Lista de permissões
   * @returns {boolean}
   */
  hasAllPermissions(permissions) {
    if (!this.isInitialized) {
      console.warn('PermissionsService não inicializado. Chamando initialize()');
      this.initialize();
      return false;
    }

    return permissions.every(permission => this.userPermissions.includes(permission));
  }

  /**
   * Verifica se o usuário possui determinado papel (role)
   * @param {string} role Papel a ser verificado
   * @returns {boolean}
   */
  hasRole(role) {
    if (!this.isInitialized) {
      console.warn('PermissionsService não inicializado. Chamando initialize()');
      this.initialize();
      return false;
    }

    return this.userRoles.includes(role);
  }

  /**
   * Obtém todos os papéis do usuário
   * @returns {Array<string>}
   */
  getUserRoles() {
    return [...this.userRoles];
  }

  /**
   * Obtém todas as permissões do usuário
   * @returns {Array<string>}
   */
  getUserPermissions() {
    return [...this.userPermissions];
  }

  /**
   * Limpa o cache de papéis e permissões
   */
  clearCache() {
    localStorage.removeItem(USER_ROLES_KEY);
    localStorage.removeItem(USER_PERMISSIONS_KEY);
    this.userRoles = [];
    this.userPermissions = [];
    this.isInitialized = false;
  }

  /**
   * Obtém todas as permissões disponíveis para um determinado papel
   * @param {string} role Nome do papel
   * @returns {Array<string>} Lista de permissões
   */
  getPermissionsForRole(role) {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Obtém todos os papéis disponíveis no sistema
   * @returns {Object} Objeto com os papéis
   */
  getAllRoles() {
    return ROLES;
  }

  /**
   * Obtém todas as permissões disponíveis no sistema
   * @returns {Object} Objeto com as permissões
   */
  getAllPermissions() {
    return PERMISSIONS;
  }
}

export default new PermissionsService();
