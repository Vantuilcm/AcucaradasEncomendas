import { Router } from 'express';
import stripeRoutes from './stripe.routes';

const router = Router();

// ... existing code ...

router.use('/stripe', stripeRoutes);

// ... existing code ...

export default router;
