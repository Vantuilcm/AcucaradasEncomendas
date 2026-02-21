/**
 * Configuração do Firebase para o aplicativo Açucaradas Encomendas
 *
 * Este script contém instruções para configurar o Firebase corretamente para o aplicativo.
 * Ele não executa nenhuma ação automaticamente, apenas fornece os passos e verificações.
 */

const { existsSync, readFileSync } = require('fs');
const path = require('path');

// Função para verificar se o arquivo google-services.json está presente
function checkGoogleServicesFile() {
  const filePath = path.join(__dirname, '..', 'google-services.json');
  const prodFilePath = path.join(__dirname, '..', 'google-services.prod.json');

  console.log('\n========== VERIFICAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO ==========');

  if (!existsSync(filePath)) {
    console.error('❌ O arquivo google-services.json NÃO foi encontrado na raiz do projeto.');
    console.log('\nACESSE O CONSOLE DO FIREBASE:');
    console.log('1. Abra https://console.firebase.google.com/');
    console.log('2. Selecione seu projeto "Açucaradas Encomendas"');
    console.log('3. Clique em "Configurações do Projeto" (ícone de engrenagem)');
    console.log('4. Navegue até a guia "Geral"');
    console.log('5. Role até a seção "Seus aplicativos"');
    console.log('6. Selecione o aplicativo Android e baixe o arquivo google-services.json');
    console.log('7. Coloque o arquivo na raiz do projeto');
  } else {
    console.log('✅ O arquivo google-services.json foi encontrado.');

    try {
      const fileContent = JSON.parse(readFileSync(filePath, 'utf8'));
      const packageName = fileContent.client[0].client_info.android_client_info.package_name;

      if (packageName !== 'com.acucaradas.encomendas') {
        console.warn('⚠️ O pacote configurado no google-services.json é diferente do esperado:');
        console.log(`   Esperado: com.acucaradas.encomendas`);
        console.log(`   Encontrado: ${packageName}`);
      } else {
        console.log('✅ O pacote configurado no google-services.json está correto.');
      }
    } catch (error) {
      console.error('❌ Erro ao analisar o arquivo google-services.json:', error.message);
    }
  }

  if (existsSync(prodFilePath)) {
    console.log('✅ O arquivo google-services.prod.json para produção foi encontrado.');
  } else {
    console.warn('⚠️ O arquivo google-services.prod.json para produção NÃO foi encontrado.');
    console.log('   Crie esse arquivo antes de publicar o app na Google Play Store.');
  }
}

// Verificar as variáveis de ambiente
function checkEnvironmentVariables() {
  console.log('\n========== VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE ==========');

  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado. Crie-o com base no arquivo .env.example');
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
  ];

  const missingVars = [];

  for (const variable of requiredVars) {
    if (!envContent.includes(`${variable}=`) || envContent.includes(`${variable}=\n`)) {
      missingVars.push(variable);
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ Faltam as seguintes variáveis de ambiente no arquivo .env:`);
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log('\nObtenha estas informações do console do Firebase:');
    console.log('1. Abra https://console.firebase.google.com/');
    console.log('2. Selecione seu projeto "Açucaradas Encomendas"');
    console.log('3. Clique em "Configurações do Projeto" (ícone de engrenagem)');
    console.log('4. Navegue até a guia "Geral"');
    console.log('5. Role até a seção "Seus aplicativos"');
    console.log('6. Adicione as variáveis faltantes ao arquivo .env');
  } else {
    console.log('✅ Todas as variáveis de ambiente Firebase necessárias estão configuradas.');
  }
}

// Instruções para configurar o Firebase
function showFirebaseInstructions() {
  console.log('\n========== INSTRUÇÕES PARA CONFIGURAÇÃO DO FIREBASE ==========');
  console.log('\n1. CRIAR COLEÇÕES NO FIRESTORE:');
  console.log('   - Acesse https://console.firebase.google.com/');
  console.log('   - Selecione seu projeto "Açucaradas Encomendas"');
  console.log('   - Navegue até "Firestore Database"');
  console.log('   - Crie as seguintes coleções:');
  console.log('     * users');
  console.log('     * products');
  console.log('     * categories');
  console.log('     * orders');
  console.log('     * settings');

  console.log('\n2. CONFIGURAR REGRAS DE SEGURANÇA DO FIRESTORE:');
  console.log('   - No console do Firebase, vá para "Firestore Database" > "Regras"');
  console.log('   - Substitua as regras pelo conteúdo do arquivo src/config/firebase.rules.js');

  console.log('\n3. CONFIGURAR AUTHENTICATION:');
  console.log('   - No console do Firebase, vá para "Authentication" > "Sign-in method"');
  console.log('   - Ative os seguintes métodos:');
  console.log('     * E-mail/senha');
  console.log('     * Google (opcional)');
  console.log('     * Telefone (opcional)');

  console.log('\n4. CONFIGURAR STORAGE:');
  console.log('   - No console do Firebase, vá para "Storage"');
  console.log('   - Crie as seguintes pastas:');
  console.log('     * product_images');
  console.log('     * profile_pictures');
  console.log('     * category_images');

  console.log('\n5. CONFIGURAR CLOUD MESSAGING (PARA NOTIFICAÇÕES):');
  console.log(
    '   - No console do Firebase, vá para "Configurações do Projeto" > "Cloud Messaging"'
  );
  console.log('   - Anote a "Chave do servidor"');
  console.log('   - Esta chave será necessária para configurar o OneSignal');
}

// Executar todas as verificações
function runFirebaseSetupChecks() {
  console.log('\n=================================================================');
  console.log('       CONFIGURAÇÃO DO FIREBASE PARA AÇUCARADAS ENCOMENDAS');
  console.log('=================================================================\n');

  checkGoogleServicesFile();
  checkEnvironmentVariables();
  showFirebaseInstructions();

  console.log('\n=================================================================');
  console.log('Para mais detalhes, consulte o arquivo instrucoes_integracoes.md');
  console.log('=================================================================\n');
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  runFirebaseSetupChecks();
} else {
  module.exports = {
    runFirebaseSetupChecks,
    checkGoogleServicesFile,
    checkEnvironmentVariables,
    showFirebaseInstructions,
  };
}
