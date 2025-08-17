import { Router } from 'express';
import { login, rotateRefresh } from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password, senha } = req.body;
    const pwd = password || senha;
    const tokens = await login(email, pwd);
    res.json(tokens);
  } catch (e) {
    return res.status(401).json({ error: { code: 'invalid_credentials', message: e.message } });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, refresh_token, token } = req.body;
    const refToken = refreshToken || refresh_token || token;
    const tokens = await rotateRefresh(refToken);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: { code: 'invalid_refresh', message: 'Refresh inválido' } });
  }
});

router.post('/logout', async (_req, res) => {
  res.json({ ok: true });
});

export default router;
