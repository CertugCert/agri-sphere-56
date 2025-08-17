import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { sequelize } from '../db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function login(email, password) {
  const { email: e, password: p } = loginSchema.parse({ email, password });
  const [user] = await sequelize.query(
    `SELECT * FROM usuarios WHERE email = :email AND ativo = true LIMIT 1`,
    { replacements: { email: e }, type: sequelize.QueryTypes.SELECT }
  );
  if (!user) throw new Error('Credenciais inválidas');
  const ok = await bcrypt.compare(p, user.senha_hash);
  if (!ok) throw new Error('Credenciais inválidas');

  const accessToken = jwt.sign({ sub: user.id, empresa_id: user.empresa_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshId = uuidv4();
  const refreshToken = jwt.sign({ rid: refreshId, sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  await sequelize.query(
    `INSERT INTO refresh_tokens (id, user_id, valid, created_at, updated_at) VALUES (:id, :uid, true, now(), now())`,
    { replacements: { id: refreshId, uid: user.id } }
  );

  return { accessToken, refreshToken };
}

export async function rotateRefresh(oldToken) {
  try {
    const payload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET);
    const rid = payload.rid;
    const [rt] = await sequelize.query(`SELECT * FROM refresh_tokens WHERE id = :id AND valid = true`, { replacements: { id: rid }, type: sequelize.QueryTypes.SELECT });
    if (!rt) throw new Error('invalid refresh');
    await sequelize.query(`UPDATE refresh_tokens SET valid=false, updated_at=now() WHERE id=:id`, { replacements: { id: rid } });

    const [user] = await sequelize.query(`SELECT id, empresa_id FROM usuarios WHERE id = :id`, { replacements: { id: rt.user_id }, type: sequelize.QueryTypes.SELECT });

    const accessToken = jwt.sign({ sub: user.id, empresa_id: user.empresa_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const newRid = uuidv4();
    const refreshToken = jwt.sign({ rid: newRid, sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await sequelize.query(`INSERT INTO refresh_tokens (id, user_id, valid, created_at, updated_at) VALUES (:id, :uid, true, now(), now())`, { replacements: { id: newRid, uid: user.id } });
    return { accessToken, refreshToken };
  } catch {
    throw new Error('invalid refresh');
  }
}

export async function buildMe(userId) {
  const [user] = await sequelize.query(`SELECT id, empresa_id, nome, email FROM usuarios WHERE id=:id`, { replacements: { id: userId }, type: sequelize.QueryTypes.SELECT });
  const roles = await sequelize.query(
    `SELECT r.nome FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=:id`,
    { replacements: { id: userId }, type: sequelize.QueryTypes.SELECT }
  );
  const permissions = await sequelize.query(
    `SELECT p.chave FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id IN (SELECT role_id FROM user_roles WHERE user_id=:id)`,
    { replacements: { id: userId }, type: sequelize.QueryTypes.SELECT }
  );
  const allowedModules = await sequelize.query(
    `SELECT m.key FROM modules m
     WHERE m.id IN (
        SELECT cm.module_id FROM company_modules cm WHERE cm.company_id = :cid AND cm.enabled = true
     ) AND (
        EXISTS(SELECT 1 FROM role_modules rm WHERE rm.module_id=m.id AND rm.allowed=true AND rm.role_id IN (SELECT role_id FROM user_roles WHERE user_id=:uid))
        OR EXISTS(SELECT 1 FROM user_modules um WHERE um.module_id=m.id AND um.allowed=true AND um.user_id=:uid)
     )`,
    { replacements: { cid: user.empresa_id, uid: userId }, type: sequelize.QueryTypes.SELECT }
  );
  return {
    user,
    roles: roles.map((r) => r.nome),
    permissions: permissions.map((p) => p.chave),
    allowedModules: allowedModules.map((m) => m.key)
  };
}
