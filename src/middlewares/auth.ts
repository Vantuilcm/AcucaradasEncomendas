import jwt from 'jsonwebtoken';

export const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_for_development';
    const payload = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: payload?.uid ?? payload?.id,
      ...payload,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
