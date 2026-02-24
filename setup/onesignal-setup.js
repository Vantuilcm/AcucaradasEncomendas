/**
 * Configuração do OneSignal para o aplicativo Açucaradas Encomendas
 *
 * Este script contém instruções para configurar o OneSignal corretamente para o aplicativo.
 * Ele não executa nenhuma ação automaticamente, apenas fornece os passos e verificações.
 */

const { existsSync, readFileSync } = require('fs');
const path = require('path');

// Verificar as variáveis de ambiente relacionadas ao OneSignal
function checkOneSignalEnvironmentVariables() {
  console.log('\n========== VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE DO ONESIGNAL ==========');

  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado. Crie-o com base no arquivo .env.example');
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');
  const requiredVars = ['ONESIGNAL_APP_ID', 'ONESIGNAL_API_KEY', 'EXPO_PUBLIC_ONESIGNAL_APP_ID'];

  const missingVars = [];

  for (const variable of requiredVars) {
    if (!envContent.includes(`${variable}=`) || envContent.includes(`${variable}=\n`)) {
      missingVars.push(variable);
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ Faltam as seguintes variáveis de ambiente do OneSignal no arquivo .env:`);
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log('\nObtenha estas informações do dashboard do OneSignal:');
    console.log('1. Acesse https://app.onesignal.com/');
    console.log('2. Selecione seu aplicativo "Açucaradas Encomendas"');
    console.log('3. Vá para Configurações -> Chaves e IDs');
    console.log('4. Copie o "App ID" e a "API Key"');
    console.log('5. Adicione as variáveis faltantes ao arquivo .env');
  } else {
    console.log('✅ Todas as variáveis de ambiente do OneSignal necessárias estão configuradas.');
  }
}

// Verificar arquivo de configuração do OneSignal
function checkOneSignalConfig() {
  console.log('\n========== VERIFICAÇÃO DO ARQUIVO DE CONFIGURAÇÃO DO ONESIGNAL ==========');

  const configPath = path.join(__dirname, '..', 'src', 'config', 'onesignal.ts');
  if (!existsSync(configPath)) {
    console.error(
      '❌ Arquivo de configuração do OneSignal não encontrado em src/config/onesignal.ts'
    );
    return;
  }

  console.log('✅ Arquivo de configuração do OneSignal encontrado.');

  const configContent = readFileSync(configPath, 'utf8');
  const requiredFunctions = [
    'initOneSignal',
    'requestOneSignalPermission',
    'getOneSignalUserId',
    'setOneSignalTags',
  ];

  const missingFunctions = [];

  for (const func of requiredFunctions) {
    if (!configContent.includes(func)) {
      missingFunctions.push(func);
    }
  }

  if (missingFunctions.length > 0) {
    console.error(`❌ Faltam as seguintes funções no arquivo de configuração do OneSignal:`);
    missingFunctions.forEach(f => console.log(`   - ${f}`));
  } else {
    console.log('✅ O arquivo de configuração do OneSignal contém todas as funções necessárias.');
  }
}

// Verificar a integração do OneSignal no aplicativo
function checkOneSignalIntegration() {
  console.log('\n========== VERIFICAÇÃO DA INTEGRAÇÃO DO ONESIGNAL NO APP ==========');

  const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
  if (!existsSync(appPath)) {
    console.error('❌ Arquivo App.tsx não encontrado em src/App.tsx');
    return;
  }

  const appContent = readFileSync(appPath, 'utf8');

  if (!appContent.includes('initOneSignal')) {
    console.error('❌ Função initOneSignal não está sendo chamada no App.tsx');
    console.log('   A inicialização do OneSignal deve ser feita no componente App');
  } else {
    console.log('✅ OneSignal está sendo inicializado corretamente em App.tsx');
  }

  if (!appContent.includes('requestOneSignalPermission')) {
    console.warn('⚠️ Função requestOneSignalPermission não foi encontrada em App.tsx');
    console.log('   É recomendado solicitar permissão para notificações no primeiro acesso');
  } else {
    console.log('✅ Solicitação de permissão para notificações está configurada');
  }
}

// Instruções para configurar o OneSignal
function showOneSignalInstructions() {
  console.log('\n========== INSTRUÇÕES PARA CONFIGURAÇÃO DO ONESIGNAL ==========');

  console.log('\n1. CRIAR CONTA E APLICATIVO NO ONESIGNAL:');
  console.log('   - Acesse https://onesignal.com/ e crie uma conta');
  console.log('   - Clique em "New App/Website"');
  console.log('   - Nomeie o aplicativo como "Açucaradas Encomendas"');
  console.log('   - Selecione as plataformas (Android e iOS)');

  console.log('\n2. CONFIGURAR PARA ANDROID:');
  console.log('   - Na seção "Configure Platform", selecione "Google Android"');
  console.log('   - Você precisará da chave FCM do Firebase:');
  console.log('     * Vá para o Console do Firebase > Configurações do projeto > Cloud Messaging');
  console.log('     * Copie a "Chave do servidor" e cole-a no OneSignal');
  console.log('   - Configure o Firebase para o OneSignal:');
  console.log('     * Forneça o nome do pacote: com.acucaradas.encomendas');
  console.log('     * Faça upload do arquivo google-services.json para o OneSignal');

  console.log('\n3. CONFIGURAR PARA IOS (se aplicável):');
  console.log('   - Na seção "Configure Platform", selecione "Apple iOS"');
  console.log('   - Siga as instruções para criar um certificado de push da Apple');
  console.log('   - Faça upload do certificado para o OneSignal');
  console.log('   - Forneça o Bundle ID: com.acucaradas.encomendas');

  console.log('\n4. OBTER CREDENCIAIS:');
  console.log('   - No dashboard do OneSignal, vá para "Settings" > "Keys & IDs"');
  console.log('   - Copie o "App ID" e "API Key"');
  console.log('   - Adicione estas credenciais ao arquivo .env:');
  console.log('     * ONESIGNAL_APP_ID=seu_app_id');
  console.log('     * ONESIGNAL_API_KEY=sua_api_key');
  console.log('     * EXPO_PUBLIC_ONESIGNAL_APP_ID=seu_app_id');

  console.log('\n5. CRIAR SEGMENTOS DE USUÁRIOS:');
  console.log('   - No dashboard do OneSignal, vá para "Audience" > "Segments"');
  console.log('   - Crie segmentos para diferentes tipos de usuários:');
  console.log('     * Todos os usuários');
  console.log('     * Usuários ativos (abriram o app nos últimos 30 dias)');
  console.log('     * Usuários que fizeram compras recentes');

  console.log('\n6. CONFIGURAR AUTOMAÇÕES DE NOTIFICAÇÕES:');
  console.log('   - No dashboard do OneSignal, vá para "Messages" > "Automations"');
  console.log('   - Configure automações para eventos importantes:');
  console.log('     * Boas-vindas para novos usuários');
  console.log('     * Lembrete de carrinho abandonado após 24 horas');
  console.log('     * Notificação de status de pedido');

  console.log('\n7. TESTAR NOTIFICAÇÕES:');
  console.log('   - No dashboard do OneSignal, vá para "Messages" > "New Push"');
  console.log('   - Envie uma notificação de teste para verificar a configuração');
}

// Executar todas as verificações
function runOneSignalSetupChecks() {
  console.log('\n=================================================================');
  console.log('      CONFIGURAÇÃO DO ONESIGNAL PARA AÇUCARADAS ENCOMENDAS');
  console.log('=================================================================\n');

  checkOneSignalEnvironmentVariables();
  checkOneSignalConfig();
  checkOneSignalIntegration();
  showOneSignalInstructions();

  console.log('\n=================================================================');
  console.log('Para mais detalhes, consulte o arquivo instrucoes_integracoes.md');
  console.log('=================================================================\n');
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  runOneSignalSetupChecks();
} else {
  module.exports = {
    runOneSignalSetupChecks,
    checkOneSignalEnvironmentVariables,
    checkOneSignalConfig,
    checkOneSignalIntegration,
    showOneSignalInstructions,
  };
}
