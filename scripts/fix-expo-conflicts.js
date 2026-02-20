/**
 * Fix Expo Conflicts - Script para resolver conflitos comuns em projetos Expo/React Native
 * 
 * Este script identifica e corrige automaticamente conflitos de dependências
 * específicos para projetos Expo/React Native, que são particularmente propensos
 * a problemas de compatibilidade entre versões.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const BACKUP_PATH = path.resolve(process.cwd(), `package.json.backup-${Date.now()}`);

// Carregar package.json
function loadPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  } catch (error) {
    console.error(`Erro ao carregar package.json: ${error.message}`);
    process.exit(1);
  }
}

// Salvar package.json
function savePackageJson(packageJson) {
  try {
    // Criar backup
    fs.copyFileSync(PACKAGE_JSON_PATH, BACKUP_PATH);
    console.log(`Backup criado em: ${BACKUP_PATH}`);
    
    // Salvar alterações
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
    console.log('package.json atualizado com sucesso!');
  } catch (error) {
    console.error(`Erro ao salvar package.json: ${error.message}`);
    process.exit(1);
  }
}

// Detectar versão do Expo
function detectExpoVersion(packageJson) {
  const expoVersion = packageJson.dependencies?.expo;
  if (!expoVersion) {
    console.error('Versão do Expo não encontrada no package.json');
    process.exit(1);
  }
  
  // Remover caracteres de range (^, ~, etc)
  const cleanVersion = expoVersion.replace(/[^0-9.]/g, '');
  const majorVersion = parseInt(cleanVersion.split('.')[0], 10);
  
  console.log(`Versão do Expo detectada: ${cleanVersion} (SDK ${majorVersion})`);
  return { version: cleanVersion, major: majorVersion };
}

// Obter compatibilidade de pacotes para a versão do Expo
function getCompatibleVersions(expoVersion) {
  // Mapeamento de versões compatíveis para diferentes SDKs do Expo
  const compatibilityMap = {
    49: { // Expo SDK 49
      'react': '18.2.0',
      'react-native': '0.72.10',
      'react-dom': '18.2.0',
      '@types/react': '18.2.14',
      'expo-router': '2.0.0',
      '@react-native-async-storage/async-storage': '1.18.2',
      'react-native-svg': '13.9.0',
      'react-native-reanimated': '3.3.0',
      'react-native-gesture-handler': '2.12.0',
      'react-native-safe-area-context': '4.6.3',
      'react-native-screens': '3.22.0',
      'expo-linking': '5.0.2',
      'expo-constants': '14.4.2',
      'expo-status-bar': '1.6.0',
      'metro': '0.76.8',
      'metro-core': '0.76.8',
      'metro-runtime': '0.76.8',
      'metro-config': '0.76.8',
      '@expo/metro-config': '0.10.0'
    },
    48: { // Expo SDK 48
      'react': '18.2.0',
      'react-native': '0.71.8',
      'react-dom': '18.2.0',
      '@types/react': '18.0.27',
      'expo-router': '1.5.3',
      '@react-native-async-storage/async-storage': '1.17.11',
      'react-native-svg': '13.4.0',
      'react-native-reanimated': '2.14.4',
      'react-native-gesture-handler': '2.9.0',
      'react-native-safe-area-context': '4.5.0',
      'react-native-screens': '3.20.0',
      'expo-linking': '4.0.1',
      'expo-constants': '14.2.1',
      'expo-status-bar': '1.4.4',
      'metro': '0.73.10',
      'metro-core': '0.73.10',
      'metro-runtime': '0.73.10',
      'metro-config': '0.73.10',
      '@expo/metro-config': '0.7.1'
    },
    47: { // Expo SDK 47
      'react': '18.1.0',
      'react-native': '0.70.8',
      'react-dom': '18.1.0',
      '@types/react': '18.0.24',
      'expo-router': '1.0.0',
      '@react-native-async-storage/async-storage': '1.17.11',
      'react-native-svg': '13.4.0',
      'react-native-reanimated': '2.12.0',
      'react-native-gesture-handler': '2.8.0',
      'react-native-safe-area-context': '4.4.1',
      'react-native-screens': '3.18.0',
      'expo-linking': '3.3.1',
      'expo-constants': '14.0.2',
      'expo-status-bar': '1.4.2',
      'metro': '0.72.3',
      'metro-core': '0.72.3',
      'metro-runtime': '0.72.3',
      'metro-config': '0.72.3',
      '@expo/metro-config': '0.5.2'
    }
  };
  
  // Retornar versões compatíveis para o SDK detectado
  return compatibilityMap[expoVersion.major] || {};
}

// Verificar e corrigir conflitos de dependências
function fixDependencyConflicts(packageJson, compatibleVersions) {
  console.log('\nVerificando conflitos de dependências...');
  
  // Inicializar seção pnpm.overrides se não existir
  if (!packageJson.pnpm) {
    packageJson.pnpm = {};
  }
  
  if (!packageJson.pnpm.overrides) {
    packageJson.pnpm.overrides = {};
  }
  
  const overrides = packageJson.pnpm.overrides;
  let changesCount = 0;
  
  // Aplicar versões compatíveis como overrides
  Object.entries(compatibleVersions).forEach(([packageName, version]) => {
    // Verificar se o pacote existe nas dependências
    const inDependencies = packageJson.dependencies && packageName in packageJson.dependencies;
    const inDevDependencies = packageJson.devDependencies && packageName in packageJson.devDependencies;
    
    if (inDependencies || inDevDependencies) {
      // Adicionar ao overrides apenas se a versão for diferente
      const currentVersion = (inDependencies ? packageJson.dependencies[packageName] : packageJson.devDependencies[packageName]).replace(/[^0-9.]/g, '');
      
      if (currentVersion !== version) {
        overrides[packageName] = version;
        changesCount++;
        console.log(`Fixando ${packageName} na versão ${version} (atual: ${currentVersion})`);
      }
    }
  });
  
  // Adicionar overrides específicos para resolver problemas comuns
  const commonOverrides = {
    // Resolver vulnerabilidades comuns
    'xmldom': '0.6.0',
    'node-fetch': '2.6.7',
    'minimatch': '3.1.2',
    
    // Resolver conflitos comuns em projetos React Native
    'react-is': compatibleVersions['react'].split('.').slice(0, 2).join('.') + '.0',
    'scheduler': compatibleVersions['react'].split('.').slice(0, 2).join('.') + '.0',
  };
  
  Object.entries(commonOverrides).forEach(([packageName, version]) => {
    if (!overrides[packageName]) {
      overrides[packageName] = version;
      changesCount++;
      console.log(`Adicionando override para ${packageName}: ${version}`);
    }
  });
  
  // Remover a seção resolutions se existir (específica do Yarn)
  if (packageJson.resolutions) {
    console.log('Removendo seção "resolutions" (específica do Yarn)');
    delete packageJson.resolutions;
    changesCount++;
  }
  
  return { packageJson, changesCount };
}

// Verificar e corrigir scripts
function fixScripts(packageJson) {
  console.log('\nVerificando scripts...');
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  const scripts = packageJson.scripts;
  let changesCount = 0;
  
  // Garantir que os scripts usem pnpm
  const scriptUpdates = {
    'start': 'pnpm expo start',
    'android': 'pnpm expo start --android',
    'ios': 'pnpm expo start --ios',
    'web': 'pnpm expo start --web',
    'test': 'jest',
    'clean': 'pnpm store prune',
    'reinstall': 'pnpm run clean && pnpm install'
  };
  
  Object.entries(scriptUpdates).forEach(([scriptName, command]) => {
    const currentCommand = scripts[scriptName];
    
    // Adicionar script se não existir ou atualizar se usar npm/yarn
    if (!currentCommand || 
        (currentCommand.includes('npm ') || currentCommand.includes('yarn ')) ||
        (scriptName === 'test' && currentCommand.includes('pnpm jest'))) {
      scripts[scriptName] = command;
      changesCount++;
      console.log(`Atualizando script "${scriptName}": ${command}`);
    }
  });
  
  return { packageJson, changesCount };
}

// Verificar e corrigir engines
function fixEngines(packageJson) {
  console.log('\nVerificando configuração de engines...');
  
  if (!packageJson.engines) {
    packageJson.engines = {};
  }
  
  const engines = packageJson.engines;
  let changesCount = 0;
  
  // Atualizar engines para incluir pnpm
  if (!engines.pnpm) {
    engines.pnpm = '>=8.0.0';
    changesCount++;
    console.log('Adicionando requisito de versão para pnpm: >=8.0.0');
  }
  
  // Garantir que node e npm estejam especificados
  if (!engines.node) {
    engines.node = '>=18.0.0 <23.0.0';
    changesCount++;
    console.log('Adicionando requisito de versão para node: >=18.0.0 <23.0.0');
  }
  
  return { packageJson, changesCount };
}

// Função principal
function main() {
  console.log('=== FIX EXPO CONFLICTS ===');
  console.log('Analisando e corrigindo conflitos em projeto Expo/React Native\n');
  
  // Carregar package.json
  const packageJson = loadPackageJson();
  
  // Detectar versão do Expo
  const expoVersion = detectExpoVersion(packageJson);
  
  // Obter versões compatíveis
  const compatibleVersions = getCompatibleVersions(expoVersion);
  
  if (Object.keys(compatibleVersions).length === 0) {
    console.error(`Não foi possível determinar versões compatíveis para Expo SDK ${expoVersion.major}`);
    console.error('Versões suportadas: 47, 48, 49');
    process.exit(1);
  }
  
  // Aplicar correções
  let updatedPackageJson = packageJson;
  let totalChanges = 0;
  
  // Corrigir conflitos de dependências
  const dependencyFixes = fixDependencyConflicts(updatedPackageJson, compatibleVersions);
  updatedPackageJson = dependencyFixes.packageJson;
  totalChanges += dependencyFixes.changesCount;
  
  // Corrigir scripts
  const scriptFixes = fixScripts(updatedPackageJson);
  updatedPackageJson = scriptFixes.packageJson;
  totalChanges += scriptFixes.changesCount;
  
  // Corrigir engines
  const engineFixes = fixEngines(updatedPackageJson);
  updatedPackageJson = engineFixes.packageJson;
  totalChanges += engineFixes.changesCount;
  
  // Salvar alterações se houver mudanças
  if (totalChanges > 0) {
    console.log(`\nTotal de ${totalChanges} alterações realizadas. Salvando package.json...`);
    savePackageJson(updatedPackageJson);
    
    console.log('\nPróximos passos:');
    console.log('1. Execute: pnpm install');
    console.log('2. Teste a aplicação para verificar se tudo está funcionando');
    console.log('3. Se encontrar problemas, restaure o backup: cp ' + BACKUP_PATH + ' ' + PACKAGE_JSON_PATH);
  } else {
    console.log('\nNenhuma alteração necessária. O package.json já está otimizado!');
  }
  
  console.log('\nProcesso concluído!');
}

// Executar o script
main();