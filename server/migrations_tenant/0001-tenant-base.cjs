'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uuid = { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true };
    const uuidFk = { type: Sequelize.UUID, allowNull: false };
    const created = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };
    const updated = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };

    // Companies/Farms table
    await queryInterface.createTable('empresas', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false },
      cnpj: { type: Sequelize.STRING, allowNull: true },
      telefone: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      endereco: { type: Sequelize.TEXT, allowNull: true },
      created_at: created,
      updated_at: updated
    });

    // Users table
    await queryInterface.createTable('usuarios', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING, allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      empresa_id: uuidFk,
      created_at: created,
      updated_at: updated
    });

    // Roles table
    await queryInterface.createTable('roles', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      created_at: created,
      updated_at: updated
    });

    // Permissions table
    await queryInterface.createTable('permissions', {
      id: uuid,
      chave: { type: Sequelize.STRING, allowNull: false, unique: true },
      descricao: { type: Sequelize.STRING, allowNull: true },
      created_at: created,
      updated_at: updated
    });

    // User roles junction table
    await queryInterface.createTable('user_roles', {
      user_id: uuidFk,
      role_id: uuidFk,
      created_at: created
    });

    // Role permissions junction table
    await queryInterface.createTable('role_permissions', {
      role_id: uuidFk,
      permission_id: uuidFk,
      created_at: created
    });

    // Modules table (local copy for tenant)
    await queryInterface.createTable('modules', {
      id: uuid,
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: created,
      updated_at: updated
    });

    // Support categories table
    await queryInterface.createTable('suporte_categorias', {
      id: uuid,
      nome: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      empresa_id: uuidFk,
      created_at: created,
      updated_at: updated
    });

    // Support tickets table
    await queryInterface.createTable('suporte_tickets', {
      id: uuid,
      titulo: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.ENUM('aberto', 'em_andamento', 'resolvido', 'fechado'), defaultValue: 'aberto' },
      prioridade: { type: Sequelize.ENUM('baixa', 'media', 'alta', 'critica'), defaultValue: 'media' },
      categoria_id: uuidFk,
      usuario_id: uuidFk,
      empresa_id: uuidFk,
      created_at: created,
      updated_at: updated
    });

    // Refresh tokens table
    await queryInterface.createTable('refresh_tokens', {
      id: uuid,
      user_id: uuidFk,
      valid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: created,
      updated_at: updated
    });

    // Add foreign key constraints
    await queryInterface.addConstraint('usuarios', {
      fields: ['empresa_id'],
      type: 'foreign key',
      name: 'usuarios_empresa_id_fkey',
      references: { table: 'empresas', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'user_roles_user_id_fkey',
      references: { table: 'usuarios', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('user_roles', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'user_roles_role_id_fkey',
      references: { table: 'roles', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('role_permissions', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'role_permissions_role_id_fkey',
      references: { table: 'roles', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('role_permissions', {
      fields: ['permission_id'],
      type: 'foreign key',
      name: 'role_permissions_permission_id_fkey',
      references: { table: 'permissions', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('suporte_categorias', {
      fields: ['empresa_id'],
      type: 'foreign key',
      name: 'suporte_categorias_empresa_id_fkey',
      references: { table: 'empresas', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('suporte_tickets', {
      fields: ['categoria_id'],
      type: 'foreign key',
      name: 'suporte_tickets_categoria_id_fkey',
      references: { table: 'suporte_categorias', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('suporte_tickets', {
      fields: ['usuario_id'],
      type: 'foreign key',
      name: 'suporte_tickets_usuario_id_fkey',
      references: { table: 'usuarios', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('suporte_tickets', {
      fields: ['empresa_id'],
      type: 'foreign key',
      name: 'suporte_tickets_empresa_id_fkey',
      references: { table: 'empresas', field: 'id' },
      onDelete: 'CASCADE'
    });

    await queryInterface.addConstraint('refresh_tokens', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'refresh_tokens_user_id_fkey',
      references: { table: 'usuarios', field: 'id' },
      onDelete: 'CASCADE'
    });

    // Add unique constraints
    await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], { unique: true });
    await queryInterface.addIndex('role_permissions', ['role_id', 'permission_id'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('suporte_tickets');
    await queryInterface.dropTable('suporte_categorias');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('modules');
    await queryInterface.dropTable('usuarios');
    await queryInterface.dropTable('empresas');
  }
};