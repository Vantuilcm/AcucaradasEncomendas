/**
 * Script principal para corrigir todos os erros do projeto
 * Este script executa todos os scripts de correção em sequência
 */

const { execSync } = require('child_process');
const path = require('path');

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');
const scriptsDir = __dirname;

// Lista de scripts a serem executados em ordem
const scripts = [
  'corrigir-case-sensibilidade.js',
  'corrigir-imports-logging.js',
  'verificar-corrigir-typescript.js'
];

// Função para executar um script
function runScript(scriptName) {
  const scriptPath = path.join(scriptsDir, scriptName);
  console.log(`\n==== Executando ${scriptName} ====`);
  
  try {
    execSync(`node "${scriptPath}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`\n==== ${scriptName} concluído com sucesso ====`);
    return true;
  } catch (error) {
    console.error(`\n==== Erro ao executar ${scriptName} ====`);
    console.error(error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('Iniciando correção de todos os erros do projeto...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const script of scripts) {
    const success = runScript(script);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n==== Resumo da execução ====');
  console.log(`Total de scripts: ${scripts.length}`);
  console.log(`Scripts executados com sucesso: ${successCount}`);
  console.log(`Scripts com falha: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\nTodos os scripts foram executados com sucesso!');
    console.log('Execute "npx tsc --noEmit" para verificar se todos os erros foram corrigidos.');
  } else {
    console.log('\nAlguns scripts falharam. Verifique os erros e execute novamente.');
  }
}

// Executar o script principal
main();