import type { Endpoint } from '../types';

/** Junta linhas num bloco JSON (ou SSE) legível sem recorrer a template strings. */
const j = (...linhas: string[]): string => linhas.join('\n');

/** Corpo `application/problem+json` (RFC 9457), com `type` relativo à API. */
const problema = (tipo: string, titulo: string, status: number, detalhe: string, instancia: string, extra: string[] = []): string =>
  j(
    '{',
    `  "type": "/problemas/${tipo}",`,
    `  "title": "${titulo}",`,
    `  "status": ${status},`,
    `  "detail": "${detalhe}",`,
    `  "instance": "${instancia}"${extra.length ? ',' : ''}`,
    ...extra.map((l, i) => `  ${l}${i < extra.length - 1 ? ',' : ''}`),
    '}',
  );

const SERVICO = 'balcao-api';

/**
 * A API do «Balcão»: um serviço FastAPI atrás da API Gateway do «Chega».
 *
 * Três públicos: a aplicação e o conector de WhatsApp (conversas, com o token do cliente), o suporte
 * (aprovações e depuração da pesquisa, com o token de suporte) e a plataforma (ingestão, avaliações,
 * saúde e métricas, com tokens de serviço ou sem autenticação na rede interna). Todos os erros saem
 * em `application/problem+json` (RFC 9457); os POST com efeito aceitam `Idempotency-Key`.
 */
export const ENDPOINTS: Endpoint[] = [
  /* ================================================================ conversas */
  {
    id: 'conversa-criar',
    service: SERVICO,
    method: 'POST',
    path: '/v1/conversas',
    summary: 'Abrir uma conversa',
    description:
      'Cria uma conversa para o cliente autenticado e devolve o `conversa_id`, que é também o `thread_id` do grafo e a chave dos checkpoints. ' +
      'O canal e, opcionalmente, o pedido de que se vai falar ficam no estado inicial: quando a aplicação abre o suporte a partir de um pedido, o assistente já sabe de que pedido se trata e não pergunta.',
    auth: 'bearer:cliente',
    idempotent: true,
    p95: 80,
    params: [
      { name: 'Authorization', in: 'header', type: 'string', required: true, desc: '`Bearer <jwt>` emitido pela autenticação do Chega; o `cliente_id` sai do `sub`, nunca do corpo.' },
      { name: 'Idempotency-Key', in: 'header', type: 'string', required: false, desc: 'Repetir a mesma chave durante 24 h devolve a mesma conversa em vez de criar outra (reconexões da aplicação).' },
      { name: 'canal', in: 'body', type: "'app' | 'whatsapp'", required: true, desc: 'Canal de origem; muda o formato das respostas (WhatsApp não mostra citações como ligações).' },
      { name: 'pedido_id', in: 'body', type: 'string', required: false, desc: 'Pedido de contexto, formato `PD-\\d{7}`. Validado contra o cliente do token.' },
    ],
    requestSample: j('{', '  "canal": "app",', '  "pedido_id": "PD-8841990"', '}'),
    responses: [
      {
        status: 201,
        desc: 'Conversa criada. `Location` aponta para `/v1/conversas/{conversa_id}`.',
        sample: j('{', '  "conversa_id": "cv-01K5T2M8QZ",', '  "canal": "app",', '  "pedido_id": "PD-8841990",', '  "criada_em": "2026-09-19T21:40:12+02:00",', '  "estado": "aberta"', '}'),
      },
      {
        status: 404,
        desc: 'O `pedido_id` não existe ou não é deste cliente (a mesma resposta nos dois casos).',
        sample: problema('pedido-nao-encontrado', 'Pedido não encontrado', 404, 'O pedido PD-8841999 não existe ou não pertence a este cliente.', '/v1/conversas'),
      },
      {
        status: 422,
        desc: 'Corpo inválido (canal desconhecido, `pedido_id` com formato errado).',
        sample: problema('validacao', 'Pedido inválido', 422, 'canal: tem de ser app ou whatsapp.', '/v1/conversas', ['"errors": [{ "loc": ["body", "canal"], "msg": "Input should be \'app\' or \'whatsapp\'" }]']),
      },
    ],
    notes: [
      'O `conversa_id` é o `thread_id` do LangGraph: `config = {"configurable": {"thread_id": conversa_id}}`. Uma só chave liga API, checkpoints e traços.',
      'Criar a conversa não chama nenhum modelo: é uma escrita no PostgreSQL, por isso o p95 baixo.',
    ],
  },
  {
    id: 'mensagem-enviar',
    service: SERVICO,
    method: 'POST',
    path: '/v1/conversas/{conversa_id}/mensagens',
    summary: 'Enviar uma mensagem e receber a resposta em streaming (SSE)',
    description:
      'O turno inteiro do «Balcão»: guardas de entrada, classificação, router, pesquisa ou ferramentas, resposta do modelo médio e guardas de saída. ' +
      'Responde em `text/event-stream` com eventos nomeados: `ferramenta` (início e fim de cada chamada), `token` (texto incremental), `citacao` (cada fonte validada), ' +
      '`fim` (resumo do turno com tokens e traço) e `erro`. O orçamento põe o primeiro `token` aos ≈ 1,36 s e o fim do turno aos ≈ 4,4 s.',
    auth: 'bearer:cliente',
    idempotent: true,
    stream: true,
    p95: 5000,
    params: [
      { name: 'conversa_id', in: 'path', type: 'string', required: true, desc: 'Conversa do cliente autenticado.' },
      { name: 'Idempotency-Key', in: 'header', type: 'string', required: true, desc: 'Obrigatória: um reenvio da mesma mensagem (rede móvel instável) não corre o turno duas vezes. Com a mesma chave, o servidor devolve de novo o resultado do turno já concluído.' },
      { name: 'Accept', in: 'header', type: 'string', required: false, desc: '`text/event-stream`. Com `application/json`, o servidor espera pelo fim e devolve a resposta inteira (usado pelo conector de WhatsApp).' },
      { name: 'texto', in: 'body', type: 'string', required: true, desc: 'Mensagem do cliente, até 2 000 caracteres. É mascarada (PII) antes de chegar ao modelo, aos logs e ao traço.' },
    ],
    requestSample: j('{', '  "texto": "A pizza do PD-8841990 chegou com quase uma hora de atraso. Isto não pode ser."', '}'),
    responses: [
      {
        status: 200,
        desc: 'Fluxo SSE. Cada evento tem `id` sequencial; um `: ping` a cada 15 s mantém a ligação aberta através de proxies.',
        sample: j(
          'event: ferramenta',
          'id: 1',
          'data: {"nome": "ler_pedido", "estado": "inicio"}',
          '',
          'event: ferramenta',
          'id: 2',
          'data: {"nome": "ler_pedido", "estado": "fim", "ok": true}',
          '',
          'event: ferramenta',
          'id: 3',
          'data: {"nome": "calcular_reembolso", "estado": "fim", "ok": true}',
          '',
          'event: token',
          'id: 4',
          'data: {"texto": "Lamento o atraso. O pedido chegou 53 minutos depois do tempo prometido, "}',
          '',
          'event: token',
          'id: 5',
          'data: {"texto": "por isso tem direito a um cupão de 200 MZN ou ao reembolso da taxa de entrega (60 MZN) "}',
          '',
          'event: citacao',
          'id: 6',
          'data: {"doc": "pol-atraso-compensacao", "titulo": "Compensação por atraso"}',
          '',
          'event: token',
          'id: 7',
          'data: {"texto": "[pol-atraso-compensacao]. Qual prefere?"}',
          '',
          ': ping',
          '',
          'event: fim',
          'id: 8',
          'data: {"mensagem_id": "mg-01K5T2P4VA", "intencao": "compensacao", "caminho": "agente",',
          'data:  "aguarda": "confirmacao", "tokens_entrada": 5210, "tokens_saida": 64, "tokens_cache": 2000,',
          'data:  "ttft_ms": 1340, "traco_id": "4bf92f3577b34da6a3ce929d0e0e4736"}',
        ),
      },
      {
        status: 404,
        desc: 'A conversa não existe ou é de outro cliente. Antes do primeiro byte, os erros ainda saem com código HTTP.',
        sample: problema('conversa-nao-encontrada', 'Conversa não encontrada', 404, 'A conversa cv-01K5T2M8QZ não existe ou não pertence a este cliente.', '/v1/conversas/cv-01K5T2M8QZ/mensagens'),
      },
      {
        status: 409,
        desc: 'Já há um turno a correr nesta conversa, ou a conversa está suspensa à espera de aprovação humana.',
        sample: problema('turno-em-curso', 'Turno em curso', 409, 'A conversa aguarda a decisão da aprovação AP-20417.', '/v1/conversas/cv-01K5T2M8QZ/mensagens', ['"aprovacao_id": "AP-20417"']),
      },
      {
        status: 429,
        desc: 'Rate limit por cliente ou orçamento de tokens da conversa esgotado. Traz `Retry-After`.',
        sample: problema('limite-excedido', 'Demasiadas mensagens', 429, 'Limite de mensagens por minuto atingido para este cliente.', '/v1/conversas/cv-01K5T2M8QZ/mensagens', ['"retry_after_s": 20']),
      },
    ],
    notes: [
      'Depois do primeiro byte o código HTTP já foi enviado (200): uma falha a meio chega como `event: erro` com um corpo RFC 9457 no `data`, e o cliente mostra a mensagem de recurso.',
      'O servidor verifica `await request.is_disconnected()` entre eventos e cancela a geração quando o cliente fecha a aplicação: tokens que ninguém lê também se pagam.',
      'O guarda de saída corre por frase: o evento `citacao` só é emitido depois de validar que o documento estava no contexto e é público. Uma citação inválida remove a frase antes de ela sair.',
      'Desligar o buffering na gateway (`X-Accel-Buffering: no` quando há nginx) é obrigatório; sem isso o TTFT medido no cliente fica igual à duração do turno.',
      'Com o thread suspenso num `interrupt`, a mensagem não corre o grafo: devolve 409 com a aprovação pendente.',
    ],
  },
  {
    id: 'conversa-ler',
    service: SERVICO,
    method: 'GET',
    path: '/v1/conversas/{conversa_id}',
    summary: 'Ler uma conversa: mensagens, estado e aprovações pendentes',
    description:
      'Devolve as mensagens (já mascaradas), a intenção do último turno, o pedido em contexto, se há aprovação pendente, e o id do último traço. ' +
      'A aplicação usa-o para reabrir uma conversa; o suporte usa-o (com o seu token) para ler uma conversa escalada sem perguntar nada ao cliente.',
    auth: 'bearer',
    idempotent: true,
    p95: 120,
    params: [
      { name: 'conversa_id', in: 'path', type: 'string', required: true, desc: 'Identificador da conversa.' },
      { name: 'incluir_estado', in: 'query', type: 'boolean', required: false, desc: 'Só com token de suporte: inclui o estado do grafo no último checkpoint (resumo, campos estruturados, próximo nó).' },
    ],
    responses: [
      {
        status: 200,
        desc: 'Conversa encontrada.',
        sample: j(
          '{',
          '  "conversa_id": "cv-01K5T2M8QZ",',
          '  "canal": "app",',
          '  "pedido_id": "PD-8841990",',
          '  "estado": "resolvida",',
          '  "mensagens": [',
          '    { "quem": "cliente", "texto": "A pizza do PD-8841990 chegou com quase uma hora de atraso. Isto não pode ser." },',
          '    { "quem": "balcao", "texto": "Lamento o atraso. [...] Qual prefere?", "citacoes": ["pol-atraso-compensacao"] },',
          '    { "quem": "cliente", "texto": "O cupão." },',
          '    { "quem": "balcao", "texto": "Feito: o cupão de 200 MZN já está na sua conta [...]", "citacoes": ["pol-cupoes"] }',
          '  ],',
          '  "aprovacao_pendente": null,',
          '  "ultimo_traco_id": "0af7651916cd43dd8448eb211c80319c"',
          '}',
        ),
      },
      {
        status: 404,
        desc: 'Não existe ou não é visível para este token.',
        sample: problema('conversa-nao-encontrada', 'Conversa não encontrada', 404, 'A conversa cv-01K5T2M8QZ não existe ou não pertence a este cliente.', '/v1/conversas/cv-01K5T2M8QZ'),
      },
    ],
    notes: [
      'Auth `bearer` genérico: um token de cliente só vê as suas conversas; um token de suporte vê qualquer uma e pode pedir `incluir_estado`.',
      'Conversas com mais de 30 dias devolvem 404: checkpoints, mensagens e traços são apagados pela retenção (adr-0028).',
    ],
  },
  {
    id: 'feedback-enviar',
    service: SERVICO,
    method: 'POST',
    path: '/v1/conversas/{conversa_id}/feedback',
    summary: 'Registar o polegar para cima ou para baixo de uma resposta',
    description:
      'Guarda a avaliação do cliente sobre uma mensagem do assistente e liga-a ao traço dessa mensagem (Langfuse `score`), com a versão do prompt e do modelo. ' +
      'É a métrica de satisfação (alvo ≥ 84% de polegares para cima) e uma fonte de candidatos a novas perguntas douradas.',
    auth: 'bearer:cliente',
    idempotent: true,
    p95: 60,
    params: [
      { name: 'conversa_id', in: 'path', type: 'string', required: true, desc: 'Conversa do cliente.' },
      { name: 'mensagem_id', in: 'body', type: 'string', required: true, desc: 'Mensagem do assistente avaliada (vem no evento `fim`).' },
      { name: 'positivo', in: 'body', type: 'boolean', required: true, desc: 'Polegar para cima (`true`) ou para baixo.' },
      { name: 'comentario', in: 'body', type: 'string', required: false, desc: 'Texto livre até 500 caracteres; mascarado antes de guardar.' },
    ],
    requestSample: j('{', '  "mensagem_id": "mg-01K5T2P4VA",', '  "positivo": true', '}'),
    responses: [
      { status: 204, desc: 'Registado. Repetir para a mesma mensagem substitui o anterior (último vence).' },
      {
        status: 404,
        desc: 'Mensagem não pertence a esta conversa.',
        sample: problema('mensagem-nao-encontrada', 'Mensagem não encontrada', 404, 'A mensagem mg-01K5T2P4VA não pertence à conversa cv-01K5T2M8QZ.', '/v1/conversas/cv-01K5T2M8QZ/feedback'),
      },
    ],
    notes: [
      'Idempotente por natureza (último vence por `mensagem_id`), por isso não precisa de `Idempotency-Key`.',
      'Um polegar para baixo com comentário entra na fila de revisão semanal de 100 conversas do suporte.',
    ],
  },

  /* ============================================================ conhecimento */
  {
    id: 'pesquisa',
    service: SERVICO,
    method: 'POST',
    path: '/v1/pesquisa',
    summary: 'Depurar a recuperação: correr a pesquisa híbrida e ver scores por fase',
    description:
      'Corre exactamente o mesmo código de recuperação do grafo e devolve os candidatos com o score de cada fase (denso, BM25, RRF, re-ranking), os metadados de cada chunk e o que o filtro retirou. ' +
      'Serve para o suporte perceber porque é que o assistente citou (ou não) um documento, e para o engenheiro comparar métodos sem montar um notebook.',
    auth: 'bearer:suporte',
    idempotent: true,
    p95: 400,
    params: [
      { name: 'consulta', in: 'body', type: 'string', required: true, desc: 'Texto a pesquisar.' },
      { name: 'k', in: 'body', type: 'integer', required: false, desc: 'Resultados finais, 1 a 20. Por omissão 5.' },
      { name: 'metodo', in: 'body', type: "'denso' | 'bm25' | 'hibrido' | 'rerank'", required: false, desc: 'Por omissão `rerank`, o que o grafo usa.' },
      { name: 'filtro', in: 'body', type: 'object', required: false, desc: 'Metadados, por exemplo `{"vigente": true, "publico": "cliente"}`. Por omissão, o filtro de produção.' },
    ],
    requestSample: j('{', '  "consulta": "Quanto tempo demora a devolução do dinheiro no M-Pesa?",', '  "k": 3,', '  "metodo": "rerank",', '  "filtro": { "vigente": true }', '}'),
    responses: [
      {
        status: 200,
        desc: 'Resultados por ordem final, com o texto do chunk e o score de cada fase.',
        sample: j(
          '{',
          '  "metodo": "rerank",',
          '  "resultados": [',
          '    { "chunk": "pol-reembolso-prazos#0", "doc": "pol-reembolso-prazos", "vigente": true, "publico": "cliente", "rrf": 0.03279, "rerank": 0.71 },',
          '    { "chunk": "pol-reembolso-prazos#1", "doc": "pol-reembolso-prazos", "vigente": true, "publico": "cliente", "rrf": 0.03175, "rerank": 0.52 },',
          '    { "chunk": "pol-reembolso#1", "doc": "pol-reembolso", "vigente": true, "publico": "cliente", "rrf": 0.03226, "rerank": 0.49 }',
          '  ],',
          '  "filtrados": [{ "doc": "pol-reembolso-2025", "motivo": "vigente = false" }],',
          '  "ms": { "embedding": 58, "sql": 41, "rerank": 172 }',
          '}',
        ),
      },
      {
        status: 403,
        desc: 'Token sem papel de suporte.',
        sample: problema('sem-permissao', 'Sem permissão', 403, 'Este endpoint exige o papel suporte.', '/v1/pesquisa'),
      },
    ],
    notes: [
      'Scores ilustrativos: os valores reais dependem do modelo de embeddings e do re-ranker em produção. O que se lê aqui é a ordem e o que foi filtrado.',
      'Mostra documentos internos quando o filtro os pede — por isso nunca está exposto a tokens de cliente.',
      'É o mesmo código que `pesquisar_conhecimento`: se os dois divergirem, um teste de CI falha.',
    ],
  },
  {
    id: 'ingestao-criar',
    service: SERVICO,
    method: 'POST',
    path: '/v1/ingestao',
    summary: 'Enfileirar a ingestão de documentos novos ou alterados',
    description:
      'Aceita uma lista de documentos (ou a referência de uma fonte a sincronizar) e enfileira a ingestão: limpar, partir em chunks, calcular embeddings, escrever no PostgreSQL e retirar as versões substituídas. ' +
      'Devolve 202 com o id da tarefa; o estado lê-se em `GET /v1/ingestao/{tarefa_id}`. O alvo é um documento novo pesquisável em menos de 10 minutos (RF-07).',
    auth: 'bearer:servico',
    idempotent: true,
    p95: 150,
    params: [
      { name: 'Idempotency-Key', in: 'header', type: 'string', required: true, desc: 'O sincronizador de conteúdos usa o SHA do commit; repetir não enfileira nova tarefa.' },
      { name: 'fonte', in: 'body', type: "'politicas' | 'faq' | 'procedimentos'", required: true, desc: 'Fonte de origem; define o dono e o `publico` por omissão.' },
      { name: 'documentos', in: 'body', type: 'array', required: true, desc: 'Cada um com `id`, `titulo`, `texto`, `vigente`, `publico`, `actualizado`. Documentos com o mesmo hash de conteúdo são ignorados.' },
      { name: 'substitui', in: 'body', type: 'array', required: false, desc: 'Ids de documentos que passam a `vigente = false` na mesma transacção.' },
    ],
    requestSample: j(
      '{',
      '  "fonte": "politicas",',
      '  "documentos": [',
      '    { "id": "pol-reembolso-prazos", "titulo": "Prazos de reembolso por meio de pagamento",',
      '      "vigente": true, "publico": "cliente", "actualizado": "2026-06-01", "texto": "Depois de aprovado, o reembolso chega..." }',
      '  ],',
      '  "substitui": ["pol-reembolso-2025"]',
      '}',
    ),
    responses: [
      {
        status: 202,
        desc: 'Tarefa aceite. `Location` aponta para o estado.',
        sample: j('{', '  "tarefa_id": "ig-01K5S9F3XW",', '  "estado": "em_fila",', '  "documentos": 1,', '  "criada_em": "2026-09-19T08:02:11+02:00"', '}'),
      },
      {
        status: 422,
        desc: 'Documento sem metadados obrigatórios (`vigente`, `publico`, `actualizado`) ou sem estrutura mínima.',
        sample: problema('documento-invalido', 'Documento inválido', 422, 'pol-reembolso-prazos: falta o campo actualizado.', '/v1/ingestao'),
      },
    ],
    notes: [
      'A ingestão é idempotente por hash de chunk: reingerir um documento inalterado não escreve nada e não gasta embeddings.',
      'O documento novo e a retirada do substituído acontecem na mesma transacção: nunca há um intervalo em que os dois estão vigentes.',
      'Invalida as entradas da cache semântica que citavam documentos alterados (adr-0026).',
    ],
  },
  {
    id: 'ingestao-estado',
    service: SERVICO,
    method: 'GET',
    path: '/v1/ingestao/{tarefa_id}',
    summary: 'Estado de uma tarefa de ingestão',
    description: 'Devolve o estado (`em_fila`, `a_correr`, `concluida`, `falhou`), os contadores por fase e os erros por documento.',
    auth: 'bearer:servico',
    idempotent: true,
    p95: 50,
    params: [{ name: 'tarefa_id', in: 'path', type: 'string', required: true, desc: 'Id devolvido por `POST /v1/ingestao`.' }],
    responses: [
      {
        status: 200,
        desc: 'Estado actual.',
        sample: j(
          '{',
          '  "tarefa_id": "ig-01K5S9F3XW",',
          '  "estado": "concluida",',
          '  "documentos": { "recebidos": 1, "inalterados": 0, "ingeridos": 1, "retirados": 1 },',
          '  "chunks": { "novos": 2, "removidos": 2 },',
          '  "modelo_embedding": "nomic-embed-text",',
          '  "duracao_s": 14,',
          '  "erros": []',
          '}',
        ),
      },
      { status: 404, desc: 'Tarefa desconhecida ou já expirada.', sample: problema('tarefa-nao-encontrada', 'Tarefa não encontrada', 404, 'Não existe a tarefa ig-01K5S9F3XX.', '/v1/ingestao/ig-01K5S9F3XX') },
    ],
    notes: ['`modelo_embedding` é a versão escrita em cada linha nova (adr-0007): uma tarefa nunca mistura dois modelos.'],
  },

  /* ============================================================== aprovacoes */
  {
    id: 'aprovacoes-listar',
    service: SERVICO,
    method: 'GET',
    path: '/v1/aprovacoes',
    summary: 'Fila de aprovações pendentes para o suporte',
    description:
      'Lista as conversas suspensas num `interrupt` à espera de decisão humana: reembolsos acima de 500 MZN e cancelamentos de pedidos já aceites. ' +
      'Cada entrada traz o resumo e a justificação que o grafo passou ao `interrupt()`, o valor calculado pela ferramenta e há quanto tempo espera (a política promete menos de 4 horas úteis).',
    auth: 'bearer:suporte',
    idempotent: true,
    p95: 150,
    params: [
      { name: 'estado', in: 'query', type: "'pendente' | 'decidida'", required: false, desc: 'Por omissão `pendente`.' },
      { name: 'limite', in: 'query', type: 'integer', required: false, desc: 'Máximo de entradas, até 100. Por omissão 50.' },
      { name: 'cursor', in: 'query', type: 'string', required: false, desc: 'Cursor opaco da página anterior.' },
    ],
    responses: [
      {
        status: 200,
        desc: 'Página de aprovações, mais antigas primeiro.',
        sample: j(
          '{',
          '  "aprovacoes": [',
          '    {',
          '      "aprovacao_id": "AP-20417",',
          '      "conversa_id": "cv-01K5T4B7RD",',
          '      "pedido_id": "PD-8842507",',
          '      "accao": "reembolso",',
          '      "valor_mzn": 2910,',
          '      "regra": "pedido não entregue: reembolso total",',
          '      "justificacao": "Pedido marcado como entregue; o cliente diz que não recebeu. Política: não entregue, reembolso total com taxas (2 700 + 150 + 60).",',
          '      "espera_min": 23,',
          '      "traco_id": "5b8efff798038103d269b633813fc60c"',
          '    }',
          '  ],',
          '  "cursor": null',
          '}',
        ),
      },
    ],
    notes: [
      'A lista vem de uma tabela própria escrita por `pedir_aprovacao`; o estado do grafo fica no checkpoint e só é tocado pela decisão.',
      'A espera por aprovação é métrica: conversas suspensas acumulam-se se o suporte atrasar, e o cliente recebeu uma promessa de prazo.',
    ],
  },
  {
    id: 'aprovacao-decidir',
    service: SERVICO,
    method: 'POST',
    path: '/v1/aprovacoes/{aprovacao_id}/decisao',
    summary: 'Aprovar ou recusar, e retomar o grafo suspenso',
    description:
      'Regista a decisão de uma pessoa do suporte e retoma o thread com `graph.invoke(Command(resume={"decisao": ..., "nota": ...}), config)`. ' +
      'Com `aprovado`, o nó seguinte emite o reembolso ou o cancelamento com a chave de idempotência do thread; com `recusado`, o modelo comunica a decisão ao cliente. ' +
      'A resposta ao cliente chega-lhe como mensagem nova na conversa (notificação na aplicação).',
    auth: 'bearer:suporte',
    idempotent: true,
    p95: 1500,
    params: [
      { name: 'aprovacao_id', in: 'path', type: 'string', required: true, desc: 'Id da aprovação pendente.' },
      { name: 'Idempotency-Key', in: 'header', type: 'string', required: true, desc: 'Um duplo clique não retoma o grafo duas vezes.' },
      { name: 'decisao', in: 'body', type: "'aprovado' | 'recusado'", required: true, desc: 'A decisão.' },
      { name: 'nota', in: 'body', type: 'string', required: false, desc: 'Obrigatória quando `recusado`: o motivo que o assistente comunica ao cliente.' },
    ],
    requestSample: j('{', '  "decisao": "aprovado",', '  "nota": "Estafeta confirmou que entregou no prédio errado."', '}'),
    responses: [
      {
        status: 200,
        desc: 'Decisão registada e grafo retomado até ao próximo ponto de paragem.',
        sample: j(
          '{',
          '  "aprovacao_id": "AP-20417",',
          '  "decisao": "aprovado",',
          '  "decidido_por": "suporte:rui.m",',
          '  "resultado": { "referencia": "RB-402915", "valor_mzn": 2910, "estado": "aprovado" },',
          '  "mensagem_enviada": true',
          '}',
        ),
      },
      {
        status: 409,
        desc: 'A aprovação já foi decidida (por outra pessoa ou por um pedido anterior com outra chave).',
        sample: problema('aprovacao-ja-decidida', 'Aprovação já decidida', 409, 'AP-20417 foi aprovada às 22:14 por suporte:ana.c.', '/v1/aprovacoes/AP-20417/decisao'),
      },
      {
        status: 422,
        desc: 'Recusa sem nota.',
        sample: problema('validacao', 'Pedido inválido', 422, 'nota: obrigatória quando a decisão é recusado.', '/v1/aprovacoes/AP-20417/decisao'),
      },
    ],
    notes: [
      'O p95 inclui a retoma do grafo e a chamada à API de pagamentos (≈ 900 ms), não a geração da mensagem ao cliente, que corre em segundo plano.',
      'A decisão fica no checkpoint (`get_state_history` mostra quem retomou e com quê): é a auditoria de RF-03.',
      'A retoma volta a executar o nó que chamou `interrupt()` desde o início: tudo o que esse nó faz antes do `interrupt()` tem de ser idempotente.',
    ],
  },

  /* ============================================================== avaliacoes */
  {
    id: 'avaliacao-correr',
    service: SERVICO,
    method: 'POST',
    path: '/v1/avaliacoes',
    summary: 'Lançar uma corrida de avaliação contra o conjunto dourado',
    description:
      'Corre o conjunto dourado (240 perguntas, 60 conversas multi-turno, 120 ataques de red team, ou um subconjunto) contra a versão indicada do prompt, do modelo e do índice. ' +
      'Assíncrono: devolve 202 e o id da corrida. É o que o workflow de evals nocturnas chama com o modelo real; em cada PR, as evals correm com o modelo simulado dentro do pytest, sem este endpoint.',
    auth: 'bearer:admin',
    idempotent: true,
    p95: 200,
    params: [
      { name: 'Idempotency-Key', in: 'header', type: 'string', required: true, desc: 'O workflow usa `<sha>-<conjunto>-<data>`.' },
      { name: 'conjunto', in: 'body', type: "'dourado' | 'multiturno' | 'redteam' | 'tudo'", required: true, desc: 'Conjunto a correr.' },
      { name: 'versao', in: 'body', type: 'object', required: true, desc: '`{ sha, prompt, modelo, indice }`: o que se avalia.' },
      { name: 'comparar_com', in: 'body', type: 'string', required: false, desc: 'Id de uma corrida anterior (normalmente a de produção) para o relatório de diferenças.' },
      { name: 'juiz', in: 'body', type: 'string', required: false, desc: 'Escalão do juiz. Por omissão `grande`; recusado se for o mesmo modelo que responde.' },
    ],
    requestSample: j(
      '{',
      '  "conjunto": "dourado",',
      '  "versao": { "sha": "9f3c2a1", "prompt": "sistema@2.4.0", "modelo": "medio", "indice": "nomic-embed-text" },',
      '  "comparar_com": "av-01K5R0T6HB"',
      '}',
    ),
    responses: [
      { status: 202, desc: 'Corrida aceite.', sample: j('{', '  "corrida_id": "av-01K5T9D2NC",', '  "estado": "em_fila",', '  "casos": 240', '}') },
      {
        status: 422,
        desc: 'Juiz igual ao modelo avaliado, ou versão incompleta.',
        sample: problema('juiz-invalido', 'Juiz inválido', 422, 'O juiz não pode ser o mesmo modelo que produz as respostas.', '/v1/avaliacoes'),
      },
    ],
    notes: [
      'Custa dinheiro: 240 respostas do modelo médio mais 240 julgamentos do grande. Por isso `bearer:admin` e idempotência obrigatória.',
      'A corrida grava cada caso com o traço, para a análise de erros começar pelos traços e não pela média.',
    ],
  },
  {
    id: 'avaliacao-ler',
    service: SERVICO,
    method: 'GET',
    path: '/v1/avaliacoes/{corrida_id}',
    summary: 'Relatório de uma corrida de avaliação, por intenção e com intervalos de confiança',
    description:
      'Devolve as métricas globais e por intenção (recall@k, MRR, faithfulness, correcção pelo juiz, recusa correcta, tool-call accuracy), com intervalo de confiança por bootstrap e a diferença para a corrida de comparação. ' +
      'É o artefacto que o gate de CD lê: uma intenção a piorar fora do intervalo bloqueia a promoção.',
    auth: 'bearer:admin',
    idempotent: true,
    p95: 120,
    params: [
      { name: 'corrida_id', in: 'path', type: 'string', required: true, desc: 'Id da corrida.' },
      { name: 'casos', in: 'query', type: "'nenhum' | 'falhados' | 'todos'", required: false, desc: 'Incluir os casos individuais. Por omissão `falhados`.' },
    ],
    responses: [
      {
        status: 200,
        desc: 'Corrida concluída (ou `estado: a_correr` com progresso).',
        sample: j(
          '{',
          '  "corrida_id": "av-01K5T9D2NC",',
          '  "estado": "concluida",',
          '  "global": { "correcta": 0.871, "ic95": [0.829, 0.912], "faithfulness": 0.94, "recall_at_5": 0.95 },',
          '  "por_intencao": {',
          '    "compensacao": { "correcta": 0.84, "delta": -0.02, "tool_call_accuracy": 0.93 },',
          '    "politica": { "correcta": 0.90, "delta": 0.01 },',
          '    "outros": { "recusa_correcta": 0.925, "delta": 0.0 }',
          '  },',
          '  "gate": "passou",',
          '  "casos_falhados": 31',
          '}',
        ),
      },
      { status: 404, desc: 'Corrida desconhecida.', sample: problema('corrida-nao-encontrada', 'Corrida não encontrada', 404, 'Não existe a corrida av-01K5T9D2ND.', '/v1/avaliacoes/av-01K5T9D2ND') },
    ],
    notes: [
      'Valores ilustrativos do formato; os alvos são os de `REQUISITOS` (≥ 85% correctas, ≥ 90% de recusa correcta, ≥ 92% de tool-call accuracy).',
      'O gate é por intenção, não só global: uma média que sobe pode esconder a compensação a descer (RI-04).',
    ],
  },

  /* =============================================================== operacao */
  {
    id: 'saude',
    service: SERVICO,
    method: 'GET',
    path: '/healthz',
    summary: 'Liveness: o processo responde',
    description: 'Devolve 200 se o event loop responde. Não verifica dependências: um PostgreSQL em baixo não deve fazer o orquestrador matar e reiniciar todas as réplicas em cadeia.',
    auth: 'none',
    idempotent: true,
    p95: 5,
    params: [],
    responses: [{ status: 200, desc: 'Vivo.', sample: j('{ "estado": "ok" }') }],
    notes: ['É o alvo do `HEALTHCHECK` da imagem Docker e da liveness probe.', 'Sem autenticação, mas só exposto na rede interna, nunca pela gateway.'],
  },
  {
    id: 'prontidao',
    service: SERVICO,
    method: 'GET',
    path: '/readyz',
    summary: 'Readiness: pronto para receber tráfego',
    description:
      'Verifica as dependências de que um turno precisa: PostgreSQL (uma consulta trivial e o índice HNSW presente), o checkpointer, e o fornecedor de modelo ou Ollama (último resultado de uma verificação em segundo plano, não uma chamada por pedido). ' +
      'Devolve 503 enquanto o `lifespan` ainda está a carregar (pool de ligações, re-ranker) ou quando uma dependência crítica falha.',
    auth: 'none',
    idempotent: true,
    p95: 40,
    params: [],
    responses: [
      {
        status: 200,
        desc: 'Pronto.',
        sample: j('{', '  "estado": "pronto",', '  "verificacoes": { "postgres": "ok", "indice": "ok", "checkpointer": "ok", "modelo": "ok" },', '  "versao": { "sha": "9f3c2a1", "prompt": "sistema@2.4.0" }', '}'),
      },
      {
        status: 503,
        desc: 'Não pronto; a réplica sai do balanceamento sem ser reiniciada.',
        sample: problema('nao-pronto', 'Serviço não pronto', 503, 'postgres: timeout ao fim de 500 ms.', '/readyz', ['"verificacoes": { "postgres": "falhou", "indice": "desconhecido", "checkpointer": "falhou", "modelo": "ok" }']),
      },
    ],
    notes: [
      'A verificação do modelo não chama o fornecedor em cada probe: lê o estado do circuit breaker. Chamar o modelo a cada 10 s custaria tokens e contaria para o rate limit.',
      'Com o fornecedor principal em baixo mas o fallback disponível, continua pronto: degradação graciosa, não indisponibilidade.',
    ],
  },
  {
    id: 'metricas',
    service: SERVICO,
    method: 'GET',
    path: '/metrics',
    summary: 'Métricas em formato Prometheus',
    description:
      'Expõe as métricas do serviço no formato de texto do Prometheus: histogramas de TTFT e de duração da resposta, tokens e custo por escalão de modelo, taxa de acerto das caches, ' +
      'chamadas de ferramentas por resultado, chamadas rejeitadas pela política, escaladas, recusas e aprovações pendentes.',
    auth: 'none',
    idempotent: true,
    p95: 20,
    params: [],
    responses: [
      {
        status: 200,
        desc: '`text/plain; version=0.0.4`.',
        sample: j(
          '# HELP balcao_ttft_seconds Tempo até ao primeiro token visível, medido no servidor.',
          '# TYPE balcao_ttft_seconds histogram',
          'balcao_ttft_seconds_bucket{intencao="politica",le="1.0"} 1822',
          'balcao_ttft_seconds_bucket{intencao="politica",le="1.5"} 2391',
          'balcao_ttft_seconds_bucket{intencao="politica",le="+Inf"} 2440',
          'balcao_ttft_seconds_sum{intencao="politica"} 3172.4',
          'balcao_ttft_seconds_count{intencao="politica"} 2440',
          '# HELP balcao_tokens_total Tokens por escalão de modelo e tipo.',
          '# TYPE balcao_tokens_total counter',
          'balcao_tokens_total{escalao="medio",tipo="entrada"} 1.2718e+07',
          'balcao_tokens_total{escalao="medio",tipo="cache"} 7.631e+06',
          'balcao_tokens_total{escalao="medio",tipo="saida"} 439200',
          '# HELP balcao_ferramenta_rejeitada_total Chamadas de ferramenta rejeitadas pela política.',
          '# TYPE balcao_ferramenta_rejeitada_total counter',
          'balcao_ferramenta_rejeitada_total{ferramenta="emitir_reembolso",codigo="VALOR_DIFERENTE_DO_CALCULADO"} 3',
        ),
      },
    ],
    notes: [
      'Etiquetas com cardinalidade baixa (intenção, escalão, ferramenta, código): nunca `conversa_id` nem `cliente_id` numa etiqueta.',
      'O custo por conversa calcula-se no Prometheus a partir dos tokens e dos preços; o alarme dispara acima de 1,20 MZN.',
      'Qualquer incremento de `balcao_ferramenta_rejeitada_total` é investigado: é o sinal de uma injecção que passou o detector.',
    ],
  },
];

/** Índice por id, para o bloco `endpoint` e para o playground. */
export const ENDPOINT_BY_ID: Record<string, Endpoint> = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e]));
