const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configurações
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDE_PATTERNS = [
  '**/__tests__/**',
  '**/tests/**',
  '**/examples/**',
  '**/scripts/**',
  '**/testMonitoring.ts',
  '**/monitoringPerformance.test.ts',
];

// Console methods que devem ser removidos em produção
const CONSOLE_METHODS = ['log', 'warn', 'error', 'debug', 'info'];

// Padrões que devem ser mantidos (para desenvolvimento/debug)
const KEEP_PATTERNS = [
  /console\.error\(['"]Erro/i, // Erros críticos
  /console\.warn\(['"]⚠️/i, // Warnings importantes
  /console\.error\(['"]❌/i, // Erros formatados
  /LoggingService/i, // Serviço de logging
  /TwoFactorAuthService.*console\.log/i, // 2FA debug específico
];

function shouldKeepConsole(line) {
  return KEEP_PATTERNS.some(pattern => pattern.test(line));
}

function removeConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    const newLines = lines.map(line => {
      // Verifica se a linha contém console.method
      const consoleRegex = new RegExp(`console\\.(${CONSOLE_METHODS.join('|')})\\(`, 'g');

      if (consoleRegex.test(line) && !shouldKeepConsole(line)) {
        modified = true;
        // Comentar a linha ao invés de remover para manter numeração
        const indent = line.match(/^\s*/)[0];
        return `${indent}// REMOVED IN PRODUCTION: ${line.trim()}`;
      }

      return line;
    });

    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log(`✅ Processado: ${path.relative(SRC_DIR, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Removendo console.logs para produção...');
  console.log('='.repeat(50));

  // Encontrar todos os arquivos TypeScript e JavaScript
  const pattern = path.join(SRC_DIR, '**/*.{ts,tsx,js,jsx}').replace(/\\/g, '/');

  glob(
    pattern,
    {
      ignore: EXCLUDE_PATTERNS.map(p => path.join(SRC_DIR, p).replace(/\\/g, '/')),
    },
    (err, files) => {
      if (err) {
        console.error('❌ Erro ao buscar arquivos:', err);
        return;
      }

      let processedCount = 0;
      let modifiedCount = 0;

      files.forEach(file => {
        processedCount++;
        if (removeConsoleLogs(file)) {
          modifiedCount++;
        }
      });

      console.log('\n📊 Resumo:');
      console.log(`   Arquivos processados: ${processedCount}`);
      console.log(`   Arquivos modificados: ${modifiedCount}`);
      console.log('\n✅ Limpeza de console.logs concluída!');
    }
  );
}

if (require.main === module) {
  main();
}

module.exports = { removeConsoleLogs, shouldKeepConsole };
