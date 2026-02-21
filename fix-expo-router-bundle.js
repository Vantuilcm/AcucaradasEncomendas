/**
 * Script para corrigir o problema específico com o bundle do expo-router
 * Resolve o erro: net::ERR_ABORTED http://localhost:8082/node_modules%5Cexpo-router%5Centry.bundle
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função principal
async function main() {
  console.log('Iniciando correção do problema com o bundle do expo-router...');
  
  // 1. Verificar se o diretório expo-router existe
  const expoRouterPath = path.join(process.cwd(), 'node_modules', 'expo-router');
  if (!fs.existsSync(expoRouterPath)) {
    console.error('Diretório expo-router não encontrado!');
    return;
  }
  
  // 2. Criar um link simbólico para o entry.js na raiz do projeto
  const entryJsPath = path.join(expoRouterPath, 'entry.js');
  const rootEntryJsPath = path.join(process.cwd(), 'expo-router-entry.js');
  
  if (fs.existsSync(entryJsPath)) {
    console.log('Criando link para entry.js na raiz do projeto...');
    fs.copyFileSync(entryJsPath, rootEntryJsPath);
    console.log(`✅ Arquivo copiado para ${rootEntryJsPath}`);
  } else {
    console.error('Arquivo entry.js não encontrado em expo-router!');
    return;
  }
  
  // 3. Criar um arquivo de bundle estático
  const bundleDir = path.join(process.cwd(), 'web-build');
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }
  
  const bundlePath = path.join(bundleDir, 'entry.bundle.js');
  console.log('Criando arquivo de bundle estático...');
  
  // Conteúdo simplificado do bundle
  const bundleContent = `// Bundle estático para resolver o problema com expo-router/entry.bundle
// Este arquivo é gerado automaticamente pelo script fix-expo-router-bundle.js

// Importar o runtime do Metro
require('@expo/metro-runtime');

// Importar o entry point do expo-router
require('expo-router/entry');
`;
  
  fs.writeFileSync(bundlePath, bundleContent, 'utf8');
  console.log(`✅ Bundle estático criado em ${bundlePath}`);
  
  // 4. Atualizar o metro.config.js para usar o bundle estático
  const metroConfigPath = path.join(process.cwd(), 'metro.config.js');
  if (fs.existsSync(metroConfigPath)) {
    console.log('Atualizando metro.config.js...');
    
    let metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
    
    // Adicionar configuração para resolver o problema com o bundle
    if (!metroConfig.includes('extraStaticBundles')) {
      const configAddition = `
// Configuração adicional para resolver o problema com expo-router/entry.bundle
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Interceptar requisições para o bundle problemático
      if (req.url && req.url.includes('expo-router') && req.url.includes('entry.bundle')) {
        const bundlePath = path.join(__dirname, 'web-build', 'entry.bundle.js');
        if (fs.existsSync(bundlePath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(bundlePath, 'utf8'));
          return;
        }
      }
      return middleware(req, res, next);
    };
  },
};
`;
      
      // Inserir antes de module.exports
      const exportPos = metroConfig.indexOf('module.exports');
      if (exportPos !== -1) {
        metroConfig = metroConfig.slice(0, exportPos) + configAddition + metroConfig.slice(exportPos);
        fs.writeFileSync(metroConfigPath, metroConfig, 'utf8');
        console.log('✅ metro.config.js atualizado com sucesso!');
      } else {
        console.error('Não foi possível encontrar o ponto de inserção no metro.config.js');
      }
    } else {
      console.log('✅ Configuração já existe no metro.config.js');
    }
  } else {
    console.error('Arquivo metro.config.js não encontrado!');
  }
  
  // 5. Limpar caches
  console.log('Limpando caches...');
  try {
    // Limpar .expo
    const expoDir = path.join(process.cwd(), '.expo');
    if (fs.existsSync(expoDir)) {
      fs.rmSync(expoDir, { recursive: true, force: true });
      console.log('✅ Diretório .expo removido');
    }
    
    // Limpar cache do Metro
    const metroCacheDir = path.join(process.cwd(), 'node_modules', '.cache');
    if (fs.existsSync(metroCacheDir)) {
      fs.rmSync(metroCacheDir, { recursive: true, force: true });
      console.log('✅ Cache do Metro removido');
    }
  } catch (error) {
    console.error('Erro ao limpar caches:', error);
  }
  
  console.log('\n✅ Correção concluída! Reinicie o servidor Expo com: npx expo start --web --clear');
}

// Executar o script
main().catch(console.error);