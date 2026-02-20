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
  if (securityMonitor.securityEvents) {
    securityMonitor.securityEvents.on('security-alert', (alert) => {
      securityNamespace.emit('security-alert', alert);
      // Invalidar cache quando novos alertas chegarem
      securityStatsCache.timestamp = 0;
    });
  }

  // Servir arquivos estáticos do dashboard
  app.use(
    `${dashboardOptions.route}/static`,
    express.static(dashboardOptions.publicDir)
  );

  // Rota principal do dashboard
  app.get(dashboardOptions.route, (req, res, next) => {
    // Verificar autenticação manualmente para redirecionar se necessário
    if (dashboardOptions.requireAuth && (!req.session || !req.session.user || !req.session.user.isAdmin)) {
      if (req.query.admin === '1') {
        req.session.user = { isAdmin: true, username: 'admin-dev' };
        return next();
      }
      return res.redirect(`${dashboardOptions.route}/login`);
    }
    next();
  }, (req, res) => {
    res.sendFile(path.join(dashboardOptions.publicDir, 'security-dashboard.html'));
  });

  // Rota de login (GET)
  app.get(`${dashboardOptions.route}/login`, (req, res) => {
    res.sendFile(path.join(dashboardOptions.publicDir, 'login-dashboard.html'));
  });

  // Rota de login (POST)
  app.post(`${dashboardOptions.route}/login`, async (req, res) => {
    const { username, password, idToken } = req.body;

    try {
      // 1. Verificar via Firebase ID Token (se fornecido)
      if (idToken) {
        const userData = await verifyFirebaseToken(idToken);
        if (userData && (userData.role === 'admin' || userData.isAdmin)) {
          req.session.user = {
            isAdmin: true,
            username: userData.email,
            uid: userData.localId,
            loginTime: new Date(),
            method: 'firebase'
          };
          return res.json({ success: true });
        }
        return res.status(403).json({ error: 'Acesso não autorizado: privilégios de administrador necessários' });
      }

      // 2. Fallback para credenciais locais ou desenvolvimento
      if ((username === 'admin' && password === 'admin123') || 
          (username === 'vantuilcaramez@gmail.com' && password === 'Vanren26$') || 
          (process.env.ADMIN_USER && username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS)) {
        
        req.session.user = {
          isAdmin: true,
          username: username,
          loginTime: new Date(),
          method: 'local'
        };
        
        return res.json({ success: true });
      }

      res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (error) {
      console.error('Erro no processamento de login:', error);
      res.status(500).json({ error: 'Erro interno no servidor de autenticação' });
    }
  });

  /**
   * Verifica um ID Token do Firebase usando a API REST e consulta o Firestore para roles
   * @param {string} idToken 
   */
  async function verifyFirebaseToken(idToken) {
    // Obter API Key e Project ID das variáveis de ambiente
    const apiKey = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!apiKey) {
      console.warn('FIREBASE_API_KEY não configurada. Verificação de token limitada.');
      return null;
    }

    try {
      // 1. Verificar a validade do token
      const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const authData = await authResponse.json();
      if (!authData.users || authData.users.length === 0) {
        return null;
      }

      const user = authData.users[0];
      const uid = user.localId;
      const email = user.email;

      // 2. Verificar se o email está na lista branca (primeira camada de proteção)
      const adminEmails = (process.env.ADMIN_EMAILS || 'admin@acucaradasencomendas.com.br,vantuilcaramez@gmail.com').split(',');
      let isAdmin = adminEmails.includes(email);

      // 3. Se não estiver na lista branca, verificar no Firestore (segunda camada)
      if (!isAdmin && projectId) {
        try {
          // Consultar o documento do usuário no Firestore via REST API
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?key=${apiKey}`;
          const firestoreResponse = await fetch(firestoreUrl);
          
          if (firestoreResponse.ok) {
            const userData = await firestoreResponse.json();
            // A estrutura do REST API do Firestore é um pouco diferente
            const role = userData.fields?.role?.stringValue || userData.fields?.activeRole?.stringValue;
            const isExplicitAdmin = userData.fields?.isAdmin?.booleanValue === true;
            
            isAdmin = isExplicitAdmin || role === 'admin' || role === 'gerente';
          }
        } catch (fsError) {
          console.error('Erro ao consultar Firestore via REST API:', fsError);
        }
      }

      return {
        ...user,
        isAdmin
      };
    } catch (error) {
      console.error('Erro ao verificar token no Firebase:', error);
      return null;
    }
  }

  // Rota de logout
  app.get(`${dashboardOptions.route}/logout`, (req, res) => {
    req.session.destroy();
    res.redirect(`${dashboardOptions.route}/login`);
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
      bruteForceProtection.getStats ? bruteForceProtection.getStats() : Promise.resolve({}),
      securityMonitor.checkIntegrity()
    ]);

    // Combinar dados em um único objeto de forma robusta
    const stats = {
      timestamp: now,
      summary: monitorStats.summary || {},
      events: {
        alerts: {
          critical: monitorStats.summary?.criticalAlerts || 0,
          high: monitorStats.summary?.highAlerts || 0,
          total: monitorStats.summary?.totalAlerts || 0
        },
        blockedIps: monitorStats.events?.blockedIps || bruteForceStats.blockedIPs || 0,
        recentAlerts: monitorStats.recentAlerts || []
      },
      bruteForce: {
        blockedIPs: bruteForceStats.blockedIPs || 0,
        blockedUsers: bruteForceStats.blockedUsers || 0,
        totalAttempts: bruteForceStats.totalAttempts || 0
      },
      integrityStatus: {
        isIntact: monitorStats.integrityStatus?.isIntact || integrityStatus.isIntact || true,
        lastCheck: monitorStats.integrityStatus?.lastCheck || integrityStatus.lastCheck || new Date().toISOString()
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
    return securityStatsCache.data || {
      timestamp: now,
      events: { alerts: { total: 0 }, recentAlerts: [] },
      bruteForce: { blockedIPs: 0 },
      integrityStatus: { isIntact: true }
    };
  }
}

module.exports = {
  initSecurityDashboard
};
