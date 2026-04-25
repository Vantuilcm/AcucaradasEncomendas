const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
  // Ler o conteúdo atual do arquivo .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Remover o comentário da linha API_URL para que seja reconhecida pelo script
  envContent = envContent.replace(/API_URL=.*(\r?\n)?/g, 'API_URL=https://api.acucaradas.com.br\n');

  // Adicionar a palavra production na linha para ajudar na detecção
  envContent = envContent.replace(
    'API_URL=https://api.acucaradas.com.br',
    'API_URL=https://api.acucaradas.com.br.production'
  );

  // Salvar o arquivo atualizado
  fs.writeFileSync(envPath, envContent);

  console.log('API_URL atualizada para facilitar detecção como produção!');
} catch (error) {
  console.error('Erro ao processar o arquivo .env:', error.message);
  process.exit(1);
}
