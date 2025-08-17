import express from 'express';
import { loginTenant, buildTenantMe } from '../services/tenantAuthService.js';
import { requireAuthTenant } from '../middlewares/requireAuthTenant.js';

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { tenantSequelize, tenant } = req;
    
    const tokens = await loginTenant(
      tenantSequelize, 
      tenant.slug, 
      tenant.orgId, 
      email, 
      password
    );
    
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ 
      error: { code: 'unauthorized', message: error.message } 
    });
  }
});

router.get('/me', requireAuthTenant, async (req, res) => {
  try {
    const { tenantSequelize, tenant, user } = req;
    
    const me = await buildTenantMe(
      tenantSequelize, 
      tenant.orgId, 
      user.id
    );
    
    res.json(me);
  } catch (error) {
    res.status(500).json({ 
      error: { code: 'internal_error', message: error.message } 
    });
  }
});

export default router;