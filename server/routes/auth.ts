import { Router } from 'express';

const router = Router();

// Login endpoint
router.get('/login', (req, res) => {
  // For now, return a simple response
  // You can implement proper authentication logic later
  res.json({
    message: 'Login endpoint accessed',
    redirectTo: '/login-form' // or your actual login page
  });
});

export default router;
