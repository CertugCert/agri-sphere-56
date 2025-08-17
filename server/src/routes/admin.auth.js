import express from 'express';
import { loginMaster } from '../services/masterAuthService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tokens = await loginMaster(email, password);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ 
      error: { code: 'unauthorized', message: error.message } 
    });
  }
});

export default router;