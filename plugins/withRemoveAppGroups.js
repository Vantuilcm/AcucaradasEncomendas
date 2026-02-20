const { withEntitlementsPlist, withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin ultra-agressivo para remover App Groups de todos os lugares possíveis.
 * Isso é necessário porque o OneSignal re-adiciona essas chaves em diferentes fases.
 */
const withRemoveAppGroups = (config) => {
  // 0. Remover do config.extra (EAS build re-injects entitlements from here)
  if (config.extra && config.extra.eas && config.extra.eas.build && config.extra.eas.build.experimental && config.extra.eas.build.experimental.ios) {
    const iosExt = config.extra.eas.build.experimental.ios;
    if (iosExt.appExtensions) {
      iosExt.appExtensions.forEach(ext => {
        if (ext.entitlements && ext.entitlements['com.apple.security.application-groups']) {
          delete ext.entitlements['com.apple.security.application-groups'];
          console.log(`✅ [Plugin] AppGroups removido do config.extra para extensão: ${ext.targetName}`);
        }
      });
    }
  }

  // 1. Remover do App Principal (Entitlements Plist)
  config = withEntitlementsPlist(config, (config) => {
    console.log('🔧 [Plugin] Removendo App Groups do Entitlements Plist principal');
    if (config.modResults['com.apple.security.application-groups']) {
      delete config.modResults['com.apple.security.application-groups'];
      console.log('✅ [Plugin] Chave com.apple.security.application-groups removida.');
    }
    return config;
  });

  // 2. Modificar o Xcode Project para garantir que nenhum target tenha a capability de App Groups
  config = withXcodeProject(config, (config) => {
    console.log('🔧 [Plugin] Removendo App Groups capability do Xcode Project');
    const project = config.modResults;
    const targets = project.pbxNativeTargetSection();
    
    // Obter todas as configurações de build
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    
    for (const key in targets) {
      const target = targets[key];
      if (target && target.name) {
        console.log(`🛠️ [Plugin] Limpando capabilities para target: ${target.name}`);
        
        // No Xcode Project, a capability de App Groups é registrada em 'SystemCapabilities'
        // dentro dos atributos do projeto. Vamos tentar remover essa entrada se existir.
        const projectAttributes = project.getFirstProject().firstProject.attributes;
        if (projectAttributes.TargetAttributes && projectAttributes.TargetAttributes[key]) {
          const targetAttrs = projectAttributes.TargetAttributes[key];
          if (targetAttrs.SystemCapabilities && targetAttrs.SystemCapabilities['com.apple.AppGroups']) {
            delete targetAttrs.SystemCapabilities['com.apple.AppGroups'];
            console.log(`✅ [Plugin] Capability 'com.apple.AppGroups' removida dos atributos do target: ${target.name}`);
          }
        }

        // Removendo explicitamente a seção de App Groups do target se ela existir em outros lugares
        if (target.buildPhases) {
          // Algumas ferramentas injetam via build settings, mas SystemCapabilities é o principal para Xcode
        }
      }
    }
    
    // Varredura adicional no objeto do projeto para remover menções a AppGroups
    const projectRoot = project.getFirstProject().firstProject;
    if (projectRoot.attributes && projectRoot.attributes.TargetAttributes) {
      Object.keys(projectRoot.attributes.TargetAttributes).forEach(targetId => {
        const attrs = projectRoot.attributes.TargetAttributes[targetId];
        if (attrs.SystemCapabilities && attrs.SystemCapabilities['com.apple.AppGroups']) {
          delete attrs.SystemCapabilities['com.apple.AppGroups'];
          console.log(`✅ [Plugin] Varredura extra: AppGroups removido do target ${targetId}`);
        }
      });
    }
    return config;
  });

  // 3. Dangerous Mod: O "limpa-tudo" no final do processo
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = path.join(config.modRequest.projectRoot, 'ios');
      console.log(`🔧 [Plugin] DangerousMod: Varredura final em ${iosDir}`);

      const cleanFile = (filePath) => {
        if (!fs.existsSync(filePath)) return;
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Remover App Groups de arquivos .entitlements (XML)
        if (filePath.endsWith('.entitlements')) {
          const regex = /<key>com\.apple\.security\.application-groups<\/key>\s*<array>[\s\S]*?<\/array>/gi;
          const regexEmpty = /<key>com\.apple\.security\.application-groups<\/key>\s*<array\/>/gi;
          if (regex.test(content) || regexEmpty.test(content)) {
            content = content.replace(regex, '').replace(regexEmpty, '');
            console.log(`✅ [Plugin] App Groups removido de .entitlements: ${path.basename(filePath)}`);
            changed = true;
          }
        }

        // Remover App Groups de Info.plist (XML)
        if (filePath.endsWith('Info.plist')) {
          const osRegex = /<key>OneSignal_app_groups_id<\/key>\s*<string>[\s\S]*?<\/string>/gi;
          if (osRegex.test(content)) {
            content = content.replace(osRegex, '');
            console.log(`✅ [Plugin] OneSignal App Groups removido de Info.plist: ${path.basename(filePath)}`);
            changed = true;
          }
        }

        if (changed) {
          // Limpar possíveis arrays vazios ou espaços em branco extras resultantes
          content = content.replace(/<dict>\s*<\/dict>/g, '<dict/>');
          fs.writeFileSync(filePath, content);
        }
      };

      const walkDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
          } else if (file.endsWith('.entitlements') || file.endsWith('Info.plist')) {
            cleanFile(fullPath);
          }
        });
      };

      walkDir(iosDir);
      
      // Fix específico para o OneSignalNotificationServiceExtension se o walkDir falhar em algum ponto
      const extensionEntitlements = path.join(iosDir, 'OneSignalNotificationServiceExtension', 'OneSignalNotificationServiceExtension.entitlements');
      if (fs.existsSync(extensionEntitlements)) {
        console.log('🎯 [Plugin] Forçando limpeza no entitlement da extensão OneSignal');
        cleanFile(extensionEntitlements);
      }

      return config;
    }
  ]);

  return config;
};

module.exports = withRemoveAppGroups;
