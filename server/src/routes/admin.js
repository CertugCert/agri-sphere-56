import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sequelize } from '../db.js';
import { requireAuth, requirePermission } from '../middlewares/access.js';

const router = Router();
router.use(requireAuth);

// ---- Usuarios CRUD ----
router.get('/usuarios', requirePermission('admin.usuarios:manage'), async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const items = await sequelize.query(`SELECT id, empresa_id, nome, email, ativo, ultimo_login_at FROM usuarios WHERE empresa_id=:cid ORDER BY nome`, { replacements: { cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/usuarios', requirePermission('admin.usuarios:manage'), async (req, res) => {
  const schema = z.object({ nome: z.string().min(1), email: z.string().email(), senha: z.string().min(8), role_id: z.string().uuid().optional() });
  const body = schema.parse(req.body);
  const empresaId = (req).user.empresa_id;
  const hash = await bcrypt.hash(body.senha, 10);
  const [row] = await sequelize.query(`INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, ativo) VALUES (gen_random_uuid(), :cid, :nome, :email, :hash, true) RETURNING id, nome, email`, { replacements: { cid: empresaId, nome: body.nome, email: body.email, hash }, type: sequelize.QueryTypes.INSERT });
  if (body.role_id) await sequelize.query(`INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)`, { replacements: { uid: row[0].id, rid: body.role_id } });
  res.status(201).json({ user: row[0] });
});

router.put('/usuarios/:id', requirePermission('admin.usuarios:manage'), async (req, res) => {
  const schema = z.object({ nome: z.string().min(1).optional(), ativo: z.boolean().optional() });
  const body = schema.parse(req.body);
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const [u] = await sequelize.query(`UPDATE usuarios SET nome=COALESCE(:nome, nome), ativo=COALESCE(:ativo, ativo), updated_at=now() WHERE id=:id AND empresa_id=:cid RETURNING id, nome, email, ativo`, { replacements: { id, cid: empresaId, nome: body.nome ?? null, ativo: body.ativo ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!u.length) return res.status(404).json({ error: { code: 'not_found', message: 'Usuário não encontrado' } });
  res.json({ user: u[0] });
});

router.delete('/usuarios/:id', requirePermission('admin.usuarios:manage'), async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  await sequelize.query(`DELETE FROM usuarios WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId } });
  res.json({ ok: true });
});

// ---- Roles CRUD ----
router.get('/roles', requirePermission('admin.roles:manage'), async (_req, res) => {
  const items = await sequelize.query(`SELECT id, nome, escopo FROM roles ORDER BY nome`, { type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/roles', requirePermission('admin.roles:manage'), async (req, res) => {
  const schema = z.object({ nome: z.string().min(1), escopo: z.string().min(1) });
  const body = schema.parse(req.body);
  const [row] = await sequelize.query(`INSERT INTO roles (id, nome, escopo) VALUES (gen_random_uuid(), :n, :e) RETURNING id, nome, escopo`, { replacements: { n: body.nome, e: body.escopo }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ role: row[0] });
});

router.put('/roles/:id', requirePermission('admin.roles:manage'), async (req, res) => {
  const schema = z.object({ nome: z.string().min(1).optional(), escopo: z.string().min(1).optional() });
  const body = schema.parse(req.body);
  const id = req.params.id;
  const [r] = await sequelize.query(`UPDATE roles SET nome=COALESCE(:n, nome), escopo=COALESCE(:e, escopo) WHERE id=:id RETURNING id, nome, escopo`, { replacements: { id, n: body.nome ?? null, e: body.escopo ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!r.length) return res.status(404).json({ error: { code: 'not_found', message: 'Role não encontrada' } });
  res.json({ role: r[0] });
});

router.delete('/roles/:id', requirePermission('admin.roles:manage'), async (req, res) => {
  const id = req.params.id;
  await sequelize.query(`DELETE FROM roles WHERE id=:id`, { replacements: { id } });
  res.json({ ok: true });
});

// ---- Permissions CRUD ----
router.get('/permissions', requirePermission('admin.config:manage'), async (_req, res) => {
  const items = await sequelize.query(`SELECT id, chave FROM permissions ORDER BY chave`, { type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/permissions', requirePermission('admin.config:manage'), async (req, res) => {
  const schema = z.object({ chave: z.string().min(3) });
  const { chave } = schema.parse(req.body);
  const [p] = await sequelize.query(`INSERT INTO permissions (id, chave) VALUES (gen_random_uuid(), :ch) RETURNING id, chave`, { replacements: { ch: chave }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ permission: p[0] });
});

router.put('/permissions/:id', requirePermission('admin.config:manage'), async (req, res) => {
  const schema = z.object({ chave: z.string().min(3) });
  const { chave } = schema.parse(req.body);
  const id = req.params.id;
  const [p] = await sequelize.query(`UPDATE permissions SET chave=:ch WHERE id=:id RETURNING id, chave`, { replacements: { id, ch: chave }, type: sequelize.QueryTypes.UPDATE });
  if (!p.length) return res.status(404).json({ error: { code: 'not_found', message: 'Permissão não encontrada' } });
  res.json({ permission: p[0] });
});

router.delete('/permissions/:id', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  await sequelize.query(`DELETE FROM permissions WHERE id=:id`, { replacements: { id } });
  res.json({ ok: true });
});

// ---- Modules CRUD ----
router.get('/modules', requirePermission('admin.config:manage'), async (_req, res) => {
  const items = await sequelize.query(`SELECT id, key, name, description FROM modules ORDER BY name`, { type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const schema = z.object({ key: z.string().min(2), name: z.string().min(1), description: z.string().optional() });
  const { key, name, description } = schema.parse(req.body);
  const [m] = await sequelize.query(`INSERT INTO modules (id, key, name, description) VALUES (gen_random_uuid(), :k, :n, :d) RETURNING id, key, name, description`, { replacements: { k: key, n: name, d: description ?? null }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ module: m[0] });
});

router.put('/modules/:id', requirePermission('admin.config:manage'), async (req, res) => {
  const schema = z.object({ key: z.string().min(2).optional(), name: z.string().min(1).optional(), description: z.string().optional() });
  const { key, name, description } = schema.parse(req.body);
  const id = req.params.id;
  const [m] = await sequelize.query(`UPDATE modules SET key=COALESCE(:k, key), name=COALESCE(:n, name), description=COALESCE(:d, description) WHERE id=:id RETURNING id, key, name, description`, { replacements: { id, k: key ?? null, n: name ?? null, d: description ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!m.length) return res.status(404).json({ error: { code: 'not_found', message: 'Módulo não encontrado' } });
  res.json({ module: m[0] });
});

router.delete('/modules/:id', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  await sequelize.query(`DELETE FROM modules WHERE id=:id`, { replacements: { id } });
  res.json({ ok: true });
});

// ---- Company/Role/User module toggles ----
router.get('/empresas/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const mods = await sequelize.query(`SELECT m.key, COALESCE(cm.enabled, false) AS enabled FROM modules m LEFT JOIN company_modules cm ON cm.module_id=m.id AND cm.company_id=:id ORDER BY m.name`, { replacements: { id }, type: sequelize.QueryTypes.SELECT });
  res.json({ modules: mods });
});

router.put('/empresas/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const schema = z.object({ modules: z.array(z.object({ key: z.string(), enabled: z.boolean() })) });
  const { modules } = schema.parse(req.body);
  for (const m of modules) {
    const [row] = await sequelize.query(`SELECT id FROM modules WHERE key=:k`, { replacements: { k: m.key }, type: sequelize.QueryTypes.SELECT });
    if (!row) continue;
    await sequelize.query(`DELETE FROM company_modules WHERE company_id=:cid AND module_id=:mid`, { replacements: { cid: id, mid: row.id } });
    await sequelize.query(`INSERT INTO company_modules (company_id, module_id, enabled) VALUES (:cid, :mid, :en)`, { replacements: { cid: id, mid: row.id, en: m.enabled } });
  }
  res.json({ ok: true });
});

router.get('/roles/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const mods = await sequelize.query(`SELECT m.key, COALESCE(rm.allowed, false) AS allowed FROM modules m LEFT JOIN role_modules rm ON rm.module_id=m.id AND rm.role_id=:id ORDER BY m.name`, { replacements: { id }, type: sequelize.QueryTypes.SELECT });
  res.json({ modules: mods });
});

router.put('/roles/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const schema = z.object({ modules: z.array(z.object({ key: z.string(), allowed: z.boolean() })) });
  const { modules } = schema.parse(req.body);
  for (const m of modules) {
    const [row] = await sequelize.query(`SELECT id FROM modules WHERE key=:k`, { replacements: { k: m.key }, type: sequelize.QueryTypes.SELECT });
    if (!row) continue;
    await sequelize.query(`DELETE FROM role_modules WHERE role_id=:rid AND module_id=:mid`, { replacements: { rid: id, mid: row.id } });
    await sequelize.query(`INSERT INTO role_modules (role_id, module_id, allowed) VALUES (:rid, :mid, :al)`, { replacements: { rid: id, mid: row.id, al: m.allowed } });
  }
  res.json({ ok: true });
});

router.get('/usuarios/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const mods = await sequelize.query(`SELECT m.key, COALESCE(um.allowed, false) AS allowed FROM modules m LEFT JOIN user_modules um ON um.module_id=m.id AND um.user_id=:id ORDER BY m.name`, { replacements: { id }, type: sequelize.QueryTypes.SELECT });
  res.json({ modules: mods });
});

router.put('/usuarios/:id/modules', requirePermission('admin.config:manage'), async (req, res) => {
  const id = req.params.id;
  const schema = z.object({ modules: z.array(z.object({ key: z.string(), allowed: z.boolean() })) });
  const { modules } = schema.parse(req.body);
  for (const m of modules) {
    const [row] = await sequelize.query(`SELECT id FROM modules WHERE key=:k`, { replacements: { k: m.key }, type: sequelize.QueryTypes.SELECT });
    if (!row) continue;
    await sequelize.query(`DELETE FROM user_modules WHERE user_id=:uid AND module_id=:mid`, { replacements: { uid: id, mid: row.id } });
    await sequelize.query(`INSERT INTO user_modules (user_id, module_id, allowed) VALUES (:uid, :mid, :al)`, { replacements: { uid: id, mid: row.id, al: m.allowed } });
  }
  res.json({ ok: true });
});

export default router;
