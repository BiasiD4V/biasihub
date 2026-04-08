# ClaudIA — Base Aldo Mattos
## Planejamento e Controle de Obras

---

## CORE: O que é Planejamento (Aldo Mattos)

> "Planejar é pensar, aplicar, controlar e corrigir a tempo."

**11 Benefícios do Planejamento:**
1. Conhecimento pleno da obra
2. Detecção de situações desfavoráveis
3. Agilidade de decisões
4. Relação com orçamento
5. Otimização da alocação de recursos
6. Referência para acompanhamento
7. Padronização
8. Referência para metas
9. Documentação e rastreabilidade
10. Criação de dados históricos
11. Profissionalismo

---

## CPM/PERT — Método das Flechas

### Passada Direta (Forward Pass)
- **IC (Início Mais Cedo)** — quando a atividade pode começar
- **TC (Término Mais Cedo)** — quando termina: TC = IC + Duração
- **Regra do MÁXIMO**: quando múltiplas predecessoras convergem, usar IC = MAX(TC das predecessoras)

### Passada Reversa (Backward Pass)
- **IT (Início Mais Tarde)** — última hora que pode começar sem atrasar obra
- **TT (Término Mais Tarde)** — TT = IT + Duração
- **Regra do MÍNIMO**: quando múltiplas sucessoras divergem, usar TT = MIN(IT das sucessoras)

### Folgas (Conceito Central)
- **Folga Total (FT)** = IT - IC = TT - TC
  - Quanto posso atrasar sem impactar fim da obra
  - Se FT = 0 → atividade crítica
  - Se FT > 0 → tem margem

- **Folga Livre (FL)** = IC da sucessora - TC da atividade
  - Quanto posso atrasar sem afetar sucessora
  - Mais restritiva que FT

- **Folga Independente (Fi)** = IL - IC
  - Suponha tudo começando tarde, quanto posso atrasar no mais cedo

- **Folga Dependente** = FT - FL

### Caminho Crítico
- Sequência de atividades com FT = 0
- "A corrente é tão forte quanto seu elo mais fraco"
- Não há folga — qualquer atraso atrasa toda obra
- Atividades near-critical: FT ≤ 5% do prazo total ⚠️

---

## Tipos de Dependência (Precedência)

### FS (Finish to Start)
- "Predecessor termina, sucessor começa"
- Mais comum
- Exemplo: Alvenaria FS Reboco

### SS (Start to Start)
- "Começam juntos (com lag opcional)"
- Exemplo: Forma SS Concretagem (pode começar com 2 dias de lag)

### FF (Finish to Finish)
- "Terminam juntos"
- Exemplo: Inspeção FF Liberação (inspeciona até última parte)

### SF (Start to Finish)
- Rara
- "Fim de A coincide com começo de B"

**Lag:** atraso/adiantamento em dias em qualquer tipo de dependência

---

## Duração de Atividades

### Estimativa Paramétrica
```
Duração = Quantidade de Serviço ÷ Produtividade
Duração = 1000 m² ÷ 50 m²/dia = 20 dias
```

### Abordagem Probabilística (PERT)
- **Duração Otimista (O)** — tudo perfeito
- **Duração Pessimista (P)** — tudo ruim (chuva, falta de insumo)
- **Duração Mais Provável (M)** — esperado realista

```
Duração Esperada = (O + 4M + P) / 6
Desvio Padrão σ = (P - O) / 6
Variância σ² = [(P - O) / 6]²
```

**Probabilidade de Prazo:**
```
Z = (Prazo Desejado - Prazo Esperado) / σ
```
- Z ≥ 2.0 = ~95% chance de cumprir (bom)
- Z < 1.0 = risco alto

---

## Valor Agregado (EVM) — Aldo Mattos Cap 18

### Definições
- **VP (Valor Previsto)** — quanto deveria estar executado até hoje
- **VA (Valor Agregado)** — quanto realmente foi executado
- **CR (Custo Real)** — quanto foi gasto

### Índices (Indicadores de Desempenho)
```
IDC = VA / CR  (Índice Desempenho Custo)
  > 1.0 = eficiente em custo
  < 1.0 = gastando mais que o agregado

IDP = VA / VP  (Índice Desempenho Prazo)
  > 1.0 = adiantado
  < 1.0 = atrasado
  valor típico de risco: 0.80 (apenas 80% do planejado realizado)
```

### Projeções
```
Orçamento no Término (ONT) = Orçamento ÷ IDC
Estimativa para o Término (EPT) = (ONT - VA) / IDC
Estimativa no Término (ENT) = CR + EPT
Variação no Término = Orçamento - ENT
```

---

## Cronograma Gantt

**Estrutura:**
- Eixo horizontal: tempo (dias corridos ou úteis)
- Eixo vertical: atividades (hierarquicamente)
- Barra: duração da atividade
- Linha de progresso: data de corte do acompanhamento

**Integração Gantt-PERT/CPM:**
- Atividades no caminho crítico: cor diferente (vermelho)
- Atividades com folga: outra cor (azul)
- Precedências mostradas como "conectores"

**Marcos (Milestones):**
- Pontos-chave: início obra, recebimento insumo, etapas de faturamento
- Duração zero, apenas uma linha vertical

---

## Linha de Base (Baseline)

**Conceito crítico de Aldo Mattos:**
- Planejamento original aprovado que será a referência
- Nunca deletar — sempre manter histórico
- Comparar: Realizado vs Previsto (da baseline)
- Se desvios grandes: replanejar e criar nova baseline

**Etapas Acompanhamento:**
1. Aferir o realizado (levantamento de campo)
2. Comparar com previsto (da baseline)
3. Calcular desvios (prazo, custo, qualidade)
4. Identificar tendências
5. Tomar ações corretivas
6. Replanear se necessário

---

## Ciclo PDCA (Aldo Cap 3)

**P (Planejar):**
- Estrutura Analítica (EAP)
- Definiçao de atividades
- Estimativas de duração
- Sequência lógica
- Recursos

**D (Desempenhar):**
- Executar conforme planejado
- Informar equipes
- Registrar avanços

**C (Checar):**
- Aferir o que foi executado
- Comparar previsto vs realizado
- Calcular indicadores (IDP, IDC)

**A (Agir):**
- Análise de desvios
- Ações corretivas
- Replanear se necessário
- Ou: aproveitar para acelerar

**Ciclo é contínuo: PDCA → PDCA → PDCA até fim da obra**

---

## Aceleração (Aldo Cap 17)

**Fundamentos:**
- Custo Direto: aumenta com duração (mobilização)
- Custo Indireto: diminui com duração (salários admin, juros)
- Custo Total: U invertido (curva tempo-custo)

**Estratégias:**
1. Aumentar equipe (mais gente, menos dias)
2. Turno adicional (noite)
3. Substituir método (mais rápido, mais caro)
4. Paralelizar atividades (usar folga)
5. Comprimir caminho crítico

**Custo Marginal de Aceleração:**
```
Custo/dia acelerado = (Custo Crash - Custo Normal) / (Dias Normais - Dias Crash)
```

**Never crash atividades com grande folga** — foco no crítico

---

## Corrente Crítica (CCPM) — Aldo Cap 19

**Diferença CPM vs CCPM:**
- CPM: foco em caminho de atividades
- CCPM: foco em **recursos** limitados

**Passos:**
1. Remover folgas individuais das atividades (redução de 50%)
2. Identificar caminho crítico baseado em recursos
3. Colocar pulmão antes da conclusão (buffer compartilhado)
4. Acompanhar por consumo de buffer (não por datas)

**3 Pulmões:**
- **Pulmão de Projeto** — antes da conclusão (absorve crítico)
- **Pulmão de Alimentação** — antes do crítico (alimentação não late)
- **Pulmão de Recursos** — quando há restrição

---

## Linha de Balanço (Aldo Cap 20)

**Uso:**
- Obras lineares: estradas, oleodutos, prédios idênticos
- Mostra progressão de operação vs operação

**Eixos:**
- Horizontal: km de obra (ou unidades)
- Vertical: tempo

**Curva:** inclina conforme ritmo de execução

---

## Boas Práticas Aldo Mattos

### Oportunidade Construtiva vs Destrutiva
- **Construtiva**: início da obra, mudanças custam pouco
- **Destrutiva**: final, alterações são caríssimas

### "Tocador de Obras" vs "Gerente"
- Tocador: experiência, improviso, rápido
- Gerente: planejado, sistemático, controlado
- Brasil valoriza tocador; países desenvolvidos: gerente

### Planejamento Deficiente — 3 Causas
1. Visto como "atividade de 1 setor técnico" (não gerencial)
2. Descredibilidade por incerteza nos parâmetros (premissas)
3. Planejamento excessivamente informal

### Melhorias Contínuas
- **Banco de dados de produtividade**: cada obra alimenta futuros planos
- **Reuniões de acompanhamento**: doutrinam equipe
- **Indicadores de desempenho**: premiação/detecção de desvios

---

## Frases-Chave Aldo Mattos

1. *"Quem um dia trabalha em obra planejada nunca mais se acostuma a trabalhar sem planejamento."*

2. *"Planejamento sem controle não existe; o binômio é indissociável."*

3. *"Quanto mais cedo o gestor intervir, melhor."*

4. *"A corrente é tão forte quanto seu elo mais fraco."* (caminho crítico)

5. *"Planejar é pensar, aplicar, controlar e corrigir a tempo."*

6. *"A obra é um sistema mutável e dinâmico."*

---

## Integração ERP Biasi

**Na prática:**
- EAP → Hierarquia de atividades (planejamento_eap)
- Atividades → Duração + Predecessoras (planejamento_atividades + planejamento_predecessoras)
- CPM → Cálculo IC/TC/IT/TT + Folgas (calcCPM.js)
- Baseline → Estado congelado quando aprovado
- Acompanhamento → Progresso vs Baseline (PDCA)
- EVM → VP/VA/CR → IDC/IDP (Dashboard)
- Curva S → Valor Previsto vs Agregado (gráfico)

---

**É isso. ClaudIA agora fala Aldo Mattos.**
