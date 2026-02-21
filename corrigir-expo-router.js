/**
 * Script para corrigir problemas com o expo-router no ambiente PNPM
 * 
 * Este script resolve o erro: net::ERR_ABORTED ao carregar o bundle do expo-router
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para verificar se o diretório existe
function verificarDiretorio(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isDirectory();
}

// Função para verificar se o arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isFile();
}

// Função para criar o arquivo entry.js se não existir
function criarEntryJs(caminhoDiretorio) {
  const caminhoEntry = path.join(caminhoDiretorio, 'entry.js');
  
  if (!verificarArquivo(caminhoEntry)) {
    console.log(`Criando arquivo entry.js em ${caminhoDiretorio}`);
    
    const conteudoEntry = `// Arquivo entry.js gerado automaticamente para resolver problemas de carregamento do expo-router
// Redireciona para o entry point correto do expo-router

module.exports = require('./build/index');
`;
    
    fs.writeFileSync(caminhoEntry, conteudoEntry, 'utf8');
    console.log('✅ Arquivo entry.js criado com sucesso!');
  } else {
    console.log('✅ Arquivo entry.js já existe.');
  }
  
  return caminhoEntry;
}

// Função para verificar e corrigir o package.json do expo-router
function verificarPackageJson(caminhoDiretorio) {
  const caminhoPackageJson = path.join(caminhoDiretorio, 'package.json');
  
  if (verificarArquivo(caminhoPackageJson)) {
    console.log(`Verificando package.json em ${caminhoDiretorio}`);
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(caminhoPackageJson, 'utf8'));
      
      // Verificar se o main está correto
      if (packageJson.main !== './entry.js') {
        console.log(`Corrigindo campo 'main' no package.json de ${packageJson.main} para './entry.js'`);
        packageJson.main = './entry.js';
        
        fs.writeFileSync(caminhoPackageJson, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log('✅ Campo main corrigido no package.json!');
      } else {
        console.log('✅ Campo main já está correto no package.json.');
      }
    } catch (erro) {
      console.error('❌ Erro ao processar package.json:', erro.message);
    }
  } else {
    console.error('❌ Arquivo package.json não encontrado em', caminhoDiretorio);
  }
}

// Função para limpar o cache do Metro
function limparCacheMetro() {
  console.log('Limpando cache do Metro...');
  
  // Limpar diretório .expo
  const caminhoExpo = path.join(process.cwd(), '.expo');
  if (verificarDiretorio(caminhoExpo)) {
    try {
      fs.rmSync(caminhoExpo, { recursive: true, force: true });
      console.log('✅ Diretório .expo removido com sucesso!');
    } catch (erro) {
      console.error('❌ Erro ao remover diretório .expo:', erro.message);
    }
  }
  
  // Limpar diretório .metro-cache
  const caminhoMetroCache = path.join(process.cwd(), '.metro-cache');
  if (verificarDiretorio(caminhoMetroCache)) {
    try {
      fs.rmSync(caminhoMetroCache, { recursive: true, force: true });
      console.log('✅ Diretório .metro-cache removido com sucesso!');
    } catch (erro) {
      console.error('❌ Erro ao remover diretório .metro-cache:', erro.message);
    }
  }
  
  // Limpar cache do PNPM
  try {
    console.log('Limpando cache do PNPM...');
    execSync('pnpm store prune', { stdio: 'inherit' });
    console.log('✅ Cache do PNPM limpo com sucesso!');
  } catch (erro) {
    console.error('❌ Erro ao limpar cache do PNPM:', erro.message);
  }
}

// Função para verificar e corrigir links simbólicos
function verificarLinksSimbolicos() {
  console.log('Verificando links simbólicos para expo-router...');
  
  const caminhoNodeModules = path.join(process.cwd(), 'node_modules');
  const caminhoExpoRouter = path.join(caminhoNodeModules, 'expo-router');
  
  if (!verificarDiretorio(caminhoExpoRouter)) {
    console.error('❌ Diretório expo-router não encontrado em node_modules!');
    return;
  }
  
  // Verificar se há links simbólicos quebrados
  try {
    const arquivos = fs.readdirSync(caminhoExpoRouter);
    let temLinkQuebrado = false;
    
    for (const arquivo of arquivos) {
      const caminhoCompleto = path.join(caminhoExpoRouter, arquivo);
      
      if (fs.lstatSync(caminhoCompleto).isSymbolicLink()) {
        try {
          const linkTarget = fs.readlinkSync(caminhoCompleto);
          const targetPath = path.resolve(caminhoExpoRouter, linkTarget);
          
          if (!fs.existsSync(targetPath)) {
            console.log(`❌ Link simbólico quebrado encontrado: ${arquivo} -> ${linkTarget}`);
            temLinkQuebrado = true;
          }
        } catch (erro) {
          console.error(`❌ Erro ao verificar link simbólico ${arquivo}:`, erro.message);
        }
      }
    }
    
    if (!temLinkQuebrado) {
      console.log('✅ Nenhum link simbólico quebrado encontrado.');
    }
  } catch (erro) {
    console.error('❌ Erro ao verificar links simbólicos:', erro.message);
  }
}

// Função para verificar e atualizar o metro.config.js
function verificarMetroConfig() {
  console.log('Verificando configuração do Metro...');
  
  const caminhoMetroConfig = path.join(process.cwd(), 'metro.config.js');
  
  if (!verificarArquivo(caminhoMetroConfig)) {
    console.error('❌ Arquivo metro.config.js não encontrado!');
    return;
  }
  
  try {
    let conteudo = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    // Adicionar configuração para resolver o problema específico com expo-router/entry.bundle
    if (!conteudo.includes('resolver.resolveRequest')) {
      console.log('Adicionando configuração de resolveRequest para corrigir o problema com expo-router/entry.bundle...');
      
      // Encontrar a posição para inserir a configuração
      const posicaoConfig = conteudo.indexOf('module.exports = config');
      
      if (posicaoConfig !== -1) {
        // Preparar a configuração de resolveRequest
        const configAliases = `
// Resolver personalizado para corrigir problemas com expo-router
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Corrigir problema específico com expo-router/entry.bundle
  if (moduleName.includes('expo-router') && moduleName.includes('entry.bundle')) {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-router/entry.js'),
      type: 'sourceFile',
    };
  }
  // Usar resolução padrão para outros módulos
  return context.resolveRequest(context, moduleName, platform);
};

// Configurar aliases para resolver problemas de módulos
config.resolver.extraNodeModules = {
  'expo-router': path.resolve(__dirname, 'node_modules/expo-router'),
  '@expo/metro-runtime': path.resolve(__dirname, 'node_modules/@expo/metro-runtime'),
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// Configurar watchFolders para incluir node_modules
config.watchFolders = [
  path.resolve(__dirname, 'node_modules')
];
`;
        
        // Verificar se path já está importado
        if (!conteudo.includes('const path')) {
          conteudo = conteudo.replace(
            'const { getDefaultConfig }',
            'const { getDefaultConfig } = require("@expo/metro-config");\nconst path = require("path")'  
          );
        }
        
        // Inserir a configuração antes de module.exports
        conteudo = conteudo.slice(0, posicaoConfig) + configAliases + conteudo.slice(posicaoConfig);
        
        // Salvar o arquivo atualizado
        fs.writeFileSync(caminhoMetroConfig, conteudo, 'utf8');
        console.log('✅ Configuração de aliases adicionada ao metro.config.js!');
      } else {
        console.error('❌ Não foi possível encontrar o ponto de inserção no metro.config.js');
      }
    } else {
      console.log('✅ Configuração de aliases já existe no metro.config.js.');
    }
  } catch (erro) {
    console.error('❌ Erro ao processar metro.config.js:', erro.message);
  }
}

// Função principal
function main() {
  console.log('Iniciando correção do expo-router...');
  
  const caminhoNodeModules = path.join(process.cwd(), 'node_modules');
  const caminhoExpoRouter = path.join(caminhoNodeModules, 'expo-router');
  
  if (!verificarDiretorio(caminhoExpoRouter)) {
    console.error('❌ Diretório expo-router não encontrado em node_modules!');
    console.log('Tente executar: pnpm install');
    return;
  }
  
  // Criar entry.js se necessário
  criarEntryJs(caminhoExpoRouter);
  
  // Verificar e corrigir package.json
  verificarPackageJson(caminhoExpoRouter);
  
  // Verificar links simbólicos
  verificarLinksSimbolicos();
  
  // Verificar e atualizar metro.config.js
  verificarMetroConfig();
  
  // Limpar cache do Metro
  limparCacheMetro();
  
  console.log('\n✅ Correção do expo-router concluída!');
  console.log('\nPróximos passos:');
  console.log('1. Execute: npx expo start --clear');
  console.log('2. Se o problema persistir, tente: pnpm install --force');
  console.log('3. Para problemas persistentes, verifique as versões no package.json e os padrões de hoisting no .npmrc');
}

// Executar o script
main();