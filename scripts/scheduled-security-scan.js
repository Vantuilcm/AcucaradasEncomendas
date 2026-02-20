/**
 * Script de Agendamento de Testes de Segurança Periódicos
 * 
 * Este script implementa um agendador para execução periódica de testes de segurança,
 * incluindo testes de penetração, análise estática de código e verificação de dependências.
 * 
 * Implementado seguindo as recomendações OWASP e NIST.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const chalk = require('chalk');

// Configurações
const CONFIG = {
  // Configurações de agendamento
  schedules: {
    dailyScan: '0 0 * * *',        // Todos os dias à meia-noite
    weeklyScan: '0 0 * * 0',        // Todo domingo à meia-noite
    monthlyScan: '0 0 1 * *'        // Primeiro dia do mês à meia-noite
  },
  
  // Configurações de email para notificações
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'security@acucaradasencomendas.com.br',
      pass: process.env.EMAIL_PASS || 'your-password'
    },
    from: process.env.EMAIL_FROM || 'security@acucaradasencomendas.com.br',
    to: (process.env.EMAIL_TO || 'admin@acucaradasencomendas.com.br').split(','),
    subjectPrefix: '[SEGURANÇA] '
  },
  
  // Configurações de relatórios
  reports: {
    dir: process.env.REPORT_DIR || 'reports/security',
    retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '90')
  },
  
  // Configurações de testes
  tests: {
    // Testes diários (rápidos)
    daily: [
      {
        name: 'Verificação de Dependências',
        command: 'npm audit --json',
        type: 'dependency'
      },
      {
        name: 'Verificação de Headers HTTP',
        command: 'node ./scripts/security-tests.js --headers-only',
        type: 'headers'
      }
    ],
    
    // Testes semanais (mais completos)
    weekly: [
      {
        name: 'Testes de Segurança Completos',
        command: 'node ./scripts/security-tests.js',
        type: 'security'
      },
      {
        name: 'Análise Estática de Código',
        command: 'npx eslint --ext .js,.jsx,.ts,.tsx src/ --no-error-on-unmatched-pattern --format json',
        type: 'static'
      }
    ],
    
    // Testes mensais (completos e intensivos)
    monthly: [
      {
        name: 'Testes de Penetração Completos',
        command: 'node ./scripts/security-tests.js --penetration-full',
        type: 'penetration'
      },
      {
        name: 'Verificação de Configurações',
        command: 'node ./scripts/security-tests.js --config-full',
        type: 'config'
      },
      {
        name: 'Auditoria de Segurança Completa',
        command: 'node ./scripts/run-security-checks.js',
        type: 'audit'
      }
    ]
  }
};

// Garantir que o diretório de relatórios exista
if (!fs.existsSync(CONFIG.reports.dir)) {
  fs.mkdirSync(CONFIG.reports.dir, { recursive: true });
}

/**
 * Inicializa o agendador de testes de segurança
 */
function initializeSecurityScheduler() {
  console.log(chalk.blue.bold('🔒 Inicializando agendador de testes de segurança'));
  console.log(chalk.blue('='.repeat(50)));
  
  // Agendar testes diários
  cron.schedule(CONFIG.schedules.dailyScan, () => {
    console.log(chalk.blue('🔍 Executando testes de segurança diários...'));
    runScheduledTests('daily', 'Relatório Diário de Segurança');
  });
  
  // Agendar testes semanais
  cron.schedule(CONFIG.schedules.weeklyScan, () => {
    console.log(chalk.blue('🔍 Executando testes de segurança semanais...'));
    runScheduledTests('weekly', 'Relatório Semanal de Segurança');
  });
  
  // Agendar testes mensais
  cron.schedule(CONFIG.schedules.monthlyScan, () => {
    console.log(chalk.blue('🔍 Executando testes de segurança mensais...'));
    runScheduledTests('monthly', 'Relatório Mensal de Segurança');
  });
  
  // Limpar relatórios antigos periodicamente
  cron.schedule('0 1 * * *', () => { // Todos os dias à 1h da manhã
    cleanupOldReports();
  });
  
  console.log(chalk.green('✅ Agendador de testes de segurança inicializado com sucesso!'));
  console.log(chalk.blue('Testes diários:'), CONFIG.schedules.dailyScan);
  console.log(chalk.blue('Testes semanais:'), CONFIG.schedules.weeklyScan);
  console.log(chalk.blue('Testes mensais:'), CONFIG.schedules.monthlyScan);
}

/**
 * Executa os testes agendados
 * @param {string} schedule - Tipo de agendamento (daily, weekly, monthly)
 * @param {string} reportTitle - Título do relatório
 */
async function runScheduledTests(schedule, reportTitle) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(CONFIG.reports.dir, `${schedule}-${timestamp}`);
  
  // Criar diretório para o relatório atual
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const results = [];
  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;
  
  // Executar cada teste configurado para este agendamento
  for (const test of CONFIG.tests[schedule]) {
    console.log(chalk.blue(`Executando teste: ${test.name}`));
    
    try {
      // Executar o comando de teste
      const output = execSync(test.command).toString();
      
      // Salvar saída bruta
      const rawOutputPath = path.join(reportDir, `${test.type}-raw.txt`);
      fs.writeFileSync(rawOutputPath, output);
      
      // Processar resultado
      const result = processTestResult(test, output);
      results.push(result);
      
      // Atualizar contadores
      criticalIssues += result.issues.critical || 0;
      highIssues += result.issues.high || 0;
      mediumIssues += result.issues.medium || 0;
      lowIssues += result.issues.low || 0;
      
      console.log(chalk.green(`✅ Teste concluído: ${test.name}`));
    } catch (error) {
      // Capturar erro e saída
      const errorOutput = error.stdout ? error.stdout.toString() : error.message;
      
      // Salvar saída de erro
      const errorOutputPath = path.join(reportDir, `${test.type}-error.txt`);
      fs.writeFileSync(errorOutputPath, errorOutput);
      
      // Processar resultado com erro
      const result = {
        name: test.name,
        type: test.type,
        status: 'error',
        issues: { critical: 0, high: 0, medium: 0, low: 0 },
        error: error.message
      };
      
      // Tentar extrair informações de vulnerabilidades do erro
      try {
        const processedResult = processTestResult(test, errorOutput, true);
        Object.assign(result, processedResult);
      } catch (processError) {
        console.error(chalk.red(`Erro ao processar resultado: ${processError.message}`));
      }
      
      results.push(result);
      
      // Atualizar contadores
      criticalIssues += result.issues.critical || 0;
      highIssues += result.issues.high || 0;
      mediumIssues += result.issues.medium || 0;
      lowIssues += result.issues.low || 0;
      
      console.log(chalk.red(`❌ Erro ao executar teste: ${test.name}`));
      console.error(error.message);
    }
  }
  
  // Gerar relatório consolidado
  const report = {
    title: reportTitle,
    timestamp: new Date().toISOString(),
    schedule,
    summary: {
      critical: criticalIssues,
      high: highIssues,
      medium: mediumIssues,
      low: lowIssues,
      total: criticalIssues + highIssues + mediumIssues + lowIssues
    },
    results
  };
  
  // Salvar relatório JSON
  const reportPath = path.join(reportDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Gerar relatório HTML
  const htmlReportPath = path.join(reportDir, 'report.html');
  generateHtmlReport(report, htmlReportPath);
  
  // Enviar notificação por email
  if (CONFIG.email.enabled) {
    await sendEmailNotification(report, htmlReportPath);
  }
  
  console.log(chalk.blue('📊 Resumo dos testes:'));
  console.log(chalk.red(`🚨 Críticos: ${criticalIssues}`));
  console.log(chalk.yellow(`⚠️ Altos: ${highIssues}`));
  console.log(chalk.blue(`ℹ️ Médios: ${mediumIssues}`));
  console.log(chalk.green(`✓ Baixos: ${lowIssues}`));
  console.log(chalk.blue('Relatório salvo em:'), reportPath);
}

/**
 * Processa o resultado de um teste
 * @param {Object} test - Configuração do teste
 * @param {string} output - Saída do teste
 * @param {boolean} isError - Se a saída é de um erro
 */
function processTestResult(test, output, isError = false) {
  const result = {
    name: test.name,
    type: test.type,
    status: isError ? 'error' : 'success',
    issues: { critical: 0, high: 0, medium: 0, low: 0 },
    details: []
  };
  
  try {
    switch (test.type) {
      case 'dependency':
        // Processar resultado do npm audit
        try {
          const auditData = JSON.parse(output);
          if (auditData.metadata && auditData.metadata.vulnerabilities) {
            const vulns = auditData.metadata.vulnerabilities;
            result.issues.critical = vulns.critical || 0;
            result.issues.high = vulns.high || 0;
            result.issues.medium = vulns.moderate || 0;
            result.issues.low = vulns.low || 0;
            
            // Extrair detalhes das vulnerabilidades
            if (auditData.vulnerabilities) {
              Object.values(auditData.vulnerabilities).forEach(vuln => {
                if (Array.isArray(vuln)) {
                  vuln.forEach(v => {
                    result.details.push({
                      package: v.name,
                      severity: v.severity,
                      description: v.title || 'Vulnerabilidade em dependência'
                    });
                  });
                } else {
                  result.details.push({
                    package: vuln.name,
                    severity: vuln.severity,
                    description: vuln.title || 'Vulnerabilidade em dependência'
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error('Erro ao processar resultado de dependências:', error);
        }
        break;
        
      case 'security':
      case 'headers':
      case 'penetration':
      case 'config':
        // Processar resultado dos testes de segurança
        try {
          const securityData = JSON.parse(output);
          if (securityData.summary) {
            result.issues.critical = securityData.summary.critical || 0;
            result.issues.high = securityData.summary.failed || 0;
            result.issues.medium = securityData.summary.warnings || 0;
            result.issues.low = 0;
            
            // Extrair detalhes dos testes
            ['staticAnalysis', 'penetrationTests', 'configTests', 'headerTests', 'dependencyTests']
              .forEach(category => {
                if (securityData[category] && Array.isArray(securityData[category])) {
                  securityData[category].forEach(item => {
                    if (item.status === 'failed' || item.status === 'critical' || item.status === 'warning') {
                      result.details.push({
                        test: item.name,
                        severity: item.status === 'critical' ? 'critical' : 
                                 item.status === 'failed' ? 'high' : 'medium',
                        description: item.details
                      });
                    }
                  });
                }
              });
          }
        } catch (error) {
          console.error(`Erro ao processar resultado de ${test.type}:`, error);
        }
        break;
        
      case 'static':
        // Processar resultado da análise estática (ESLint)
        try {
          const lintData = JSON.parse(output);
          if (Array.isArray(lintData)) {
            // Contar problemas por severidade
            lintData.forEach(file => {
              if (file.messages) {
                file.messages.forEach(msg => {
                  if (msg.severity === 2) { // error
                    if (msg.message.toLowerCase().includes('security') || 
                        msg.message.toLowerCase().includes('vulnerability')) {
                      result.issues.high++;
                    } else {
                      result.issues.medium++;
                    }
                    
                    result.details.push({
                      file: file.filePath,
                      line: msg.line,
                      severity: msg.message.toLowerCase().includes('security') ? 'high' : 'medium',
                      description: msg.message
                    });
                  } else if (msg.severity === 1) { // warning
                    result.issues.low++;
                    
                    if (msg.message.toLowerCase().includes('security') || 
                        msg.message.toLowerCase().includes('vulnerability')) {
                      result.details.push({
                        file: file.filePath,
                        line: msg.line,
                        severity: 'low',
                        description: msg.message
                      });
                    }
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('Erro ao processar resultado de análise estática:', error);
        }
        break;
        
      case 'audit':
        // Processar resultado da auditoria completa
        try {
          const auditData = JSON.parse(output);
          if (auditData.results) {
            result.issues.critical = auditData.results.critical || 0;
            result.issues.high = auditData.results.high || 0;
            result.issues.medium = auditData.results.medium || 0;
            result.issues.low = auditData.results.low || 0;
            
            // Extrair detalhes dos testes
            if (auditData.details && Array.isArray(auditData.details)) {
              auditData.details.forEach(item => {
                if (item.status !== 'passed') {
                  result.details.push({
                    test: item.name,
                    severity: item.severity || 'medium',
                    description: item.message || item.details
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error('Erro ao processar resultado de auditoria:', error);
        }
        break;
    }
  } catch (error) {
    console.error(`Erro ao processar resultado do teste ${test.name}:`, error);
  }
  
  // Determinar status geral com base nas issues
  if (result.issues.critical > 0) {
    result.status = 'critical';
  } else if (result.issues.high > 0) {
    result.status = 'failed';
  } else if (result.issues.medium > 0) {
    result.status = 'warning';
  } else if (isError) {
    result.status = 'error';
  } else {
    result.status = 'passed';
  }
  
  return result;
}

/**
 * Gera um relatório HTML
 * @param {Object} report - Dados do relatório
 * @param {string} outputPath - Caminho para salvar o relatório HTML
 */
function generateHtmlReport(report, outputPath) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .count {
      font-size: 2em;
      font-weight: bold;
    }
    .critical { color: #dc3545; }
    .high { color: #fd7e14; }
    .medium { color: #ffc107; }
    .low { color: #28a745; }
    .passed { color: #28a745; }
    .warning { color: #ffc107; }
    .failed { color: #fd7e14; }
    .error { color: #6c757d; }
    .test-section {
      margin-bottom: 30px;
    }
    .test-item {
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 5px;
      border-left: 5px solid #ddd;
    }
    .test-item.passed { border-left-color: #28a745; background-color: #f8fff8; }
    .test-item.warning { border-left-color: #ffc107; background-color: #fffdf8; }
    .test-item.failed { border-left-color: #fd7e14; background-color: #fff8f8; }
    .test-item.critical { border-left-color: #dc3545; background-color: #fff0f0; }
    .test-item.error { border-left-color: #6c757d; background-color: #f8f8f8; }
    .test-item h3 {
      margin-top: 0;
    }
    .test-details {
      margin-top: 10px;
    }
    .timestamp {
      color: #6c757d;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .details-table th, .details-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .details-table th {
      background-color: #f8f9fa;
    }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p class="timestamp">Gerado em: ${new Date(report.timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <div class="summary-item">
      <div class="count critical">${report.summary.critical}</div>
      <div>Críticos</div>
    </div>
    <div class="summary-item">
      <div class="count high">${report.summary.high}</div>
      <div>Altos</div>
    </div>
    <div class="summary-item">
      <div class="count medium">${report.summary.medium}</div>
      <div>Médios</div>
    </div>
    <div class="summary-item">
      <div class="count low">${report.summary.low}</div>
      <div>Baixos</div>
    </div>
    <div class="summary-item">
      <div class="count">${report.summary.total}</div>
      <div>Total</div>
    </div>
  </div>
  
  <div class="test-section">
    <h2>Resultados dos Testes</h2>
    ${report.results.map(result => `
      <div class="test-item ${result.status}">
        <h3>${result.name}</h3>
        <div>
          <strong>Status:</strong> 
          <span class="${result.status}">
            ${result.status === 'passed' ? 'Passou' : 
              result.status === 'warning' ? 'Avisos' : 
              result.status === 'failed' ? 'Falhou' : 
              result.status === 'critical' ? 'Crítico' : 'Erro'}
          </span>
        </div>
        <div>
          <strong>Problemas encontrados:</strong> 
          ${result.issues.critical > 0 ? `<span class="critical">${result.issues.critical} críticos</span>, ` : ''}
          ${result.issues.high > 0 ? `<span class="high">${result.issues.high} altos</span>, ` : ''}
          ${result.issues.medium > 0 ? `<span class="medium">${result.issues.medium} médios</span>, ` : ''}
          ${result.issues.low > 0 ? `<span class="low">${result.issues.low} baixos</span>` : ''}
          ${(result.issues.critical + result.issues.high + result.issues.medium + result.issues.low) === 0 ? 'Nenhum' : ''}
        </div>
        ${result.error ? `<div class="test-details error"><strong>Erro:</strong> ${result.error}</div>` : ''}
        ${result.details && result.details.length > 0 ? `
          <div class="test-details">
            <h4>Detalhes:</h4>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Severidade</th>
                  <th>Descrição</th>
                  ${result.details[0].file ? '<th>Arquivo</th>' : ''}
                  ${result.details[0].line ? '<th>Linha</th>' : ''}
                  ${result.details[0].package ? '<th>Pacote</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${result.details.map(detail => `
                  <tr>
                    <td class="${detail.severity}">${detail.severity}</td>
                    <td>${detail.description}</td>
                    ${detail.file ? `<td>${detail.file}</td>` : ''}
                    ${detail.line ? `<td>${detail.line}</td>` : ''}
                    ${detail.package ? `<td>${detail.package}</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(outputPath, html);
}

/**
 * Envia notificação por email
 * @param {Object} report - Dados do relatório
 * @param {string} htmlReportPath - Caminho do relatório HTML
 */
async function sendEmailNotification(report, htmlReportPath) {
  try {
    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      host: CONFIG.email.host,
      port: CONFIG.email.port,
      secure: CONFIG.email.secure,
      auth: CONFIG.email.auth
    });
    
    // Determinar nível de severidade para o assunto
    let subjectPrefix = CONFIG.email.subjectPrefix;
    if (report.summary.critical > 0) {
      subjectPrefix += '[CRÍTICO] ';
    } else if (report.summary.high > 0) {
      subjectPrefix += '[ALERTA] ';
    }
    
    // Ler o relatório HTML
    const htmlContent = fs.readFileSync(htmlReportPath, 'utf8');
    
    // Preparar email
    const mailOptions = {
      from: CONFIG.email.from,
      to: CONFIG.email.to,
      subject: `${subjectPrefix}${report.title} - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
      attachments: [
        {
          filename: 'report.html',
          content: htmlContent
        },
        {
          filename: 'report.json',
          content: JSON.stringify(report, null, 2)
        }
      ]
    };
    
    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log(chalk.green(`✅ Email de notificação enviado: ${info.messageId}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Erro ao enviar email de notificação:'), error);
    return false;
  }
}

/**
 * Limpa relatórios antigos
 */
function cleanupOldReports() {
  try {
    console.log(chalk.blue('🧹 Limpando relatórios antigos...'));
    
    const now = Date.now();
    const retentionMs = CONFIG.reports.retentionDays * 24 * 60 * 60 * 1000;
    
    // Listar diretórios de relatórios
    const reportDirs = fs.readdirSync(CONFIG.reports.dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(CONFIG.reports.dir, dirent.name));
    
    let deletedCount = 0;
    
    for (const dir of reportDirs) {
      try {
        const stats = fs.statSync(dir);
        const age = now - stats.mtime.getTime();
        
        // Se o diretório for mais antigo que o período de retenção, excluir
        if (age > retentionMs) {
          deleteDirRecursive(dir);
          deletedCount++;
        }
      } catch (error) {
        console.error(chalk.yellow(`Aviso: Não foi possível verificar ${dir}:`), error.message);
      }
    }
    
    console.log(chalk.green(`✅ Limpeza concluída. ${deletedCount} relatórios antigos removidos.`));
  } catch (error) {
    console.error(chalk.red('❌ Erro ao limpar relatórios antigos:'), error);
  }
}

/**
 * Exclui um diretório recursivamente
 * @param {string} dir - Diretório a ser excluído
 */
function deleteDirRecursive(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursivamente excluir subdiretórios
        deleteDirRecursive(curPath);
      } else {
        // Excluir arquivo
        fs.unlinkSync(curPath);
      }
    });
    // Excluir diretório vazio
    fs.rmdirSync(dir);
  }
}

/**
 * Executa um teste imediatamente
 * @param {string} schedule - Tipo de agendamento (daily, weekly, monthly)
 */
function runImmediateTest(schedule) {
  if (!CONFIG.tests[schedule]) {
    console.error(chalk.red(`❌ Tipo de teste inválido: ${schedule}`));
    console.log(chalk.blue('Tipos disponíveis:'), Object.keys(CONFIG.tests).join(', '));
    return;
  }
  
  console.log(chalk.blue(`🔍 Executando testes de segurança ${schedule} imediatamente...`));
  runScheduledTests(schedule, `Relatório ${schedule.charAt(0).toUpperCase() + schedule.slice(1)} de Segurança (Manual)`);
}

// Verificar se o script foi chamado diretamente
if (require.main === module) {
  // Verificar argumentos de linha de comando
  const args = process.argv.slice(2);
  
  if (args.includes('--run')) {
    // Executar teste imediatamente
    const scheduleIndex = args.indexOf('--run') + 1;
    if (scheduleIndex < args.length) {
      const schedule = args[scheduleIndex];
      runImmediateTest(schedule);
    } else {
      console.error(chalk.red('❌ Tipo de teste não especificado'));
      console.log(chalk.blue('Uso: node scheduled-security-scan.js --run [daily|weekly|monthly]'));
    }
  } else if (args.includes('--init')) {
    // Inicializar agendador
    initializeSecurityScheduler();
  } else {
    console.log(chalk.blue('Uso:'));
    console.log('  node scheduled-security-scan.js --init       # Inicializar agendador');
    console.log('  node scheduled-security-scan.js --run daily  # Executar testes diários');
    console.log('  node scheduled-security-scan.js --run weekly # Executar testes semanais');
    console.log('  node scheduled-security-scan.js --run monthly # Executar testes mensais');
  }
}

module.exports = {
  initializeSecurityScheduler,
  runScheduledTests,
  runImmediateTest
};
