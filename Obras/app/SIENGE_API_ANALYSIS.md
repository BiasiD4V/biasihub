# 📊 Análise da API Sienge — Empreendimentos (Obras)

**Referência**: https://api.sienge.com.br/docs/yaml-files/enterprise-v1.yaml

---

## 🎯 Endpoints Disponíveis

### **1. Listar todos os empreendimentos**
```
GET /enterprises
```

**Retorna**: Lista de obras com metadados de paginação

**Parâmetros**:
- `limit` (int): Máximo 200 resultados (default: 100)
- `offset` (int): Deslocamento para paginação (default: 0)

**Response**:
```json
{
  "resultSetMetadata": {
    "count": 25,        // Total disponível
    "offset": 0,
    "limit": 100
  },
  "results": [
    { /* Enterprise object */ }
  ]
}
```

---

### **2. Buscar empreendimento específico**
```
GET /enterprises/{enterpriseId}
```

**Retorna**: Objeto detalhado da obra

---

### **3. Buscar agrupamentos de unidades**
```
GET /enterprises/{enterpriseId}/groupings
```

**Retorna**: Unidades/agrupamentos da obra (para incorporação imobiliária)

---

## 📋 Dados Disponíveis por Empreendimento

### **A. Informações Básicas**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | int | Código da obra | 12345 |
| `name` | string | Nome oficial | "Edifício Corporate" |
| `commercialName` | string | Nome comercial | "Corporate Tower" |
| `cnpj` | string | CNPJ da empresa | "12.345.678/0001-90" |
| `enterpriseObservation` | string | Observações | "Projeto aprovado Prefeitura" |
| `address` | string | Endereço completo | "Av. Paulista, 1000, São Paulo" |

---

### **B. Classificação da Obra**

| Campo | Tipo | Valores | Descrição |
|-------|------|--------|-----------|
| `type` | string | 1, 2, 3, 4 | **1**: Obra + Centro de custo<br>**2**: Obra<br>**3**: Centro de custo<br>**4**: CC associado a obra |
| `buildingTypeId` | int | - | Código do tipo (residencial, comercial, etc) |
| `buildingTypeDescription` | string | - | Descrição do tipo |
| `buildingAppropriationLevel` | string | 0-4 | **0**: Obra<br>**1**: Célula construtiva<br>**2**: Etapa<br>**3**: Subetapa<br>**4**: Serviço |

---

### **C. Status da Obra**

| Campo | Tipo | Valores | Descrição |
|-------|------|--------|-----------|
| `buildingStatus` | string | Enum | **COST_ESTIMATING**: Orçamento<br>**IN_PROGRESS**: Em andamento<br>**FINISHED_WITH_FINANCIAL_PENDENCIES**: Encerrada c/ pendências<br>**FINISHED_WITHOUT_FINANCIAL_PENDENCIES**: Encerrada s/ pendências |
| `buildingCostEstimationStatus` | string | Enum | **OPENED**: Orçamento aberto<br>**CLOSED**: Orçamento fechado |

---

### **D. Custos e Orçamento**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `costDatabaseId` | int | ID da tabela de custos unitários |
| `costDatabaseDescription` | string | Descrição (ex: "SINAPI 2024") |
| `buildingEnabledForIntegration` | boolean | Habilita integração orçamentária |

---

### **E. Datas Importantes**

| Campo | Tipo | Formato | Descrição |
|-------|------|--------|-----------|
| `creationDate` | string | ISO 8601 (yyyy-MM-dd) | Data de cadastro |
| `modificationDate` | string | ISO 8601 | Última alteração |
| `createdBy` | string | - | Usuário que criou |
| `modifiedBy` | string | - | Último usuário que editou |

---

### **F. Dados de Construção** (se disponível)

```
constructionDetails {
  // Detalhes de construção civil
  // Estrutura não fornecida na documentação
}
```

---

### **G. Dados de Vendas** (se disponível)

```
salesDetails {
  // Detalhes comerciais/vendas
  // Estrutura não fornecida na documentação
}
```

---

### **H. Responsável** (Accountable)

```
accountable {
  // Informações do responsável pela obra
  // Estrutura não fornecida na documentação
}
```

---

### **I. Edifício Associado**

```
associatedBuilding {
  // Referência a obra associada (se houver)
}
```

---

### **J. Centros de Custo Associados**

```
associatedCostCenters [
  // Array de centros de custo vinculados
]
```

---

## 📈 Dados de Agrupamentos de Unidades (Groupings)

Se for **incorporação imobiliária**, a API retorna agrupamentos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `unitGroupingDescription` | string | Nome do agrupamento (ex: "Bloco A") |
| `unitGroupingId` | int | ID único |
| `enterpriseId` | int | Obra associada |
| `orderNumber` | int | Ordem de visualização |

### **Valores do Agrupamento** (ValueGrouping)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `expectedOccupancyDate` | date | Data prevista de ocupação |
| `legalOccupancyDate` | date | Data de ocupação legal |
| `realOccupancyDate` | date | Data de ocupação real |
| `releaseDate` | date | Data de lançamento/venda |
| `dateEvolutionWork` | date | Data base da evolução |
| `numberFloors` | int | Quantidade de pavimentos |
| `workProgressPercentage` | double | Evolução total (%) |

---

## 🔧 Exemplos de Requisições

### **Listar todas as obras**
```bash
curl -X GET "https://api.sienge.com.br/{subdominio}/public/api/v1/enterprises?limit=50&offset=0" \
  -H "Authorization: Bearer {token}"
```

### **Buscar obra específica (ID 12345)**
```bash
curl -X GET "https://api.sienge.com.br/{subdominio}/public/api/v1/enterprises/12345" \
  -H "Authorization: Bearer {token}"
```

### **Buscar agrupamentos de uma obra**
```bash
curl -X GET "https://api.sienge.com.br/{subdominio}/public/api/v1/enterprises/12345/groupings" \
  -H "Authorization: Bearer {token}"
```

---

## 📊 Resposta Exemplo

```json
{
  "resultSetMetadata": {
    "count": 3,
    "offset": 0,
    "limit": 100
  },
  "results": [
    {
      "id": 12345,
      "name": "Edifício Corporate Tower",
      "commercialName": "Corporate Tower",
      "cnpj": "12.345.678/0001-90",
      "enterpriseObservation": "Projeto em andamento, aprovado pela Prefeitura",
      "address": "Av. Paulista, 1000, São Paulo, SP, 01311-100",
      "creationDate": "2023-01-15",
      "modificationDate": "2024-03-20",
      "createdBy": "joao.silva",
      "modifiedBy": "maria.santos",
      "companyId": 5,
      "companyName": "Biasi Engenharia e Instalações",
      "costDatabaseId": 10,
      "costDatabaseDescription": "SINAPI 2024",
      "buildingTypeId": 2,
      "buildingTypeDescription": "Comercial",
      "buildingStatus": "IN_PROGRESS",
      "buildingCostEstimationStatus": "CLOSED",
      "buildingAppropriationLevel": "4",
      "buildingEnabledForIntegration": true,
      "costCenterStatus": null,
      "type": "2"
    }
  ]
}
```

---

## 🎯 Como Integrar no ClaudIA

### **1. Buscar obras do Sienge**
```javascript
async function fetchObrasFromSienge(subdomain, token) {
  const response = await fetch(
    `https://api.sienge.com.br/${subdomain}/public/api/v1/enterprises?limit=100`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )
  return response.json()
}
```

### **2. Passar contexto para ClaudIA**
```javascript
const obraFromSienge = {
  id: 12345,
  nome: 'Edifício Corporate Tower',
  status: 'IN_PROGRESS',
  endereco: 'Av. Paulista, 1000',
  tipo: 'Comercial',
  nivelApropriacao: 4, // Serviço
  dataInicio: '2023-01-15'
}

// Enviar para ClaudIA
const response = await geminiChat('Qual o status desta obra?', {
  obraAtual: obraFromSienge
})
```

### **3. Análise pelo ClaudIA**
ClaudIA pode analisar:
- ✅ Status da obra (em andamento, orçamento, finalizada)
- ✅ Nível de apropriação (obra, célula, etapa, subetapa, serviço)
- ✅ Datas importantes (início, ocupação, liberação)
- ✅ Tipo de construção (residencial, comercial, industrial)
- ✅ Integração com CPM (planejar cronograma baseado em tipo)

---

## ⚠️ Limitações Identificadas

| Limitação | Impacto | Solução |
|-----------|--------|--------|
| Sem datas de início/fim explícitas | Não há data de término na obra | Integrar com API de cronograma do Sienge |
| Sem custo total do projeto | Não há orçamento total | Consultar tabela de custos unitários |
| `constructionDetails` não documentado | Estrutura desconhecida | Testar na API ou documentação completa |
| `salesDetails` não documentado | Dados comerciais não disponíveis | Idem acima |
| Sem informações de recurso/equipe | Não sabe quem trabalha lá | Integrar com API de recursos |

---

## 🔄 Integração Sugerida com ERP Biasi

### **Fluxo Proposto:**

```
Sienge API (Obras)
    ↓
Supabase (tabela: sienge_obras)
    ↓
ERP Biasi (Dashboard Planejamento)
    ↓
ClaudIA (análise contextual)
```

### **Tabela Supabase Sugerida:**

```sql
CREATE TABLE sienge_obras (
  id SERIAL PRIMARY KEY,
  sienge_id INT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  status TEXT,
  endereco TEXT,
  tipo TEXT,
  nivel_apropriacao INT,
  data_cadastro DATE,
  data_modificacao DATE,
  criado_por TEXT,
  modificado_por TEXT,
  cnpj TEXT,
  nome_comercial TEXT,
  habilitada_integracao BOOLEAN,
  atualizado_em TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (sienge_id) REFERENCES sienge_empreendimentos(id)
);
```

---

## 📌 Recomendações

1. **Sincronizar regularmente** obras do Sienge com ERP Biasi
2. **Validar autenticação** do Sienge (Bearer token)
3. **Implementar paginação** para empresas com muitas obras
4. **Cachear resultados** para melhorar performance
5. **Buscar documentação completa** de `constructionDetails` e `salesDetails`
6. **Testar integração** com dados reais da Biasi

---

## 📖 Próximos Passos

- [ ] Implementar autenticação Sienge no ERP Biasi
- [ ] Criar job de sincronização (cron job)
- [ ] Tabela no Supabase para cache de obras
- [ ] Integrar dados no ClaudIA (contexto de obra)
- [ ] Dashboard mostrando obras sincronizadas
- [ ] Alertas quando obra muda de status

---

**Documento de Referência**: Análise da API Sienge v1.0
**Data**: Abril 2026
**Para**: Biasi Engenharia e Instalações
