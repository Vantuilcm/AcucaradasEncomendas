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

const DEFAULT_DESCRIPTIONS = {
  "NSSpeechRecognitionUsageDescription": "Este aplicativo utiliza o reconhecimento de voz para permitir buscas de produtos e navegação por voz.",
  "NSLocationWhenInUseUsageDescription": "Sua localização é utilizada para exibir lojas próximas e calcular valores de entrega.",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "Sua localização é utilizada para oferecer uma experiência personalizada de entrega mesmo em segundo plano.",
  "NSLocationAlwaysUsageDescription": "Este aplicativo precisa da sua localização para otimizar o rastreamento da entrega e informar sobre promoções.",
  "NSCameraUsageDescription": "O acesso à câmera permite capturar fotos para o seu perfil e pedidos.",
  "NSPhotoLibraryUsageDescription": "O acesso à galeria permite selecionar fotos para o seu perfil e pedidos.",
  "NSMicrophoneUsageDescription": "O acesso ao microfone é necessário para comandos de voz e buscas."
};

class PrivacyValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.logPath = path.join(this.projectRoot, 'build-logs', 'privacy-validation.json');
    
    if (!fs.existsSync(path.dirname(this.logPath))) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    }
  }

  injectPermissions() {
    console.log('💉 [INJECT] Garantindo permissões de privacidade no app.json...');
    try {
      const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
      if (!appJson.expo.ios) appJson.expo.ios = {};
      if (!appJson.expo.ios.infoPlist) appJson.expo.ios.infoPlist = {};

      let modified = false;
      REQUIRED_KEYS.forEach(key => {
        if (!appJson.expo.ios.infoPlist[key]) {
          console.log(`   + Adicionando: ${key}`);
          appJson.expo.ios.infoPlist[key] = DEFAULT_DESCRIPTIONS[key];
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2));
        console.log('✅ [OK] app.json atualizado com novas permissões.');
      } else {
        console.log('✅ [OK] Todas as permissões já existem no app.json.');
      }
    } catch (e) {
      console.error(`❌ [INJECT-ERROR] Falha ao injetar permissões: ${e.message}`);
    }
  }

  validateConfig(config, origin = 'expo config') {
    const infoPlist = config?.expo?.ios?.infoPlist || config?.ios?.infoPlist || {};
    const detected = [];
    const missing = [];

    console.log(`📊 [DEBUG] Validando chaves em: ${origin}`);

    REQUIRED_KEYS.forEach(key => {
      if (infoPlist[key] && infoPlist[key].length > 5) {
        detected.push(key);
      } else {
        missing.push(key);
      }
    });

    // Hardening: Verificar Ícone e Splash (Causa de rejeição e "App Branco")
    const hasIcon = !!(config?.expo?.icon || config?.icon);
    const hasSplash = !!(config?.expo?.splash || config?.splash);

    if (!hasIcon) console.warn('⚠️ [WARNING] Ícone não detectado na configuração!');
    if (!hasSplash) console.warn('⚠️ [WARNING] Splash Screen não detectado na configuração!');

    const result = {
      timestamp: new Date().toISOString(),
      platform: 'ios',
      origin,
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      assets: { hasIcon, hasSplash },
      detected,
      missing
    };

    fs.writeFileSync(this.logPath, JSON.stringify(result, null, 2));

    if (missing.length > 0) {
      console.error(`❌ [PRIVACY-FAIL] Faltam chaves obrigatórias de privacidade (${origin}):`);
      missing.forEach(k => console.error(`   - ${k}`));
      process.exit(1);
    }

    console.log(`✅ [PRIVACY-PASS] Todas as chaves obrigatórias detectadas em: ${origin}`);
  }

  checkResolvedConfig() {
    try {
      console.log('🔍 [CONFIG] Validando configuração resolvida do Expo...');
      const output = execSync('npx expo config --type public --json', { encoding: 'utf8' });
      // Limpar output de telemetria se necessário
      const cleanJson = output.substring(output.indexOf('{'));
      const config = JSON.parse(cleanJson);
      this.validateConfig(config, 'Expo Config Resolved');
      
      // Validação Extra: Tentar localizar o Info.plist nativo se ele existir
      const nativePlist = path.join(this.projectRoot, 'ios/AcucaradasEncomendas/Info.plist');
      if (fs.existsSync(nativePlist)) {
        console.log('🔍 [NATIVE] Validando Info.plist nativo existente...');
        const plistContent = fs.readFileSync(nativePlist, 'utf8');
        const missing = REQUIRED_KEYS.filter(key => !plistContent.includes(`<key>${key}</key>`));
        if (missing.length > 0) {
          console.warn(`⚠️ [Warning] Chaves ausentes no Info.plist nativo: ${missing.join(', ')}`);
        }
      }
    } catch (e) {
      console.error(`❌ [CONFIG-ERROR] Falha ao validar configuração: ${e.message}`);
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

      // 4. Verificar Assets Reais (Ícone e Splash) dentro do .app
      const appDir = path.dirname(infoPlistPath);
      const iconExists = execSync(`find "${appDir}" -name "AppIcon*" | wc -l`, { encoding: 'utf8' }).trim() !== "0";
      const splashExists = execSync(`find "${appDir}" -name "*Splash*" -o -name "Launch*" | wc -l`, { encoding: 'utf8' }).trim() !== "0";

      // Log do resultado da IPA
      const result = {
        timestamp: new Date().toISOString(),
        platform: 'ios',
        origin: 'IPA binary',
        status: (missing.length === 0 && iconExists) ? 'PASS' : 'FAIL',
        assets: { iconExists, splashExists },
        detected: REQUIRED_KEYS.filter(key => plistContent.includes(key)),
        missing
      };
      fs.writeFileSync(this.logPath, JSON.stringify(result, null, 2));

      if (missing.length > 0) {
        console.error('❌ [IPA-PRIVACY-FAIL] IPA gerada não contém todas as chaves obrigatórias de privacidade!');
        console.error('As seguintes chaves estão AUSENTES no Info.plist real do binário:');
        missing.forEach(k => console.error(`   - ${k}`));
        process.exit(1);
      }

      if (!iconExists) {
        console.error('❌ [IPA-ASSET-FAIL] Ícone da aplicação não encontrado dentro do binário!');
        console.error('💡 Isso causará o problema de "Logo Branca" no celular.');
        process.exit(1);
      }

      console.log('✅ [IPA-PRIVACY-PASS] IPA validada com conformidade total de privacidade e assets.');
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

if (args.includes('--inject')) {
  validator.injectPermissions();
} else if (args.includes('--check-ipa')) {
  const ipaPath = args[args.indexOf('--check-ipa') + 1] || './dist/app.ipa';
  validator.checkIpa(ipaPath);
} else {
  // Por padrão, injeta e valida a config
  validator.injectPermissions();
  validator.checkResolvedConfig();
}
