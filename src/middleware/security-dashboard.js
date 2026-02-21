/**
 * Middleware para integração do Dashboard de Segurança
 * Este middleware fornece endpoints para o dashboard de segurança e gerencia
 * a comunicação em tempo real via Socket.IO
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');

// Utilitários de segurança
const securityMonitor = require('../../scripts/security-monitor');
const bruteForceProtection = require('../utils/brute-force-protection');

// Cache de estatísticas para reduzir carga no servidor
let securityStatsCache = {
  timestamp: 0,
  data: null,
  ttl: 10000 // 10 segundos
};

/**
 * Inicializa o middleware do dashboard de segurança
 * @param {Object} app - Instância do Express
 * @param {Object} server - Servidor HTTP
 * @param {Object} options - Opções de configuração
 */
function initSecurityDashboard(app, server, options = {}) {
  const dashboardOptions = {
    route: options.route || '/security-dashboard',
    apiRoute: options.apiRoute || '/api/security',
    publicDir: options.publicDir || path.join(__dirname, '../../scripts/public'),
    requireAuth: options.requireAuth !== false, // Por padrão, requer autenticação
    authMiddleware: options.authMiddleware || defaultAuthMiddleware,
    ...options
  };

  // Configurar Socket.IO para comunicação em tempo real
  const io = socketIo(server, {
    path: `${dashboardOptions.route}/socket.io`,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Namespace específico para o dashboard de segurança
  const securityNamespace = io.of('/security-dashboard');

  // Middleware de autenticação para Socket.IO
  securityNamespace.use((socket, next) => {
    // Verificar token de autenticação
    const token = socket.handshake.auth.token;
    if (dashboardOptions.requireAuth && !isValidToken(token)) {
      return next(new Error('Autenticação necessária'));
    }
    next();
  });

  // Gerenciar conexões Socket.IO
  securityNamespace.on('connection', (socket) => {
    console.log('Cliente conectado ao dashboard de segurança');

    // Enviar estatísticas iniciais
    getSecurityStats().then(stats => {
      socket.emit('security-stats', stats);
    });

    // Responder a solicitações de estatísticas
    socket.on('get-security-stats', () => {
      getSecurityStats().then(stats => {
        socket.emit('security-stats', stats);
      });
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log('Cliente desconectado do dashboard de segurança');
    });
  });

  // Integrar com o monitor de segurança para enviar alertas em tempo real
  securityMonitor.on('security-alert', (alert) => {
    securityNamespace.emit('security-alert', alert);
    // Invalidar cache quando novos alertas chegarem
    securityStatsCache.timestamp = 0;
  });

  // Servir arquivos estáticos do dashboard
  app.use(
    `${dashboardOptions.route}/static`,
    express.static(dashboardOptions.publicDir)
  );

  // Rota principal do dashboard
  app.get(dashboardOptions.route, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), (req, res) => {
    res.sendFile(path.join(dashboardOptions.publicDir, 'security-dashboard.html'));
  });

  // API para obter estatísticas de segurança
  app.get(`${dashboardOptions.apiRoute}/stats`, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), async (req, res) => {
    try {
      const stats = await getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas de segurança:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas de segurança' });
    }
  });

  // API para obter lista de arquivos críticos monitorados
  app.get(`${dashboardOptions.apiRoute}/monitored-files`, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), (req, res) => {
    try {
      const files = securityMonitor.getMonitoredFiles();
      res.json(files);
    } catch (error) {
      console.error('Erro ao obter arquivos monitorados:', error);
      res.status(500).json({ error: 'Erro ao obter arquivos monitorados' });
    }
  });

  // API para obter padrões de detecção
  app.get(`${dashboardOptions.apiRoute}/detection-patterns`, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), (req, res) => {
    try {
      const patterns = securityMonitor.getDetectionPatterns();
      res.json(patterns);
    } catch (error) {
      console.error('Erro ao obter padrões de detecção:', error);
      res.status(500).json({ error: 'Erro ao obter padrões de detecção' });
    }
  });

  // API para obter alertas recentes
  app.get(`${dashboardOptions.apiRoute}/recent-alerts`, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), (req, res) => {
    try {
      const alerts = securityMonitor.getRecentAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Erro ao obter alertas recentes:', error);
      res.status(500).json({ error: 'Erro ao obter alertas recentes' });
    }
  });

  // API para obter status de proteção contra força bruta
  app.get(`${dashboardOptions.apiRoute}/brute-force-status`, dashboardOptions.requireAuth ? dashboardOptions.authMiddleware : (req, res, next) => next(), (req, res) => {
    try {
      const status = bruteForceProtection.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status de proteção contra força bruta:', error);
      res.status(500).json({ error: 'Erro ao obter status de proteção contra força bruta' });
    }
  });

  console.log(`Dashboard de segurança inicializado em ${dashboardOptions.route}`);
  return { io, securityNamespace };
}

/**
 * Middleware de autenticação padrão
 * Substitua esta função com sua própria implementação de autenticação
 */
function defaultAuthMiddleware(req, res, next) {
  // Verificar se o usuário está autenticado e tem permissões de administrador
  if (!req.session || !req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  next();
}

/**
 * Verificar se um token é válido
 * Substitua esta função com sua própria implementação de verificação de token
 */
function isValidToken(token) {
  // Implementação simplificada - substitua com sua lógica de verificação de token
  return token && token.length > 20;
}

/**
 * Obter estatísticas de segurança
 * Usa cache para reduzir a carga no servidor
 */
async function getSecurityStats() {
  const now = Date.now();
  
  // Retornar do cache se ainda for válido
  if (securityStatsCache.data && (now - securityStatsCache.timestamp) < securityStatsCache.ttl) {
    return securityStatsCache.data;
  }

  try {
    // Coletar dados de várias fontes
    const [monitorStats, bruteForceStats, integrityStatus] = await Promise.all([
      securityMonitor.getStats(),
      bruteForceProtection.getStats(),
      securityMonitor.checkIntegrity()
    ]);

    // Combinar dados em um único objeto
    const stats = {
      timestamp: now,
      events: {
        alerts: {
          critical: monitorStats.alerts.critical || 0,
          high: monitorStats.alerts.high || 0,
          warning: monitorStats.alerts.warning || 0,
          info: monitorStats.alerts.info || 0,
          total: monitorStats.alerts.total || 0
        },
        patterns: monitorStats.patterns || {},
        recentAlerts: monitorStats.recentAlerts || []
      },
      bruteForce: {
        blockedIPs: bruteForceStats.blockedIPs || 0,
        blockedUsers: bruteForceStats.blockedUsers || 0,
        totalAttempts: bruteForceStats.totalAttempts || 0,
        recentAttempts: bruteForceStats.recentAttempts || []
      },
      integrityStatus: {
        lastCheck: integrityStatus.lastCheck || null,
        status: integrityStatus.status || 'unknown',
        fileCount: integrityStatus.fileCount || 0,
        violations: integrityStatus.violations || []
      }
    };

    // Atualizar cache
    securityStatsCache = {
      timestamp: now,
      data: stats,
      ttl: securityStatsCache.ttl
    };

    return stats;
  } catch (error) {
    console.error('Erro ao coletar estatísticas de segurança:', error);
    // Se houver erro, retornar cache mesmo que expirado, ou um objeto vazio
    return securityStatsCache.data || {
      timestamp: now,
      events: { alerts: { critical: 0, high: 0, warning: 0, info: 0, total: 0 }, patterns: {}, recentAlerts: [] },
      bruteForce: { blockedIPs: 0, blockedUsers: 0, totalAttempts: 0, recentAttempts: [] },
      integrityStatus: { lastCheck: null, status: 'error', fileCount: 0, violations: [] }
    };
  }
}

module.exports = {
  initSecurityDashboard
};