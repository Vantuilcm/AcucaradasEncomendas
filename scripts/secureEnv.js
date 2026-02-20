const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
  // Ler o conteúdo atual do arquivo .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Verificar se o arquivo já contém APP_ENV
  if (!envContent.includes('APP_ENV=production')) {
    envContent = `APP_ENV=production\nEXPO_PUBLIC_APP_ENV=production\n${envContent}`;
  }

  // Substituir chaves secretas do Stripe por valores ofuscados
  envContent = envContent.replace(
    /STRIPE_SECRET_KEY_PROD=.*/g,
    'STRIPE_SECRET_KEY_PROD=**********'
  );
  envContent = envContent.replace(
    /EXPO_PUBLIC_STRIPE_SECRET_KEY=.*/g,
    'EXPO_PUBLIC_STRIPE_SECRET_KEY=**********'
  );

  // Salvar o arquivo .env atualizado
  fs.writeFileSync(envPath, envContent);

  console.log('Arquivo .env atualizado com sucesso!');
} catch (error) {
  console.error('Erro ao processar o arquivo .env:', error.message);
  process.exit(1);
}
