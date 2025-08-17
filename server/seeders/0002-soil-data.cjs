'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    // Buscar empresa demo e talhões
    const [empresas] = await queryInterface.sequelize.query(`SELECT id FROM empresas WHERE nome='Demo Farm' LIMIT 1`);
    if (empresas.length === 0) return;
    const empresaId = empresas[0].id;

    const [talhoes] = await queryInterface.sequelize.query(`SELECT id FROM talhoes WHERE empresa_id = :cid LIMIT 2`, { replacements: { cid: empresaId } });
    if (talhoes.length === 0) return;

    // Adicionar permissões do módulo solo
    const soilPerms = [
      'solo.amostras:read', 'solo.amostras:create', 'solo.amostras:update', 'solo.amostras:delete',
      'solo.recomendacao:create', 'solo.recomendacao:read', 'solo.recomendacao:export'
    ];
    
    const permIds = {};
    for (const p of soilPerms) {
      const [existing] = await queryInterface.sequelize.query(`SELECT id FROM permissions WHERE chave = :ch`, { replacements: { ch: p } });
      if (existing.length === 0) {
        const [row] = await queryInterface.sequelize.query(`INSERT INTO permissions (id, chave) VALUES (gen_random_uuid(), :ch) RETURNING id`, { replacements: { ch: p } });
        permIds[p] = row[0].id;
      } else {
        permIds[p] = existing[0].id;
      }
    }

    // Buscar roles para associar permissões
    const [roles] = await queryInterface.sequelize.query(`SELECT id, nome FROM roles WHERE nome IN ('admin_global', 'admin_empresa', 'agronomo', 'tecnico')`);
    
    for (const role of roles) {
      for (const p of soilPerms) {
        // Verificar se já existe
        const [existing] = await queryInterface.sequelize.query(`SELECT 1 FROM role_permissions WHERE role_id = :rid AND permission_id = :pid`, { replacements: { rid: role.id, pid: permIds[p] } });
        if (existing.length === 0) {
          await queryInterface.sequelize.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)`, { replacements: { rid: role.id, pid: permIds[p] } });
        }
      }
    }

    // Permitir módulo solo para alguns roles
    const [soloModule] = await queryInterface.sequelize.query(`SELECT id FROM modules WHERE key = 'solo_adubacao'`);
    if (soloModule.length > 0) {
      const moduleId = soloModule[0].id;
      for (const role of roles) {
        const [existing] = await queryInterface.sequelize.query(`SELECT 1 FROM role_modules WHERE role_id = :rid AND module_id = :mid`, { replacements: { rid: role.id, mid: moduleId } });
        if (existing.length === 0) {
          await queryInterface.sequelize.query(`INSERT INTO role_modules (role_id, module_id, allowed) VALUES (:rid, :mid, true)`, { replacements: { rid: role.id, mid: moduleId } });
        }
      }
    }

    // Inserir amostras demo
    const amostras = [
      {
        talhao_id: talhoes[0].id,
        data_coleta: '2024-03-15',
        profundidade_cm: 20,
        ph: 5.2,
        p_mehlich: 12.5,
        k_mehlich: 85.0,
        ca_cmol: 2.8,
        mg_cmol: 0.9,
        s: 8.2,
        ctc_cmol: 6.5,
        mo_g_kg: 28.5,
        argila_pct: 45.0
      },
      {
        talhao_id: talhoes.length > 1 ? talhoes[1].id : talhoes[0].id,
        data_coleta: '2024-03-20',
        profundidade_cm: 20,
        ph: 6.1,
        p_mehlich: 22.8,
        k_mehlich: 120.0,
        ca_cmol: 4.2,
        mg_cmol: 1.3,
        s: 12.5,
        ctc_cmol: 8.2,
        mo_g_kg: 32.0,
        argila_pct: 38.0
      }
    ];

    for (const amostra of amostras) {
      await queryInterface.sequelize.query(`
        INSERT INTO solo_amostras (id, empresa_id, talhao_id, data_coleta, profundidade_cm, ph, p_mehlich, k_mehlich, ca_cmol, mg_cmol, s, ctc_cmol, mo_g_kg, argila_pct, created_at, updated_at)
        VALUES (gen_random_uuid(), :cid, :tid, :dc, :prof, :ph, :p, :k, :ca, :mg, :s, :ctc, :mo, :arg, now(), now())
      `, { 
        replacements: { 
          cid: empresaId,
          tid: amostra.talhao_id,
          dc: amostra.data_coleta,
          prof: amostra.profundidade_cm,
          ph: amostra.ph,
          p: amostra.p_mehlich,
          k: amostra.k_mehlich,
          ca: amostra.ca_cmol,
          mg: amostra.mg_cmol,
          s: amostra.s,
          ctc: amostra.ctc_cmol,
          mo: amostra.mo_g_kg,
          arg: amostra.argila_pct
        } 
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DELETE FROM solo_recomendacoes');
    await queryInterface.sequelize.query('DELETE FROM solo_amostras WHERE empresa_id IN (SELECT id FROM empresas WHERE nome = \'Demo Farm\')');
    
    const soilPerms = [
      'solo.amostras:read', 'solo.amostras:create', 'solo.amostras:update', 'solo.amostras:delete',
      'solo.recomendacao:create', 'solo.recomendacao:read', 'solo.recomendacao:export'
    ];
    
    for (const p of soilPerms) {
      await queryInterface.sequelize.query('DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE chave = :ch)', { replacements: { ch: p } });
      await queryInterface.sequelize.query('DELETE FROM permissions WHERE chave = :ch', { replacements: { ch: p } });
    }
  }
};