/**
 * Configurações de segurança para o aplicativo
 * Este arquivo contém configurações relacionadas a proteções de segurança
 * Inclui configurações para proteção contra capturas de tela e marcas d'água dinâmicas
 */

export interface ScreenshotProtectionConfig {
  /** Habilitar proteção contra capturas de tela em todo o aplicativo */
  enabled: boolean;
  /** Borrar conteúdo sensível quando uma captura é detectada */
  blurContent: boolean;
  /** Mostrar aviso quando uma captura é detectada */
  showWarning: boolean;
  /** Texto de aviso personalizado */
  warningText?: string;
  /** Tempo em ms para mostrar o aviso antes de escondê-lo */
  warningDuration: number;
  /** Registrar tentativas de captura no sistema de logs */
  logAttempts: boolean;
  /** Enviar alertas para o servidor quando capturas são detectadas */
  reportToServer: boolean;
  /** Habilitar marca d'água dinâmica */
  enableWatermark?: boolean;
  /** Telas onde a proteção deve ser sempre ativada */
  protectedScreens: string[];
  /** Telas onde a proteção deve ser sempre desativada */
  unprotectedScreens: string[];
}

/**
 * Configurações para marcas d'água dinâmicas
 */
export interface WatermarkConfig {
  /** Habilitar marca d'água dinâmica */
  enabled: boolean;
  /** Opacidade da marca d'água (0-1) */
  opacity: number;
  /** Rotação da marca d'água em graus */
  rotation: number;
  /** Texto padrão da marca d'água */
  defaultText: string;
  /** Incluir data/hora atual na marca d'água */
  includeTimestamp: boolean;
  /** Incluir informações do usuário na marca d'água */
  includeUserInfo: boolean;
  /** Intervalo em ms para atualizar a marca d'água */
  updateInterval?: number;
  /** Habilitar registro de logs para a marca d'água */
  enableLogging?: boolean;
  /** Telas onde a marca d'água está ativada */
  protectedScreens: string[];
}


/**
 * Configuração padrão para proteção contra capturas de tela
 */
export const screenshotProtectionConfig: ScreenshotProtectionConfig = {
  enabled: true,
  blurContent: true,
  showWarning: false,
  warningText: 'Captura de tela detectada. Conteúdo protegido.',
  warningDuration: 2000,
  logAttempts: true,
  reportToServer: true,
  enableWatermark: false,
  protectedScreens: [
    'PaymentScreen',
    'ProfileScreen',
    'OrderDetailsScreen',
    'CheckoutScreen',
    'CardInfoScreen',
    'SecuritySettingsScreen'
  ],
  unprotectedScreens: [
    'HomeScreen',
    'ProductListScreen',
    'AboutScreen',
    'HelpScreen',
  ]
};

/**
 * Configuração padrão para marcas d'água dinâmicas
 */

export const watermarkConfig: WatermarkConfig = {
	enabled: false,
  opacity: 0.12,
  rotation: -45,
  defaultText: 'Dados sensíveis',
  includeTimestamp: true,
  includeUserInfo: true,
  updateInterval: 30000,
  enableLogging: false,
  protectedScreens: [
    'PaymentScreen',
    'ProfileScreen',
    'OrderDetailsScreen',
    'CheckoutScreen',
    'CardInfoScreen',
    'SecuritySettingsScreen'
  ]
};

/**
 * Configurações de segurança para validação de entrada
 */
export const inputValidationConfig = {
  /** Expressão regular para validar senhas fortes */
  strongPasswordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  /** Expressão regular para validar emails */
  emailRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Expressão regular para detectar possíveis ataques XSS */
  xssDetectionRegex: /<script|javascript:|on\w+\s*=|data:|eval\(|document\.cookie|alert\(|window\.|document\.|\[\]\+/gi,
  /** Expressão regular para detectar possíveis injeções SQL */
  sqlInjectionRegex: /('|\s)*(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s/gi,
  /** Tamanho máximo para campos de texto */
  maxTextLength: 500,
  /** Tamanho máximo para campos de comentário */
  maxCommentLength: 1000,
  /** Tempo mínimo entre submissões de formulários (ms) */
  formSubmitThrottle: 2000,
};

/**
 * Configurações de segurança para armazenamento de dados
 */
export const storageSecurityConfig = {
  /** Chaves que devem ser armazenadas com criptografia */
  encryptedKeys: [
    'user_token',
    'refresh_token',
    'payment_info',
    'personal_data',
    'address_data',
    'card_info'
  ],
  /** Tempo de expiração para dados sensíveis em cache (ms) */
  sensitiveCacheExpiration: 1000 * 60 * 15, // 15 minutos
  /** Limpar dados sensíveis ao sair do aplicativo */
  clearOnLogout: true,
  /** Verificar integridade dos dados armazenados */
  validateStorageIntegrity: true,
};

/**
 * Configurações gerais de segurança do aplicativo
 */
export const securityConfig = {
  /** Configurações de proteção contra capturas de tela */
  screenshotProtection: screenshotProtectionConfig,
  /** Configurações de marca d'água */
  watermark: watermarkConfig,
  /** Configurações de validação de entrada */
  inputValidation: inputValidationConfig,
  /** Configurações de segurança de armazenamento */
  storage: storageSecurityConfig,
  /** Tempo de inatividade antes de fazer logout automático (ms) */
  inactivityTimeout: 1000 * 60 * 15, // 15 minutos
  /** Usar HTTPS para todas as requisições */
  enforceHttps: true,
  /** Verificar certificados SSL */
  validateCertificates: true,
  /** Usar cabeçalhos de segurança em requisições */
  securityHeaders: true,
  /** Permitir depuração em ambiente de produção */
  allowProductionDebugging: false,
  /** Registrar eventos de segurança */
  logSecurityEvents: true,
};

export default securityConfig;
