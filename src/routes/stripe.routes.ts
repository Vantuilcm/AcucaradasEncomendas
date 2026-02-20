import { Router } from 'express';
import { StripeController } from '../controllers/StripeController';
import { authMiddleware } from '../utils/robust-auth';

const router = Router();
const stripeController = new StripeController();

// Rota para criar um cliente no Stripe
router.post('/customers', authMiddleware, stripeController.createCustomer);

// Rota para criar uma transferência no Stripe (divisão de pagamento)
router.post('/transfers', authMiddleware, stripeController.createTransfer);

// Rota para criar um PaymentIntent (cartão de crédito)
router.post('/create-payment-intent', authMiddleware, stripeController.createPaymentIntent);

// Rota para buscar um PaymentIntent pelo ID
router.get('/payment-intent/:id', authMiddleware, stripeController.getPaymentIntent);

// Rota para confirmar um pagamento
router.post('/confirm-payment', authMiddleware, stripeController.confirmPayment);

// Rota para criar um QR Code PIX
router.post('/create-pix-payment', authMiddleware, stripeController.createPixPayment);

// Rota para verificar status de qualquer pagamento (PIX ou Cartão)
router.get('/check-payment-status/:paymentId', authMiddleware, stripeController.checkPaymentStatus);

// Rota para listar métodos de pagamento do usuário
router.get('/payment-methods', authMiddleware, stripeController.listPaymentMethods);

// Rota para adicionar um novo método de pagamento
router.post('/payment-methods', authMiddleware, stripeController.addPaymentMethod);

// Rota para remover um método de pagamento
router.delete(
  '/payment-methods/:paymentMethodId',
  authMiddleware,
  stripeController.removePaymentMethod
);

// Rota para reconciliação de pedidos (Admin/Sistema)
router.post('/reconcile-orders', authMiddleware, stripeController.reconcileOrders);

// Rota para Webhook do Stripe (deve ser chamada sem authMiddleware e com raw body)
router.post('/webhook', stripeController.handleWebhook);

export default router;
