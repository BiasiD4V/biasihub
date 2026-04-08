import 'dotenv/config';
// ETL de Obras Sienge → Supabase
// Data: 2026-04-04
// Autor: GitHub Copilot (GPT-4.1)
//
// Função para importar e atualizar dados de obras e unidades/lotes do Sienge no Supabase
// Requer: axios, @supabase/supabase-js

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Configurações
const SIENGE_API_URL = 'https://api.sienge.com.br/{subdominio}/public/api/v1';
const SIENGE_TOKEN = process.env.SIENGE_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função principal
async function importarObrasSienge() {
  let offset = 0;
  const limit = 100;
  let total = 1;

  while (offset < total) {
    // 1. Buscar lista de obras
    const resp = await axios.get(`${SIENGE_API_URL}/enterprises`, {
      params: { offset, limit },
      headers: { Authorization: `Bearer ${SIENGE_TOKEN}` }
    });
    const { results, resultSetMetadata } = resp.data;
    total = resultSetMetadata.count;

    for (const obra of results) {
      await importarObraDetalhada(obra.id);
    }
    offset += limit;
  }
}

// Importa dados detalhados de uma obra e suas unidades
async function importarObraDetalhada(obraId) {
  // 2. Buscar detalhes da obra
  const { data: obra } = await axios.get(`${SIENGE_API_URL}/enterprises/${obraId}`, {
    headers: { Authorization: `Bearer ${SIENGE_TOKEN}` }
  });

  // 3. Mapear campos para Supabase
  const obraSupabase = mapearObraSiengeParaSupabase(obra);

  // 4. Upsert na tabela obras
  await supabase.from('obras').upsert([obraSupabase], { onConflict: ['sienge_id'] });

  // 5. Buscar e importar unidades/lotes (groupings)
  const { data: groupings } = await axios.get(`${SIENGE_API_URL}/enterprises/${obraId}/groupings`, {
    headers: { Authorization: `Bearer ${SIENGE_TOKEN}` }
  });
  if (Array.isArray(groupings)) {
    for (const unidade of groupings) {
      const unidadeSupabase = mapearUnidadeSiengeParaSupabase(unidade, obraSupabase.id);
      await supabase.from('obra_unidades').upsert([unidadeSupabase], { onConflict: ['sienge_unit_grouping_id', 'obra_id'] });
    }
  }
}

// Mapeia campos DetailedEnterprise → Supabase.obras
function mapearObraSiengeParaSupabase(obra) {
  return {
    sienge_id: obra.id,
    nome: obra.name,
    commercial_name: obra.commercialName,
    cnpj: obra.cnpj,
    enterprise_observation: obra.enterpriseObservation,
    sienge_type: obra.type,
    building_type_id: obra.buildingTypeId,
    tipo: obra.buildingTypeDescription,
    building_appropriation_level: obra.buildingAppropriationLevel,
    endereco: obra.address,
    cidade: obra.addressDetails?.cidade,
    estado: obra.addressDetails?.estado,
    creation_date: obra.creationDate,
    modification_date: obra.modificationDate,
    building_status: obra.buildingStatus,
    building_cost_estimation_status: obra.buildingCostEstimationStatus,
    cost_center_status: obra.costCenterStatus,
    cost_database_id: obra.costDatabaseId,
    cost_database_description: obra.costDatabaseDescription,
    building_enabled_for_integration: obra.buildingEnabledForIntegration,
    company_id: obra.companyId,
    cliente: obra.companyName,
    construction_details: obra.constructionDetails || null,
    sales_details: obra.salesDetails || null,
    accountable: obra.accountable || null,
    associated_building: obra.associatedBuilding || null,
    associated_cost_centers: obra.associatedCostCenters || null,
    created_by: obra.createdBy,
    modified_by: obra.modifiedBy
  };
}

// Mapeia campos UnitGrouping → Supabase.obra_unidades
function mapearUnidadeSiengeParaSupabase(unidade, obraId) {
  return {
    obra_id: obraId,
    sienge_unit_grouping_id: unidade.unitGroupingId,
    unit_grouping_description: unidade.unitGroupingDescription,
    order_number: unidade.orderNumber,
    description: unidade.description,
    expected_occupancy_date: unidade.expectedOccupancyDate,
    legal_occupancy_date: unidade.legalOccupancyDate,
    real_occupancy_date: unidade.realOccupancyDate,
    release_date: unidade.releaseDate,
    date_evolution_work: unidade.dateEvolutionWork,
    number_floors: unidade.numberFloors,
    work_progress_percentage: unidade.workProgressPercentage,
    value_grouping_description: unidade.valueGroupingDescription,
    dados_raw: unidade // Guarda o payload bruto para rastreabilidade
  };
}

// Exemplo de uso
// importarObrasSienge().then(() => console.log('Importação concluída')).catch(console.error);

export { importarObrasSienge };
