/**
 * Script para verificar e corrigir erros de TypeScript no projeto
 * Este script executa o compilador TypeScript para identificar erros
 * e aplica correções automáticas para problemas comuns.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');

// Função para executar o compilador TypeScript e capturar erros
function runTypeScriptCheck() {
  try {
    console.log('Executando verificação TypeScript...');
    const output = execSync('npx tsc --noEmit', { cwd: rootDir, encoding: 'utf8' });
    console.log('Nenhum erro de TypeScript encontrado!');
    return [];
  } catch (error) {
    // Capturar a saída de erro que contém os erros de TypeScript
    const errorOutput = error.stdout || '';
    
    // Analisar a saída para extrair informações sobre os erros
    const errors = parseTypeScriptErrors(errorOutput);
    console.log(`Encontrados ${errors.length} erros de TypeScript.`);
    return errors;
  }
}

// Função para analisar a saída do compilador TypeScript e extrair informações sobre os erros
function parseTypeScriptErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  let currentError = null;
  
  for (const line of lines) {
    // Linhas que começam com um caminho de arquivo geralmente indicam um novo erro
    const fileMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/);
    
    if (fileMatch) {
      if (currentError) {
        errors.push(currentError);
      }
      
      currentError = {
        filePath: fileMatch[1].trim(),
        line: parseInt(fileMatch[2], 10),
        column: parseInt(fileMatch[3], 10),
        code: `TS${fileMatch[4]}`,
        message: fileMatch[5].trim(),
        context: []
      };
    } else if (currentError && line.trim() !== '') {
      // Adicionar contexto ao erro atual
      currentError.context.push(line.trim());
    }
  }
  
  if (currentError) {
    errors.push(currentError);
  }
  
  return errors;
}

// Função para aplicar correções automáticas para problemas comuns
function applyAutomaticFixes(errors) {
  const fixedFiles = new Set();
  
  for (const error of errors) {
    // Verificar se o erro está relacionado a importações
    if (error.code === 'TS2307' && error.message.includes("Cannot find module")) {
      // Tentar corrigir problemas de importação
      if (fixImportError(error)) {
        fixedFiles.add(error.filePath);
      }
    }
    // Verificar se o erro está relacionado a propriedades inexistentes
    else if (error.code === 'TS2339' && error.message.includes("Property") && error.message.includes("does not exist")) {
      // Tentar corrigir problemas de propriedades
      if (fixPropertyError(error)) {
        fixedFiles.add(error.filePath);
      }
    }
  }
  
  return Array.from(fixedFiles);
}

// Função para corrigir erros de importação
function fixImportError(error) {
  try {
    const filePath = error.filePath;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extrair o módulo que não pode ser encontrado
    const moduleMatch = error.message.match(/Cannot find module ['"](.*?)['"]/);
    if (!moduleMatch) return false;
    
    const missingModule = moduleMatch[1];
    
    // Verificar se é um problema de sensibilidade a maiúsculas/minúsculas
    if (missingModule.includes('loggingService') || missingModule.includes('LoggingService')) {
      const correctedContent = content.replace(
        new RegExp(`from\\s+['"](.+?)(loggingService|LoggingService)['"]`, 'g'),
        (match, prefix, module) => `from '${prefix}LoggingService'`
      );
      
      if (correctedContent !== content) {
        fs.writeFileSync(filePath, correctedContent, 'utf8');
        console.log(`Corrigido problema de importação em ${filePath}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Erro ao tentar corrigir importação:`, error.message);
    return false;
  }
}

// Função para corrigir erros de propriedades
function fixPropertyError(error) {
  try {
    const filePath = error.filePath;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extrair a propriedade que não existe
    const propertyMatch = error.message.match(/Property ['"](.*?)['"] does not exist/);
    if (!propertyMatch) return false;
    
    const missingProperty = propertyMatch[1];
    
    // Corrigir métodos de log incorretos
    if (missingProperty.startsWith('log') && content.includes('loggingService')) {
      let correctedContent = content;
      
      // Mapear métodos incorretos para corretos
      const methodMapping = {
        logInfo: 'info',
        logWarning: 'warn',
        logError: 'error',
        logDebug: 'debug',
        logFatal: 'fatal'
      };
      
      const correctMethod = methodMapping[missingProperty];
      if (correctMethod) {
        correctedContent = content.replace(
          new RegExp(`loggingService\\.${missingProperty}\\(`, 'g'),
          `loggingService.${correctMethod}(`
        );
        
        if (correctedContent !== content) {
          fs.writeFileSync(filePath, correctedContent, 'utf8');
          console.log(`Corrigido método de log em ${filePath}`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Erro ao tentar corrigir propriedade:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('Iniciando verificação e correção de erros TypeScript...');
  
  // Executar verificação TypeScript
  const errors = runTypeScriptCheck();
  
  if (errors.length === 0) {
    console.log('Nenhum erro encontrado. O projeto está em conformidade com TypeScript!');
    return;
  }
  
  // Aplicar correções automáticas
  const fixedFiles = applyAutomaticFixes(errors);
  
  console.log(`\nResumo das correções:`);
  console.log(`- Total de erros encontrados: ${errors.length}`);
  console.log(`- Arquivos corrigidos: ${fixedFiles.length}`);
  
  if (fixedFiles.length > 0) {
    console.log('\nArquivos corrigidos:');
    fixedFiles.forEach(file => console.log(`- ${file}`));
    
    // Executar verificação novamente para ver se os erros foram resolvidos
    console.log('\nExecutando verificação TypeScript novamente...');
    const remainingErrors = runTypeScriptCheck();
    
    if (remainingErrors.length === 0) {
      console.log('Todos os erros foram corrigidos com sucesso!');
    } else {
      console.log(`Ainda restam ${remainingErrors.length} erros que precisam ser corrigidos manualmente.`);
    }
  } else {
    console.log('Nenhum arquivo foi corrigido automaticamente. Os erros precisam ser corrigidos manualmente.');
  }
}

// Executar o script
main();