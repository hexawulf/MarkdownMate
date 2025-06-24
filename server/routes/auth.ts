import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import logger from '../src/logger'; // Import the Winston logger

const router = Router();

// Register endpoint
router.post('/register', async (req, res) => {
  logger.info('[Auth] Register endpoint accessed', { path: req.path, method: req.method, ip: req.ip });
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email and password are required' 
    });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

    logger.info(`[Auth] User created successfully: ${userRecord.uid}`, { userId: userRecord.uid });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });

  } catch (error: any) {
    logger.error(`[Auth] Registration error: ${error.message}`, { error, path: req.path, method: req.method, ip: req.ip });
    
    // Handle common Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ message: 'Password should be at least 6 characters' });
    }

    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  logger.info('[Auth] Login endpoint accessed', { path: req.path, method: req.method, ip: req.ip });
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ 
      message: 'ID token is required' 
    });
  }

  try {
    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    logger.info(`[Auth] Token verified for user: ${decodedToken.uid}`, { userId: decodedToken.uid });
    
    // Set cookie or return token
    res.cookie('token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.json({
      message: 'Login successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name
      }
    });

  } catch (error: any) {
    logger.error(`[Auth] Login error: ${error.message}`, { error, path: req.path, method: req.method, ip: req.ip });
    res.status(401).json({ 
      message: 'Invalid token',
      error: error.message // Keep original error message for client if needed, but logged with full details
    });
  }
});

// Get login page (for testing)
router.get('/login', (req, res) => {
  res.json({
    message: 'Login endpoint - use POST to authenticate',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login'
    }
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  logger.info('[Auth] Logout endpoint accessed', { path: req.path, method: req.method, ip: req.ip });
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Profile endpoint (protected)
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    res.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name
      }
    });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Add this route to the END of your server/routes/auth.ts file:

// Debug endpoint to list all routes
router.get('/debug', (req, res) => {
  res.json({
    message: 'Auth routes debug',
    availableRoutes: [
      'GET /api/auth/debug',
      'GET /api/auth/login',
      'POST /api/auth/login',
      'POST /api/auth/register', 
      'POST /api/auth/logout',
      'GET /api/auth/profile'
    ],
    timestamp: new Date().toISOString(),
    server: 'MarkdownMate Auth Service'
  });
});


export default router;
