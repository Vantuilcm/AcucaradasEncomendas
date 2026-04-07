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
    this.integrityLogPath = path.join(this.projectRoot, 'build-integrity.json');
  }

  getAppleLatest() {
    try {
      console.log('🍎 [Apple] Verificando histórico de builds no EAS...');
      // Consultar os últimos 20 builds (incluindo falhas e erros) para capturar qualquer número usado
      const output = execSync('npx eas build:list --platform ios --limit 20 --non-interactive', { encoding: 'utf8' });
      const matches = output.matchAll(/Build number\s+(\d+)/g);
      let maxBN = 0;
      for (const match of matches) {
        const bn = parseInt(match[1], 10);
        if (bn > maxBN) maxBN = bn;
      }
      console.log(`🍎 [Apple] Maior Build Number detectado no EAS: ${maxBN}`);
      return maxBN;
    } catch (e) {
      console.warn('⚠️ [Warning] Falha ao consultar Apple. Usando baseline local.');
      return 0;
    }
  }

  getHistoryLatest() {
    let maxHistory = 0;
    
    // 1. Verificar build-history.json
    if (fs.existsSync(this.historyPath)) {
      try {
        const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
        const builds = history.map(h => h.buildNumber).filter(n => !isNaN(n));
        if (builds.length > 0) maxHistory = Math.max(maxHistory, ...builds);
      } catch (e) { console.warn('⚠️ Erro ao ler build-history.json'); }
    }

    // 2. Verificar version-state.json (Source of Truth do version-lock)
    const statePath = path.join(this.projectRoot, 'version-state.json');
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (state.buildNumber) maxHistory = Math.max(maxHistory, parseInt(state.buildNumber, 10));
      } catch (e) { console.warn('⚠️ Erro ao ler version-state.json'); }
    }

    return maxHistory;
  }

  enforce() {
    console.log('🚀 [ENFORCE] Iniciando auto-incremento de Build Number...');
    
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    const currentLocal = parseInt(appJson.expo.ios.buildNumber || '0', 10);
    const appleLatest = this.getAppleLatest();
    const historyLatest = this.getHistoryLatest();

    // Lógica: Maior de todos + 1 (Fonte de verdade absoluta)
    const baseline = Math.max(currentLocal, appleLatest, historyLatest, 500);
    const finalBN = baseline + 1;

    console.log(`📊 [Metrics] Local: ${currentLocal} | Apple: ${appleLatest} | History: ${historyLatest}`);
    console.log(`✅ [Target] Próximo Build Number: ${finalBN}`);

    // Atualizar app.json
    appJson.expo.ios.buildNumber = finalBN.toString();
    appJson.expo.android.versionCode = finalBN;
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2));

    // Sincronizar version-state.json
    const statePath = path.join(this.projectRoot, 'version-state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      state.buildNumber = finalBN;
      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      console.log('📝 [OK] version-state.json sincronizado.');
    }

    // Log de Integridade Inicial
    const integrity = {
      expectedBN: finalBN,
      actualIpaBN: null,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(this.integrityLogPath, JSON.stringify(integrity, null, 2));

    // Log da operação legado
    const log = {
      timestamp: new Date().toISOString(),
      previousBN: currentLocal,
      newBN: finalBN,
      commit: execSync('git rev-parse HEAD').toString().trim()
    };
    fs.writeFileSync(this.logPath, JSON.stringify(log, null, 2));

    console.log('📝 [OK] app.json atualizado e build-integrity.json inicializado.');
    return finalBN;
  }

  validateIpa(ipaPath, expectedBN) {
    if (!fs.existsSync(ipaPath)) {
      console.error(`❌ [FATAL] IPA não encontrada: ${ipaPath}`);
      process.exit(1);
    }

    try {
      console.log(`🔍 [VALIDATE] Inspecionando CFBundleVersion na IPA: ${ipaPath}`);
      // No macOS, unzip -p funciona bem. No Windows, teríamos problemas, mas esse script roda em CI (macOS)
      const plistContent = execSync(`unzip -p "${ipaPath}" "Payload/*.app/Info.plist" | strings`, { encoding: 'utf8' });
      const match = plistContent.match(/CFBundleVersion\s+(\d+)/) || plistContent.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
      
      if (match) {
        const actualBN = parseInt(match[1], 10);
        const expectedInt = parseInt(expectedBN, 10);

        // Atualizar Build Integrity Log
        const integrity = JSON.parse(fs.readFileSync(this.integrityLogPath, 'utf8'));
        integrity.actualIpaBN = actualBN;
        integrity.status = (actualBN === expectedInt) ? 'SUCCESS' : 'MISMATCH';
        integrity.timestamp = new Date().toISOString();
        fs.writeFileSync(this.integrityLogPath, JSON.stringify(integrity, null, 2));

        if (actualBN !== expectedInt) {
          console.error(`❌ [MISMATCH] IPA Build (${actualBN}) diverge do esperado (${expectedInt})!`);
          process.exit(1);
        }
        console.log(`✅ [CONFIRMED] IPA Build Number: ${actualBN}`);
      } else {
        throw new Error('Não foi possível localizar CFBundleVersion no Info.plist');
      }
    } catch (e) {
      console.warn(`⚠️ [Warning] Validação profunda falhou ou Info.plist não encontrado: ${e.message}`);
      process.exit(1);
    }
  }

  finalize(status) {
    if (fs.existsSync(this.integrityLogPath)) {
      const integrity = JSON.parse(fs.readFileSync(this.integrityLogPath, 'utf8'));
      integrity.submissionStatus = status;
      integrity.finalStatus = (integrity.status === 'SUCCESS' && status === 'SUCCESS') ? 'ENTERPRISE_READY' : 'FAILED';
      integrity.timestamp = new Date().toISOString();
      fs.writeFileSync(this.integrityLogPath, JSON.stringify(integrity, null, 2));
      console.log(`📝 [FINALIZE] build-integrity.json atualizado com status: ${status}`);
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
} else if (args.includes('--finalize')) {
  const status = args[args.indexOf('--finalize') + 1];
  enforcer.finalize(status);
}
