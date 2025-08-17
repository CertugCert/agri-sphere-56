'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    const uuid = { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true };
    const uuidFk = { type: Sequelize.UUID, allowNull: false };

    await queryInterface.createTable('empresas', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });

    await queryInterface.createTable('usuarios', {
      id: uuid,
      empresa_id: uuidFk,
      nome: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING, allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, defaultValue: true },
      ultimo_login_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });

    await queryInterface.addIndex('usuarios', ['empresa_id']);

    await queryInterface.createTable('roles', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false, unique: true },
      escopo: { type: Sequelize.STRING, allowNull: false },
    });

    await queryInterface.createTable('user_roles', {
      user_id: uuidFk,
      role_id: uuidFk,
    });

    await queryInterface.createTable('permissions', {
      id: uuid,
      chave: { type: Sequelize.STRING, allowNull: false, unique: true },
    });

    await queryInterface.createTable('role_permissions', {
      role_id: uuidFk,
      permission_id: uuidFk,
    });

    await queryInterface.createTable('modules', {
      id: uuid,
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING },
    });

    await queryInterface.createTable('company_modules', {
      company_id: uuidFk,
      module_id: uuidFk,
      enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
    });

    await queryInterface.createTable('role_modules', {
      role_id: uuidFk,
      module_id: uuidFk,
      allowed: { type: Sequelize.BOOLEAN, defaultValue: false },
    });

    await queryInterface.createTable('user_modules', {
      user_id: uuidFk,
      module_id: uuidFk,
      allowed: { type: Sequelize.BOOLEAN, defaultValue: false },
    });

    await queryInterface.createTable('fazendas', {
      id: uuid,
      empresa_id: uuidFk,
      nome: { type: Sequelize.STRING },
      municipio: { type: Sequelize.STRING },
      uf: { type: Sequelize.STRING(2) },
      area_ha: { type: Sequelize.DECIMAL },
    });

    await queryInterface.createTable('talhoes', {
      id: uuid,
      empresa_id: uuidFk,
      fazenda_id: uuidFk,
      nome: { type: Sequelize.STRING },
      area_ha: { type: Sequelize.DECIMAL },
      cultura_atual: { type: Sequelize.STRING },
    });

    await queryInterface.createTable('safras', {
      id: uuid,
      empresa_id: uuidFk,
      talhao_id: uuidFk,
      cultura: { type: Sequelize.STRING },
      ciclo: { type: Sequelize.STRING },
      data_inicio: { type: Sequelize.DATE },
      data_fim: { type: Sequelize.DATE },
    });

    await queryInterface.createTable('support_categories', {
      id: uuid,
      empresa_id: uuidFk,
      name: { type: Sequelize.STRING },
      description: { type: Sequelize.STRING },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
    });

    await queryInterface.createTable('support_tickets', {
      id: uuid,
      empresa_id: uuidFk,
      user_id: uuidFk,
      assigned_to_user_id: { type: Sequelize.UUID },
      title: { type: Sequelize.STRING },
      category_id: { type: Sequelize.UUID },
      priority: { type: Sequelize.ENUM('low','medium','high','critical'), defaultValue: 'low' },
      status: { type: Sequelize.ENUM('open','in_progress','waiting_user','solved','closed'), defaultValue: 'open' },
      channel: { type: Sequelize.ENUM('web'), defaultValue: 'web' },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      closed_at: { type: Sequelize.DATE },
    });

    await queryInterface.addIndex('support_tickets', ['empresa_id']);
    await queryInterface.addIndex('support_tickets', ['status', 'priority']);

    await queryInterface.createTable('support_messages', {
      id: uuid,
      ticket_id: uuidFk,
      author_user_id: uuidFk,
      body: { type: Sequelize.TEXT },
      is_internal: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });

    await queryInterface.addIndex('support_messages', ['ticket_id', 'created_at']);

    await queryInterface.createTable('refresh_tokens', {
      id: uuid,
      user_id: uuidFk,
      valid: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('support_messages');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('support_categories');
    await queryInterface.dropTable('safras');
    await queryInterface.dropTable('talhoes');
    await queryInterface.dropTable('fazendas');
    await queryInterface.dropTable('user_modules');
    await queryInterface.dropTable('role_modules');
    await queryInterface.dropTable('company_modules');
    await queryInterface.dropTable('modules');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('usuarios');
    await queryInterface.dropTable('empresas');
  }
};
