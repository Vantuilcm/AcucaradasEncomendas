/**
 * Script para corrigir problemas de importação do LoggingService
 * Este script corrige:
 * 1. Importações inconsistentes (loggingService vs LoggingService)
 * 2. Chamadas incorretas de métodos (logInfo, logWarning, logError vs info, warn, error)
 */

const fs = require('fs');
const path = require('path');

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Expressões regulares para encontrar padrões de importação
const importRegex = /import\s+\{\s*(?:loggingService|LoggingService)\s*\}\s+from\s+['"](.+?(?:loggingService|LoggingService))['"];?/g;
const methodRegex = /loggingService\.(logInfo|logWarning|logError|logDebug|logFatal)\(/g;

// Mapeamento de métodos incorretos para corretos
const methodMapping = {
  logInfo: 'info',
  logWarning: 'warn',
  logError: 'error',
  logDebug: 'debug',
  logFatal: 'fatal'
};

// Função para processar um arquivo
function processFile(filePath) {
  try {
    // Ler o conteúdo do arquivo
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Corrigir importações
    content = content.replace(importRegex, (match, importPath) => {
      // Normalizar o caminho de importação para usar 'LoggingService' com L maiúsculo
      const normalizedPath = importPath.replace(/loggingService/i, 'LoggingService');
      return `import { loggingService } from '${normalizedPath}';`;
    });
    
    // Corrigir chamadas de métodos
    content = content.replace(methodRegex, (match, method) => {
      const correctMethod = methodMapping[method] || method;
      return `loggingService.${correctMethod}(`;
    });
    
    // Se houve alterações, salvar o arquivo
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Corrigido: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para percorrer diretórios recursivamente
function traverseDirectory(dir) {
  let filesFixed = 0;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules e .git
      if (file !== 'node_modules' && file !== '.git') {
        filesFixed += traverseDirectory(filePath);
      }
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      // Processar apenas arquivos JavaScript/TypeScript
      if (processFile(filePath)) {
        filesFixed++;
      }
    }
  }
  
  return filesFixed;
}

// Executar a correção
console.log('Iniciando correção de importações do LoggingService...');
const filesFixed = traverseDirectory(srcDir);
console.log(`Concluído! ${filesFixed} arquivos foram corrigidos.`);