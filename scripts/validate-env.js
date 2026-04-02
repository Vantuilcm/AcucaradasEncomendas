/**
 * 🧪 scripts/validate-env.js
 * Valida variáveis de ambiente CRÍTICAS antes do build começar.
 * Se faltar algo essencial, o build falha imediatamente (Fail Fast).
 */

const requiredEnvVars = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_TOKEN',
  'EXPO_APPLE_TEAM_ID',
  'EXPO_ASC_ISSUER_ID',
  'EXPO_ASC_KEY_ID',
  'EXPO_ASC_PRIVATE_KEY_BASE64'
];

const forbiddenEnvVars = [
  'EXPO_APP_STORE_CONNECT_API_KEY' // Obsoleta e perigosa por conflito
];

let hasError = false;

console.log('🔍 [VALIDATE-ENV] Iniciando auditoria de ambiente baseada nos secrets do GitHub...');

// 1. Validar Obrigatórios e Formato
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    console.error(`❌ [ERRO] Variável obrigatória ausente ou vazia: ${varName}`);
    hasError = true;
  } else {
    // Validação extra para chaves Base64
    if (varName === 'EXPO_ASC_PRIVATE_KEY_BASE64') {
      const cleanValue = value.replace(/\s/g, '');
      // Se contiver os delimitadores PEM, é válido mas com ressalva
      const isPem = value.includes('BEGIN PRIVATE KEY');
      
      // Permitir Base64 padrão e URL-safe (- e _)
      const isBase64 = /^[A-Za-z0-9+/=_ -]+$/.test(cleanValue);
      
      if (!isBase64 && !isPem) {
        console.error(`❌ [ERRO] Formato inválido para ${varName}: Não é um Base64 nem PEM válido.`);
        hasError = true;
      } else if (isPem) {
        console.log(`⚠️ [WARN] ${varName} detectada como formato PEM (RAW). O pipeline irá normalizar.`);
      } else {
        console.log(`✅ [OK] ${varName} detectada e validada (Base64).`);
      }
    } else {
      console.log(`✅ [OK] ${varName} detectada.`);
    }
  }
});

// 2. Validar Proibidos (Segurança/Conflito)
forbiddenEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.warn(`⚠️ [CONFLITO] Variável obsoleta detectada: ${varName}. Remova-a dos Secrets do GitHub para evitar falhas de autenticação.`);
  }
});

if (hasError) {
  console.error('\n🚨 [CRITICAL] Build interrompido: Variáveis de ambiente incompletas ou inválidas.');
  console.error('💡 DICA: Certifique-se de que EXPO_ASC_PRIVATE_KEY_BASE64 está em Base64.');
  process.exit(1);
} else {
  console.log('\n🚀 [SUCCESS] Ambiente validado com sucesso. Seguindo com o build...');
  process.exit(0);
}
