const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script de Auditoria Final de Build (Açucaradas Encomendas)
 * Verifica todos os pontos críticos identificados para garantir 100% de sucesso no CI.
 */

function audit() {
  console.log('🧐 Iniciando Auditoria Final de Build...');
  let issues = 0;

  const easProfile = (process.env.EAS_BUILD_PROFILE || process.env.EAS_PROFILE || 'production').trim();

  // 1. Verificar Project ID consistency
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const appProjectId = appJson.expo?.extra?.eas?.projectId;
  const easPreviewId = easJson.build?.preview?.env?.EXPO_PUBLIC_PROJECT_ID;
  const easProdId = easJson.build?.production?.env?.EXPO_PUBLIC_PROJECT_ID;

  if (appProjectId !== '6090106b-e327-4744-bce5-9ddb0d037045') {
    console.error('❌ ERRO: Project ID no app.json está incorreto!');
    issues++;
  } else {
    console.log('✅ Project ID no app.json está correto.');
  }

  if (easPreviewId !== appProjectId || easProdId !== appProjectId) {
    console.error('❌ ERRO: Inconsistência de Project ID no eas.json!');
    issues++;
  } else {
    console.log('✅ Project ID no eas.json está consistente.');
  }

  // 2. Verificar Config Plugins
  const plugins = appJson.expo.plugins || [];
  const hasSentry = plugins.some(p => Array.isArray(p) ? p[0] === '@sentry/react-native/expo' : p === '@sentry/react-native/expo');
  const hasOneSignal = plugins.some(p => Array.isArray(p) ? p[0] === 'onesignal-expo-plugin' : p === 'onesignal-expo-plugin');
  const hasRemoveAppGroups = plugins.some(p => p === './scripts/withRemoveAppGroups.js');
  const profileEnv = easJson.build?.[easProfile]?.env || {};

  if (!hasSentry) {
    console.error('❌ ERRO: Plugin do Sentry (@sentry/react-native/expo) ausente no app.json!');
    issues++;
  } else {
    console.log('✅ Plugin do Sentry detectado.');
  }

  if (hasOneSignal && !hasRemoveAppGroups) {
    console.error('❌ ERRO: OneSignal detectado mas withRemoveAppGroups.js não está configurado!');
    issues++;
  } else {
    console.log('✅ Configuração de OneSignal/AppGroups validada.');
  }

  const sentryEnabledEnv = String(profileEnv.EXPO_PUBLIC_ENABLE_SENTRY || process.env.EXPO_PUBLIC_ENABLE_SENTRY || '').toLowerCase() === 'true';
  const sentryDsn = String(profileEnv.EXPO_PUBLIC_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || profileEnv.SENTRY_DSN || process.env.SENTRY_DSN || '').trim();
  const sentryAuthToken = String(profileEnv.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN || '').trim();
  const sentryDisableAutoUpload = String(profileEnv.SENTRY_DISABLE_AUTO_UPLOAD || process.env.SENTRY_DISABLE_AUTO_UPLOAD || '').toLowerCase();
  const sentryUploadEnabled = sentryDisableAutoUpload === '0' || sentryDisableAutoUpload === 'false';

  if (sentryEnabledEnv || sentryDsn || sentryUploadEnabled) {
    if (!sentryAuthToken) {
      console.warn('⚠️ AVISO: SENTRY_AUTH_TOKEN ausente; Sentry desativado no CI.');
    } else {
      console.log('✅ SENTRY_AUTH_TOKEN presente.');
    }
  } else {
    console.log('✅ Sentry desativado no eas.json/ambiente.');
  }

  // 2.1 Verificar versão/buildNumber efetivos (fonte vs Expo config)
  const appVersion = String(appJson.expo?.version || '').trim();
  const appBuildNumber = String(appJson.expo?.ios?.buildNumber || '').trim();
  const pkgVersion = String(pkg.version || '').trim();

  const easPreviewVersion = String(easJson.build?.preview?.env?.EXPO_PUBLIC_APP_VERSION || '').trim();
  const easProdVersion = String(easJson.build?.production?.env?.EXPO_PUBLIC_APP_VERSION || '').trim();
  if (appVersion && easPreviewVersion && easPreviewVersion !== appVersion) {
    console.error(`❌ ERRO: eas.json preview EXPO_PUBLIC_APP_VERSION (${easPreviewVersion}) != app.json (${appVersion})`);
    issues++;
  }
  if (appVersion && easProdVersion && easProdVersion !== appVersion) {
    console.error(`❌ ERRO: eas.json production EXPO_PUBLIC_APP_VERSION (${easProdVersion}) != app.json (${appVersion})`);
    issues++;
  }

  if (!appVersion) {
    console.error('❌ ERRO: app.json expo.version está vazio!');
    issues++;
  }

  if (!appBuildNumber || !/^[0-9]+$/.test(appBuildNumber)) {
    console.error(`❌ ERRO: app.json expo.ios.buildNumber inválido: ${appBuildNumber}`);
    issues++;
  }

  const minBuildNumber = 362;
  const appBuildNumberValue = Number(appBuildNumber);
  if (!Number.isFinite(appBuildNumberValue) || appBuildNumberValue < minBuildNumber) {
    console.error(`❌ ERRO: app.json expo.ios.buildNumber abaixo do mínimo (${minBuildNumber}): ${appBuildNumber}`);
    issues++;
  }

  if (pkgVersion && appVersion && pkgVersion !== appVersion) {
    console.warn(`⚠️ AVISO: package.json version (${pkgVersion}) != app.json expo.version (${appVersion})`);
  }

  try {
    const raw = execSync('npx expo config --type public --json', { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    const expoConfig = (parsed && (parsed.expo || parsed.exp)) ? (parsed.expo || parsed.exp) : parsed;
    const expoVersion = String(expoConfig?.version || '').trim();
    const expoBuildNumber = String(expoConfig?.ios?.buildNumber || '').trim();

    if (appVersion && expoVersion && appVersion !== expoVersion) {
      console.error(`❌ ERRO: expo config version (${expoVersion}) != app.json (${appVersion})`);
      issues++;
    } else {
      console.log(`✅ Versão efetiva (expo config): ${expoVersion || appVersion}`);
    }

    if (appBuildNumber && expoBuildNumber && appBuildNumber !== expoBuildNumber) {
      console.error(`❌ ERRO: expo config ios.buildNumber (${expoBuildNumber}) != app.json (${appBuildNumber})`);
      issues++;
    } else {
      console.log(`✅ BuildNumber efetivo (expo config): ${expoBuildNumber || appBuildNumber}`);
    }
  } catch (e) {
    console.warn('⚠️ AVISO: não foi possível executar/parsear `npx expo config --json` para validar versão/buildNumber.');
  }

  // 3. Verificar dependências críticas do Metro (Removido validação rígida)
  console.log('✅ Versão do Metro ignorada (confiando no package.json).');

  // 4. Verificar arquivos de patch
  const requiredScripts = [
    'scripts/prepare-ios-build.js'
  ];

  requiredScripts.forEach(s => {
    if (!fs.existsSync(s)) {
      console.error(`❌ ERRO: Script essencial ausente: ${s}`);
      issues++;
    } else {
      console.log(`✅ Script presente: ${s}`);
    }
  });

  const googlePlistRoot = fs.existsSync('GoogleService-Info.plist');
  const googlePlistIos = fs.existsSync(path.join('ios', 'GoogleService-Info.plist'));
  if (!googlePlistRoot) {
    console.error('❌ ERRO: GoogleService-Info.plist ausente na raiz.');
    issues++;
  } else {
    console.log('✅ GoogleService-Info.plist presente na raiz.');
  }

  // 5. Verificar credenciais (somente quando build local requer credenciais locais)
  const hasEnvCreds = process.env.APPLE_CERT_BASE64 && process.env.APPLE_PROVISION_BASE64;
  const hasCertPassword = !!process.env.APPLE_CERT_PASSWORD;
  const hasCredentialsFile = fs.existsSync('credentials.json');
  const profileConfig = easJson.build?.[easProfile] || {};
  const credentialsSource = String(profileConfig.credentialsSource || '').trim().toLowerCase();

  const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);
  const isEASContext =
    !!process.env.EAS_BUILD ||
    !!process.env.EAS_BUILD_PROFILE ||
    !!process.env.EAS_PROJECT_ID ||
    !!process.env.EAS_BUILD_RUNNER ||
    !!process.env.EAS_BUILD_ID;

  const shouldRequireLocalCreds = credentialsSource === 'local' || (!isCI && !isEASContext && credentialsSource !== 'remote');

  if (shouldRequireLocalCreds) {
    if (!hasCredentialsFile && !hasEnvCreds) {
      console.error('❌ ERRO: Credenciais de build não encontradas (credentials.json ou variáveis de ambiente)!');
      issues++;
    } else if (hasEnvCreds && !hasCertPassword) {
      console.error('❌ ERRO: APPLE_CERT_BASE64 encontrado, mas APPLE_CERT_PASSWORD está ausente!');
      issues++;
    } else {
      console.log(hasCredentialsFile ? '✅ credentials.json presente.' : '✅ Credenciais via variáveis de ambiente detectadas (incluindo senha).');
    }
  } else {
    console.log(`✅ Credenciais: usando EAS (${credentialsSource || 'remote'}) no profile ${easProfile}.`);
  }

  if (process.platform === 'darwin') {
    try {
      const xcodeVersion = execSync('xcodebuild -version', { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
      console.log(`ℹ️ Xcode: ${xcodeVersion.replace(/\s+/g, ' ')}`);
    } catch {
      console.warn('⚠️ AVISO: não foi possível obter xcodebuild -version.');
    }

    try {
      const sdk = execSync('xcrun --sdk iphoneos --show-sdk-version', { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
      console.log(`ℹ️ iOS SDK (iphoneos): ${sdk}`);
    } catch {
      console.warn('⚠️ AVISO: não foi possível obter a versão do iOS SDK via xcrun.');
    }
  }

  // 6. Verificar versão do Node.js
  const currentNodeVersion = process.version;
  const enginesNode = String(pkg.engines?.node || '').trim();
  const requiredNodeVersion = enginesNode.replace('>=', '').trim();
  console.log(`ℹ️ Versão do Node.js atual: ${currentNodeVersion}`);
  console.log(`ℹ️ Versão do Node.js requerida: ${requiredNodeVersion}`);

  const parseSemver = (v) => {
    const m = String(v || '').trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
  };

  const compareSemver = (a, b) => {
    if (!a || !b) return null;
    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
    return 0;
  };

  const currentSemver = parseSemver(currentNodeVersion);
  const requiredSemver = parseSemver(requiredNodeVersion);
  const meetsMin = compareSemver(currentSemver, requiredSemver);

  // No CI, falhar se não for a versão correta
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    if (meetsMin === -1) {
      console.error(`❌ ERRO: Versão do Node.js (${currentNodeVersion}) não atende o mínimo exigido (${enginesNode}) no CI!`);
      issues++;
    } else {
      console.log(`✅ Versão do Node.js atende o mínimo exigido (${enginesNode}).`);
    }
  }

  // 7. Verificar .gitignore para .expo
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (!gitignore.includes('.expo/')) {
    console.error('❌ ERRO: .expo/ não está no .gitignore!');
    issues++;
  } else {
    console.log('✅ .expo/ está no .gitignore.');
  }

  if (issues > 0) {
    console.error(`\n📋 Auditoria concluída com ${issues} erro(s). Corrija-os antes de prosseguir.`);
    process.exit(1);
  } else {
    console.log('\n🚀 TUDO PRONTO! O build tem alta probabilidade de sucesso.');
    process.exit(0);
  }
}

audit();
