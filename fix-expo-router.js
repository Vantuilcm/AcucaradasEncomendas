/**
 * Script para corrigir problemas de carregamento do bundle do Expo Router com PNPM
 * Este script resolve o erro: net::ERR_ABORTED http://192.168.0.13:8081/node_modules%5Cexpo-router%5Centry.bundle
 */

const fs = require('fs');
const path = require('path');

// Função para verificar se o diretório node_modules/expo-router existe
function checkExpoRouterDir() {
  const expoRouterPath = path.join(process.cwd(), 'node_modules', 'expo-router');
  return fs.existsSync(expoRouterPath);
}

// Função para verificar se o arquivo entry.js existe
function checkEntryFile() {
  const entryFilePath = path.join(process.cwd(), 'node_modules', 'expo-router', 'entry.js');
  return fs.existsSync(entryFilePath);
}

// Função para criar o arquivo entry.js se não existir
function createEntryFile() {
  const entryFilePath = path.join(process.cwd(), 'node_modules', 'expo-router', 'entry.js');
  const entryContent = `// Arquivo gerado automaticamente pelo script fix-expo-router.js
// Este arquivo resolve problemas de carregamento do bundle do Expo Router com PNPM

import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Deve corresponder ao nome do projeto no app.json
const projectRoot = __dirname;
const entryPoint = require.resolve('../App');

registerRootComponent(ExpoRoot(projectRoot, entryPoint));
`;

  fs.writeFileSync(entryFilePath, entryContent);
  console.log('✅ Arquivo entry.js criado com sucesso!');
}

// Função para verificar e corrigir o package.json
function fixPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = require(packageJsonPath);

  // Verificar se o main está configurado corretamente
  if (packageJson.main !== 'node_modules/expo-router/entry') {
    const oldMain = packageJson.main;
    packageJson.main = 'node_modules/expo-router/entry';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`✅ package.json atualizado: main alterado de '${oldMain}' para 'node_modules/expo-router/entry'`);
  } else {
    console.log('✓ package.json já está configurado corretamente.');
  }
}

// Função principal
function main() {
  console.log('🔍 Verificando configuração do Expo Router...');

  if (!checkExpoRouterDir()) {
    console.error('❌ Diretório node_modules/expo-router não encontrado!');
    console.log('💡 Execute "pnpm install" para instalar as dependências.');
    return;
  }

  if (!checkEntryFile()) {
    console.log('⚠️ Arquivo entry.js não encontrado em node_modules/expo-router');
    createEntryFile();
  } else {
    console.log('✓ Arquivo entry.js já existe.');
  }

  fixPackageJson();

  console.log('\n🚀 Configuração concluída! Execute "npx expo start --clear" para iniciar o aplicativo.');
}

// Executar o script
main();