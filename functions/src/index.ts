import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const getStripe = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY não está definida nas variáveis de ambiente das Functions.');
    return null;
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2022-11-15' as any,
  });
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Middleware de Autenticação para Firebase Functions
 * Verifica o ID Token do Firebase enviado no header Authorization
 */
const authMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email,
    };
    return next();
  } catch (error) {
    console.error('Erro ao verificar token do Firebase:', error);
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// --- ROTAS DO STRIPE ---

/**
 * Cria um PaymentIntent para cartão de crédito
 */
app.post('/create-payment-intent', authMiddleware, async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }
    const { amount, currency = 'brl', metadata = {} } = req.body;
    const userId = req.user.id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Converte para centavos
      currency,
      metadata: { ...metadata, userId },
    });

    res.json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Erro ao criar PaymentIntent:', error);
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

/**
 * Gera link de onboarding para conta Stripe Connect
 */
app.post('/api/stripe/onboarding-link', async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }

    const { userId, email, userType, refresh_url, return_url } = req.body || {};

    if (!userId || !email || !refresh_url || !return_url) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' });
    }

    if (!['producer', 'driver', 'customer'].includes(userType)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    const db = admin.firestore();
    let accountId: string | null = null;

    if (userType === 'producer') {
      const snapshot = await db.collection('producers').where('userId', '==', userId).limit(1).get();
      let producerRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as any;
        accountId = data?.stripeAccountId || null;
        producerRef = doc.ref;
      } else {
        const newRef = db.collection('producers').doc();
        producerRef = newRef;
        await newRef.set(
          {
            userId,
            email,
            name: email,
            isActive: false,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'BR',
          email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: 'individual',
          metadata: { userId, userType },
        });

        accountId = account.id;
        await producerRef.update({
          stripeAccountId: accountId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else if (userType === 'driver') {
      const snapshot = await db.collection('delivery_persons').where('userId', '==', userId).limit(1).get();
      let driverRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as any;
        accountId = data?.stripeAccountId || null;
        driverRef = doc.ref;
      } else {
        const newRef = db.collection('delivery_persons').doc();
        driverRef = newRef;
        await newRef.set(
          {
            userId,
            email,
            isActive: false,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'BR',
          email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: 'individual',
          metadata: { userId, userType },
        });

        accountId = account.id;
        await driverRef.update({
          stripeAccountId: accountId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      return res.status(400).json({ error: 'Onboarding disponível apenas para produtores e entregadores' });
    }

    if (!accountId) {
      return res.status(500).json({ error: 'Não foi possível preparar a conta Stripe' });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    });

    return res.json({ url: accountLink.url, accountId });
  } catch (error: any) {
    console.error('Erro ao gerar link de onboarding do Stripe:', error);
    return res.status(500).json({ error: 'Erro ao gerar link de onboarding' });
  }
});

/**
 * Consulta status de conta Stripe Connect
 */
app.get('/api/stripe/account-status/:accountId', async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }

    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId é obrigatório' });
    }

    const account = await stripe.accounts.retrieve(accountId);
    const detailsSubmitted = (account as any).details_submitted;
    const chargesEnabled = (account as any).charges_enabled;
    const payoutsEnabled = (account as any).payouts_enabled;

    let status: 'not_started' | 'pending' | 'active' = 'pending';
    if (detailsSubmitted && chargesEnabled && payoutsEnabled) {
      status = 'active';
    }

    return res.json({ status });
  } catch (error: any) {
    console.error('Erro ao consultar status de conta Stripe:', error);
    return res.status(500).json({ error: 'Erro ao consultar status da conta Stripe' });
  }
});

/**
 * Cria transferência para conta conectada (split de pagamento)
 */
app.post('/api/stripe/transfers', async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }

    const { amount, currency = 'brl', destination, transferGroup } = req.body || {};

    if (!amount || !destination) {
      return res.status(400).json({ error: 'amount e destination são obrigatórios' });
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(amount) * 100),
      currency: String(currency).toLowerCase(),
      destination,
      transfer_group: transferGroup,
    });

    return res.json(transfer);
  } catch (error: any) {
    console.error('Erro ao criar transferência Stripe:', error);
    return res.status(500).json({ error: 'Erro ao criar transferência Stripe' });
  }
});

/**
 * Processa solicitação de saque para conta conectada
 */
app.post('/api/stripe/payout', async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }

    const { stripeAccountId, amount, currency = 'brl' } = req.body || {};

    if (!stripeAccountId || !amount) {
      return res.status(400).json({ error: 'stripeAccountId e amount são obrigatórios' });
    }

    const payout = await stripe.payouts.create(
      {
        amount: Number(amount),
        currency: String(currency).toLowerCase(),
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    return res.json(payout);
  } catch (error: any) {
    console.error('Erro ao processar saque Stripe:', error);
    return res.status(500).json({ error: 'Erro ao processar saque Stripe' });
  }
});

/**
 * Cria um pagamento via PIX
 */
app.post('/create-pix-payment', authMiddleware, async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }
    const { amount, metadata = {} } = req.body;
    const userId = req.user.id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'brl',
      payment_method_types: ['pix'],
      metadata: { ...metadata, userId },
      confirm: true,
      payment_method_data: { type: 'pix' },
    });

    const nextAction = paymentIntent.next_action;
    if (!nextAction || !nextAction.pix_display_qr_code) {
      throw new Error('Falha ao gerar QR Code PIX');
    }

    res.json({
      paymentIntentId: paymentIntent.id,
      qrCode: nextAction.pix_display_qr_code.data,
      pixCode: nextAction.pix_display_qr_code.image_url_png,
      expiresAt: nextAction.pix_display_qr_code.expires_at,
    });
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error);
    res.status(500).json({ error: 'Erro ao gerar QR Code PIX' });
  }
});

/**
 * Verifica o status de um pagamento
 */
app.get('/check-payment-status/:paymentId', authMiddleware, async (req: any, res: any) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
    }
    const { paymentId } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    res.json({ status: paymentIntent.status });
  } catch (error: any) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

/**
 * Webhook do Stripe para processar eventos assíncronos
 * Nota: Requer configuração do segredo do webhook (STRIPE_WEBHOOK_SECRET)
 */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = getStripe();
    if (!stripe) {
      console.error('Configuração do Stripe ausente no servidor (webhook).');
      return res.status(500).send('Stripe não configurado');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET não está definida nas variáveis de ambiente das Functions.');
      return res.status(500).send('Webhook do Stripe não configurado');
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Erro no Webhook signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lógica simplificada de processamento de eventos
  // Em produção, isso deve atualizar o Firestore ou enviar notificações
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Pagamento bem sucedido:', paymentIntent.id);
      // Aqui você adicionaria a lógica para salvar no Firestore
      break;
    case 'payment_intent.payment_failed':
      console.log('Pagamento falhou');
      break;
  }

  res.json({ received: true });
});

// Exporta a API como uma Cloud Function única (HTTPS)
export const api = functions.https.onRequest(app);
