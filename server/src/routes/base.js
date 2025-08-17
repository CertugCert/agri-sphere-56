import { Router } from 'express';
import { z } from 'zod';
import { sequelize } from '../db.js';
import { requireAuth, requireModule, requirePermission } from '../middlewares/access.js';

const router = Router();
router.use(requireAuth, requireModule('solo_adubacao'));

// Helpers
const parseUUID = (id) => id;

// ---- Fazendas ----
router.get('/fazendas', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const items = await sequelize.query(`SELECT * FROM fazendas WHERE empresa_id=:cid ORDER BY nome`, { replacements: { cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/fazendas', requirePermission('solo.amostras:create'), async (req, res) => {
  const schema = z.object({ nome: z.string(), municipio: z.string().optional(), uf: z.string().length(2).optional(), area_ha: z.coerce.number().optional() });
  const b = schema.parse(req.body);
  const empresaId = (req).user.empresa_id;
  const [row] = await sequelize.query(`INSERT INTO fazendas (id, empresa_id, nome, municipio, uf, area_ha) VALUES (gen_random_uuid(), :cid, :n, :m, :uf, :a) RETURNING *`, { replacements: { cid: empresaId, n: b.nome, m: b.municipio ?? null, uf: b.uf ?? null, a: b.area_ha ?? null }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ item: row[0] });
});

router.put('/fazendas/:id', requirePermission('solo.amostras:update'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  const schema = z.object({ nome: z.string().optional(), municipio: z.string().optional(), uf: z.string().length(2).optional(), area_ha: z.coerce.number().optional() });
  const b = schema.parse(req.body);
  const [r] = await sequelize.query(`UPDATE fazendas SET nome=COALESCE(:n, nome), municipio=COALESCE(:m, municipio), uf=COALESCE(:uf, uf), area_ha=COALESCE(:a, area_ha) WHERE id=:id AND empresa_id=:cid RETURNING *`, { replacements: { id, cid: empresaId, n: b.nome ?? null, m: b.municipio ?? null, uf: b.uf ?? null, a: b.area_ha ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!r.length) return res.status(404).json({ error: { code: 'not_found', message: 'Fazenda não encontrada' } });
  res.json({ item: r[0] });
});

router.delete('/fazendas/:id', requirePermission('solo.amostras:delete'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  await sequelize.query(`DELETE FROM fazendas WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId } });
  res.json({ ok: true });
});

// ---- Talhões ----
router.get('/talhoes', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const items = await sequelize.query(`SELECT * FROM talhoes WHERE empresa_id=:cid ORDER BY nome`, { replacements: { cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/talhoes', requirePermission('solo.amostras:create'), async (req, res) => {
  const schema = z.object({ fazenda_id: z.string().uuid(), nome: z.string(), area_ha: z.coerce.number().optional(), cultura_atual: z.string().optional() });
  const b = schema.parse(req.body);
  const empresaId = (req).user.empresa_id;
  const [row] = await sequelize.query(`INSERT INTO talhoes (id, empresa_id, fazenda_id, nome, area_ha, cultura_atual) VALUES (gen_random_uuid(), :cid, :fid, :n, :a, :c) RETURNING *`, { replacements: { cid: empresaId, fid: b.fazenda_id, n: b.nome, a: b.area_ha ?? null, c: b.cultura_atual ?? null }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ item: row[0] });
});

router.put('/talhoes/:id', requirePermission('solo.amostras:update'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  const schema = z.object({ nome: z.string().optional(), area_ha: z.coerce.number().optional(), cultura_atual: z.string().optional() });
  const b = schema.parse(req.body);
  const [r] = await sequelize.query(`UPDATE talhoes SET nome=COALESCE(:n, nome), area_ha=COALESCE(:a, area_ha), cultura_atual=COALESCE(:c, cultura_atual) WHERE id=:id AND empresa_id=:cid RETURNING *`, { replacements: { id, cid: empresaId, n: b.nome ?? null, a: b.area_ha ?? null, c: b.cultura_atual ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!r.length) return res.status(404).json({ error: { code: 'not_found', message: 'Talhão não encontrado' } });
  res.json({ item: r[0] });
});

router.delete('/talhoes/:id', requirePermission('solo.amostras:delete'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  await sequelize.query(`DELETE FROM talhoes WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId } });
  res.json({ ok: true });
});

// ---- Safras ----
router.get('/safras', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const items = await sequelize.query(`SELECT * FROM safras WHERE empresa_id=:cid ORDER BY data_inicio DESC NULLS LAST`, { replacements: { cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  res.json({ items });
});

router.post('/safras', requirePermission('solo.amostras:create'), async (req, res) => {
  const schema = z.object({ talhao_id: z.string().uuid(), cultura: z.string(), ciclo: z.string().optional(), data_inicio: z.coerce.date().optional(), data_fim: z.coerce.date().optional() });
  const b = schema.parse(req.body);
  const empresaId = (req).user.empresa_id;
  const [row] = await sequelize.query(`INSERT INTO safras (id, empresa_id, talhao_id, cultura, ciclo, data_inicio, data_fim) VALUES (gen_random_uuid(), :cid, :tid, :c, :ci, :di, :df) RETURNING *`, { replacements: { cid: empresaId, tid: b.talhao_id, c: b.cultura, ci: b.ciclo ?? null, di: b.data_inicio ?? null, df: b.data_fim ?? null }, type: sequelize.QueryTypes.INSERT });
  res.status(201).json({ item: row[0] });
});

router.put('/safras/:id', requirePermission('solo.amostras:update'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  const schema = z.object({ cultura: z.string().optional(), ciclo: z.string().optional(), data_inicio: z.coerce.date().optional(), data_fim: z.coerce.date().optional() });
  const b = schema.parse(req.body);
  const [r] = await sequelize.query(`UPDATE safras SET cultura=COALESCE(:c, cultura), ciclo=COALESCE(:ci, ciclo), data_inicio=COALESCE(:di, data_inicio), data_fim=COALESCE(:df, data_fim) WHERE id=:id AND empresa_id=:cid RETURNING *`, { replacements: { id, cid: empresaId, c: b.cultura ?? null, ci: b.ciclo ?? null, di: b.data_inicio ?? null, df: b.data_fim ?? null }, type: sequelize.QueryTypes.UPDATE });
  if (!r.length) return res.status(404).json({ error: { code: 'not_found', message: 'Safra não encontrada' } });
  res.json({ item: r[0] });
});

router.delete('/safras/:id', requirePermission('solo.amostras:delete'), async (req, res) => {
  const id = parseUUID(req.params.id);
  const empresaId = (req).user.empresa_id;
  await sequelize.query(`DELETE FROM safras WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId } });
  res.json({ ok: true });
});

export default router;
