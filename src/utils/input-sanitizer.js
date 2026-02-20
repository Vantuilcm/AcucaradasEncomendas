/**
 * Utilitário para sanitização de inputs do usuário
 * 
 * Este módulo implementa funções para validar e sanitizar entradas do usuário,
 * prevenindo ataques como XSS (Cross-Site Scripting), SQL Injection e outros.
 */

/**
 * Sanitiza uma string para prevenir ataques XSS
 * @param {string} input - String a ser sanitizada
 * @returns {string} String sanitizada
 */
function sanitizeHTML(input) {
  if (!input) return '';
  
  // Converte caracteres especiais em entidades HTML
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza uma string para uso em consultas SQL
 * @param {string} input - String a ser sanitizada
 * @returns {string} String sanitizada
 */
function sanitizeSQL(input) {
  if (!input) return '';
  
  // Remove caracteres que podem ser usados em SQL Injection
  return String(input)
    .replace(/'/g, '')
    .replace(/\\/g, '')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/UNION/gi, '')
    .replace(/SELECT/gi, '')
    .replace(/INSERT/gi, '')
    .replace(/UPDATE/gi, '')
    .replace(/DELETE/gi, '')
    .replace(/DROP/gi, '')
    .replace(/EXEC/gi, '')
    .replace(/EXECUTE/gi, '');
}

/**
 * Sanitiza uma string para uso em URLs
 * @param {string} input - String a ser sanitizada
 * @returns {string} String sanitizada
 */
function sanitizeURL(input) {
  if (!input) return '';
  
  // Codifica caracteres especiais para uso em URLs
  return encodeURIComponent(String(input));
}

/**
 * Valida um endereço de e-mail
 * @param {string} email - Endereço de e-mail a ser validado
 * @returns {boolean} Verdadeiro se o e-mail for válido
 */
function validateEmail(email) {
  if (!email) return false;
  
  // Regex para validação de e-mail
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * Valida um número de telefone brasileiro
 * @param {string} phone - Número de telefone a ser validado
 * @returns {boolean} Verdadeiro se o telefone for válido
 */
function validatePhone(phone) {
  if (!phone) return false;
  
  // Remove caracteres não numéricos
  const cleanPhone = String(phone).replace(/\D/g, '');
  
  // Verifica se o telefone tem entre 10 e 11 dígitos (com DDD)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

/**
 * Valida um CPF
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} Verdadeiro se o CPF for válido
 */
function validateCPF(cpf) {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  cpf = String(cpf).replace(/\D/g, '');
  
  // Verifica se o CPF tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Algoritmo de validação do CPF
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

/**
 * Sanitiza um objeto inteiro, aplicando sanitização a todas as strings
 * @param {Object} obj - Objeto a ser sanitizado
 * @param {Function} sanitizer - Função de sanitização a ser aplicada
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj, sanitizer = sanitizeHTML) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = sanitizer(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value, sanitizer);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

module.exports = {
  sanitizeHTML,
  sanitizeSQL,
  sanitizeURL,
  validateEmail,
  validatePhone,
  validateCPF,
  sanitizeObject,
};