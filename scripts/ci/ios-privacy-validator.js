const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🍎 AppleComplianceGuardianAI - Missão: Conformidade Total Info.plist
 * Valida a presença de chaves de privacidade obrigatórias antes do build e submit.
 */

const REQUIRED_KEYS = [
  "NSSpeechRecognitionUsageDescription",
  "NSLocationWhenInUseUsageDescription",
  "NSLocationAlwaysAndWhenInUseUsageDescription",
  "NSLocationAlwaysUsageDescription",
  "NSCameraUsageDescription",
  "NSPhotoLibraryUsageDescription",
  "NSMicrophoneUsageDescription"
];

class PrivacyValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.logPath = path.join(this.projectRoot, 'build-logs', 'privacy-check.json');
    
    if (!fs.existsSync(path.dirname(this.logPath))) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    }
  }

  validateConfig(config) {
    const infoPlist = config?.ios?.infoPlist || {};
    const detected = [];
    const missing = [];

    console.log(`📊 [DEBUG] Chaves presentes no infoPlist: ${Object.keys(infoPlist).join(', ')}`);

    REQUIRED_KEYS.forEach(key => {
      if (infoPlist[key] && infoPlist[key].length > 5) {
        detected.push(key);
      } else {
        missing.push(key);
      }
    });

    const result = {
      timestamp: new Date().toISOString(),
      platform: 'ios',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      detected,
      missing
    };

    fs.writeFileSync(this.logPath, JSON.stringify(result, null, 2));

    if (missing.length > 0) {
      console.error('❌ [PRIVACY-FAIL] Faltam chaves obrigatórias de privacidade no Info.plist:');
      missing.forEach(k => console.error(`   - ${k}`));
      process.exit(1);
    }

    console.log('✅ [PRIVACY-PASS] Todas as chaves de privacidade obrigatórias foram detectadas.');
  }

  checkResolvedConfig() {
    console.log('🔍 [RESOLVE] Validando configuração resolvida do Expo para privacidade...');
    try {
      // Usando o arquivo já gerado pelo guardian ou gerando um temporário
      const resolvedPath = path.join(this.projectRoot, 'build-resolved-config.json');
      let config;
      
      if (fs.existsSync(resolvedPath)) {
        config = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      } else {
        const output = execSync('npx expo config --type public --json', { encoding: 'utf8', env: { ...process.env, EXPO_NO_TELEMETRY: '1' } });
        // Limpar output para pegar apenas o JSON
        const jsonStr = output.substring(output.indexOf('{'));
        config = JSON.parse(jsonStr);
      }
      
      this.validateConfig(config);
    } catch (e) {
      console.error(`❌ [RESOLVE-ERROR] Falha ao ler configuração resolvida: ${e.message}`);
      process.exit(1);
    }
  }

  checkIpa(ipaPath) {
    if (!fs.existsSync(ipaPath)) {
      console.error(`❌ [IPA-ERROR] IPA não encontrada em: ${ipaPath}`);
      process.exit(1);
    }

    const tmpDir = path.join(this.projectRoot, 'tmp-privacy-extract');
    if (fs.existsSync(tmpDir)) execSync(`rm -rf "${tmpDir}"`);
    fs.mkdirSync(tmpDir, { recursive: true });

    console.log(`📦 [Artifact] Validando chaves de privacidade na IPA: ${ipaPath}`);
    try {
      // 1. Extrair Payload para busca dinâmica
      execSync(`unzip -q "${ipaPath}" "Payload/*" -d "${tmpDir}"`);

      // 2. Localizar Info.plist principal (Payload/*.app/Info.plist)
      const infoPlistPath = execSync(`find "${tmpDir}/Payload" -maxdepth 3 -name "Info.plist" | grep ".app/Info.plist" | head -n 1`, { encoding: 'utf8' }).trim();

      if (!infoPlistPath || !fs.existsSync(infoPlistPath)) {
        throw new Error('Info.plist não encontrado dentro da IPA.');
      }

      // 3. Verificar presença das chaves via strings/grep para máxima segurança
      const plistContent = execSync(`strings "${infoPlistPath}"`, { encoding: 'utf8' });
      
      const missing = REQUIRED_KEYS.filter(key => !plistContent.includes(key));

      if (missing.length > 0) {
        console.error('❌ [IPA-PRIVACY-FAIL] IPA gerada não contém todas as chaves obrigatórias de privacidade!');
        console.error('As seguintes chaves estão AUSENTES no Info.plist real do binário:');
        missing.forEach(k => console.error(`   - ${k}`));
        console.error('💡 Dica: Verifique se o app.json/app.config.js está correto e se o prebuild está funcionando.');
        process.exit(1);
      }

      console.log('✅ [IPA-PRIVACY-PASS] IPA validada com conformidade total de privacidade.');
    } catch (e) {
      console.error(`❌ [FATAL-PRIVACY] Falha crítica na validação de privacidade: ${e.message}`);
      process.exit(1);
    } finally {
      execSync(`rm -rf "${tmpDir}"`);
    }
  }
}

// CLI
const args = process.argv.slice(2);
const validator = new PrivacyValidator();

if (args.includes('--check-ipa')) {
  const ipaPath = args[args.indexOf('--check-ipa') + 1] || './dist/app.ipa';
  validator.checkIpa(ipaPath);
} else {
  // Por padrão valida a config local ou resolvida
  validator.checkResolvedConfig();
}
