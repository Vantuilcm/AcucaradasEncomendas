// Script para corrigir dependências do React Navigation
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando correção das dependências de navegação...');

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

// Função para atualizar o package.json
function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Versões compatíveis das dependências de navegação
    const navigationDeps = {
      '@react-navigation/native': '6.1.9',
      '@react-navigation/stack': '6.3.20',
      '@react-navigation/bottom-tabs': '6.5.11',
      'react-native-screens': '3.22.0',
      'react-native-safe-area-context': '4.6.3',
      'react-native-gesture-handler': '2.12.0'
    };
    
    // Atualizar as dependências
    let updated = false;
    for (const [dep, version] of Object.entries(navigationDeps)) {
      if (packageJson.dependencies[dep] && packageJson.dependencies[dep] !== version) {
        console.log(`Atualizando ${dep} de ${packageJson.dependencies[dep]} para ${version}`);
        packageJson.dependencies[dep] = version;
        updated = true;
      } else if (!packageJson.dependencies[dep]) {
        console.log(`Adicionando ${dep} versão ${version}`);
        packageJson.dependencies[dep] = version;
        updated = true;
      }
    }
    
    // Adicionar overrides se necessário
    if (!packageJson.overrides) {
      packageJson.overrides = {};
    }
    
    for (const [dep, version] of Object.entries(navigationDeps)) {
      packageJson.overrides[dep] = version;
      if (packageJson.pnpm && packageJson.pnpm.overrides) {
        packageJson.pnpm.overrides[dep] = version;
      }
    }
    
    // Salvar o package.json atualizado
    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('package.json atualizado com sucesso!');
      return true;
    } else {
      console.log('Nenhuma atualização necessária no package.json.');
      return false;
    }
  } catch (error) {
    console.error('Erro ao atualizar package.json:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  try {
    // 1. Atualizar package.json
    const packageUpdated = updatePackageJson();
    
    // 2. Limpar caches
    console.log('Limpando caches...');
    execCommand('pnpm cache clean --force');
    execCommand('npx expo-doctor clear-cache');
    
    // 3. Reinstalar dependências
    if (packageUpdated) {
      console.log('Reinstalando dependências...');
      execCommand('pnpm install');
    }
    
    // 4. Verificar instalação das dependências de navegação
    console.log('Verificando instalação das dependências de navegação...');
    execCommand('pnpm list @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-native-gesture-handler');
    
    console.log('\nCorreção das dependências de navegação concluída com sucesso!');
    console.log('Agora você pode iniciar o aplicativo com: npx expo start');
  } catch (error) {
    console.error('Erro durante a execução do script:', error.message);
  }
}

// Executar o script
main();