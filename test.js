/**
 * Script simplificado para testar a função de autenticação de dois fatores
 */
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Configuração do Firebase - Valores devem vir do ambiente
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa Firebase
console.log('Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
console.log('Firebase inicializado!');

// Credenciais de teste
const TEST_EMAIL = 'teste@acucaradas.com.br';
const TEST_PASSWORD = 'Teste123!';
const TEST_VERIFICATION_CODE = '123456';

async function main() {
  try {
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
