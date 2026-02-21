/**
 * Script para testar a funcionalidade de autenticação de dois fatores (2FA)
 *
 * Para executar:
 * 1. Certifique-se de ter o Firebase CLI instalado
 * 2. Execute: node test-2fa.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, onAuthStateChanged } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Configuração do Firebase - Valores reais do projeto
const firebaseConfig = {
  apiKey: 'AIzaSyDZtvP51yQzFZQjJJMAXJ-aRmmN-__p1-Y',
  authDomain: 'acucaradas-encomendas.firebaseapp.com',
  projectId: 'acucaradas-encomendas',
  storageBucket: 'acucaradas-encomendas.appspot.com',
  messagingSenderId: '398756107192',
  appId: '1:398756107192:web:a76b8d2af2b2e6e86a6fa7',
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Credenciais de teste - Substitua por credenciais válidas de um usuário de teste
const TEST_EMAIL = 'teste@acucaradas.com.br';
const TEST_PASSWORD = 'Teste123!';
const TEST_VERIFICATION_CODE = '123456'; // Apenas para teste

// Função para fazer login
async function login() {
  try {
    console.log(`\nTentando login com ${TEST_EMAIL}...`);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    console.log(`Login bem-sucedido! UID: ${userCredential.user.uid}`);
    return userCredential.user;
  } catch (error) {
    console.error('Erro no login:', error.code, error.message);
    process.exit(1);
  }
}

// Função para testar o envio de código de verificação
async function testSendVerificationCode(user) {
  try {
    console.log('\nTestando envio de código de verificação...');

    // Em um ambiente real, o código seria gerado aleatoriamente
    // Aqui, estamos usando um código fixo para teste
    const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');
    const result = await sendVerificationCode({
      email: user.email,
      code: TEST_VERIFICATION_CODE,
    });

    console.log('Resultado do envio:', result.data);

    console.log('\n✅ Teste de envio de código concluído com sucesso!');
    console.log(
      `O código de verificação ${TEST_VERIFICATION_CODE} deve ter sido enviado para ${user.email}`
    );
    console.log('Verifique sua caixa de entrada e pasta de spam.');
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
  }
}

// Função principal
async function main() {
  console.log('🔐 Iniciando teste de autenticação de dois fatores (2FA) 🔐');

  // Verifica se já existe um usuário logado
  onAuthStateChanged(auth, async user => {
    if (!user) {
      user = await login();
    } else {
      console.log(`Usuário já logado: ${user.email}`);
    }

    await testSendVerificationCode(user);

    // Encerra o programa após o teste
    process.exit(0);
  });
}

// Executa o programa
main().catch(error => {
  console.error('Erro inesperado:', error);
  process.exit(1);
});
