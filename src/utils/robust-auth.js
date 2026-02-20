/**
 * Módulo de Autenticação Robusta
 * 
 * Este módulo implementa funcionalidades de autenticação robusta, incluindo:
 * - Multi-Factor Authentication (MFA)
 * - Tokens JWT com tempo de expiração curto
 * - Políticas de senhas fortes
 * 
 * Implementado seguindo as recomendações de segurança OWASP e NIST.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const LoggingService = require('../services/LoggingService');

const logger = LoggingService.getInstance();

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-deve-ser-definida-no-env';
const JWT_EXPIRATION = '15m'; // 15 minutos
const JWT_REFRESH_EXPIRATION = '7d'; // 7 dias
const SALT_ROUNDS = 12;

/**
 * Verifica se uma senha atende aos requisitos de segurança
 * @param {string} password - Senha a ser verificada
 * @returns {Object} Resultado da verificação com detalhes
 */
function validatePasswordStrength(password) {
  if (!password) {
    return {
      valid: false,
      message: 'Senha não pode ser vazia',
      details: {}
    };
  }

  const minLength = 10;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const details = {
    length: password.length >= minLength,
    upperCase: hasUpperCase,
    lowerCase: hasLowerCase,
    numbers: hasNumbers,
    specialChars: hasSpecialChars
  };
  
  const valid = Object.values(details).every(Boolean);
  
  let message = valid 
    ? 'Senha atende aos requisitos de segurança' 
    : 'Senha não atende aos requisitos de segurança';
  
  return {
    valid,
    message,
    details
  };
}

/**
 * Gera um hash seguro para uma senha
 * @param {string} password - Senha a ser hasheada
 * @returns {Promise<string>} Hash da senha
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica se uma senha corresponde ao hash armazenado
 * @param {string} password - Senha a ser verificada
 * @param {string} hash - Hash armazenado
 * @returns {Promise<boolean>} Resultado da verificação
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Gera um token JWT com tempo de expiração curto
 * @param {Object} payload - Dados a serem incluídos no token
 * @returns {string} Token JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Gera um token de atualização (refresh token) com tempo de expiração mais longo
 * @param {Object} payload - Dados a serem incluídos no token
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRATION });
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT a ser verificado
 * @returns {Object|null} Payload decodificado ou null se inválido
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Erro ao verificar token:', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Gera um segredo para MFA (Google Authenticator)
 * @param {string} email - Email do usuário para o qual o segredo será gerado
 * @returns {Object} Segredo e URL do QR code
 */
async function generateMfaSecret(email) {
  const secret = speakeasy.generateSecret({
    issuer: 'Açucaradas Encomendas',
    name: `Açucaradas Encomendas (${email})`,
    length: 20
  });

  try {
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    return {
      secret: secret.base32,
      qrCodeUrl
    };
  } catch (error) {
    logger.error('Erro ao gerar QR code:', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Não foi possível gerar o QR code para MFA');
  }
}

/**
 * Verifica um token de autenticação de dois fatores
 * @param {string} token - Token fornecido pelo usuário
 * @param {string} secret - Chave secreta do usuário
 * @returns {boolean} Resultado da verificação
 */
function verifyMfaToken(token, secret) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1 // Permite uma janela de 30 segundos antes/depois
  });
}

/**
 * Middleware para verificar autenticação via JWT
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 * @param {Function} next - Função next
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no token' });
  }
  
  const [scheme, token] = parts;
  
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
  
  req.user = decoded;
  return next();
}

/**
 * Middleware para verificar se o usuário tem MFA ativado e validado
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 * @param {Function} next - Função next
 */
function mfaRequiredMiddleware(req, res, next) {
  // Verificar se o usuário tem MFA ativado
  if (!req.user.mfaVerified) {
    return res.status(403).json({ 
      error: 'Autenticação de dois fatores necessária',
      requireMfa: true
    });
  }
  
  return next();
}

/**
 * Gera um token anti-CSRF para proteção adicional
 * @returns {string} Token anti-CSRF
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  generateMfaSecret,
  generateQrCode,
  verifyMfaToken,
  authMiddleware,
  mfaRequiredMiddleware,
  generateCsrfToken
};