const fs = require('fs');
const path = require('path');

/**
 * 🛡️ BuildNumberEnforcer - Missão: Build 1190 Blindado
 * Garante que o build number 1190 seja usado sem falhas.
 */

function enforce() {
  const projectRoot = process.cwd();
  const appJsonPath = path.join(projectRoot, 'app.json');
  const statePath = path.join(projectRoot, 'version-state.json');

  const finalBN = 1190;
  const version = "1.1.8";

  console.log(`🚀 [ENFORCE] Forçando Build Number: ${finalBN} e Versão: ${version}`);

  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    appJson.expo.version = version;
    appJson.expo.ios.buildNumber = finalBN.toString();
    appJson.expo.android.versionCode = finalBN;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('✅ [OK] app.json atualizado.');
  }

  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.version = version;
    state.buildNumber = finalBN.toString();
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log('✅ [OK] version-state.json atualizado.');
  }

  console.log(`🎯 [RESULT] Missão cumprida: Build 1190 Ativado.`);
}

enforce();
