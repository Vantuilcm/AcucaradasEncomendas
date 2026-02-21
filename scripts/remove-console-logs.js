const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Diretórios a serem verificados
const srcDir = path.join(__dirname, '../src');

// Padrão regex para encontrar console.log e similares
const consolePattern = /console\.(log|info|debug|warn|error)\s*\((.*?)\);?/g;

// Função para processar um arquivo
const processFile = filePath => {
  // Ignorar arquivos de teste e config/sentry.ts
  if (
    filePath.includes('__tests__') ||
    filePath.includes('.test.') ||
    filePath.includes('config/sentry.ts')
  ) {
    return;
  }

  // Ler conteúdo do arquivo
  const content = fs.readFileSync(filePath, 'utf8');

  // Verificar se há console.logs
  if (consolePattern.test(content)) {
    // Resetar o regex para não perder matches
    consolePattern.lastIndex = 0;

    // Substituir console.logs por vazios
    const newContent = content.replace(consolePattern, (match, method, args) => {
      // Manter console.error em produção mas adicionar Sentry
      if (method === 'error') {
        return `sentryService.captureException(${args});`;
      }
      // Remover outros tipos de console
      return '';
    });

    // Atualizar o arquivo
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Processado: ${filePath}`);
  }
};

// Encontrar todos os arquivos JavaScript e TypeScript
glob(`${srcDir}/**/*.{js,jsx,ts,tsx}`, {}, (err, files) => {
  if (err) {
    console.error('Erro ao buscar arquivos:', err);
    process.exit(1);
  }

  console.log(`Encontrados ${files.length} arquivos para processar`);

  // Processar cada arquivo
  files.forEach(processFile);

  console.log('Processamento concluído!');
});
