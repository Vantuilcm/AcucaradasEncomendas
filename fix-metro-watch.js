/**
 * Script para corrigir problemas de watch mode no Metro bundler
 * Este script limpa os caches do Metro e configura o watchman corretamente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Iniciando correção do Metro bundler watch mode...');

// Função para executar comandos com tratamento de erro
function executarComando(comando, mensagemErro) {
  try {
    console.log(`Executando: ${comando}`);
    const resultado = execSync(comando, { stdio: 'inherit' });
    return true;
  } catch (erro) {
    console.error(`❌ ${mensagemErro}:\n`, erro.message);
    return false;
  }
}

// Limpar caches do Metro
console.log('\n🧹 Limpando caches do Metro...');
executarComando('npx react-native start --reset-cache --no-interactive', 'Falha ao limpar cache do Metro');

// Verificar e configurar Watchman
console.log('\n🔍 Verificando Watchman...');
const temWatchman = executarComando('watchman version', 'Watchman não encontrado');

if (!temWatchman) {
  console.log('\n⚠️ Watchman não encontrado. Configurando alternativa...');
  
  // Criar ou atualizar arquivo metro.config.js com configuração para desativar o uso do Watchman
  const metroConfigPath = path.join(process.cwd(), 'metro.config.js');
  let metroConfig = '';
  
  if (fs.existsSync(metroConfigPath)) {
    console.log('Atualizando metro.config.js existente...');
    const configAtual = require(metroConfigPath);
    
    // Preservar configuração existente e adicionar watchFolders
    metroConfig = `
module.exports = {
  ...${JSON.stringify(configAtual, null, 2)},
  watchFolders: ['.'],
  resolver: {
    ...${JSON.stringify(configAtual.resolver || {}, null, 2)},
    useWatchman: false,
  },
};
`;
  } else {
    console.log('Criando novo metro.config.js...');
    metroConfig = `
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: ['.'],
  resolver: {
    useWatchman: false,
  },
};
`;
  }
  
  fs.writeFileSync(metroConfigPath, metroConfig);
  console.log('✅ metro.config.js atualizado com sucesso!');
}

// Limpar node_modules/.cache
const cachePath = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(cachePath)) {
  console.log('\n🧹 Limpando node_modules/.cache...');
  try {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('✅ Cache limpo com sucesso!');
  } catch (erro) {
    console.error('❌ Erro ao limpar cache:', erro.message);
  }
}

// Limpar pasta .expo
const expoPath = path.join(process.cwd(), '.expo');
if (fs.existsSync(expoPath)) {
  console.log('\n🧹 Limpando pasta .expo...');
  try {
    fs.rmSync(expoPath, { recursive: true, force: true });
    console.log('✅ Pasta .expo removida com sucesso!');
  } catch (erro) {
    console.error('❌ Erro ao limpar pasta .expo:', erro.message);
  }
}

console.log('\n✨ Correção concluída! Tente iniciar o Expo novamente com: npx expo start --web');