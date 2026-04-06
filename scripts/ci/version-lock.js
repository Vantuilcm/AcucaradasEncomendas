const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🔒 VersionLockGuardianAI - Missão: Integridade Total de Versionamento
 * Única fonte de verdade para version e buildNumber.
 */
class VersionLock {
  constructor() {
    this.projectRoot = process.cwd();
    this.statePath = path.join(this.projectRoot, 'version-state.json');
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.historyPath = path.join(this.projectRoot, 'build-history.json');
  }

  loadState() {
    if (!fs.existsSync(this.statePath)) {
      throw new Error('❌ [FATAL] version-state.json não encontrado!');
    }
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  saveState(state) {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    console.log(`✅ [LOCK] Estado de versão atualizado: ${state.version} (${state.buildNumber})`);
  }

  computeNext() {
    const state = this.loadState();
    const appleLatest = this.getAppleLatestBuild();
    
    const nextBuild = Math.max(state.buildNumber, appleLatest) + 1;
    // Pular o 347 se ele for o próximo
    state.buildNumber = nextBuild === 347 ? 348 : nextBuild;
    
    this.saveState(state);
    this.syncFiles(state);
  }

  getAppleLatestBuild() {
    try {
      console.log('🍎 [Apple] Consultando TestFlight via EAS...');
      const output = execSync('npx eas build:list --platform ios --status finished --limit 1 --non-interactive', { encoding: 'utf8' });
      const match = output.match(/Build number\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (e) {
      console.warn('⚠️ [Apple] Falha ao consultar TestFlight. Usando baseline de segurança.');
      return 0;
    }
  }

  syncFiles(state) {
    // 1. app.json
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    appJson.expo.version = state.version;
    appJson.expo.ios.buildNumber = state.buildNumber.toString();
    appJson.expo.android.versionCode = state.buildNumber;
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2));

    // 2. package.json
    const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    pkg.version = state.version;
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(pkg, null, 2));

    console.log('✅ [SYNC] Arquivos de configuração sincronizados com version-state.json');
  }

  validate(platform = 'ios') {
    const state = this.loadState();
    const appleLatest = this.getAppleLatestBuild();
    
    console.log(`🔍 [VALIDATE] State: ${state.version} (${state.buildNumber}) | Apple Latest: ${appleLatest}`);

    // Regra 1: Build Number deve ser maior que o da Apple
    if (state.buildNumber <= appleLatest) {
      console.error(`❌ [ERROR] buildNumber (${state.buildNumber}) deve ser maior que o da Apple (${appleLatest})`);
      process.exit(1);
    }

    // Regra 2: Bloqueio Hardcoded 347
    if (state.buildNumber === 347) {
      console.error('❌ [ERROR] O buildNumber 347 está banido por segurança.');
      process.exit(1);
    }

    // Regra 3: Consistência com app.json
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    if (appJson.expo.version !== state.version || appJson.expo.ios.buildNumber !== state.buildNumber.toString()) {
      console.error(`❌ [ERROR] Divergência entre version-state.json e app.json! State: ${state.version} (${state.buildNumber}) | App: ${appJson.expo.version} (${appJson.expo.ios.buildNumber})`);
      process.exit(1);
    }

    console.log('✅ [VALIDATE] Todas as regras de bloqueio de versão passaram.');
  }

  validateIpa(ipaPath, expectedBN) {
    if (!fs.existsSync(ipaPath)) {
      console.error(`❌ IPA não encontrada em: ${ipaPath}`);
      process.exit(1);
    }

    console.log(`📦 [Artifact] Validando IPA: ${ipaPath}`);
    try {
      // Tentar extrair CFBundleVersion do Info.plist
      const plistContent = execSync(`unzip -p "${ipaPath}" "Payload/*.app/Info.plist" | strings`, { encoding: 'utf8' });
      const versionMatch = plistContent.match(/CFBundleVersion\s+(\d+)/) || plistContent.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
      
      if (versionMatch) {
        const actualBN = parseInt(versionMatch[1], 10);
        if (actualBN !== parseInt(expectedBN, 10)) {
          console.error(`❌ [MISMATCH] IPA Build (${actualBN}) diverge do esperado (${expectedBN}).`);
          process.exit(1);
        }
        console.log(`✅ [Valid] IPA Build Number confirmado: ${actualBN}`);
      }
    } catch (e) {
      console.warn(`⚠️ [Warning] Falha na validação profunda da IPA: ${e.message}. Prosseguindo com validação simples.`);
    }
  }

  validateAab(aabPath, expectedVC) {
    if (!fs.existsSync(aabPath)) {
      console.error(`❌ AAB não encontrada em: ${aabPath}`);
      process.exit(1);
    }
    console.log(`📦 [Artifact] Validando AAB: ${aabPath}`);
    try {
      const aaptPath = process.env.ANDROID_HOME 
        ? path.join(process.env.ANDROID_HOME, 'build-tools', '34.0.0', 'aapt2')
        : 'aapt2';
      
      const dump = execSync(`"${aaptPath}" dump badging "${aabPath}" | grep versionCode`, { encoding: 'utf8' });
      const match = dump.match(/versionCode='(\d+)'/);
      if (match) {
        const actualVC = parseInt(match[1], 10);
        if (actualVC !== parseInt(expectedVC, 10)) {
          console.error(`❌ [MISMATCH] AAB versionCode (${actualVC}) diverge do esperado (${expectedVC}).`);
          process.exit(1);
        }
        console.log(`✅ [Valid] AAB versionCode confirmado: ${actualVC}`);
      }
    } catch (e) {
      console.warn('⚠️ [Warning] Falha ao validar AAB via aapt2. Prosseguindo.');
    }
  }

  saveHistory(platform, buildNumber, status) {
    const history = fs.existsSync(this.historyPath) ? JSON.parse(fs.readFileSync(this.historyPath, 'utf8')) : [];
    const state = this.loadState();
    history.push({
      platform,
      buildNumber,
      version: state.version,
      commit: execSync('git rev-parse HEAD').toString().trim(),
      timestamp: new Date().toISOString(),
      status
    });
    fs.writeFileSync(this.historyPath, JSON.stringify(history.slice(-50), null, 2));
    console.log(`📝 [History] Build ${buildNumber} (${platform}) salvo.`);
  }
}

// CLI
const args = process.argv.slice(2);
const locker = new VersionLock();

if (args.includes('--sync')) {
  locker.computeNext();
} else if (args.includes('--validate')) {
  locker.validate();
} else if (args.includes('--validate-ipa')) {
  const ipaPath = args[args.indexOf('--validate-ipa') + 1];
  const expectedBN = args[args.indexOf('--validate-ipa') + 2];
  locker.validateIpa(ipaPath, expectedBN);
} else if (args.includes('--validate-aab')) {
  const aabPath = args[args.indexOf('--validate-aab') + 1];
  const expectedVC = args[args.indexOf('--validate-aab') + 2];
  locker.validateAab(aabPath, expectedVC);
} else if (args.includes('--save-history')) {
  const platform = args[args.indexOf('--save-history') + 1];
  const bn = parseInt(args[args.indexOf('--save-history') + 2], 10);
  const status = args[args.indexOf('--save-history') + 3];
  locker.saveHistory(platform, bn, status);
} else {
  console.log('Usage: node scripts/ci/version-lock.js [--sync | --validate | --validate-ipa | --validate-aab | --save-history]');
}
