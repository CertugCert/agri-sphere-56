'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    // Get tenant provision data from environment (set during provisioning)
    const adminEmail = process.env.TENANT_ADMIN_EMAIL || 'admin@tenant.local';
    const adminPassword = process.env.TENANT_ADMIN_PASSWORD || 'Admin#123';
    const farmName = process.env.TENANT_FARM_NAME || 'Farm Principal';

    // Create company/farm
    const empresaId = queryInterface.sequelize.literal('gen_random_uuid()');
    await queryInterface.bulkInsert('empresas', [
      {
        id: empresaId,
        nome: farmName,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get the actual empresa ID
    const [empresas] = await queryInterface.sequelize.query(`SELECT id FROM empresas WHERE nome = :nome LIMIT 1`, {
      replacements: { nome: farmName }
    });
    const actualEmpresaId = empresas[0].id;

    // Create roles
    const adminRoleId = queryInterface.sequelize.literal('gen_random_uuid()');
    const userRoleId = queryInterface.sequelize.literal('gen_random_uuid()');
    
    await queryInterface.bulkInsert('roles', [
      {
        id: adminRoleId,
        nome: 'admin',
        descricao: 'Administrador do tenant',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: userRoleId,
        nome: 'usuario',
        descricao: 'Usuário comum',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get actual role IDs
    const [roles] = await queryInterface.sequelize.query(`SELECT id, nome FROM roles WHERE nome IN ('admin', 'usuario')`);
    const adminRole = roles.find(r => r.nome === 'admin');
    const userRole = roles.find(r => r.nome === 'usuario');

    // Create permissions
    const permissions = [
      { chave: 'admin.manage', descricao: 'Gerenciar sistema' },
      { chave: 'users.manage', descricao: 'Gerenciar usuários' },
      { chave: 'support.create', descricao: 'Criar tickets de suporte' },
      { chave: 'support.manage', descricao: 'Gerenciar suporte' }
    ];

    for (const perm of permissions) {
      await queryInterface.bulkInsert('permissions', [
        {
          id: queryInterface.sequelize.literal('gen_random_uuid()'),
          chave: perm.chave,
          descricao: perm.descricao,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }

    // Get permission IDs
    const [permResults] = await queryInterface.sequelize.query(`SELECT id, chave FROM permissions`);
    
    // Assign permissions to admin role
    for (const perm of permResults) {
      await queryInterface.bulkInsert('role_permissions', [
        {
          role_id: adminRole.id,
          permission_id: perm.id,
          created_at: new Date()
        }
      ]);
    }

    // Assign basic permissions to user role
    const userPermissions = permResults.filter(p => 
      p.chave === 'support.create'
    );
    
    for (const perm of userPermissions) {
      await queryInterface.bulkInsert('role_permissions', [
        {
          role_id: userRole.id,
          permission_id: perm.id,
          created_at: new Date()
        }
      ]);
    }

    // Create admin user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    const adminUserId = queryInterface.sequelize.literal('gen_random_uuid()');
    await queryInterface.bulkInsert('usuarios', [
      {
        id: adminUserId,
        nome: 'Administrador',
        email: adminEmail,
        senha_hash: hashedPassword,
        ativo: true,
        empresa_id: actualEmpresaId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get actual user ID
    const [users] = await queryInterface.sequelize.query(`SELECT id FROM usuarios WHERE email = :email LIMIT 1`, {
      replacements: { email: adminEmail }
    });
    const actualUserId = users[0].id;

    // Assign admin role to admin user
    await queryInterface.bulkInsert('user_roles', [
      {
        user_id: actualUserId,
        role_id: adminRole.id,
        created_at: new Date()
      }
    ]);

    // Create support categories
    const categorias = [
      { nome: 'Técnico', descricao: 'Problemas técnicos e bugs' },
      { nome: 'Dúvidas', descricao: 'Dúvidas sobre o sistema' },
      { nome: 'Solicitações', descricao: 'Solicitações de novas funcionalidades' }
    ];

    for (const cat of categorias) {
      await queryInterface.bulkInsert('suporte_categorias', [
        {
          id: queryInterface.sequelize.literal('gen_random_uuid()'),
          nome: cat.nome,
          descricao: cat.descricao,
          empresa_id: actualEmpresaId,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }

    // Create modules (local copy - controlled by master)
    const modules = [
      { key: 'solo_adubacao', name: 'Solo e Adubação', description: 'Análises de solo e recomendações' },
      { key: 'suporte', name: 'Suporte', description: 'Sistema de tickets de suporte' },
      { key: 'economico', name: 'Econômico', description: 'Análises econômicas e custos' }
    ];

    for (const mod of modules) {
      await queryInterface.bulkInsert('modules', [
        {
          id: queryInterface.sequelize.literal('gen_random_uuid()'),
          key: mod.key,
          name: mod.name,
          description: mod.description,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('modules', null, {});
    await queryInterface.bulkDelete('suporte_categorias', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('usuarios', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('empresas', null, {});
  }
};