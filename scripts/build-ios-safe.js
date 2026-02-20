const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, customEnv = null) {
  try {
    console.log(`\n🏃 Executando: ${command}`);
    const options = { stdio: 'inherit' };
    if (customEnv) {
      options.env = customEnv;
    }
    execSync(command, options);
    return true;
  } catch (error) {
    console.error(`\n❌ Falha ao executar: ${command}`);
    return false;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function commandExists(binary) {
  try {
    execSync(`which ${binary}`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function getXcodeVersionLine(customEnv) {
  const output = execSync('xcodebuild -version', { env: customEnv, encoding: 'utf8' }).trim();
  return output.split('\n')[0] || output;
}

function ensureXcodeMin(customEnv, minMajor) {
  const versionLine = getXcodeVersionLine(customEnv);
  const versionToken = versionLine.split(' ')[1] || '';
  const major = parseInt(versionToken.split('.')[0], 10);
  if (!major || major < minMajor) {
    throw new Error(`Xcode insuficiente: ${versionLine}. Exija Xcode ${minMajor}+ (ITMS-90725).`);
  }
  console.log(`✅ ${versionLine}`);
}

function stripSentryFromXcodeProject() {
  const iosDir = path.resolve(__dirname, '..', 'ios');
  if (!fs.existsSync(iosDir)) return;
  const projectFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir);
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry === 'project.pbxproj') {
        projectFiles.push(fullPath);
      }
    });
  };
  walk(iosDir);
  projectFiles.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*Sentry[^\n]*\*\/ = \{[\s\S]*?\n\t\};\n/mg, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*\*\/ = \{[\s\S]*?sentry-cli[\s\S]*?\n\t\};\n/mg, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\* Upload Debug Symbols to Sentry \*\/ = \{[\s\S]*?\n\t\};\n/mg, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*\*\/ = \{[\s\S]*?shellScript = ".*sentry[^\n]*";[\s\S]*?\n\t\};\n/mgi, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*Sentry[^\n]*\*\/ = \{[\s\S]*?PBXShellScriptBuildPhase[\s\S]*?\n\t\};\n/mgi, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*Sentry[^\n]*\*\/,?\n/mg, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\*[^\n]*sentry[^\n]*\*\/,?\n/mgi, '');
    content = content.replace(/^[ \t]*[A-F0-9]{24} \/\* Upload Debug Symbols to Sentry \*\/,?\n/mg, '');
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Sentry removido do Xcode project: ${filePath}`);
    }
  });
}

function removeSentryArtifacts() {
  const rootDir = path.resolve(__dirname, '..');
  const iosDir = path.resolve(rootDir, 'ios');
  const candidates = [
    path.join(rootDir, '.sentryclirc'),
    path.join(rootDir, 'sentry.properties'),
    path.join(iosDir, '.sentryclirc'),
    path.join(iosDir, 'sentry.properties')
  ];
  candidates.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
      console.log(`✅ Arquivo Sentry removido: ${filePath}`);
    }
  });

  const podfilePath = path.join(iosDir, 'Podfile');
  const podlockPath = path.join(iosDir, 'Podfile.lock');
  [podfilePath, podlockPath].forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = original
      .split('\n')
      .filter((line) => !/\bSentry\b|sentry/i.test(line))
      .join('\n');
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`✅ Referências ao Sentry removidas de: ${filePath}`);
    }
  });
}

function findEasLocalBuildDirs(baseDir, limit = 2000) {
  const results = new Set();
  const queue = [{ dir: baseDir, depth: 0 }];
  let scanned = 0;
  while (queue.length && scanned < limit) {
    const { dir, depth } = queue.shift();
    scanned += 1;
    if (!fs.existsSync(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (full.includes('eas-build-local-nodejs')) {
        results.add(full);
        const buildDir = path.join(full, 'build');
        if (fs.existsSync(buildDir)) results.add(buildDir);
      }
      if (depth < 4) {
        queue.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return Array.from(results);
}

function writeSentryEnvFiles() {
  const content = ['SENTRY_DISABLE_AUTO_UPLOAD=1', 'SENTRY_ALLOW_FAILURE=1', ''].join('\n');
  const roots = new Set([
    process.cwd(),
    process.env.EAS_BUILD_ROOT,
    process.env.EAS_BUILD_WORKING_DIR,
    process.env.EAS_BUILD_WORKINGDIR,
    process.env.EAS_BUILD_PROJECT_ROOT,
    process.env.EAS_BUILD_DIR,
    process.env.EAS_BUILD_LOCAL_DIR,
    process.env.EAS_BUILD_LOCAL_TEMP_DIR
  ].filter(Boolean));
  const tempBases = [
    process.env.TMPDIR,
    process.env.TMP,
    process.env.TEMP,
    '/tmp',
    '/var/folders',
    '/private/var/folders'
  ].filter(Boolean);
  tempBases.forEach((base) => {
    findEasLocalBuildDirs(base).forEach((dir) => roots.add(dir));
  });
  roots.forEach((r) => {
    if (!fs.existsSync(r)) return;
    ensureDir(r);
    const envPath = path.join(r, '.env.sentry-build-plugin');
    fs.writeFileSync(envPath, content, 'utf8');
    const iosEnvPath = path.join(r, 'ios', '.env.sentry-build-plugin');
    fs.mkdirSync(path.dirname(iosEnvPath), { recursive: true });
    fs.writeFileSync(iosEnvPath, content, 'utf8');
  });
}

function createSentryCliStub(env) {
  const binDir = path.join(process.cwd(), 'ci-bin');
  ensureDir(binDir);
  const stubPath = path.join(binDir, 'sentry-cli');
  const stub = ['#!/bin/sh', 'echo "[ci] sentry-cli stubbed (skipping upload)"', 'exit 0', ''].join('\n');
  fs.writeFileSync(stubPath, stub, 'utf8');
  try {
    fs.chmodSync(stubPath, 0o755);
  } catch (e) {}
  const currentPath = env.PATH || process.env.PATH || '';
  env.PATH = `${binDir}:${currentPath}`;
}

console.log('🚀 Iniciando processo de build iOS seguro (V3)...');

const easProfile = (process.env.EAS_BUILD_PROFILE || process.env.EAS_PROFILE || 'production').trim();

// 1. Validar imports localmente
if (!run('node scripts/validate-imports.js')) {
  process.exit(1);
}

// 2. Limpar cache (ignorar erro se as pastas não existirem)
console.log('\n🧹 Limpando caches locais...');
const cachePaths = ['node_modules/.cache/metro', '.expo', 'dist'];
cachePaths.forEach(p => {
  const fullPath = path.resolve(__dirname, '..', p);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removido: ${p}`);
    } catch (e) {
      console.warn(`⚠️ Não foi possível remover ${p}: ${e.message}`);
    }
  }
});

// 2.1 Limpeza adicional de arquivos temporários do sistema
try {
  const tempPath = path.resolve(process.env.TEMP || '/tmp', 'metro-cache');
  if (fs.existsSync(tempPath)) {
    fs.rmSync(tempPath, { recursive: true, force: true });
    console.log('✅ Cache temporário do Metro limpo');
  }
} catch (e) {}

// 3. Preparar arquivos
if (!run('node scripts/prepare-ios-build.js')) {
  process.exit(1);
}

// 3.1 Patch OneSignal templates em node_modules (Prevenir injeção de App Groups)
console.log('\n🩹 Patcheando templates do OneSignal...');
run('node scripts/patch-onesignal-template.js');

// 4. Iniciar Prebuild para gerar pasta ios/
console.log('\n🛠️ Gerando pasta ios/ via prebuild...');

const isWin = process.platform === 'win32';
const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';

if (isWin && !isCI) {
  console.warn('⚠️  Ambiente Windows detectado. O prebuild nativo iOS será ignorado localmente.');
  console.error('❌ Build iOS não é suportado localmente no Windows.');
  console.error('❌ Para manter modo gratuito, rode pelo GitHub Actions (macOS) com EAS Local Build.');
  process.exit(1);
} else {
  // No CI ou macOS/Linux, executamos o prebuild
  const prebuildCmd = 'npx expo prebuild --platform ios --no-install';
    
  // Adicionar variável para evitar erro de extensão .ts em node_modules
  const prebuildEnv = {
    ...process.env,
    CI: '1',
    NODE_OPTIONS: '--no-warnings',
    SENTRY_DISABLE_AUTO_UPLOAD: '1',
    SENTRY_ALLOW_FAILURE: '1',
    EXPO_PUBLIC_ENABLE_SENTRY: '0',
    SENTRY_AUTH_TOKEN: '',
    SENTRY_ORG: '',
    SENTRY_PROJECT: '',
    SENTRY_URL: '',
    SENTRY_DSN: ''
  };

  if (!run(prebuildCmd, prebuildEnv)) {
    console.error('❌ Falha no prebuild.');
    process.exit(1);
  }

  removeSentryArtifacts();
  stripSentryFromXcodeProject();
  run('node scripts/ios-nuke-sentry-phases.js');

  // 5. Aplicar fixes nos entitlements (resolver erro de App Groups/Provisioning)
  console.log('\n🩹 Aplicando correções de Entitlements...');
  if (!run('node scripts/fix-entitlements.js')) {
    console.warn('⚠️ Falha ao aplicar fix de entitlements, continuando assim mesmo...');
  }

  // 5.1 Rodar fix-entitlements novamente após patches de módulos (Double Check)
  console.log('\n🩹 Reforçando correções de Entitlements (Double Check)...');
  run('node scripts/fix-entitlements.js');

  // 6. Aplicar fixes nos módulos nativos
  console.log('\n🩹 Aplicando patches de módulos nativos...');
  if (!run('node scripts/fix-native-modules.js --strict')) {
    console.error('❌ Falha ao aplicar patches críticos.');
    process.exit(1);
  }
}

// 7. Iniciar EAS Build (Local ou Cloud)
if (isCI) {
    console.log('\n🏗️ Iniciando EAS Build LOCAL no Runner (GitHub Free)...');
    
    // Garantir que variáveis de ambiente críticas sejam passadas para o EAS CLI
    const env = {
      ...process.env,
      EXPO_NO_CAPABILITY_SYNC: '1',
      EXPO_SKIP_MANIFEST_VALIDATION_TOKEN: '1',
      EAS_SKIP_AUTO_FINGERPRINT: '1',
      SENTRY_DISABLE_AUTO_UPLOAD: '1',
      SENTRY_ALLOW_FAILURE: '1',
      SENTRY_AUTH_TOKEN: '',
      SENTRY_ORG: '',
      SENTRY_PROJECT: '',
      SENTRY_URL: '',
      SENTRY_DSN: ''
    };

    if (commandExists('xcbeautify')) {
      env.EAS_BUILD_XCODE_COMMAND_MODIFIER = ' | xcbeautify';
    }

    const artifactDir = process.env.EAS_LOCAL_BUILD_ARTIFACTS_DIR || './build-artifacts';
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const localTemp = env.EAS_BUILD_LOCAL_TEMP_DIR || path.join(process.env.RUNNER_TEMP || '/tmp', 'eas-build-local');
    env.EAS_BUILD_LOCAL_TEMP_DIR = localTemp;
    ensureDir(localTemp);
    
    const requestedDeveloperDir = process.env.DEVELOPER_DIR;
    const fallbackPaths = [
      '/Applications/Xcode.app/Contents/Developer',
      '/Applications/Xcode_16.2.app/Contents/Developer'
    ];
    if (requestedDeveloperDir && fs.existsSync(requestedDeveloperDir)) {
      env.DEVELOPER_DIR = requestedDeveloperDir;
      process.env.DEVELOPER_DIR = requestedDeveloperDir;
      console.log(`🍎 DEVELOPER_DIR definido via ambiente: ${requestedDeveloperDir}`);
    } else {
      const found = fallbackPaths.find((p) => fs.existsSync(p));
      if (found) {
        env.DEVELOPER_DIR = found;
        process.env.DEVELOPER_DIR = found;
        console.log(`🍎 DEVELOPER_DIR definido para Xcode padrão: ${found}`);
      } else {
        console.log('⚠️ Nenhum DEVELOPER_DIR explícito encontrado; usando configuração padrão do runner.');
      }
    }

    try {
      ensureXcodeMin(env, 16);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }

    console.log('🔍 Versão efetiva do Xcode/SDK para o build:');
    run('xcodebuild -version', env);
    run('xcrun --sdk iphoneos --show-sdk-version', env);

    writeSentryEnvFiles();
    createSentryCliStub(env);

    // Usamos EAS Local para NÃO gastar créditos do plano Free da Expo
    console.log('\n🏗️ Iniciando EAS Build LOCAL no Runner (GitHub Free - Não gasta créditos)...');
    const buildCmd = `eas build --platform ios --profile ${easProfile} --local --non-interactive --output=${artifactDir}/Acucaradas.ipa`;
    const buildSuccess = run(buildCmd, env);
  
  if (buildSuccess) {
    console.log('\n✅ Build LOCAL concluído com sucesso!');
    console.log(`💡 A IPA foi gerada em: ${artifactDir}/Acucaradas.ipa`);

    // 8. Submissão automática para o TestFlight (EAS Submit)
    // Isso NÃO gasta créditos de build da Expo!
    if (process.env.SUBMIT_TO_TESTFLIGHT === 'true') {
      console.log('\n📤 Iniciando submissão para o TestFlight...');
      const submitCmd = `eas submit --platform ios --profile ${easProfile} --path=${artifactDir}/Acucaradas.ipa --non-interactive`;
      run(submitCmd, env);
    }
  } else {
    console.error('\n❌ Falha ao enviar build para a Expo.');
    process.exit(1);
  }
} else {
  if (process.env.ALLOW_EAS_CLOUD === 'true') {
    console.log('\n🏗️ Iniciando EAS Build CLOUD...');
    run(`eas build --platform ios --profile ${easProfile} --non-interactive --clear-cache`);
  } else {
    console.error('\n❌ EAS Build Cloud desabilitado por padrão para manter modo gratuito.');
    console.error('❌ Rode o build no GitHub Actions (macOS) usando EAS Local Build.');
    process.exit(1);
  }
}
