/**
 * 🛡️ RellBuild Explainable Guard: Sistema de Explicabilidade e Transparência
 * Traduz logs técnicos em justificativas legíveis para humanos.
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

function getStripeSecret() {
  // 1. Secret Manager binding (firebase-functions v7 / runWith secrets)
  let secretKey = process.env.STRIPE_SECRET_KEY || null;

  // 2. Fallback legado — functions.config() removido em firebase-functions v7
  if (!secretKey) {
    try {
      secretKey = functions.config().stripe?.secret;
    } catch (e) {
      // Ignora erro se functions.config() não estiver disponível
    }
  }

  // 3. Validação rígida de segurança
  if (!secretKey) {
    console.error('🚨 [STRIPE_ENV] ERRO CRÍTICO: STRIPE_SECRET_KEY não configurada no ambiente.');
    throw new functions.https.HttpsError(
      'internal',
      'Configuração financeira ausente. Contate o administrador.'
    );
  }

  return secretKey;
}

function getWebhookSecret() {
  // 1. Secret Manager binding (firebase-functions v7 / runWith secrets)
  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

  // 2. Fallback legado — functions.config() removido em firebase-functions v7
  if (!webhookSecret) {
    try {
      webhookSecret = functions.config().stripe?.webhook_secret;
    } catch (e) {
      // Ignora erro se functions.config() não estiver disponível
    }
  }

  return webhookSecret;
}

const db = admin.firestore();

// ======================================================
// ⚙️ CONFIGURAÇÕES E GUARDRAILS
// ======================================================

const DEFAULT_CONFIG = {
  orderRateLimit: 5,
  loginRateLimit: 10,
  authRiskWeight: 20,
  orderSpamWeight: 25,
  minOrderLimit: 2,
  maxOrderLimit: 10,
  mode: 'auto',      // 'auto' | 'manual'
  isFrozen: false    // se true, impede qualquer alteração (auto ou manual)
};

async function getSystemConfig() {
  const configDoc = await db.collection('system_config').doc('current').get();
  return configDoc.exists ? configDoc.data() : DEFAULT_CONFIG;
}

// ======================================================
// 🔐 CONTROLE DE ACESSO
// ======================================================

async function validateAdmin(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Acesso exclusivo para administradores.');
  }
}

// ======================================================
// 🧠 MÓDULO DE EXPLICABILIDADE (NOVO)
// ======================================================

/**
 * Traduz motivos técnicos em linguagem amigável
 */
function translateReason(reason, points) {
  const mapping = {
    'DYNAMIC_RATE_LIMIT_EXCEEDED': `Pedidos rápidos demais (+${points})`,
    'EXCESSIVE_LOGIN_ATTEMPTS': `Tentativas de login excessivas (+${points})`,
    'API_ERROR_4XX_SPIKE': `Erros frequentes de navegação (+${points})`,
    'SUSPICIOUS_DEVICE_CHANGE': `Troca suspeita de dispositivo (+${points})`
  };
  return mapping[reason] || `${reason} (+${points})`;
}

/**
 * Gera uma explicação detalhada e legível sobre a decisão de risco
 */
async function generateDecisionExplanation(userId) {
  const logsSnap = await db.collection('security_logs')
    .where('uid', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  if (logsSnap.empty) return null;

  const logs = logsSnap.docs.map(doc => doc.data());
  const latestLog = logs[0];
  
  const events = logs.map(l => ({
    label: translateReason(l.reason, l.points),
    timestamp: l.timestamp
  }));

  const timeline = logs.map(l => ({
    score: l.newScore,
    timestamp: l.timestamp
  })).reverse();

  const threshold = latestLog.newScore > 60 ? 60 : 30;
  const statusLabel = latestLog.newScore > 60 ? 'Bloqueado' : 'Suspeito';

  const explanation = {
    userId,
    currentScore: latestLog.newScore,
    status: statusLabel,
    finalReason: `Usuário atingiu nível ${statusLabel.toLowerCase()} (${latestLog.newScore} > ${threshold})`,
    events,
    timeline,
    generatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Persistência para auditoria
  await db.collection('decision_explanations').doc(userId).set(explanation);
  
  return explanation;
}

// ======================================================
// 🧠 MÓDULO DE APRENDIZADO
// ======================================================

async function evaluateAdjustmentEffectiveness(lastHistoryDoc) {
  const data = lastHistoryDoc.data();
  const startTime = data.timestamp.toDate();
  
  const usersSnap = await db.collection('users').get();
  let totalScore = 0;
  usersSnap.forEach(doc => totalScore += (doc.data().riskScore || 0));
  const currentAvgRisk = usersSnap.size > 0 ? totalScore / usersSnap.size : 0;
  const riskReduction = data.avgRiskScore - currentAvgRisk;

  const ordersSnap = await db.collection('orders').where('createdAt', '>=', startTime).get();
  const blocksSnap = await db.collection('security_logs').where('timestamp', '>=', startTime).where('reason', '==', 'DYNAMIC_RATE_LIMIT_EXCEEDED').get();
  
  const conversionRate = ordersSnap.size > 0 ? (ordersSnap.size / (ordersSnap.size + blocksSnap.size)) * 100 : 100;

  return {
    riskReduction,
    conversionRate,
    effectivenessScore: (riskReduction * 0.6) + (conversionRate * 0.4)
  };
}

// ======================================================
// 🚀 MOTOR DE AUTO-AJUSTE COM GOVERNANÇA
// ======================================================

exports.autoAdjustSystem = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
  const config = await getSystemConfig();

  if (config.mode === 'manual' || config.isFrozen) {
    console.info(`ℹ️ [Governance-Guard] Auto-ajuste ignorado. Modo: ${config.mode}, Frozen: ${config.isFrozen}`);
    return { success: true, message: 'Skipped due to governance settings' };
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  const usersSnap = await db.collection('users').get();
  let totalScore = 0;
  usersSnap.forEach(doc => totalScore += (doc.data().riskScore || 0));
  const avgRiskScore = usersSnap.size > 0 ? totalScore / usersSnap.size : 0;

  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const recentLogs = await db.collection('security_logs').where('timestamp', '>=', lastHour).get();
  const attackVolume = recentLogs.size;

  const lastHistory = await db.collection('system_config_history').orderBy('timestamp', 'desc').limit(1).get();
  if (!lastHistory.empty) {
    const effectiveness = await evaluateAdjustmentEffectiveness(lastHistory.docs[0]);
    await lastHistory.docs[0].ref.update({ effectiveness });
  }

  const similarContexts = await db.collection('system_config_history')
    .where('hour', '==', currentHour)
    .orderBy('effectiveness.effectivenessScore', 'desc')
    .limit(3)
    .get();

  let newConfig = { ...config };
  let adjustments = [];
  let learningApplied = false;

  if (!similarContexts.empty) {
    const bestMatch = similarContexts.docs[0].data();
    if (bestMatch.effectiveness && bestMatch.effectiveness.effectivenessScore > 50) {
      newConfig = { ...bestMatch.newConfig };
      adjustments.push(`LEARNING_APPLIED: Reusing config from hour ${currentHour}`);
      learningApplied = true;
    }
  }

  if (!learningApplied) {
    if (avgRiskScore > 40 || attackVolume > 50) {
      if (newConfig.orderRateLimit > config.minOrderLimit) newConfig.orderRateLimit -= 1;
      newConfig.orderSpamWeight += 5;
      adjustments.push("HEURISTIC_HARDENING: Risk spike");
    } else if (avgRiskScore < 15 && attackVolume < 10) {
      if (newConfig.orderRateLimit < config.maxOrderLimit) newConfig.orderRateLimit += 1;
      newConfig.orderSpamWeight = Math.max(newConfig.orderSpamWeight - 2, DEFAULT_CONFIG.orderSpamWeight);
      adjustments.push("HEURISTIC_RELAX: Stable environment");
    }
  }

  if (adjustments.length > 0) {
    const batch = db.batch();
    batch.set(db.collection('system_config').doc('current'), {
      ...newConfig,
      lastAdjustedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAdjustments: adjustments
    });

    batch.set(db.collection('system_config_history').doc(), {
      oldConfig: config,
      newConfig: newConfig,
      adjustments,
      avgRiskScore,
      attackVolume,
      hour: currentHour,
      day: currentDay,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
  }

  return { success: true, adjustments, learningApplied };
});

// ======================================================
// 🛠️ ADMIN OVERRIDES E AUDITORIA
// ======================================================

exports.updateSystemConfigAdmin = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid);

  const currentConfig = await getSystemConfig();
  
  if (data.orderRateLimit && (data.orderRateLimit < currentConfig.minOrderLimit || data.orderRateLimit > currentConfig.maxOrderLimit)) {
    throw new functions.https.HttpsError('invalid-argument', `Threshold fora dos limites seguros (${currentConfig.minOrderLimit}-${currentConfig.maxOrderLimit})`);
  }

  const newConfig = {
    ...currentConfig,
    ...data,
    lastManualIntervention: {
      adminUid: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: data.action || 'MANUAL_UPDATE'
    }
  };

  await db.collection('system_config').doc('current').set(newConfig);

  await db.collection('manual_audit_logs').add({
    adminUid: context.auth.uid,
    oldConfig: currentConfig,
    newConfig: newConfig,
    reason: data.reason || 'No reason provided',
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, newConfig };
});

// ======================================================
// 🔗 DASHBOARD EXECUTIVO COM EXPLICABILIDADE
// ======================================================

exports.getExecutiveDashboard = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid);

  const config = await getSystemConfig();
  const usersSnap = await db.collection('users').get();
  
  let securityStats = { active: 0, suspicious: 0, blocked: 0, totalScore: 0 };
  let problematicUsers = [];

  usersSnap.forEach(doc => {
    const d = doc.data();
    const status = d.status || 'active';
    securityStats[status]++;
    securityStats.totalScore += (d.riskScore || 0);

    if (status !== 'active') {
      problematicUsers.push({
        uid: doc.id,
        score: d.riskScore,
        status: status
      });
    }
  });

  return {
    governance: {
      mode: config.mode,
      isFrozen: config.isFrozen,
      lastIntervention: config.lastManualIntervention || null
    },
    security: {
      users: securityStats,
      avgScore: (securityStats.totalScore / usersSnap.size).toFixed(2),
      problematicUsers: problematicUsers.sort((a, b) => b.score - a.score).slice(0, 5)
    },
    config: {
      orderRateLimit: config.orderRateLimit,
      orderSpamWeight: config.orderSpamWeight
    }
  };
});

/**
 * Endpoint para obter a explicação de uma decisão específica
 */
exports.getDecisionExplanation = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid);
  if (!data.userId) throw new functions.https.HttpsError('invalid-argument', 'userId é obrigatório');

  const explanation = await db.collection('decision_explanations').doc(data.userId).get();
  if (explanation.exists) return explanation.data();

  // Se não existir, tenta gerar agora
  return generateDecisionExplanation(data.userId);
});

// ======================================================
// 💳 PAGAMENTOS E STRIPE CONNECT (Fase 1/2)
// ======================================================

/**
 * Cria ou recupera um Customer no Stripe
 */
exports.createStripeCustomer = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação.');
  
  const stripe = require('stripe')(getStripeSecret());
  const { email, name } = data;
  const uid = context.auth.uid;

  if (!email || !name) {
    throw new functions.https.HttpsError('invalid-argument', 'Email e Nome são obrigatórios.');
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists && userDoc.data().stripeCustomerId) {
      return { customerId: userDoc.data().stripeCustomerId };
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { uid }
    });

    await userRef.set({ stripeCustomerId: customer.id }, { merge: true });

    return { customerId: customer.id };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar Customer:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
  });

/**
 * Cria um SetupIntent para salvar cartão do cliente
 */
exports.createSetupIntent = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação.');
  
  const stripe = require('stripe')(getStripeSecret());
  const { customerId } = data;

  if (!customerId) throw new functions.https.HttpsError('invalid-argument', 'CustomerId é obrigatório.');

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return { clientSecret: setupIntent.client_secret };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar SetupIntent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
  });

/**
 * Normaliza paymentMethod do client para whitelist interna (card | pix).
 */
function normalizeCreatePaymentIntentMethod(paymentMethod) {
  if (paymentMethod == null || paymentMethod === '') {
    return 'card';
  }

  const normalized = String(paymentMethod).trim().toLowerCase();

  if (normalized === 'card' || normalized === 'creditcard' || normalized === 'credit_card') {
    return 'card';
  }

  if (normalized === 'pix') {
    return 'pix';
  }

  throw new functions.https.HttpsError(
    'invalid-argument',
    'paymentMethod inválido. Valores aceitos: card, creditCard ou pix.'
  );
}

/**
 * Cria um PaymentIntent com suporte a transfer_group para split futuro
 * STRIPE_SECRET_KEY injetada via Secret Manager (mesmo padrão Connect/onboarding).
 */
exports.createPaymentIntent = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Requer autenticação.');

  const stripe = require('stripe')(getStripeSecret());
  const { amount, currency = 'brl', orderId, customerId, paymentMethod } = data;

  if (!amount || amount <= 0 || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount (maior que 0) e OrderId são obrigatórios.');
  }

  if (currency.toLowerCase() !== 'brl') {
    throw new functions.https.HttpsError('invalid-argument', 'Apenas a moeda BRL é suportada para transações.');
  }

  const resolvedPaymentMethod = normalizeCreatePaymentIntentMethod(paymentMethod);

  try {
    const idempotencyKey = `pi_${orderId}`;
    const uid = context.auth.uid;

    let stripeCustomerId = customerId || null;
    if (!stripeCustomerId) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists && userDoc.data().stripeCustomerId) {
        stripeCustomerId = userDoc.data().stripeCustomerId;
      }
    }

    const paymentIntentParams = {
      amount: Math.round(amount), // Garante que seja inteiro em centavos
      currency,
      transfer_group: orderId, // Vincula o pagamento ao pedido para o split (Fase 2)
      metadata: {
        orderId,
        userId: uid,
        app: 'acucaradas-encomendas',
        paymentMethod: resolvedPaymentMethod,
      },
    };

    if (resolvedPaymentMethod === 'pix') {
      paymentIntentParams.payment_method_types = ['pix'];
    }

    let ephemeralKeySecret = null;
    if (stripeCustomerId) {
      paymentIntentParams.customer = stripeCustomerId;
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: stripeCustomerId },
        { apiVersion: '2024-06-20' }
      );
      ephemeralKeySecret = ephemeralKey.secret;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams,
      {
        idempotencyKey,
      }
    );

    const response = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };

    if (stripeCustomerId && ephemeralKeySecret) {
      response.customer = stripeCustomerId;
      response.ephemeralKey = ephemeralKeySecret;
    }

    return response;
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar PaymentIntent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
  });

/**
 * Estados operacionais em que o pedido já foi pago ou avançou no fluxo.
 */
const ADVANCED_ORDER_STATUSES = ['confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'paid', 'completed'];

function isOrderPaymentSettled(orderData) {
  return (
    orderData.paymentStatus === 'completed' ||
    ADVANCED_ORDER_STATUSES.includes(orderData.status)
  );
}

function isOrderPaymentTerminalFailure(orderData) {
  return (
    orderData.paymentStatus === 'failed' ||
    orderData.paymentStatus === 'expired' ||
    orderData.status === 'cancelled' ||
    orderData.status === 'payment_failed'
  );
}

function extractPaymentMethodType(paymentIntent) {
  const fromMetadata = paymentIntent.metadata?.paymentMethod;
  if (fromMetadata === 'pix') return 'pix';
  if (fromMetadata === 'card') return 'credit_card';

  const types = paymentIntent.payment_method_types;
  if (Array.isArray(types) && types.length > 0) {
    if (types[0] === 'pix') return 'pix';
    if (types[0] === 'card') return 'credit_card';
  }

  return null;
}

/**
 * Stripe Webhook: Ouve eventos assíncronos de pagamento
 * IMPORTANTE: É onRequest (HTTP puro), não onCall.
 * STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET injetadas via Secret Manager.
 */
exports.stripeWebhook = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  .https.onRequest(async (req, res) => {
  const stripe = require('stripe')(getStripeSecret());
  const endpointSecret = getWebhookSecret();

  let event;

  if (endpointSecret) {
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, endpointSecret);
    } catch (err) {
      console.error(`⚠️ [Stripe Webhook] Erro de assinatura: ${err.message}`);
      await db.collection('stripe_webhook_errors').add({
        error: err.message,
        type: 'signature_validation',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // Apenas para fallback local/dev sem secret
    event = req.body;
  }

  try {
    const eventId = event.id;
    if (!eventId) {
      return res.status(400).send('Event ID missing');
    }

    const eventRef = db.collection('stripe_events').doc(eventId);
    const eventDoc = await eventRef.get();

    // Deduplicação: ignora se já processou
    if (eventDoc.exists) {
      console.log(`ℹ️ [Stripe Webhook] Evento ${eventId} já processado. Ignorando.`);
      return res.json({ received: true });
    }

    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.warn('⚠️ [Stripe Webhook] PaymentIntent sem orderId no metadata.');
      await eventRef.set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'ignored',
        reason: 'missing_orderId'
      });
      return res.json({ received: true });
    }

    const orderRef = db.collection('orders').doc(orderId);

    // Executa a operação do webhook dentro de uma Transaction para garantir consistência
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        console.warn(`⚠️ [Stripe Webhook] Pedido ${orderId} não encontrado no Firestore.`);
        return; // Retorna silenciosamente da transação
      }

      const orderData = orderDoc.data();

      switch (event.type) {
        case 'payment_intent.succeeded':
          // Evita sobrescrever se já foi processado (legado: status paid; atual: status confirmed)
          const splitAlreadyDone =
            orderData.producerTransferId ||
            orderData.payoutStatus === 'paid';

          if (orderData.paymentStatus === 'completed' && splitAlreadyDone) {
            console.log(`ℹ️ [Stripe Webhook] Pedido ${orderId} já pago e split concluído. Ignorando.`);
            break;
          }

          console.log(`✅ [Stripe Webhook] Pagamento confirmado para o pedido ${orderId}. Iniciando Split de Pagamento...`);
          
          let payoutStatus = 'pending';
          const updates = {
            status: 'confirmed',
            paymentStatus: 'completed',
            paymentIntentId: paymentIntent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          const paymentMethodType = extractPaymentMethodType(paymentIntent);
          if (paymentMethodType) {
            updates.paymentMethodType = paymentMethodType;
          }

          // 1. Extração de Valores e Identificadores do Pedido
          const { producerId, deliveryDriverId, courierId, subtotalProducts, deliveryFee, totalAmount } = orderData;
          const targetCourierId = deliveryDriverId || courierId; // Aceita ambas as nomenclaturas

          // 2. Validações para executar o Split (Apenas se houver valores válidos)
          if (producerId && subtotalProducts > 0) {
            try {
              // Buscar Conta Conectada do Produtor
              const producerDoc = await transaction.get(db.collection('users').doc(producerId));
              const producerStripeAccountId = producerDoc.data()?.stripeAccountId;

              // Buscar Conta Conectada do Entregador (Logística do Repasse)
              // OBS: Entregador não recebe agora! Ficará retido até 'delivered'.
              // Apenas sinalizamos no pedido que o dinheiro está reservado.

              // Validação de Integridade do Connect (Apenas Produtor neste momento)
              if (!producerStripeAccountId) {
                payoutStatus = 'missing_connected_account';
                console.warn(`⚠️ [Split] Produtor ${producerId} não possui stripeAccountId. Repasse manual necessário.`);
              } else {
                // Executar Transferências
                const netSubtotal = subtotalProducts; // O subtotal não inclui a taxa de entrega
                const producerPayoutAmount = Math.floor(netSubtotal * 0.90 * 100); // 90% em centavos
                const platformFeeAmount = Math.floor(netSubtotal * 0.10 * 100);    // 10% retido

                const chargeId = typeof paymentIntent.latest_charge === 'string'
                  ? paymentIntent.latest_charge
                  : paymentIntent.latest_charge?.id;

                if (!chargeId) {
                  throw new Error(`Charge ID indisponível para transfer BR do pedido ${orderId}`);
                }

                const transfersToExecute = [];

                // Repasse do Produtor (Imediato)
                transfersToExecute.push(
                  stripe.transfers.create({
                    amount: producerPayoutAmount,
                    currency: 'brl',
                    destination: producerStripeAccountId,
                    source_transaction: chargeId,
                    transfer_group: orderId,
                    metadata: { role: 'producer', orderId }
                  }, {
                    idempotencyKey: `payout_producer_${orderId}`
                  })
                );

                // Dispara o transfer do Produtor assincronamente mas aguarda
                const transferResults = await Promise.all(transfersToExecute);
                payoutStatus = 'paid';

                // Registrar rastreabilidade na order
                updates.platformFeeAmount = platformFeeAmount / 100;
                updates.producerPayoutAmount = producerPayoutAmount / 100;
                updates.producerTransferId = transferResults[0].id;
                
                // --- NOVA REGRA DO MARKETPLACE PARA ENTREGADORES ---
                // O dinheiro da entrega fica RETIDO. O repasse só ocorre no onOrderDelivered.
                if (deliveryFee > 0) {
                  updates.deliveryFeeHeld = true;
                  updates.courierPayoutStatus = 'pending_delivery';
                  updates.courierPayoutAmount = deliveryFee;
                }

                console.log(`✅ [Split] Produtor Pago! Plataforma: ${updates.platformFeeAmount} | Produtor: ${updates.producerPayoutAmount}. Taxa de entrega (${deliveryFee}) retida aguardando entrega.`);
              }
            } catch (splitError) {
              console.error(`❌ [Split] Erro crítico ao repassar fundos para o pedido ${orderId}:`, splitError);
              payoutStatus = 'failed';
              updates.payoutError = splitError.message;
            }
          } else {
             // Caso seja um pedido legado sem os campos novos
             payoutStatus = 'pending';
             console.info(`ℹ️ [Split] Pedido legado ${orderId} sem estrutura de split (subtotalProducts/producerId). Repasse manual.`);
          }

          updates.payoutStatus = payoutStatus;
          updates.payoutProcessedAt = admin.firestore.FieldValue.serverTimestamp();

          transaction.update(orderRef, updates);
          break;

        case 'payment_intent.payment_failed':
          if (isOrderPaymentSettled(orderData)) {
            console.log(`ℹ️ [Stripe Webhook] Pedido ${orderId} já pago/operacional (${orderData.status}). Ignorando falha tardia.`);
            break;
          }

          if (isOrderPaymentTerminalFailure(orderData)) {
            console.log(`ℹ️ [Stripe Webhook] Pedido ${orderId} já marcado como falha/cancelado. Ignorando.`);
            break;
          }

          console.error(`❌ [Stripe Webhook] Falha no pagamento do pedido ${orderId}`);
          const lastError = paymentIntent.last_payment_error?.message || 'Erro desconhecido';
          transaction.update(orderRef, {
            status: 'payment_failed',
            paymentStatus: 'failed',
            paymentIntentId: paymentIntent.id,
            paymentError: lastError,
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          break;

        case 'payment_intent.canceled':
          if (isOrderPaymentSettled(orderData)) {
            console.log(`ℹ️ [Stripe Webhook] Pedido ${orderId} já pago/operacional (${orderData.status}). Ignorando cancelamento tardio.`);
            break;
          }

          if (isOrderPaymentTerminalFailure(orderData)) {
            console.log(`ℹ️ [Stripe Webhook] Pedido ${orderId} já marcado como falha/cancelado. Ignorando cancelamento duplicado.`);
            break;
          }

          {
            const canceledMethodType = extractPaymentMethodType(paymentIntent);
            const isPixCancellation = canceledMethodType === 'pix';
            console.warn(`⚠️ [Stripe Webhook] PaymentIntent cancelado para pedido ${orderId} (${isPixCancellation ? 'PIX' : 'pagamento'})`);

            const cancelUpdates = {
              status: 'cancelled',
              paymentStatus: isPixCancellation ? 'expired' : 'failed',
              paymentIntentId: paymentIntent.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (isPixCancellation) {
              cancelUpdates.expiredAt = admin.firestore.FieldValue.serverTimestamp();
            } else {
              cancelUpdates.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
            }

            const cancelReason = paymentIntent.cancellation_reason;
            if (cancelReason) {
              cancelUpdates.paymentError = cancelReason;
            }

            transaction.update(orderRef, cancelUpdates);
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Marca o evento como processado dentro da mesma transação (Atomicidade Total)
      transaction.set(eventRef, {
        type: event.type,
        orderId: orderId,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ received: true });
  } catch (error) {
    console.error(`❌ [Stripe Webhook] Erro no processamento:`, error);
    await db.collection('stripe_webhook_errors').add({
      error: error.message,
      stack: error.stack,
      eventId: event?.id || 'unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Realiza o split de pagamento (Transfer) para produtor e entregador
 * Regra: 90% Produtor | 10% Plataforma | 100% Taxa de Entrega para Entregador
 */
exports.executePaymentSplit = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid); // Apenas o sistema/admin dispara o split final

  const stripe = require('stripe')(getStripeSecret());
  const { orderId, amountTotal, deliveryFee, producerAccountId, courierAccountId } = data;

  if (!orderId || !amountTotal || !producerAccountId) {
    throw new functions.https.HttpsError('invalid-argument', 'Parâmetros de split incompletos.');
  }

  try {
    const netAmount = amountTotal - (deliveryFee || 0);
    const producerAmount = Math.floor(netAmount * 0.90); // 90% para o produtor
    
    const transfers = [];

    // 1. Transfer para o Produtor (90% do valor dos produtos)
    const orderSnapshot = await db
      .collection('orders')
      .doc(orderId)
      .get();

    if (!orderSnapshot.exists) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Pedido inválido para processamento do repasse.'
      );
    }

    const orderData = orderSnapshot.data() || {};
    const paymentIntentId =
      typeof orderData.paymentIntentId === 'string' &&
      orderData.paymentIntentId
        ? orderData.paymentIntentId
        : typeof orderData.stripePaymentIntentId === 'string'
          ? orderData.stripePaymentIntentId
          : null;

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Pagamento indisponível para processamento do repasse.'
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ['latest_charge'] }
    );
    const sourceChargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge &&
            typeof paymentIntent.latest_charge.id === 'string'
          ? paymentIntent.latest_charge.id
          : null;

    if (!sourceChargeId || !sourceChargeId.startsWith('ch_')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cobrança indisponível para processamento do repasse.'
      );
    }

    transfers.push(stripe.transfers.create({
      amount: producerAmount,
      currency: 'brl',
      destination: producerAccountId,
      source_transaction: sourceChargeId,
      transfer_group: orderId,
      metadata: { role: 'producer', orderId }
    }));

    // Courier payout ocorre após a entrega via stripeWebhook/onOrderDelivered.

    const results = await Promise.all(transfers);

    // Registrar no Firestore para auditoria
    await db.collection('payment_splits').doc(orderId).set({
      orderId,
      total: amountTotal,
      producerShare: producerAmount,
      deliveryShare: deliveryFee || 0,
      platformShare: amountTotal - producerAmount - (deliveryFee || 0),
      status: 'completed',
      results: results.map(r => r.id),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, splitId: orderId };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao executar split:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ======================================================
// 🍰 MOTOR DE CRESCIMENTO (GROWTH ENGINE)
// ======================================================

/**
 * Gera código de indicação (ex.: JOAO1A2) a partir do nome do perfil.
 */
function generateReferralCodeFromName(name) {
  const prefix = (name || 'DOCE').substring(0, 4).toUpperCase().replace(/\s/g, '') || 'DOCE';
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${suffix}`;
}

/**
 * Complementa users/{uid} apenas com campos de growth/referral (merge seguro).
 */
async function mergeGrowthReferralFields(uid, nameForCode) {
  const referralCode = generateReferralCodeFromName(nameForCode);
  const update = {
    referralCode,
    referralCount: 0,
    totalReferralValue: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(uid).set(update, { merge: true });

  try {
    await db.collection('usuarios').doc(uid).set(update, { merge: true });
  } catch (e) {
    // Ignora erros na coleção legada
  }

  return referralCode;
}

/**
 * AUTH onCreate — não grava mais users/{uid} (evita race com AuthContext.register).
 * Referral é aplicado em onUserProfileCreateGrowth após o perfil completo existir.
 */
exports.onUserCreateGrowth = functions.auth.user().onCreate(async (user) => {
  console.log(
    `🍰 [Growth] Auth onCreate ${user.uid} — referral deferred to onUserProfileCreateGrowth`
  );
});

/**
 * TRIGGER: Gerar referral após users/{uid} ser criado pelo app (perfil completo).
 * Só complementa growth — não altera role, email, nome nem outros campos do perfil.
 */
exports.onUserProfileCreateGrowth = functions.firestore
  .document('users/{uid}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const data = snap.data() || {};

    if (data.referralCode) {
      console.log(`🍰 [Growth] users/${uid} already has referralCode, skipping`);
      return null;
    }

    const hasAppProfile = !!(data.email || data.role || data.nome || data.name);
    if (!hasAppProfile) {
      console.warn(`🍰 [Growth] users/${uid} onCreate without app profile fields, skipping growth`);
      return null;
    }

    const nameForCode = data.nome || data.name || (data.email && data.email.split('@')[0]) || 'DOCE';
    const referralCode = await mergeGrowthReferralFields(uid, nameForCode);
    console.log(`🍰 [Growth] Referral code ${referralCode} gerado para ${uid} (profile onCreate)`);
    return null;
  });

/**
 * TRIGGER: Growth Loop e Ciclo de Indicação após entrega
 */
exports.onOrderUpdateGrowth = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Apenas disparar quando mudar para 'delivered'
    if (newData.status === 'delivered' && oldData.status !== 'delivered') {
      const userId = newData.userId;
      const orderId = context.params.orderId;
      const totalAmount = newData.totalAmount;

      // 1. Verificar se o usuário foi indicado por alguém
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (userData && userData.referredBy) {
        const referrerId = userData.referredBy;

        // Buscar log de indicação pendente
        const referralSnap = await db.collection('referrals')
          .where('referrerId', '==', referrerId)
          .where('referredId', '==', userId)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!referralSnap.empty) {
          const referralDoc = referralSnap.docs[0];
          
          // Finalizar ciclo de indicação
          await referralDoc.ref.update({
            status: 'completed',
            orderId: orderId,
            valueGenerated: totalAmount,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Premiar quem indicou (Estatísticas + Notificação via log para o app processar ou enviar direto via OneSignal se integrado)
          const referrerRef = db.collection('users').doc(referrerId);
          await referrerRef.update({
            referralCount: admin.firestore.FieldValue.increment(1),
            totalReferralValue: admin.firestore.FieldValue.increment(totalAmount)
          });

          // Sincronizar com a coleção legada se necessário
          try {
            await db.collection('usuarios').doc(referrerId).update({
              referralCount: admin.firestore.FieldValue.increment(1),
              totalReferralValue: admin.firestore.FieldValue.increment(totalAmount)
            });
          } catch (e) {
            // Ignora erro na coleção legada
          }

          console.log(`🍰 [Growth] Ciclo de indicação finalizado para referrer ${referrerId}`);
        }
      }

      // 2. Growth Loop: Enviar convite de indicação via log de automação
      await db.collection('sales_automation_events').add({
        userId,
        eventType: 'GROWTH_LOOP_TRIGGER',
        triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        metadata: { orderId, referralCode: userData?.referralCode }
      });
    }
  });

/**
 * TRIGGER: Repasse ao Entregador (Split do Marketplace)
 * Disparado apenas quando a entrega é concluída com sucesso.
 */
exports.onOrderDelivered = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const orderId = context.params.orderId;

    // Apenas agir se o status mudou para 'delivered'
    const becameDelivered =
      newData.status === 'delivered' && oldData.status !== 'delivered';
    const holdBecameReadyAfterDelivery =
      newData.status === 'delivered' &&
      newData.deliveryFeeHeld === true &&
      oldData.deliveryFeeHeld !== true;
    if (!becameDelivered && !holdBecameReadyAfterDelivery) {
      return null;
    }
    if (becameDelivered || holdBecameReadyAfterDelivery) {
      
      // 1. Validar se há fundos retidos para o entregador
      if (!newData.deliveryFeeHeld || newData.courierPayoutStatus === 'paid') {
        console.log(`ℹ️ [Split Entregador] Pedido ${orderId} entregue, mas sem taxa retida ou já pago. Ignorando repasse.`);
        return;
      }

      const targetCourierId = newData.deliveryDriverId || newData.courierId;
      const deliveryFee = newData.deliveryFee || newData.courierPayoutAmount;

      if (!targetCourierId || !deliveryFee || deliveryFee <= 0) {
        console.log(`ℹ️ [Split Entregador] Pedido ${orderId} sem identificador de entregador ou valor de taxa. Retenção será mantida na plataforma.`);
        return;
      }

      console.log(`✅ [Split Entregador] Pedido ${orderId} entregue! Iniciando repasse de R$${deliveryFee} para o entregador ${targetCourierId}...`);

      try {
        const stripe = require('stripe')(getStripeSecret());
        
        // 2. Buscar a conta conectada do entregador
        const courierDoc = await db.collection('users').doc(targetCourierId).get();
        const courierStripeAccountId = courierDoc.data()?.stripeAccountId;

        if (!courierStripeAccountId || !courierStripeAccountId.startsWith('acct_')) {
          console.warn(`⚠️ [Split Entregador] Entregador ${targetCourierId} não possui stripeAccountId válido. O valor ficará retido.`);
          await change.after.ref.update({
            courierPayoutStatus: 'missing_connected_account',
            courierPayoutError: 'Entregador não concluiu onboarding no Stripe Connect'
          });
          return;
        }

        // 3. Executar Transferência com Idempotência
        const courierPayoutAmountInCents = Math.floor(deliveryFee * 100);
        const idempotencyKey = `courier_delivery_payout_${orderId}`;

        const transfer = await stripe.transfers.create({
          amount: courierPayoutAmountInCents,
          currency: 'brl',
          destination: courierStripeAccountId,
          transfer_group: orderId,
          metadata: { role: 'courier', orderId }
        }, {
          idempotencyKey
        });

        // 4. Confirmar sucesso no Firestore
        await change.after.ref.update({
          courierPayoutStatus: 'paid',
          courierTransferId: transfer.id,
          courierPayoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
          deliveryFeeHeld: false
        });

        console.log(`🚀 [Split Entregador] Sucesso! Transferência ${transfer.id} enviada para ${targetCourierId}.`);

      } catch (error) {
        console.error(`❌ [Split Entregador] Erro crítico ao repassar taxa de entrega para o pedido ${orderId}:`, error);
        await change.after.ref.update({
          courierPayoutStatus: 'failed',
          courierPayoutError: error.message
        });
      }
    }
  });

/**
 * SCHEDULE: Reengajamento (7 dias sem comprar) e Recuperação de Carrinho
 */
exports.scheduledGrowthAutomation = functions.pubsub.schedule('every 4 hours').onRun(async (context) => {
  console.log('🍰 [Growth] Iniciando automações agendadas...');
  
  const sevenDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const tenMinutesAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000));

  // 1. Recuperação de Carrinho (Checkouts parados há mais de 10 min)
  const abandonedSnap = await db.collection('sales_automation_events')
    .where('eventType', '==', 'CHECKOUT_STARTED')
    .where('status', '==', 'pending')
    .where('triggeredAt', '<=', tenMinutesAgo)
    .limit(50)
    .get();

  for (const doc of abandonedSnap.docs) {
    // Aqui enviaríamos notificação via OneSignal REST API ou marcaríamos para o app enviar
    await doc.ref.update({ status: 'processed_server', processedAt: admin.firestore.FieldValue.serverTimestamp() });
  }

  // 2. Reengajamento (Usuários sem pedidos há 7 dias)
  const usersSnap = await db.collection('users')
    .where('role', '==', 'customer')
    .limit(100)
    .get();

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const lastOrderSnap = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let shouldReengage = false;
    if (lastOrderSnap.empty) {
      const createdAt = userDoc.data().dataCriacao;
      if (createdAt && createdAt.toMillis() < sevenDaysAgo.toMillis()) shouldReengage = true;
    } else {
      const lastOrderDate = lastOrderSnap.docs[0].data().createdAt;
      if (lastOrderDate && lastOrderDate.toMillis() < sevenDaysAgo.toMillis()) shouldReengage = true;
    }

    if (shouldReengage) {
      // Verificar anti-spam de 7 dias
      const antiSpamSnap = await db.collection('growth_events')
        .where('userId', '==', userId)
        .where('eventType', '==', 'REENGAGEMENT_7D')
        .where('timestamp', '>=', sevenDaysAgo)
        .limit(1)
        .get();

      if (antiSpamSnap.empty) {
        await db.collection('sales_automation_events').add({
          userId,
          eventType: 'REENGAGEMENT_TRIGGER',
          triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          metadata: { type: '7_DAYS_INACTIVE', coupon: 'VOLTOU20' }
        });

        await db.collection('growth_events').add({
          userId,
          eventType: 'REENGAGEMENT_7D',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  }

  return null;
});

/**
 * Cria uma conta conectada (Stripe Connect) para o produtor ou entregador
 */
exports.createConnectedAccount = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(getStripeSecret());
  const { email, role } = data;
  const uid = context.auth.uid;

  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'UID ausente.');
  if (!role) throw new functions.https.HttpsError('invalid-argument', 'Role é obrigatória.');

  try {
    // PASSO 1: Validar que o documento users/{uid} existe
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      console.warn('[FS_GUARD] createConnectedAccount: Document users/{uid} does not exist', { uid, email, role });
      // Fallback: Criar documento com dados mínimos
      await userRef.set({
        uid,
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeAccountId: null,
        stripeOnboardingComplete: false
      }, { merge: true });
    }
    
    // PASSO 2: Criar conta no Stripe
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { uid, role }
    });

    // PASSO 3: Atualizar documento com accountId (agora com fallback)
    try {
      await userRef.update({
        stripeAccountId: account.id,
        stripeOnboardingComplete: false,
        stripeCreatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      if (updateError.code === 'permission-denied') {
        console.error('[FS_PERMISSION_DENIED] createConnectedAccount.update', {
          uid,
          path: `users/${uid}`,
          operation: 'update',
          error: updateError.message,
          code: updateError.code,
          build: '1291'
        });
        // Fallback: Retornar accountId mesmo que update falhe (o Stripe já criou a conta)
        console.warn('[FALLBACK] createConnectedAccount: Retornando accountId apesar de erro de permissão');
      } else {
        throw updateError;
      }
    }

    return { accountId: account.id };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar conta conectada:', error);
    
    if (error.code === 'permission-denied') {
      console.error('[FS_PERMISSION_DENIED] createConnectedAccount.main', {
        uid,
        path: `users/${uid}`,
        operation: 'createConnectedAccount',
        message: error?.message,
        code: error?.code,
        build: '1291'
      });
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Gera o link de onboarding para o Stripe Connect
 */
exports.createStripeOnboardingLink = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(getStripeSecret());
  const { accountId, refreshUrl, returnUrl } = data;

  if (!accountId) throw new functions.https.HttpsError('invalid-argument', 'AccountId é obrigatório.');

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || 'https://acucaradasencomendas.com.br/stripe-refresh',
      return_url: returnUrl || 'https://acucaradasencomendas.com.br/stripe-success',
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar link de onboarding:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.syncStripeAccountStatus = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(getStripeSecret());
  const uid = context.auth.uid;
  const { accountId } = data;

  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Precisa estar logado.');
  if (!accountId) throw new functions.https.HttpsError('invalid-argument', 'AccountId é obrigatório.');

  try {
    // PASSO 1: Validar que o documento users/{uid} existe
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      console.warn('[FS_GUARD] syncStripeAccountStatus: Document users/{uid} does not exist', { uid, accountId });
      // Fallback: Não sincronizar se documento não existe
      console.log('[FALLBACK] syncStripeAccountStatus: Documento não existe, retornando vazio');
      return { synced: false, reason: 'document_not_found' };
    }
    
    // PASSO 2: Buscar status no Stripe
    const account = await stripe.accounts.retrieve(accountId);
    
    const updates = {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      stripeRequirementsDue: account.requirements?.currently_due || [],
      stripeLastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeOnboardingStatus: account.details_submitted ? (account.payouts_enabled ? 'approved' : 'pending') : 'started'
    };

    // PASSO 3: Atualizar documento com segurança
    try {
      await userRef.update(updates);
    } catch (updateError) {
      if (updateError.code === 'permission-denied') {
        console.error('[FS_PERMISSION_DENIED] syncStripeAccountStatus.update', {
          uid,
          path: `users/${uid}`,
          operation: 'update',
          error: updateError.message,
          code: updateError.code,
          build: '1291'
        });
        // Fallback: Retornar status mesmo que update falhe
        console.warn('[FALLBACK] syncStripeAccountStatus: Retornando updates apesar de erro de permissão');
        return { ...updates, updateFailed: true, reason: 'permission_denied' };
      } else {
        throw updateError;
      }
    }

    return { ...updates, synced: true };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao sincronizar conta:', error);
    
    if (error.code === 'permission-denied') {
      console.error('[FS_PERMISSION_DENIED] syncStripeAccountStatus.main', {
        uid,
        path: `users/${uid}`,
        operation: 'syncStripeAccountStatus',
        message: error?.message,
        code: error?.code,
        build: '1291'
      });
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ======================================================
// 🛡️ GERENCIAMENTO DE ROLES
// ======================================================

exports.setUserRole = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid);

  const { targetUid, newRole } = data;
  const validRoles = ['customer', 'producer', 'courier', 'admin'];

  if (!targetUid || !validRoles.includes(newRole)) {
    throw new functions.https.HttpsError('invalid-argument', 'UID ou role inválido.');
  }

  await db.collection('users').doc(targetUid).update({
    role: newRole,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('security_logs').add({
    uid: targetUid,
    action: 'ROLE_UPDATE',
    newRole: newRole,
    adminUid: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: `Role atualizada para ${newRole}` };
});

// ======================================================
// 🔗 MOTORES DE SEGURANÇA
// ======================================================

exports.rateLimitOrdersAdaptive = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const uid = data.userId;
    if (!uid) return null;

    const config = await getSystemConfig();
    const oneMinuteAgo = new Date(Date.now() - 60000);
    
    const recentOrders = await db.collection('orders')
      .where('userId', '==', uid)
      .where('createdAt', '>', oneMinuteAgo)
      .get();

    if (recentOrders.size > config.orderRateLimit) {
      return updateRiskScore(uid, config.orderSpamWeight, 'DYNAMIC_RATE_LIMIT_EXCEEDED');
    }
    
    return null;
  });

async function updateRiskScore(uid, points, reason) {
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data() || {};
    let currentScore = userData.riskScore || 0;
    let newScore = Math.min(Math.max(currentScore + points, 0), 100);
    let newStatus = newScore > 60 ? 'blocked' : (newScore > 30 ? 'suspicious' : 'active');
    
    transaction.update(userRef, { 
      riskScore: newScore, 
      status: newStatus, 
      lastScoreUpdate: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    await db.collection('security_logs').add({
      uid, reason, points, newScore, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Se mudou de status, gera explicação automática
    if (newStatus !== (userData.status || 'active')) {
      await generateDecisionExplanation(uid);
    }

    return { uid, newScore, newStatus };
  });
}

// ======================================================
// 🍰 AUTOMAÇÃO DE VENDAS (DAEMON)
// ======================================================

/**
 * Helper para enviar notificação via OneSignal REST API
 */
async function sendOneSignalNotification(userId, title, message, data = {}) {
  const https = require('https');
  
  // Obter chaves das configurações do Firebase
  const ONESIGNAL_APP_ID = functions.config().onesignal?.app_id;
  const ONESIGNAL_REST_KEY = functions.config().onesignal?.rest_key;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
    console.warn('⚠️ [Automation] OneSignal keys não configuradas no Firebase Functions');
    return false;
  }

  const payload = JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    include_external_user_ids: [userId],
    headings: { en: title, pt: title },
    contents: { en: message, pt: message },
    data: data
  });

  const options = {
    hostname: 'onesignal.com',
    path: '/api/v1/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', (e) => {
      console.error(`❌ [OneSignal] Erro: ${e.message}`);
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Daemon de Automação de Vendas: Roda a cada 5 minutos
 * Processa carrinhos abandonados, falhas de pagamento e promoções
 */
exports.checkSalesAutomation = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const now = new Date();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  let processed = 0;
  let sent = 0;
  let errors = 0;

  try {
    // 1. Buscar CHECKOUT_STARTED pendentes (Carrinho Abandonado)
    const abandonedSnap = await db.collection('sales_automation_events')
      .where('eventType', '==', 'CHECKOUT_STARTED')
      .where('status', '==', 'pending')
      .where('triggeredAt', '<=', tenMinutesAgo)
      .get();

    for (const doc of abandonedSnap.docs) {
      processed++;
      const event = doc.data();
      
      // Anti-spam: Verificar se já recebeu notificação nas últimas 12h
      const recentSentSnap = await db.collection('sales_automation_events')
        .where('userId', '==', event.userId)
        .where('status', '==', 'sent')
        .where('triggeredAt', '>=', twelveHoursAgo)
        .limit(1)
        .get();

      if (!recentSentSnap.empty) {
        await doc.ref.update({ status: 'skipped', reason: 'anti-spam' });
        continue;
      }

      // Enviar Notificação
      const success = await sendOneSignalNotification(
        event.userId,
        "🍰 Seu pedido está te esperando",
        "Finalize agora antes que acabe seu doce favorito!",
        { type: 'CART_RECOVERY', eventId: doc.id }
      );

      if (success) {
        await doc.ref.update({ status: 'sent', processedAt: admin.firestore.FieldValue.serverTimestamp() });
        sent++;
      } else {
        await doc.ref.update({ status: 'failed' });
        errors++;
      }
    }

    // 2. Buscar PAYMENT_FAILED pendentes (Recuperação de Venda)
    const failedPaymentSnap = await db.collection('sales_automation_events')
      .where('eventType', '==', 'PAYMENT_FAILED')
      .where('status', '==', 'pending')
      .get();

    for (const doc of failedPaymentSnap.docs) {
      processed++;
      const event = doc.data();

      // Enviar Notificação de Recuperação de Pagamento
      const success = await sendOneSignalNotification(
        event.userId,
        "⚠️ Problema no seu pagamento",
        "Houve um erro no seu pagamento. Tente novamente com outro cartão ou PIX.",
        { type: 'PAYMENT_RECOVERY', eventId: doc.id }
      );

      if (success) {
        await doc.ref.update({ status: 'sent', processedAt: admin.firestore.FieldValue.serverTimestamp() });
        sent++;
      } else {
        await doc.ref.update({ status: 'failed' });
        errors++;
      }
    }

    // 3. Registrar execução do Daemon
    await db.collection('sales_automation_runs').add({
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      processed,
      sent,
      errors
    });

    console.info(`✅ [Automation-Daemon] Executado: ${processed} processados, ${sent} enviados.`);
    return { success: true, processed, sent };
  } catch (error) {
    console.error('❌ [Automation-Daemon] Erro crítico:', error);
    return { success: false, error: error.message };
  }
});

// ======================================================
// 🔬 DIAGNÓSTICO TEMPORÁRIO — request.auth proof (read-only)
// ======================================================

/**
 * Callable de diagnóstico: expõe o que o backend Firebase vê em context.auth.
 * Não altera dados. Remover após encerrar a investigação permission-denied.
 */
exports.debugAuthContext = functions.https.onCall(async (data, context) => {
  return {
    authExists: !!context.auth,
    authUid: context.auth?.uid ?? null,
    email: context.auth?.token?.email ?? null,
    projectId: process.env.GCLOUD_PROJECT || 'acucaradas-encomendas',
    timestamp: new Date().toISOString(),
  };
});
