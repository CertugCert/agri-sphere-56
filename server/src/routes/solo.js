import express from 'express';
import { z } from 'zod';
import { sequelize } from '../db.js';
import { requireAuth } from '../middlewares/access.js';
import { requireModule, requirePermission } from '../middlewares/access.js';
import { gerarRecomendacao } from '../services/solo/recomendacao.service.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Middleware para todas as rotas do módulo
router.use(requireAuth);
router.use(requireModule('solo_adubacao'));

// Schemas de validação
const amostraSchema = z.object({
  talhao_id: z.string().uuid().optional(),
  safra_id: z.string().uuid().optional(),
  data_coleta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  profundidade_cm: z.number().int().positive().optional(),
  ph: z.number().min(0).max(14).optional(),
  p_mehlich: z.number().min(0).optional(),
  k_mehlich: z.number().min(0).optional(),
  ca_cmol: z.number().min(0).optional(),
  mg_cmol: z.number().min(0).optional(),
  s: z.number().min(0).optional(),
  ctc_cmol: z.number().min(0).optional(),
  mo_g_kg: z.number().min(0).optional(),
  argila_pct: z.number().min(0).max(100).optional(),
  analitos: z.object({}).optional()
});

const recomendacaoSchema = z.object({
  amostra_id: z.string().uuid(),
  objetivo_produtividade: z.number().positive().optional(),
  parametros: z.object({}).optional()
});

// GET /api/solo/amostras - Listar amostras
router.get('/amostras', requirePermission('solo.amostras:read'), async (req, res) => {
  try {
    const { talhao_id, from, to, q, page = 1, limit = 20 } = req.query;
    const empresa_id = req.user.empresa_id || req.user.company_id;
    
    let whereClause = 'WHERE s.empresa_id = :cid';
    const replacements = { 
      cid: empresa_id,
      lim: Number(limit), 
      off: (Number(page) - 1) * Number(limit) 
    };

    if (talhao_id) {
      whereClause += ' AND s.talhao_id = :tid';
      replacements.tid = talhao_id;
    }
    if (from) {
      whereClause += ' AND s.data_coleta >= :from';
      replacements.from = from;
    }
    if (to) {
      whereClause += ' AND s.data_coleta <= :to';
      replacements.to = to;
    }

    const sql = `
      SELECT s.*, 
             t.nome AS talhao_nome,
             f.nome AS fazenda_nome
      FROM solo_amostras s
      LEFT JOIN talhoes t ON t.id = s.talhao_id
      LEFT JOIN fazendas f ON f.id = t.fazenda_id
      ${whereClause}
      ORDER BY s.data_coleta DESC 
      LIMIT :lim OFFSET :off
    `;

    const [results] = await sequelize.query(sql, { replacements });
    
    const countSql = `
      SELECT COUNT(*) as total
      FROM solo_amostras s
      ${whereClause}
    `;
    const [countResults] = await sequelize.query(countSql, { replacements: { ...replacements, lim: undefined, off: undefined } });

    res.json({
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResults[0].total),
        pages: Math.ceil(Number(countResults[0].total) / Number(limit))
      }
    });
  } catch (error) {
    req.log?.error({ error }, 'Erro ao buscar amostras');
    res.status(500).json({ error: { code: 'fetch_error', message: 'Erro ao buscar amostras' } });
  }
});

// POST /api/solo/amostras - Criar amostra
router.post('/amostras', requirePermission('solo.amostras:create'), async (req, res) => {
  try {
    const data = amostraSchema.parse(req.body);
    const empresa_id = req.user.empresa_id || req.user.company_id;

    const sql = `
      INSERT INTO solo_amostras (
        id, empresa_id, talhao_id, safra_id, data_coleta, profundidade_cm,
        ph, p_mehlich, k_mehlich, ca_cmol, mg_cmol, s, ctc_cmol, 
        mo_g_kg, argila_pct, analitos, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), :cid, :tid, :sid, :dc, :prof, :ph, :p, :k, 
        :ca, :mg, :s, :ctc, :mo, :arg, :analitos, now(), now()
      ) RETURNING *
    `;

    const [results] = await sequelize.query(sql, {
      replacements: {
        cid: empresa_id,
        tid: data.talhao_id || null,
        sid: data.safra_id || null,
        dc: data.data_coleta,
        prof: data.profundidade_cm || null,
        ph: data.ph || null,
        p: data.p_mehlich || null,
        k: data.k_mehlich || null,
        ca: data.ca_cmol || null,
        mg: data.mg_cmol || null,
        s: data.s || null,
        ctc: data.ctc_cmol || null,
        mo: data.mo_g_kg || null,
        arg: data.argila_pct || null,
        analitos: data.analitos ? JSON.stringify(data.analitos) : null
      }
    });

    res.status(201).json(results[0]);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Dados inválidos', details: error.errors } });
    }
    req.log?.error({ error }, 'Erro ao criar amostra');
    res.status(500).json({ error: { code: 'create_error', message: 'Erro ao criar amostra' } });
  }
});

// GET /api/solo/amostras/:id - Buscar amostra específica
router.get('/amostras/:id', requirePermission('solo.amostras:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.user.empresa_id || req.user.company_id;

    const sql = `
      SELECT s.*, 
             t.nome AS talhao_nome,
             f.nome AS fazenda_nome
      FROM solo_amostras s
      LEFT JOIN talhoes t ON t.id = s.talhao_id
      LEFT JOIN fazendas f ON f.id = t.fazenda_id
      WHERE s.id = :id AND s.empresa_id = :cid
    `;

    const [results] = await sequelize.query(sql, { replacements: { id, cid: empresa_id } });
    
    if (results.length === 0) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Amostra não encontrada' } });
    }

    res.json(results[0]);
  } catch (error) {
    req.log?.error({ error }, 'Erro ao buscar amostra');
    res.status(500).json({ error: { code: 'fetch_error', message: 'Erro ao buscar amostra' } });
  }
});

// PUT /api/solo/amostras/:id - Atualizar amostra
router.put('/amostras/:id', requirePermission('solo.amostras:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = amostraSchema.partial().parse(req.body);
    const empresa_id = req.user.empresa_id || req.user.company_id;

    // Verificar se a amostra existe e pertence à empresa
    const [existing] = await sequelize.query(
      'SELECT id FROM solo_amostras WHERE id = :id AND empresa_id = :cid',
      { replacements: { id, cid: empresa_id } }
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Amostra não encontrada' } });
    }

    const updateFields = [];
    const replacements = { id, cid: empresa_id };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = :${key}`);
        replacements[key] = key === 'analitos' && value ? JSON.stringify(value) : value;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: { code: 'no_data', message: 'Nenhum campo para atualizar' } });
    }

    updateFields.push('updated_at = now()');

    const sql = `
      UPDATE solo_amostras 
      SET ${updateFields.join(', ')}
      WHERE id = :id AND empresa_id = :cid
      RETURNING *
    `;

    const [results] = await sequelize.query(sql, { replacements });
    res.json(results[0]);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Dados inválidos', details: error.errors } });
    }
    req.log?.error({ error }, 'Erro ao atualizar amostra');
    res.status(500).json({ error: { code: 'update_error', message: 'Erro ao atualizar amostra' } });
  }
});

// DELETE /api/solo/amostras/:id - Excluir amostra
router.delete('/amostras/:id', requirePermission('solo.amostras:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.user.empresa_id || req.user.company_id;

    const [result] = await sequelize.query(
      'DELETE FROM solo_amostras WHERE id = :id AND empresa_id = :cid',
      { replacements: { id, cid: empresa_id } }
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Amostra não encontrada' } });
    }

    res.status(204).send();
  } catch (error) {
    req.log?.error({ error }, 'Erro ao excluir amostra');
    res.status(500).json({ error: { code: 'delete_error', message: 'Erro ao excluir amostra' } });
  }
});

// POST /api/solo/recomendacoes - Gerar recomendação
router.post('/recomendacoes', requirePermission('solo.recomendacao:create'), async (req, res) => {
  try {
    const data = recomendacaoSchema.parse(req.body);
    const empresa_id = req.user.empresa_id || req.user.company_id;

    // Buscar amostra
    const [amostras] = await sequelize.query(
      'SELECT * FROM solo_amostras WHERE id = :id AND empresa_id = :cid',
      { replacements: { id: data.amostra_id, cid: empresa_id } }
    );

    if (amostras.length === 0) {
      return res.status(404).json({ error: { code: 'sample_not_found', message: 'Amostra não encontrada' } });
    }

    const amostra = amostras[0];
    
    // Gerar recomendação
    const recomendacao = gerarRecomendacao(
      amostra, 
      data.objetivo_produtividade || 150,
      data.parametros || {},
      req.user
    );

    // Salvar recomendação
    const sql = `
      INSERT INTO solo_recomendacoes (
        id, empresa_id, amostra_id, cultura, objetivo_produtividade,
        npk_kg_ha, calagem_t_ha, gessagem_t_ha, parametros,
        gerada_por_user_id, gerada_em, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), :cid, :aid, 'milho', :obj,
        :npk, :cal, :ges, :param, :uid, now(), now(), now()
      ) RETURNING *
    `;

    const [results] = await sequelize.query(sql, {
      replacements: {
        cid: empresa_id,
        aid: data.amostra_id,
        obj: data.objetivo_produtividade || 150,
        npk: JSON.stringify(recomendacao.npk_kg_ha),
        cal: recomendacao.calagem_t_ha,
        ges: recomendacao.gessagem_t_ha,
        param: JSON.stringify(recomendacao.parametros),
        uid: req.user.id
      }
    });

    res.status(201).json({
      ...results[0],
      amostra
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Dados inválidos', details: error.errors } });
    }
    req.log?.error({ error }, 'Erro ao gerar recomendação');
    res.status(500).json({ error: { code: 'generate_error', message: 'Erro ao gerar recomendação' } });
  }
});

// GET /api/solo/recomendacoes - Listar recomendações
router.get('/recomendacoes', requirePermission('solo.recomendacao:read'), async (req, res) => {
  try {
    const { amostra_id, page = 1, limit = 20 } = req.query;
    const empresa_id = req.user.empresa_id || req.user.company_id;
    
    let whereClause = 'WHERE r.empresa_id = :cid';
    const replacements = { 
      cid: empresa_id,
      lim: Number(limit), 
      off: (Number(page) - 1) * Number(limit) 
    };

    if (amostra_id) {
      whereClause += ' AND r.amostra_id = :aid';
      replacements.aid = amostra_id;
    }

    const sql = `
      SELECT r.*, 
             u.nome AS gerada_por_nome,
             s.data_coleta AS amostra_data_coleta
      FROM solo_recomendacoes r
      LEFT JOIN usuarios u ON u.id = r.gerada_por_user_id
      LEFT JOIN solo_amostras s ON s.id = r.amostra_id
      ${whereClause}
      ORDER BY r.gerada_em DESC 
      LIMIT :lim OFFSET :off
    `;

    const [results] = await sequelize.query(sql, { replacements });
    
    const countSql = `
      SELECT COUNT(*) as total
      FROM solo_recomendacoes r
      ${whereClause}
    `;
    const [countResults] = await sequelize.query(countSql, { replacements: { ...replacements, lim: undefined, off: undefined } });

    res.json({
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResults[0].total),
        pages: Math.ceil(Number(countResults[0].total) / Number(limit))
      }
    });
  } catch (error) {
    req.log?.error({ error }, 'Erro ao buscar recomendações');
    res.status(500).json({ error: { code: 'fetch_error', message: 'Erro ao buscar recomendações' } });
  }
});

// GET /api/solo/recomendacoes/:id - Buscar recomendação específica
router.get('/recomendacoes/:id', requirePermission('solo.recomendacao:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.user.empresa_id || req.user.company_id;

    const sql = `
      SELECT r.*, 
             u.nome AS gerada_por_nome,
             s.*,
             t.nome AS talhao_nome,
             f.nome AS fazenda_nome
      FROM solo_recomendacoes r
      LEFT JOIN usuarios u ON u.id = r.gerada_por_user_id
      LEFT JOIN solo_amostras s ON s.id = r.amostra_id
      LEFT JOIN talhoes t ON t.id = s.talhao_id
      LEFT JOIN fazendas f ON f.id = t.fazenda_id
      WHERE r.id = :id AND r.empresa_id = :cid
    `;

    const [results] = await sequelize.query(sql, { replacements: { id, cid: empresa_id } });
    
    if (results.length === 0) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Recomendação não encontrada' } });
    }

    res.json(results[0]);
  } catch (error) {
    req.log?.error({ error }, 'Erro ao buscar recomendação');
    res.status(500).json({ error: { code: 'fetch_error', message: 'Erro ao buscar recomendação' } });
  }
});

// POST /api/solo/recomendacoes/:id/export/pdf - Exportar PDF
router.post('/recomendacoes/:id/export/pdf', requirePermission('solo.recomendacao:export'), async (req, res) => {
  try {
    const { id } = req.params;
    const empresa_id = req.user.empresa_id || req.user.company_id;

    // Buscar recomendação completa
    const sql = `
      SELECT r.*, 
             e.nome AS empresa_nome,
             u.nome AS gerada_por_nome,
             s.data_coleta, s.ph, s.p_mehlich, s.k_mehlich, s.ca_cmol, s.mg_cmol, s.mo_g_kg, s.argila_pct,
             t.nome AS talhao_nome,
             f.nome AS fazenda_nome
      FROM solo_recomendacoes r
      LEFT JOIN empresas e ON e.id = r.empresa_id
      LEFT JOIN usuarios u ON u.id = r.gerada_por_user_id
      LEFT JOIN solo_amostras s ON s.id = r.amostra_id
      LEFT JOIN talhoes t ON t.id = s.talhao_id
      LEFT JOIN fazendas f ON f.id = t.fazenda_id
      WHERE r.id = :id AND r.empresa_id = :cid
    `;

    const [results] = await sequelize.query(sql, { replacements: { id, cid: empresa_id } });
    
    if (results.length === 0) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Recomendação não encontrada' } });
    }

    const rec = results[0];
    const npk = JSON.parse(rec.npk_kg_ha);

    // Criar PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recomendacao-${id}.pdf`);
    
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).text('Recomendação de Adubação', 50, 50);
    doc.fontSize(12);
    doc.text(`Empresa: ${rec.empresa_nome}`, 50, 90);
    doc.text(`Fazenda: ${rec.fazenda_nome || 'N/A'}`, 50, 110);
    doc.text(`Talhão: ${rec.talhao_nome || 'N/A'}`, 50, 130);
    doc.text(`Cultura: ${rec.cultura}`, 50, 150);
    doc.text(`Data da coleta: ${new Date(rec.data_coleta).toLocaleDateString('pt-BR')}`, 50, 170);
    doc.text(`Objetivo: ${rec.objetivo_produtividade} sc/ha`, 50, 190);
    doc.text(`Gerado por: ${rec.gerada_por_nome}`, 50, 210);
    doc.text(`Data: ${new Date(rec.gerada_em).toLocaleDateString('pt-BR')}`, 50, 230);

    // NPK
    doc.fontSize(16).text('Recomendação NPK', 50, 270);
    doc.fontSize(12);
    doc.text(`Nitrogênio (N): ${npk.N} kg/ha`, 50, 300);
    doc.text(`Fósforo (P2O5): ${npk.P2O5} kg/ha`, 50, 320);
    doc.text(`Potássio (K2O): ${npk.K2O} kg/ha`, 50, 340);

    // Calagem e gessagem
    doc.fontSize(16).text('Correção do Solo', 50, 380);
    doc.fontSize(12);
    doc.text(`Calagem: ${rec.calagem_t_ha || 0} t/ha`, 50, 410);
    doc.text(`Gessagem: ${rec.gessagem_t_ha || 0} t/ha`, 50, 430);

    // Análise de solo
    doc.fontSize(16).text('Análise de Solo', 50, 470);
    doc.fontSize(12);
    doc.text(`pH: ${rec.ph || 'N/A'}`, 50, 500);
    doc.text(`P (Mehlich): ${rec.p_mehlich || 'N/A'} mg/dm³`, 50, 520);
    doc.text(`K (Mehlich): ${rec.k_mehlich || 'N/A'} mg/dm³`, 50, 540);
    doc.text(`Ca: ${rec.ca_cmol || 'N/A'} cmolc/dm³`, 50, 560);
    doc.text(`Mg: ${rec.mg_cmol || 'N/A'} cmolc/dm³`, 50, 580);
    doc.text(`MO: ${rec.mo_g_kg || 'N/A'} g/kg`, 50, 600);
    doc.text(`Argila: ${rec.argila_pct || 'N/A'}%`, 50, 620);

    // Rodapé
    doc.fontSize(10).text('Recomendação gerada automaticamente pelo sistema TAgri', 50, 700);

    doc.end();
  } catch (error) {
    req.log?.error({ error }, 'Erro ao gerar PDF');
    res.status(500).json({ error: { code: 'pdf_error', message: 'Erro ao gerar PDF' } });
  }
});

export default router;