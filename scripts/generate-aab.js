const { execSync } = require('child_process');
const fs = require('fs');

/**
 * 🤖 Script para Gerar AAB (Somente Android)
 * Missão: Sincronizar build, commitar com tag [release] e disparar apenas o pipeline Android.
 */
function generateAAB() {
  console.log('🤖 [PRE-BUILD] Iniciando orquestração para gerar AAB (Android)...');

  try {
    // 1. Sincronizar Build Number (EAS <-> Apple/Google)
    console.log('📊 [SYNC] Sincronizando números de build...');
    execSync('node scripts/sync-build-with-apple.js', { stdio: 'inherit' });

    // 2. Ler buildNumber atualizado do app.json
    const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
    const versionCode = appJson.expo.android.versionCode;
    const version = appJson.expo.version;

    console.log(`✅ [READY] Versão: ${version} | VersionCode: ${versionCode}`);

    // 3. Preparar Commit de Release
    console.log('📝 [GIT] Preparando commit de release para Android...');
    execSync('git add .', { stdio: 'inherit' });
    
    const commitMsg = `build: gerar aab v${version} build ${versionCode} [release] [android-only]`;
    
    // 4. Commitar e Push
    console.log(`🚀 [PUSH] Disparando pipeline Android com tag: [release]`);
    try {
      execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('------------------------------------------------------------');
      console.log('🎯 [SUCESSO] Build Android disparado!');
      console.log('💡 Dica: Embora o iOS também possa triggar, o foco é o Android.');
      console.log('🔗 Link: https://github.com/vantuilsilva/AcucaradasEncomendas/actions');
      console.log('------------------------------------------------------------');
    } catch (e) {
      if (e.message.includes('nothing to commit')) {
        console.log('⚠️ [SKIP] Nada para commitar. Forçando push para garantir trigger...');
        execSync('git commit --allow-empty -m "build: forçar trigger aab [release] [android-only]"', { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });
      } else {
        throw e;
      }
    }

  } catch (error) {
    console.error('❌ [ERRO] Falha ao disparar build Android:', error.message);
    process.exit(1);
  }
}

generateAAB();
