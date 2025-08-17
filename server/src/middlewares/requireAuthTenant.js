import jwt from 'jsonwebtoken';

export function requireAuthTenant(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ 
      error: { code: 'unauthorized', message: 'Tenant token required' } 
    });
  }
  
  try {
    const token = auth.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check audience for tenant
    if (payload.aud !== 'tenant') {
      return res.status(401).json({ 
        error: { code: 'unauthorized', message: 'Invalid token audience' } 
      });
    }
    
    // Check if token is for this tenant
    if (payload.org_slug !== req.tenant?.slug) {
      return res.status(401).json({ 
        error: { code: 'unauthorized', message: 'Token not valid for this tenant' } 
      });
    }
    
    req.user = { 
      id: payload.sub,
      empresa_id: payload.empresa_id,
      orgSlug: payload.org_slug
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: { code: 'unauthorized', message: 'Invalid tenant token' } 
    });
  }
}