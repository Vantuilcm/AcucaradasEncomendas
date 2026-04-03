const fs = require('fs');
const path = require('path');

/**
 * scripts/version-bump.js - O Guardião do Versionamento
 * Missão: Controle absoluto do buildNumber e versionCode no app.json e app.config.js
 */

const APP_JSON_PATH = path.join(__dirname, '../app.json');
const CONFIG_JS_PATH = path.join(__dirname, '../app.config.js');

function log(msg) {
    console.log(`[VERSION-BUMP] ${msg}`);
}

function bump() {
    log('Iniciando incremento de build...');

    if (!fs.existsSync(APP_JSON_PATH)) {
        console.error(`❌ Erro: Arquivo ${APP_JSON_PATH} não encontrado.`);
        process.exit(1);
    }

    // 1. Atualizar app.json
    let appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    const currentBuild = parseInt(appJson.expo.ios.buildNumber, 10);
    const nextBuild = currentBuild + 1;

    log(`Build atual: ${currentBuild} -> Próximo: ${nextBuild}`);

    appJson.expo.ios.buildNumber = nextBuild.toString();
    appJson.expo.android.versionCode = nextBuild;
    
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
    log('✅ app.json atualizado com sucesso!');

    // 2. Atualizar app.config.js (se o buildNumber estiver hardcoded lá como fallback)
    if (fs.existsSync(CONFIG_JS_PATH)) {
        let configJs = fs.readFileSync(CONFIG_JS_PATH, 'utf8');
        if (configJs.includes('buildNumber || "')) {
            configJs = configJs.replace(/buildNumber\s*\|\|\s*["']\d+["']/, `buildNumber || "${nextBuild}"`);
            fs.writeFileSync(CONFIG_JS_PATH, configJs, 'utf8');
            log('✅ app.config.js fallback atualizado com sucesso!');
        }
    }

    log(`📊 Nova Versão Interna: ${nextBuild}`);
    
    // Exportar para o GitHub Actions se disponível
    if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `CURRENT_BN=${nextBuild}\n`);
        fs.appendFileSync(process.env.GITHUB_ENV, `BUILD_NUMBER=${nextBuild}\n`);
    }
}

bump();
