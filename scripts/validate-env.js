const fs = require('fs');
const path = require('path');

console.log('🔍 [ReleaseGuardian] Validando variáveis de ambiente críticas antes do build...');

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

let envContent = '';
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const missingVars = [];

requiredVars.forEach(varName => {
  // Verifica se a variável está no process.env (ex: no EAS) ou no arquivo .env local
  const isInEnvFile = envContent.includes(`${varName}=`);
  const isInProcessEnv = !!process.env[varName];

  if (!isInEnvFile && !isInProcessEnv) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA/CONFIGURAÇÃO:');
  console.error('As seguintes variáveis de ambiente obrigatórias não foram encontradas:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPor favor, configure estas variáveis no arquivo .env local ou no painel de Secrets do EAS.');
  console.error('O build foi abortado para evitar a geração de um app quebrado.\n');
  process.exit(1); // Falha o processo e bloqueia o build
}

console.log('✅ [ReleaseGuardian] Variáveis de ambiente validadas com sucesso. Ambiente seguro!');
