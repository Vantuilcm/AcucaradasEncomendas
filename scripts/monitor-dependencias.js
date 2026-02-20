/**
 * Script para monitoramento de dependências com pnpm why
 * 
 * Este script ajuda a identificar conflitos de dependências no projeto,
 * especialmente útil para projetos que usam Expo e React Native com PNPM.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lista de pacotes críticos para monitorar
const PACOTES_CRITICOS = [
  'expo',
  'expo-router',
  'react',
  'react-native',
  '@expo/metro-runtime',
  'metro',
  'metro-resolver',
  '@react-navigation/native',
  '@babel/core'
];

// Função para executar pnpm why e capturar a saída
function executarPnpmWhy(pacote) {
  try {
    console.log(`\n\n===== Analisando dependência: ${pacote} =====`);
    const resultado = execSync(`pnpm why ${pacote}`, { encoding: 'utf8' });
    return resultado;
  } catch (erro) {
    console.error(`Erro ao analisar ${pacote}:`, erro.message);
    return `Erro ao analisar ${pacote}: ${erro.message}`;
  }
}

// Função para verificar versões duplicadas
function verificarVersoesDuplicadas(pacote) {
  try {
    console.log(`\n\n===== Verificando versões de: ${pacote} =====`);
    const resultado = execSync(`pnpm list ${pacote} --depth=10`, { encoding: 'utf8' });
    
    // Extrair todas as versões encontradas
    const linhasVersao = resultado.split('\n').filter(linha => 
      linha.includes(pacote) && !linha.includes('dependencies')
    );
    
    const versoes = new Map();
    
    linhasVersao.forEach(linha => {
      const match = linha.match(new RegExp(`${pacote}@([\\d\\.]+)`));
      if (match && match[1]) {
        const versao = match[1];
        if (!versoes.has(versao)) {
          versoes.set(versao, 1);
        } else {
          versoes.set(versao, versoes.get(versao) + 1);
        }
      }
    });
    
    // Verificar se há mais de uma versão
    if (versoes.size > 1) {
      console.log(`⚠️ ALERTA: Múltiplas versões de ${pacote} encontradas:`);
      for (const [versao, contagem] of versoes.entries()) {
        console.log(`  - Versão ${versao}: ${contagem} instância(s)`);
      }
    } else if (versoes.size === 1) {
      const [[versao, contagem]] = [...versoes.entries()];
      console.log(`✅ ${pacote} tem uma única versão: ${versao} (${contagem} instância(s))`);
    } else {
      console.log(`❓ Não foi possível determinar a versão de ${pacote}`);
    }
    
    return versoes;
  } catch (erro) {
    console.error(`Erro ao verificar versões de ${pacote}:`, erro.message);
    return new Map();
  }
}

// Função para gerar relatório
function gerarRelatorio() {
  const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
  const nomeArquivo = `relatorio-dependencias-${dataHora}.txt`;
  const caminhoArquivo = path.join(__dirname, '..', nomeArquivo);
  
  let conteudoRelatorio = `RELATÓRIO DE DEPENDÊNCIAS - ${new Date().toLocaleString()}\n\n`;
  conteudoRelatorio += `PACOTES ANALISADOS:\n${PACOTES_CRITICOS.join('\n')}\n\n`;
  
  // Analisar cada pacote crítico
  for (const pacote of PACOTES_CRITICOS) {
    conteudoRelatorio += `\n===== ${pacote} =====\n`;
    
    // Verificar versões
    const versoes = verificarVersoesDuplicadas(pacote);
    if (versoes.size > 1) {
      conteudoRelatorio += `⚠️ ALERTA: Múltiplas versões encontradas:\n`;
      for (const [versao, contagem] of versoes.entries()) {
        conteudoRelatorio += `  - Versão ${versao}: ${contagem} instância(s)\n`;
      }
    } else if (versoes.size === 1) {
      const [[versao, contagem]] = [...versoes.entries()];
      conteudoRelatorio += `✅ Versão única: ${versao} (${contagem} instância(s))\n`;
    } else {
      conteudoRelatorio += `❓ Não foi possível determinar a versão\n`;
    }
    
    // Executar pnpm why
    const resultadoWhy = executarPnpmWhy(pacote);
    conteudoRelatorio += `\nDETALHES DA DEPENDÊNCIA:\n${resultadoWhy}\n`;
  }
  
  // Adicionar recomendações
  conteudoRelatorio += `\n\nRECOMENDAÇÕES:\n`;
  conteudoRelatorio += `1. Para pacotes com múltiplas versões, considere adicionar overrides no package.json\n`;
  conteudoRelatorio += `2. Verifique se todos os pacotes críticos estão corretamente hoisted no .npmrc\n`;
  conteudoRelatorio += `3. Para problemas persistentes, considere limpar o cache: pnpm store prune\n`;
  
  // Salvar relatório
  fs.writeFileSync(caminhoArquivo, conteudoRelatorio, 'utf8');
  console.log(`\n\nRelatório salvo em: ${caminhoArquivo}`);
  
  return caminhoArquivo;
}

// Função principal
function main() {
  console.log('Iniciando monitoramento de dependências...');
  const caminhoRelatorio = gerarRelatorio();
  console.log(`\nMonitoramento concluído. Relatório gerado em: ${caminhoRelatorio}`);
  console.log('\nPara resolver conflitos de dependências, considere:');
  console.log('1. Adicionar overrides no package.json para versões conflitantes');
  console.log('2. Ajustar padrões de hoisting no .npmrc');
  console.log('3. Limpar cache com: pnpm store prune');
}

// Executar o script
main();