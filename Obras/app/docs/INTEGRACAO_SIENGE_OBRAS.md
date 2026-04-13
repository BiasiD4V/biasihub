# Integração Sienge → Supabase: Dados de Obras

**Data:** 04/04/2026

## Objetivo
Garantir que todos os campos relevantes da API Sienge (DetailedEnterprise e Groupings) sejam captados e armazenados no Supabase, permitindo rastreabilidade, análise e evolução futura.

---

## 1. Estrutura de Tabelas

### Tabela `obras` (expandida)
- **sienge_id**: integer — ID da obra no Sienge
- **commercial_name**: string — Nome comercial
- **cnpj**: string — CNPJ do empreendimento
- **enterprise_observation**: string — Observações
- **sienge_type**: string — Tipo (1-4)
- **building_type_id**: integer — ID do tipo de obra
- **building_type_description**: string — Descrição do tipo (já existe como `tipo`)
- **building_appropriation_level**: string — Nível de apropriação
- **building_status**: string — Status da obra
- **building_cost_estimation_status**: string — Status orçamento
- **cost_center_status**: string — Status centro de custo
- **cost_database_id**: integer — ID da base de custos
- **cost_database_description**: string — Descrição da base de custos
- **building_enabled_for_integration**: boolean — Integração orçamentária
- **creation_date**: date — Data de criação
- **modification_date**: date — Data de alteração
- **created_by**: string — Usuário criador
- **modified_by**: string — Usuário alterador
- **company_id**: integer — ID da empresa dona
- **company_name**: string — Nome da empresa (já existe como `cliente`)
- **construction_details**: JSONB — Detalhes construtivos
- **sales_details**: JSONB — Detalhes de vendas
- **accountable**: JSONB — Responsável
- **associated_building**: JSONB — Obra associada
- **associated_cost_centers**: JSONB — Centros de custo associados

### Tabela `obra_unidades` (groupings)
- **obra_id**: UUID — Referência à obra
- **sienge_unit_grouping_id**: integer — ID do agrupamento
- **unit_grouping_description**: string — Nome da unidade/lote
- **order_number**: integer — Ordem
- **description**: string — Descrição
- **expected_occupancy_date**: date
- **legal_occupancy_date**: date
- **real_occupancy_date**: date
- **release_date**: date
- **date_evolution_work**: date
- **number_floors**: integer
- **work_progress_percentage**: numeric
- **value_grouping_description**: string
- **dados_raw**: JSONB — Payload bruto para rastreabilidade

---

## 2. Mapeamento Sienge → Supabase

| Sienge (API)                | Supabase (coluna)                |
|-----------------------------|----------------------------------|
| id                          | sienge_id                        |
| name                        | nome                             |
| commercialName              | commercial_name                  |
| cnpj                        | cnpj                             |
| enterpriseObservation       | enterprise_observation           |
| type                        | sienge_type                      |
| buildingTypeId              | building_type_id                  |
| buildingTypeDescription     | tipo (ou building_type_description) |
| buildingAppropriationLevel  | building_appropriation_level     |
| address                     | endereco                         |
| addressDetails              | cidade, estado                   |
| creationDate                | creation_date                    |
| modificationDate            | modification_date                |
| buildingStatus              | building_status                  |
| buildingCostEstimationStatus| building_cost_estimation_status  |
| costCenterStatus            | cost_center_status               |
| costDatabaseId              | cost_database_id                 |
| costDatabaseDescription     | cost_database_description        |
| buildingEnabledForIntegration| building_enabled_for_integration|
| companyId                   | company_id                       |
| companyName                 | cliente                          |
| constructionDetails         | construction_details (JSONB)     |
| salesDetails                | sales_details (JSONB)            |
| accountable                 | accountable (JSONB)              |
| associatedBuilding          | associated_building (JSONB)      |
| associatedCostCenters       | associated_cost_centers (JSONB)  |
| createdBy                   | created_by                       |
| modifiedBy                  | modified_by                      |

---

## 3. Regras de Integração

- **Chave de sincronização:** sienge_id (único por obra)
- **Detectar alterações:** usar modification_date
- **Paginação:** offset/limit conforme API Sienge
- **Campos JSONB:** armazenar payloads completos para detalhes não estruturados
- **Unidades/Lotes:** popular tabela obra_unidades para cada grouping retornado
- **Status:** manter enums compatíveis com Sienge (ou criar tabelas de domínio)
- **Auditoria:** registrar created_by/modified_by

---

## 4. Exemplo de Payload Sienge → Insert Supabase

```json
{
  "sienge_id": 12345,
  "nome": "Rodoanel Norte - Lote 4",
  "commercial_name": "Rodoanel Norte Trecho 1",
  "cnpj": "12.345.678/0001-90",
  "enterprise_observation": "Obra em atraso por chuva",
  "sienge_type": "1",
  "building_type_id": 7,
  "tipo": "Instalação Elétrica",
  "building_appropriation_level": "0",
  "endereco": "Av. Brasil, 1000, Louveira/SP",
  "cidade": "Louveira",
  "estado": "SP",
  "creation_date": "2024-01-10",
  "modification_date": "2024-03-15",
  "building_status": "IN_PROGRESS",
  "building_cost_estimation_status": "OPENED",
  "cost_center_status": "ACTIVE",
  "cost_database_id": 22,
  "cost_database_description": "Tabela Biasi 2024",
  "building_enabled_for_integration": true,
  "company_id": 99,
  "cliente": "Biasi Engenharia",
  "construction_details": {"metragem": 12000, "padrao": "industrial"},
  "sales_details": null,
  "accountable": {"nome": "Eng. João"},
  "associated_building": null,
  "associated_cost_centers": [{"id": 1, "nome": "CC Principal"}],
  "created_by": "usuario@sienge.com",
  "modified_by": "usuario2@sienge.com"
}
```

---

## 5. Observações
- Campos não previstos podem ser armazenados em JSONB para rastreabilidade.
- Para campos complexos (ex: constructionDetails), preferir JSONB até definição de estrutura fixa.
- Unidades/lotes devem ser sincronizadas sempre que a obra for atualizada.

---

**Responsável:** GitHub Copilot (GPT-4.1)
