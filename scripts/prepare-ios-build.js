const fs = require('fs');
const path = require('path');

/**
 * Script para preparar o build iOS (Açucaradas Encomendas)
 * Simplificado para respeitar o buildNumber fixo 1190.
 */

function prepare() {
  console.log('\n--- 🍎 PREPARAÇÃO PARA BUILD IOS (MISSÃO 1190) ---');

  console.log('✅ Pulando verificação de buildNumber no app.json (usando app.config.js fixo)');

  const source = 'GoogleService-Info.prod.plist';
  
  if (process.env.GOOGLE_SERVICE_INFO_PLIST) {
    const plistContent = process.env.GOOGLE_SERVICE_INFO_PLIST.trim();
    if (plistContent.startsWith('<?xml')) {
      console.log('✅ Criando GoogleService-Info.prod.plist a partir da variável de ambiente (XML Válido)...');
      fs.writeFileSync(source, plistContent);
    }
  }

  const sentryEnvPath = path.join(process.cwd(), '.env.sentry-build-plugin');
  const sentryEnvContent = ['SENTRY_DISABLE_AUTO_UPLOAD=1', 'SENTRY_ALLOW_FAILURE=1'].join('\n') + '\n';
  fs.writeFileSync(sentryEnvPath, sentryEnvContent, 'utf8');
  
  console.log('✅ Ambiente preparado para Build 1190.');
}

prepare();
