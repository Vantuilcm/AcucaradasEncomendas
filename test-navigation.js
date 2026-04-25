// Script para testar a navegação do aplicativo
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando teste de navegação...');

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

// Função para verificar a estrutura de navegação
function checkNavigationStructure() {
  console.log('Verificando estrutura de navegação...');
  
  const appNavigatorPath = path.join(process.cwd(), 'src', 'navigation', 'AppNavigator.tsx');
  
  if (!fs.existsSync(appNavigatorPath)) {
    console.error(`Arquivo AppNavigator.tsx não encontrado em ${appNavigatorPath}`);
    return false;
  }
  
  const content = fs.readFileSync(appNavigatorPath, 'utf8');
  
  // Verificar importações de navegação
  const navigationImports = [
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-navigation/bottom-tabs'
  ];
  
  const missingImports = [];
  
  for (const imp of navigationImports) {
    if (!content.includes(imp)) {
      missingImports.push(imp);
    }
  }
  
  if (missingImports.length > 0) {
    console.error(`Importações ausentes no AppNavigator.tsx: ${missingImports.join(', ')}`);
    return false;
  }
  
  console.log('Estrutura de navegação verificada com sucesso!');
  return true;
}

// Função para verificar as telas
function checkScreens() {
  console.log('Verificando telas do aplicativo...');
  
  const screensDir = path.join(process.cwd(), 'src', 'screens');
  
  if (!fs.existsSync(screensDir)) {
    console.error(`Diretório de telas não encontrado em ${screensDir}`);
    return false;
  }
  
  const files = fs.readdirSync(screensDir);
  const screenFiles = files.filter(file => file.endsWith('.tsx') || file.endsWith('.js'));
  
  console.log(`Encontradas ${screenFiles.length} telas no diretório ${screensDir}:`);
  screenFiles.forEach(file => console.log(`- ${file}`));
  
  return true;
}

// Função para verificar as dependências de navegação
function checkNavigationDependencies() {
  console.log('Verificando dependências de navegação...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Arquivo package.json não encontrado em ${packageJsonPath}`);
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Dependências encontradas no package.json:');
  console.log(JSON.stringify(packageJson.dependencies, null, 2));
  
  const requiredDeps = [
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-navigation/bottom-tabs',
    'react-native-screens',
    'react-native-safe-area-context',
    'react-native-gesture-handler'
  ];
  
  const missingDeps = [];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.error(`Dependências ausentes no package.json: ${missingDeps.join(', ')}`);
    return false;
  }
  
  console.log('Todas as dependências de navegação estão presentes no package.json!');
  return true;
}

// Função principal
async function main() {
  try {
    console.log('\n===== TESTE DE NAVEGAÇÃO DETALHADO =====\n');
    
    // 1. Verificar estrutura de navegação
    console.log('\n----- VERIFICAÇÃO DA ESTRUTURA DE NAVEGAÇÃO -----');
    const navigationStructureOk = checkNavigationStructure();
    
    // 2. Verificar telas
    console.log('\n----- VERIFICAÇÃO DAS TELAS -----');
    const screensOk = checkScreens();
    
    // 3. Verificar dependências
    console.log('\n----- VERIFICAÇÃO DAS DEPENDÊNCIAS -----');
    const dependenciesOk = checkNavigationDependencies();
    
    console.log('\n===== RESUMO DOS TESTES =====');
    console.log(`Estrutura de navegação: ${navigationStructureOk ? '✅ OK' : '❌ Falhou'}`);
    console.log(`Telas do aplicativo: ${screensOk ? '✅ OK' : '❌ Falhou'}`);
    console.log(`Dependências de navegação: ${dependenciesOk ? '✅ OK' : '❌ Falhou'}`);
    
    if (navigationStructureOk && screensOk && dependenciesOk) {
      console.log('\n✅ Todos os testes de navegação passaram com sucesso!');
      console.log('Você pode iniciar o aplicativo com: npx expo start');
    } else {
      console.log('\n❌ Alguns testes de navegação falharam. Por favor, corrija os problemas antes de iniciar o aplicativo.');
      console.log('Execute os scripts fix-permissions.js e fix-navigation-deps.js para corrigir os problemas.');
    }
  } catch (error) {
    console.error('Erro durante a execução do script:', error.message);
  }
}

// Executar o script
main();