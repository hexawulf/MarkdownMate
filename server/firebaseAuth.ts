import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, RequestHandler } from 'express';
import logger from './src/logger'; // Import the Winston logger

export function setupAuth(_app: Express) {
  logger.info('[Auth] Initializing Firebase...');
  logger.info(`[Auth] FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
  logger.info(`[Auth] FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET'}`); // Avoid logging sensitive email
  logger.info(`[Auth] FIREBASE_PRIVATE_KEY is set: ${!!process.env.FIREBASE_PRIVATE_KEY}`);
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

/**
 * Extracts a Firebase authentication token from an Express request.
 * It checks both the 'Authorization' header (Bearer token) and cookies for a 'token' field.
 *
 * @param req The Express request object.
 * @returns The token string if found, otherwise undefined.
 */
export function getTokenFromRequest(req: any): string | undefined {
  logger.debug('[Auth] Attempting to get token from request...');
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    logger.debug('[Auth] Token found in Authorization header.');
    return authHeader.slice('Bearer '.length);
  }

  const cookies = req.headers['cookie'] as string | undefined;
  if (cookies) {
    for (const cookie of cookies.split(';')) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        logger.debug('[Auth] Token found in cookies.');
        return decodeURIComponent(value);
      }
    }
  }
  logger.debug('[Auth] No token found in Authorization header or cookies.');
  return undefined;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  logger.info('[Auth] isAuthenticated middleware invoked for path:', { path: req.path, ip: req.ip });
  const token = getTokenFromRequest(req);

  if (!token) {
    logger.warn('[Auth] No token found in request.', { path: req.path, ip: req.ip });
    return res.status(401).json({ message: 'Unauthorized' });
  }
  logger.debug('[Auth] Token found, attempting verification.', { path: req.path });

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = { claims: decoded }; // Consider typing req.user properly
    logger.info(`[Auth] Token verified successfully for user: ${decoded.uid}`, { userId: decoded.uid, path: req.path });
    next();
  } catch (error: any) {
    logger.error(`[Auth] Token verification failed: ${error.message}`, { error, path: req.path, ip: req.ip });
    res.status(401).json({ message: 'Unauthorized' });
  }
};
