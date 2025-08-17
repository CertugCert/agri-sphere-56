import jwt from 'jsonwebtoken';
import { sequelize } from '../db.js';

export async function enrichUser(userId) {
  const [roles] = await Promise.all([
    sequelize.query(
      `SELECT r.id, r.nome FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=:id`,
      { replacements: { id: userId }, type: sequelize.QueryTypes.SELECT }
    ),
  ]);
  const roleIds = roles.map((r) => r.id);
  const permissions = await sequelize.query(
    `SELECT DISTINCT p.chave FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id IN (:rids)`,
    { replacements: { rids: roleIds.length ? roleIds : ['00000000-0000-0000-0000-000000000000'] }, type: sequelize.QueryTypes.SELECT }
  );
  return { roleIds, permissionKeys: permissions.map((p) => p.chave) };
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: { code: 'unauthorized', message: 'Sem token' } });
  try {
    const token = auth.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    (req).user = { id: payload.sub, empresa_id: payload.empresa_id };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Token inválido' } });
  }
}

export function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!(req).user?.id) return res.status(401).json({ error: { code: 'unauthorized', message: 'Sem token' } });
      if (!(req).user.permissionKeys) {
        const info = await enrichUser((req).user.id);
        (req).user.roleIds = info.roleIds;
        (req).user.permissionKeys = info.permissionKeys;
      }
      if (!(req).user.permissionKeys.includes(permissionKey)) {
        return res.status(403).json({ error: { code: 'forbidden', message: 'Permissão negada' } });
      }
      next();
    } catch (e) {
      return res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno' } });
    }
  };
}

export function requireModule(moduleKey) {
  return async (req, res, next) => {
    try {
      const uid = (req).user?.id;
      const empresaId = (req).user?.empresa_id;
      if (!uid || !empresaId) return res.status(401).json({ error: { code: 'unauthorized', message: 'Sem token' } });

      // company enabled?
      const [mod] = await sequelize.query(
        `SELECT m.id FROM modules m WHERE m.key = :key LIMIT 1`,
        { replacements: { key: moduleKey }, type: sequelize.QueryTypes.SELECT }
      );
      if (!mod) return res.status(404).json({ error: { code: 'not_found', message: 'Módulo inexistente' } });

      const [enabled] = await sequelize.query(
        `SELECT enabled FROM company_modules WHERE company_id=:cid AND module_id=:mid`,
        { replacements: { cid: empresaId, mid: mod.id }, type: sequelize.QueryTypes.SELECT }
      );
      if (!enabled || enabled.enabled !== true) return res.status(403).json({ error: { code: 'module_disabled', message: 'Módulo não habilitado para a empresa' } });

      // allowed by role or user?
      const roles = (req).user.roleIds || (await enrichUser(uid)).roleIds;
      (req).user.roleIds = roles;
      const [roleAllowed] = await sequelize.query(
        `SELECT 1 FROM role_modules WHERE role_id IN (:rids) AND module_id=:mid AND allowed=true LIMIT 1`,
        { replacements: { rids: roles.length ? roles : ['00000000-0000-0000-0000-000000000000'], mid: mod.id }, type: sequelize.QueryTypes.SELECT }
      );
      const [userAllowed] = await sequelize.query(
        `SELECT 1 FROM user_modules WHERE user_id=:uid AND module_id=:mid AND allowed=true LIMIT 1`,
        { replacements: { uid, mid: mod.id }, type: sequelize.QueryTypes.SELECT }
      );
      if (!roleAllowed && !userAllowed) return res.status(403).json({ error: { code: 'module_forbidden', message: 'Acesso ao módulo negado' } });

      next();
    } catch (e) {
      return res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno' } });
    }
  };
}
