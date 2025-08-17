/**
 * Serviço de recomendação de adubação para solo
 * Implementa cálculos básicos de NPK + calagem + gessagem
 */

/**
 * Gera recomendação de adubação baseada na análise de solo
 * @param {Object} amostra - Dados da análise de solo
 * @param {number} objetivo - Objetivo de produtividade em sc/ha
 * @param {Object} parametros - Parâmetros customizáveis
 * @param {Object} user - Usuário que está gerando
 * @returns {Object} Recomendação completa
 */
export function gerarRecomendacao(amostra, objetivo = 150, parametros = {}, user) {
  const params = {
    // Fatores de conversão NPK por sacas/ha
    fator_n_por_saca: 1.6, // kg N por saca
    
    // Faixas de P (mg/dm³) e recomendações P2O5 (kg/ha)
    p_muito_baixo: { max: 6, recomendacao: 120 },
    p_baixo: { max: 15, recomendacao: 90 },
    p_medio: { max: 30, recomendacao: 60 },
    p_alto: { max: 50, recomendacao: 30 },
    p_muito_alto: { recomendacao: 0 },
    
    // Faixas de K (mg/dm³) e recomendações K2O (kg/ha)
    k_muito_baixo: { max: 30, recomendacao: 120 },
    k_baixo: { max: 60, recomendacao: 90 },
    k_medio: { max: 120, recomendacao: 60 },
    k_alto: { max: 180, recomendacao: 30 },
    k_muito_alto: { recomendacao: 0 },
    
    // Parâmetros para calagem
    saturacao_base_objetivo: 70, // % para milho
    
    // Parâmetros para gessagem
    s_muito_baixo: 5, // mg/dm³
    argila_min_gessagem: 30, // %
    gessagem_base: 1.0, // t/ha
    
    ...parametros
  };

  // Cálculo de Nitrogênio
  const N = Math.round(objetivo * params.fator_n_por_saca);

  // Cálculo de P2O5 baseado nos níveis de P
  let P2O5 = params.p_muito_alto.recomendacao;
  if (amostra.p_mehlich <= params.p_muito_baixo.max) {
    P2O5 = params.p_muito_baixo.recomendacao;
  } else if (amostra.p_mehlich <= params.p_baixo.max) {
    P2O5 = params.p_baixo.recomendacao;
  } else if (amostra.p_mehlich <= params.p_medio.max) {
    P2O5 = params.p_medio.recomendacao;
  } else if (amostra.p_mehlich <= params.p_alto.max) {
    P2O5 = params.p_alto.recomendacao;
  }

  // Cálculo de K2O baseado nos níveis de K
  let K2O = params.k_muito_alto.recomendacao;
  if (amostra.k_mehlich <= params.k_muito_baixo.max) {
    K2O = params.k_muito_baixo.recomendacao;
  } else if (amostra.k_mehlich <= params.k_baixo.max) {
    K2O = params.k_baixo.recomendacao;
  } else if (amostra.k_mehlich <= params.k_medio.max) {
    K2O = params.k_medio.recomendacao;
  } else if (amostra.k_mehlich <= params.k_alto.max) {
    K2O = params.k_alto.recomendacao;
  }

  // Cálculo de calagem (método simplificado)
  let calagem_t_ha = 0;
  if (amostra.ctc_cmol && amostra.ca_cmol && amostra.mg_cmol) {
    const saturacao_atual = ((amostra.ca_cmol + amostra.mg_cmol) / amostra.ctc_cmol) * 100;
    if (saturacao_atual < params.saturacao_base_objetivo) {
      // Fórmula simplificada: (V2 - V1) * CTC * f / PRNT
      // Assumindo PRNT de 90% e fator 1
      const necessidade_cmol = amostra.ctc_cmol * (params.saturacao_base_objetivo - saturacao_atual) / 100;
      calagem_t_ha = Math.round((necessidade_cmol * 20 / 1000) * 100) / 100; // Conversão aproximada
    }
  }

  // Cálculo de gessagem
  let gessagem_t_ha = 0;
  if (amostra.s && amostra.argila_pct) {
    if (amostra.s < params.s_muito_baixo && amostra.argila_pct > params.argila_min_gessagem) {
      gessagem_t_ha = params.gessagem_base * (amostra.argila_pct / 40); // Ajuste pela textura
      gessagem_t_ha = Math.round(gessagem_t_ha * 100) / 100;
    }
  }

  return {
    npk_kg_ha: { N, P2O5, K2O },
    calagem_t_ha,
    gessagem_t_ha,
    parametros: {
      ...params,
      objetivo_produtividade: objetivo,
      gerada_em: new Date().toISOString(),
      gerada_por: user.nome
    }
  };
}

/**
 * Interpreta níveis de nutrientes
 */
export function interpretarNivel(valor, tipo) {
  const interpretacoes = {
    p_mehlich: [
      { max: 6, nivel: 'Muito Baixo', cor: '#dc2626' },
      { max: 15, nivel: 'Baixo', cor: '#ea580c' },
      { max: 30, nivel: 'Médio', cor: '#ca8a04' },
      { max: 50, nivel: 'Alto', cor: '#16a34a' },
      { nivel: 'Muito Alto', cor: '#059669' }
    ],
    k_mehlich: [
      { max: 30, nivel: 'Muito Baixo', cor: '#dc2626' },
      { max: 60, nivel: 'Baixo', cor: '#ea580c' },
      { max: 120, nivel: 'Médio', cor: '#ca8a04' },
      { max: 180, nivel: 'Alto', cor: '#16a34a' },
      { nivel: 'Muito Alto', cor: '#059669' }
    ]
  };

  const faixas = interpretacoes[tipo];
  if (!faixas) return { nivel: 'N/A', cor: '#6b7280' };

  for (const faixa of faixas) {
    if (faixa.max && valor <= faixa.max) {
      return faixa;
    }
  }
  
  return faixas[faixas.length - 1]; // Retorna a última faixa (muito alto)
}