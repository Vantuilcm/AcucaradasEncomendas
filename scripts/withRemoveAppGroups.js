const fs = require('fs');
const path = require('path');
const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

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

function provisioningSupportsAppGroups() {
  const iosCredsDir = path.join(process.cwd(), 'credentials', 'ios');
  const candidates = [
    path.join(iosCredsDir, 'AcucaradasEncomendas-profile.mobileprovision'),
    path.join(iosCredsDir, 'OneSignalNotificationServiceExtension-profile.mobileprovision'),
  ];

  for (const p of candidates) {
    const xml = readMobileProvisionXml(p);
    if (xml && xml.includes('<key>com.apple.security.application-groups</key>')) {
      return true;
    }
  }
  return false;
}

/**
 * Config Plugin para remover App Groups dos entitlements e Info.plist.
 * Isso resolve o erro de Provisioning Profile quando a capacidade não está habilitada.
 */
const withRemoveAppGroups = (config) => {
  const keepAppGroups = provisioningSupportsAppGroups();

  // 1. Corrigir Entitlements
  config = withEntitlementsPlist(config, (config) => {
    if (!keepAppGroups && config.modResults['com.apple.security.application-groups']) {
      console.log('🩹 [withRemoveAppGroups] Removendo com.apple.security.application-groups dos Entitlements');
      delete config.modResults['com.apple.security.application-groups'];
    }
    return config;
  });

  // 2. Corrigir Info.plist
  config = withInfoPlist(config, (config) => {
    if (!keepAppGroups && config.modResults['OneSignal_app_groups_id']) {
      console.log('🩹 [withRemoveAppGroups] Removendo OneSignal_app_groups_id do Info.plist');
      delete config.modResults['OneSignal_app_groups_id'];
    }
    return config;
  });

  return config;
};

module.exports = withRemoveAppGroups;
