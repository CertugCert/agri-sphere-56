import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { sequelize } from '../db.js';

const router = Router();

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: { code: 'unauthorized', message: 'Sem token' } });
  try {
    const token = auth.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    (req).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'Token inválido' } });
  }
}

router.use(requireAuth);

router.post('/tickets', async (req, res) => {
  const { title, category_id = null, priority = 'low', bodyMensagemInicial = '' } = req.body;
  const userId = (req).user.sub;
  const empresaId = (req).user.empresa_id;
  const [ticket] = await sequelize.query(
    `INSERT INTO support_tickets (id, empresa_id, user_id, assigned_to_user_id, title, category_id, priority, status, channel, created_at, updated_at)
     VALUES (gen_random_uuid(), :empresa_id, :user_id, NULL, :title, :category_id, :priority, 'open', 'web', now(), now())
     RETURNING *`,
    { replacements: { empresa_id: empresaId, user_id: userId, title, category_id, priority }, type: sequelize.QueryTypes.INSERT }
  );
  if (bodyMensagemInicial) {
    await sequelize.query(
      `INSERT INTO support_messages (id, ticket_id, author_user_id, body, is_internal, created_at, updated_at)
       VALUES (gen_random_uuid(), :tid, :uid, :body, false, now(), now())`,
      { replacements: { tid: ticket[0].id, uid: userId, body: bodyMensagemInicial } }
    );
  }
  res.status(201).json({ ticket: ticket[0] });
});

router.get('/tickets', async (req, res) => {
  const userId = (req).user.sub;
  const empresaId = (req).user.empresa_id;
  const mine = req.query.mine === 'true';
  const { status, priority, q } = req.query;
  const page = Number(req.query.page || 1);
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const offset = (page - 1) * limit;

  const sql = `
    SELECT t.*, u.nome AS requester, a.nome AS assignee, c.name AS category
    FROM support_tickets t
    LEFT JOIN usuarios u ON u.id = t.user_id
    LEFT JOIN usuarios a ON a.id = t.assigned_to_user_id
    LEFT JOIN support_categories c ON c.id = t.category_id
    WHERE t.empresa_id = :cid
    ${mine ? 'AND t.user_id = :uid' : ''}
    ${status ? 'AND t.status = :status' : ''}
    ${priority ? 'AND t.priority = :priority' : ''}
    ${q ? 'AND (t.title ILIKE :q)' : ''}
    ORDER BY t.created_at DESC LIMIT :lim OFFSET :off
  `;
  
  const repl = {
    cid: empresaId,
    uid: userId,
    status: status || null,
    priority: priority || null,
    q: q ? `%${q}%` : null,
    lim: limit,
    off: offset,
  };

  const items = await sequelize.query(sql, { replacements: repl, type: sequelize.QueryTypes.SELECT });
  res.json({ items, page, limit });
});

router.get('/tickets/:id', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const [ticket] = await sequelize.query(`SELECT * FROM support_tickets WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  if (!ticket) return res.status(404).json({ error: { code: 'not_found', message: 'Ticket não encontrado' } });
  const messages = await sequelize.query(`SELECT * FROM support_messages WHERE ticket_id=:id ORDER BY created_at ASC`, { replacements: { id }, type: sequelize.QueryTypes.SELECT });
  res.json({ ticket, messages });
});

router.put('/tickets/:id', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const { title, category_id, priority } = req.body;
  const [ticket] = await sequelize.query(`SELECT * FROM support_tickets WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  if (!ticket) return res.status(404).json({ error: { code: 'not_found', message: 'Ticket não encontrado' } });
  
  await sequelize.query(
    `UPDATE support_tickets SET title=:title, category_id=:category_id, priority=:priority, updated_at=now() WHERE id=:id`,
    { replacements: { id, title: title || ticket.title, category_id: category_id !== undefined ? category_id : ticket.category_id, priority: priority || ticket.priority } }
  );
  res.json({ ok: true });
});

router.put('/tickets/:id/assign', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const { assigned_to_user_id } = req.body;
  const [ticket] = await sequelize.query(`SELECT * FROM support_tickets WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  if (!ticket) return res.status(404).json({ error: { code: 'not_found', message: 'Ticket não encontrado' } });
  
  await sequelize.query(
    `UPDATE support_tickets SET assigned_to_user_id=:assigned_to, updated_at=now() WHERE id=:id`,
    { replacements: { id, assigned_to: assigned_to_user_id } }
  );
  res.json({ ok: true });
});

router.put('/tickets/:id/close', async (req, res) => {
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const [ticket] = await sequelize.query(`SELECT * FROM support_tickets WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  if (!ticket) return res.status(404).json({ error: { code: 'not_found', message: 'Ticket não encontrado' } });
  
  await sequelize.query(
    `UPDATE support_tickets SET status='closed', closed_at=now(), updated_at=now() WHERE id=:id`,
    { replacements: { id } }
  );
  res.json({ ok: true });
});

router.post('/tickets/:id/messages', async (req, res) => {
  const userId = (req).user.sub;
  const empresaId = (req).user.empresa_id;
  const id = req.params.id;
  const { body, is_internal = false } = req.body;
  const [ticket] = await sequelize.query(`SELECT * FROM support_tickets WHERE id=:id AND empresa_id=:cid`, { replacements: { id, cid: empresaId }, type: sequelize.QueryTypes.SELECT });
  if (!ticket) return res.status(404).json({ error: { code: 'not_found', message: 'Ticket não encontrado' } });
  await sequelize.query(
    `INSERT INTO support_messages (id, ticket_id, author_user_id, body, is_internal, created_at, updated_at)
     VALUES (gen_random_uuid(), :tid, :uid, :body, :internal, now(), now())`,
    { replacements: { tid: id, uid: userId, body, internal: !!is_internal } }
  );
  res.status(201).json({ ok: true });
});

export default router;
