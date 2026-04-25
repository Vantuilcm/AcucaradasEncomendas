/**
 * Script principal para configuração de integrações externas do Açucaradas Encomendas
 *
 * Este script executa todas as verificações e configurações necessárias para as integrações
 * externas do aplicativo, incluindo Firebase, Stripe e OneSignal.
 */

const { existsSync, mkdirSync } = require('fs');
const path = require('path');

// Importar scripts de configuração
const firebase = require('./firebase-setup');
const stripe = require('./stripe-setup');
const oneSignal = require('./onesignal-setup');

// Verificar se a pasta setup existe
function ensureSetupDirectoryExists() {
  const setupDir = path.join(__dirname, '..');
  if (!existsSync(setupDir)) {
    console.error(
      '❌ Pasta setup não encontrada. Este script deve ser executado dentro da pasta do projeto.'
    );
    process.exit(1);
  }
}

// Instruções gerais sobre o processo de configuração
function showGeneralInstructions() {
  console.log('\n=================================================================');
  console.log('          CONFIGURAÇÃO DE INTEGRAÇÕES EXTERNAS');
  console.log('              AÇUCARADAS ENCOMENDAS');
  console.log('=================================================================\n');

  console.log('Este script verifica e guia a configuração das seguintes integrações externas:');
  console.log('  1. Firebase (Autenticação, Firestore, Storage)');
  console.log('  2. Stripe (Processamento de pagamentos)');
  console.log('  3. OneSignal (Notificações push)\n');

  console.log('Cada integração será verificada em sequência e você receberá instruções');
  console.log('detalhadas sobre como configurar corretamente cada serviço.\n');

  console.log('IMPORTANTE: As verificações não substituem as configurações reais.');
  console.log('Você precisará seguir as instruções e realizar as ações necessárias');
  console.log('em cada plataforma externa (Firebase Console, Dashboard do Stripe, etc.).\n');

  console.log('Pressione ENTER para iniciar as verificações...');
}

// Instruções finais após todas as verificações
function showFinalInstructions() {
  console.log('\n=================================================================');
  console.log('           RESUMO DA CONFIGURAÇÃO DE INTEGRAÇÕES');
  console.log('=================================================================\n');

  console.log('1. VERIFICAÇÕES FINAIS:');
  console.log('   - Firebase: Firestore, Authentication e Storage estão configurados corretamente');
  console.log('   - Stripe: As chaves de API live estão configuradas (não as de teste)');
  console.log('   - OneSignal: As notificações push estão funcionando em ambas as plataformas');

  console.log('\n2. AMBIENTE DE PRODUÇÃO:');
  console.log('   - Todas as URLs e endpoints estão apontando para o ambiente de produção');
  console.log('   - Chaves secretas não estão expostas no código do cliente');

  console.log('\n3. TAREFAS PÓS-CONFIGURAÇÃO:');
  console.log('   - Criar um usuário administrador para gerenciar o conteúdo');
  console.log('   - Adicionar alguns produtos e categorias iniciais');
  console.log('   - Testar o fluxo completo de pagamento no ambiente de produção');
  console.log('   - Enviar uma notificação push de teste para verificar a configuração');

  console.log('\n4. DOCUMENTAÇÃO:');
  console.log('   - Consulte instrucoes_integracoes.md para detalhes adicionais');
  console.log('   - Mantenha as chaves e credenciais em local seguro');

  console.log('\n=================================================================');
  console.log('  CONFIGURAÇÃO CONCLUÍDA! Seu app está pronto para ser publicado.');
  console.log('=================================================================');
}

// Função principal para executar todas as verificações
async function runAllChecks() {
  ensureSetupDirectoryExists();
  showGeneralInstructions();

  // Aguardar a entrada do usuário
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  // Executar as verificações do Firebase
  firebase.runFirebaseSetupChecks();

  console.log('\nPressione ENTER para continuar com a configuração do Stripe...');
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  // Executar as verificações do Stripe
  stripe.runStripeSetupChecks();

  console.log('\nPressione ENTER para continuar com a configuração do OneSignal...');
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  // Executar as verificações do OneSignal
  oneSignal.runOneSignalSetupChecks();

  console.log('\nPressione ENTER para ver o resumo e instruções finais...');
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  // Mostrar instruções finais
  showFinalInstructions();
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  runAllChecks().catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
} else {
  module.exports = {
    runAllChecks,
    showGeneralInstructions,
    showFinalInstructions,
  };
}
