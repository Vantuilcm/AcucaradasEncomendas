const fs = require('fs');
const path = require('path');

// Lista de variáveis de ambiente obrigatórias
const REQUIRED_ENV_VARS = {
  development: [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
  ],
  production: [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD',
    'STRIPE_SECRET_KEY_PROD',
    'SENTRY_DSN',
    'ONESIGNAL_APP_ID',
  ],
};

// Padrões de segurança que não devem estar no código
const SECURITY_PATTERNS = [
  {
    pattern: /(?:api_key|apiKey|secret|token|password)\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    message: 'Possível chave/token hardcoded encontrado',
    severity: 'HIGH',
  },
  {
    pattern: /(?:sk_live_|pk_live_|rk_live_)/gi,
    message: 'Chave do Stripe de produção encontrada no código',
    severity: 'CRITICAL',
  },
  {
    pattern: /(?:AIza[0-9A-Za-z\-_]{35})/gi,
    message: 'Chave da API do Google encontrada no código',
    severity: 'CRITICAL',
  },
  {
    pattern: /(?:AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140})/gi,
    message: 'Chave do Firebase encontrada no código',
    severity: 'CRITICAL',
  },
  {
    pattern: /console\.(log|warn|error|debug)/gi,
    message: 'Console.log encontrado (pode vazar informações)',
    severity: 'MEDIUM',
  },
];

function checkEnvironmentVariables(env = 'development') {
  console.log(`\n🔍 Verificando variáveis de ambiente para ${env}...`);

  const requiredVars = REQUIRED_ENV_VARS[env] || [];
  const missing = [];
  const present = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });

  console.log(`✅ Variáveis presentes (${present.length}/${requiredVars.length}):`);
  present.forEach(v => console.log(`   - ${v}`));

  if (missing.length > 0) {
    console.log(`\n❌ Variáveis ausentes (${missing.length}):`);
    missing.forEach(v => console.log(`   - ${v}`));
    return false;
  }

  return true;
}

function scanFileForSecurityIssues(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    SECURITY_PATTERNS.forEach(({ pattern, message, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Ignorar arquivos de teste
          if (
            filePath.includes('test') ||
            filePath.includes('__tests__') ||
            filePath.includes('examples')
          ) {
            return;
          }

          issues.push({
            file: filePath,
            severity,
            message,
            match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
          });
        });
      }
    });

    return issues;
  } catch (error) {
    console.error(`Erro ao escanear ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath) {
  const issues = [];

  function scanRecursive(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Ignorar node_modules e outras pastas desnecessárias
        if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(item)) {
          scanRecursive(fullPath);
        }
      } else if (stat.isFile()) {
        // Escanear apenas arquivos de código
        if (/\.(ts|tsx|js|jsx|json)$/.test(item)) {
          const fileIssues = scanFileForSecurityIssues(fullPath);
          issues.push(...fileIssues);
        }
      }
    });
  }

  scanRecursive(dirPath);
  return issues;
}

function generateSecurityReport() {
  console.log('🛡️ Iniciando auditoria de segurança...');
  console.log('='.repeat(50));

  // Verificar variáveis de ambiente
  const envCheck = checkEnvironmentVariables(process.env.NODE_ENV || 'development');

  // Escanear código fonte
  console.log('\n🔍 Escaneando código fonte...');
  const srcPath = path.join(__dirname, '..', 'src');
  const issues = scanDirectory(srcPath);

  // Agrupar issues por severidade
  const groupedIssues = {
    CRITICAL: issues.filter(i => i.severity === 'CRITICAL'),
    HIGH: issues.filter(i => i.severity === 'HIGH'),
    MEDIUM: issues.filter(i => i.severity === 'MEDIUM'),
  };

  // Gerar relatório
  console.log('\n📊 RELATÓRIO DE SEGURANÇA');
  console.log('='.repeat(50));

  Object.entries(groupedIssues).forEach(([severity, severityIssues]) => {
    if (severityIssues.length > 0) {
      console.log(`\n🚨 ${severity} (${severityIssues.length} issues):`);
      severityIssues.forEach(issue => {
        console.log(`   📁 ${path.relative(srcPath, issue.file)}`);
        console.log(`   ⚠️  ${issue.message}`);
        console.log(`   🔍 ${issue.match}`);
        console.log('');
      });
    }
  });

  // Resumo final
  const totalIssues = issues.length;
  const criticalCount = groupedIssues.CRITICAL.length;

  console.log('\n📋 RESUMO:');
  console.log(`   Total de issues: ${totalIssues}`);
  console.log(`   Críticos: ${criticalCount}`);
  console.log(`   Altos: ${groupedIssues.HIGH.length}`);
  console.log(`   Médios: ${groupedIssues.MEDIUM.length}`);
  console.log(`   Variáveis de ambiente: ${envCheck ? '✅ OK' : '❌ Faltando'}`);

  if (criticalCount > 0) {
    console.log('\n❌ AÇÃO NECESSÁRIA: Issues críticos encontrados!');
    console.log('   Corrija os problemas críticos antes do deploy.');
    return false;
  } else if (totalIssues > 0) {
    console.log('\n⚠️ ATENÇÃO: Issues de segurança encontrados.');
    console.log('   Recomenda-se corrigir antes do deploy.');
  } else {
    console.log('\n✅ Nenhum issue crítico de segurança encontrado!');
  }

  return criticalCount === 0;
}

function createSecureEnvTemplate() {
  const envTemplate = `# Configurações do Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Configurações do Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_secret

# Produção (apenas para referência - usar em .env.production)
# EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_your_live_key
# STRIPE_SECRET_KEY_PROD=sk_live_your_live_secret

# Outros serviços
SENTRY_DSN=your_sentry_dsn
ONESIGNAL_APP_ID=your_onesignal_app_id
`;

  const envPath = path.join(__dirname, '..', '.env.template');
  fs.writeFileSync(envPath, envTemplate);
  console.log(`\n📝 Template .env criado em: ${envPath}`);
}

if (require.main === module) {
  const isSecure = generateSecurityReport();
  createSecureEnvTemplate();

  process.exit(isSecure ? 0 : 1);
}

module.exports = {
  checkEnvironmentVariables,
  scanFileForSecurityIssues,
  generateSecurityReport,
};
