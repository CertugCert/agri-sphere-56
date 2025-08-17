import jwt from 'jsonwebtoken';

export function requireMaster(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ 
      error: { code: 'unauthorized', message: 'Master token required' } 
    });
  }
  
  try {
    const token = auth.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check audience for master
    if (payload.aud !== 'master') {
      return res.status(401).json({ 
        error: { code: 'unauthorized', message: 'Invalid token audience' } 
      });
    }
    
    req.masterUser = { 
      id: payload.sub,
      role: payload.role 
    };
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: { code: 'unauthorized', message: 'Invalid master token' } 
    });
  }
}