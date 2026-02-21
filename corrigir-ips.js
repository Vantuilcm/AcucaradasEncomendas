/**
 * Script para corrigir todos os IPs no projeto
 * 
 * Este script atualiza todos os arquivos de configuração que contêm referências ao IP
 * para garantir consistência e resolver o erro:
 * net::ERR_ABORTED http://192.168.0.13:8081/node_modules%5Cexpo-router%5Centry.bundle
 */

const fs = require('fs');
const path = require('path');

// IP antigo e novo IP
const IP_ANTIGO = '192.168.0.13';
const IP_NOVO = '177.192.13.46';

// Função para verificar se o arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isFile();
}

// Função para atualizar o IP em um arquivo
function atualizarIPNoArquivo(caminhoArquivo, ipAntigo, ipNovo) {
  if (!verificarArquivo(caminhoArquivo)) {
    console.log(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
    return false;
  }

  try {
    let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    const conteudoOriginal = conteudo;
    
    // Substituir todas as ocorrências do IP antigo pelo novo
    conteudo = conteudo.replace(new RegExp(ipAntigo, 'g'), ipNovo);
    
    // Verificar se houve alterações
    if (conteudo !== conteudoOriginal) {
      fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');
      console.log(`✅ IP atualizado em: ${caminhoArquivo}`);
      return true;
    } else {
      console.log(`ℹ️ Nenhuma alteração necessária em: ${caminhoArquivo}`);
      return false;
    }
  } catch (erro) {
    console.error(`❌ Erro ao processar ${caminhoArquivo}:`, erro.message);
    return false;
  }
}

// Função para atualizar o app.json
function atualizarAppJson() {
  const caminhoAppJson = path.join(process.cwd(), 'app.json');
  return atualizarIPNoArquivo(caminhoAppJson, IP_ANTIGO, IP_NOVO);
}

// Função para atualizar o metro.config.js
function atualizarMetroConfig() {
  const caminhoMetroConfig = path.join(process.cwd(), 'metro.config.js');
  return atualizarIPNoArquivo(caminhoMetroConfig, IP_ANTIGO, IP_NOVO);
}

// Função para atualizar os scripts batch
function atualizarScriptsBatch() {
  const arquivosBatch = [
    'iniciar-expo-qrcode-fixo.bat'
  ];
  
  let alteracoes = 0;
  
  for (const arquivo of arquivosBatch) {
    const caminho = path.join(process.cwd(), arquivo);
    if (atualizarIPNoArquivo(caminho, IP_ANTIGO, IP_NOVO)) {
      alteracoes++;
    }
  }
  
  return alteracoes > 0;
}

// Função para atualizar arquivos de ambiente
function atualizarArquivosAmbiente() {
  const arquivosAmbiente = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
  ];
  
  let alteracoes = 0;
  
  for (const arquivo of arquivosAmbiente) {
    const caminho = path.join(process.cwd(), arquivo);
    if (verificarArquivo(caminho) && atualizarIPNoArquivo(caminho, IP_ANTIGO, IP_NOVO)) {
      alteracoes++;
    }
  }
  
  return alteracoes > 0;
}

// Função principal
function main() {
  console.log(`🔧 Iniciando correção de IPs (${IP_ANTIGO} -> ${IP_NOVO})...\n`);
  
  let alteracoesRealizadas = 0;
  
  // Atualizar app.json
  if (atualizarAppJson()) alteracoesRealizadas++;
  
  // Atualizar metro.config.js
  if (atualizarMetroConfig()) alteracoesRealizadas++;
  
  // Atualizar scripts batch
  if (atualizarScriptsBatch()) alteracoesRealizadas++;
  
  // Atualizar arquivos de ambiente
  if (atualizarArquivosAmbiente()) alteracoesRealizadas++;
  
  console.log(`\n${alteracoesRealizadas > 0 ? '✅' : 'ℹ️'} Processo concluído com ${alteracoesRealizadas} arquivo(s) atualizado(s).`);
  
  if (alteracoesRealizadas > 0) {
    console.log('\nPróximos passos:');
    console.log('1. Execute o script "corrigir-e-iniciar-expo.bat" para aplicar as alterações e iniciar o Expo');
    console.log('2. Se o problema persistir, verifique se há outras referências ao IP antigo em arquivos não verificados');
  }
}

// Executar o script
main();