/**
 * Módulo de Logging e Monitoramento de Segurança
 * 
 * Este módulo implementa funcionalidades para logging e monitoramento de segurança, incluindo:
 * - Logs de tentativas de login
 * - Logs de alterações de permissões
 * - Logs de ações críticas
 * - Detecção de comportamentos suspeitos
 * - Alertas para eventos de segurança
 * 
 * Implementado seguindo as recomendações de segurança OWASP e NIST.
 */

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Configurações
const LOG_DIR = process.env.LOG_DIR || 'logs';
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');
const ERROR_THRESHOLD = 5; // Número de erros antes de disparar alerta
const TIME_WINDOW = 5 * 60 * 1000; // 5 minutos em milissegundos

// Garantir que o diretório de logs exista
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Formato personalizado para logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
});

// Logger de segurança
const securityLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'security-service' },
  transports: [
    new transports.File({ filename: SECURITY_LOG_FILE }),
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        logFormat
      )
    })
  ],
});

// Logger de acesso
const accessLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'access-service' },
  transports: [
    new transports.File({ filename: ACCESS_LOG_FILE }),
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        logFormat
      )
    })
  ],
});

// Cache para detecção de comportamentos suspeitos
const failedLoginAttempts = {};
const suspiciousActivities = {};

/**
 * Registra uma tentativa de login
 * @param {string} userId - ID do usuário
 * @param {string} ip - Endereço IP
 * @param {boolean} success - Se a tentativa foi bem-sucedida
 * @param {Object} metadata - Metadados adicionais
 */
function logLoginAttempt(userId, ip, success, metadata = {}) {
  const logLevel = success ? 'info' : 'warn';
  const message = success ? 'Login bem-sucedido' : 'Falha na tentativa de login';
  
  securityLogger.log({
    level: logLevel,
    message,
    userId,
    ip,
    timestamp: new Date().toISOString(),
    ...metadata
  });
  
  // Rastrear falhas de login para detecção de força bruta
  if (!success) {
    trackFailedLogin(userId, ip);
  } else if (failedLoginAttempts[userId]) {
    // Limpar falhas após login bem-sucedido
    delete failedLoginAttempts[userId];
  }
}

/**
 * Registra uma alteração de permissão
 * @param {string} adminId - ID do administrador que fez a alteração
 * @param {string} targetUserId - ID do usuário alvo
 * @param {string} action - Ação realizada (add, remove, modify)
 * @param {string} permission - Permissão alterada
 * @param {Object} metadata - Metadados adicionais
 */
function logPermissionChange(adminId, targetUserId, action, permission, metadata = {}) {
  securityLogger.info({
    message: 'Alteração de permissão',
    adminId,
    targetUserId,
    action,
    permission,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Registra uma ação crítica no sistema
 * @param {string} userId - ID do usuário
 * @param {string} action - Ação realizada
 * @param {string} resource - Recurso afetado
 * @param {Object} metadata - Metadados adicionais
 */
function logCriticalAction(userId, action, resource, metadata = {}) {
  securityLogger.info({
    message: 'Ação crítica',
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    ...metadata
  });
  
  // Verificar se a ação é suspeita
  checkSuspiciousActivity(userId, action, resource);
}

/**
 * Registra um acesso a um recurso
 * @param {string} userId - ID do usuário
 * @param {string} resource - Recurso acessado
 * @param {string} method - Método HTTP
 * @param {string} ip - Endereço IP
 * @param {Object} metadata - Metadados adicionais
 */
function logResourceAccess(userId, resource, method, ip, metadata = {}) {
  accessLogger.info({
    message: 'Acesso a recurso',
    userId,
    resource,
    method,
    ip,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Registra um erro de segurança
 * @param {string} type - Tipo de erro
 * @param {string} message - Mensagem de erro
 * @param {Object} metadata - Metadados adicionais
 */
function logSecurityError(type, message, metadata = {}) {
  securityLogger.error({
    message: `Erro de segurança: ${message}`,
    type,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Rastreia falhas de login para detecção de força bruta
 * @param {string} userId - ID do usuário
 * @param {string} ip - Endereço IP
 */
function trackFailedLogin(userId, ip) {
  const key = `${userId}:${ip}`;
  const now = Date.now();
  
  if (!failedLoginAttempts[key]) {
    failedLoginAttempts[key] = {
      count: 0,
      firstAttempt: now,
      attempts: []
    };
  }
  
  // Adicionar tentativa
  failedLoginAttempts[key].count += 1;
  failedLoginAttempts[key].attempts.push(now);
  
  // Limpar tentativas antigas (fora da janela de tempo)
  failedLoginAttempts[key].attempts = failedLoginAttempts[key].attempts.filter(
    time => now - time < TIME_WINDOW
  );
  
  // Atualizar contagem com base nas tentativas válidas
  failedLoginAttempts[key].count = failedLoginAttempts[key].attempts.length;
  
  // Verificar se excedeu o limite
  if (failedLoginAttempts[key].count >= ERROR_THRESHOLD) {
    triggerBruteForceAlert(userId, ip, failedLoginAttempts[key]);
  }
}

/**
 * Verifica se uma atividade é suspeita
 * @param {string} userId - ID do usuário
 * @param {string} action - Ação realizada
 * @param {string} resource - Recurso afetado
 */
function checkSuspiciousActivity(userId, action, resource) {
  const now = Date.now();
  
  if (!suspiciousActivities[userId]) {
    suspiciousActivities[userId] = {
      actions: [],
      resources: new Set()
    };
  }
  
  // Adicionar ação
  suspiciousActivities[userId].actions.push({
    action,
    resource,
    timestamp: now
  });
  
  // Adicionar recurso
  suspiciousActivities[userId].resources.add(resource);
  
  // Limpar ações antigas (fora da janela de tempo)
  suspiciousActivities[userId].actions = suspiciousActivities[userId].actions.filter(
    entry => now - entry.timestamp < TIME_WINDOW
  );
  
  // Atualizar recursos com base nas ações válidas
  suspiciousActivities[userId].resources = new Set(
    suspiciousActivities[userId].actions.map(entry => entry.resource)
  );
  
  // Verificar padrões suspeitos
  const actionCount = suspiciousActivities[userId].actions.length;
  const resourceCount = suspiciousActivities[userId].resources.size;
  
  // Muitas ações em pouco tempo
  if (actionCount >= 20) {
    triggerSuspiciousActivityAlert(userId, 'high_frequency', suspiciousActivities[userId]);
  }
  
  // Muitos recursos diferentes em pouco tempo
  if (resourceCount >= 10) {
    triggerSuspiciousActivityAlert(userId, 'resource_scanning', suspiciousActivities[userId]);
  }
}

/**
 * Dispara um alerta de força bruta
 * @param {string} userId - ID do usuário
 * @param {string} ip - Endereço IP
 * @param {Object} data - Dados da detecção
 */
function triggerBruteForceAlert(userId, ip, data) {
  const alert = {
    type: 'BRUTE_FORCE_ATTEMPT',
    severity: 'HIGH',
    userId,
    ip,
    attemptCount: data.count,
    timeWindow: `${TIME_WINDOW / 1000 / 60} minutes`,
    timestamp: new Date().toISOString()
  };
  
  securityLogger.warn({
    message: 'ALERTA: Possível ataque de força bruta detectado',
    ...alert
  });
  
  // Aqui você pode adicionar código para enviar notificações
  // por email, SMS, webhook, etc.
  sendSecurityAlert(alert);
}

/**
 * Dispara um alerta de atividade suspeita
 * @param {string} userId - ID do usuário
 * @param {string} pattern - Padrão detectado
 * @param {Object} data - Dados da detecção
 */
function triggerSuspiciousActivityAlert(userId, pattern, data) {
  const alert = {
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
    userId,
    pattern,
    actionCount: data.actions.length,
    resourceCount: data.resources.size,
    timestamp: new Date().toISOString()
  };
  
  securityLogger.warn({
    message: `ALERTA: Atividade suspeita detectada (${pattern})`,
    ...alert
  });
  
  // Aqui você pode adicionar código para enviar notificações
  sendSecurityAlert(alert);
}

/**
 * Envia um alerta de segurança
 * @param {Object} alert - Dados do alerta
 */
function sendSecurityAlert(alert) {
  securityLogger.warn({
    message: 'ALERTA DE SEGURANÇA',
    ...alert,
    timestamp: new Date().toISOString()
  });
}

/**
 * Middleware para logging de requisições HTTP
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 * @param {Function} next - Função next
 */
function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user ? req.user.id : 'anonymous';
  
  // Registrar início da requisição
  accessLogger.info({
    message: 'Requisição recebida',
    method: req.method,
    url: req.url,
    ip,
    userId,
    userAgent: req.headers['user-agent']
  });
  
  // Interceptar finalização da resposta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    accessLogger.log({
      level,
      message: 'Requisição finalizada',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userId
    });
    
    // Registrar erros de segurança
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityLogger.warn({
        message: 'Acesso não autorizado',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        ip,
        userId
      });
    }
  });
  
  next();
}

module.exports = {
  logLoginAttempt,
  logPermissionChange,
  logCriticalAction,
  logResourceAccess,
  logSecurityError,
  requestLoggingMiddleware,
  securityLogger,
  accessLogger
};