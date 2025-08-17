'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Master#123', saltRounds);
    
    await queryInterface.bulkInsert('master_users', [
      {
        id: queryInterface.sequelize.literal('gen_random_uuid()'),
        email: 'master@agri.local',
        senha_hash: hashedPassword,
        role: 'master_admin',
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('master_users', { email: 'master@agri.local' });
  }
};