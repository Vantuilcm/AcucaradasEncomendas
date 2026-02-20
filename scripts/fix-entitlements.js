const fs = require('fs');
const path = require('path');

/**
 * Este script remove o entitlement 'com.apple.security.application-groups' 
 * de todos os arquivos .entitlements gerados.
 * Isso é necessário quando o Provisioning Profile no servidor da Expo 
 * não possui a capacidade de App Groups habilitada, o que causa erro no local build.
 */

function fixEntitlements() {
  console.log('🔧 Iniciando fix-entitlements.js para resolver conflitos de App Groups...');
  const iosDir = path.join(process.cwd(), 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('⚠️ Diretório ios não encontrado. Execute prebuild primeiro.');
    return;
  }

  const iosCredsDir = path.join(process.cwd(), 'credentials', 'ios');
  const mainProfilePath = path.join(iosCredsDir, 'AcucaradasEncomendas-profile.mobileprovision');
  const oneSignalProfilePath = path.join(iosCredsDir, 'OneSignalNotificationServiceExtension-profile.mobileprovision');

  function readMobileProvisionXml(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      const start = raw.indexOf('<?xml');
      const end = raw.indexOf('</plist>');
      if (start === -1 || end === -1) return null;
      return raw.slice(start, end + '</plist>'.length);
    } catch {
      return null;
    }
  }

  const cachedProfiles = {
    main: readMobileProvisionXml(mainProfilePath),
    onesignal: readMobileProvisionXml(oneSignalProfilePath),
  };

  function getProfileXmlForFile(filePath) {
    if (filePath.includes('OneSignalNotificationServiceExtension')) return cachedProfiles.onesignal;
    return cachedProfiles.main;
  }

  function profileSupportsEntitlement(filePath, entitlementKey) {
    const xml = getProfileXmlForFile(filePath);
    if (!xml) return false;
    return xml.includes(`<key>${entitlementKey}</key>`);
  }

  function shouldSkipDirectory(dirPath) {
    const normalized = dirPath.replace(/\\/g, '/');
    return (
      normalized.includes('/Pods/') ||
      normalized.endsWith('/Pods') ||
      normalized.includes('/.git/') ||
      normalized.includes('/build/') ||
      normalized.includes('/DerivedData/')
    );
  }

  function isTargetFile(filePath) {
    const fileName = path.basename(filePath);
    if (fileName.endsWith('.entitlements')) return true;
    if (fileName === 'Info.plist') return true;
    if (fileName.endsWith('.pbxproj')) return true;
    return false;
  }

  function findTargetFiles(dir) {
    let results = [];
    if (shouldSkipDirectory(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findTargetFiles(filePath));
      } else if (isTargetFile(filePath)) {
        results.push(filePath);
      }
    });
    return results;
  }

  const files = findTargetFiles(iosDir);
  
  if (files.length === 0) {
    console.log('ℹ️ Nenhum arquivo de entitlements/Info.plist/pbxproj encontrado.');
    return;
  }

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;

    // 1. App Groups
    const allowAppGroups = profileSupportsEntitlement(file, 'com.apple.security.application-groups');
    if (!allowAppGroups && content.includes('com.apple.security.application-groups')) {
      console.log(`🛠️ Removendo App Groups de: ${file}`);
      const regex = /<key>com\.apple\.security\.application-groups<\/key>\s*<array>[\s\S]*?<\/array>/gi;
      content = content.replace(regex, '');
      const regexEmpty = /<key>com\.apple\.security\.application-groups<\/key>\s*<array\/>/gi;
      content = content.replace(regexEmpty, '');
      const regexKeyOnly = /<key>com\.apple\.security\.application-groups<\/key>/gi;
      content = content.replace(regexKeyOnly, '');
      hasChanges = true;
    }

    // 2. Apple Pay (In-App Payments)
    const allowApplePay = profileSupportsEntitlement(file, 'com.apple.developer.in-app-payments');
    if (!allowApplePay && content.includes('com.apple.developer.in-app-payments')) {
      console.log(`🛠️ Removendo Apple Pay de: ${file}`);
      const payRegex = /<key>com\.apple\.developer\.in-app-payments<\/key>\s*<array>[\s\S]*?<\/array>/gi;
      content = content.replace(payRegex, '');
      const payRegexEmpty = /<key>com\.apple\.developer\.in-app-payments<\/key>\s*<array\/>/gi;
      content = content.replace(payRegexEmpty, '');
      hasChanges = true;
    }

    // 3. Background Location (Core Location)
    const allowBackgroundLocation = profileSupportsEntitlement(file, 'com.apple.developer.corelocation.background-modes');
    if (!allowBackgroundLocation && content.includes('com.apple.developer.corelocation.background-modes')) {
      console.log(`🛠️ Removendo Core Location de: ${file}`);
      const locRegex = /<key>com\.apple\.developer\.corelocation\.background-modes<\/key>\s*<array>[\s\S]*?<\/array>/gi;
      content = content.replace(locRegex, '');
      const locRegexEmpty = /<key>com\.apple\.developer\.corelocation\.background-modes<\/key>\s*<array\/>/gi;
      content = content.replace(locRegexEmpty, '');
      hasChanges = true;
    }

    // 3.1 Push Notifications (Se o erro persistir com APS, removemos também para build local)
    // Nota: Geralmente production profiles têm APS, mas se o perfil estiver quebrado, removemos.
    // if (content.includes('aps-environment')) { ... }

    // 4. Info.plist - UIBackgroundModes
    if (file.endsWith('Info.plist')) {
      if (!allowAppGroups && content.includes('OneSignal_app_groups_id')) {
        const osRegex = /<key>OneSignal_app_groups_id<\/key>\s*<string>[\s\S]*?<\/string>/gi;
        content = content.replace(osRegex, '');
        hasChanges = true;
      }
      
      if (content.includes('OneSignal_disable_unhandled_groups')) {
        const osDisableRegex = /<key>OneSignal_disable_unhandled_groups<\/key>\s*<(true|false)\/>/gi;
        content = content.replace(osDisableRegex, '');
        hasChanges = true;
      }

      if (!allowBackgroundLocation && content.includes('<string>location</string>') && content.includes('<key>UIBackgroundModes</key>')) {
        console.log(`🛠️ Removendo Background Location de Info.plist: ${file}`);
        content = content.replace(/<string>location<\/string>/g, '');
        hasChanges = true;
      }
    }

    // 5. pbxproj - Capabilities
    if (file.endsWith('.pbxproj')) {
      if (content.includes('com.apple.AppGroups') || content.includes('com.apple.InAppPayments') || content.includes('com.apple.CoreLocation')) {
        console.log(`🛠️ Limpando Capabilities no pbxproj: ${file}`);

        if (!allowAppGroups) {
          content = content.replace(/com\.apple\.AppGroups = \{\s*enabled = 1;\s*\};/gi, '');
        }

        if (!allowApplePay) {
          content = content.replace(/com\.apple\.InAppPayments = \{\s*enabled = 1;\s*\};/gi, '');
        }

        if (!allowBackgroundLocation) {
          content = content.replace(/com\.apple\.CoreLocation = \{\s*enabled = 1;\s*\};/gi, '');
        }

        if (!allowAppGroups) {
          content = content.replace(/SystemCapabilities = \{\s*com\.apple\.AppGroups = \{\s*enabled = 1;\s*\};\s*\};/gi, 'SystemCapabilities = {};');
        }

        if (!allowApplePay) {
          content = content.replace(/SystemCapabilities = \{\s*com\.apple\.InAppPayments = \{\s*enabled = 1;\s*\};\s*\};/gi, 'SystemCapabilities = {};');
        }

        hasChanges = true;
      }
    }

    // Adiciona flag OneSignal se for extensão
    if (file.includes('OneSignalNotificationServiceExtension') && file.endsWith('Info.plist')) {
      if (!allowAppGroups && !content.includes('OneSignal_disable_unhandled_groups')) {
        content = content.replace('</dict>', '  <key>OneSignal_disable_unhandled_groups</key>\n  <true/>\n</dict>');
        console.log(`➕ Adicionada flag OneSignal_disable_unhandled_groups em: ${file}`);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Arquivo ${file} corrigido.`);
    }
  });
}

fixEntitlements();
