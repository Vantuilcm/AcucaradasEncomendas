import { admin } from '../config/firebaseAdmin';

export const authMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      id: decodedToken.uid,
      ...decodedToken,
    };
    return next();
  } catch (error) {
    console.error('Erro na validação do token Firebase:', error);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
