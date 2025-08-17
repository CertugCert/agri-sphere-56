import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getOrgModules } from '../tenancy/registry.js';

const loginSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(6) 
});

export async function loginTenant(tenantSequelize, orgSlug, orgId, email, password) {
  const { email: e, password: p } = loginSchema.parse({ email, password });
  
  const [user] = await tenantSequelize.query(
    `SELECT * FROM usuarios WHERE email = :email AND ativo = true LIMIT 1`,
    { 
      replacements: { email: e }, 
      type: tenantSequelize.QueryTypes.SELECT 
    }
  );
  
  if (!user) {
    throw new Error('Credenciais inválidas');
  }
  
  const ok = await bcrypt.compare(p, user.senha_hash);
  if (!ok) {
    throw new Error('Credenciais inválidas');
  }

  // Generate tenant token with different audience
  const accessToken = jwt.sign(
    { 
      sub: user.id, 
      empresa_id: user.empresa_id,
      org_slug: orgSlug,
      aud: 'tenant'
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '15m' }
  );
  
  const refreshId = uuidv4();
  const refreshToken = jwt.sign(
    { 
      rid: refreshId,
      sub: user.id,
      org_slug: orgSlug,
      aud: 'tenant'
    }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  // Store refresh token in tenant database
  await tenantSequelize.query(
    `INSERT INTO refresh_tokens (id, user_id, valid, created_at, updated_at) 
     VALUES (:id, :uid, true, now(), now())`,
    { replacements: { id: refreshId, uid: user.id } }
  );

  return { accessToken, refreshToken };
}

export async function buildTenantMe(tenantSequelize, orgId, userId) {
  // Get user data from tenant database
  const [user] = await tenantSequelize.query(
    `SELECT id, empresa_id, nome, email FROM usuarios WHERE id = :id`,
    { 
      replacements: { id: userId }, 
      type: tenantSequelize.QueryTypes.SELECT 
    }
  );
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get roles from tenant database
  const roles = await tenantSequelize.query(
    `SELECT r.nome FROM roles r 
     JOIN user_roles ur ON ur.role_id = r.id 
     WHERE ur.user_id = :id`,
    { 
      replacements: { id: userId }, 
      type: tenantSequelize.QueryTypes.SELECT 
    }
  );
  
  // Get permissions from tenant database
  const permissions = await tenantSequelize.query(
    `SELECT p.chave FROM permissions p 
     JOIN role_permissions rp ON rp.permission_id = p.id 
     WHERE rp.role_id IN (
       SELECT role_id FROM user_roles WHERE user_id = :id
     )`,
    { 
      replacements: { id: userId }, 
      type: tenantSequelize.QueryTypes.SELECT 
    }
  );
  
  // Get allowed modules from master database
  const allowedModules = await getOrgModules(orgId);
  
  return {
    user,
    roles: roles.map((r) => r.nome),
    permissions: permissions.map((p) => p.chave),
    allowedModules
  };
}