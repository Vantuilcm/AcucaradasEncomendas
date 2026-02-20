const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
  // Ler o conteúdo atual do arquivo .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Garantir que API_URL está no formato correto de produção
  if (envContent.includes('API_URL=')) {
    // Substituir qualquer URL existente pela URL de produção com o formato adequado
    envContent = envContent.replace(
      /API_URL=.*(\r?\n)?/g,
      'API_URL=https://api.acucaradasencomendas.com.br\n'
    );

    // Adicionar comentário para facilitar identificação como produção
    envContent = envContent.replace(
      'API_URL=https://api.acucaradasencomendas.com.br',
      'API_URL=https://api.acucaradasencomendas.com.br # production'
    );

    // Salvar o arquivo atualizado
    fs.writeFileSync(envPath, envContent);

    console.log('API_URL configurada corretamente para produção!');
  } else {
    // Se não existir, adicionar com comentário
    envContent += '\nAPI_URL=https://api.acucaradasencomendas.com.br # production\n';
    fs.writeFileSync(envPath, envContent);

    console.log('API_URL adicionada ao arquivo .env!');
  }
} catch (error) {
  console.error('Erro ao processar o arquivo .env:', error.message);
  process.exit(1);
}
