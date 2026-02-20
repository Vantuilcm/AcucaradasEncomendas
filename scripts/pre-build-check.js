const fs = require('fs');
const path = require('path');

const criticalFiles = [
  'src/contexts/AuthContext.tsx',
  'src/components/ScreenshotProtection.tsx',
  'src/monitoring/AppSecurityMonitoring.ts',
  'src/services/AppSecurityService.ts',
  'src/utils/SecurityUtils.ts',
  'src/utils/SecurityUtils.ios.ts',
  'src/utils/SecurityUtils.android.ts',
  'metro.config.js',
  'eas.json',
  'app.json',
  'scripts/verify-build-readiness.js',
  'scripts/fix-entitlements.js'
];

const expoConfigs = ['app.json', 'app.config.js', 'app.config.ts'];

console.log('🔍 Iniciando pré-validação do build iOS...');

let missingFiles = [];

criticalFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Arquivo encontrado: ${file}`);
  } else {
    console.log(`❌ Arquivo FALTANDO: ${file}`);
    missingFiles.push(file);
  }
});

const foundExpoConfig = expoConfigs.some(config => {
  const fullPath = path.resolve(__dirname, '..', config);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ Configuração do Expo encontrada: ${config}`);
    return true;
  }
  return false;
});

if (!foundExpoConfig) {
  console.log(`❌ Nenhuma configuração do Expo encontrada (${expoConfigs.join(', ')})`);
  missingFiles.push('app.json/app.config.js/ts');
}

if (missingFiles.length > 0) {
  console.error('\n🚨 Erro crítico: O build será interrompido devido a arquivos faltando.');
  process.exit(1);
}

// Verificar Variáveis de Ambiente Críticas
const criticalEnvVars = [
  'EXPO_PUBLIC_ONESIGNAL_APP_ID',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

console.log('\n🔐 Verificando variáveis de ambiente...');
criticalEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Aviso: Variável de ambiente ${envVar} não definida. Isso pode causar falhas em tempo de execução.`);
  } else {
    console.log(`✅ Variável de ambiente ${envVar} encontrada.`);
  }
});

// Verificar Entitlements de App Group (OneSignal)
const appJsonPath = path.resolve(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
  if (!appJsonContent.includes('onesignal-expo-plugin')) {
    console.error('❌ ERRO CRÍTICO: onesignal-expo-plugin não encontrado no app.json!');
    process.exit(1);
  }
} else {
  const appConfigPath = path.resolve(__dirname, '..', 'app.config.ts');
  if (fs.existsSync(appConfigPath)) {
    const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
    if (!appConfigContent.includes('onesignal-expo-plugin')) {
      console.error('❌ ERRO CRÍTICO: onesignal-expo-plugin não encontrado no app.config.ts!');
      process.exit(1);
    }
  }
}

console.log('\n🚀 Ambiente validado com sucesso! Iniciando build...');
process.exit(0);
