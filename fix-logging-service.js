/**
 * Script para corrigir referências incorretas ao método LoggingService.logError
 * O método correto é LoggingService.error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Diretório raiz do projeto
const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

// Função para executar comandos com tratamento de erro
function runCommand(command) {
  try {
    console.log(`Executando: ${command}`);
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    console.error(`Erro ao executar comando: ${command}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Função para encontrar todos os arquivos TypeScript/JavaScript recursivamente
function findTsFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findTsFiles(filePath));
    } else if (
      file.endsWith('.ts') || 
      file.endsWith('.tsx') || 
      file.endsWith('.js') || 
      file.endsWith('.jsx')
    ) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Função para corrigir as referências incorretas em um arquivo
function fixLoggingReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Substituir loggingService.logError por loggingService.error
    const logErrorPattern = /loggingService\.logError\(/g;
    content = content.replace(logErrorPattern, 'loggingService.error(');
    
    // Substituir LoggingService.logError por LoggingService.error
    const logErrorStaticPattern = /LoggingService\.logError\(/g;
    content = content.replace(logErrorStaticPattern, 'LoggingService.error(');
    
    // Verificar se houve alterações
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar arquivo ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🔍 Iniciando correção de referências ao LoggingService...');
  
  // Encontrar todos os arquivos TypeScript/JavaScript
  const tsFiles = findTsFiles(srcDir);
  console.log(`Encontrados ${tsFiles.length} arquivos para verificação.`);
  
  // Contador de arquivos corrigidos
  let fixedFiles = 0;
  
  // Processar cada arquivo
  for (const file of tsFiles) {
    const wasFixed = fixLoggingReferences(file);
    if (wasFixed) fixedFiles++;
  }
  
  console.log(`\n✅ Processo concluído! ${fixedFiles} arquivos foram corrigidos.`);
  
  if (fixedFiles > 0) {
    console.log('\n🔄 Recomendação: Execute "npx expo start --clear" para reiniciar o aplicativo com as correções.');
  }
}

// Executar o script
main().catch(error => {
  console.error('❌ Erro durante a execução do script:', error);
  process.exit(1);
});