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
    // Adicionado floor de 876 para garantir que estamos longe de problemas passados (como 875)
    const baseline = Math.max(currentLocal, appleLatest, historyLatest, 876);
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

  validateIpa(ipaPath, expectedBN, expectedVersion, expectedBundleId) {
    if (!fs.existsSync(ipaPath)) {
      console.error(`❌ [FATAL] IPA não encontrada: ${ipaPath}`);
      process.exit(1);
    }

    const tmpDir = path.join(this.projectRoot, 'tmp-ipa-extract');
    const logDir = path.join(this.projectRoot, 'build-logs', 'acucaradas-encomendas');
    const validationLogPath = path.join(logDir, 'ipa-validation.json');
    
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    if (fs.existsSync(tmpDir)) execSync(`rm -rf "${tmpDir}"`);
    fs.mkdirSync(tmpDir, { recursive: true });

    console.log(`🔍 [VALIDATE] Iniciando validação profunda da IPA: ${ipaPath}`);
    
    try {
      // 1. Descompactar a IPA (Payload apenas para rapidez)
      console.log('📦 [UNZIP] Extraindo Payload...');
      execSync(`unzip -q "${ipaPath}" "Payload/*" -d "${tmpDir}"`);

      // 2. Localizar Info.plist dinamicamente (Garantindo que seja o principal do .app)
      console.log('📂 [FIND] Localizando Info.plist principal...');
      // Buscamos o Info.plist que está diretamente dentro de um diretório .app
      const infoPlistPath = execSync(`find "${tmpDir}/Payload" -maxdepth 3 -name "Info.plist" | grep ".app/Info.plist" | head -n 1`, { encoding: 'utf8' }).trim();

      if (!infoPlistPath || !fs.existsSync(infoPlistPath)) {
        throw new Error('Info.plist não encontrado dentro da IPA descompactada.');
      }
      console.log(`✅ [FOUND] Info.plist: ${infoPlistPath}`);

      // 3. Extrair metadados via PlistBuddy (macOS only)
      const getValue = (key) => {
        try {
          return execSync(`/usr/libexec/PlistBuddy -c "Print :${key}" "${infoPlistPath}"`, { encoding: 'utf8' }).trim();
        } catch (e) {
          // Fallback para plutil se PlistBuddy falhar
          return execSync(`plutil -extract ${key} raw "${infoPlistPath}"`, { encoding: 'utf8' }).trim();
        }
      };

      const actualBN = getValue('CFBundleVersion');
      const actualVersion = getValue('CFBundleShortVersionString');
      const actualBundleId = getValue('CFBundleIdentifier');

      console.log(`📊 [METADATA] BN: ${actualBN} | Versão: ${actualVersion} | ID: ${actualBundleId}`);

      // 4. Validar contra o esperado
      const isBNValid = actualBN === expectedBN.toString();
      const isVersionValid = actualVersion === expectedVersion;
      const isBundleIdValid = actualBundleId === expectedBundleId;

      const validationStatus = (isBNValid && isVersionValid && isBundleIdValid) ? 'SUCCESS' : 'MISMATCH';

      // 5. Logar Resultado
      const validationLog = {
        ipaPath,
        infoPlistPath,
        expected: { bn: expectedBN, version: expectedVersion, bundleId: expectedBundleId },
        actual: { bn: actualBN, version: actualVersion, bundleId: actualBundleId },
        checks: { bn: isBNValid, version: isVersionValid, bundleId: isBundleIdValid },
        validationStatus,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(validationLogPath, JSON.stringify(validationLog, null, 2));

      // 6. Fail Fast se houver divergência
      if (validationStatus === 'MISMATCH') {
        console.error('❌ [MISMATCH] Divergência detectada nos metadados da IPA!');
        if (!isBNValid) console.error(`   - CFBundleVersion: Esperado ${expectedBN}, Encontrado ${actualBN}`);
        if (!isVersionValid) console.error(`   - CFBundleShortVersionString: Esperado ${expectedVersion}, Encontrado ${actualVersion}`);
        if (!isBundleIdValid) console.error(`   - CFBundleIdentifier: Esperado ${expectedBundleId}, Encontrado ${actualBundleId}`);
        process.exit(1);
      }

      console.log(`✅ [VALIDATION-FIXED] IPA validada com sucesso! Pronto para submissão.`);

    } catch (e) {
      console.error(`❌ [FATAL] Erro na validação profunda: ${e.message}`);
      process.exit(1);
    } finally {
      // Limpeza
      execSync(`rm -rf "${tmpDir}"`);
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
  const version = args[args.indexOf('--validate-ipa') + 3];
  const bundleId = args[args.indexOf('--validate-ipa') + 4];
  enforcer.validateIpa(ipaPath, bn, version, bundleId);
} else if (args.includes('--finalize')) {
  const status = args[args.indexOf('--finalize') + 1];
  enforcer.finalize(status);
}
