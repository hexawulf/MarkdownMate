import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from 'express';

export function setupAuth(_app: Express) {
  console.log('[Auth] Initializing Firebase...');
  console.log(`[Auth] FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`[Auth] FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  console.log(`[Auth] FIREBASE_PRIVATE_KEY is set: ${!!process.env.FIREBASE_PRIVATE_KEY}`);
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
  console.log('[Auth] Attempting to get token from request...');
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Token found in Authorization header.');
    return authHeader.slice('Bearer '.length);
  }

  const cookies = req.headers['cookie'] as string | undefined;
  if (cookies) {
    for (const cookie of cookies.split(';')) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        console.log('[Auth] Token found in cookies.');
        return decodeURIComponent(value);
      }
    }
  }
  console.log('[Auth] No token found in Authorization header or cookies.');
  return undefined;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log('[Auth] isAuthenticated middleware invoked for path:', req.path);
  const token = getTokenFromRequest(req);

  if (!token) {
    console.log('[Auth] No token found in request.');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  console.log('[Auth] Token found, attempting verification.');

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = { claims: decoded };
    console.log('[Auth] Token verified successfully for user:', decoded.uid);
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
