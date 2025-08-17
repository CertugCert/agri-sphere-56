import express from 'express';
import { getOrgBySlug } from '../tenancy/registry.js';

const router = express.Router();

router.get('/tenants/:slug/exists', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ 
        error: { code: 'bad_request', message: 'Slug is required' } 
      });
    }
    
    const org = await getOrgBySlug(slug);
    res.json({ exists: !!org });
  } catch (error) {
    console.error('Error checking tenant existence:', error);
    res.status(500).json({ 
      error: { code: 'internal_error', message: 'Failed to check tenant' } 
    });
  }
});

export default router;