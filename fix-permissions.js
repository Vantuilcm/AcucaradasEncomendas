// Script para corrigir problemas de permissão na instalação de pacotes
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando correção de problemas de permissão...');

// Função para executar comandos com tratamento de erro
function execCommand(command) {
  try {
    console.log(`Executando: ${command}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    return { success: true, output };
  } catch (error) {
    console.error(`Erro ao executar comando: ${command}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Função para verificar e corrigir permissões do npm cache
function fixNpmCachePermissions() {
  console.log('Verificando permissões do cache npm...');
  
  // Limpar o cache do npm
  execCommand('npm cache clean --force');
  
  // Verificar configuração do npm
  const npmConfigResult = execCommand('npm config list');
  console.log('Configuração atual do npm verificada.');
  
  // Configurar npm para usar permissões corretas
  execCommand('npm config set cache-min 9999999');
  console.log('Cache mínimo do npm configurado para reduzir problemas de permissão.');
}

// Função para verificar e corrigir permissões do pnpm
function fixPnpmPermissions() {
  console.log('Verificando permissões do pnpm...');
  
  // Limpar o cache do pnpm
  execCommand('pnpm store prune');
  
  // Configurar pnpm para usar permissões corretas
  execCommand('pnpm config set store-dir "./.pnpm-store"');
  console.log('Diretório de store do pnpm configurado para o projeto atual.');
}

// Função para verificar e corrigir permissões do node_modules
function fixNodeModulesPermissions() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (fs.existsSync(nodeModulesPath)) {
    console.log('Verificando permissões do diretório node_modules...');
    
    try {
      // No Windows, podemos tentar renomear temporariamente para verificar acesso
      const tempPath = `${nodeModulesPath}_temp`;
      
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
      }
      
      fs.renameSync(nodeModulesPath, tempPath);
      fs.renameSync(tempPath, nodeModulesPath);
      
      console.log('Permissões do node_modules verificadas com sucesso.');
    } catch (error) {
      console.error('Erro ao verificar permissões do node_modules:', error.message);
      console.log('Tentando remover node_modules e reinstalar...');
      
      try {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
        console.log('node_modules removido com sucesso.');
      } catch (rmError) {
        console.error('Erro ao remover node_modules:', rmError.message);
        console.log('Por favor, feche todos os programas que possam estar usando os arquivos e tente novamente.');
      }
    }
  } else {
    console.log('Diretório node_modules não encontrado. Nenhuma ação necessária.');
  }
}

// Função para verificar e corrigir permissões do metro bundler
function fixMetroBundlerPermissions() {
  console.log('Verificando permissões do Metro Bundler...');
  
  // Limpar cache do metro
  execCommand('npx react-native-clean-project --keep-node-modules');
  
  // Limpar cache do watchman
  execCommand('watchman watch-del-all');
  
  console.log('Cache do Metro Bundler e Watchman limpos.');
}

// Função principal
async function main() {
  try {
    // 1. Corrigir permissões do npm cache
    fixNpmCachePermissions();
    
    // 2. Corrigir permissões do pnpm
    fixPnpmPermissions();
    
    // 3. Corrigir permissões do node_modules
    fixNodeModulesPermissions();
    
    // 4. Corrigir permissões do metro bundler
    fixMetroBundlerPermissions();
    
    // 5. Instalar dependências específicas de navegação
    console.log('\nInstalando dependências de navegação...');
    execCommand('pnpm install @react-navigation/stack @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-gesture-handler');
    
    console.log('\nCorreção de problemas de permissão concluída com sucesso!');
    console.log('Agora você pode executar o script fix-navigation-deps.js para garantir versões compatíveis.');
  } catch (error) {
    console.error('Erro durante a execução do script:', error.message);
  }
}

// Executar o script
main();