import type { ToolSpec } from '../types';

/* O catálogo de ferramentas do «Balcão».
   É a fronteira entre o modelo e o mundo: o modelo só pode fazer o que está aqui, com os
   argumentos que estão aqui, dentro dos limites que estão aqui — e os limites vivem no código
   da ferramenta, não no prompt. As seis que existem em `balcao/didactico.py` (`ler_pedido`,
   `ler_cliente`, `calcular_reembolso`, `emitir_reembolso`, `pesquisar_conhecimento`,
   `transferir_humano`) têm aqui o mesmo nome e os mesmos parâmetros, com uma excepção
   deliberada: em produção `ler_cliente` não recebe `cliente_id` do modelo (RI-03). */

/** Esquema no formato `input_schema` (Anthropic; o `parameters` da OpenAI tem a mesma forma). */
function esquema(name: string, description: string, properties: Record<string, unknown>, required: string[]): string {
  return JSON.stringify(
    { name, description, input_schema: { type: 'object', properties, required, additionalProperties: false } },
    null,
    2,
  );
}

const PEDIDO_ID = { type: 'string', pattern: '^PD-[0-9]{7}$', description: 'Identificador do pedido, no formato PD-NNNNNNN.' };
const CHAVE = {
  type: 'string',
  minLength: 8,
  maxLength: 128,
  description: 'Chave única da operação; repetir a mesma chave devolve o mesmo resultado sem repetir o efeito.',
};

export const FERRAMENTAS: ToolSpec[] = [
  /* ================================================================== consulta */
  {
    id: 'ler-pedido',
    name: 'ler_pedido',
    group: 'consulta',
    summary: 'Estado, artigos, taxas e tempos de um pedido do cliente autenticado.',
    description:
      'Devolve o estado do pedido (aceite, em_preparacao, pronto, recolhido, a_caminho, entregue, cancelado), os artigos com preço, as taxas, o meio de pagamento, ' +
      'o tempo prometido, os minutos decorridos e, se ainda não chegou, a chegada estimada. É a primeira chamada de qualquer conversa sobre um pedido concreto: ' +
      'a intenção «onde está» (31% das conversas) resolve-se quase sempre só com ela, sem RAG.',
    effect: 'leitura',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 120,
    params: [{ name: 'pedido_id', type: 'string', required: true, desc: 'Identificador do pedido, formato `PD-\\d{7}`.' }],
    returns: '`{ pedido, estado, restaurante, itens[{nome, qtd, preco}], taxa_entrega, taxa_servico, pagamento, prometido_min, decorrido_min, eta_min?, entregue_em?, criado_em }`',
    schema: esquema('ler_pedido', 'Consulta o estado, os artigos e os tempos de um pedido.', { pedido_id: PEDIDO_ID }, ['pedido_id']),
    sample: {
      args: '{"pedido_id": "PD-8841273"}',
      result:
        '{"pedido": "PD-8841273", "estado": "a_caminho", "restaurante": "Tasca do Zé (KaMpfumo)",\n' +
        ' "itens": [{"nome": "Frango à zambeziana", "qtd": 1, "preco": 620}, {"nome": "Matapa com arroz", "qtd": 1, "preco": 480},\n' +
        '           {"nome": "Sumo de maracujá", "qtd": 2, "preco": 110}],\n' +
        ' "taxa_entrega": 95, "taxa_servico": 60, "pagamento": "mpesa", "prometido_min": 35, "decorrido_min": 41, "eta_min": 12,\n' +
        ' "criado_em": "2026-09-19T19:02:00+02:00"}',
    },
    errors: [
      { code: 'PEDIDO_NAO_ENCONTRADO', when: 'O pedido não existe, ou existe mas pertence a outro cliente.', handling: 'Devolvido como resultado ao modelo, que pede ao cliente para confirmar o número. As duas causas dão a mesma resposta para não permitir adivinhar pedidos alheios.' },
      { code: 'FORMATO_INVALIDO', when: 'O `pedido_id` não bate com `PD-\\d{7}`.', handling: 'Rejeitado pela validação do esquema antes de chamar a API de pedidos; o modelo corrige ou pergunta.' },
      { code: 'SERVICO_INDISPONIVEL', when: 'A API de pedidos devolve 5xx ou excede 800 ms.', handling: 'Duas retentativas com backoff exponencial e jitter; depois, resposta honesta ao cliente e `transferir_humano` se ele insistir.' },
    ],
    notes: [
      'A autorização está na ferramenta: o pedido tem de pertencer ao cliente da sessão (lido do token, não do modelo). O modelo nunca vê o campo `cliente`.',
      'Idempotente e barata: pode ser chamada de novo antes de emitir uma compensação, para confirmar que o estado não mudou.',
      'No laboratório, `balcao.ler_pedido` devolve o pedido de `PEDIDOS` sem o campo `cliente`, e `{"erro": ...}` quando não existe.',
    ],
  },
  {
    id: 'ler-cliente',
    name: 'ler_cliente',
    group: 'consulta',
    summary: 'Perfil de suporte do cliente da conversa: antiguidade, subscrição e reembolsos recentes.',
    description:
      'Devolve o nome próprio, a data de registo, se é subscritor do Chega Mais, o número de reembolsos nos últimos 30 dias e a carteira de pagamento mascarada. ' +
      'Serve para aplicar as regras que dependem do cliente, sobretudo os sinais de fraude do procedimento interno (mais de 3 reembolsos em 30 dias, conta com menos de 7 dias). ' +
      'Não recebe o identificador do cliente: lê-o da sessão autenticada.',
    effect: 'leitura',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 90,
    params: [],
    returns: '`{ cliente, nome, tel_4, desde, subscritor_mais, reembolsos_30d, carteira_pagamento }` — telefone só com os 4 últimos dígitos, carteira mascarada.',
    schema: esquema('ler_cliente', 'Consulta o perfil de suporte do cliente desta conversa (sem dados de pagamento completos).', {}, []),
    sample: {
      args: '{}',
      result:
        '{"cliente": "CL-90004", "nome": "Graça", "tel_4": "7781", "desde": "2026-09-15", "subscritor_mais": false,\n' +
        ' "reembolsos_30d": 4, "carteira_pagamento": "—"}',
    },
    errors: [
      { code: 'SEM_SESSAO', when: 'A conversa não tem cliente autenticado (por exemplo, WhatsApp antes da verificação).', handling: 'O grafo não expõe a ferramenta nestas conversas; se for chamada, o erro volta ao modelo, que pede ao cliente para entrar na aplicação.' },
    ],
    notes: [
      'Diferença deliberada em relação ao laboratório: `balcao.ler_cliente(cliente_id)` recebe o id para se poder experimentar no browser; no serviço, o esquema não tem parâmetros e um teste de CI falha se algum esquema aceitar `cliente_id` vindo do modelo (RI-03).',
      'Os sinais de fraude lêem-se aqui, mas nunca se dizem ao cliente: no caso da Graça (conta de 4 dias, 4 reembolsos) o assistente escala sem acusar.',
      'Minimização de dados: nada de telefone completo, morada ou email no resultado — o modelo não precisa deles para decidir.',
    ],
  },
  {
    id: 'rastrear-entrega',
    name: 'rastrear_entrega',
    group: 'consulta',
    summary: 'Etapa actual da entrega, chegada estimada e avisos operacionais activos na zona.',
    description:
      'Devolve a linha temporal do pedido (aceite → em preparação → pronto → recolhido → a caminho → entregue) com a hora de cada etapa, a chegada estimada recalculada ' +
      'e os avisos operacionais activos na zona de entrega (chuva forte, zona suspensa, falha do M-Pesa). Os avisos não estão no índice do RAG porque caducam em horas: lêem-se aqui.',
    effect: 'leitura',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 180,
    params: [{ name: 'pedido_id', type: 'string', required: true, desc: 'Pedido a rastrear, formato `PD-\\d{7}`.' }],
    returns: '`{ pedido, estado, eta_min?, posicao_actualizada_ha_s?, etapas[{estado, em}], avisos_zona[{tipo, texto, ate}] }` — nunca o nome, telefone ou posição exacta do estafeta.',
    schema: esquema(
      'rastrear_entrega',
      'Mostra a etapa actual da entrega, a chegada estimada e os avisos operacionais activos na zona do pedido.',
      { pedido_id: PEDIDO_ID },
      ['pedido_id'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8841273"}',
      result:
        '{"pedido": "PD-8841273", "estado": "a_caminho", "eta_min": 12, "posicao_actualizada_ha_s": 8,\n' +
        ' "etapas": [{"estado": "aceite", "em": "19:03"}, {"estado": "em_preparacao", "em": "19:05"}, {"estado": "pronto", "em": "19:29"},\n' +
        '            {"estado": "recolhido", "em": "19:34"}, {"estado": "a_caminho", "em": "19:35"}],\n' +
        ' "avisos_zona": []}',
    },
    errors: [
      { code: 'PEDIDO_NAO_ENCONTRADO', when: 'Mesmo critério de `ler_pedido`: inexistente ou de outro cliente.', handling: 'Resultado ao modelo; confirmar o número com o cliente.' },
      { code: 'SEM_ESTAFETA', when: 'O pedido está pronto mas ainda não foi recolhido.', handling: 'Não é erro para o cliente: o modelo explica que o pedido aguarda recolha, sem prometer hora.' },
      { code: 'SERVICO_INDISPONIVEL', when: 'API de logística ou de avisos em baixo.', handling: 'Duas retentativas; depois, responde só com `ler_pedido`, que dá o estado sem a linha temporal.' },
    ],
    notes: [
      'A posição do estafeta é actualizada a cada 10 segundos na aplicação; a ferramenta devolve a idade da última posição para o modelo não afirmar precisão que não tem.',
      'Um aviso de alerta meteorológico activo muda a resposta sobre compensação por atraso: a política não a aplica nesses dias.',
      'Nunca devolve dados do estafeta (telefone, nome completo, posição): o suporte não os revela e a ferramenta nem os lê.',
    ],
  },

  /* ============================================================== conhecimento */
  {
    id: 'pesquisar-conhecimento',
    name: 'pesquisar_conhecimento',
    group: 'conhecimento',
    summary: 'Pesquisa híbrida com re-ranking nas políticas e FAQ em vigor, com a fonte de cada excerto.',
    description:
      'Corre a pesquisa híbrida (HNSW e `tsvector` fundidos com RRF), re-ranking dos 20 primeiros e devolve os k melhores excertos com o id do documento de origem, ' +
      'para o modelo citar como `[doc-id]`. O filtro `vigente = true` é sempre aplicado na consulta SQL, antes do ranking; o modelo não o pode desligar.',
    effect: 'leitura',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 320,
    params: [
      { name: 'consulta', type: 'string', required: true, desc: 'A pergunta do cliente reformulada como pesquisa (sem PII: o texto já vem mascarado).' },
      { name: 'k', type: 'integer', required: false, desc: 'Número de excertos a devolver, de 1 a 5. Por omissão 3.' },
    ],
    returns: '`{ resultados[{fonte, texto}] }` — `fonte` é o id do documento, a citar entre parênteses rectos.',
    schema: esquema(
      'pesquisar_conhecimento',
      'Pesquisa as políticas e perguntas frequentes do Chega e devolve os excertos mais relevantes com a fonte.',
      {
        consulta: { type: 'string', minLength: 3, maxLength: 300, description: 'A pergunta do cliente reformulada como pesquisa.' },
        k: { type: 'integer', minimum: 1, maximum: 5, default: 3, description: 'Número de excertos a devolver (1 a 5).' },
      },
      ['consulta'],
    ),
    sample: {
      args: '{"consulta": "Posso juntar dois cupões no mesmo pedido?", "k": 2}',
      result:
        '{"resultados": [\n' +
        '  {"fonte": "pol-cupoes", "texto": "Os cupões são válidos durante 30 dias a partir da data de emissão. Só se pode usar um cupão por pedido e os cupões não são acumuláveis com outras promoções. O pedido tem de ter um valor mínimo de 400 MZN, sem contar com as taxas. [...]"},\n' +
        '  {"fonte": "faq-pedido-grupo", "texto": "Um pedido em grupo junta até 8 pessoas no mesmo carrinho. [...]"}\n' +
        ']}',
    },
    errors: [
      { code: 'LIMITE_PESQUISAS', when: 'Quarta pesquisa no mesmo turno.', handling: 'Resultado de erro ao modelo; o nó de resposta usa o que já tem ou recusa. O limite existe por latência e contexto, não por risco.' },
      { code: 'SEM_SUPORTE', when: 'O melhor score depois do re-ranking fica abaixo do limiar.', handling: 'Devolve `resultados: []` com `sem_suporte: true`; o modelo recusa e redirecciona em vez de inventar (adr-0011).' },
    ],
    notes: [
      'Repara no segundo resultado do exemplo: o retriever devolve sempre k excertos, relevantes ou não. É o validador de citações e o limiar de score que impedem o modelo de usar o que não sustenta a resposta.',
      'Documentos `publico = interno` (sinais de fraude, escalamento) só entram num bloco separado de orientação, que o guarda de saída não deixa citar.',
      'No laboratório corre `recuperar(consulta, k, metodo="rerank", filtro={"vigente": True})`: o exemplo acima é a saída real do `balcao`, com os textos encurtados.',
      'Até 3 pesquisas por turno (política de autonomia). Cada pesquisa acrescenta ≈ 2 000 tokens de contexto quando k = 3.',
    ],
  },

  /* ==================================================================== accao */
  {
    id: 'calcular-reembolso',
    name: 'calcular_reembolso',
    group: 'accao',
    summary: 'Calcula, segundo as políticas em vigor, a compensação a que um pedido tem direito. Não emite nada.',
    description:
      'Aplica as regras da política de reembolsos e de compensação por atraso aos dados reais do pedido: pedido não entregue → reembolso total com taxas; ' +
      'atraso acima de 20 minutos → cupão de 100 MZN; acima de 45 → cupão de 200 MZN; artigo em falta → valor do artigo. Diz se o valor precisa de aprovação humana (reembolso acima de 500 MZN). ' +
      'Existe para que o modelo escolha quando compensar, nunca quanto.',
    effect: 'leitura',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 150,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido a avaliar.' },
      { name: 'motivo', type: "'atraso' | 'nao_entregue' | 'artigo_em_falta'", required: true, desc: 'O motivo que o cliente invocou e que o pedido confirma.' },
    ],
    returns: '`{ pedido, tipo: "reembolso" | "cupão" | "nenhum", valor_mzn, regra, precisa_aprovacao }`',
    schema: esquema(
      'calcular_reembolso',
      'Calcula a compensação a que um pedido tem direito segundo as políticas em vigor.',
      { pedido_id: PEDIDO_ID, motivo: { type: 'string', enum: ['atraso', 'nao_entregue', 'artigo_em_falta'], description: 'Motivo da compensação.' } },
      ['pedido_id', 'motivo'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8841990", "motivo": "atraso"}',
      result: '{"pedido": "PD-8841990", "tipo": "cupão", "valor_mzn": 200, "regra": "atraso de 53 min (> 45)", "precisa_aprovacao": false}',
    },
    errors: [
      { code: 'MOTIVO_DESCONHECIDO', when: 'Motivo fora do enum (no laboratório, `{"erro": "motivo desconhecido: ..."}`).', handling: 'Resultado ao modelo; reclassifica ou pergunta ao cliente.' },
      { code: 'FORA_DE_PRAZO', when: 'Reclamação de artigo em falta mais de 48 horas depois da entrega.', handling: 'Devolve `tipo: "nenhum"` com a regra; o modelo explica e oferece humano se o cliente contestar.' },
      { code: 'JA_COMPENSADO', when: 'O pedido já teve uma compensação do mesmo motivo.', handling: 'A compensação por atraso é uma por pedido; o modelo diz o que já foi emitido.' },
    ],
    notes: [
      'Com `nao_entregue` no PD-8842507 devolve 2 910 MZN (2 700 de artigos, 150 de entrega, 60 de serviço) e `precisa_aprovacao: true`: o grafo segue para `pedir_aprovacao`.',
      'Não aplica a compensação por atraso quando o atraso veio de uma alteração de morada pedida pelo cliente ou em dia de alerta meteorológico — lê isso do pedido e dos avisos.',
      'Está no grupo das acções porque é o primeiro passo obrigatório de qualquer compensação, mas não tem efeito: pode ser chamada as vezes que for preciso.',
    ],
  },
  {
    id: 'emitir-reembolso',
    name: 'emitir_reembolso',
    group: 'accao',
    summary: 'Devolve dinheiro ao meio de pagamento original. Efeito externo e irreversível; até 500 MZN sem humano.',
    description:
      'Chama a API de pagamentos para reembolsar o valor ao meio de pagamento original (M-Pesa e e-Mola em até 24 horas, cartão em 5 a 10 dias úteis, numerário na carteira Chega). ' +
      'Recusa valores acima do limite autónomo de 500 MZN com `APROVACAO_NECESSARIA`, e valores diferentes dos que `calcular_reembolso` devolveu para o mesmo pedido. ' +
      'Só é chamada depois de o cliente confirmar explicitamente a proposta.',
    effect: 'externo',
    risk: 3,
    approval: 'condicional',
    idempotent: true,
    p95: 900,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido a reembolsar.' },
      { name: 'valor_mzn', type: 'integer', required: true, desc: 'Valor em meticais; tem de ser igual ao calculado.' },
      { name: 'chave_idempotencia', type: 'string', required: true, desc: 'Chave única da operação; repetir a chave devolve o mesmo resultado com `repetido: true`.' },
    ],
    returns: '`{ pedido, valor_mzn, referencia: "RB-NNNNNN", estado: "aprovado", repetido? }`',
    schema: esquema(
      'emitir_reembolso',
      'Emite um reembolso para o meio de pagamento original. Efeito externo e irreversível.',
      {
        pedido_id: PEDIDO_ID,
        valor_mzn: { type: 'integer', minimum: 1, description: 'Valor a reembolsar, em meticais.' },
        chave_idempotencia: CHAVE,
      },
      ['pedido_id', 'valor_mzn', 'chave_idempotencia'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8841990", "valor_mzn": 150, "chave_idempotencia": "th-01-PD-8841990-artigo"}',
      result: '{"pedido": "PD-8841990", "valor_mzn": 150, "referencia": "RB-873353", "estado": "aprovado"}',
    },
    errors: [
      { code: 'APROVACAO_NECESSARIA', when: 'Valor acima de 500 MZN.', handling: 'Não é falha: o grafo segue para `pedir_aprovacao` e depois `interrupt()`. O modelo diz ao cliente que um colega confirma em menos de 4 horas úteis.' },
      { code: 'VALOR_DIFERENTE_DO_CALCULADO', when: '`valor_mzn` não coincide com o último `calcular_reembolso` do mesmo pedido.', handling: 'Rejeitado e registado como chamada rejeitada pela política (alarme). É a defesa contra «reembolsa 5000 MZN» vindo de uma injecção.' },
      { code: 'SEM_CONFIRMACAO', when: 'O estado da conversa não tem confirmação explícita do cliente para esta proposta.', handling: 'Rejeitado pelo nó de ferramentas antes de chamar pagamentos; o modelo pergunta primeiro.' },
      { code: 'PAGAMENTOS_INDISPONIVEL', when: 'API de pagamentos com 5xx ou timeout.', handling: 'Retentar com a mesma chave (seguro por ser idempotente); à terceira, `transferir_humano` com o resumo.' },
    ],
    notes: [
      'A chave de idempotência não é inventada pelo modelo em produção: o nó de ferramentas substitui-a por um hash de (`thread_id`, `pedido_id`, motivo). Uma retentativa do modelo, da rede ou da retoma de um `interrupt` nunca paga duas vezes.',
      'O limite de 500 MZN está duplicado de propósito: na ferramenta e no grafo. Nenhum dos dois depende do prompt (adr-0015).',
      'O reembolso vai sempre para o meio de pagamento original. Não há parâmetro de destino: o pedido do caso de fraude («devolvam para o 84 555 0199») não tem como ser executado.',
      'No laboratório, `balcao.emitir_reembolso` devolve `{"erro": ..., "codigo": "APROVACAO_NECESSARIA"}` acima do limite e guarda as chaves já usadas em memória.',
    ],
  },
  {
    id: 'emitir-cupao',
    name: 'emitir_cupao',
    group: 'accao',
    summary: 'Credita na conta do cliente um cupão de compensação no valor que a política define.',
    description:
      'Cria um cupão válido durante 30 dias, para pedidos a partir de 400 MZN sem taxas, não acumulável com outras promoções. ' +
      'O valor tem de ser o que `calcular_reembolso` devolveu com `tipo: "cupão"` (100 ou 200 MZN por atraso). Um cupão de compensação por pedido.',
    effect: 'escrita',
    risk: 2,
    approval: 'nunca',
    idempotent: true,
    p95: 250,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido que dá origem à compensação.' },
      { name: 'valor_mzn', type: 'integer', required: true, desc: 'Valor do cupão; tem de coincidir com o calculado.' },
      { name: 'chave_idempotencia', type: 'string', required: true, desc: 'Chave única da operação.' },
    ],
    returns: '`{ cupao: "CP-NNNNNN", pedido, valor_mzn, valido_ate, minimo_pedido_mzn: 400, repetido? }`',
    schema: esquema(
      'emitir_cupao',
      'Credita um cupão de compensação na conta do cliente, no valor calculado pela política.',
      {
        pedido_id: PEDIDO_ID,
        valor_mzn: { type: 'integer', enum: [100, 200], description: 'Valor do cupão em meticais, tal como calculado.' },
        chave_idempotencia: CHAVE,
      },
      ['pedido_id', 'valor_mzn', 'chave_idempotencia'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8841990", "valor_mzn": 200, "chave_idempotencia": "th-01-PD-8841990-atraso"}',
      result: '{"cupao": "CP-310552", "pedido": "PD-8841990", "valor_mzn": 200, "valido_ate": "2026-10-19", "minimo_pedido_mzn": 400}',
    },
    errors: [
      { code: 'JA_COMPENSADO', when: 'O pedido já tem um cupão de compensação.', handling: 'Com a mesma chave devolve o cupão existente (`repetido: true`); com outra chave, erro ao modelo, que informa o cliente do cupão já emitido.' },
      { code: 'VALOR_DIFERENTE_DO_CALCULADO', when: 'O valor não é o que a política deu para este pedido.', handling: 'Rejeitado e registado como chamada rejeitada pela política.' },
      { code: 'SEM_CONFIRMACAO', when: 'O cliente ainda não escolheu entre cupão e reembolso da taxa de entrega (atraso acima de 45 minutos).', handling: 'O modelo apresenta as duas opções, como na conversa da Aida.' },
    ],
    notes: [
      'Autónoma porque o valor é pequeno e fixado pela política: o modelo escolhe quando, nunca quanto.',
      'O enum `[100, 200]` no esquema é uma primeira barreira; a verificação contra `calcular_reembolso` na ferramenta é a que conta.',
      'Se o pedido onde o cupão for usado for cancelado, o cupão volta à conta com a validade original — regra da API de cupões, não da ferramenta.',
    ],
  },
  {
    id: 'cancelar-pedido',
    name: 'cancelar_pedido',
    group: 'accao',
    summary: 'Cancela um pedido: sem custo antes de o restaurante aceitar; com aprovação humana depois.',
    description:
      'Antes de o restaurante aceitar, cancela sem custo depois de confirmação explícita do cliente. Depois de aceite e antes de pronto, o cancelamento custa 50% do valor dos artigos e exige aprovação humana: ' +
      'a ferramenta devolve `APROVACAO_NECESSARIA` com o custo, e o grafo segue para `pedir_aprovacao`. Depois da recolha pelo estafeta, cancelar é impossível.',
    effect: 'escrita',
    risk: 3,
    approval: 'condicional',
    idempotent: true,
    p95: 400,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido a cancelar.' },
      { name: 'motivo', type: 'string', required: true, desc: 'Motivo dado pelo cliente, em texto curto (fica no registo do pedido).' },
      { name: 'chave_idempotencia', type: 'string', required: true, desc: 'Chave única da operação.' },
    ],
    returns: '`{ pedido, estado: "cancelado", custo_cliente_mzn, reembolso_mzn }` ou erro com `custo_cliente_mzn` quando precisa de aprovação.',
    schema: esquema(
      'cancelar_pedido',
      'Cancela um pedido do cliente. Sem custo antes de o restaurante aceitar; depois disso, requer aprovação humana.',
      {
        pedido_id: PEDIDO_ID,
        motivo: { type: 'string', maxLength: 200, description: 'Motivo do cancelamento indicado pelo cliente.' },
        chave_idempotencia: CHAVE,
      },
      ['pedido_id', 'motivo', 'chave_idempotencia'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8842507", "motivo": "o cliente já não precisa do pedido", "chave_idempotencia": "th-07-PD-8842507-cancelar"}',
      result: '{"erro": "pedido já aceite pelo restaurante: requer aprovação humana", "codigo": "APROVACAO_NECESSARIA",\n "estado": "em_preparacao", "custo_cliente_mzn": 1350}',
    },
    errors: [
      { code: 'APROVACAO_NECESSARIA', when: 'O restaurante já aceitou e o pedido ainda não está pronto.', handling: 'O modelo explica o custo (50% dos artigos: 1 350 MZN no exemplo) e, se o cliente mantiver, o grafo pede aprovação.' },
      { code: 'JA_RECOLHIDO', when: 'O estafeta já recolheu o pedido.', handling: 'Não se pode cancelar; o modelo diz isso e oferece a política de reembolso se houver problema na entrega.' },
      { code: 'SEM_CONFIRMACAO', when: 'Sem confirmação explícita do cliente no estado.', handling: 'Rejeitado antes da chamada; o modelo pergunta.' },
    ],
    notes: [
      '`approval: condicional`: autónoma só no estado `aceite` ainda não confirmado pelo restaurante; em qualquer outro estado cancelável passa por humano.',
      'O modelo nunca calcula o custo: vem da ferramenta, com base nos artigos do pedido.',
      'Tem custo para o restaurante e para o cliente, e não se desfaz: risco 3, como o reembolso.',
    ],
  },
  {
    id: 'alterar-morada',
    name: 'alterar_morada',
    group: 'accao',
    summary: 'Troca a morada de entrega por outra morada guardada do cliente, antes da recolha e até 2 km da original.',
    description:
      'Altera a morada de entrega para uma das moradas guardadas no perfil do cliente (identificada por `morada_id`), desde que o estafeta ainda não tenha recolhido o pedido e a nova morada fique a até 2 km da original. ' +
      'Acima de 2 km a taxa de entrega é recalculada e o cliente tem de aceitar a diferença noutro ecrã da aplicação: a ferramenta devolve `DISTANCIA_EXCEDIDA` com a ligação.',
    effect: 'escrita',
    risk: 2,
    approval: 'nunca',
    idempotent: true,
    p95: 350,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido a alterar.' },
      { name: 'morada_id', type: 'string', required: true, desc: 'Uma das moradas guardadas do cliente, formato `MR-\\d{4}`. Nunca texto livre.' },
      { name: 'chave_idempotencia', type: 'string', required: true, desc: 'Chave única da operação.' },
    ],
    returns: '`{ pedido, morada_id, distancia_km, taxa_entrega_mzn, eta_min }`',
    schema: esquema(
      'alterar_morada',
      'Altera a morada de entrega para outra morada guardada do cliente, antes da recolha e a até 2 km da original.',
      {
        pedido_id: PEDIDO_ID,
        morada_id: { type: 'string', pattern: '^MR-[0-9]{4}$', description: 'Identificador de uma morada guardada no perfil do cliente.' },
        chave_idempotencia: CHAVE,
      },
      ['pedido_id', 'morada_id', 'chave_idempotencia'],
    ),
    sample: {
      args: '{"pedido_id": "PD-8842507", "morada_id": "MR-0412", "chave_idempotencia": "th-03-PD-8842507-morada"}',
      result: '{"pedido": "PD-8842507", "morada_id": "MR-0412", "distancia_km": 1.4, "taxa_entrega_mzn": 150, "eta_min": 38}',
    },
    errors: [
      { code: 'JA_RECOLHIDO', when: 'O estafeta já recolheu o pedido.', handling: 'O modelo explica que só o estafeta pode aceitar uma pequena alteração (outro portão do mesmo prédio).' },
      { code: 'DISTANCIA_EXCEDIDA', when: 'Nova morada a mais de 2 km da original.', handling: 'O modelo indica o ecrã da aplicação onde o cliente aceita a nova taxa; não altera nada.' },
      { code: 'MORADA_DESCONHECIDA', when: '`morada_id` não pertence ao cliente da sessão.', handling: 'Resultado de erro; o modelo pede ao cliente para guardar a morada na aplicação primeiro.' },
    ],
    notes: [
      'Porquê `morada_id` e não texto livre: uma morada escrita pelo cliente é PII, chega mascarada ao modelo e ainda teria de ser geocodificada. A escolha entre moradas guardadas é validável na ferramenta.',
      'Uma alteração de morada depois da confirmação retira o direito à compensação por atraso: a ferramenta regista-a no pedido para `calcular_reembolso` a ver.',
    ],
  },

  /* =================================================================== humano */
  {
    id: 'abrir-ticket',
    name: 'abrir_ticket',
    group: 'humano',
    summary: 'Abre um caso assíncrono para uma equipa, quando não é preciso uma pessoa agora na conversa.',
    description:
      'Cria um ticket na fila da equipa certa (suporte, pagamentos, operações) com categoria e resumo, para situações que precisam de acção humana mas não de uma pessoa na conversa: ' +
      'cobrança duplicada que passou as 72 horas de reversão automática, objecto esquecido com o estafeta, reclamação com fotografia. O cliente recebe a referência e o assistente fecha a conversa.',
    effect: 'escrita',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 300,
    params: [
      { name: 'categoria', type: "'pagamento' | 'objecto_esquecido' | 'reclamacao' | 'conta'", required: true, desc: 'Define a fila.' },
      { name: 'resumo', type: 'string', required: true, desc: 'O que o cliente pediu, o que já foi verificado e o que falta fazer. Sem PII (vem mascarado).' },
      { name: 'pedido_id', type: 'string', required: false, desc: 'Pedido relacionado, quando existe.' },
    ],
    returns: '`{ ticket: "TK-NNNNNN", fila, estado: "aberto" }`',
    schema: esquema(
      'abrir_ticket',
      'Abre um caso assíncrono para uma equipa do Chega, com resumo, quando o cliente não precisa de uma pessoa agora na conversa.',
      {
        categoria: { type: 'string', enum: ['pagamento', 'objecto_esquecido', 'reclamacao', 'conta'], description: 'Categoria do caso; define a fila.' },
        resumo: { type: 'string', minLength: 20, maxLength: 1000, description: 'O que o cliente pediu, o que já foi verificado e o que falta fazer.' },
        pedido_id: PEDIDO_ID,
      },
      ['categoria', 'resumo'],
    ),
    sample: {
      args:
        '{"categoria": "pagamento", "pedido_id": "PD-8841990",\n "resumo": "Cliente reporta segunda cobrança no cartão há mais de 72 horas. Enviou as referências das duas transacções. Falta abrir reclamação junto do operador."}',
      result: '{"ticket": "TK-204718", "fila": "pagamentos", "estado": "aberto"}',
    },
    errors: [
      { code: 'TICKET_DUPLICADO', when: 'Já existe ticket aberto da mesma categoria para o mesmo pedido.', handling: 'Devolve o ticket existente; o modelo dá essa referência ao cliente.' },
      { code: 'RESUMO_INSUFICIENTE', when: 'Resumo com menos de 20 caracteres.', handling: 'Erro de validação do esquema; o modelo reescreve o resumo.' },
    ],
    notes: [
      'A diferença para `transferir_humano`: aqui a conversa termina e o caso segue por outro canal; lá, uma pessoa entra na conversa agora.',
      'Idempotência pela combinação (pedido, categoria): uma retentativa não abre um segundo ticket.',
    ],
  },
  {
    id: 'pedir-aprovacao',
    name: 'pedir_aprovacao',
    group: 'humano',
    summary: 'Pede a um humano que aprove uma acção acima da política; o grafo suspende-se num interrupt até à decisão.',
    description:
      'Regista um pedido de aprovação (reembolso acima de 500 MZN ou cancelamento de pedido já aceite) com o valor, a regra aplicada e um resumo, e devolve ao modelo o estado `pendente` para ele informar o cliente. ' +
      'O nó seguinte do grafo chama `interrupt()`: o thread fica suspenso no checkpoint até alguém decidir em `POST /v1/aprovacoes/{aprovacao_id}/decisao`, que o retoma com `Command(resume=...)`.',
    effect: 'humano',
    risk: 2,
    approval: 'sempre',
    idempotent: true,
    p95: 200,
    params: [
      { name: 'pedido_id', type: 'string', required: true, desc: 'Pedido em causa.' },
      { name: 'accao', type: "'reembolso' | 'cancelamento'", required: true, desc: 'A acção que precisa de aprovação.' },
      { name: 'valor_mzn', type: 'integer', required: true, desc: 'Valor devolvido por `calcular_reembolso` ou custo devolvido por `cancelar_pedido`.' },
      { name: 'justificacao', type: 'string', required: true, desc: 'Resumo para quem aprova: o que aconteceu, a regra, o que o cliente pediu.' },
    ],
    returns: '`{ aprovacao: "AP-NNNNN", estado: "pendente", resposta_prevista }`; depois da retoma, o nó seguinte recebe `{ decisao: "aprovado" | "recusado", decidido_por, nota? }`.',
    schema: esquema(
      'pedir_aprovacao',
      'Pede aprovação humana para uma acção acima do limite autónomo. A conversa fica suspensa até à decisão.',
      {
        pedido_id: PEDIDO_ID,
        accao: { type: 'string', enum: ['reembolso', 'cancelamento'], description: 'Acção que precisa de aprovação.' },
        valor_mzn: { type: 'integer', minimum: 1, description: 'Valor em causa, tal como calculado pelas ferramentas.' },
        justificacao: { type: 'string', minLength: 20, maxLength: 1000, description: 'O que aconteceu, a regra aplicada e o que o cliente pediu.' },
      },
      ['pedido_id', 'accao', 'valor_mzn', 'justificacao'],
    ),
    sample: {
      args:
        '{"pedido_id": "PD-8842507", "accao": "reembolso", "valor_mzn": 2910,\n "justificacao": "Pedido marcado como entregue; o cliente diz que não recebeu. Política: não entregue, reembolso total com taxas (2 700 + 150 + 60)."}',
      result: '{"aprovacao": "AP-20417", "estado": "pendente", "resposta_prevista": "menos de 4 horas úteis"}',
    },
    errors: [
      { code: 'APROVACAO_JA_PENDENTE', when: 'Já existe aprovação pendente para o mesmo pedido e acção.', handling: 'Devolve a existente; o modelo não cria outra nem promete prazo diferente.' },
      { code: 'VALOR_DIFERENTE_DO_CALCULADO', when: 'O valor não coincide com o da ferramenta de cálculo.', handling: 'Rejeitado e registado; quem aprova só vê valores calculados.' },
    ],
    notes: [
      'O modelo nunca promete o resultado da aprovação: diz o que vai acontecer e quando («um colega confirma em menos de 4 horas úteis»).',
      'Código do nó antes de `interrupt()` corre de novo na retoma — por isso a criação da aprovação é idempotente por (`thread_id`, pedido, acção).',
      'Com decisão `aprovado`, o nó seguinte chama a emissão com a chave de idempotência do thread; com `recusado`, o modelo comunica a decisão com a nota de quem decidiu.',
    ],
  },
  {
    id: 'transferir-humano',
    name: 'transferir_humano',
    group: 'humano',
    summary: 'Passa a conversa a uma pessoa do suporte agora, com um resumo que evita repetir perguntas.',
    description:
      'Coloca a conversa na fila do suporte com prioridade `normal` ou `urgente` e um resumo do caso: número do pedido, o que o cliente pediu e o que já foi feito. ' +
      'É obrigatória quando a política de escalamento o manda: pedido explícito de humano, saúde ou segurança, suspeita de fraude, valor acima do limite sem aprovação possível, ou duas tentativas falhadas.',
    effect: 'humano',
    risk: 1,
    approval: 'nunca',
    idempotent: true,
    p95: 250,
    params: [
      { name: 'resumo', type: 'string', required: true, desc: 'O que o cliente pediu, o número do pedido e o que já foi feito.' },
      { name: 'prioridade', type: "'normal' | 'urgente'", required: false, desc: '`urgente` para saúde e segurança. Por omissão `normal`.' },
    ],
    returns: '`{ fila, posicao, espera_estimada_min }`',
    schema: esquema(
      'transferir_humano',
      'Passa a conversa para a equipa de suporte com um resumo do caso.',
      {
        resumo: { type: 'string', minLength: 20, maxLength: 1500, description: 'O que o cliente pediu, o número do pedido e o que já foi feito.' },
        prioridade: { type: 'string', enum: ['normal', 'urgente'], default: 'normal', description: 'normal ou urgente' },
      },
      ['resumo'],
    ),
    sample: {
      args:
        '{"prioridade": "urgente",\n "resumo": "PD-8843115: cliente reporta amendoim não declarado; filho alérgico com a cara inchada. Aconselhada assistência médica imediata. Reembolso total do prato garantido pela política de alergénios, ainda não emitido."}',
      result: '{"fila": "suporte", "posicao": 1, "espera_estimada_min": 1}',
    },
    errors: [
      { code: 'FORA_DE_HORAS', when: 'Fora do horário do suporte (o Chega funciona das 07h00 às 23h00).', handling: 'Casos urgentes vão para a escala de piquete; os restantes passam a `abrir_ticket` e o cliente é informado.' },
    ],
    notes: [
      'Escalar é sempre seguro: o custo de escalar de mais mede-se na taxa de resolução, não no risco. Hoje ≈ 32% das conversas (≈ 370 por dia) acabam aqui.',
      'Em fraude, o resumo relata factos sem acusar e sem citar o procedimento interno; quem recebe vê o traço completo.',
      'A qualidade do resumo mede-se: «perguntas repetidas ao cliente» por humano é a métrica que diz se o suporte confia no assistente (RI-08).',
    ],
  },
];

export const FERRAMENTA_DE: Record<string, ToolSpec> = Object.fromEntries(FERRAMENTAS.map((f) => [f.id, f]));

export const GRUPOS_FERRAMENTAS: { id: string; nome: string; blurb: string }[] = [
  { id: 'consulta', nome: 'Consulta', blurb: 'Leituras de pedidos, clientes e entregas. Sem efeito, idempotentes, e com a autorização verificada na ferramenta contra o cliente da sessão.' },
  { id: 'conhecimento', nome: 'Conhecimento', blurb: 'A pesquisa nas políticas e FAQ em vigor. Devolve excertos com fonte para citar; o filtro de vigência vive na consulta SQL.' },
  { id: 'accao', nome: 'Acção', blurb: 'Calcular e depois mudar o mundo: reembolsos, cupões, cancelamentos, moradas. Chave de idempotência, confirmação do cliente e limites no código.' },
  { id: 'humano', nome: 'Humano', blurb: 'Passar a decisão ou a conversa a uma pessoa: aprovação com interrupt, transferência imediata ou ticket assíncrono.' },
];
