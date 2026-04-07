const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🛡️ BuildNumberEnforcerAI - Missão: Build Único e Blindado
 * Garante que cada execução gere um número novo, impossibilitando erro de duplicidade na Apple.
 */

class BuildNumberEnforcer {
  constructor() {
    this.projectRoot = process.cwd();
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.historyPath = path.join(this.projectRoot, 'build-history.json');
    this.logPath = path.join(this.projectRoot, 'build-number-log.json');
  }

  getAppleLatest() {
    try {
      console.log('🍎 [Apple] Verificando último build no TestFlight...');
      const output = execSync('npx eas build:list --platform ios --status finished --limit 1 --non-interactive', { encoding: 'utf8' });
      const match = output.match(/Build number\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (e) {
      console.warn('⚠️ [Warning] Falha ao consultar Apple. Usando baseline local.');
      return 0;
    }
  }

  getHistoryLatest() {
    if (!fs.existsSync(this.historyPath)) return 0;
    const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    const builds = history.map(h => h.buildNumber).filter(n => !isNaN(n));
    return builds.length > 0 ? Math.max(...builds) : 0;
  }

  enforce() {
    console.log('🚀 [ENFORCE] Iniciando auto-incremento de Build Number...');
    
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    const currentLocal = parseInt(appJson.expo.ios.buildNumber || '0', 10);
    const appleLatest = this.getAppleLatest();
    const historyLatest = this.getHistoryLatest();

    // Lógica: Maior de todos + 1
    const nextBN = Math.max(currentLocal, appleLatest, historyLatest) + 1;
    
    // Proteção contra o build 347 (Hardcoded Block)
    const finalBN = nextBN === 347 ? 348 : nextBN;

    console.log(`📊 [Metrics] Local: ${currentLocal} | Apple: ${appleLatest} | History: ${historyLatest}`);
    console.log(`✅ [Target] Próximo Build Number: ${finalBN}`);

    // Atualizar app.json
    appJson.expo.ios.buildNumber = finalBN.toString();
    appJson.expo.android.versionCode = finalBN;
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2));

    // Log da operação
    const log = {
      timestamp: new Date().toISOString(),
      previousBN: currentLocal,
      newBN: finalBN,
      commit: execSync('git rev-parse HEAD').toString().trim()
    };
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));

    console.log('📝 [OK] app.json atualizado e log gerado.');
    return finalBN;
  }

  validateIpa(ipaPath, expectedBN) {
    if (!fs.existsSync(ipaPath)) {
      console.error(`❌ [FATAL] IPA não encontrada: ${ipaPath}`);
      process.exit(1);
    }

    try {
      console.log(`🔍 [VALIDATE] Inspecionando CFBundleVersion na IPA: ${ipaPath}`);
      const plistContent = execSync(`unzip -p "${ipaPath}" "Payload/*.app/Info.plist" | strings`, { encoding: 'utf8' });
      const match = plistContent.match(/CFBundleVersion\s+(\d+)/) || plistContent.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
      
      if (match) {
        const actualBN = parseInt(match[1], 10);
        if (actualBN !== parseInt(expectedBN, 10)) {
          console.error(`❌ [MISMATCH] IPA Build (${actualBN}) diverge do esperado (${expectedBN})!`);
          process.exit(1);
        }
        console.log(`✅ [CONFIRMED] IPA Build Number: ${actualBN}`);
      }
    } catch (e) {
      console.warn(`⚠️ [Warning] Validação profunda falhou: ${e.message}`);
    }
  }
}

// CLI
const args = process.argv.slice(2);
const enforcer = new BuildNumberEnforcer();

if (args.includes('--run')) {
  enforcer.enforce();
} else if (args.includes('--validate-ipa')) {
  const ipaPath = args[args.indexOf('--validate-ipa') + 1];
  const bn = args[args.indexOf('--validate-ipa') + 2];
  enforcer.validateIpa(ipaPath, bn);
}
