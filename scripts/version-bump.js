const fs = require('fs');
const path = require('path');

/**
 * scripts/version-bump.js - O Guardião do Versionamento
 * Missão: Controle absoluto do buildNumber e versionCode no app.config.ts
 */

const CONFIG_PATH = path.join(__dirname, '../app.config.ts');

function log(msg) {
    console.log(`[VERSION-BUMP] ${msg}`);
}

function bump() {
    log('Iniciando incremento de build...');

    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`❌ Erro: Arquivo ${CONFIG_PATH} não encontrado.`);
        process.exit(1);
    }

    let content = fs.readFileSync(CONFIG_PATH, 'utf8');

    // 1. Capturar buildNumber atual (iOS)
    const iosMatch = content.match(/buildNumber:\s*["'](\d+)["']/);
    if (!iosMatch) {
        console.error('❌ Erro: buildNumber não encontrado no app.config.ts');
        process.exit(1);
    }

    const currentBuild = parseInt(iosMatch[1], 10);
    const nextBuild = currentBuild + 1;

    log(`Build atual: ${currentBuild} -> Próximo: ${nextBuild}`);

    // 2. Atualizar buildNumber (iOS)
    content = content.replace(/buildNumber:\s*["']\d+["']/, `buildNumber: "${nextBuild}"`);

    // 3. Atualizar versionCode (Android) - Mantendo sincronia
    content = content.replace(/versionCode:\s*\d+/, `versionCode: ${nextBuild}`);

    // 4. Salvar arquivo
    fs.writeFileSync(CONFIG_PATH, content, 'utf8');

    log('✅ app.config.ts atualizado com sucesso!');
    log(`📊 Nova Versão Interna: ${nextBuild}`);
    
    // Exportar para o GitHub Actions se disponível
    if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `NEW_BUILD_NUMBER=${nextBuild}\n`);
    }
}

try {
    bump();
} catch (error) {
    console.error('❌ Falha crítica no version-bump:', error.message);
    process.exit(1);
}
