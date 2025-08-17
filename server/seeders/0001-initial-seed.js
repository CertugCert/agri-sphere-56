'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    // Empresa demo
    const [empresa] = await queryInterface.sequelize.query(`INSERT INTO empresas (id, nome, created_at, updated_at) VALUES (gen_random_uuid(), 'Demo Farm', now(), now()) RETURNING id;`);
    const empresaId = empresa[0].id;

    // Módulos
    const modules = [
      ['hibridos_milho','Híbridos de Milho'],
      ['solo_adubacao','Solo & Adubação'],
      ['pragas_doencas_milho','Pragas & Doenças'],
      ['fungos_ndvi','Fungos & NDVI'],
      ['economico','Econômico'],
      ['suporte','Suporte']
    ];
    const moduleIds = {};
    for (const [key, name] of modules) {
      const [m] = await queryInterface.sequelize.query(`INSERT INTO modules (id, key, name, description) VALUES (gen_random_uuid(), :key, :name, :desc) RETURNING id;`, { replacements: { key, name, desc: name } });
      moduleIds[key] = m[0].id;
      await queryInterface.sequelize.query(`INSERT INTO company_modules (company_id, module_id, enabled) VALUES (:cid, :mid, true)`, { replacements: { cid: empresaId, mid: m[0].id } });
    }

    // Roles
    const roleNames = ['admin_global','admin_empresa','agronomo','tecnico','produtor','auditor','support_manager','support_agent'];
    const roleIds = {};
    for (const r of roleNames) {
      const [row] = await queryInterface.sequelize.query(`INSERT INTO roles (id, nome, escopo) VALUES (gen_random_uuid(), :nome, :escopo) RETURNING id;`, { replacements: { nome: r, escopo: r.includes('admin') ? 'admin' : 'empresa' } });
      roleIds[r] = row[0].id;
    }

    // Permissões (subset essencial + suporte completo)
    const perms = [
      // Admin
      'admin.usuarios:manage','admin.roles:manage','admin.config:manage',
      // Suporte
      'suporte.tickets:create','suporte.tickets:read','suporte.tickets:update','suporte.tickets:assign','suporte.tickets:close','suporte.tickets:export','suporte.messages:create','suporte.config:manage',
    ];
    const permIds = {};
    for (const p of perms) {
      const [row] = await queryInterface.sequelize.query(`INSERT INTO permissions (id, chave) VALUES (gen_random_uuid(), :ch) RETURNING id;`, { replacements: { ch: p } });
      permIds[p] = row[0].id;
    }

    // role_permissions
    const grant = async (role, permission) => {
      await queryInterface.sequelize.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)`, { replacements: { rid: roleIds[role], pid: permIds[permission] } });
    };

    const allSupportPerms = perms.filter(p => p.startsWith('suporte.'));
    for (const p of perms) await grant('admin_global', p);
    for (const p of perms) await grant('admin_empresa', p);
    for (const p of allSupportPerms) await grant('support_manager', p);
    for (const p of ['suporte.tickets:read','suporte.tickets:update','suporte.tickets:close','suporte.messages:create']) await grant('support_agent', p);

    // role_modules
    const allowRoleModule = async (roleKey, moduleKey) => {
      await queryInterface.sequelize.query(`INSERT INTO role_modules (role_id, module_id, allowed) VALUES (:rid, :mid, true)`, { replacements: { rid: roleIds[roleKey], mid: moduleIds[moduleKey] } });
    };
    for (const mk of Object.keys(moduleIds)) {
      await allowRoleModule('admin_global', mk);
      await allowRoleModule('admin_empresa', mk);
    }
    await allowRoleModule('support_manager', 'suporte');
    await allowRoleModule('support_agent', 'suporte');

    // Usuários demo
    const bcrypt = require('bcryptjs');
    async function addUser(nome, email, roleKey) {
      const hash = await bcrypt.hash('Admin@123456', 10);
      const [u] = await queryInterface.sequelize.query(`INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, ativo) VALUES (gen_random_uuid(), :cid, :nome, :email, :hash, true) RETURNING id;`, { replacements: { cid: empresaId, nome, email, hash } });
      await queryInterface.sequelize.query(`INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)`, { replacements: { uid: u[0].id, rid: roleIds[roleKey] } });
      return u[0].id;
    }
    const uidAdminGlobal = await addUser('Admin Global', 'admin@demo.com', 'admin_global');
    const uidSupport = await addUser('Agente Suporte', 'support@demo.com', 'support_agent');
    const uidProdutor = await addUser('Produtor', 'produtor@demo.com', 'produtor');

    // Categorias de suporte
    const catNames = ['Bug','Sugestão','Melhoria','Dúvida'];
    const catIds = [];
    for (const c of catNames) {
      const [row] = await queryInterface.sequelize.query(`INSERT INTO support_categories (id, empresa_id, name, description, active) VALUES (gen_random_uuid(), :cid, :n, :d, true) RETURNING id;`, { replacements: { cid: empresaId, n: c, d: c } });
      catIds.push(row[0].id);
    }

    // Tickets demo
    const [t1] = await queryInterface.sequelize.query(`INSERT INTO support_tickets (id, empresa_id, user_id, title, category_id, priority, status, channel, created_at, updated_at) VALUES (gen_random_uuid(), :cid, :uid, 'Problema no login', :cat, 'medium', 'open', 'web', now(), now()) RETURNING id;`, { replacements: { cid: empresaId, uid: uidProdutor, cat: catIds[0] } });
    const [t2] = await queryInterface.sequelize.query(`INSERT INTO support_tickets (id, empresa_id, user_id, assigned_to_user_id, title, category_id, priority, status, channel, created_at, updated_at) VALUES (gen_random_uuid(), :cid, :uid, :aid, 'Erro na tela de chamados', :cat, 'high', 'in_progress', 'web', now(), now()) RETURNING id;`, { replacements: { cid: empresaId, uid: uidProdutor, aid: uidSupport, cat: catIds[2] } });

    await queryInterface.sequelize.query(`INSERT INTO support_messages (id, ticket_id, author_user_id, body, is_internal, created_at, updated_at) VALUES (gen_random_uuid(), :tid, :uid, 'Não consigo acessar a conta', false, now(), now())`, { replacements: { tid: t1[0].id, uid: uidProdutor } });
    await queryInterface.sequelize.query(`INSERT INTO support_messages (id, ticket_id, author_user_id, body, is_internal, created_at, updated_at) VALUES (gen_random_uuid(), :tid, :uid, 'Verificando seu caso', false, now(), now())`, { replacements: { tid: t2[0].id, uid: uidSupport } });

    // Base geográfica demo
    const [fz] = await queryInterface.sequelize.query(`INSERT INTO fazendas (id, empresa_id, nome, municipio, uf, area_ha) VALUES (gen_random_uuid(), :cid, 'Fazenda Luz', 'Londrina', 'PR', 1200) RETURNING id;`, { replacements: { cid: empresaId } });
    await queryInterface.sequelize.query(`INSERT INTO talhoes (id, empresa_id, fazenda_id, nome, area_ha, cultura_atual) VALUES (gen_random_uuid(), :cid, :fid, 'Talhão A', 100, 'Milho'), (gen_random_uuid(), :cid, :fid, 'Talhão B', 80, 'Soja')`, { replacements: { cid: empresaId, fid: fz[0].id } });
    await queryInterface.sequelize.query(`INSERT INTO safras (id, empresa_id, talhao_id, cultura, ciclo, data_inicio) SELECT gen_random_uuid(), :cid, t.id, 'Milho', '2024/25', now() FROM talhoes t WHERE t.empresa_id=:cid LIMIT 1;`, { replacements: { cid: empresaId } });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DELETE FROM support_messages');
    await queryInterface.sequelize.query('DELETE FROM support_tickets');
    await queryInterface.sequelize.query('DELETE FROM support_categories');
    await queryInterface.sequelize.query('DELETE FROM safras');
    await queryInterface.sequelize.query('DELETE FROM talhoes');
    await queryInterface.sequelize.query('DELETE FROM fazendas');
    await queryInterface.sequelize.query('DELETE FROM user_modules');
    await queryInterface.sequelize.query('DELETE FROM role_modules');
    await queryInterface.sequelize.query('DELETE FROM company_modules');
    await queryInterface.sequelize.query('DELETE FROM modules');
    await queryInterface.sequelize.query('DELETE FROM role_permissions');
    await queryInterface.sequelize.query('DELETE FROM permissions');
    await queryInterface.sequelize.query('DELETE FROM user_roles');
    await queryInterface.sequelize.query('DELETE FROM roles');
    await queryInterface.sequelize.query('DELETE FROM usuarios');
    await queryInterface.sequelize.query('DELETE FROM empresas');
  }
};
