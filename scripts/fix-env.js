const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
  // Ler o conteúdo atual do arquivo .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Remover as variáveis existentes para evitar duplicação
  envContent = envContent.replace(/ENV=.*(\r?\n)?/g, '');
  envContent = envContent.replace(/ENVIRONMENT=.*(\r?\n)?/g, '');
  envContent = envContent.replace(/NODE_ENV=.*(\r?\n)?/g, '');

  // Garantir que API_URL está correta para produção
  envContent = envContent.replace(/API_URL=.*(\r?\n)?/g, 'API_URL=https://api.acucaradas.com.br\n');

  // Adicionar as variáveis no início do arquivo
  envContent = `NODE_ENV=production\nENV=production\nENVIRONMENT=production\n${envContent}`;

  // Salvar o arquivo atualizado
  fs.writeFileSync(envPath, envContent);

  console.log('Arquivo .env atualizado com sucesso!');
} catch (error) {
  console.error('Erro ao processar o arquivo .env:', error.message);
  process.exit(1);
}
