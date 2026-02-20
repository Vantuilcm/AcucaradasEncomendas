const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

try {
  // Primeiro, vamos tentar ler o conteúdo do arquivo
  let appJsonContent = fs.readFileSync(appJsonPath, 'utf8');

  // Remover conteúdo JSON duplicado
  // Vamos extrair apenas o primeiro objeto JSON válido
  let jsonStart = appJsonContent.indexOf('{');
  let openBraces = 0;
  let validJson = '';
  let inString = false;
  let escapeNext = false;

  for (let i = jsonStart; i < appJsonContent.length; i++) {
    const char = appJsonContent[i];

    if (escapeNext) {
      escapeNext = false;
    } else if (char === '\\' && !escapeNext) {
      escapeNext = true;
    } else if (char === '"' && !escapeNext) {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
        if (openBraces === 0) {
          // Encontramos o fim do primeiro objeto JSON
          validJson = appJsonContent.substring(jsonStart, i + 1);
          break;
        }
      }
    }
  }

  // Verificar se conseguimos extrair um objeto JSON válido
  if (!validJson) {
    console.error('Não foi possível extrair um objeto JSON válido do arquivo app.json');
    process.exit(1);
  }

  // Verificar se o JSON é válido
  try {
    JSON.parse(validJson);
  } catch (e) {
    console.error('O JSON extraído não é válido:', e.message);
    process.exit(1);
  }

  // Salvar o JSON válido de volta no arquivo
  fs.writeFileSync(appJsonPath, validJson);

  console.log('app.json corrigido com sucesso!');
} catch (error) {
  console.error('Erro ao processar o arquivo app.json:', error.message);
  process.exit(1);
}
