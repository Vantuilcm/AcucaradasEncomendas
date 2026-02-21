/**
 * Funções do Firebase para o aplicativo Açucaradas Encomendas
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const logger = functions.logger;

// Inicializa o Firebase Admin
admin.initializeApp();

// Obter as configurações do Firebase
const config = functions.config();

// Configuração do nodemailer
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email?.user || process.env.EMAIL_USER || 'seu-email@gmail.com',
    pass: config.email?.password || process.env.EMAIL_PASSWORD || 'sua-senha-app',
  },
});

// Email do remetente
const SENDER_EMAIL = config.email?.sender || process.env.SENDER_EMAIL || 'noreply@acucaradas.com';

// Templates de email
const EMAIL_TEMPLATES = {
  VERIFICATION_CODE: {
    subject: 'Código de verificação - Açucaradas Encomendas',
    html: code => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e91e63;">Açucaradas Encomendas</h2>
        <p>Seu código de verificação para autenticação de dois fatores é:</p>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>Este código é válido por 5 minutos.</p>
        <p>Se você não solicitou este código, ignore este email.</p>
        <p style="font-size: 12px; color: #777; margin-top: 20px;">
          Este é um email automático, não responda.
        </p>
      </div>
    `,
  },
};

// Função para enviar e-mail
async function sendEmail(to, template, data) {
  const mailOptions = {
    from: `Açucaradas Encomendas <${SENDER_EMAIL}>`,
    to: to,
  };

  // Seleciona o template correspondente
  if (template === 'VERIFICATION_CODE') {
    mailOptions.subject = EMAIL_TEMPLATES.VERIFICATION_CODE.subject;
    mailOptions.html = EMAIL_TEMPLATES.VERIFICATION_CODE.html(data.code);
  } else {
    throw new Error(`Template de email "${template}" não encontrado.`);
  }

  try {
    await mailTransport.sendMail(mailOptions);
    logger.info(`Email enviado para ${to}`, { template, data });
    return { success: true };
  } catch (error) {
    logger.error(`Erro ao enviar email para ${to}`, { error, template, data });
    throw error;
  }
}

// Cloud Function para enviar código de verificação
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
  // Verifica se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'O usuário deve estar autenticado para solicitar um código de verificação.'
    );
  }

  const { email, code } = data;

  // Verifica se email e código foram fornecidos
  if (!email || !code) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email e código de verificação são obrigatórios.'
    );
  }

  // Verifica se o email corresponde ao usuário autenticado
  try {
    const userRecord = await admin.auth().getUser(context.auth.uid);
    if (userRecord.email !== email) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'O email fornecido não corresponde ao usuário autenticado.'
      );
    }
  } catch (error) {
    logger.error('Erro ao verificar usuário', { error, userId: context.auth.uid });
    throw new functions.https.HttpsError('unknown', 'Erro ao verificar usuário.');
  }

  // Enviar email com o código de verificação
  try {
    await sendEmail(email, 'VERIFICATION_CODE', { code });
    return { success: true, message: 'Código de verificação enviado com sucesso.' };
  } catch (error) {
    logger.error('Erro ao enviar código de verificação', { error, email });
    throw new functions.https.HttpsError('internal', 'Erro ao enviar código de verificação.');
  }
});
