import { getOrgBySlug } from '../tenancy/registry.js';
import { getSequelizeForTenant } from '../tenancy/tenant-pool.js';

export async function attachTenant(req, res, next) {
  const slug = req.params.slug;
  
  if (!slug) {
    return res.status(400).json({ 
      error: { code: 'bad_request', message: 'Tenant slug is required' } 
    });
  }
  
  try {
    // Get organization info
    const org = await getOrgBySlug(slug);
    if (!org) {
      return res.status(404).json({ 
        error: { code: 'not_found', message: 'Organization not found' } 
      });
    }
    
    // Get tenant database connection
    const tenantSequelize = await getSequelizeForTenant(slug);
    
    // Attach to request
    req.tenant = {
      slug,
      orgId: org.id,
      org
    };
    req.tenantSequelize = tenantSequelize;
    
    next();
  } catch (error) {
    console.error('Error attaching tenant:', error);
    return res.status(500).json({ 
      error: { code: 'internal_error', message: 'Failed to connect to tenant' } 
    });
  }
}