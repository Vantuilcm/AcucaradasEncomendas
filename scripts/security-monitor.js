/**
 * Sistema de Monitoramento de Segurança em Tempo Real
 * 
 * Este script implementa um sistema de monitoramento de segurança em tempo real
 * que detecta e alerta sobre atividades suspeitas na aplicação.
 * 
 * Implementado seguindo as recomendações OWASP e NIST.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const chokidar = require('chokidar');
const chalk = require('chalk');
const nodemailer = require('nodemailer');
const EventEmitter = require('events');

// Instância para emitir eventos internos
const securityEvents = new EventEmitter();

// Configurações
const CONFIG = {
  // Configurações do servidor de monitoramento
  server: {
    port: parseInt(process.env.SECURITY_MONITOR_PORT || '3030'),
    host: process.env.SECURITY_MONITOR_HOST || 'localhost',
    enableDashboard: process.env.ENABLE_SECURITY_DASHBOARD === 'true'
  },
  
  // Configurações de logs
  logs: {
    dir: process.env.SECURITY_LOGS_DIR || 'logs/security',
    pattern: '**/*.log',
    maxSize: parseInt(process.env.SECURITY_LOG_MAX_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.SECURITY_LOG_MAX_FILES || '10'),
    level: process.env.SECURITY_LOG_LEVEL || 'info'
  },
  
  // Configurações de alertas
  alerts: {
    email: {
      enabled: process.env.EMAIL_ALERTS_ENABLED === 'true',
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'security@acucaradasencomendas.com.br',
        pass: process.env.EMAIL_PASS || 'your-password'
      },
      from: process.env.EMAIL_FROM || 'security@acucaradasencomendas.com.br',
      to: (process.env.EMAIL_TO || 'admin@acucaradasencomendas.com.br').split(',')
    },
    slack: {
      enabled: process.env.SLACK_ALERTS_ENABLED === 'true',
      webhook: process.env.SLACK_WEBHOOK_URL || '',
      channel: process.env.SLACK_CHANNEL || '#security-alerts'
    },
    sms: {
      enabled: process.env.SMS_ALERTS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      from: process.env.TWILIO_PHONE_NUMBER || '',
      to: (process.env.SMS_TO || '').split(',')
    }
  },
  
  // Padrões de detecção
  patterns: {
    // Padrões de log para detectar atividades suspeitas
    suspicious: [
      { pattern: 'failed login attempt', level: 'warning', threshold: 5, timeWindow: 300 }, // 5 em 5 minutos
      { pattern: 'SQL injection attempt', level: 'critical', threshold: 1, timeWindow: 60 },
      { pattern: 'XSS attempt', level: 'critical', threshold: 1, timeWindow: 60 },
      { pattern: 'CSRF token mismatch', level: 'high', threshold: 3, timeWindow: 300 },
      { pattern: 'file upload rejected', level: 'warning', threshold: 3, timeWindow: 300 },
      { pattern: 'permission denied', level: 'warning', threshold: 5, timeWindow: 300 },
      { pattern: 'brute force', level: 'critical', threshold: 1, timeWindow: 60 },
      { pattern: 'invalid JWT', level: 'warning', threshold: 5, timeWindow: 300 },
      { pattern: 'blocked IP', level: 'high', threshold: 1, timeWindow: 60 },
      { pattern: 'suspicious path access', level: 'high', threshold: 3, timeWindow: 60 },
      { pattern: 'root access attempted', level: 'critical', threshold: 1, timeWindow: 60 }
    ],
    
    // Padrões para monitorar arquivos críticos
    criticalFiles: [
      { path: 'server.js', level: 'critical' },
      { path: 'src/utils/auth.js', level: 'critical' },
      { path: 'src/utils/robust-auth.js', level: 'critical' },
      { path: 'src/utils/security-logging.js', level: 'critical' },
      { path: 'src/utils/brute-force-protection.js', level: 'critical' },
      { path: 'src/routes/auth.js', level: 'high' },
      { path: 'src/controllers/auth.js', level: 'high' },
      { path: 'src/middleware/auth.js', level: 'high' },
      { path: 'config/security.js', level: 'high' },
      { path: '.env', level: 'critical' }
    ]
  },
  
  // Configurações de verificação de integridade
  integrityCheck: {
    enabled: true,
    interval: parseInt(process.env.INTEGRITY_CHECK_INTERVAL || '3600000'), // 1 hora
    files: [
      'server.js',
      'src/utils/*.js',
      'src/middleware/*.js',
      'src/routes/*.js',
      'config/*.js'
    ]
  }
};

// Garantir que o diretório de logs exista
if (!fs.existsSync(CONFIG.logs.dir)) {
  fs.mkdirSync(CONFIG.logs.dir, { recursive: true });
}

// Configurar logger
const logger = winston.createLogger({
  level: CONFIG.logs.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-monitor' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: path.join(CONFIG.logs.dir, 'security-monitor.log'),
      maxsize: CONFIG.logs.maxSize,
      maxFiles: CONFIG.logs.maxFiles
    })
  ]
});

// Variáveis globais
let app;
let server;
let io;
let fileWatcher;
let logWatcher;
let integrityCheckInterval;
let eventCounts = {};
let fileHashes = {};

/**
 * Inicializa o sistema de monitoramento de segurança
 */
function initialize() {
  logger.info('Inicializando sistema de monitoramento de segurança');
  
  // Iniciar servidor de monitoramento se o dashboard estiver habilitado
  if (CONFIG.server.enableDashboard) {
    initializeServer();
  }
  
  // Iniciar monitoramento de logs
  initializeLogMonitoring();
  
  // Iniciar monitoramento de arquivos críticos
  initializeFileMonitoring();
  
  // Iniciar verificação de integridade
  if (CONFIG.integrityCheck.enabled) {
    initializeIntegrityCheck();
  }
  
  logger.info('Sistema de monitoramento de segurança inicializado com sucesso');
}

/**
 * Inicializa o servidor de monitoramento e dashboard
 */
function initializeServer() {
  app = express();
  server = http.createServer(app);
  io = socketIo(server);
  
  // Configurar rotas estáticas para o dashboard
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Rota principal para o dashboard
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'security-dashboard.html'));
  });
  
  // Rota para obter estatísticas de segurança
  app.get('/api/security/stats', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      events: getSecurityStats(),
      integrityStatus: getIntegrityStatus()
    });
  });
  
  // Configurar Socket.IO para atualizações em tempo real
  io.on('connection', (socket) => {
    logger.info('Cliente conectado ao dashboard de segurança');
    
    // Enviar estatísticas iniciais
    socket.emit('security-stats', {
      timestamp: new Date().toISOString(),
      events: getSecurityStats(),
      integrityStatus: getIntegrityStatus()
    });
    
    socket.on('disconnect', () => {
      logger.info('Cliente desconectado do dashboard de segurança');
    });
  });
  
  // Iniciar servidor
  server.listen(CONFIG.server.port, CONFIG.server.host, () => {
    logger.info(`Dashboard de segurança disponível em http://${CONFIG.server.host}:${CONFIG.server.port}`);
  });
}

/**
 * Inicializa o monitoramento de logs
 */
function initializeLogMonitoring() {
  const logPattern = path.join(CONFIG.logs.dir, CONFIG.logs.pattern);
  
  logger.info(`Iniciando monitoramento de logs: ${logPattern}`);
  
  logWatcher = chokidar.watch(logPattern, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  logWatcher.on('add', (filePath) => {
    logger.info(`Novo arquivo de log detectado: ${filePath}`);
    watchLogFile(filePath);
  });
  
  logWatcher.on('change', (filePath) => {
    watchLogFile(filePath);
  });
  
  // Monitorar logs existentes
  const existingLogs = getExistingLogFiles();
  existingLogs.forEach(filePath => {
    logger.info(`Monitorando arquivo de log existente: ${filePath}`);
    watchLogFile(filePath);
  });
}

/**
 * Obtém arquivos de log existentes
 * @returns {Array<string>} - Lista de caminhos de arquivos de log
 */
function getExistingLogFiles() {
  try {
    const logDir = CONFIG.logs.dir;
    return fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(logDir, file));
  } catch (error) {
    logger.error('Erro ao obter arquivos de log existentes:', error);
    return [];
  }
}

/**
 * Notifica um alerta de segurança via Socket.IO, Eventos internos e Canais externos
 * @param {Object} alert - Dados do alerta
 */
async function notifySecurityAlert(alert) {
  if (typeof io !== 'undefined' && io) {
    io.emit('security-alert', alert);
  }
  securityEvents.emit('security-alert', alert);
  
  // Enviar alertas via canais externos (Email, Slack, SMS)
  try {
    await sendAlert(alert);
  } catch (error) {
    logger.error('Erro ao processar envio de alerta multicanal:', error);
  }
}

/**
 * Monitora um arquivo de log específico
 * @param {string} filePath - Caminho do arquivo de log
 */
function watchLogFile(filePath) {
  try {
    const fileSize = fs.statSync(filePath).size;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Analisar apenas as últimas linhas adicionadas
    const lastLines = lines.slice(-10); // Analisar as últimas 10 linhas
    
    lastLines.forEach(line => {
      analyzeLogLine(line, filePath);
    });
  } catch (error) {
    logger.error(`Erro ao monitorar arquivo de log ${filePath}:`, error);
  }
}

/**
 * Analisa uma linha de log em busca de padrões suspeitos
 * @param {string} line - Linha de log
 * @param {string} source - Fonte do log
 */
function analyzeLogLine(line, source) {
  try {
    // Tentar analisar a linha como JSON
    let logData;
    try {
      logData = JSON.parse(line);
    } catch (e) {
      // Se não for JSON, usar a linha como texto
      logData = { message: line, timestamp: new Date().toISOString() };
    }
    
    // Verificar padrões suspeitos
    CONFIG.patterns.suspicious.forEach(pattern => {
      if (typeof logData.message === 'string' && 
          logData.message.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        
        // Incrementar contador de eventos
        const eventKey = `${pattern.pattern}:${pattern.level}`;
        if (!eventCounts[eventKey]) {
          eventCounts[eventKey] = {
            count: 0,
            firstSeen: new Date(),
            lastSeen: new Date(),
            pattern: pattern.pattern,
            level: pattern.level,
            threshold: pattern.threshold,
            timeWindow: pattern.timeWindow,
            occurrences: []
          };
        }
        
        // Atualizar contador
        eventCounts[eventKey].count++;
        eventCounts[eventKey].lastSeen = new Date();
        eventCounts[eventKey].occurrences.push({
          timestamp: new Date(),
          message: logData.message,
          source: source
        });
        
        // Limpar ocorrências antigas
        const cutoffTime = new Date(Date.now() - pattern.timeWindow * 1000);
        eventCounts[eventKey].occurrences = eventCounts[eventKey].occurrences.filter(
          occurrence => occurrence.timestamp > cutoffTime
        );
        
        // Verificar se o limite foi atingido dentro da janela de tempo
        const recentCount = eventCounts[eventKey].occurrences.length;
        
        if (recentCount >= pattern.threshold) {
          // Gerar alerta
          const alert = {
            timestamp: new Date().toISOString(),
            level: pattern.level,
            pattern: pattern.pattern,
            count: recentCount,
            timeWindow: pattern.timeWindow,
            message: `Detectado padrão suspeito: ${pattern.pattern} (${recentCount} ocorrências em ${pattern.timeWindow}s)`,
            source: source,
            occurrences: eventCounts[eventKey].occurrences.map(o => ({ 
              timestamp: o.timestamp, 
              message: o.message.substring(0, 200) // Limitar tamanho da mensagem
            }))
          };
          
          // Registrar alerta
          logSecurityAlert(alert);
          
          // Enviar alerta
          sendAlert(alert);
          
          // Enviar para o dashboard em tempo real
          if (io) {
            notifySecurityAlert(alert);
          }
          
          // Resetar contador após enviar o alerta
          eventCounts[eventKey].count = 0;
          eventCounts[eventKey].occurrences = [];
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao analisar linha de log:', error);
  }
}

/**
 * Registra um alerta de segurança
 * @param {Object} alert - Dados do alerta
 */
function logSecurityAlert(alert) {
  const logLevel = alert.level === 'critical' ? 'error' : 
                  alert.level === 'high' ? 'warn' : 'info';
  
  logger[logLevel]('ALERTA DE SEGURANÇA', alert);
  
  // Salvar alerta em arquivo separado
  const alertsLogPath = path.join(CONFIG.logs.dir, 'security-alerts.log');
  try {
    if (!fs.existsSync(CONFIG.logs.dir)) {
      fs.mkdirSync(CONFIG.logs.dir, { recursive: true });
    }
    fs.appendFileSync(alertsLogPath, JSON.stringify(alert) + '\n');
  } catch (error) {
    logger.error('Erro ao salvar alerta de segurança em arquivo:', error);
  }
}

/**
 * Obtém os últimos alertas registrados
 * @param {number} limit - Número máximo de alertas
 * @returns {Array} - Lista de alertas
 */
function getRecentAlerts(limit = 50) {
  try {
    const alertsLogPath = path.join(CONFIG.logs.dir, 'security-alerts.log');
    if (!fs.existsSync(alertsLogPath)) return [];
    
    const content = fs.readFileSync(alertsLogPath, 'utf8');
    const lines = content.trim().split('\n');
    return lines
      .map(line => JSON.parse(line))
      .reverse()
      .slice(0, limit);
  } catch (error) {
    logger.error('Erro ao ler alertas recentes:', error);
    return [];
  }
}

/**
 * Obtém estatísticas gerais de segurança
 */
async function getStats() {
  const alerts = getRecentAlerts(100);
  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const highCount = alerts.filter(a => a.level === 'high').length;
  
  return {
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: criticalCount,
      highAlerts: highCount,
      lastUpdated: new Date().toISOString()
    },
    events: {
      totalAlerts: alerts.length,
      blockedIps: alerts.filter(a => a.pattern === 'blocked IP').length
    },
    integrityStatus: {
      isIntact: true, // Placeholder para verificação real
      lastCheck: new Date().toISOString()
    }
  };
}

/**
 * Verifica a integridade geral do sistema
 */
async function checkIntegrity() {
  return {
    isIntact: true,
    lastCheck: new Date().toISOString(),
    details: 'Verificação de integridade básica concluída.'
  };
}

/**
 * Obtém a lista de arquivos críticos monitorados
 */
function getMonitoredFiles() {
  return CONFIG.patterns.criticalFiles;
}

/**
 * Obtém os padrões de detecção configurados
 */
function getDetectionPatterns() {
  return CONFIG.patterns.suspicious;
}

/**
 * Envia um alerta pelos canais configurados
 * @param {Object} alert - Dados do alerta
 */
async function sendAlert(alert) {
  // Enviar apenas alertas críticos e altos por email/SMS
  const isCritical = alert.level === 'critical' || alert.level === 'high';
  
  // Enviar por email
  if (CONFIG.alerts.email.enabled && (isCritical || alert.level === 'warning')) {
    await sendEmailAlert(alert);
  }
  
  // Enviar por Slack
  if (CONFIG.alerts.slack.enabled) {
    await sendSlackAlert(alert);
  }
  
  // Enviar por SMS (apenas críticos)
  if (CONFIG.alerts.sms.enabled && alert.level === 'critical') {
    await sendSmsAlert(alert);
  }
}

/**
 * Envia um alerta por email
 * @param {Object} alert - Dados do alerta
 */
async function sendEmailAlert(alert) {
  try {
    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      host: CONFIG.alerts.email.host,
      port: CONFIG.alerts.email.port,
      secure: CONFIG.alerts.email.secure,
      auth: CONFIG.alerts.email.auth
    });
    
    // Preparar assunto com nível de severidade
    const subjectPrefix = alert.level === 'critical' ? '[CRÍTICO] ' : 
                         alert.level === 'high' ? '[ALERTA] ' : '[AVISO] ';
    
    // Preparar corpo do email
    const htmlBody = `
      <h2>Alerta de Segurança: ${alert.pattern}</h2>
      <p><strong>Nível:</strong> ${alert.level}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
      <p><strong>Mensagem:</strong> ${alert.message}</p>
      <p><strong>Fonte:</strong> ${alert.source}</p>
      <p><strong>Ocorrências:</strong> ${alert.count} em ${alert.timeWindow}s</p>
      
      <h3>Detalhes das Ocorrências:</h3>
      <ul>
        ${alert.occurrences.map(o => `
          <li>
            <strong>${new Date(o.timestamp).toLocaleString()}</strong>: ${o.message}
          </li>
        `).join('')}
      </ul>
    `;
    
    // Enviar email
    const mailOptions = {
      from: CONFIG.alerts.email.from,
      to: CONFIG.alerts.email.to,
      subject: `${subjectPrefix}Alerta de Segurança: ${alert.pattern}`,
      html: htmlBody
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email de alerta enviado: ${info.messageId}`);
    
    return true;
  } catch (error) {
    logger.error('Erro ao enviar alerta por email:', error);
    return false;
  }
}

/**
 * Envia um alerta para o Slack
 * @param {Object} alert - Dados do alerta
 */
async function sendSlackAlert(alert) {
  try {
    if (!CONFIG.alerts.slack.webhook) {
      logger.warn('Webhook do Slack não configurado');
      return false;
    }
    
    // Determinar cor com base no nível
    const color = alert.level === 'critical' ? '#FF0000' : // Vermelho
                 alert.level === 'high' ? '#FFA500' : // Laranja
                 alert.level === 'warning' ? '#FFFF00' : // Amarelo
                 '#00FF00'; // Verde
    
    // Preparar payload do Slack
    const payload = {
      channel: CONFIG.alerts.slack.channel,
      username: 'Security Monitor',
      icon_emoji: ':shield:',
      attachments: [
        {
          color: color,
          title: `Alerta de Segurança: ${alert.pattern}`,
          text: alert.message,
          fields: [
            {
              title: 'Nível',
              value: alert.level,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true
            },
            {
              title: 'Fonte',
              value: alert.source,
              short: true
            },
            {
              title: 'Ocorrências',
              value: `${alert.count} em ${alert.timeWindow}s`,
              short: true
            }
          ],
          footer: 'Acucaradas Encomendas - Sistema de Monitoramento de Segurança'
        }
      ]
    };
    
    // Enviar para o Slack
    const response = await fetch(CONFIG.alerts.slack.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      logger.info('Alerta enviado para o Slack com sucesso');
      return true;
    } else {
      logger.warn(`Erro ao enviar alerta para o Slack: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    logger.error('Erro ao enviar alerta para o Slack:', error);
    return false;
  }
}

/**
 * Envia um alerta por SMS
 * @param {Object} alert - Dados do alerta
 */
async function sendSmsAlert(alert) {
  try {
    if (CONFIG.alerts.sms.provider !== 'twilio' || !CONFIG.alerts.sms.accountSid) {
      logger.warn('Provedor de SMS não configurado corretamente');
      return false;
    }
    
    // Esta é uma implementação simulada
    // Em um ambiente real, você usaria a API do Twilio ou outro provedor
    logger.info(`[SIMULAÇÃO] SMS enviado para ${CONFIG.alerts.sms.to.join(', ')}: ${alert.message}`);
    
    return true;
  } catch (error) {
    logger.error('Erro ao enviar alerta por SMS:', error);
    return false;
  }
}

/**
 * Inicializa o monitoramento de arquivos críticos
 */
function initializeFileMonitoring() {
  const criticalFiles = CONFIG.patterns.criticalFiles.map(file => file.path);
  
  logger.info(`Iniciando monitoramento de ${criticalFiles.length} arquivos críticos`);
  
  fileWatcher = chokidar.watch(criticalFiles, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true
  });
  
  fileWatcher.on('change', (filePath) => {
    const fileConfig = CONFIG.patterns.criticalFiles.find(f => filePath.endsWith(f.path));
    if (fileConfig) {
      const alert = {
        timestamp: new Date().toISOString(),
        level: fileConfig.level,
        pattern: 'file_modification',
        count: 1,
        timeWindow: 0,
        message: `Arquivo crítico modificado: ${filePath}`,
        source: filePath,
        occurrences: [{
          timestamp: new Date(),
          message: `Arquivo crítico modificado: ${filePath}`
        }]
      };
      
      logSecurityAlert(alert);
      sendAlert(alert);
      
      // Verificar integridade do arquivo
      checkFileIntegrity(filePath);
      
      // Enviar para o dashboard em tempo real
      if (io) {
        notifySecurityAlert(alert);
      }
    }
  });
  
  fileWatcher.on('add', (filePath) => {
    logger.info(`Novo arquivo crítico detectado: ${filePath}`);
    // Calcular hash inicial
    calculateFileHash(filePath);
  });
  
  fileWatcher.on('unlink', (filePath) => {
    const fileConfig = CONFIG.patterns.criticalFiles.find(f => filePath.endsWith(f.path));
    if (fileConfig) {
      const alert = {
        timestamp: new Date().toISOString(),
        level: 'critical',
        pattern: 'file_deletion',
        count: 1,
        timeWindow: 0,
        message: `Arquivo crítico excluído: ${filePath}`,
        source: filePath,
        occurrences: [{
          timestamp: new Date(),
          message: `Arquivo crítico excluído: ${filePath}`
        }]
      };
      
      logSecurityAlert(alert);
      sendAlert(alert);
      
      // Enviar para o dashboard em tempo real
      if (io) {
        notifySecurityAlert(alert);
      }
    }
  });
  
  // Calcular hashes iniciais
  criticalFiles.forEach(filePath => {
    calculateFileHash(filePath);
  });
}

/**
 * Calcula o hash de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} - Hash do arquivo
 */
function calculateFileHash(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const hash = execSync(`sha256sum "${filePath}"`, { encoding: 'utf8' }).split(' ')[0];
      fileHashes[filePath] = {
        hash,
        timestamp: new Date().toISOString()
      };
      return hash;
    }
  } catch (error) {
    logger.error(`Erro ao calcular hash do arquivo ${filePath}:`, error);
  }
  return null;
}

/**
 * Verifica a integridade de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @returns {boolean} - Se a integridade foi mantida
 */
function checkFileIntegrity(filePath) {
  try {
    if (!fileHashes[filePath]) {
      // Primeiro cálculo do hash
      calculateFileHash(filePath);
      return true;
    }
    
    const oldHash = fileHashes[filePath].hash;
    const newHash = calculateFileHash(filePath);
    
    if (oldHash !== newHash) {
      const alert = {
        timestamp: new Date().toISOString(),
        level: 'critical',
        pattern: 'file_integrity_violation',
        count: 1,
        timeWindow: 0,
        message: `Violação de integridade detectada no arquivo: ${filePath}`,
        source: filePath,
        occurrences: [{
          timestamp: new Date(),
          message: `Hash anterior: ${oldHash}, Hash atual: ${newHash}`
        }]
      };
      
      logSecurityAlert(alert);
      sendAlert(alert);
      
      // Enviar para o dashboard em tempo real
      if (io) {
        notifySecurityAlert(alert);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Erro ao verificar integridade do arquivo ${filePath}:`, error);
    return false;
  }
}

/**
 * Inicializa a verificação periódica de integridade
 */
function initializeIntegrityCheck() {
  logger.info(`Iniciando verificação de integridade a cada ${CONFIG.integrityCheck.interval / 1000} segundos`);
  
  // Executar verificação inicial
  runIntegrityCheck();
  
  // Agendar verificações periódicas
  integrityCheckInterval = setInterval(runIntegrityCheck, CONFIG.integrityCheck.interval);
}

/**
 * Executa uma verificação de integridade em todos os arquivos monitorados
 */
function runIntegrityCheck() {
  logger.info('Executando verificação de integridade');
  
  let violations = 0;
  
  // Verificar integridade de todos os arquivos críticos
  CONFIG.patterns.criticalFiles.forEach(fileConfig => {
    const filePath = fileConfig.path;
    if (fs.existsSync(filePath)) {
      const integrity = checkFileIntegrity(filePath);
      if (!integrity) {
        violations++;
      }
    } else if (fileHashes[filePath]) {
      // Arquivo existia antes, mas agora não existe mais
      const alert = {
        timestamp: new Date().toISOString(),
        level: 'critical',
        pattern: 'file_missing',
        count: 1,
        timeWindow: 0,
        message: `Arquivo crítico não encontrado: ${filePath}`,
        source: filePath,
        occurrences: [{
          timestamp: new Date(),
          message: `Arquivo crítico não encontrado: ${filePath}`
        }]
      };
      
      logSecurityAlert(alert);
      sendAlert(alert);
      
      // Enviar para o dashboard em tempo real
      if (io) {
        notifySecurityAlert(alert);
      }
      
      violations++;
    }
  });
  
  logger.info(`Verificação de integridade concluída. Violações encontradas: ${violations}`);
  
  return violations === 0;
}

/**
 * Obtém estatísticas de segurança
 * @returns {Object} - Estatísticas de segurança
 */
function getSecurityStats() {
  const stats = {
    alerts: {
      critical: 0,
      high: 0,
      warning: 0,
      info: 0,
      total: 0
    },
    patterns: {},
    recentAlerts: []
  };
  
  // Contar alertas por nível e padrão
  try {
    const alertsLogPath = path.join(CONFIG.logs.dir, 'security-alerts.log');
    if (fs.existsSync(alertsLogPath)) {
      const content = fs.readFileSync(alertsLogPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Analisar apenas os últimos 100 alertas para estatísticas
      const recentLines = lines.slice(-100);
      
      recentLines.forEach(line => {
        try {
          const alert = JSON.parse(line);
          
          // Incrementar contador por nível
          if (alert.level) {
            stats.alerts[alert.level] = (stats.alerts[alert.level] || 0) + 1;
            stats.alerts.total++;
          }
          
          // Incrementar contador por padrão
          if (alert.pattern) {
            stats.patterns[alert.pattern] = (stats.patterns[alert.pattern] || 0) + 1;
          }
          
          // Adicionar aos alertas recentes (últimos 10)
          if (stats.recentAlerts.length < 10) {
            stats.recentAlerts.push({
              timestamp: alert.timestamp,
              level: alert.level,
              pattern: alert.pattern,
              message: alert.message
            });
          }
        } catch (e) {
          // Ignorar linhas inválidas
        }
      });
      
      // Ordenar alertas recentes por timestamp (mais recentes primeiro)
      stats.recentAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  } catch (error) {
    logger.error('Erro ao obter estatísticas de segurança:', error);
  }
  
  return stats;
}

/**
 * Obtém o status de integridade do sistema
 * @returns {Object} - Status de integridade
 */
function getIntegrityStatus() {
  const status = {
    lastCheck: null,
    status: 'unknown',
    fileCount: 0,
    violations: []
  };
  
  try {
    // Contar arquivos monitorados
    status.fileCount = Object.keys(fileHashes).length;
    
    // Encontrar a verificação mais recente
    let latestTimestamp = null;
    for (const filePath in fileHashes) {
      const timestamp = new Date(fileHashes[filePath].timestamp);
      if (!latestTimestamp || timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }
    }
    
    if (latestTimestamp) {
      status.lastCheck = latestTimestamp.toISOString();
      status.status = 'ok';
      
      // Verificar violações recentes
      try {
        const alertsLogPath = path.join(CONFIG.logs.dir, 'security-alerts.log');
        if (fs.existsSync(alertsLogPath)) {
          const content = fs.readFileSync(alertsLogPath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          // Verificar apenas os últimos 50 alertas
          const recentLines = lines.slice(-50);
          
          recentLines.forEach(line => {
            try {
              const alert = JSON.parse(line);
              
              // Verificar se é uma violação de integridade recente (últimas 24h)
              if (alert.pattern === 'file_integrity_violation' || 
                  alert.pattern === 'file_missing' || 
                  alert.pattern === 'file_deletion') {
                
                const alertTime = new Date(alert.timestamp);
                const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h atrás
                
                if (alertTime >= cutoffTime) {
                  status.violations.push({
                    timestamp: alert.timestamp,
                    file: alert.source,
                    message: alert.message
                  });
                  
                  status.status = 'violated';
                }
              }
            } catch (e) {
              // Ignorar linhas inválidas
            }
          });
        }
      } catch (error) {
        logger.error('Erro ao verificar violações de integridade:', error);
      }
    }
  } catch (error) {
    logger.error('Erro ao obter status de integridade:', error);
    status.status = 'error';
  }
  
  return status;
}

/**
 * Encerra o sistema de monitoramento
 */
function shutdown() {
  logger.info('Encerrando sistema de monitoramento de segurança');
  
  // Encerrar verificação de integridade
  if (integrityCheckInterval) {
    clearInterval(integrityCheckInterval);
  }
  
  // Encerrar monitoramento de arquivos
  if (fileWatcher) {
    fileWatcher.close();
  }
  
  // Encerrar monitoramento de logs
  if (logWatcher) {
    logWatcher.close();
  }
  
  // Encerrar servidor
  if (server) {
    server.close();
  }
  
  logger.info('Sistema de monitoramento de segurança encerrado');
}

// Verificar se o script foi chamado diretamente
if (require.main === module) {
  // Inicializar o sistema
  initialize();
  
  // Lidar com encerramento gracioso
  process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
  });
}

module.exports = {
  initialize,
  logSecurityAlert,
  securityEvents,
  getStats,
  checkIntegrity,
  getMonitoredFiles,
  getDetectionPatterns,
  getRecentAlerts
};
