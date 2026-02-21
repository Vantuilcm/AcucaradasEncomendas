const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando correção do Metro Bundler para Windows...');

// Função para verificar se um arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho);
}

// Função para verificar se um diretório existe
function verificarDiretorio(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isDirectory();
}

// Função para limpar o cache do Metro
function limparCacheMetro() {
  console.log('Limpando cache do Metro...');
  const metroDir = path.join(process.cwd(), '.metro-cache');
  if (verificarDiretorio(metroDir)) {
    try {
      fs.rmSync(metroDir, { recursive: true, force: true });
      console.log('✅ Cache do Metro removido com sucesso!');
    } catch (error) {
      console.error(`❌ Erro ao remover cache do Metro: ${error.message}`);
    }
  } else {
    console.log('⚠️ Diretório .metro-cache não encontrado. Nada para limpar.');
  }
}

// Função para limpar o cache do Expo
function limparCacheExpo() {
  console.log('Limpando cache do Expo...');
  const expoDir = path.join(process.cwd(), '.expo');
  if (verificarDiretorio(expoDir)) {
    try {
      fs.rmSync(expoDir, { recursive: true, force: true });
      console.log('✅ Cache do Expo removido com sucesso!');
    } catch (error) {
      console.error(`❌ Erro ao remover cache do Expo: ${error.message}`);
    }
  } else {
    console.log('⚠️ Diretório .expo não encontrado. Nada para limpar.');
  }
}

// Função para ajustar o metro.config.js
function ajustarMetroConfig() {
  console.log('Verificando configurações do Metro...');
  const metroConfigPath = path.join(process.cwd(), 'metro.config.js');
  
  if (!verificarArquivo(metroConfigPath)) {
    console.error('❌ Arquivo metro.config.js não encontrado!');
    return;
  }
  
  try {
    let metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
    let modificado = false;
    
    // Verificar e adicionar configuração para resolver problemas no Windows
    if (!metroConfig.includes('resolver.useWatchman = false')) {
      console.log('Adicionando configuração para desativar Watchman...');
      
      // Encontrar a posição para inserir a configuração
      const posicaoConfig = metroConfig.indexOf('module.exports = config');
      
      if (posicaoConfig !== -1) {
        // Preparar a configuração
        const configWatchman = '\n// Desativar Watchman para evitar problemas no Windows\nconfig.resolver.useWatchman = false;\n';
        
        // Inserir a configuração antes de module.exports
        metroConfig = metroConfig.slice(0, posicaoConfig) + configWatchman + metroConfig.slice(posicaoConfig);
        modificado = true;
      }
    }
    
    // Verificar e ajustar maxWorkers para um valor menor
    const maxWorkersRegex = /config\.maxWorkers\s*=\s*(\d+)/;
    const maxWorkersMatch = metroConfig.match(maxWorkersRegex);
    
    if (maxWorkersMatch && parseInt(maxWorkersMatch[1]) > 2) {
      console.log('Ajustando maxWorkers para 2...');
      metroConfig = metroConfig.replace(maxWorkersRegex, 'config.maxWorkers = 2');
      modificado = true;
    }
    
    // Adicionar configuração de resetCache
    if (!metroConfig.includes('resetCache')) {
      console.log('Adicionando configuração de resetCache...');
      
      const posicaoConfig = metroConfig.indexOf('module.exports = config');
      
      if (posicaoConfig !== -1) {
        const configResetCache = '\n// Forçar reset do cache para evitar problemas de watch\nconfig.resetCache = true;\n';
        
        metroConfig = metroConfig.slice(0, posicaoConfig) + configResetCache + metroConfig.slice(posicaoConfig);
        modificado = true;
      }
    }
    
    // Salvar as alterações se houve modificação
    if (modificado) {
      fs.writeFileSync(metroConfigPath, metroConfig, 'utf8');
      console.log('✅ Configurações do Metro atualizadas com sucesso!');
    } else {
      console.log('✅ Configurações do Metro já estão otimizadas.');
    }
  } catch (error) {
    console.error(`❌ Erro ao processar metro.config.js: ${error.message}`);
  }
}

// Função para verificar e corrigir o NODE_OPTIONS
function ajustarNodeOptions() {
  console.log('Verificando NODE_OPTIONS...');
  
  try {
    // Criar um arquivo .env se não existir
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (verificarArquivo(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Verificar se já tem NODE_OPTIONS
    if (!envContent.includes('NODE_OPTIONS')) {
      console.log('Adicionando NODE_OPTIONS para aumentar memória disponível...');
      
      // Adicionar NODE_OPTIONS com --max-old-space-size
      const nodeOptions = '\n# Aumentar memória disponível para o Node.js\nNODE_OPTIONS=--max-old-space-size=4096\n';
      
      // Adicionar ao arquivo .env
      fs.appendFileSync(envPath, nodeOptions);
      console.log('✅ NODE_OPTIONS configurado com sucesso!');
    } else if (!envContent.includes('--max-old-space-size')) {
      console.log('Atualizando NODE_OPTIONS para incluir --max-old-space-size...');
      
      // Substituir NODE_OPTIONS existente
      const nodeOptionsRegex = /NODE_OPTIONS=([^\n]*)/;
      const nodeOptionsNovo = 'NODE_OPTIONS=$1 --max-old-space-size=4096';
      
      envContent = envContent.replace(nodeOptionsRegex, nodeOptionsNovo);
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ NODE_OPTIONS atualizado com sucesso!');
    } else {
      console.log('✅ NODE_OPTIONS já está configurado corretamente.');
    }
  } catch (error) {
    console.error(`❌ Erro ao configurar NODE_OPTIONS: ${error.message}`);
  }
}

// Função para verificar e corrigir o entry.js do expo-router
function verificarExpoRouter() {
  console.log('Verificando expo-router...');
  
  const caminhoNodeModules = path.join(process.cwd(), 'node_modules');
  const caminhoExpoRouter = path.join(caminhoNodeModules, 'expo-router');
  
  if (!verificarDiretorio(caminhoExpoRouter)) {
    console.error('❌ Diretório expo-router não encontrado em node_modules!');
    console.log('Tente executar: pnpm install');
    return;
  }
  
  // Verificar e criar entry.js se necessário
  const caminhoEntry = path.join(caminhoExpoRouter, 'entry.js');
  if (!verificarArquivo(caminhoEntry)) {
    console.log('Criando arquivo entry.js...');
    
    const conteudoEntry = `// Arquivo gerado automaticamente para resolver problemas com expo-router\nimport { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be exported or Fast Refresh won't update the context
export function App() {\n  const ctx = require.context('./app');\n  return <ExpoRoot context={ctx} />;\n}\n\nregisterRootComponent(App);\n`;
    
    try {
      fs.writeFileSync(caminhoEntry, conteudoEntry, 'utf8');
      console.log('✅ Arquivo entry.js criado com sucesso!');
    } catch (error) {
      console.error(`❌ Erro ao criar entry.js: ${error.message}`);
    }
  } else {
    console.log('✅ Arquivo entry.js já existe.');
  }
  
  // Verificar package.json do expo-router
  const caminhoPackageJson = path.join(caminhoExpoRouter, 'package.json');
  if (verificarArquivo(caminhoPackageJson)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(caminhoPackageJson, 'utf8'));
      
      if (packageJson.main !== './entry.js') {
        console.log(`Corrigindo campo 'main' no package.json de ${packageJson.main} para './entry.js'`);
        
        packageJson.main = './entry.js';
        fs.writeFileSync(caminhoPackageJson, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log('✅ Campo main corrigido no package.json!');
      } else {
        console.log('✅ Campo main já está configurado corretamente no package.json.');
      }
    } catch (error) {
      console.error(`❌ Erro ao processar package.json: ${error.message}`);
    }
  } else {
    console.error('❌ Arquivo package.json não encontrado em expo-router!');
  }
}

// Função principal
function main() {
  console.log('Iniciando correção do Metro Bundler para Windows...');
  
  // Limpar caches
  limparCacheMetro();
  limparCacheExpo();
  
  // Ajustar configurações
  ajustarMetroConfig();
  ajustarNodeOptions();
  verificarExpoRouter();
  
  console.log('\n✅ Correção do Metro Bundler concluída!');
  console.log('\nPróximos passos:');
  console.log('1. Execute: npx expo start --clear --no-watchman');
  console.log('2. Se o problema persistir, tente: pnpm install --force');
  console.log('3. Para problemas persistentes, reinicie seu computador e tente novamente.');
}

// Executar função principal
main();