const fs = require('fs');
const path = require('path');

console.log('🔍 [RellBuild] Validando ambiente e variáveis críticas antes do build...');

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_ONESIGNAL_APP_ID',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

const requiredFiles = [
  'google-services.json',
  'GoogleService-Info.plist'
];

let envContent = '';
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const missingVars = [];
const missingFiles = [];

// 1. Check for required environment variables
requiredVars.forEach(varName => {
  const isInEnvFile = envContent.includes(`${varName}=`);
  const isInProcessEnv = !!process.env[varName];

  if (!isInEnvFile && !isInProcessEnv) {
    missingVars.push(varName);
  }
});

// 2. Check for required config files
requiredFiles.forEach(fileName => {
  const filePath = path.resolve(__dirname, '../', fileName);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(fileName);
  }
});

if (missingVars.length > 0 || missingFiles.length > 0) {
  console.error('\n❌ ERRO CRÍTICO RellBuild:');
  
  if (missingVars.length > 0) {
    console.error('As seguintes variáveis de ambiente obrigatórias não foram encontradas:');
    missingVars.forEach(v => console.error(`   - ${v}`));
  }

  if (missingFiles.length > 0) {
    console.error('Os seguintes arquivos de configuração obrigatórios não foram encontrados:');
    missingFiles.forEach(f => console.error(`   - ${f}`));
  }

  console.error('\nO build foi abortado por falha na integridade do ambiente.');
  process.exit(1);
}

console.log('✅ [RellBuild] Integridade do ambiente confirmada. Procedendo...');
