const fs = require('fs');
const path = require('path');

/**
 * Script avançado para preparar o build iOS (Açucaradas Encomendas)
 * Suporta variáveis de ambiente do GitHub Actions e decodificação de credenciais Base64.
 */

function prepare() {
  console.log('\n--- 🍎 PREPARAÇÃO PARA BUILD IOS (GITHUB FREE) ---');

  const appJsonPath = path.join(process.cwd(), 'app.json');
  const minBuildNumber = 362;
  if (fs.existsSync(appJsonPath)) {
    try {
      const raw = fs.readFileSync(appJsonPath, 'utf8');
      const data = JSON.parse(raw);
      const expo = data.expo || {};
      const ios = expo.ios || {};
      const build = Number(ios.buildNumber || 0);
      if (!Number.isFinite(build) || build < minBuildNumber) {
        expo.ios = { ...ios, buildNumber: String(minBuildNumber) };
        data.expo = expo;
        fs.writeFileSync(appJsonPath, JSON.stringify(data, null, 2));
        console.log(`✅ buildNumber forçado para ${minBuildNumber} no app.json`);
      } else {
        console.log(`✅ buildNumber já está >= ${minBuildNumber}: ${build}`);
      }
    } catch (e) {
      console.error('❌ Erro ao forçar buildNumber no app.json:', e.message);
      process.exit(1);
    }
  } else {
    console.error('❌ app.json não encontrado para forçar buildNumber');
    process.exit(1);
  }

  // 1. Limpeza da pasta ios/ manual
  const iosPath = path.join(process.cwd(), 'ios');
  if (fs.existsSync(iosPath)) {
    console.log('🧹 Removendo pasta ios/ antiga para consistência...');
    try {
      fs.rmSync(iosPath, { recursive: true, force: true });
      console.log('✅ Pasta ios/ removida.');
    } catch (e) {
      console.warn('⚠️ Erro ao remover pasta ios/:', e.message);
    }
  }

  // 2. Gerenciamento do GoogleService-Info.plist
  const source = 'GoogleService-Info.prod.plist';
  
  if (process.env.GOOGLE_SERVICE_INFO_PLIST) {
    const plistContent = process.env.GOOGLE_SERVICE_INFO_PLIST.trim();
    if (plistContent.startsWith('<?xml')) {
      console.log('✅ Criando GoogleService-Info.prod.plist a partir da variável de ambiente (XML Válido)...');
      fs.writeFileSync(source, plistContent);
    } else {
      console.error('❌ Erro: A variável GOOGLE_SERVICE_INFO_PLIST não parece ser um XML válido.');
      process.exit(1);
    }
  } else if (!fs.existsSync(source)) {
    const backup = 'GoogleService-Info.plist';
    if (fs.existsSync(backup)) {
      console.log(`📋 Copiando ${backup} para ${source}...`);
      fs.copyFileSync(backup, source);
    } else {
      console.warn('⚠️ Aviso: GoogleService-Info.prod.plist não encontrado. O build pode falhar se o Firebase for obrigatório.');
    }
  } else {
    console.log(`✅ ${source} já existe.`);
  }

  const sentryEnvPath = path.join(process.cwd(), '.env.sentry-build-plugin');
  const sentryEnvContent = ['SENTRY_DISABLE_AUTO_UPLOAD=1', 'SENTRY_ALLOW_FAILURE=1'].join('\n') + '\n';
  fs.writeFileSync(sentryEnvPath, sentryEnvContent, 'utf8');
  const iosSentryEnvPath = path.join(process.cwd(), 'ios', '.env.sentry-build-plugin');
  fs.mkdirSync(path.dirname(iosSentryEnvPath), { recursive: true });
  fs.writeFileSync(iosSentryEnvPath, sentryEnvContent, 'utf8');
  console.log('✅ .env.sentry-build-plugin criado para evitar falha do Sentry no build.');

  // 3. Decodificação de Credenciais Base64
  const iosCredsDir = path.join(process.cwd(), 'credentials', 'ios');
  if (!fs.existsSync(iosCredsDir)) {
    fs.mkdirSync(iosCredsDir, { recursive: true });
  }

  // 3.1 Suporte direto a variáveis de ambiente (Prioridade)
  const envCreds = [
    { env: 'APPLE_CERT_BASE64', file: 'AcucaradasEncomendas-dist-cert.p12' },
    { env: 'APPLE_PROVISION_BASE64', file: 'AcucaradasEncomendas-profile.mobileprovision' },
    { env: 'ONESIGNAL_CERT_BASE64', file: 'OneSignalNotificationServiceExtension-dist-cert.p12' },
    { env: 'ONESIGNAL_PROVISION_BASE64', file: 'OneSignalNotificationServiceExtension-profile.mobileprovision' }
  ];

  envCreds.forEach(item => {
    if (process.env[item.env]) {
      const targetPath = path.join(iosCredsDir, item.file);
      console.log(`🔓 Decodificando ${item.env} -> credentials/ios/${item.file}`);
      try {
        const buffer = Buffer.from(process.env[item.env].trim(), 'base64');
        fs.writeFileSync(targetPath, buffer);
        console.log(`✅ ${item.file} gerado com sucesso.`);
      } catch (e) {
        console.error(`❌ Erro ao decodificar ${item.env}:`, e.message);
      }
    }
  });

  // 3.2 Fallback: Se o OneSignal não tiver certificados próprios, tenta reutilizar o principal
  // (O certificado de distribuição costuma ser o mesmo, mas o provisioning DEVE ser diferente)
  const mainCert = path.join(iosCredsDir, 'AcucaradasEncomendas-dist-cert.p12');
  const osCert = path.join(iosCredsDir, 'OneSignalNotificationServiceExtension-dist-cert.p12');
  
  if (fs.existsSync(mainCert) && !fs.existsSync(osCert)) {
    console.log('📋 Reutilizando certificado principal para OneSignal Extension...');
    fs.copyFileSync(mainCert, osCert);
  }

  // 3.2 Legado: Verificando arquivos .txt em credentials/ios/
  if (fs.existsSync(iosCredsDir)) {
    // Espaço para lógica de legado se necessário
  }

  // 4. Gerar credentials.json para EAS Build Local
  const credentialsJsonPath = path.join(process.cwd(), 'credentials.json');
  const certPath = path.join('credentials', 'ios', 'AcucaradasEncomendas-dist-cert.p12');
  const profilePath = path.join('credentials', 'ios', 'AcucaradasEncomendas-profile.mobileprovision');
  
  if (fs.existsSync(path.join(process.cwd(), certPath)) && fs.existsSync(path.join(process.cwd(), profilePath))) {
    const credentialsJson = {
      ios: {
        provisioningProfilePath: profilePath,
        distributionCertificate: {
          path: certPath,
          password: process.env.APPLE_CERT_PASSWORD || ''
        }
      }
    };
    fs.writeFileSync(credentialsJsonPath, JSON.stringify(credentialsJson, null, 2));
    console.log('✅ credentials.json gerado para build local.');
  } else {
    console.warn('⚠️ Credenciais não encontradas, credentials.json não foi gerado.');
  }

  console.log('\n✅ Ambiente preparado com sucesso!');
}

prepare();
