/**
 * Script para monitorar o desempenho do CI/CD com PNPM
 * 
 * Este script coleta métricas de desempenho do processo de build e instalação
 * usando PNPM e compara com os dados históricos do NPM.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const CONFIG = {
  metricsFile: path.join(__dirname, '../ci-metrics.json'),
  thresholds: {
    installTime: 120, // segundos
    buildTime: 300,   // segundos
    cacheSize: 500,   // MB
  }
};

// Função principal
async function monitorarDesempenho() {
  console.log('🔍 Iniciando monitoramento de desempenho do CI/CD com PNPM...');
  
  // Carregar métricas anteriores
  const metricas = carregarMetricas();
  
  // Coletar novas métricas
  const novasMetricas = {
    data: new Date().toISOString(),
    pnpm: {
      versao: execSync('pnpm --version').toString().trim(),
      tempoInstalacao: medirTempoInstalacao(),
      tempoBuild: medirTempoBuild(),
      tamanhoNodeModules: medirTamanhoNodeModules(),
      tamanhoPnpmStore: medirTamanhoPnpmStore(),
      cacheHitRate: calcularCacheHitRate(),
    }
  };
  
  // Adicionar às métricas existentes
  metricas.historico.push(novasMetricas);
  
  // Calcular comparações
  if (metricas.npm && metricas.npm.tempoInstalacao) {
    const comparacao = {
      reducaoTempoInstalacao: calcularPorcentagemReducao(metricas.npm.tempoInstalacao, novasMetricas.pnpm.tempoInstalacao),
      reducaoTempoBuild: calcularPorcentagemReducao(metricas.npm.tempoBuild, novasMetricas.pnpm.tempoBuild),
      reducaoEspaco: calcularPorcentagemReducao(metricas.npm.tamanhoNodeModules, novasMetricas.pnpm.tamanhoNodeModules),
    };
    
    metricas.comparacao = comparacao;
    
    console.log('📊 Comparação de Desempenho:');
    console.log(`  • Redução no tempo de instalação: ${comparacao.reducaoTempoInstalacao.toFixed(2)}%`);
    console.log(`  • Redução no tempo de build: ${comparacao.reducaoTempoBuild.toFixed(2)}%`);
    console.log(`  • Redução no espaço em disco: ${comparacao.reducaoEspaco.toFixed(2)}%`);
  }
  
  // Verificar alertas
  const alertas = verificarAlertas(novasMetricas);
  if (alertas.length > 0) {
    console.log('⚠️ Alertas detectados:');
    alertas.forEach(alerta => console.log(`  • ${alerta}`));
  } else {
    console.log('✅ Nenhum alerta detectado. Desempenho dentro dos parâmetros esperados.');
  }
  
  // Salvar métricas
  salvarMetricas(metricas);
  
  console.log('✅ Monitoramento concluído. Métricas salvas em ci-metrics.json');
}

// Funções auxiliares
function carregarMetricas() {
  try {
    if (fs.existsSync(CONFIG.metricsFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.metricsFile, 'utf8'));
    }
  } catch (error) {
    console.error('Erro ao carregar métricas:', error);
  }
  
  return { historico: [], npm: null, comparacao: null };
}

function salvarMetricas(metricas) {
  try {
    fs.writeFileSync(CONFIG.metricsFile, JSON.stringify(metricas, null, 2));
  } catch (error) {
    console.error('Erro ao salvar métricas:', error);
  }
}

function medirTempoInstalacao() {
  console.log('📦 Medindo tempo de instalação...');
  const inicio = Date.now();
  try {
    execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
    return (Date.now() - inicio) / 1000; // segundos
  } catch (error) {
    console.error('Erro ao medir tempo de instalação:', error);
    return 0;
  }
}

function medirTempoBuild() {
  console.log('🔨 Medindo tempo de build...');
  const inicio = Date.now();
  try {
    execSync('pnpm build', { stdio: 'inherit' });
    return (Date.now() - inicio) / 1000; // segundos
  } catch (error) {
    console.error('Erro ao medir tempo de build:', error);
    return 0;
  }
}

function medirTamanhoNodeModules() {
  console.log('📏 Medindo tamanho do node_modules...');
  try {
    const stats = execSync('du -sh node_modules').toString();
    const match = stats.match(/([\d.]+)([GMK])/);
    if (match) {
      const [, size, unit] = match;
      const multiplier = unit === 'G' ? 1024 : unit === 'M' ? 1 : 0.001;
      return parseFloat(size) * multiplier; // MB
    }
    return 0;
  } catch (error) {
    console.error('Erro ao medir tamanho do node_modules:', error);
    return 0;
  }
}

function medirTamanhoPnpmStore() {
  console.log('📏 Medindo tamanho do store PNPM...');
  try {
    const storePath = execSync('pnpm store path').toString().trim();
    const stats = execSync(`du -sh ${storePath}`).toString();
    const match = stats.match(/([\d.]+)([GMK])/);
    if (match) {
      const [, size, unit] = match;
      const multiplier = unit === 'G' ? 1024 : unit === 'M' ? 1 : 0.001;
      return parseFloat(size) * multiplier; // MB
    }
    return 0;
  } catch (error) {
    console.error('Erro ao medir tamanho do store PNPM:', error);
    return 0;
  }
}

function calcularCacheHitRate() {
  console.log('🔄 Calculando taxa de acerto do cache...');
  try {
    // Esta é uma implementação simplificada
    // Em um ambiente real, seria necessário analisar logs do PNPM
    const output = execSync('pnpm install --frozen-lockfile --reporter=json').toString();
    const lines = output.split('\n').filter(line => line.includes('cache hit'));
    const total = lines.length;
    const hits = lines.filter(line => line.includes('true')).length;
    return (hits / total) * 100;
  } catch (error) {
    console.error('Erro ao calcular taxa de acerto do cache:', error);
    return 0;
  }
}

function calcularPorcentagemReducao(valorAntigo, valorNovo) {
  if (!valorAntigo || !valorNovo) return 0;
  return ((valorAntigo - valorNovo) / valorAntigo) * 100;
}

function verificarAlertas(metricas) {
  const alertas = [];
  
  if (metricas.pnpm.tempoInstalacao > CONFIG.thresholds.installTime) {
    alertas.push(`Tempo de instalação (${metricas.pnpm.tempoInstalacao.toFixed(2)}s) acima do limite (${CONFIG.thresholds.installTime}s)`);
  }
  
  if (metricas.pnpm.tempoBuild > CONFIG.thresholds.buildTime) {
    alertas.push(`Tempo de build (${metricas.pnpm.tempoBuild.toFixed(2)}s) acima do limite (${CONFIG.thresholds.buildTime}s)`);
  }
  
  if (metricas.pnpm.tamanhoPnpmStore > CONFIG.thresholds.cacheSize) {
    alertas.push(`Tamanho do cache PNPM (${metricas.pnpm.tamanhoPnpmStore.toFixed(2)}MB) acima do limite (${CONFIG.thresholds.cacheSize}MB)`);
  }
  
  return alertas;
}

// Executar o script
monitorarDesempenho().catch(error => {
  console.error('Erro ao executar monitoramento:', error);
  process.exit(1);
});