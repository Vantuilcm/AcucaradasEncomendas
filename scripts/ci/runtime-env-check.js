const fs = require('fs');
const path = require('path');

/**
 * 🕵️ RuntimeCrashDetectorAI - Missão: Validação de Variáveis Críticas
 * Impede builds se as variáveis de ambiente essenciais para o funcionamento do app estiverem ausentes.
 */

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_ONESIGNAL_APP_ID',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

function checkEnv() {
  console.log('🔍 [RUNTIME-CHECK] Validando variáveis de ambiente críticas...');
  
  const missing = [];
  
  REQUIRED_ENV_VARS.forEach(v => {
    if (!process.env[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error('❌ [FATAL-ENV] Faltam variáveis de ambiente críticas para o funcionamento do app:');
    missing.forEach(m => console.error(`   - ${m}`));
    console.error('💡 Verifique os Secrets do GitHub ou o arquivo .env');
    process.exit(1);
  }

  console.log('✅ [OK] Todas as variáveis críticas detectadas.');
}

checkEnv();
