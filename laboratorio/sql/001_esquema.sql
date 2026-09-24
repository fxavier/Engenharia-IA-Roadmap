-- Esquema do «Balcão»: conhecimento, conversas, aprovações e avaliações numa só base de dados.
--
-- PostgreSQL 18 com pgvector 0.8 (adr-0005): a mesma base de dados que a
-- plataforma já opera (RE-02) guarda os vectores, o texto pesquisável, as
-- conversas e — em tabelas criadas pelo `PostgresSaver.setup()` — os
-- checkpoints do LangGraph (adr-0014). Um só backup, uma só política de acesso.
--
-- Corre automaticamente no primeiro arranque do contentor `db` (montado em
-- /docker-entrypoint-initdb.d). É idempotente: pode correr-se outra vez à mão.

CREATE EXTENSION IF NOT EXISTS vector;

-- =================================================================== conhecimento

-- Um documento da base de conhecimento. Os metadados que filtram a pesquisa
-- (`vigente`, `publico`) vivem em colunas, não num JSONB: são indexáveis e o
-- planeador sabe estimá-los (adr-0010).
CREATE TABLE IF NOT EXISTS documentos (
    id          text PRIMARY KEY,                 -- `pol-reembolso`: é o id citado ao cliente
    titulo      text        NOT NULL,
    categoria   text        NOT NULL,
    publico     text        NOT NULL CHECK (publico IN ('cliente', 'interno')),
    vigente     boolean     NOT NULL DEFAULT true, -- false: substituído, nunca citado (RI-05)
    actualizado date,
    hash        char(64)    NOT NULL,             -- SHA-256 do conteúdo: ingestão idempotente (RF-07)
    fonte       text        NOT NULL,
    indexado_em timestamptz NOT NULL DEFAULT now()
);

-- O filtro de todas as pesquisas do cliente é `vigente AND publico = 'cliente'`.
CREATE INDEX IF NOT EXISTS documentos_vigente_publico ON documentos (vigente, publico);

-- Um chunk por linha, com o vector e o texto pesquisável lado a lado.
CREATE TABLE IF NOT EXISTS chunks (
    id               text PRIMARY KEY,           -- `pol-reembolso#0`: estável entre reindexações
    documento_id     text    NOT NULL REFERENCES documentos (id) ON DELETE CASCADE,
    ordem            integer NOT NULL,
    texto            text    NOT NULL,
    -- 768 dimensões: `nomic-embed-text` no laboratório (adr-0007). Em float4 são
    -- 3 KB por linha; ≈ 5,7 MB para os 1 870 chunks de produção. Com halfvec(768)
    -- seria metade, com perda de recall desprezável — fica para quando importar.
    embedding        vector(768) NOT NULL,
    -- O modelo que gerou o vector. Vectores de modelos diferentes não se comparam:
    -- a pesquisa só olha para os do modelo actual, e trocar de modelo é reindexar.
    modelo_embedding text    NOT NULL,
    -- Gerado pela base de dados: nunca fica dessincronizado do texto. O dicionário
    -- `portuguese` faz stemming (Snowball) mas não tira acentos; para isso seria
    -- preciso uma configuração com `unaccent`.
    tsv              tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
    metadados        jsonb   NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (documento_id, ordem)
);

-- HNSW em vez de IVFFlat (adr-0006): não precisa de dados para treinar listas,
-- aguenta inserções sem degradar e dá melhor recall por milissegundo. m = 16 e
-- ef_construction = 64 são os valores por omissão do pgvector — com 1 870
-- vectores não há nada a afinar na construção; afina-se `hnsw.ef_search` na consulta.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
    ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- GIN sobre o tsvector: a metade lexical da pesquisa híbrida (códigos, números, «RB-»).
CREATE INDEX IF NOT EXISTS chunks_tsv_gin ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_documento ON chunks (documento_id);

-- ============================================================ pesquisa híbrida

-- Denso (HNSW, distância de cosseno) + lexical (tsvector, ts_rank_cd), fundidos
-- com Reciprocal Rank Fusion: score = Σ 1 / (k_rrf + posição). O RRF ignora os
-- scores originais — o que permite somar cosseno com ts_rank, que vivem em
-- escalas diferentes (adr-0009). Os filtros estão dentro de cada CTE, antes do
-- LIMIT: um chunk não vigente nunca ocupa um lugar do top-k.
--
-- Chama-se dentro de uma transacção com
--   SET LOCAL hnsw.iterative_scan = relaxed_order;  -- pgvector 0.8: continua a
--   SET LOCAL hnsw.ef_search = 100;                 -- procurar se o filtro esvaziar o top-k
CREATE OR REPLACE FUNCTION pesquisa_hibrida(
    consulta        text,
    consulta_vector vector(768),
    publicos        text[],
    modelo          text,
    k               integer DEFAULT 20,
    k_rrf           integer DEFAULT 60
)
RETURNS TABLE (
    chunk_id         text,
    documento_id     text,
    ordem            integer,
    texto            text,
    titulo           text,
    categoria        text,
    publico          text,
    vigente          boolean,
    actualizado      date,
    modelo_embedding text,
    rank_denso       bigint,
    rank_lexical     bigint,
    score            double precision
)
LANGUAGE sql STABLE
AS $$
WITH denso AS (
    -- Top-k por vector. O ORDER BY ... LIMIT dentro da subconsulta é o que deixa
    -- o planeador usar o índice HNSW; o row_number() é calculado só sobre esses k.
    SELECT s.id, row_number() OVER (ORDER BY s.distancia, s.id) AS pos
    FROM (
        SELECT c.id, c.embedding <=> consulta_vector AS distancia
        FROM chunks c
        JOIN documentos d ON d.id = c.documento_id
        WHERE d.vigente
          AND d.publico = ANY (publicos)
          AND c.modelo_embedding = modelo
        ORDER BY c.embedding <=> consulta_vector
        LIMIT k
    ) s
),
q AS (
    -- Consulta lexical em OU: `plainto_tsquery` faria E entre todos os termos,
    -- e uma pergunta de cliente com seis palavras quase nunca as tem todas num chunk.
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE string_agg(quote_literal(lexema), ' | ')::tsquery END AS tsq
    FROM unnest(tsvector_to_array(to_tsvector('portuguese', consulta))) AS lexema
),
lexical AS (
    SELECT s.id, row_number() OVER (ORDER BY s.rank DESC, s.id) AS pos
    FROM (
        SELECT c.id, ts_rank_cd(c.tsv, q.tsq) AS rank
        FROM chunks c
        JOIN documentos d ON d.id = c.documento_id
        CROSS JOIN q
        WHERE q.tsq IS NOT NULL
          AND c.tsv @@ q.tsq
          AND d.vigente
          AND d.publico = ANY (publicos)
        ORDER BY ts_rank_cd(c.tsv, q.tsq) DESC, c.id
        LIMIT k
    ) s
),
fundido AS (
    SELECT coalesce(dn.id, lx.id) AS id,
           dn.pos AS rank_denso,
           lx.pos AS rank_lexical,
           coalesce(1.0 / (k_rrf + dn.pos), 0) + coalesce(1.0 / (k_rrf + lx.pos), 0) AS score
    FROM denso dn
    FULL OUTER JOIN lexical lx ON lx.id = dn.id
)
SELECT c.id, c.documento_id, c.ordem, c.texto, d.titulo, d.categoria, d.publico, d.vigente,
       d.actualizado, c.modelo_embedding, f.rank_denso, f.rank_lexical, f.score::double precision
FROM fundido f
JOIN chunks c ON c.id = f.id
JOIN documentos d ON d.id = c.documento_id
ORDER BY f.score DESC, c.id
LIMIT k;
$$;

-- ==================================================================== conversas

-- As mensagens aqui já estão mascaradas (RNF-04). O estado do grafo vive nos
-- checkpoints do LangGraph; esta tabela é a vista do produto e do suporte.
CREATE TABLE IF NOT EXISTS conversas (
    id         text PRIMARY KEY,                  -- também é o `thread_id` do LangGraph
    cliente_id text        NOT NULL,
    canal      text        NOT NULL CHECK (canal IN ('app', 'whatsapp')),
    estado     text        NOT NULL DEFAULT 'aberta'
               CHECK (estado IN ('aberta', 'a_aguardar_aprovacao', 'escalada', 'fechada')),
    criada_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversas_cliente ON conversas (cliente_id, criada_em DESC);
-- A retenção de 30 dias (adr-0028) apaga por data de criação.
CREATE INDEX IF NOT EXISTS conversas_criada_em ON conversas (criada_em);

CREATE TABLE IF NOT EXISTS mensagens (
    id          text PRIMARY KEY,
    conversa_id text        NOT NULL REFERENCES conversas (id) ON DELETE CASCADE,
    papel       text        NOT NULL CHECK (papel IN ('cliente', 'assistente')),
    texto       text        NOT NULL,
    citacoes    text[]      NOT NULL DEFAULT '{}',
    intencao    text,
    meta        jsonb       NOT NULL DEFAULT '{}'::jsonb, -- versão do prompt e do modelo, tokens, rota (RNF-06)
    criada_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensagens_conversa ON mensagens (conversa_id, criada_em);

CREATE TABLE IF NOT EXISTS feedback (
    id          text PRIMARY KEY,
    conversa_id text        NOT NULL REFERENCES conversas (id) ON DELETE CASCADE,
    mensagem_id text        NOT NULL REFERENCES mensagens (id) ON DELETE CASCADE,
    util        boolean     NOT NULL,
    comentario  text,
    criado_em   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mensagem_id)                          -- um voto por mensagem; votar outra vez substitui
);

-- Pedidos de aprovação humana (adr-0015). A decisão retoma o grafo interrompido.
CREATE TABLE IF NOT EXISTS aprovacoes (
    id          text PRIMARY KEY,
    conversa_id text        NOT NULL REFERENCES conversas (id) ON DELETE CASCADE,
    cliente_id  text        NOT NULL,
    pedido_id   text        NOT NULL,
    valor_mzn   integer     NOT NULL CHECK (valor_mzn > 0),
    motivo      text        NOT NULL,
    estado      text        NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'aprovada', 'recusada')),
    criada_em   timestamptz NOT NULL DEFAULT now(),
    decidida_em timestamptz,
    revisor     text,
    nota        text,
    CHECK ((estado = 'pendente') = (decidida_em IS NULL))
);
-- A fila do supervisor: só as pendentes, por antiguidade. Índice parcial, pequeno.
CREATE INDEX IF NOT EXISTS aprovacoes_pendentes ON aprovacoes (criada_em) WHERE estado = 'pendente';

-- ==================================================================== avaliações

-- Cada corrida do conjunto dourado fica registada com as versões que avaliou,
-- para comparar a candidata com a que está em produção (adr-0018, RI-04).
CREATE TABLE IF NOT EXISTS corridas_avaliacao (
    id            text PRIMARY KEY,
    conjunto      text        NOT NULL,
    estado        text        NOT NULL CHECK (estado IN ('pendente', 'a_correr', 'concluida', 'falhou')),
    versao_prompt text,
    modelo        text,
    metricas      jsonb,
    gate_ok       boolean,
    erro          text,
    criada_em     timestamptz NOT NULL DEFAULT now(),
    terminada_em  timestamptz
);

-- ==================================================================== retenção

-- Apaga as conversas (e, em cascata, mensagens, feedback e aprovações) com mais
-- de `dias` dias. Os checkpoints do LangGraph têm a sua própria limpeza, pelo
-- mesmo `thread_id`. Corre num job diário.
CREATE OR REPLACE FUNCTION purgar_conversas_expiradas(dias integer DEFAULT 30)
RETURNS integer
LANGUAGE sql
AS $$
    WITH apagadas AS (
        DELETE FROM conversas WHERE criada_em < now() - make_interval(days => dias) RETURNING 1
    )
    SELECT count(*)::integer FROM apagadas;
$$;
