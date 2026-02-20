/**
 * Configuração de headers de segurança HTTP para o projeto Acucaradas Encomendas
 * 
 * Este módulo implementa headers de segurança recomendados pelo OWASP Top 10
 * para proteger a aplicação contra ataques comuns como XSS, clickjacking, etc.
 */

/**
 * Configuração do Content Security Policy (CSP)
 * Restringe quais recursos podem ser carregados e executados na página
 */
const CSP_CONFIG = {
  // Fontes de scripts permitidas
  'script-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
  // Fontes de estilos permitidas
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
  // Fontes de fontes permitidas
  'font-src': ["'self'", "https://fonts.gstatic.com", "data:"],
  // Fontes de imagens permitidas
  'img-src': ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
  // Fontes de conexão permitidas
  'connect-src': ["'self'", "https://api.acucaradasencomendas.com.br"],
  // Fontes de mídia permitidas
  'media-src': ["'self'"],
  // Fontes de objetos permitidas
  'object-src': ["'none'"],
  // Fontes de frames permitidas
  'frame-src': ["'self'"],
  // Política de fallback
  'default-src': ["'self'"],
  // Reportar violações para esta URL
  'report-uri': ["/api/csp-report"],
};

/**
 * Gera a string do Content Security Policy a partir da configuração
 * @returns {string} String formatada do CSP
 */
function generateCSP() {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Aplica os headers de segurança à resposta HTTP
 * @param {Object} res - Objeto de resposta HTTP
 */
function applySecurityHeaders(res) {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', generateCSP());
  
  // Previne que o navegador faça MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Previne clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Ativa a proteção XSS do navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Força HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Controla quais recursos podem ser pré-carregados ou pré-buscados
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Desativa o cache para conteúdo sensível
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  // Previne que o navegador detecte recursos carregados como aplicativos instaláveis
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Controla quais recursos podem ser incorporados
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Controla quais recursos podem ser carregados
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Controla quais recursos podem ser abertos
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Feature Policy/Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
}

/**
 * Middleware para aplicar headers de segurança em Express
 * @param {Object} req - Objeto de requisição HTTP
 * @param {Object} res - Objeto de resposta HTTP
 * @param {Function} next - Função para passar para o próximo middleware
 */
function securityHeadersMiddleware(req, res, next) {
  applySecurityHeaders(res);
  next();
}

/**
 * Aplica os headers de segurança a um servidor HTTP nativo
 * @param {Object} res - Objeto de resposta HTTP
 */
function applySecurityHeadersToServer(res) {
  applySecurityHeaders(res);
}

module.exports = {
  applySecurityHeaders,
  securityHeadersMiddleware,
  applySecurityHeadersToServer,
  CSP_CONFIG,
  generateCSP,
};
