import type { Section } from '../types';

export const seccoesA: Section[] = [
  /* ==================================================================== 1 */
  {
    id: 'requisitos',
    title: 'Do problema aos requisitos',
    blocks: [
      {
        type: 'p',
        text:
          'Este módulo junta tudo. Não traz técnicas novas: mostra o «Balcão» inteiro como um system design se apresenta a uma equipa ou numa entrevista — requisitos, capacidade, arquitectura de alto nível, desenho detalhado do grafo, da base de dados e da API, as decisões que o moldaram, um turno de ponta a ponta com traço, o laboratório a correr e o relatório de avaliação real que ele produz. No fim, a lista do que falta para ligar isto a clientes a sério.',
      },
      {
        type: 'p',
        text:
          'O ponto de partida é o problema de negócio, não a tecnologia. O suporte do «Chega» trata 1 150 conversas por dia com 14 pessoas, a 42 MZN por conversa e 7 minutos até à primeira resposta. O objectivo é resolver 68% das conversas sem humano, com a primeira palavra em menos de 1,5 s, a menos de 1,00 MZN de modelo por conversa — sem nunca inventar uma política, devolver dinheiro indevido ou deixar um caso de saúde no fluxo automático.',
      },
      {
        type: 'table',
        head: ['Id', 'Requisito', 'Como se mede'],
        rows: [
          ['RF-01', 'Responder a políticas com a fonte citada', '≥ 85% correctas nas 240 perguntas douradas; 100% das respostas factuais com citação válida'],
          ['RF-02', 'Consultar e explicar o estado de um pedido', 'Tool-call accuracy ≥ 92% nas conversas de pedido'],
          ['RF-03', 'Calcular e emitir compensações até 500 MZN, só com confirmação', 'Zero reembolsos sem confirmação; zero acima do limite sem aprovação registada'],
          ['RF-04', 'Escalar quando a política manda, com resumo', '≥ 95% de escalamento correcto'],
          ['RF-05', 'Recusar sem inventar quando a base não tem resposta', '≥ 90% nas 40 perguntas fora de âmbito'],
          ['RNF-01', 'Primeira palavra p95 < 1,5 s; resposta p95 < 5 s', 'Histogramas `balcao_ttft_segundos` e `balcao_resposta_duracao_segundos`'],
          ['RNF-02', 'Custo de modelo < 1,00 MZN por conversa', '`gen_ai.usage.*` × preço, alarme a 1,20'],
          ['RNF-04', 'Nenhuma PII no fornecedor nem nos logs', 'Varrimento diário de logs e traços'],
          ['RNF-05', 'Resistência a prompt injection', '≥ 98% dos 120 ataques inofensivos; 100% das acções acima da política recusadas'],
          ['RNF-06', 'Cada resposta reproduzível e auditável', 'Reexecução a partir do checkpoint e do traço durante 30 dias'],
        ],
        caption: 'Os requisitos que moldam a arquitectura (a lista completa, com restrições e fora de âmbito, está no módulo 1). Cada um tem uma medida — um requisito sem medida é uma opinião.',
      },
      {
        type: 'table',
        head: ['Grandeza', 'Valor', 'Conta'],
        rows: [
          ['Conversas', '1 150/dia · 190/h no pico', '≈ 12% dos 9 421 pedidos diários geram contacto'],
          ['Turnos (mensagens do cliente)', '≈ 3 900/dia · 11/min no pico', '1 150 × 3,4 turnos'],
          ['Chamadas ao modelo', '≈ 7 800/dia', '2 por turno + 0,3 com ferramentas'],
          ['Tokens de entrada', '≈ 20 M/dia', '3 900 × 5 200'],
          ['Custo de modelo', '≈ 760 MZN/dia', '1 150 × 0,66 MZN + classificação'],
          ['Índice vectorial', '≈ 5,7 MB', '1 870 chunks × 768 × 4 bytes'],
          ['Turnos em curso no teste de carga', '≈ 2,6', 'lei de Little: 35/60 × 4,4 s'],
        ],
        caption: 'Estimativas de ordem de grandeza. A conclusão que decide o desenho: não é um problema de escala. É um problema de correcção, de segurança e de custo por conversa.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O que as contas decidem',
        text:
          '5,7 MB de vectores cabem em qualquer PostgreSQL: não há razão para uma base vectorial dedicada (adr-0005). 2,6 turnos em curso cabem num processo: não há razão para filas distribuídas. O esforço de engenharia vai para onde está o risco — avaliação, guardrails, limites de acção, observabilidade — e não para escalar o que não precisa.',
      },
      {
        type: 'p',
        text:
          'Os requisitos não-funcionais pesam tanto como os funcionais, e alguns são restrições duras: equipa de um engenheiro de IA e meio de plataforma (RE-01), uma só base de dados já operada (RE-02), e tudo a correr localmente sem chave de API para desenvolvimento e CI (RE-03). Esta última é a razão de existir o modelo simulado: sem ela, cada PR precisaria de uma chave e de dinheiro para correr os testes.',
      },
      {
        type: 'table',
        head: ['Intenção', 'Peso', 'Caminho', 'Resolução alvo'],
        rows: [
          ['Onde está o meu pedido', '31%', 'ferramenta (`ler_pedido`)', '90%'],
          ['Reembolso ou compensação', '22%', 'agente com aprovação', '70%'],
          ['Pergunta sobre regras', '18%', 'RAG', '85%'],
          ['Pagamentos', '14%', 'agente', '60%'],
          ['Conta e dados pessoais', '6%', 'humano', '40%'],
          ['Saúde, segurança ou fraude', '4%', 'humano, sempre', '0%'],
          ['Outros e fora de âmbito', '5%', 'RAG com recusa', 'recusa correcta ≥ 90%'],
        ],
        caption: 'A tabela que justifica o grafo: cada intenção tem um caminho diferente e um custo diferente. Um agente único para tudo pagaria o preço do caso mais difícil em todos.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          { label: 'Google SRE Book — Service Level Objectives', url: 'https://sre.google/sre-book/service-level-objectives/' },
        ],
      },
    ],
  },

  /* ==================================================================== 2 */
  {
    id: 'hld',
    title: 'Arquitectura de alto nível e as decisões que a moldam',
    blocks: [
      {
        type: 'diagram',
        diagram: {
          title: 'O «Balcão» em produção',
          caption: 'Um serviço Python, uma base de dados, dois fornecedores de modelo e a observabilidade da plataforma. A ingestão é um job à parte; o MCP é opcional.',
          cols: 6,
          rows: 4,
          zones: [
            { id: 'z-canal', label: 'Canais', col: 0, row: 0, colSpan: 1, rowSpan: 4, tone: 'edge' },
            { id: 'z-svc', label: 'Serviço «Balcão» (FastAPI + LangGraph)', col: 1, row: 0, colSpan: 3, rowSpan: 3, tone: 'agente' },
            { id: 'z-dados', label: 'PostgreSQL 18 + pgvector', col: 1, row: 3, colSpan: 3, rowSpan: 1, tone: 'data' },
            { id: 'z-ext', label: 'Externos', col: 4, row: 0, colSpan: 2, rowSpan: 4, tone: 'external' },
          ],
          nodes: [
            { id: 'app', label: 'App e WhatsApp', sub: 'SSE', col: 0, row: 1, kind: 'user' },
            { id: 'sup', label: 'Supervisor', sub: 'aprovações', col: 0, row: 3, kind: 'user' },
            { id: 'api', label: 'API', sub: 'auth, rate limit, SSE', col: 1, row: 1, kind: 'service' },
            { id: 'grafo', label: 'Grafo', sub: 'guardas, router, agente', col: 2, row: 1, kind: 'agent' },
            { id: 'rag', label: 'Retriever híbrido', sub: 'RRF + re-rank', col: 3, row: 0, kind: 'vector' },
            { id: 'tools', label: '12 ferramentas', sub: 'limites no código', col: 3, row: 2, kind: 'tool' },
            { id: 'ing', label: 'Job de ingestão', sub: 'idempotente', col: 2, row: 0, kind: 'queue' },
            { id: 'pg', label: 'chunks · conversas · checkpoints · aprovações', col: 1, row: 3, span: 3, kind: 'data' },
            { id: 'llm', label: 'Fornecedor de modelos', sub: 'pequeno · médio · grande', col: 4, row: 1, kind: 'model' },
            { id: 'plat', label: 'Plataforma de pedidos', sub: 'API interna', col: 4, row: 2, kind: 'external' },
            { id: 'obs', label: 'OTel · Langfuse · Prometheus', col: 5, row: 0, kind: 'service' },
          ],
          edges: [
            { from: 'app', to: 'api', label: 'POST + SSE' },
            { from: 'sup', to: 'api', label: 'decisão', style: 'dashed' },
            { from: 'api', to: 'grafo' },
            { from: 'grafo', to: 'rag' },
            { from: 'grafo', to: 'tools' },
            { from: 'grafo', to: 'llm' },
            { from: 'tools', to: 'plat' },
            { from: 'rag', to: 'pg' },
            { from: 'grafo', to: 'pg', label: 'checkpoints' },
            { from: 'ing', to: 'pg' },
            { from: 'api', to: 'obs', style: 'dashed' },
          ],
        },
      },
      {
        type: 'table',
        head: ['Peça', 'Ficheiro no laboratório', 'Responsabilidade', 'ADR'],
        rows: [
          ['API', '`api/app.py`, `api/rotas.py`', 'Autenticação, SSE, erros RFC 9457, aprovações, feedback', 'adr-0001, adr-0021'],
          ['Grafo', '`grafo.py`', 'Router por intenção, agente com orçamento, interrupt', 'adr-0012, adr-0013, adr-0015'],
          ['Recuperação', '`recuperacao.py`, `sql/001_esquema.sql`', 'HNSW + tsvector, RRF em SQL, re-ranking, filtros', 'adr-0005, adr-0006, adr-0009, adr-0010'],
          ['Cadeia RAG', '`cadeias.py`, `prompts/`', 'Prompt versionado, citações, recusa', 'adr-0011, adr-0023'],
          ['Ferramentas', '`ferramentas.py`', 'cliente_id do contexto, limites, idempotência', 'adr-0015, adr-0020'],
          ['Guardas', '`guardas.py`', 'PII, injecção, validação de citações', 'adr-0020, adr-0028'],
          ['Memória', '`memoria.py`', 'Janela de tokens + resumo', 'adr-0016'],
          ['Modelos', '`modelos.py`, `simulado.py`', 'Fábrica por fornecedor e escalão; simulado para CI', 'adr-0003, adr-0004'],
          ['Avaliação', '`avaliacao/`, `dados/`', 'Conjunto dourado, red team, juiz, gate', 'adr-0018, adr-0019'],
          ['Observabilidade', '`observabilidade.py`', 'Spans gen_ai, métricas Prometheus', 'adr-0025'],
          ['Entrega', '`docker/`, `.github/`', 'Imagem multi-stage, CI com evals, CD com canário', 'adr-0022, adr-0024'],
        ],
      },
      {
        type: 'p',
        text:
          'Os 28 ADRs são o registo de *porque* o sistema é assim. Três deles decidem mais do que os outros e vale a pena lê-los de novo com o sistema inteiro à frente: a arquitectura de orquestração (grafo com router em vez de agente livre), a base de dados (uma só, PostgreSQL com pgvector) e a aprovação humana por interrupt.',
      },
      { type: 'adr', ref: 'adr-0013' },
      { type: 'adr', ref: 'adr-0005' },
      { type: 'adr', ref: 'adr-0015' },
      {
        type: 'compare',
        left: {
          title: 'O que o «Balcão» escolheu',
          items: [
            'Grafo explícito; agente só onde a decisão varia',
            'PostgreSQL para tudo: vectores, texto, conversas, checkpoints',
            'RAG sobre políticas; dados vivos por ferramenta',
            'Limites de acção no código das ferramentas',
            'Evals no CI com modelo simulado; nocturnas com o real',
            'Prompts no repositório, com versão no traço',
          ],
        },
        right: {
          title: 'O que rejeitou, e porquê',
          items: [
            'Agente ReAct com 12 ferramentas: variância e custo em todos os turnos',
            'Base vectorial dedicada: mais um sistema para 5,7 MB',
            'Fine-tuning: o conhecimento muda todas as semanas (adr-0002)',
            'Confiar no prompt para limites: a injecção muda o prompt, não o código',
            'Evals só manuais: «parece bem» não apanha 3 pontos numa intenção',
            'Prompts editáveis em produção sem PR: saltam o gate',
          ],
        },
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O erro clássico: começar pelo agente',
        text:
          'A tentação é ligar um agente às 12 ferramentas e ao retriever, e ir corrigindo o prompt até «funcionar». Funciona na demo e falha em produção de formas difíceis de reproduzir: um caso de saúde tratado como compensação, uma pesquisa de políticas para «onde está o meu pedido», um ciclo de ferramentas às 3 da manhã. Começa pela tabela de intenções e pelos caminhos; o agente entra só onde a tabela diz que a decisão varia de caso para caso.',
      },
      {
        type: 'refs',
        items: [
          { label: 'MADR — Markdown Architectural Decision Records', url: 'https://github.com/adr/madr' },
          { label: 'LangGraph — visão geral', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
          { label: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
        ],
      },
    ],
  },

  /* ==================================================================== 3 */
  {
    id: 'lld',
    title: 'Desenho detalhado: grafo, esquema e API',
    blocks: [
      {
        type: 'p',
        text:
          'O grafo é o coração do desenho. É o `StateGraph` de `grafo.py`, nó a nó: duas guardas a abrir e a fechar, um classificador que combina regras deterministas (saúde e segurança nunca dependem de um modelo acertar) com o modelo pequeno, um router com três destinos, e um subciclo de agente com orçamento de chamadas de ferramentas que sai para a aprovação humana quando o valor passa o limite.',
      },
      {
        type: 'graph',
        graph: {
          id: 'gr-balcao-ponta-a-ponta-01',
          title: 'O grafo do «Balcão» (grafo.py)',
          brief: 'Dez nós. As arestas condicionais são funções Python testadas com asserções, não decisões do modelo.',
          entry: 'inicio',
          nodes: [
            { id: 'inicio', label: 'START', kind: 'inicio', col: 0, row: 1 },
            { id: 'guarda_entrada', label: 'guarda_entrada', sub: 'PII, injecção', kind: 'guarda', col: 1, row: 1, ms: 25 },
            { id: 'classificar', label: 'classificar', sub: 'regras + modelo pequeno', kind: 'router', col: 2, row: 1, ms: 350, tokens: 920 },
            { id: 'responder_rag', label: 'responder_rag', sub: 'cadeia LCEL + retriever', kind: 'retriever', col: 3, row: 0, ms: 925, tokens: 5380 },
            { id: 'agente', label: 'agente', sub: 'modelo médio + bind_tools', kind: 'llm', col: 3, row: 1, ms: 900, tokens: 2107 },
            { id: 'ferramentas', label: 'ferramentas', sub: 'ToolNode + política', kind: 'ferramenta', col: 4, row: 1, ms: 150 },
            { id: 'preparar_aprovacao', label: 'preparar_aprovacao', sub: 'regista, avisa o cliente', kind: 'ferramenta', col: 5, row: 1, ms: 200 },
            { id: 'aguardar_aprovacao', label: 'aguardar_aprovacao', sub: 'interrupt()', kind: 'humano', col: 5, row: 2 },
            { id: 'escalar', label: 'escalar', sub: 'transferir_humano', kind: 'humano', col: 3, row: 2, ms: 250 },
            { id: 'guarda_saida', label: 'guarda_saida', sub: 'citações, PII', kind: 'guarda', col: 6, row: 1, ms: 30 },
            { id: 'resumir', label: 'resumir', sub: 'memória, > 12 mensagens', kind: 'llm', col: 7, row: 0 },
            { id: 'fim', label: 'END', kind: 'fim', col: 7, row: 1 },
          ],
          edges: [
            { from: 'inicio', to: 'guarda_entrada' },
            { from: 'guarda_entrada', to: 'classificar' },
            { from: 'classificar', to: 'responder_rag', cond: 'politica, outros, conta; ou sem pedido' },
            { from: 'classificar', to: 'agente', cond: 'onde-esta, compensacao, pagamentos com pedido' },
            { from: 'classificar', to: 'escalar', cond: 'seguranca, humano' },
            { from: 'agente', to: 'ferramentas', cond: 'tool_calls' },
            { from: 'ferramentas', to: 'agente', cond: 'sem aprovação pendente' },
            { from: 'ferramentas', to: 'preparar_aprovacao', cond: 'precisa_aprovacao' },
            { from: 'agente', to: 'escalar', cond: 'orçamento de ferramentas esgotado', style: 'dashed' },
            { from: 'agente', to: 'guarda_saida', cond: 'resposta final' },
            { from: 'preparar_aprovacao', to: 'aguardar_aprovacao' },
            { from: 'aguardar_aprovacao', to: 'guarda_saida', label: 'Command(resume=...)' },
            { from: 'responder_rag', to: 'guarda_saida' },
            { from: 'escalar', to: 'guarda_saida' },
            { from: 'guarda_saida', to: 'resumir', cond: 'mensagens > 12' },
            { from: 'guarda_saida', to: 'fim' },
            { from: 'resumir', to: 'fim' },
          ],
          channels: [
            { canal: 'messages', tipo: 'list[AnyMessage]', reducer: 'add_messages', nota: 'Junta; uma mensagem com o mesmo id substitui (é assim que a guarda troca o texto por texto mascarado).' },
            { canal: 'intencao', tipo: 'Literal[...]', reducer: 'substitui', nota: 'Decide o router; fica no traço como balcao.intencao.' },
            { canal: 'pedido_id', tipo: 'str | None', reducer: 'substitui', nota: 'Sobrevive entre turnos: «E quando chega?» refere o pedido de antes.' },
            { canal: 'contexto', tipo: 'list[dict]', reducer: 'substitui', nota: 'Documentos vistos neste turno; a guarda de saída só aceita citações daqui.' },
            { canal: 'chamadas_ferramentas', tipo: 'int', reducer: 'substitui', nota: 'Orçamento por turno (6); reposto pela guarda de entrada.' },
            { canal: 'aprovacao', tipo: 'dict | None', reducer: 'substitui', nota: 'O pedido de aprovação pendente; vive no checkpoint enquanto o grafo está parado.' },
            { canal: 'resumo', tipo: 'str', reducer: 'substitui', nota: 'Resumo incremental das mensagens retiradas da janela (adr-0016).' },
          ],
          runs: [
            { label: 'Política: «Posso juntar dois cupões?»', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['responder_rag'], ['guarda_saida'], ['fim']], outcome: 'Resposta com [pol-cupoes]; zero ferramentas.' },
            { label: 'Onde está: «O PD-8842507 ainda vai demorar?»', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['agente'], ['ferramentas'], ['agente'], ['guarda_saida'], ['fim']], outcome: 'Uma chamada a ler_pedido; resposta curta, sem RAG.' },
            { label: 'Reembolso de 2 910 MZN', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['agente'], ['ferramentas'], ['preparar_aprovacao'], ['aguardar_aprovacao']], note: 'O grafo pára no interrupt; o checkpoint fica no PostgreSQL. Horas depois, o supervisor decide e o grafo retoma em aguardar_aprovacao → guarda_saida → END.', outcome: 'Cliente avisado; conversa em a_aguardar_aprovacao.' },
            { label: 'Alergia: «tinha amendoim… está inchado»', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['escalar'], ['guarda_saida'], ['fim']], outcome: 'Regra determinista, sem modelo: urgente, saúde primeiro.' },
          ],
          note: 'O mapa de rotas é código testado em tests/test_grafo.py; a intenção e a trajectória de cada turno ficam no traço e são comparáveis entre versões.',
        },
      },
      { type: 'file', ref: 'src/balcao/grafo.py' },
      {
        type: 'p',
        text:
          'O esquema da base de dados tem quatro grupos de tabelas: conhecimento (`documentos`, `chunks` com `vector(768)` e `tsvector` gerado), conversas (`conversas`, `mensagens`, `feedback`), aprovações e avaliações. Os checkpoints do LangGraph vivem no mesmo PostgreSQL, em tabelas criadas pelo `setup()` do `PostgresSaver`. O `conversa_id` é ao mesmo tempo chave primária de `conversas`, `thread_id` do checkpointer e `gen_ai.conversation.id` dos traços.',
      },
      {
        type: 'code',
        lang: 'sql',
        caption: 'O núcleo do esquema (excerto de sql/001_esquema.sql). Os filtros de vigência e público são colunas indexáveis, não JSONB, e aplicam-se dentro da pesquisa, antes do LIMIT.',
        code: `CREATE TABLE IF NOT EXISTS chunks (
    id               text PRIMARY KEY,           -- pol-reembolso#0: estável entre reindexações
    documento_id     text    NOT NULL REFERENCES documentos (id) ON DELETE CASCADE,
    ordem            integer NOT NULL,
    texto            text    NOT NULL,
    embedding        vector(768) NOT NULL,
    modelo_embedding text    NOT NULL,           -- vectores de modelos diferentes não se comparam
    tsv              tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
    metadados        jsonb   NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (documento_id, ordem)
);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
    ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS chunks_tsv_gin ON chunks USING gin (tsv);

CREATE TABLE IF NOT EXISTS aprovacoes (
    id          text PRIMARY KEY,
    conversa_id text        NOT NULL REFERENCES conversas (id) ON DELETE CASCADE,
    pedido_id   text        NOT NULL,
    valor_mzn   integer     NOT NULL CHECK (valor_mzn > 0),
    estado      text        NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'aprovada', 'recusada')),
    decidida_em timestamptz,
    revisor     text,
    CHECK ((estado = 'pendente') = (decidida_em IS NULL))   -- pendente sem data, decidida com data
);
CREATE INDEX IF NOT EXISTS aprovacoes_pendentes ON aprovacoes (criada_em) WHERE estado = 'pendente';

-- Denso (HNSW) + lexical (tsvector), fundidos com RRF numa só função:
SELECT documento_id, rank_denso, rank_lexical, score
FROM pesquisa_hibrida('reembolso M-Pesa quanto tempo', $1::vector, ARRAY['cliente'], 'nomic-embed-text', 20);`,
      },
      { type: 'file', ref: 'sql/001_esquema.sql' },
      {
        type: 'p',
        text:
          'A API tem uma rota que importa e várias que a servem. `POST /v1/conversas/{conversa_id}/mensagens` corre um turno do grafo e devolve-o por Server-Sent Events com seis tipos de evento: `token`, `ferramenta`, `citacao`, `aprovacao`, `fim` e `erro`. O `cliente_id` sai do token de autenticação e segue no `RunnableConfig` até às ferramentas; nunca vem do corpo do pedido nem do modelo.',
      },
      { type: 'endpoint', ref: 'mensagem-enviar' },
      { type: 'endpoint', ref: 'aprovacao-decidir' },
      {
        type: 'code',
        lang: 'http',
        caption: 'Stream SSE real do laboratório (modelo simulado) para «O PD-8842507 não chegou, quero o reembolso do dinheiro», cliente dev-nelson.',
        code: `POST /v1/conversas/CV-86275a4004b9/mensagens HTTP/1.1
Authorization: Bearer dev-nelson
Content-Type: application/json

{"texto": "O PD-8842507 não chegou, quero o reembolso do dinheiro"}

HTTP/1.1 200 OK
content-type: text/event-stream; charset=utf-8
cache-control: no-cache
x-accel-buffering: no

event: ferramenta
data: {"nome": "calcular_reembolso", "estado": "chamada", "id": "call_9e2be2de392a"}

event: ferramenta
data: {"nome": "calcular_reembolso", "estado": "resultado", "id": "call_9e2be2de392a", "erro": false}

event: token
data: {"texto": "O pedido PD-8842507 tem direito a um reembolso de 2 910 MZN. Como o valor passa o limite que posso aprovar sozinho, um colega vai confirmar; a resposta chega em menos de 4 horas úteis."}

event: aprovacao
data: {"id": "AP-207d28c766", "conversa_id": "CV-86275a4004b9", "cliente_id": "CL-40311", "pedido_id": "PD-8842507", "valor_mzn": 2910, "motivo": "nao_entregue", "estado": "pendente", ...}

event: fim
data: {"mensagem_id": "MS-3a17b79cedbd", "texto": "O pedido PD-8842507 tem direito ...", "substituir": false, "intencao": "compensacao", "citacoes": [], "aprovacao_pendente": true}`,
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — interrupts', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
          { label: 'PostgreSQL — pesquisa de texto', url: 'https://www.postgresql.org/docs/current/textsearch.html' },
          { label: 'HTML Living Standard — Server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
          { label: 'RFC 9457 — Problem Details', url: 'https://www.rfc-editor.org/rfc/rfc9457' },
        ],
      },
    ],
  },

  /* ==================================================================== 4 */
  {
    id: 'turno',
    title: 'Um turno de ponta a ponta',
    blocks: [
      {
        type: 'p',
        text:
          'Segue-se o turno mais completo do sistema: o Nelson escreve que o caril de camarão do PD-8842507 não chegou. O reembolso total são 2 910 MZN (2 700 de artigos, 150 de entrega, 60 de serviço), acima do limite autónomo. O turno atravessa guarda, classificador, agente, ferramenta, aprovação e interrupt — e acaba com o grafo parado à espera de uma pessoa.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-balcao-ponta-a-ponta-01',
          title: 'Reembolso acima do limite: do POST ao interrupt, e da decisão à resposta',
          intro: 'Tempos do orçamento de latência e das ferramentas (p95 de calcular_reembolso: 150 ms).',
          lanes: [
            { id: 'cliente', label: 'Nelson', sub: 'app', kind: 'client' },
            { id: 'api', label: 'API', sub: 'FastAPI, SSE', kind: 'service' },
            { id: 'grafo', label: 'Grafo', sub: 'LangGraph', kind: 'agent' },
            { id: 'llm', label: 'Modelos', sub: 'pequeno, médio', kind: 'model' },
            { id: 'pg', label: 'PostgreSQL', sub: 'checkpoints, aprovações', kind: 'store' },
            { id: 'sup', label: 'Supervisor', kind: 'human' },
          ],
          steps: [
            { from: 'cliente', to: 'api', label: 'POST /mensagens', kind: 'req', ms: 60, detail: 'Token validado; cliente_id = CL-40311 sai do token. Mensagem mascarada e gravada.' },
            { from: 'api', to: 'grafo', label: 'astream(entrada, config)', kind: 'req', detail: 'config: thread_id = conversa_id, cliente_id, recursion_limit = 25, callbacks de observabilidade.', code: 'config = config_de_execucao(conversa_id, cliente_id, cfg, canal="app")\nasync for modo, dados in grafo.astream(entrada, config, stream_mode=["messages", "updates"]):\n    ...', lang: 'python' },
            { from: 'grafo', to: 'grafo', label: 'guarda_entrada: sem PII, injecção 0', kind: 'self', ms: 25 },
            { from: 'grafo', to: 'llm', label: 'classificar: compensacao, PD-8842507', kind: 'req', ms: 350, tokens: 920, detail: 'Regras primeiro («nao chegou» + número de pedido); o modelo pequeno confirma com saída estruturada.' },
            { from: 'grafo', to: 'llm', label: 'agente: decide calcular_reembolso', kind: 'req', ms: 900, tokens: 2107, detail: 'Só as ferramentas da intenção; 2 089 tokens de entrada no laboratório, quase todos sistema e esquemas.' },
            { from: 'grafo', to: 'grafo', label: 'ferramentas: 2 910 MZN, precisa_aprovacao', kind: 'self', ms: 150, detail: 'O valor vem do código da ferramenta, nunca do modelo. precisa_aprovacao = tipo reembolso e valor > 500.' },
            { from: 'grafo', to: 'pg', label: 'preparar_aprovacao: regista AP-…', kind: 'req', ms: 200, detail: 'Idempotente: repetir o nó não cria duas aprovações.' },
            { from: 'grafo', to: 'api', label: 'interrupt({tipo: aprovacao_reembolso, ...})', kind: 'res', detail: 'Checkpoint gravado; o processo pode reiniciar à vontade.' },
            { from: 'api', to: 'cliente', label: 'SSE: token, aprovacao, fim', kind: 'res', detail: 'Conversa passa a a_aguardar_aprovacao; novas mensagens recebem 409 até à decisão.' },
            { from: 'sup', to: 'api', label: 'POST /aprovacoes/AP-…/decisao {aprovado: true}', kind: 'req', detail: 'Horas depois, noutro processo.' },
            { from: 'api', to: 'grafo', label: 'Command(resume={aprovado, revisor})', kind: 'req' },
            { from: 'grafo', to: 'pg', label: 'emitir reembolso aprovado (idempotente)', kind: 'req', detail: 'Chave de idempotência = id da aprovação: um duplo clique do supervisor não paga duas vezes.' },
            { from: 'grafo', to: 'cliente', label: 'mensagem: aprovado, referência RB-…', kind: 'async' },
          ],
          outro: 'TTFT até ao aviso ao cliente: ≈ 60 + 25 + 350 + 900 + 150 + 200 ≈ 1,7 s, sem streaming de tokens porque a mensagem é um template. Este caminho passa o alvo de 1,5 s; aceita-se porque é 22% × uma fracção dos turnos e o texto é determinista — ou gera-se um evento de espera logo após a classificação.',
        },
      },
      {
        type: 'trace',
        trace: {
          id: 'tr-balcao-ponta-a-ponta-01',
          title: 'O traço do turno de reembolso acima do limite',
          brief: 'Durações do orçamento e das ferramentas; tokens do agente medidos no laboratório (2 089 de entrada, 18 de saída numa chamada de ferramenta).',
          spans: [
            { id: 'p', name: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ms: 1720, attrs: [['http.response.status_code', '200'], ['balcao.ttft_ms', '1685']] },
            { id: 'w', parent: 'p', name: 'invoke_workflow balcao', kind: 'no', ms: 1650, attrs: [['gen_ai.operation.name', 'invoke_workflow'], ['gen_ai.conversation.id', 'CV-86275a4004b9'], ['balcao.prompt.versao', 'sistema@1.4.0'], ['balcao.intencao', 'compensacao'], ['balcao.origem', 'aprovacao']] },
            { id: 'g1', parent: 'w', name: 'guarda_entrada', kind: 'guarda', ms: 25, attrs: [['balcao.pii', '0'], ['balcao.injeccao.score', '0']] },
            { id: 'c', parent: 'w', name: 'chat modelo-pequeno', kind: 'llm', ms: 350, tokensIn: 900, tokensOut: 20, attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.output.type', 'json'], ['balcao.classificacao', 'compensacao'], ['balcao.confianca', '0.8']] },
            { id: 'a', parent: 'w', name: 'chat modelo-medio', kind: 'llm', ms: 900, tokensIn: 2089, tokensOut: 18, attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.usage.input_tokens', '2089'], ['gen_ai.usage.output_tokens', '18'], ['gen_ai.response.finish_reasons', 'tool_use']], detail: 'O modelo pediu calcular_reembolso(pedido_id="PD-8842507", motivo="nao_entregue").' },
            { id: 't', parent: 'w', name: 'execute_tool calcular_reembolso', kind: 'ferramenta', ms: 150, attrs: [['gen_ai.operation.name', 'execute_tool'], ['gen_ai.tool.name', 'calcular_reembolso'], ['balcao.valor_mzn', '2910'], ['balcao.precisa_aprovacao', 'true']] },
            { id: 'ap', parent: 'w', name: 'preparar_aprovacao', kind: 'no', ms: 200, attrs: [['balcao.aprovacao.id', 'AP-207d28c766'], ['db.operation.name', 'INSERT']] },
            { id: 'h', parent: 'w', name: 'aguardar_aprovacao (interrupt)', kind: 'humano', ms: 5, status: 'cancelado', attrs: [['balcao.interrupt', 'aprovacao_reembolso'], ['balcao.checkpoint', 'gravado']], detail: 'O span fecha no interrupt; a retoma, horas depois, é outro traço ligado pelo gen_ai.conversation.id.' },
          ],
          note: 'Nenhum span emitir_reembolso neste traço: é a prova de RF-03. O reembolso só aparece no traço da retoma, com o revisor como atributo.',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-balcao-ponta-a-ponta-01',
          title: 'O grafo do «Balcão» em miniatura, com interrupt e retoma',
          brief:
            'O `GrafoEstado` do módulo `balcao` tem a forma da API do LangGraph (nós, arestas condicionais, reducers, checkpointer, interrupt e comando de retoma). O classificador é uma regra e o «agente» chama a ferramenta directamente: é didáctico, para ver a forma. O grafo real está em `grafo.py`.',
          code: `import re
import balcao as b

def guarda_entrada(e):
    texto = e["mensagens"][-1]
    return {"texto": b.mascarar_pii(texto), "injeccao": b.detectar_injeccao(texto)["score"]}

def classificar(e):                      # no laboratório: regras + modelo pequeno
    t = b.normalizar(e["texto"])
    pedido = re.search(r"PD-\\d{7}", e["texto"])
    if re.search(r"alergi|inchad|hospital", t):
        intencao = "seguranca"
    elif pedido and re.search(r"reembols|dinheiro|nao chegou", t):
        intencao = "compensacao"
    elif pedido:
        intencao = "onde-esta"
    else:
        intencao = "politica"
    return {"intencao": intencao, "pedido": pedido.group(0) if pedido else None}

def router(e):
    return {"seguranca": "escalar", "politica": "responder_rag"}.get(e["intencao"], "agente")

def responder_rag(e):
    res = b.recuperar(e["texto"], k=3, metodo="rerank", filtro={"vigente": True})
    return {"resposta": b.ModeloSimulado().gerar(b.montar_prompt_rag(e["texto"], res)).texto}

def agente(e):                           # no laboratório: modelo médio + ToolNode
    if e["intencao"] == "onde-esta":
        p = b.ler_pedido(e["pedido"])
        return {"resposta": f"O pedido {p['pedido']} está {p['estado'].replace('_', ' ')}."}
    return {"calculo": b.calcular_reembolso(e["pedido"], "nao_entregue")}

def depois_agente(e):
    return "aprovacao" if e.get("calculo", {}).get("precisa_aprovacao") else b.END

def aprovacao(e):
    if "__retomar__" not in e:           # nada com efeitos antes da interrupção
        raise b.Interromper({"pedido": e["pedido"], "valor_mzn": e["calculo"]["valor_mzn"]})
    ok = e["__retomar__"]["aprovado"]
    return {"resposta": f"Reembolso de {e['calculo']['valor_mzn']} MZN " + ("aprovado." if ok else "recusado.")}

def escalar(e):
    return {"resposta": "A prioridade é a saúde: procure assistência médica. Passo a um colega com urgência."}

g = b.GrafoEstado(reducers={"mensagens": b.adicionar})
for fn in (guarda_entrada, classificar, responder_rag, agente, aprovacao, escalar):
    g.add_node(fn.__name__, fn)
g.add_edge(b.START, "guarda_entrada").add_edge("guarda_entrada", "classificar")
g.add_conditional_edges("classificar", router)
g.add_conditional_edges("agente", depois_agente)
for n in ("responder_rag", "aprovacao", "escalar"):
    g.add_edge(n, b.END)
cp = b.CheckpointerMemoria()
app = g.compile(checkpointer=cp, max_passos=10)

for fio, msg in [("CV-1", "Posso juntar dois cupões no mesmo pedido?"),
                 ("CV-2", "O meu pedido PD-8842507 ainda vai demorar?"),
                 ("CV-3", "O PD-8842507 não chegou, quero o dinheiro de volta"),
                 ("CV-4", "O prato tinha amendoim e o meu filho está inchado")]:
    passos = []
    for p in app.stream({"mensagens": [msg]}, {"configurable": {"thread_id": fio}}):
        no, act = next(iter(p.items()))
        passos.append(no)
    saida = act if no == "__interrupt__" else cp.ultimo(fio)["estado"]["resposta"][:70]
    print(fio, " → ".join(passos))
    print("    ", saida)
final = app.invoke(b.Comando({"aprovado": True}), {"configurable": {"thread_id": "CV-3"}})
print("CV-3 retomado:", final["resposta"], "· checkpoints:", len(cp.historico("CV-3")))`,
          expected: `CV-1 guarda_entrada → classificar → responder_rag
     Um pedido em grupo junta até 8 pessoas no mesmo carrinho. [faq-pedido-
CV-2 guarda_entrada → classificar → agente
     O pedido PD-8842507 está em preparacao.
CV-3 guarda_entrada → classificar → agente → __interrupt__
     {'pedido': 'PD-8842507', 'valor_mzn': 2910}
CV-4 guarda_entrada → classificar → escalar
     A prioridade é a saúde: procure assistência médica. Passo a um colega
CV-3 retomado: Reembolso de 2910 MZN aprovado. · checkpoints: 5`,
        },
      },
      {
        type: 'p',
        text:
          'Repara na primeira linha de CV-1. A pergunta era sobre cupões e a resposta começa por «Um pedido em grupo junta até 8 pessoas» — uma frase de `faq-pedido-grupo` que o modelo simulado extraiu por partilhar «mesmo pedido». É fiel ao contexto e irrelevante para a pergunta. A API do laboratório, com o modelo simulado, devolve exactamente a mesma resposta em SSE, com os eventos `citacao` para `faq-pedido-grupo` e `pol-cupoes`. É uma falha de geração que só a avaliação de correcção apanha, e aparece no relatório da secção 6.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'O que o interrupt exige em produção',
        text:
          'Três coisas que o exemplo didáctico esconde: o checkpointer tem de ser persistente (`PostgresSaver`), porque a decisão chega horas depois e noutro processo; o nó que chama `interrupt()` corre outra vez desde o início na retoma, por isso nada antes do `interrupt()` pode ter efeitos; e o efeito depois da decisão tem de ser idempotente, porque o supervisor pode clicar duas vezes e a rede pode repetir o pedido.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Retomar com invoke em vez de Command',
        text:
          'Chamar `grafo.invoke({"messages": [...]})` no mesmo `thread_id` de um grafo interrompido não retoma: começa um turno novo por cima do estado pendente. A retoma é `Command(resume=valor)`, e a API do laboratório recusa novas mensagens com 409 enquanto a conversa está `a_aguardar_aprovacao` para que isto nem seja possível.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — persistência e checkpointers', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
          { label: 'LangGraph — human-in-the-loop', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
          { label: 'OpenTelemetry — convenções GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
        ],
      },
    ],
  },
];
