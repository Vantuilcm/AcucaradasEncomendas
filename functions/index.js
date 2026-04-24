/**
 * 🛡️ RellBuild Explainable Guard: Sistema de Explicabilidade e Transparência
 * Traduz logs técnicos em justificativas legíveis para humanos.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

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
 * Cria um PaymentIntent com suporte a transfer_group para split futuro
 */
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(functions.config().stripe.secret);
  const { amount, currency = 'brl', orderId, customerId } = data;

  if (!amount || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount e OrderId são obrigatórios.');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      transfer_group: orderId, // Vincula o pagamento ao pedido para o split (Fase 2)
      metadata: { orderId, userId: context.auth.uid }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar PaymentIntent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Realiza o split de pagamento (Transfer) para produtor e entregador
 * Regra: 90% Produtor | 10% Plataforma | 100% Taxa de Entrega para Entregador
 */
exports.executePaymentSplit = functions.https.onCall(async (data, context) => {
  await validateAdmin(context.auth.uid); // Apenas o sistema/admin dispara o split final

  const stripe = require('stripe')(functions.config().stripe.secret);
  const { orderId, amountTotal, deliveryFee, producerAccountId, courierAccountId } = data;

  if (!orderId || !amountTotal || !producerAccountId) {
    throw new functions.https.HttpsError('invalid-argument', 'Parâmetros de split incompletos.');
  }

  try {
    const netAmount = amountTotal - (deliveryFee || 0);
    const producerAmount = Math.floor(netAmount * 0.90); // 90% para o produtor
    
    const transfers = [];

    // 1. Transfer para o Produtor (90% do valor dos produtos)
    transfers.push(stripe.transfers.create({
      amount: producerAmount,
      currency: 'brl',
      destination: producerAccountId,
      transfer_group: orderId,
      metadata: { role: 'producer', orderId }
    }));

    // 2. Transfer para o Entregador (100% da taxa de entrega)
    if (courierAccountId && deliveryFee > 0) {
      transfers.push(stripe.transfers.create({
        amount: deliveryFee,
        currency: 'brl',
        destination: courierAccountId,
        transfer_group: orderId,
        metadata: { role: 'courier', orderId }
      }));
    }

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

    return { success: true, transfers: results.map(r => r.id) };
  } catch (error) {
    console.error('❌ [Stripe] Erro no Split de Pagamento:', error);
    throw new functions.https.HttpsError('internal', `Erro no split: ${error.message}`);
  }
});

/**
 * Cria uma conta conectada (Stripe Connect) para o produtor ou entregador
 */
exports.createConnectedAccount = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(functions.config().stripe.secret);
  const { email, role } = data;
  const uid = context.auth.uid;

  if (!role) throw new functions.https.HttpsError('invalid-argument', 'Role é obrigatória.');

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { uid, role }
    });

    // Persistir o accountId no usuário
    await db.collection('users').doc(uid).update({
      stripeAccountId: account.id,
      stripeOnboardingComplete: false
    });

    return { accountId: account.id };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar conta conectada:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Gera o link de onboarding para o Stripe Connect
 */
exports.createStripeOnboardingLink = functions.https.onCall(async (data, context) => {
  const stripe = require('stripe')(functions.config().stripe.secret);
  const { accountId, refreshUrl, returnUrl } = data;

  if (!accountId) throw new functions.https.HttpsError('invalid-argument', 'AccountId é obrigatório.');

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || 'https://acucaradas.com/reauth',
      return_url: returnUrl || 'https://acucaradas.com/success',
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error('❌ [Stripe] Erro ao criar link de onboarding:', error);
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
