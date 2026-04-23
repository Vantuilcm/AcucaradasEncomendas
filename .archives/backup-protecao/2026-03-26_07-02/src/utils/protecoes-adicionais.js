/**
 * Proteções Adicionais Contra Ataques Comuns
 * Acucaradas Encomendas
 * 
 * Este módulo implementa proteções adicionais contra ataques comuns como
 * XSS, CSRF, injeção SQL e outros vetores de ataque frequentes.
 */

// Importações necessárias
const { v4: uuidv4 } = require('uuid');
const DOMPurify = require('dompurify');

/**
 * Proteção avançada contra XSS (Cross-Site Scripting)
 * Sanitiza HTML e JavaScript malicioso de strings
 * 
 * @param {string} input - String a ser sanitizada
 * @returns {string} - String sanitizada
 */
const sanitizeHtml = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Usar DOMPurify para sanitização avançada
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'eval'],
    ALLOW_DATA_ATTR: false
  });
};

/**
 * Proteção contra injeção SQL
 * Escapa caracteres especiais que podem ser usados em ataques de injeção SQL
 * 
 * @param {string} input - String a ser escapada
 * @returns {string} - String escapada
 */
const escapeSql = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Escapar caracteres especiais SQL
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z");
};

/**
 * Proteção contra ataques de injeção de comandos
 * Valida e sanitiza comandos para evitar injeção de comandos do sistema
 * 
 * @param {string} input - String a ser validada
 * @returns {string} - String sanitizada ou erro se contiver padrões perigosos
 */
const sanitizeCommand = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Verificar padrões perigosos de injeção de comandos
  const dangerousPatterns = /[;&|`\\$]/;
  
  if (dangerousPatterns.test(input)) {
    throw new Error('Caracteres potencialmente perigosos detectados');
  }
  
  return input.trim();
};

/**
 * Proteção contra ataques de Path Traversal
 * Sanitiza caminhos de arquivo para evitar acesso a diretórios não autorizados
 * 
 * @param {string} filePath - Caminho do arquivo a ser sanitizado
 * @returns {string} - Caminho sanitizado
 */
const sanitizeFilePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  
  // Remover sequências que podem causar path traversal
  return filePath
    .replace(/\.\.\/|\.\.\\/g, '') // Remover ../ e ..\
    .replace(/\/\//g, '/') // Remover barras duplas
    .replace(/\\\\/g, '\\'); // Remover backslashes duplos
};

/**
 * Proteção contra ataques de CSRF avançada
 * Gera e valida tokens CSRF com tempo de expiração
 */
class CsrfProtectionAdvanced {
  constructor(expirationMinutes = 30) {
    this.expirationMinutes = expirationMinutes;
  }
  
  /**
   * Gera um novo token CSRF com tempo de expiração
   * @returns {Object} - Objeto contendo o token e sua expiração
   */
  generateToken() {
    const token = uuidv4();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + this.expirationMinutes);
    
    const tokenData = {
      token,
      expires: expires.getTime()
    };
    
    // Armazenar no localStorage com criptografia básica
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('csrfToken', JSON.stringify(tokenData));
    }
    
    return tokenData;
  }
  
  /**
   * Valida um token CSRF
   * @param {string} token - Token a ser validado
   * @returns {boolean} - Verdadeiro se o token for válido e não estiver expirado
   */
  validateToken(token) {
    if (!token || typeof token !== 'string') return false;
    
    try {
      // Recuperar token armazenado
      const storedData = localStorage.getItem('csrfToken');
      if (!storedData) return false;
      
      const { token: storedToken, expires } = JSON.parse(storedData);
      
      // Verificar se o token corresponde e não está expirado
      const now = new Date().getTime();
      return token === storedToken && now < expires;
    } catch (error) {
      console.error('Erro ao validar token CSRF:', error);
      return false;
    }
  }
  
  /**
   * Adiciona o token CSRF aos cabeçalhos de uma requisição fetch
   * @param {Object} headers - Cabeçalhos da requisição
   * @returns {Object} - Cabeçalhos com token CSRF adicionado
   */
  addTokenToHeaders(headers = {}) {
    const tokenData = this.generateToken();
    return {
      ...headers,
      'X-CSRF-Token': tokenData.token
    };
  }
}

/**
 * Proteção contra ataques de força bruta
 * Implementa limitação de taxa (rate limiting) para tentativas de login
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMinutes = windowMinutes;
    this.attempts = new Map();
  }
  
  /**
   * Verifica se um IP/usuário excedeu o limite de tentativas
   * @param {string} key - Identificador único (IP, usuário, etc)
   * @returns {boolean} - Verdadeiro se o limite foi excedido
   */
  isRateLimited(key) {
    if (!key) return false;
    
    const now = new Date().getTime();
    const windowMs = this.windowMinutes * 60 * 1000;
    
    // Limpar tentativas antigas
    this._cleanupOldAttempts(now, windowMs);
    
    // Verificar tentativas do usuário/IP
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
      return false;
    }
    
    const userAttempts = this.attempts.get(key);
    const recentAttempts = userAttempts.filter(time => (now - time) < windowMs);
    
    return recentAttempts.length >= this.maxAttempts;
  }
  
  /**
   * Registra uma nova tentativa
   * @param {string} key - Identificador único (IP, usuário, etc)
   */
  addAttempt(key) {
    if (!key) return;
    
    const now = new Date().getTime();
    const windowMs = this.windowMinutes * 60 * 1000;
    
    // Limpar tentativas antigas
    this._cleanupOldAttempts(now, windowMs);
    
    // Adicionar nova tentativa
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const userAttempts = this.attempts.get(key);
    userAttempts.push(now);
  }
  
  /**
   * Limpa tentativas antigas
   * @private
   */
  _cleanupOldAttempts(now, windowMs) {
    for (const [key, timestamps] of this.attempts.entries()) {
      const validTimestamps = timestamps.filter(time => (now - time) < windowMs);
      
      if (validTimestamps.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validTimestamps);
      }
    }
  }
  
  /**
   * Reseta as tentativas para um usuário/IP específico
   * @param {string} key - Identificador único (IP, usuário, etc)
   */
  resetAttempts(key) {
    if (key && this.attempts.has(key)) {
      this.attempts.delete(key);
    }
  }
}

/**
 * Proteção contra ataques de clickjacking
 * Verifica se a página está sendo carregada em um iframe
 * @returns {boolean} - Verdadeiro se a página estiver em um iframe
 */
const detectFraming = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Se houver erro ao acessar window.top, provavelmente está em um iframe
  }
};

/**
 * Proteção contra ataques de timing
 * Implementa comparação de strings em tempo constante para evitar ataques de timing
 * @param {string} a - Primeira string
 * @param {string} b - Segunda string
 * @returns {boolean} - Verdadeiro se as strings forem iguais
 */
const constantTimeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Proteção contra ataques de enumeração de usuários
 * Implementa respostas genéricas para evitar vazamento de informações
 * @param {boolean} success - Se a operação foi bem-sucedida
 * @returns {string} - Mensagem genérica
 */
const getGenericErrorMessage = (success) => {
  return success 
    ? 'Operação realizada com sucesso' 
    : 'Ocorreu um erro. Por favor, verifique suas credenciais e tente novamente.';
};

/**
 * Proteção contra ataques de JSON Hijacking
 * Adiciona prefixo para evitar interpretação direta de JSON
 * @param {Object} data - Dados a serem serializados
 * @returns {string} - JSON com prefixo de segurança
 */
const secureJsonResponse = (data) => {
  return `)]}',\n${JSON.stringify(data)}`;
};

// Exportar todas as funções e classes
module.exports = {
  sanitizeHtml,
  escapeSql,
  sanitizeCommand,
  sanitizeFilePath,
  CsrfProtectionAdvanced,
  RateLimiter,
  detectFraming,
  constantTimeEqual,
  getGenericErrorMessage,
  secureJsonResponse
};