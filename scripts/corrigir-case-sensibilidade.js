/**
 * Script para corrigir problemas de sensibilidade a maiúsculas/minúsculas nos nomes de arquivos
 * Este script verifica e corrige inconsistências nos nomes de arquivos que podem causar problemas
 * em sistemas operacionais case-sensitive como Linux e macOS.
 */

const fs = require('fs');
const path = require('path');

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Lista de arquivos problemáticos conhecidos e suas correções
const knownIssues = [
  {
    pattern: /loggingservice\.ts$/i,
    correctName: 'LoggingService.ts'
  },
  {
    pattern: /validationservice\.ts$/i,
    correctName: 'validationService.ts' // Com 'v' minúsculo conforme documentação
  }
  // Adicione outros arquivos problemáticos aqui
];

// Função para verificar e corrigir um arquivo
function checkAndFixFile(filePath, fileName, dirPath) {
  for (const issue of knownIssues) {
    if (issue.pattern.test(fileName)) {
      const correctPath = path.join(dirPath, issue.correctName);
      const currentPath = path.join(dirPath, fileName);
      
      // Verificar se o nome já está correto
      if (fileName !== issue.correctName) {
        try {
          // Em sistemas Windows, precisamos usar uma abordagem em duas etapas
          // para renomear arquivos que diferem apenas por maiúsculas/minúsculas
          const tempName = `${fileName}_temp_${Date.now()}`;
          const tempPath = path.join(dirPath, tempName);
          
          fs.renameSync(currentPath, tempPath);
          fs.renameSync(tempPath, correctPath);
          
          console.log(`Corrigido: ${currentPath} -> ${correctPath}`);
          return true;
        } catch (error) {
          console.error(`Erro ao renomear ${currentPath}:`, error.message);
        }
      }
      break;
    }
  }
  return false;
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
    } else if (stat.isFile()) {
      if (checkAndFixFile(filePath, file, dir)) {
        filesFixed++;
      }
    }
  }
  
  return filesFixed;
}

// Executar a correção
console.log('Iniciando correção de sensibilidade a maiúsculas/minúsculas nos nomes de arquivos...');
const filesFixed = traverseDirectory(srcDir);
console.log(`Concluído! ${filesFixed} arquivos foram corrigidos.`);