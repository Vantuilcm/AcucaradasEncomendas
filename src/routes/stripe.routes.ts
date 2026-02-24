import { Router } from 'express';
import { StripeController } from '../controllers/StripeController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const stripeController = new StripeController();

// Rota para criar um PaymentIntent (cartão de crédito)
router.post('/create-payment-intent', authMiddleware, stripeController.createPaymentIntent);

// Rota para confirmar um pagamento
router.post('/confirm-payment', authMiddleware, stripeController.confirmPayment);

// Rota para criar um QR Code PIX
router.post('/create-pix-payment', authMiddleware, stripeController.createPixPayment);

// Rota para verificar status do pagamento PIX
router.get('/check-pix-status/:paymentId', authMiddleware, stripeController.checkPixStatus);

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

export default router;
