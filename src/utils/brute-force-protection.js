/**
 * Sistema de Proteção Contra Ataques de Força Bruta
 * 
 * Este módulo implementa proteções contra ataques de força bruta em endpoints de autenticação
 * e outras áreas sensíveis da aplicação, seguindo as recomendações OWASP e NIST.
 */

const redis = require('redis');
const { promisify } = require('util');
const logger = require('./security-logging');

// Configurações
const CONFIG = {
  // Limites de tentativas
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  maxApiAttempts: parseInt(process.env.MAX_API_ATTEMPTS || '100'),
  maxIpAttempts: parseInt(process.env.MAX_IP_ATTEMPTS || '1000'),
  
  // Períodos de bloqueio (em segundos)
  accountLockDuration: parseInt(process.env.ACCOUNT_LOCK_DURATION || '1800'), // 30 minutos
  ipLockDuration: parseInt(process.env.IP_LOCK_DURATION || '3600'), // 1 hora
  escalatingLockDuration: true, // Aumenta o tempo de bloqueio a cada violação
  
  // Configurações de Redis
  redisEnabled: process.env.REDIS_ENABLED === 'true',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
  redisPassword: process.env.REDIS_PASSWORD || '',
  redisPrefix: 'brute_force:',
  
  // Configurações de fallback (quando Redis não está disponível)
  useMemoryStore: true,
  memoryStoreMaxSize: 10000, // Número máximo de entradas no armazenamento em memória
  
  // Configurações de notificação
  notifyOnLock: true,
  notifyAdminOnMultipleLocks: true,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@acucaradasencomendas.com.br',
  
  // Configurações de CAPTCHA
  enableCaptcha: true,
  captchaThreshold: 3, // Número de tentativas antes de exigir CAPTCHA
  
  // Configurações de atraso progressivo
  enableProgressiveDelay: true,
  baseDelay: 100, // ms
  maxDelay: 10000, // 10 segundos
};

// Cliente Redis
let redisClient;
let redisGetAsync;
let redisSetAsync;
let redisDelAsync;
let redisIncrAsync;
let redisExpireAsync;

// Armazenamento em memória (fallback)
let memoryStore = new Map();

/**
 * Inicializa o sistema de proteção contra força bruta
 */
function initialize() {
  if (CONFIG.redisEnabled) {
    try {
      redisClient = redis.createClient({
        host: CONFIG.redisHost,
        port: CONFIG.redisPort,
        password: CONFIG.redisPassword || undefined,
      });
      
      // Promisify Redis methods
      redisGetAsync = promisify(redisClient.get).bind(redisClient);
      redisSetAsync = promisify(redisClient.set).bind(redisClient);
      redisDelAsync = promisify(redisClient.del).bind(redisClient);
      redisIncrAsync = promisify(redisClient.incr).bind(redisClient);
      redisExpireAsync = promisify(redisClient.expire).bind(redisClient);
      
      redisClient.on('error', (err) => {
        logger.error('Redis error in brute force protection', { error: err.message });
      });
      
      logger.info('Brute force protection initialized with Redis storage');
    } catch (error) {
      logger.error('Failed to initialize Redis for brute force protection', { error: error.message });
      logger.info('Falling back to memory storage for brute force protection');
    }
  } else {
    logger.info('Brute force protection initialized with memory storage');
  }
  
  // Iniciar limpeza periódica do armazenamento em memória
  if (CONFIG.useMemoryStore) {
    setInterval(cleanupMemoryStore, 60 * 60 * 1000); // Limpar a cada hora
  }
}

/**
 * Limpa entradas expiradas do armazenamento em memória
 */
function cleanupMemoryStore() {
  const now = Date.now();
  let count = 0;
  
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      memoryStore.delete(key);
      count++;
    }
  }
  
  // Se o armazenamento estiver muito grande, remover as entradas mais antigas
  if (memoryStore.size > CONFIG.memoryStoreMaxSize) {
    const entriesToRemove = memoryStore.size - CONFIG.memoryStoreMaxSize;
    const entries = Array.from(memoryStore.entries());
    entries.sort((a, b) => a[1].lastAttempt - b[1].lastAttempt);
    
    for (let i = 0; i < entriesToRemove; i++) {
      if (i < entries.length) {
        memoryStore.delete(entries[i][0]);
        count++;
      }
    }
  }
  
  logger.info(`Cleaned up ${count} expired entries from memory store`);
}

/**
 * Obtém o valor de uma chave do armazenamento
 * @param {string} key - Chave a ser obtida
 * @returns {Promise<any>} - Valor armazenado
 */
async function getKey(key) {
  const fullKey = CONFIG.redisPrefix + key;
  
  if (CONFIG.redisEnabled && redisClient && redisClient.connected) {
    try {
      const value = await redisGetAsync(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error', { error: error.message, key: fullKey });
      // Fallback para armazenamento em memória
    }
  }
  
  // Usar armazenamento em memória
  if (CONFIG.useMemoryStore) {
    const value = memoryStore.get(fullKey);
    if (value && value.expiresAt && value.expiresAt < Date.now()) {
      memoryStore.delete(fullKey);
      return null;
    }
    return value ? value.data : null;
  }
  
  return null;
}

/**
 * Define o valor de uma chave no armazenamento
 * @param {string} key - Chave a ser definida
 * @param {any} value - Valor a ser armazenado
 * @param {number} ttl - Tempo de vida em segundos
 */
async function setKey(key, value, ttl) {
  const fullKey = CONFIG.redisPrefix + key;
  
  if (CONFIG.redisEnabled && redisClient && redisClient.connected) {
    try {
      await redisSetAsync(fullKey, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      logger.error('Redis set error', { error: error.message, key: fullKey });
      // Fallback para armazenamento em memória
    }
  }
  
  // Usar armazenamento em memória
  if (CONFIG.useMemoryStore) {
    memoryStore.set(fullKey, {
      data: value,
      expiresAt: Date.now() + (ttl * 1000),
      lastAttempt: Date.now()
    });
    return true;
  }
  
  return false;
}

/**
 * Incrementa o contador de uma chave
 * @param {string} key - Chave a ser incrementada
 * @param {number} ttl - Tempo de vida em segundos
 * @returns {Promise<number>} - Novo valor do contador
 */
async function incrementKey(key, ttl) {
  const fullKey = CONFIG.redisPrefix + key;
  
  if (CONFIG.redisEnabled && redisClient && redisClient.connected) {
    try {
      const count = await redisIncrAsync(fullKey);
      if (count === 1) {
        await redisExpireAsync(fullKey, ttl);
      }
      return count;
    } catch (error) {
      logger.error('Redis increment error', { error: error.message, key: fullKey });
      // Fallback para armazenamento em memória
    }
  }
  
  // Usar armazenamento em memória
  if (CONFIG.useMemoryStore) {
    const value = memoryStore.get(fullKey);
    let count = 1;
    
    if (value) {
      count = (value.data || 0) + 1;
    }
    
    memoryStore.set(fullKey, {
      data: count,
      expiresAt: Date.now() + (ttl * 1000),
      lastAttempt: Date.now()
    });
    
    return count;
  }
  
  return 1;
}

/**
 * Remove uma chave do armazenamento
 * @param {string} key - Chave a ser removida
 */
async function deleteKey(key) {
  const fullKey = CONFIG.redisPrefix + key;
  
  if (CONFIG.redisEnabled && redisClient && redisClient.connected) {
    try {
      await redisDelAsync(fullKey);
      return true;
    } catch (error) {
      logger.error('Redis delete error', { error: error.message, key: fullKey });
    }
  }
  
  // Usar armazenamento em memória
  if (CONFIG.useMemoryStore) {
    memoryStore.delete(fullKey);
    return true;
  }
  
  return false;
}

/**
 * Verifica se um usuário está bloqueado
 * @param {string} username - Nome de usuário
 * @returns {Promise<boolean>} - Se o usuário está bloqueado
 */
async function isUserBlocked(username) {
  const key = `user:${username}:blocked`;
  return !!(await getKey(key));
}

/**
 * Verifica se um IP está bloqueado
 * @param {string} ip - Endereço IP
 * @returns {Promise<boolean>} - Se o IP está bloqueado
 */
async function isIpBlocked(ip) {
  const key = `ip:${ip}:blocked`;
  return !!(await getKey(key));
}

/**
 * Bloqueia um usuário
 * @param {string} username - Nome de usuário
 * @param {number} duration - Duração do bloqueio em segundos
 */
async function blockUser(username, duration = CONFIG.accountLockDuration) {
  const key = `user:${username}:blocked`;
  const blockData = {
    blockedAt: new Date().toISOString(),
    reason: 'Excesso de tentativas de login',
    duration: duration
  };
  
  await setKey(key, blockData, duration);
  
  // Registrar evento de bloqueio
  logger.warn('User account blocked due to excessive login attempts', {
    username,
    duration,
    blockedAt: blockData.blockedAt
  });
  
  // Notificar administrador se configurado
  if (CONFIG.notifyOnLock) {
    notifyAdminAboutBlock('user', username, duration, blockData);
  }
}

/**
 * Bloqueia um IP
 * @param {string} ip - Endereço IP
 * @param {number} duration - Duração do bloqueio em segundos
 */
async function blockIp(ip, duration = CONFIG.ipLockDuration) {
  const key = `ip:${ip}:blocked`;
  const blockData = {
    blockedAt: new Date().toISOString(),
    reason: 'Excesso de requisições',
    duration: duration
  };
  
  await setKey(key, blockData, duration);
  
  // Registrar evento de bloqueio
  logger.warn('IP address blocked due to excessive requests', {
    ip,
    duration,
    blockedAt: blockData.blockedAt
  });
  
  // Notificar administrador se configurado
  if (CONFIG.notifyOnLock) {
    notifyAdminAboutBlock('ip', ip, duration, blockData);
  }
}

/**
 * Notifica o administrador sobre um bloqueio
 * @param {string} type - Tipo de bloqueio ('user' ou 'ip')
 * @param {string} identifier - Identificador (username ou IP)
 * @param {number} duration - Duração do bloqueio em segundos
 * @param {Object} blockData - Dados do bloqueio
 */
function notifyAdminAboutBlock(type, identifier, duration, blockData) {
  // Esta função pode ser implementada para enviar emails, SMS, ou outras notificações
  // Aqui apenas registramos no log
  logger.info(`Admin notification: ${type} ${identifier} blocked for ${duration} seconds`, {
    type,
    identifier,
    duration,
    blockData
  });
  
  // Implementação real enviaria um email ou outra notificação
  // Exemplo: emailService.sendEmail(CONFIG.adminEmail, 'Security Alert: Account Blocked', emailBody);
}

/**
 * Registra uma tentativa de login
 * @param {string} username - Nome de usuário
 * @param {string} ip - Endereço IP
 * @param {boolean} success - Se a tentativa foi bem-sucedida
 * @returns {Promise<Object>} - Resultado da verificação
 */
async function recordLoginAttempt(username, ip, success) {
  // Verificar se o usuário ou IP já estão bloqueados
  const userBlocked = await isUserBlocked(username);
  const ipBlocked = await isIpBlocked(ip);
  
  if (userBlocked || ipBlocked) {
    return {
      allowed: false,
      blocked: true,
      reason: userBlocked ? 'user_blocked' : 'ip_blocked',
      requireCaptcha: true
    };
  }
  
  // Se a tentativa foi bem-sucedida, limpar contadores
  if (success) {
    await deleteKey(`user:${username}:attempts`);
    return { allowed: true, blocked: false };
  }
  
  // Incrementar contadores de tentativas
  const userAttemptsKey = `user:${username}:attempts`;
  const ipAttemptsKey = `ip:${ip}:attempts`;
  
  const userAttempts = await incrementKey(userAttemptsKey, CONFIG.accountLockDuration);
  const ipAttempts = await incrementKey(ipAttemptsKey, CONFIG.ipLockDuration);
  
  // Verificar se deve bloquear o usuário
  if (userAttempts >= CONFIG.maxLoginAttempts) {
    // Calcular duração do bloqueio (pode ser escalável)
    let duration = CONFIG.accountLockDuration;
    if (CONFIG.escalatingLockDuration) {
      // Aumentar o tempo de bloqueio com base no número de bloqueios anteriores
      const previousBlocksKey = `user:${username}:block_count`;
      const previousBlocks = await incrementKey(previousBlocksKey, 86400 * 30); // 30 dias
      duration = Math.min(duration * previousBlocks, 86400 * 7); // Máximo de 7 dias
    }
    
    await blockUser(username, duration);
    return {
      allowed: false,
      blocked: true,
      reason: 'max_user_attempts',
      requireCaptcha: true
    };
  }
  
  // Verificar se deve bloquear o IP
  if (ipAttempts >= CONFIG.maxIpAttempts) {
    await blockIp(ip);
    return {
      allowed: false,
      blocked: true,
      reason: 'max_ip_attempts',
      requireCaptcha: true
    };
  }
  
  // Verificar se deve exigir CAPTCHA
  const requireCaptcha = CONFIG.enableCaptcha && userAttempts >= CONFIG.captchaThreshold;
  
  // Calcular atraso progressivo se habilitado
  let delay = 0;
  if (CONFIG.enableProgressiveDelay) {
    delay = Math.min(CONFIG.baseDelay * Math.pow(2, userAttempts - 1), CONFIG.maxDelay);
  }
  
  return {
    allowed: true,
    blocked: false,
    attempts: userAttempts,
    maxAttempts: CONFIG.maxLoginAttempts,
    requireCaptcha,
    delay
  };
}

/**
 * Middleware Express para proteção contra força bruta em rotas de autenticação
 * @param {Object} options - Opções do middleware
 */
function loginProtection(options = {}) {
  const opts = { ...CONFIG, ...options };
  
  return async (req, res, next) => {
    const username = req.body.username || req.body.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      // Verificar se o usuário ou IP já estão bloqueados
      const userBlocked = await isUserBlocked(username);
      const ipBlocked = await isIpBlocked(ip);
      
      if (userBlocked) {
        logger.warn('Blocked login attempt from blocked user', { username, ip });
        return res.status(403).json({
          error: 'Too many failed login attempts. Account temporarily locked.',
          requireCaptcha: true
        });
      }
      
      if (ipBlocked) {
        logger.warn('Blocked login attempt from blocked IP', { username, ip });
        return res.status(403).json({
          error: 'Too many requests from this IP. Please try again later.',
          requireCaptcha: true
        });
      }
      
      // Verificar se CAPTCHA é necessário
      const userAttemptsKey = `user:${username}:attempts`;
      const userAttempts = await getKey(userAttemptsKey) || 0;
      
      if (opts.enableCaptcha && userAttempts >= opts.captchaThreshold) {
        // Verificar se o CAPTCHA foi fornecido e é válido
        const captchaToken = req.body.captchaToken;
        if (!captchaToken) {
          return res.status(400).json({
            error: 'CAPTCHA required',
            requireCaptcha: true
          });
        }
        
        // Aqui você implementaria a verificação do CAPTCHA
        // Por exemplo, com reCAPTCHA:
        // const validCaptcha = await verifyCaptcha(captchaToken);
        // if (!validCaptcha) { ... }
      }
      
      // Aplicar atraso progressivo se habilitado
      if (opts.enableProgressiveDelay && userAttempts > 0) {
        const delay = Math.min(opts.baseDelay * Math.pow(2, userAttempts - 1), opts.maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Armazenar informações na requisição para uso posterior
      req.bruteForce = {
        recordSuccess: async () => {
          await recordLoginAttempt(username, ip, true);
        },
        recordFailure: async () => {
          const result = await recordLoginAttempt(username, ip, false);
          return result;
        }
      };
      
      next();
    } catch (error) {
      logger.error('Error in brute force protection middleware', { error: error.message, username, ip });
      next(); // Fallback: permitir a requisição se o sistema de proteção falhar
    }
  };
}

/**
 * Middleware Express para proteção contra força bruta em rotas de API
 * @param {Object} options - Opções do middleware
 */
function apiRateLimiter(options = {}) {
  const opts = { ...CONFIG, ...options };
  
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const endpoint = req.originalUrl || req.url;
    const method = req.method;
    
    try {
      // Verificar se o IP está bloqueado
      const ipBlocked = await isIpBlocked(ip);
      
      if (ipBlocked) {
        logger.warn('Blocked API request from blocked IP', { ip, endpoint, method });
        return res.status(429).json({
          error: 'Too many requests. Please try again later.'
        });
      }
      
      // Incrementar contador de requisições para este IP
      const ipRequestsKey = `ip:${ip}:api_requests`;
      const ipRequests = await incrementKey(ipRequestsKey, 60); // 1 minuto
      
      // Incrementar contador para este endpoint específico
      const endpointKey = `ip:${ip}:endpoint:${endpoint}:${method}`;
      const endpointRequests = await incrementKey(endpointKey, 60); // 1 minuto
      
      // Verificar limites
      if (ipRequests > opts.maxApiAttempts) {
        await blockIp(ip);
        logger.warn('IP blocked due to excessive API requests', { ip, requests: ipRequests });
        return res.status(429).json({
          error: 'Rate limit exceeded. Your IP has been temporarily blocked.'
        });
      }
      
      // Limite específico por endpoint (pode ser personalizado)
      const endpointLimit = opts.endpointLimits && opts.endpointLimits[endpoint] ? 
        opts.endpointLimits[endpoint] : opts.maxApiAttempts / 2;
      
      if (endpointRequests > endpointLimit) {
        logger.warn('Endpoint rate limit exceeded', { ip, endpoint, requests: endpointRequests });
        return res.status(429).json({
          error: 'Rate limit exceeded for this endpoint. Please try again later.'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error in API rate limiter middleware', { error: error.message, ip, endpoint });
      next(); // Fallback
    }
  };
}

/**
 * Desbloqueia um usuário manualmente
 * @param {string} username - Nome de usuário a ser desbloqueado
 */
async function unblockUser(username) {
  const key = `user:${username}:blocked`;
  await deleteKey(key);
  logger.info('User manually unblocked', { username });
}

/**
 * Desbloqueia um IP manualmente
 * @param {string} ip - Endereço IP a ser desbloqueado
 */
async function unblockIp(ip) {
  const key = `ip:${ip}:blocked`;
  await deleteKey(key);
  logger.info('IP manually unblocked', { ip });
}

/**
 * Obtém estatísticas de bloqueio
 * @returns {Promise<Object>} - Estatísticas de bloqueio
 */
async function getBlockStats() {
  // Esta função seria implementada para fornecer estatísticas sobre bloqueios
  // Exemplo simplificado
  return {
    timestamp: new Date().toISOString(),
    activeUserBlocks: 0, // Seria implementado para contar bloqueios ativos
    activeIpBlocks: 0,   // Seria implementado para contar bloqueios ativos
    totalBlocksLast24h: 0 // Seria implementado para contar bloqueios nas últimas 24h
  };
}

module.exports = {
  initialize,
  isUserBlocked,
  isIpBlocked,
  recordLoginAttempt,
  blockUser,
  blockIp,
  unblockUser,
  unblockIp,
  getBlockStats,
  loginProtection,
  apiRateLimiter
};
