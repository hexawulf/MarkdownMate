import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from 'express';

export function setupAuth(_app: Express) {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

function getTokenFromRequest(req: any): string | undefined {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  const cookies = req.headers['cookie'] as string | undefined;
  if (cookies) {
    for (const cookie of cookies.split(';')) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return decodeURIComponent(value);
      }
    }
  }

  return undefined;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = { claims: decoded };
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
