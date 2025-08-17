import express from 'express';
import { provisionTenant } from '../tenancy/provision.js';
import { getAllOrgs, getOrgBySlug, setOrgModules } from '../tenancy/registry.js';

const router = express.Router();

router.post('/tenants', async (req, res) => {
  try {
    const { name, slug, initialFarmName, adminEmail, adminPassword, modules = [] } = req.body;
    
    const result = await provisionTenant({
      name,
      slug,
      initialFarmName,
      adminEmail,
      adminPassword,
      modules
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      error: { code: 'provision_failed', message: error.message } 
    });
  }
});

router.get('/tenants', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const orgs = await getAllOrgs(limit, offset);
    res.json({ orgs, limit, offset });
  } catch (error) {
    res.status(500).json({ 
      error: { code: 'internal_error', message: error.message } 
    });
  }
});

router.put('/tenants/:slug/modules', async (req, res) => {
  try {
    const { slug } = req.params;
    const { modules = [] } = req.body;
    
    const org = await getOrgBySlug(slug);
    if (!org) {
      return res.status(404).json({ 
        error: { code: 'not_found', message: 'Organization not found' } 
      });
    }
    
    await setOrgModules(org.id, modules);
    res.json({ success: true, modules });
  } catch (error) {
    res.status(500).json({ 
      error: { code: 'internal_error', message: error.message } 
    });
  }
});

export default router;