/**
 * Script atualizado para testar a funcionalidade de autenticação de dois fatores (2FA)
 *
 * Para executar:
 * 1. Certifique-se de ter o Firebase CLI instalado
 * 2. Execute: node test-2fa-updated.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, onAuthStateChanged } = require('firebase/auth');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

// Configuração do Firebase - Valores reais do projeto
const firebaseConfig = {
  apiKey: 'AIzaSyDZtvP51yQzFZQjJJMAXJ-aRmmN-__p1-Y',
  authDomain: 'acucaradas-encomendas.firebaseapp.com',
  projectId: 'acucaradas-encomendas',
  storageBucket: 'acucaradas-encomendas.appspot.com',
  messagingSenderId: '398756107192',
  appId: '1:398756107192:web:a76b8d2af2b2e6e86a6fa7',
};

console.log('[TESTE] Iniciando aplicativo Firebase...');
// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
console.log('[TESTE] Firebase inicializado com sucesso!');

// Definir se deve usar emuladores locais
const USE_EMULATOR = false;
if (USE_EMULATOR) {
  console.log('[TESTE] Conectando ao emulador de Functions...');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Credenciais de teste - Substitua por credenciais válidas de um usuário de teste
const TEST_EMAIL = 'teste@acucaradas.com.br';
const TEST_PASSWORD = 'Teste123!';
const TEST_VERIFICATION_CODE = '123456'; // Apenas para teste

// Função para fazer login
async function login() {
  try {
    console.log(`\n[TESTE] Tentando login com ${TEST_EMAIL}...`);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    console.log(`[TESTE] Login bem-sucedido! UID: ${userCredential.user.uid}`);
    return userCredential.user;
  } catch (error) {
    console.error('[ERRO] Erro no login:', error.code, error.message);
    process.exit(1);
  }
}

// Função para testar o envio de código de verificação
async function testSendVerificationCode(user) {
  try {
    console.log('\n[TESTE] Testando envio de código de verificação...');
    console.log(`[TESTE] Dados da requisição: email=${user.email}, code=${TEST_VERIFICATION_CODE}`);

    // Em um ambiente real, o código seria gerado aleatoriamente
    // Aqui, estamos usando um código fixo para teste
    const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');
    console.log("[TESTE] Chamando função Cloud 'sendVerificationCode'...");

    const result = await sendVerificationCode({
      email: user.email,
      code: TEST_VERIFICATION_CODE,
    });

    console.log('[TESTE] Resposta recebida:', JSON.stringify(result.data, null, 2));

    console.log('\n✅ [SUCESSO] Teste de envio de código concluído com sucesso!');
    console.log(
      `[INFO] O código de verificação ${TEST_VERIFICATION_CODE} deve ter sido enviado para ${user.email}`
    );
    console.log('[INFO] Verifique sua caixa de entrada e pasta de spam.');
  } catch (error) {
    console.error('[ERRO] Falha ao enviar código de verificação:', error);
    if (error.code && error.details) {
      console.error('[DETALHES] Código:', error.code);
      console.error('[DETALHES] Mensagem:', error.message);
      console.error('[DETALHES] Detalhes:', error.details);
    }
  }
}

// Função principal
async function main() {
  console.log('🔐 [INICIALIZANDO] Iniciando teste de autenticação de dois fatores (2FA) 🔐');

  try {
    // Verificar se já existe um usuário logado
    console.log('[TESTE] Verificando estado de autenticação...');

    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log(`[TESTE] Usuário já logado: ${currentUser.email}`);
      await testSendVerificationCode(currentUser);
    } else {
      console.log('[TESTE] Nenhum usuário logado. Fazendo login...');
      const user = await login();
      await testSendVerificationCode(user);
    }

    console.log('\n[FINALIZANDO] Teste concluído! 👍');
    process.exit(0);
  } catch (error) {
    console.error('[ERRO FATAL] Erro inesperado:', error);
    process.exit(1);
  }
}

// Executa o programa
console.log('[INICIALIZANDO] Iniciando script de teste 2FA...');
main().catch(error => {
  console.error('[ERRO FATAL] Erro inesperado:', error);
  process.exit(1);
});
