const { execSync } = require('child_process');
const fs = require('fs');

/**
 * 🚀 Script Definitivo para Gerar IPA (Local-First Workflow)
 * Missão: Sincronizar build, commitar com tag [release] e disparar pipeline.
 */
function generateIPA() {
  console.log('🚀 [PRE-BUILD] Iniciando orquestração para gerar IPA definitiva...');

  try {
    // 1. Sincronizar Build Number (EAS <-> Apple)
    console.log('📊 [SYNC] Sincronizando números de build...');
    execSync('node scripts/sync-build-with-apple.js', { stdio: 'inherit' });

    // 2. Ler buildNumber atualizado do app.json
    const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
    const buildNumber = appJson.expo.ios.buildNumber;
    const version = appJson.expo.version;

    console.log(`✅ [READY] Versão: ${version} | Build: ${buildNumber}`);

    // 3. Preparar Commit de Release
    console.log('📝 [GIT] Preparando commit de release...');
    execSync('git add .', { stdio: 'inherit' });
    
    const commitMsg = `build: gerar ipa v${version} build ${buildNumber} [release]`;
    
    // 4. Commitar e Push (REMOVIDO AUTO-PUSH PARA SINGLE TRIGGER)
    console.log(`🚀 [PUSH] Preparando pipeline com tag: [release]`);
    try {
      console.log('🧹 [GIT] Garantindo sincronia local...');
      execSync('git add .', { stdio: 'inherit' });
      try {
        execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
        console.log('✅ [GIT] Alterações commitadas localmente.');
      } catch (e) {
        console.log('ℹ️ [GIT] Nada novo para commitar.');
      }

      console.log('------------------------------------------------------------');
      console.log('🎯 [SUCESSO] Build preparado localmente!');
      console.log('👉 EXECUTE MANUALMENTE PARA DISPARAR: git push origin main');
      console.log('------------------------------------------------------------');
    } catch (error) {
      console.error('❌ [ERRO] Falha na preparação Git:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ [ERRO] Falha ao disparar build:', error.message);
    process.exit(1);
  }
}

generateIPA();
