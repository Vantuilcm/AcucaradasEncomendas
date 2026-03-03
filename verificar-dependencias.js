/**
 * Script para verificar dependências e identificar conflitos no projeto
 * Utiliza pnpm why para analisar por que determinados pacotes estão sendo instalados
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lista de pacotes críticos para verificar
const PACOTES_CRITICOS = [
  'react',
  'react-native',
  'expo',
  'expo-router',
  'metro',
  'metro-config',
  'metro-runtime',
  'expo/metro-config',
  'react-dom',
  '@types/react',
  'firebase',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-screens',
];

// Função para executar pnpm why e capturar a saída
function verificarDependencia(pacote) {
  try {
    console.log(`\n\n🔍 Verificando dependência: ${pacote}\n`);
    const resultado = execSync(`pnpm why ${pacote}`, { encoding: 'utf8' });
    return resultado;
  } catch (error) {
    return `Erro ao verificar ${pacote}: ${error.message}`;
  }
}

// Função para verificar versões duplicadas
function verificarVersoesDuplicadas() {
  try {
    console.log('\n\n🔍 Verificando versões duplicadas no node_modules\n');
    const resultado = execSync('pnpm ls --depth=0', { encoding: 'utf8' });
    return resultado;
  } catch (error) {
    return `Erro ao verificar versões duplicadas: ${error.message}`;
  }
}

// Função para verificar peer dependencies não satisfeitas
function verificarPeerDependencies() {
  try {
    console.log('\n\n🔍 Verificando peer dependencies não satisfeitas\n');
    const resultado = execSync('pnpm ls --depth=0', { encoding: 'utf8' });
    return resultado;
  } catch (error) {
    return `Erro ao verificar peer dependencies: ${error.message}`;
  }
}

// Função para verificar vulnerabilidades
function verificarVulnerabilidades() {
  try {
    console.log('\n\n🔍 Verificando vulnerabilidades\n');
    const resultado = execSync('pnpm audit', { encoding: 'utf8' });
    return resultado;
  } catch (error) {
    // O comando audit pode retornar código de erro mesmo com saída válida
    return error.stdout || `Erro ao verificar vulnerabilidades: ${error.message}`;
  }
}

// Função principal
async function main() {
  console.log('🔎 INICIANDO VERIFICAÇÃO DE DEPENDÊNCIAS 🔎');
  console.log('===========================================');
  
  // Criar diretório para relatórios se não existir
  const relatoriosDir = path.join(__dirname, 'relatorios');
  if (!fs.existsSync(relatoriosDir)) {
    fs.mkdirSync(relatoriosDir);
  }
  
  // Arquivo de saída para o relatório
  const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivoSaida = path.join(relatoriosDir, `relatorio-dependencias-${dataHora}.txt`);
  const stream = fs.createWriteStream(arquivoSaida, { flags: 'w' });
  
  // Escrever cabeçalho
  stream.write('RELATÓRIO DE VERIFICAÇÃO DE DEPENDÊNCIAS\n');
  stream.write('========================================\n\n');
  stream.write(`Data e hora: ${new Date().toLocaleString()}\n\n`);
  
  // Verificar cada pacote crítico
  for (const pacote of PACOTES_CRITICOS) {
    const resultado = verificarDependencia(pacote);
    stream.write(`## DEPENDÊNCIA: ${pacote}\n`);
    stream.write(resultado);
    stream.write('\n----------------------------------------\n');
    console.log(`✅ Verificação concluída para: ${pacote}`);
  }
  
  // Verificar versões duplicadas
  const duplicadas = verificarVersoesDuplicadas();
  stream.write('## VERSÕES INSTALADAS\n');
  stream.write(duplicadas);
  stream.write('\n----------------------------------------\n');
  
  // Verificar peer dependencies
  const peerDeps = verificarPeerDependencies();
  stream.write('## PEER DEPENDENCIES\n');
  stream.write(peerDeps);
  stream.write('\n----------------------------------------\n');
  
  // Verificar vulnerabilidades
  const vulnerabilidades = verificarVulnerabilidades();
  stream.write('## VULNERABILIDADES\n');
  stream.write(vulnerabilidades);
  stream.write('\n----------------------------------------\n');
  
  // Fechar o arquivo
  stream.end();
  
  console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
  console.log(`📄 Relatório salvo em: ${arquivoSaida}`);
}

// Executar a função principal
main().catch(error => {
  console.error('❌ Erro durante a verificação:', error);
  process.exit(1);
});
