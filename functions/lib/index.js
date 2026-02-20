"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
admin.initializeApp();
const getStripe = () => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error('STRIPE_SECRET_KEY não está definida nas variáveis de ambiente das Functions.');
        return null;
    }
    return new stripe_1.default(stripeSecretKey, {
        apiVersion: '2022-11-15',
    });
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
const authMiddleware = async (req, res, next) => {
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
    }
    catch (error) {
        console.error('Erro ao verificar token do Firebase:', error);
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};
app.post('/create-payment-intent', authMiddleware, async (req, res) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
        }
        const { amount, currency = 'brl', metadata = {} } = req.body;
        const userId = req.user.id;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata: { ...metadata, userId },
        });
        res.json({
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
        });
    }
    catch (error) {
        console.error('Erro ao criar PaymentIntent:', error);
        res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});
app.post('/api/stripe/onboarding-link', async (req, res) => {
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
        let accountId = null;
        if (userType === 'producer') {
            const snapshot = await db.collection('producers').where('userId', '==', userId).limit(1).get();
            let producerRef;
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                accountId = data?.stripeAccountId || null;
                producerRef = doc.ref;
            }
            else {
                const newRef = db.collection('producers').doc();
                producerRef = newRef;
                await newRef.set({
                    userId,
                    email,
                    name: email,
                    isActive: false,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
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
        }
        else if (userType === 'driver') {
            const snapshot = await db.collection('delivery_persons').where('userId', '==', userId).limit(1).get();
            let driverRef;
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                accountId = data?.stripeAccountId || null;
                driverRef = doc.ref;
            }
            else {
                const newRef = db.collection('delivery_persons').doc();
                driverRef = newRef;
                await newRef.set({
                    userId,
                    email,
                    isActive: false,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
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
        }
        else {
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
    }
    catch (error) {
        console.error('Erro ao gerar link de onboarding do Stripe:', error);
        return res.status(500).json({ error: 'Erro ao gerar link de onboarding' });
    }
});
app.get('/api/stripe/account-status/:accountId', async (req, res) => {
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
        const detailsSubmitted = account.details_submitted;
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;
        let status = 'pending';
        if (detailsSubmitted && chargesEnabled && payoutsEnabled) {
            status = 'active';
        }
        return res.json({ status });
    }
    catch (error) {
        console.error('Erro ao consultar status de conta Stripe:', error);
        return res.status(500).json({ error: 'Erro ao consultar status da conta Stripe' });
    }
});
app.post('/api/stripe/transfers', async (req, res) => {
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
    }
    catch (error) {
        console.error('Erro ao criar transferência Stripe:', error);
        return res.status(500).json({ error: 'Erro ao criar transferência Stripe' });
    }
});
app.post('/api/stripe/payout', async (req, res) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
        }
        const { stripeAccountId, amount, currency = 'brl' } = req.body || {};
        if (!stripeAccountId || !amount) {
            return res.status(400).json({ error: 'stripeAccountId e amount são obrigatórios' });
        }
        const payout = await stripe.payouts.create({
            amount: Number(amount),
            currency: String(currency).toLowerCase(),
        }, {
            stripeAccount: stripeAccountId,
        });
        return res.json(payout);
    }
    catch (error) {
        console.error('Erro ao processar saque Stripe:', error);
        return res.status(500).json({ error: 'Erro ao processar saque Stripe' });
    }
});
app.post('/create-pix-payment', authMiddleware, async (req, res) => {
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
    }
    catch (error) {
        console.error('Erro ao criar pagamento PIX:', error);
        res.status(500).json({ error: 'Erro ao gerar QR Code PIX' });
    }
});
app.get('/check-payment-status/:paymentId', authMiddleware, async (req, res) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.status(500).json({ error: 'Configuração de recebimentos ausente no servidor. Tente novamente mais tarde.' });
        }
        const { paymentId } = req.params;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
        res.json({ status: paymentIntent.status });
    }
    catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});
app.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
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
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error('Erro no Webhook signature:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Pagamento bem sucedido:', paymentIntent.id);
            break;
        case 'payment_intent.payment_failed':
            console.log('Pagamento falhou');
            break;
    }
    res.json({ received: true });
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map