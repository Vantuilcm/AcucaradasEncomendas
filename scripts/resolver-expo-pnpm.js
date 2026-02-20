#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}=== RESOLVEDOR DE PROBLEMAS EXPO + PNPM ===${colors.reset}\n`);

// Verifica se estamos na raiz do projeto
function verificarRaizProjeto() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`${colors.red}Erro: Este script deve ser executado na raiz do projeto (onde está o package.json)${colors.reset}`);
    process.exit(1);
  }
  return packageJsonPath;
}

// Carrega o package.json
function carregarPackageJson(packageJsonPath) {
  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    console.error(`${colors.red}Erro ao ler package.json: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Salva o package.json
function salvarPackageJson(packageJsonPath, packageJson) {
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log(`${colors.green}✓ package.json atualizado com sucesso${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erro ao salvar package.json: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Configura o .npmrc para melhor compatibilidade com Expo
function configurarNpmrc() {
  const npmrcPath = path.resolve(process.cwd(), '.npmrc');
  const configRecomendada = `node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
shallow-install=false
resolve-peers-from-workspace-root=true
save-workspace-protocol=false
engine-strict=false
fund=false
audit=false
strict-ssl=false
save-exact=true
prefer-frozen-lockfile=false
hoist-pattern[]=*
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*metro*
`;

  try {
    fs.writeFileSync(npmrcPath, configRecomendada, 'utf8');
    console.log(`${colors.green}✓ .npmrc configurado para melhor compatibilidade com Expo${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erro ao configurar .npmrc: ${error.message}${colors.reset}`);
  }
}

// Atualiza as dependências do Expo para versões compatíveis
function atualizarDependenciasExpo(packageJson) {
  const sdkVersion = packageJson.dependencies?.expo?.match(/\d+\.\d+\.\d+/)?.[0];
  if (!sdkVersion) {
    console.warn(`${colors.yellow}Aviso: Não foi possível determinar a versão do SDK do Expo${colors.reset}`);
    return packageJson;
  }

  console.log(`${colors.blue}Versão do SDK do Expo detectada: ${sdkVersion}${colors.reset}`);

  // Versões compatíveis para o SDK 49
  if (sdkVersion.startsWith('49')) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'expo': '~49.0.23',
      'expo-router': '2.0.15',
      'react': '18.2.0',
      'react-dom': '18.2.0',
      'react-native': '0.72.10',
      'react-native-gesture-handler': '~2.12.0',
      'react-native-screens': '~3.22.0',
      'metro': '0.76.8',
      'metro-core': '0.76.8',
      'metro-config': '0.76.8',
      'metro-runtime': '0.76.8',
      '@types/react': '~18.2.14'
    };

    // Atualiza overrides
    if (!packageJson.pnpm) {
      packageJson.pnpm = {};
    }
    
    packageJson.pnpm.overrides = {
      ...packageJson.pnpm.overrides,
      'metro': '0.76.8',
      'metro-core': '0.76.8',
      'metro-config': '0.76.8',
      'metro-runtime': '0.76.8',
      'react': '18.2.0',
      'react-dom': '18.2.0',
      'react-native': '0.72.10',
      'expo-router': '2.0.0',
      '@types/react': '18.2.14',
      'react-native-gesture-handler': '2.12.0',
      'react-native-screens': '3.22.0',
      'node-fetch': '2.6.7',
      'minimatch': '3.1.2',
      'react-is': '18.2.0',
      'scheduler': '0.23.0'
    };
  }

  return packageJson;
}

// Atualiza os scripts para usar PNPM
function atualizarScripts(packageJson) {
  packageJson.scripts = {
    ...packageJson.scripts,
    'start': 'expo start',
    'android': 'expo start --android',
    'ios': 'expo start --ios',
    'web': 'expo start --web',
    'clean': 'rm -rf node_modules && pnpm store prune',
    'reinstall': 'pnpm run clean && pnpm install'
  };

  return packageJson;
}

// Limpa o ambiente e reinstala as dependências
function limparEReiniciar() {
  console.log(`${colors.magenta}Limpando ambiente e reinstalando dependências...${colors.reset}`);
  
  try {
    // Remover node_modules
    console.log('Removendo node_modules...');
    try {
      fs.rmSync(path.resolve(process.cwd(), 'node_modules'), { recursive: true, force: true });
    } catch (error) {
      console.warn(`${colors.yellow}Aviso ao remover node_modules: ${error.message}${colors.reset}`);
    }

    // Remover arquivos de cache
    console.log('Removendo arquivos de cache...');
    try {
      fs.rmSync(path.resolve(process.cwd(), '.expo'), { recursive: true, force: true });
    } catch (error) {
      // Ignora se o diretório não existir
    }

    // Remover pnpm-lock.yaml
    console.log('Removendo pnpm-lock.yaml...');
    try {
      fs.unlinkSync(path.resolve(process.cwd(), 'pnpm-lock.yaml'));
    } catch (error) {
      // Ignora se o arquivo não existir
    }

    console.log(`${colors.green}✓ Limpeza concluída${colors.reset}`);
    
    // Instalar dependências
    console.log('\nInstalando dependências com PNPM...');
    console.log('Este processo pode demorar alguns minutos. Por favor, aguarde...');
    
    console.log('\nExecute o comando a seguir manualmente:');
    console.log(`${colors.cyan}pnpm install --no-frozen-lockfile${colors.reset}`);
    
    console.log('\nApós a instalação, inicie o aplicativo com:');
    console.log(`${colors.cyan}npx expo start${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Erro durante a limpeza e reinstalação: ${error.message}${colors.reset}`);
  }
}

// Função principal
function main() {
  const packageJsonPath = verificarRaizProjeto();
  let packageJson = carregarPackageJson(packageJsonPath);
  
  // Fazer backup do package.json
  const backupPath = path.resolve(process.cwd(), 'package.json.backup');
  fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log(`${colors.green}✓ Backup do package.json criado em ${backupPath}${colors.reset}`);
  
  // Configurar .npmrc
  configurarNpmrc();
  
  // Atualizar dependências do Expo
  packageJson = atualizarDependenciasExpo(packageJson);
  
  // Atualizar scripts
  packageJson = atualizarScripts(packageJson);
  
  // Salvar package.json atualizado
  salvarPackageJson(packageJsonPath, packageJson);
  
  // Limpar e reinstalar
  limparEReiniciar();
  
  console.log(`\n${colors.green}=== PROCESSO CONCLUÍDO ===${colors.reset}`);
  console.log(`${colors.cyan}Siga as instruções acima para finalizar a instalação.${colors.reset}`);
}

// Executar função principal
main();