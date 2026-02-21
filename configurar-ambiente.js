const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

// Função para obter o endereço IP local
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  let ipAddress = '';
  
  // Procura por interfaces de rede ativas
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((iface) => {
      // Ignora endereços IPv6 e interfaces de loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
      }
    });
  });
  
  return ipAddress || '127.0.0.1';
}

// Função para criar ou atualizar o arquivo .env
function updateEnvFile(ipAddress) {
  log.title('CONFIGURANDO VARIÁVEIS DE AMBIENTE');
  
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  // Verifica se o arquivo .env já existe
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    log.info('Arquivo .env encontrado, atualizando configurações...');
  } else {
    log.info('Criando novo arquivo .env...');
  }
  
  // Configurações para otimizar o ambiente Expo/React Native
  const envVars = {
    // IP fixo para o servidor de desenvolvimento
    EXPO_DEVTOOLS_LISTEN_ADDRESS: ipAddress,
    REACT_NATIVE_PACKAGER_HOSTNAME: ipAddress,
    
    // Otimizações de memória
    NODE_OPTIONS: '--max_old_space_size=6144',
    
    // Otimizações do Metro Bundler
    METRO_MAX_WORKERS: Math.max(1, Math.floor(os.cpus().length / 2)),
    METRO_CACHE_RESET: 'false',
    
    // Desativar telemetria para melhorar performance
    EXPO_TELEMETRY_DISABLED: '1',
    REACT_NATIVE_TELEMETRY_DISABLED: '1',
    
    // Ambiente de produção (alterar para 'development' durante desenvolvimento)
    NODE_ENV: 'development',
    
    // Otimizações adicionais
    EXPO_USE_METRO_CACHE: 'true',
    EXPO_DEBUG: 'false'
  };
  
  // Atualiza o conteúdo do arquivo .env
  Object.entries(envVars).forEach(([key, value]) => {
    // Verifica se a variável já existe no arquivo
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(envContent)) {
      // Atualiza a variável existente
      envContent = envContent.replace(regex, `${key}=${value}`);
      log.info(`Atualizado: ${key}=${value}`);
    } else {
      // Adiciona a nova variável
      envContent += `\n${key}=${value}`;
      log.info(`Adicionado: ${key}=${value}`);
    }
  });
  
  // Salva o arquivo .env atualizado
  fs.writeFileSync(envPath, envContent.trim());
  log.success('Arquivo .env atualizado com sucesso!');
}

// Função para criar script de inicialização otimizado
function createOptimizedStartScript() {
  log.title('CRIANDO SCRIPT DE INICIALIZAÇÃO OTIMIZADO');
  
  const scriptPath = path.join(process.cwd(), 'iniciar-expo-otimizado.bat');
  const scriptContent = `@echo off
echo Iniciando Expo com configuracoes otimizadas...

:: Limpa caches
call limpar-caches.bat

:: Configura variaveis de ambiente
node configurar-ambiente.js

:: Tenta corrigir IPs
set REACT_NATIVE_PACKAGER_HOSTNAME=%EXPO_DEVTOOLS_LISTEN_ADDRESS%

:: Configura memoria para o Node.js
set NODE_OPTIONS=--max_old_space_size=6144

:: Inicia o Expo com configuracoes otimizadas
echo Iniciando Expo...
pnpm expo start --clear
`;
  
  fs.writeFileSync(scriptPath, scriptContent);
  log.success('Script de inicialização otimizado criado com sucesso!');
}

// Função para criar ou atualizar o arquivo .npmrc
function updateNpmrcFile() {
  log.title('CONFIGURANDO ARQUIVO .NPMRC');
  
  const npmrcPath = path.join(process.cwd(), '.npmrc');
  let npmrcContent = '';
  
  // Verifica se o arquivo .npmrc já existe
  if (fs.existsSync(npmrcPath)) {
    npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
    log.info('Arquivo .npmrc encontrado, atualizando configurações...');
  } else {
    log.info('Criando novo arquivo .npmrc...');
  }
  
  // Configurações para otimizar o PNPM com projetos Expo/React Native
  const npmrcSettings = [
    'node-linker=hoisted',
    'shamefully-hoist=true',
    'strict-peer-dependencies=false',
    'auto-install-peers=true',
    'resolution-mode=highest',
    'use-node-version=18.18.0',
    'engine-strict=false',
    'public-hoist-pattern[]=*expo*',
    'public-hoist-pattern[]=*@expo*',
    'public-hoist-pattern[]=*react*',
    'public-hoist-pattern[]=*@react*',
    'public-hoist-pattern[]=*react-native*',
    'public-hoist-pattern[]=*@react-native*',
    'public-hoist-pattern[]=*metro*',
    'public-hoist-pattern[]=*@babel*',
    'public-hoist-pattern[]=babel*',
    'public-hoist-pattern[]=*navigation*',
    'public-hoist-pattern[]=*@navigation*',
    'public-hoist-pattern[]=*@ui-kitten*',
    'public-hoist-pattern[]=*@rneui*',
    'public-hoist-pattern[]=*native-base*',
    'public-hoist-pattern[]=*@shopify*',
    'public-hoist-pattern[]=*@gorhom*',
    'public-hoist-pattern[]=*@reduxjs*',
    'public-hoist-pattern[]=*redux*',
    'public-hoist-pattern[]=*reanimated*',
    'public-hoist-pattern[]=*gesture-handler*',
    'public-hoist-pattern[]=*safe-area*',
    'public-hoist-pattern[]=*svg*',
    'public-hoist-pattern[]=*firebase*',
    'public-hoist-pattern[]=*@firebase*',
  ];
  
  // Adiciona cada configuração ao arquivo .npmrc
  npmrcSettings.forEach((setting) => {
    if (!npmrcContent.includes(setting)) {
      npmrcContent += `\n${setting}`;
      log.info(`Adicionado: ${setting}`);
    }
  });
  
  // Salva o arquivo .npmrc atualizado
  fs.writeFileSync(npmrcPath, npmrcContent.trim());
  log.success('Arquivo .npmrc atualizado com sucesso!');
}

// Função principal
function main() {
  try {
    log.title('CONFIGURANDO AMBIENTE DE DESENVOLVIMENTO');
    
    // Obtém o endereço IP local
    const ipAddress = getLocalIpAddress();
    log.info(`Endereço IP local detectado: ${ipAddress}`);
    
    // Atualiza o arquivo .env com as configurações otimizadas
    updateEnvFile(ipAddress);
    
    // Atualiza o arquivo .npmrc
    updateNpmrcFile();
    
    // Cria o script de inicialização otimizado
    createOptimizedStartScript();
    
    log.title('CONFIGURAÇÃO CONCLUÍDA');
    log.success('Ambiente de desenvolvimento configurado com sucesso!');
    log.info('Para iniciar o aplicativo com as configurações otimizadas, execute:');
    log.info('iniciar-expo-otimizado.bat');
    
  } catch (error) {
    log.error(`Erro ao configurar o ambiente: ${error.message}`);
    process.exit(1);
  }
}

// Executa a função principal
main();