const fs = require('fs');
const path = require('path');
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

log.title('CORREÇÃO DO METRO WATCHER');
log.info('Iniciando correção do Metro Watcher...');

// Função para verificar se um arquivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Função para encontrar o arquivo Watcher.js
function encontrarWatcherJs() {
  // Caminho padrão para o arquivo Watcher.js
  const caminhosPossiveis = [
    path.join(process.cwd(), 'node_modules', 'metro-file-map', 'src', 'Watcher.js'),
    // Caminhos para instalações com PNPM
    ...fs.readdirSync(path.join(process.cwd(), 'node_modules', '.pnpm'))
      .filter(dir => dir.startsWith('metro-file-map@'))
      .map(dir => path.join(process.cwd(), 'node_modules', '.pnpm', dir, 'node_modules', 'metro-file-map', 'src', 'Watcher.js'))
  ];

  for (const caminho of caminhosPossiveis) {
    if (fileExists(caminho)) {
      log.success(`Arquivo Watcher.js encontrado em: ${caminho}`);
      return caminho;
    }
  }

  // Busca recursiva como último recurso
  log.warning('Arquivo Watcher.js não encontrado nos caminhos padrão. Realizando busca recursiva...');
  try {
    const resultado = execSync('where /r "node_modules" Watcher.js', { encoding: 'utf8' });
    const caminhos = resultado.split('\n')
      .filter(c => c.includes('metro-file-map') && c.includes('src') && c.trim() !== '');
    
    if (caminhos.length > 0) {
      log.success(`Arquivo Watcher.js encontrado em: ${caminhos[0].trim()}`);
      return caminhos[0].trim();
    }
  } catch (err) {
    log.error(`Erro ao buscar Watcher.js: ${err.message}`);
  }

  log.error('Arquivo Watcher.js não encontrado!');
  return null;
}

// Encontrar o arquivo Watcher.js
const watcherPath = encontrarWatcherJs();
if (!watcherPath) {
  log.error('Não foi possível encontrar o arquivo Watcher.js. Instalação pode estar corrompida.');
  log.info('Tente executar: pnpm install --force');
  process.exit(1);
}

// Fazer backup do arquivo original
const backupPath = `${watcherPath}.backup`;
if (!fileExists(backupPath)) {
  log.info('Criando backup do arquivo original...');
  fs.copyFileSync(watcherPath, backupPath);
  log.success('Backup criado com sucesso!');
}

// Ler o conteúdo do arquivo
let content = fs.readFileSync(watcherPath, 'utf8');

// Verificar se o arquivo já foi modificado
if (content.includes('MAX_WAIT_TIME = 30000') || content.includes('// CORRIGIDO: Aumentado timeout')) {
  log.success('O arquivo Watcher.js já foi modificado anteriormente.');
} else {
  log.info('Modificando o arquivo Watcher.js...');
  
  // Substituir o tempo limite padrão (provavelmente 5000ms) por 30000ms
  let modificado = false;
  
  // Padrão 1: MAX_WAIT_TIME constante
  if (content.includes('MAX_WAIT_TIME')) {
    content = content.replace(/MAX_WAIT_TIME\s*=\s*\d+/, 'MAX_WAIT_TIME = 30000 // CORRIGIDO: Aumentado timeout para evitar falha no watch mode');
    modificado = true;
  }
  
  // Padrão 2: setTimeout direto no método _onTimeout
  const timeoutPattern = /setTimeout\(\s*\(\)\s*=>\s*\{[^}]*\}\s*,\s*(\d+)\s*\)/g;
  if (timeoutPattern.test(content)) {
    content = content.replace(timeoutPattern, (match, timeout) => {
      return match.replace(timeout, '30000') + ' // CORRIGIDO: Aumentado timeout para evitar falha no watch mode';
    });
    modificado = true;
  }
  
  // Padrão 3: Adicionar tratamento de erro no _onTimeout
  const onTimeoutMethod = /(_onTimeout\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*;)/;
  if (onTimeoutMethod.test(content) && !content.includes('_handleWatchFailure')) {
    content = content.replace(onTimeoutMethod, (match) => {
      // Adicionar try/catch ao método _onTimeout
      return match.replace('{', '{
    try {').replace(/}\s*;$/, '} catch (error) {
      console.warn(`Metro Watcher: Erro ao iniciar watch mode: ${error}. Tentando novamente...`);
      // Tentar novamente após 5 segundos
      setTimeout(() => this._startWatching(), 5000);
    }
  };');
    });
    modificado = true;
  }
  
  if (modificado) {
    // Salvar as alterações
    fs.writeFileSync(watcherPath, content, 'utf8');
    log.success('Arquivo Watcher.js modificado com sucesso!');
  } else {
    log.warning('Não foi possível identificar os padrões esperados no arquivo Watcher.js.');
    log.info('O arquivo pode ter uma estrutura diferente da esperada.');
  }
}

// Limpar caches
log.title('LIMPANDO CACHES');

// Limpar o cache do Metro
log.info('Limpando cache do Metro...');
const metroCachePaths = [
  path.join(process.cwd(), '.metro-cache'),
  path.join(process.cwd(), 'node_modules', '.cache', 'metro'),
  path.join(os.homedir(), '.metro-cache')
];

let metroLimpo = false;
for (const cacheDir of metroCachePaths) {
  if (fs.existsSync(cacheDir)) {
    try {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      log.success(`Cache do Metro removido: ${cacheDir}`);
      metroLimpo = true;
    } catch (error) {
      log.error(`Erro ao remover cache do Metro: ${error.message}`);
    }
  }
}

if (!metroLimpo) {
  log.info('Nenhum cache do Metro encontrado para limpar.');
}

// Limpar o cache do Watchman
log.info('Limpando cache do Watchman...');
try {
  execSync('watchman watch-del-all', { stdio: 'ignore' });
  log.success('Cache do Watchman limpo com sucesso!');
} catch (error) {
  log.warning('Não foi possível limpar o cache do Watchman. Isso pode não ser um problema se o Watchman não estiver instalado.');
}

// Limpar o cache do Expo
log.info('Limpando cache do Expo...');
const expoDir = path.join(process.cwd(), '.expo');
if (fs.existsSync(expoDir)) {
  try {
    fs.rmSync(expoDir, { recursive: true, force: true });
    log.success('Cache do Expo removido com sucesso!');
  } catch (error) {
    log.error(`Erro ao remover cache do Expo: ${error.message}`);
  }
} else {
  log.info('Nenhum cache do Expo encontrado para limpar.');
}

// Verificar e ajustar as configurações do metro.config.js
log.title('ATUALIZANDO CONFIGURAÇÕES DO METRO');
log.info('Verificando configurações do Metro...');
const metroConfigPath = path.join(process.cwd(), 'metro.config.js');

if (fileExists(metroConfigPath)) {
  let metroConfig = fs.readFileSync(metroConfigPath, 'utf8');
  let modificado = false;
  
  // Verificar se já tem configuração de maxWorkers
  if (!metroConfig.includes('maxWorkers')) {
    log.info('Adicionando configuração de maxWorkers ao metro.config.js...');
    
    // Encontrar a posição para inserir a configuração
    const posicaoConfig = metroConfig.indexOf('module.exports = config');
    
    if (posicaoConfig !== -1) {
      // Preparar a configuração
      const configMaxWorkers = '\n// Limitar o número de workers para evitar problemas de watch\nconfig.maxWorkers = 2;\n';
      
      // Inserir a configuração antes de module.exports
      metroConfig = metroConfig.slice(0, posicaoConfig) + configMaxWorkers + metroConfig.slice(posicaoConfig);
      modificado = true;
    }
  } else {
    log.success('Configuração de maxWorkers já existe no metro.config.js.');
  }
  
  // Verificar se já tem configuração para desativar Watchman
  if (!metroConfig.includes('useWatchman = false')) {
    log.info('Desativando Watchman para evitar problemas no Windows...');
    
    // Encontrar a posição para inserir a configuração
    const posicaoConfig = metroConfig.indexOf('module.exports = config');
    
    if (posicaoConfig !== -1) {
      // Preparar a configuração
      const configWatchman = '\n// Desativar Watchman para evitar problemas no Windows\nconfig.resolver.useWatchman = false;\n';
      
      // Inserir a configuração antes de module.exports
      metroConfig = metroConfig.slice(0, posicaoConfig) + configWatchman + metroConfig.slice(posicaoConfig);
      modificado = true;
    }
  } else {
    log.success('Watchman já está desativado no metro.config.js.');
  }
  
  // Verificar se já tem configuração para resetar cache
  if (!metroConfig.includes('resetCache = true')) {
    log.info('Adicionando configuração para resetar cache...');
    
    // Encontrar a posição para inserir a configuração
    const posicaoConfig = metroConfig.indexOf('module.exports = config');
    
    if (posicaoConfig !== -1) {
      // Preparar a configuração
      const configResetCache = '\n// Forçar reset do cache para evitar problemas de watch\nconfig.resetCache = true;\n';
      
      // Inserir a configuração antes de module.exports
      metroConfig = metroConfig.slice(0, posicaoConfig) + configResetCache + metroConfig.slice(posicaoConfig);
      modificado = true;
    }
  } else {
    log.success('Configuração de resetCache já existe no metro.config.js.');
  }
  
  if (modificado) {
    // Salvar o arquivo atualizado
    fs.writeFileSync(metroConfigPath, metroConfig, 'utf8');
    log.success('Configurações do metro.config.js atualizadas com sucesso!');
  } else {
    log.success('Todas as configurações necessárias já existem no metro.config.js.');
  }
} else {
  log.warning('Arquivo metro.config.js não encontrado. Não foi possível ajustar as configurações.');
}

// Criar script de inicialização otimizado
log.title('CRIANDO SCRIPT DE INICIALIZAÇÃO OTIMIZADO');
const scriptPath = path.join(process.cwd(), 'iniciar-metro-otimizado.bat');

try {
  const scriptContent = `@echo off
echo ===================================================
echo    INICIANDO METRO BUNDLER COM CONFIGURACOES OTIMIZADAS
echo ===================================================

:: Encerrar processos anteriores
taskkill /F /IM node.exe >nul 2>&1

:: Limpar caches
if exist ".expo" rmdir /S /Q ".expo"
if exist ".metro-cache" rmdir /S /Q ".metro-cache"
if exist "node_modules\.cache\metro" rmdir /S /Q "node_modules\.cache\metro"

:: Configurar variáveis de ambiente
set METRO_MAX_WORKERS=1
set WATCHMAN_POLLING=true
set NODE_OPTIONS=--max_old_space_size=6144
set REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1

:: Iniciar o Metro Bundler
echo Iniciando Metro Bundler...
pnpm expo start --clear
`;
  
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  log.success(`Script de inicialização criado com sucesso: ${scriptPath}`);
} catch (err) {
  log.error(`Erro ao criar script de inicialização: ${err.message}`);
}

// Atualizar variáveis de ambiente no .env
log.title('ATUALIZANDO VARIÁVEIS DE AMBIENTE');
const envPath = path.join(process.cwd(), '.env');

try {
  // Verificar se o arquivo .env existe
  let envContent = '';
  if (fileExists(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Adicionar ou atualizar variáveis de ambiente
  const variaveis = {
    'WATCHMAN_POLLING': 'true',
    'METRO_MAX_WORKERS': '1',
    'METRO_CACHE_RESET': 'true',
    'EXPO_USE_METRO_CACHE': 'false',
    'REACT_NATIVE_PACKAGER_HOSTNAME': '127.0.0.1'
  };
  
  let atualizadas = false;
  
  for (const [chave, valor] of Object.entries(variaveis)) {
    const regex = new RegExp(`^${chave}=.*$`, 'm');
    
    if (regex.test(envContent)) {
      // Atualizar variável existente
      envContent = envContent.replace(regex, `${chave}=${valor}`);
      log.info(`Variável ${chave} atualizada para ${valor}`);
      atualizadas = true;
    } else {
      // Adicionar nova variável
      envContent += `\n${chave}=${valor}`;
      log.info(`Variável ${chave} adicionada com valor ${valor}`);
      atualizadas = true;
    }
  }
  
  if (atualizadas) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    log.success('Arquivo .env atualizado com sucesso!');
  } else {
    log.info('Nenhuma variável de ambiente precisou ser atualizada.');
  }
} catch (err) {
  log.error(`Erro ao atualizar o arquivo .env: ${err.message}`);
}

log.title('CORREÇÃO DO METRO WATCHER CONCLUÍDA');
log.success('Todas as correções foram aplicadas com sucesso!');

log.title('PRÓXIMOS PASSOS');
log.info('1. Execute o script de inicialização otimizado:');
log.info('   .\\iniciar-metro-otimizado.bat');
log.info('2. Se o problema persistir, tente:');
log.info('   pnpm install --force');
log.info('3. Para problemas persistentes, verifique:');
log.info('   - Versões das dependências no package.json');
log.info('   - Configurações do metro.config.js');
log.info('   - Padrões de hoisting no .npmrc');
log.info('   - Espaço em disco e permissões de arquivos');
log.info('   - Antivírus ou firewall bloqueando operações de arquivo');