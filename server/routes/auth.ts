import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';

const router = Router();

// Register endpoint
router.post('/register', async (req, res) => {
  console.log('[Auth] Register endpoint accessed');
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

    console.log('[Auth] User created successfully:', userRecord.uid);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });

  } catch (error: any) {
    console.error('[Auth] Registration error:', error.message);
    
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
  console.log('[Auth] Login endpoint accessed');
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ 
      message: 'ID token is required' 
    });
  }

  try {
    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    console.log('[Auth] Token verified for user:', decodedToken.uid);
    
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
    console.error('[Auth] Login error:', error.message);
    res.status(401).json({ 
      message: 'Invalid token',
      error: error.message 
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
  console.log('[Auth] Logout endpoint accessed');
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
