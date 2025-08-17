'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const uuid = { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true };
    const uuidFk = { type: Sequelize.UUID, allowNull: false };
    
    // Tabela de amostras de solo
    await queryInterface.createTable('solo_amostras', {
      id: uuid,
      empresa_id: uuidFk,
      talhao_id: { type: Sequelize.UUID, allowNull: true },
      safra_id: { type: Sequelize.UUID, allowNull: true },
      data_coleta: { type: Sequelize.DATE, allowNull: false },
      profundidade_cm: { type: Sequelize.INTEGER, allowNull: true },
      ph: { type: Sequelize.DECIMAL(5,2), allowNull: true },
      p_mehlich: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      k_mehlich: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      ca_cmol: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      mg_cmol: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      s: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      ctc_cmol: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      mo_g_kg: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      argila_pct: { type: Sequelize.DECIMAL(5,2), allowNull: true },
      analitos: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });

    await queryInterface.addIndex('solo_amostras', ['empresa_id', 'data_coleta']);
    await queryInterface.addIndex('solo_amostras', ['empresa_id', 'talhao_id']);

    // Tabela de recomendações
    await queryInterface.createTable('solo_recomendacoes', {
      id: uuid,
      empresa_id: uuidFk,
      amostra_id: uuidFk,
      cultura: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'milho' },
      objetivo_produtividade: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      npk_kg_ha: { type: Sequelize.JSONB, allowNull: false },
      calagem_t_ha: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      gessagem_t_ha: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      parametros: { type: Sequelize.JSONB, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'gerada' },
      gerada_por_user_id: uuidFk,
      gerada_em: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('now()') },
    });

    await queryInterface.addIndex('solo_recomendacoes', ['empresa_id', 'amostra_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('solo_recomendacoes');
    await queryInterface.dropTable('solo_amostras');
  }
};