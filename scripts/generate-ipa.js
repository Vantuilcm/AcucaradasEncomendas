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
    
    // 4. Commitar e Push
    console.log(`🚀 [PUSH] Disparando pipeline com tag: [release]`);
    try {
      // 4.1 Garantir que não existam outros commits locais [release] pendentes
      console.log('🧹 [GIT] Sincronizando com remote antes do push...');
      execSync('git pull --rebase origin main', { stdio: 'inherit' });

      execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('------------------------------------------------------------');
      console.log('🎯 [SUCESSO] Build disparado! Acompanhe no GitHub Actions.');
      console.log(`🔗 Link: https://github.com/vantuilsilva/AcucaradasEncomendas/actions`);
      console.log('------------------------------------------------------------');
    } catch (e) {
      if (e.message.includes('nothing to commit')) {
        console.log('⚠️ [SKIP] Nada para commitar. Forçando push para garantir trigger...');
        execSync('git commit --allow-empty -m "build: forçar trigger ipa [release]"', { stdio: 'inherit' });
        execSync('git push origin main', { stdio: 'inherit' });
      } else {
        throw e;
      }
    }

  } catch (error) {
    console.error('❌ [ERRO] Falha ao disparar build:', error.message);
    process.exit(1);
  }
}

generateIPA();
