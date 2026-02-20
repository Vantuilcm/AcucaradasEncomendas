/**
 * Script simplificado para testar a função de autenticação de dois fatores
 */
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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

async function main() {
  try {
    console.log('Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const functions = getFunctions(app);
    console.log('Firebase inicializado!');

    // Credenciais de teste
    const TEST_EMAIL = 'teste@acucaradasencomendas.com.br';
    const TEST_PASSWORD = 'Teste123!';
    const TEST_VERIFICATION_CODE = '123456';

    console.log(`Tentando login com ${TEST_EMAIL}...`);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    console.log(`Login bem-sucedido! UID: ${userCredential.user.uid}`);

    console.log('Chamando função Cloud sendVerificationCode...');
    const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');
    const result = await sendVerificationCode({
      email: userCredential.user.email,
      code: TEST_VERIFICATION_CODE,
    });

    console.log('Resposta:', result.data);
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
    if (error.message) {
      console.error('Mensagem do erro:', error.message);
    }
    if (error.details) {
      console.error('Detalhes do erro:', error.details);
    }
    process.exit(1);
  }
}

main();
