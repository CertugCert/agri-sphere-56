import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { buildMe } from '../services/authService.js';

const router = Router();

import { requireAuth } from '../middlewares/access.js';

router.use(requireAuth);

router.get('/me', async (req, res) => {
  try {
    const me = await buildMe(req.user.id);
    res.json(me);
  } catch (err) {
    res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno' } });
  }
});

export default router;
