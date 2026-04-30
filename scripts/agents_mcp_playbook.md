# Operacao Do Agente Via MCP (Supabase)

Este fluxo usa o Supabase como estado compartilhado entre app e agente.

## 1) App registra evento

Tabela: `agente_fila`

Campos minimos:
- `fluxo_id`
- `entidade_tipo`
- `entidade_id`
- `origem = 'app'`
- `payload`
- `status = 'novo'`

## 2) Agente MCP consome fila

O agente deve chamar:

```sql
select * from agent_claim_fila('Agente Comercial MCP', null, 10);
```

Isso marca os itens como `processando` com lock seguro.

## 3) Agente executa e registra historico

Registrar execucao:

```sql
insert into agente_execucoes (
  fila_id, fluxo_id, agente_nome, origem_executor, status, entrada
) values (
  :fila_id, :fluxo_id, 'Agente Comercial MCP', 'mcp', 'iniciado', :entrada_json
);
```

## 4A) Sucesso

Finalizar item:

```sql
select * from agent_finalizar_fila(
  :fila_id,
  'Agente Comercial MCP',
  :resultado_json
);
```

Atualizar execucao:

```sql
update agente_execucoes
set status = 'concluido',
    saida = :resultado_json,
    finalizado_em = timezone('utc', now())
where id = :execucao_id;
```

## 4B) Erro

Marcar erro/reprocesso:

```sql
select * from agent_falhar_fila(
  :fila_id,
  'Agente Comercial MCP',
  :mensagem_erro,
  timezone('utc', now()) + interval '10 minutes'
);
```

Atualizar execucao:

```sql
update agente_execucoes
set status = 'erro',
    erro = :mensagem_erro,
    finalizado_em = timezone('utc', now())
where id = :execucao_id;
```

## 5) App reflete automaticamente

A tela de operacao no Hub escuta realtime de:
- `agente_fluxos`
- `agente_fila`
- `agente_execucoes`
- `agente_acoes`

Sem fallback local, sem seed.
