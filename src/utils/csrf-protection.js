/**
 * Utilitário para proteção contra ataques CSRF (Cross-Site Request Forgery)
 * 
 * Este módulo implementa a geração e validação de tokens CSRF para proteger
 * formulários e requisições contra ataques de falsificação de solicitação entre sites.
 */

// Dependências
const crypto = require('crypto');

// Configurações
const CSRF_CONFIG = {
  // Tempo de expiração do token em segundos (30 minutos)
  tokenExpiration: 30 * 60,
  // Tamanho do token em bytes
  tokenSize: 32,
  // Nome do cookie que armazenará o token
  cookieName: 'csrf_token',
  // Nome do campo de formulário que conterá o token
  formFieldName: '_csrf',
  // Nome do cabeçalho HTTP que conterá o token
  headerName: 'X-CSRF-Token',
};

/**
 * Gera um novo token CSRF
 * @returns {Object} Objeto contendo o token e sua data de expiração
 */
function generateToken() {
  // Gera um token aleatório usando crypto
  const token = crypto.randomBytes(CSRF_CONFIG.tokenSize).toString('hex');
  
  // Define a data de expiração
  const expires = Date.now() + (CSRF_CONFIG.tokenExpiration * 1000);
  
  return {
    token,
    expires,
  };
}

/**
 * Cria um cookie com o token CSRF
 * @param {Object} res - Objeto de resposta HTTP
 * @param {string} token - Token CSRF
 * @param {number} expires - Data de expiração em milissegundos
 */
function setTokenCookie(res, token, expires) {
  // Converte a data de expiração para o formato GMT
  const expiresDate = new Date(expires).toUTCString();
  
  // Define o cookie com o token
  res.setHeader('Set-Cookie', `${CSRF_CONFIG.cookieName}=${token}; Expires=${expiresDate}; Path=/; HttpOnly; SameSite=Strict; Secure`);
}

/**
 * Verifica se um token CSRF é válido
 * @param {string} cookieToken - Token armazenado no cookie
 * @param {string} requestToken - Token enviado na requisição
 * @param {number} cookieExpires - Data de expiração do token
 * @returns {boolean} Verdadeiro se o token for válido
 */
function verifyToken(cookieToken, requestToken, cookieExpires) {
  // Verifica se o token existe
  if (!cookieToken || !requestToken) {
    return false;
  }
  
  // Verifica se o token não expirou
  if (Date.now() > cookieExpires) {
    return false;
  }
  
  // Verifica se os tokens são iguais (comparação de tempo constante para evitar timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'hex'),
    Buffer.from(requestToken, 'hex')
  );
}

/**
 * Middleware para proteção CSRF em requisições
 * @param {Object} req - Objeto de requisição HTTP
 * @param {Object} res - Objeto de resposta HTTP
 * @param {Function} next - Função para passar para o próximo middleware
 */
function csrfProtection(req, res, next) {
  // Ignora métodos seguros (GET, HEAD, OPTIONS)
  const safeMethod = /^(GET|HEAD|OPTIONS)$/i.test(req.method);
  if (safeMethod) {
    // Gera um novo token para métodos seguros
    const { token, expires } = generateToken();
    setTokenCookie(res, token, expires);
    // Adiciona o token ao objeto de requisição para uso em templates
    req.csrfToken = token;
    return next();
  }
  
  // Para métodos não seguros, verifica o token
  const cookieToken = req.cookies?.[CSRF_CONFIG.cookieName];
  const cookieExpires = req.cookies?.[`${CSRF_CONFIG.cookieName}_expires`];
  
  // Obtém o token da requisição (do corpo, cabeçalho ou query)
  const requestToken = (
    req.body?.[CSRF_CONFIG.formFieldName] ||
    req.headers?.[CSRF_CONFIG.headerName.toLowerCase()] ||
    req.query?.[CSRF_CONFIG.formFieldName]
  );
  
  // Verifica se o token é válido
  if (!verifyToken(cookieToken, requestToken, cookieExpires)) {
    // Token inválido, retorna erro 403 Forbidden
    res.statusCode = 403;
    res.end('Forbidden - Invalid CSRF Token');
    return;
  }
  
  // Token válido, gera um novo token para a próxima requisição
  const { token, expires } = generateToken();
  setTokenCookie(res, token, expires);
  req.csrfToken = token;
  
  // Continua para o próximo middleware
  next();
}

/**
 * Função auxiliar para gerar o HTML do token CSRF para formulários
 * @param {string} token - Token CSRF
 * @returns {string} HTML do campo oculto com o token
 */
function csrfField(token) {
  return `<input type="hidden" name="${CSRF_CONFIG.formFieldName}" value="${token}">\n`;
}

module.exports = {
  generateToken,
  setTokenCookie,
  verifyToken,
  csrfProtection,
  csrfField,
  CSRF_CONFIG,
};