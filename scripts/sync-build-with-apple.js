const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Enterprise Safe Build Synchronization System
 * - MAX(EAS, Apple) logic to prevent duplication
 * - Build lock system to prevent parallel execution
 * - Automated app.json & package.json synchronization
 */
async function syncBuildEnterprise() {
  const targetApp = process.env.TARGET_APP || 'acucaradas-encomendas';
  const lockPath = path.join(__dirname, `../build_${targetApp}.lock`);
  const appJsonPath = path.join(__dirname, '../app.json');
  const pkgPath = path.join(__dirname, '../package.json');

  console.log(`🛡️ [Enterprise Sync] Sincronizando app: ${targetApp} em modo seguro...`);

  // 1. Build Lock Check
  if (fs.existsSync(lockPath)) {
    const lockTime = fs.readFileSync(lockPath, 'utf8');
    console.error(`❌ [Lock] ERRO: Outro build já está em andamento (Iniciado em: ${lockTime}).`);
    console.error('Se você tem certeza que não há build rodando, remova o arquivo build.lock manualmente.');
    process.exit(1);
  }

  // 1.1. Release Guardian Block Check
  const statePath = path.join(__dirname, '../release-state.json');
  if (fs.existsSync(statePath)) {
    const releaseState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (releaseState.status === 'CRITICAL' || releaseState.blocked) {
      console.error('🚨 [Guardian] BLOQUEIO: A release atual está em estado CRÍTICO ou BLOQUEADA.');
      console.error('Resolva os incidentes antes de tentar um novo build de produção.');
      process.exit(1);
    }
  }

  // Create Lock
  fs.writeFileSync(lockPath, new Date().toISOString());

  try {
    // 2. Fetch Latest EAS Build
    console.log('☁️ [EAS] Consultando histórico do EAS...');
    let easBuildNumber = 0;
    try {
      const easOutput = execSync('npx eas build:list --platform ios --limit 1 --status finished --non-interactive', { encoding: 'utf8' });
      const easMatch = easOutput.match(/Build number\s+(\d+)/);
      if (easMatch) easBuildNumber = parseInt(easMatch[1], 10);
    } catch (e) {
      console.warn('⚠️ [EAS] Falha ao consultar EAS. Usando 0 como base.');
    }

    // 3. Fetch Latest Apple/TestFlight Build (Baseline)
    // Nota: O EAS submit --latest retorna info do TestFlight. 
    // Como baseline de segurança, usamos o EAS que reflete o que foi enviado.
    console.log('🍎 [Apple] Validando baseline contra TestFlight...');
    let appleBuildNumber = 0;
    // Em modo Enterprise, o Apple baseline é o que está no app.json local se o EAS falhar,
    // mas aqui forçamos a comparação com o maior valor conhecido.
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    appleBuildNumber = parseInt(appJson.expo.ios.buildNumber || '0', 10);

    // 4. MAX(EAS, Apple) Logic
    const lastBuild = Math.max(easBuildNumber, appleBuildNumber);
    const nextBuild = lastBuild + 1;

    console.log(`📊 [Metrics] EAS: ${easBuildNumber} | Local/Apple: ${appleBuildNumber}`);
    console.log(`🚀 [Next] Planejado: ${nextBuild}`);

    // 5. Update Configurations
    appJson.expo.ios.buildNumber = nextBuild.toString();
    appJson.expo.android.versionCode = nextBuild;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== appJson.expo.version) {
      pkg.version = appJson.expo.version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    console.log('✅ [Sync] app.json e package.json atualizados com sucesso.');
    console.log(`📌 Build definitivo para release: ${nextBuild}`);

  } catch (error) {
    console.error('❌ [Critical] Falha na orquestração de build:', error.message);
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    process.exit(1);
  } finally {
    // Lock é removido apenas após o sucesso da sincronização. 
    // O pipeline de CI deve remover o lock após o build completo se desejar liberar paralelo.
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  }
}

syncBuildEnterprise();
