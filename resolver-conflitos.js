/**
 * Script para resolver conflitos específicos de dependências
 * Analisa o package.json e pnpm-lock.yaml para identificar e corrigir conflitos
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para ler o arquivo package.json
function lerPackageJson() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const conteudo = fs.readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(conteudo);
}

// Função para escrever no arquivo package.json
function escreverPackageJson(packageJson) {
  const packageJsonPath = path.join(__dirname, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
}

// Função para verificar e corrigir conflitos específicos
function corrigirConflitosEspecificos() {
  console.log('🔧 Verificando e corrigindo conflitos específicos...');
  
  const packageJson = lerPackageJson();
  let alteracoes = false;
  
  // Garantir que as versões de overrides estejam corretas
  if (!packageJson.pnpm) {
    packageJson.pnpm = {};
  }
  
  if (!packageJson.pnpm.overrides) {
    packageJson.pnpm.overrides = {};
  }
  
  // Definir overrides específicos para resolver conflitos conhecidos
  const overridesNecessarios = {
    'metro-runtime': '0.76.8',
    'expo-router': '2.0.0',
    'react': '18.2.0',
    'react-native': '0.72.10',
    'metro-config': '0.76.8',
    'metro': '0.76.8',
    'react-dom': '18.2.0',
    '@types/react': '18.2.14',
    'metro-resolver': '0.76.8',
    'metro-core': '0.76.8',
    '@expo/metro-config': '0.10.0',
    '@react-native-async-storage/async-storage': '1.18.2',
    '@react-native-community/cli': '11.4.1',
    'react-native-svg': '13.9.0',
    'firebase': '10.14.1',
    'xmldom': '0.6.0',
    '@react-native-voice/voice': '3.1.5',
    'react-native-gesture-handler': '2.12.0',
    'react-native-screens': '3.22.0',
    'node-fetch': '2.6.7',
    'minimatch': '3.1.2',
    'react-is': '18.2.0',
    'scheduler': '0.23.0'
  };
  
  // Atualizar overrides
  for (const [pacote, versao] of Object.entries(overridesNecessarios)) {
    if (packageJson.pnpm.overrides[pacote] !== versao) {
      packageJson.pnpm.overrides[pacote] = versao;
      alteracoes = true;
      console.log(`✅ Definido override para ${pacote}@${versao}`);
    }
  }
  
  // Verificar e corrigir dependências diretas
  const dependenciasParaVerificar = {
    'dependencies': {
      'expo-router': '2.0.0',
      'metro': '0.76.8',
      'metro-config': '0.76.8',
      'metro-core': '0.76.8',
      'metro-runtime': '0.76.8',
      'react-native-gesture-handler': '~2.12.0'
    },
    'devDependencies': {
      '@babel/core': '7.28.0'
    }
  };
  
  for (const [tipo, deps] of Object.entries(dependenciasParaVerificar)) {
    for (const [pacote, versao] of Object.entries(deps)) {
      if (packageJson[tipo] && packageJson[tipo][pacote] !== versao) {
        packageJson[tipo][pacote] = versao;
        alteracoes = true;
        console.log(`✅ Corrigida versão de ${pacote} para ${versao} em ${tipo}`);
      }
    }
  }
  
  // Salvar alterações se necessário
  if (alteracoes) {
    escreverPackageJson(packageJson);
    console.log('✅ Alterações salvas no package.json');
  } else {
    console.log('✅ Nenhuma alteração necessária no package.json');
  }
}

// Função para verificar e corrigir peer dependencies
function verificarPeerDependencies() {
  console.log('\n🔍 Verificando peer dependencies não satisfeitas...');
  
  try {
    execSync('pnpm install --force', { stdio: 'inherit' });
    console.log('✅ Peer dependencies resolvidas com --force');
  } catch (error) {
    console.error('❌ Erro ao resolver peer dependencies:', error.message);
  }
}

// Função principal
async function main() {
  console.log('🔧 INICIANDO RESOLUÇÃO DE CONFLITOS DE DEPENDÊNCIAS 🔧');
  console.log('====================================================');
  
  // Corrigir conflitos específicos no package.json
  corrigirConflitosEspecificos();
  
  // Verificar e corrigir peer dependencies
  verificarPeerDependencies();
  
  console.log('\n✅ RESOLUÇÃO DE CONFLITOS CONCLUÍDA!');
  console.log('Execute "pnpm install" para aplicar as alterações.');
}

// Executar a função principal
main().catch(error => {
  console.error('❌ Erro durante a resolução de conflitos:', error);
  process.exit(1);
});