'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Master users table for system administrators
    await queryInterface.createTable('master_users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      senha_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('master_admin'),
        allowNull: false,
        defaultValue: 'master_admin'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Organizations table
    await queryInterface.createTable('orgs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      db_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      db_host: {
        type: Sequelize.STRING,
        allowNull: false
      },
      db_port: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      db_user: {
        type: Sequelize.STRING,
        allowNull: false
      },
      db_password_enc: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Organization modules table
    await queryInterface.createTable('org_modules', {
      org_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orgs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      module_key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('orgs', ['slug']);
    await queryInterface.addIndex('org_modules', ['org_id', 'module_key'], { unique: true });
    await queryInterface.addIndex('org_modules', ['module_key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('org_modules');
    await queryInterface.dropTable('orgs');
    await queryInterface.dropTable('master_users');
  }
};