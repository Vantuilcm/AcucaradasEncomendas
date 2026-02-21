/**
 * Script para limpar o cache do Metro Bundler e resolver problemas de carregamento
 * Este script resolve o erro: net::ERR_ABORTED http://192.168.0.13:8081/node_modules%5Cexpo-router%5Centry.bundle
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para limpar o cache do Metro
function limparCacheMetro() {
  console.log('🧹 Limpando cache do Metro Bundler...');
  
  try {
    // Remover diretório .expo se existir
    const expoDir = path.join(process.cwd(), '.expo');
    if (fs.existsSync(expoDir)) {
      console.log('Removendo diretório .expo...');
      fs.rmSync(expoDir, { recursive: true, force: true });
    }
    
    // Remover diretório .metro-cache se existir
    const metroCacheDir = path.join(process.cwd(), 'node_modules', '.metro-cache');
    if (fs.existsSync(metroCacheDir)) {
      console.log('Removendo diretório .metro-cache...');
      fs.rmSync(metroCacheDir, { recursive: true, force: true });
    }
    
    console.log('✅ Cache do Metro limpo com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
  }
}

// Função para verificar e corrigir o arquivo entry.js
function verificarEntryFile() {
  console.log('🔍 Verificando arquivo entry.js...');
  
  const entryDir = path.join(process.cwd(), 'node_modules', 'expo-router');
  const entryFilePath = path.join(entryDir, 'entry.js');
  
  if (!fs.existsSync(entryDir)) {
    console.log('⚠️ Diretório expo-router não encontrado. Criando...');
    fs.mkdirSync(entryDir, { recursive: true });
  }
  
  const entryContent = `// Arquivo gerado automaticamente para resolver problemas de carregamento
// Este arquivo resolve o erro: net::ERR_ABORTED http://192.168.0.13:8081/node_modules%5Cexpo-router%5Centry.bundle

import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Deve corresponder ao nome do projeto no app.json
const projectRoot = __dirname;
const entryPoint = require.resolve('../App');

registerRootComponent(ExpoRoot(projectRoot, entryPoint));
`;
  
  fs.writeFileSync(entryFilePath, entryContent);
  console.log('✅ Arquivo entry.js criado/atualizado com sucesso!');
}

// Função principal
function main() {
  console.log('🚀 Iniciando processo de limpeza e correção...');
  
  // Limpar cache do Metro
  limparCacheMetro();
  
  // Verificar e corrigir entry.js
  verificarEntryFile();
  
  console.log('\n✨ Processo concluído! Execute o comando abaixo para iniciar o aplicativo:');
  console.log('\n   npx expo start --clear\n');
}

// Executar o script
main();