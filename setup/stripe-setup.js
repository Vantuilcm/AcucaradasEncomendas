/**
 * Configuração do Stripe para o aplicativo Açucaradas Encomendas
 *
 * Este script contém instruções para configurar o Stripe corretamente para o aplicativo.
 * Ele não executa nenhuma ação automaticamente, apenas fornece os passos e verificações.
 */

const { existsSync, readFileSync } = require('fs');
const path = require('path');

// Verificar as variáveis de ambiente relacionadas ao Stripe
function checkStripeEnvironmentVariables() {
  console.log('\n========== VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE DO STRIPE ==========');

  const envPath = path.join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado. Crie-o com base no arquivo .env.example');
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');
  const requiredVars = [
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_MERCHANT_ID',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  const missingVars = [];

  for (const variable of requiredVars) {
    if (!envContent.includes(`${variable}=`) || envContent.includes(`${variable}=\n`)) {
      missingVars.push(variable);
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ Faltam as seguintes variáveis de ambiente do Stripe no arquivo .env:`);
    missingVars.forEach(v => console.log(`   - ${v}`));
    console.log('\nObtenha estas informações do dashboard do Stripe:');
    console.log('1. Acesse https://dashboard.stripe.com/');
    console.log('2. Navegue até Desenvolvedores -> Chaves de API');
    console.log('3. Obtenha suas chaves publicáveis e secretas');
    console.log('4. Adicione as variáveis faltantes ao arquivo .env');
  } else {
    console.log('✅ Todas as variáveis de ambiente do Stripe necessárias estão configuradas.');
  }

  // Verificar se estão usando chaves de teste ou produção
  if (envContent.includes('STRIPE_PUBLISHABLE_KEY=pk_test_')) {
    console.warn(
      '⚠️ Você está usando chaves de TESTE do Stripe. Para produção, atualize para chaves LIVE.'
    );
    console.log('   As chaves de produção começam com "pk_live_" e "sk_live_"');
  } else if (envContent.includes('STRIPE_PUBLISHABLE_KEY=pk_live_')) {
    console.log('✅ Você está usando chaves de PRODUÇÃO do Stripe.');
  }
}

// Verificar arquivo de configuração do Stripe
function checkStripeConfig() {
  console.log('\n========== VERIFICAÇÃO DO ARQUIVO DE CONFIGURAÇÃO DO STRIPE ==========');

  const configPath = path.join(__dirname, '..', 'src', 'config', 'stripe.ts');
  if (!existsSync(configPath)) {
    console.error('❌ Arquivo de configuração do Stripe não encontrado em src/config/stripe.ts');
    return;
  }

  console.log('✅ Arquivo de configuração do Stripe encontrado.');

  const configContent = readFileSync(configPath, 'utf8');
  const requiredFunctions = [
    'initStripe',
    'getStripeConfig',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_CONFIG',
  ];

  const missingFunctions = [];

  for (const func of requiredFunctions) {
    if (!configContent.includes(func)) {
      missingFunctions.push(func);
    }
  }

  if (missingFunctions.length > 0) {
    console.error(
      `❌ Faltam as seguintes funções/configurações no arquivo de configuração do Stripe:`
    );
    missingFunctions.forEach(f => console.log(`   - ${f}`));
  } else {
    console.log('✅ O arquivo de configuração do Stripe contém todas as funções necessárias.');
  }
}

// Instruções para configurar o Stripe
function showStripeInstructions() {
  console.log('\n========== INSTRUÇÕES PARA CONFIGURAÇÃO DO STRIPE ==========');

  console.log('\n1. CRIAR CONTA NO STRIPE:');
  console.log('   - Acesse https://stripe.com/br e crie uma conta');
  console.log('   - Complete as informações da empresa e verificação');
  console.log('   - Configure as informações bancárias para receber pagamentos');

  console.log('\n2. OBTER CHAVES DE API:');
  console.log('   - No dashboard do Stripe, vá para "Desenvolvedores" > "Chaves de API"');
  console.log('   - Note que existem dois tipos de chaves: test e live');
  console.log('   - Para ambiente de desenvolvimento, use as chaves "test"');
  console.log('   - Para o ambiente de produção, você precisará das chaves "live"');
  console.log('   - Copie a "Chave publicável" e a "Chave secreta"');

  console.log('\n3. CONFIGURAR NO APLICATIVO:');
  console.log('   - Adicione as chaves ao arquivo .env');
  console.log('   - Para desenvolvimento:');
  console.log('     * STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX');
  console.log('     * STRIPE_SECRET_KEY=sk_test_XXXXX');
  console.log('     * EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX');
  console.log('   - Para produção:');
  console.log('     * STRIPE_PUBLISHABLE_KEY_PROD=pk_live_XXXXX');
  console.log('     * STRIPE_SECRET_KEY_PROD=sk_live_XXXXX');
  console.log('     * EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_XXXXX');

  console.log('\n4. CONFIGURAR WEBHOOK (PARA BACKEND):');
  console.log('   - No dashboard do Stripe, vá para "Desenvolvedores" > "Webhooks"');
  console.log('   - Clique em "Adicionar endpoint"');
  console.log(
    '   - Insira a URL do seu backend (ex: https://api.acucaradas.com.br/webhook/stripe)'
  );
  console.log('   - Selecione os eventos: payment_intent.succeeded, payment_intent.payment_failed');
  console.log('   - Copie a "Chave de assinatura do webhook" e adicione ao seu backend');

  console.log('\n5. TESTAR PAGAMENTOS:');
  console.log('   - Use os cartões de teste do Stripe para testar pagamentos:');
  console.log('     * Sucesso: 4242 4242 4242 4242');
  console.log('     * Falha: 4000 0000 0000 0002');
  console.log('   - Qualquer data futura, qualquer CVC de 3 dígitos');
  console.log('   - Para mais cartões de teste: https://stripe.com/docs/testing');
}

// Executar todas as verificações
function runStripeSetupChecks() {
  console.log('\n=================================================================');
  console.log('        CONFIGURAÇÃO DO STRIPE PARA AÇUCARADAS ENCOMENDAS');
  console.log('=================================================================\n');

  checkStripeEnvironmentVariables();
  checkStripeConfig();
  showStripeInstructions();

  console.log('\n=================================================================');
  console.log('Para mais detalhes, consulte o arquivo instrucoes_integracoes.md');
  console.log('=================================================================\n');
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  runStripeSetupChecks();
} else {
  module.exports = {
    runStripeSetupChecks,
    checkStripeEnvironmentVariables,
    checkStripeConfig,
    showStripeInstructions,
  };
}
