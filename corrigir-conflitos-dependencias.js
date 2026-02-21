const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando verificação e correção de conflitos de dependências...');

// Função para verificar se um arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho);
}

// Função para ler o package.json
function lerPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!verificarArquivo(packageJsonPath)) {
    console.error('❌ Arquivo package.json não encontrado!');
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Erro ao ler package.json: ${error.message}`);
    return null;
  }
}

// Função para salvar o package.json
function salvarPackageJson(packageJson) {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('✅ package.json atualizado com sucesso!');
    return true;
  } catch (error) {
    console.error(`❌ Erro ao salvar package.json: ${error.message}`);
    return false;
  }
}

// Função para verificar e corrigir conflitos de dependências
function verificarConflitos() {
  console.log('Verificando conflitos de dependências...');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  let modificado = false;
  
  // Verificar se já existe a seção overrides
  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }
  
  // Adicionar overrides para resolver conflitos comuns
  const overridesNecessarios = {
    // Resolver conflitos de versões do React
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    
    // Resolver conflitos do Expo Router
    'expo-router': '^3.0.0',
    '@expo/metro-runtime': '^3.1.1',
    
    // Resolver conflitos do Metro Bundler
    'metro': '^0.80.0',
    'metro-resolver': '^0.80.0',
    
    // Resolver conflitos de dependências transitivas
    '@babel/core': '^7.23.3',
    '@babel/runtime': '^7.23.2',
    'react-refresh': '^0.14.0'
  };
  
  // Verificar e adicionar cada override necessário
  for (const [pacote, versao] of Object.entries(overridesNecessarios)) {
    if (!packageJson.overrides[pacote] || packageJson.overrides[pacote] !== versao) {
      console.log(`Adicionando override para ${pacote}: ${versao}`);
      packageJson.overrides[pacote] = versao;
      modificado = true;
    }
  }
  
  // Verificar e corrigir versões de dependências diretas
  const dependenciasParaCorrigir = {
    'expo': '^50.0.0',
    'expo-router': '^3.0.0',
    'react': '18.2.0',
    'react-native': '0.73.2',
    '@expo/metro-runtime': '^3.1.1'
  };
  
  // Verificar dependências
  if (packageJson.dependencies) {
    for (const [pacote, versao] of Object.entries(dependenciasParaCorrigir)) {
      if (packageJson.dependencies[pacote] && packageJson.dependencies[pacote] !== versao) {
        console.log(`Corrigindo versão de ${pacote}: ${packageJson.dependencies[pacote]} -> ${versao}`);
        packageJson.dependencies[pacote] = versao;
        modificado = true;
      }
    }
  }
  
  // Salvar as alterações se houve modificação
  if (modificado) {
    salvarPackageJson(packageJson);
    console.log('✅ Conflitos de dependências corrigidos no package.json!');
    console.log('⚠️ É necessário executar "pnpm install --force" para aplicar as alterações.');
  } else {
    console.log('✅ Não foram encontrados conflitos de dependências para corrigir.');
  }
}

// Função para verificar e criar .npmrc
function verificarNpmrc() {
  console.log('Verificando configurações do .npmrc...');
  
  const npmrcPath = path.join(process.cwd(), '.npmrc');
  let conteudoNpmrc = '';
  let modificado = false;
  
  if (verificarArquivo(npmrcPath)) {
    conteudoNpmrc = fs.readFileSync(npmrcPath, 'utf8');
  }
  
  // Configurações necessárias para resolver conflitos
  const configuracoesNecessarias = [
    'node-linker=hoisted',
    'public-hoist-pattern[]=*expo*',
    'public-hoist-pattern[]=*@expo*',
    'public-hoist-pattern[]=expo',
    'public-hoist-pattern[]=*react*',
    'public-hoist-pattern[]=react',
    'public-hoist-pattern[]=*metro*',
    'public-hoist-pattern[]=metro',
    'shamefully-hoist=true'
  ];
  
  // Verificar e adicionar cada configuração necessária
  for (const configuracao of configuracoesNecessarias) {
    if (!conteudoNpmrc.includes(configuracao)) {
      console.log(`Adicionando configuração: ${configuracao}`);
      conteudoNpmrc += `\n${configuracao}`;
      modificado = true;
    }
  }
  
  // Salvar as alterações se houve modificação
  if (modificado) {
    try {
      fs.writeFileSync(npmrcPath, conteudoNpmrc.trim(), 'utf8');
      console.log('✅ Configurações do .npmrc atualizadas com sucesso!');
    } catch (error) {
      console.error(`❌ Erro ao salvar .npmrc: ${error.message}`);
    }
  } else {
    console.log('✅ Configurações do .npmrc já estão otimizadas.');
  }
}

// Função principal
function main() {
  console.log('Iniciando verificação e correção de conflitos de dependências...');
  
  // Verificar e corrigir conflitos
  verificarConflitos();
  verificarNpmrc();
  
  console.log('\n✅ Verificação e correção de conflitos concluída!');
  console.log('\nPróximos passos:');
  console.log('1. Execute: .\\reinstalar-dependencias.bat');
  console.log('2. Após a reinstalação, execute: .\\iniciar-expo-otimizado.bat');
  console.log('3. Se o problema persistir, reinicie seu computador e tente novamente.');
}

// Executar função principal
main();