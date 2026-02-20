const fs = require('fs');
const path = require('path');

/**
 * Patch ultra-agressivo nos templates do OneSignal dentro do node_modules.
 * Isso impede que o OneSignal sequer tente injetar App Groups durante o prebuild.
 */
function patchOneSignalTemplates() {
  console.log('🔧 Iniciando patch nos templates do OneSignal em node_modules...');

  const pathsToPatch = [
    'node_modules/onesignal-expo-plugin/support/serviceExtensionFiles/OneSignalNotificationServiceExtension.entitlements',
    'node_modules/onesignal-expo-plugin/build/support/serviceExtensionFiles/OneSignalNotificationServiceExtension.entitlements'
  ];

  pathsToPatch.forEach(relPath => {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      console.log(`🔍 Patching: ${relPath}`);
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove App Groups do template
      const regex = /<key>com\.apple\.security\.application-groups<\/key>\s*<array>[\s\S]*?<\/array>/gi;
      if (regex.test(content)) {
        content = content.replace(regex, '');
        // Limpar XML se sobrar dict vazio
        content = content.replace(/<dict>\s*<\/dict>/g, '<dict/>');
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Patch aplicado com sucesso em ${relPath}`);
      } else {
        console.log(`ℹ️ App Groups não encontrado em ${relPath} (já pode estar limpo)`);
      }
    } else {
      console.log(`⚠️ Arquivo não encontrado: ${relPath}`);
    }
  });

  // Também vamos tentar patchear o código JS do plugin que injeta as configurações
  const pluginFiles = [
    'node_modules/onesignal-expo-plugin/build/index.js',
    'node_modules/onesignal-expo-plugin/build/withOneSignalIos.js'
  ];

  pluginFiles.forEach(relPath => {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      console.log(`🔍 Analisando código do plugin: ${relPath}`);
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Tenta desativar a lógica que adiciona app groups ao pbxproj ou entitlements
      if (content.includes('com.apple.security.application-groups')) {
        console.log(`🛠️ Desativando referências a App Groups no código do plugin: ${relPath}`);
        // Substitui a string por algo inofensivo ou remove a lógica
        content = content.replace(/['"]com\.apple\.security\.application-groups['"]/g, '"com.apple.security.disabled-app-groups"');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Código do plugin patcheado: ${relPath}`);
      }
    }
  });
}

patchOneSignalTemplates();
