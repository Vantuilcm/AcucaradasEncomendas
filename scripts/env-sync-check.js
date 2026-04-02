/**
 * 🛡️ scripts/env-sync-check.js
 * Missão: Garantir sincronização absoluta entre .env.production.template e GitHub Secrets.
 * Se uma variável existir no template mas não no process.env, o build falha.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../.env.production.template');

function log(msg) {
    console.log(`🔍 [ENV-SYNC] ${msg}`);
}

function check() {
    log('Iniciando auditoria de sincronização de ambiente...');

    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error(`❌ [ERRO] Template ${TEMPLATE_PATH} não encontrado.`);
        process.exit(1);
    }

    const templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    // Extrair apenas as chaves (ignorar comentários e linhas vazias)
    const requiredKeys = templateContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('=')[0].trim())
        .filter(key => key !== '');

    let missingKeys = [];

    requiredKeys.forEach(key => {
        // Ignorar variáveis que já possuem fallback no pipeline
        if (key === 'EXPO_PUBLIC_PROJECT_ID' || key === 'EXPO_PUBLIC_APP_NAME') {
            return;
        }
        
        if (!process.env[key]) {
            missingKeys.push(key);
        }
    });

    if (missingKeys.length > 0) {
        console.error('\n🚨 [CRITICAL] Sincronização de Ambiente Falhou!');
        console.error('As seguintes variáveis estão no template mas NÃO foram encontradas no ambiente:');
        missingKeys.forEach(key => console.error(`   ❌ ${key}`));
        console.error('\n💡 AÇÃO NECESSÁRIA: Adicione estas chaves nos Secrets do GitHub ou no seu arquivo .env local.');
        process.exit(1);
    }

    log(`✅ [SUCCESS] Todas as ${requiredKeys.length} variáveis do template estão presentes. Sincronização OK.`);
    process.exit(0);
}

try {
    check();
} catch (error) {
    console.error('❌ [FALHA CRÍTICA] Erro inesperado no sync-check:', error.message);
    process.exit(1);
}
