import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sequelize } from '../db.js';

const loginSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(6) 
});

export async function loginMaster(email, password) {
  const { email: e, password: p } = loginSchema.parse({ email, password });
  
  const [user] = await sequelize.query(
    `SELECT * FROM master_users WHERE email = :email AND ativo = true LIMIT 1`,
    { 
      replacements: { email: e }, 
      type: sequelize.QueryTypes.SELECT 
    }
  );
  
  if (!user) {
    throw new Error('Credenciais inválidas');
  }
  
  const ok = await bcrypt.compare(p, user.senha_hash);
  if (!ok) {
    throw new Error('Credenciais inválidas');
  }

  // Generate master token with different audience
  const accessToken = jwt.sign(
    { 
      sub: user.id, 
      role: user.role,
      aud: 'master'
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { 
      sub: user.id, 
      role: user.role,
      aud: 'master'
    }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}