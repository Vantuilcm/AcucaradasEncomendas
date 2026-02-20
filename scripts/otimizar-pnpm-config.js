/**
 * Otimizar Configuração PNPM - Script para ajustar configurações do PNPM
 * 
 * Este script verifica e atualiza as configurações do PNPM (.npmrc)
 * para otimizar a resolução de conflitos e melhorar o desempenho.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const NPMRC_PATH = path.resolve(process.cwd(), '.npmrc');
const BACKUP_PATH = path.resolve(process.cwd(), `.npmrc.backup-${Date.now()}`);

// Configurações recomendadas para projetos React Native/Expo
const RECOMMENDED_CONFIG = {
  'node-linker': 'hoisted',
  'strict-peer-dependencies': 'false', // Inicialmente false para evitar erros de instalação
  'auto-install-peers': 'true',
  'shallow-install': 'false',
  'resolve-peers-from-workspace-root': 'true',
  'save-workspace-protocol': 'false',
  'engine-strict': 'true',
  'fund': 'false',
  'audit': 'true', // Alterado para true para verificar vulnerabilidades
  'strict-ssl': 'true', // Alterado para true para segurança
  'save-exact': 'true',
  'prefer-frozen-lockfile': 'true', // Adicionado para consistência
  'hoist-pattern': '*', // Otimiza o hoisting para reduzir duplicações
};

// Carregar configuração atual
function loadNpmrc() {
  try {
    if (fs.existsSync(NPMRC_PATH)) {
      const content = fs.readFileSync(NPMRC_PATH, 'utf8');
      const config = {};
      
      content.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (key && value) {
            config[key.trim()] = value.trim();
          }
        }
      });
      
      return config;
    }
    return {};
  } catch (error) {
    console.error(`Erro ao carregar .npmrc: ${error.message}`);
    return {};
  }
}

// Salvar configuração
function saveNpmrc(config) {
  try {
    // Criar backup se o arquivo existir
    if (fs.existsSync(NPMRC_PATH)) {
      fs.copyFileSync(NPMRC_PATH, BACKUP_PATH);
      console.log(`Backup criado em: ${BACKUP_PATH}`);
    }
    
    // Converter objeto de configuração para string
    const content = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Salvar arquivo
    fs.writeFileSync(NPMRC_PATH, content);
    console.log('Arquivo .npmrc atualizado com sucesso!');
  } catch (error) {
    console.error(`Erro ao salvar .npmrc: ${error.message}`);
    process.exit(1);
  }
}

// Verificar e atualizar configuração
function updateConfig() {
  console.log('Verificando configuração do PNPM...');
  
  const currentConfig = loadNpmrc();
  const newConfig = { ...RECOMMENDED_CONFIG };
  
  // Manter valores personalizados que não estão nas recomendações
  Object.entries(currentConfig).forEach(([key, value]) => {
    if (!newConfig.hasOwnProperty(key)) {
      newConfig[key] = value;
    }
  });
  
  // Verificar diferenças
  const differences = [];
  Object.entries(newConfig).forEach(([key, value]) => {
    if (currentConfig[key] !== value) {
      differences.push({
        key,
        oldValue: currentConfig[key] || '(não definido)',
        newValue: value
      });
    }
  });
  
  // Exibir diferenças
  if (differences.length > 0) {
    console.log('\nAlterações propostas:');
    differences.forEach(({ key, oldValue, newValue }) => {
      console.log(`- ${key}: ${oldValue} -> ${newValue}`);
    });
    
    // Salvar nova configuração
    saveNpmrc(newConfig);
    console.log('\nConfiguração atualizada! Execute "pnpm install" para aplicar as alterações.');
  } else {
    console.log('\nA configuração atual já está otimizada!');
  }
}

// Verificar se o PNPM está instalado
function checkPnpmInstallation() {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('PNPM não está instalado. Por favor, instale-o com: npm install -g pnpm');
    return false;
  }
}

// Função principal
function main() {
  console.log('=== Otimizador de Configuração PNPM ===');
  
  if (!checkPnpmInstallation()) {
    process.exit(1);
  }
  
  updateConfig();
  
  console.log('\nRecomendações adicionais:');
  console.log('1. Após resolver todos os conflitos, considere ativar "strict-peer-dependencies=true"');
  console.log('2. Execute "pnpm why <pacote>" para entender por que um pacote está sendo instalado');
  console.log('3. Use "pnpm dedupe" periodicamente para otimizar o node_modules');
}

// Executar script
main();