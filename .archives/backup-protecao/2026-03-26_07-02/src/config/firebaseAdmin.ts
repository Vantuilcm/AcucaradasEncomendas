import * as admin from 'firebase-admin';

// Inicializa o Firebase Admin SDK se ainda não estiver inicializado
// Nota: Em produção, isso usa GOOGLE_APPLICATION_CREDENTIALS
// Em desenvolvimento local, você deve configurar suas credenciais de serviço
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export { admin };
