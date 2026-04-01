/**
 * 🧪 scripts/validate-env.js
 * Valida variáveis de ambiente CRÍTICAS antes do build começar.
 * Se faltar algo essencial, o build falha imediatamente (Fail Fast).
 */

const requiredEnvVars = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_PROJECT_ID',
  'EXPO_PUBLIC_APP_NAME',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_ONESIGNAL_APP_ID',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

const forbiddenEnvVars = [
  'FIREBASE_API_KEY',
  'STRIPE_SECRET_KEY',
  'JWT_SECRET'
];

let hasError = false;

console.log('🔍 [VALIDATE-ENV] Iniciando auditoria de ambiente...');

// 1. Validar Obrigatórios
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ [ERRO] Variável obrigatória ausente: ${varName}`);
    hasError = true;
  } else {
    console.log(`✅ [OK] ${varName} detectada.`);
  }
});

// 2. Validar Proibidos (Segurança)
forbiddenEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.warn(`⚠️ [SEGURANÇA] Variável sensível detectada no ambiente: ${varName}. Certifique-se de que ela não está sendo injetada no bundle do cliente.`);
  }
});

if (hasError) {
  console.error('\n🚨 [CRITICAL] Build interrompido: Variáveis de ambiente incompletas.');
  console.error('💡 DICA: Adicione os segredos faltantes no GitHub Secrets ou no seu arquivo .env local.');
  process.exit(1);
} else {
  console.log('\n🚀 [SUCCESS] Ambiente validado com sucesso. Seguindo com o build...');
  process.exit(0);
}
