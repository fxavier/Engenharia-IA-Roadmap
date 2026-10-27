import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'apis-modelos',
  numero: 3,
  bloco: 'llm',
  titulo: 'APIs de modelos em produção',
  resumo:
    'O pedido HTTP por baixo de qualquer produto com LLMs: mensagens, motivo de paragem e uso, streaming, erros e retentativas, timeouts, cache de prompt, lote, rate limits e a camada própria sobre o fornecedor. É onde o entrevistador separa quem fez uma demo de quem já foi acordado por um 429 às dez da noite.',
  icon: '🔌',
  modulos: ['apis-de-modelos', 'custo-escala', 'observabilidade-llmops'],
  essencial: [
    'A API de mensagens é sem estado: cada pedido reenvia system, histórico e ferramentas. A entrada do turno n inclui os n − 1 anteriores.',
    'Lê sempre o `stop_reason` (`end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `refusal`, …): `max_tokens` é um corte, não uma resposta completa.',
    'Na Anthropic, total de entrada = `input_tokens` + `cache_read_input_tokens` + `cache_creation_input_tokens`; o custo calcula-se a partir do `usage`, não de estimativas.',
    'Retentáveis: 408, 409, 429, 5xx, 529 e falhas de ligação. Permanentes: 400, 401, 403, 404, 413. Um 429 de tecto de gasto não traz `retry-after` e não passa por esperar.',
    'Backoff exponencial com full jitter: espera = aleatório(0, min(tecto, base × 2ⁿ)). Se vier `Retry-After`, o servidor manda. Uma só camada retenta.',
    'Os SDKs oficiais retentam 2 vezes por omissão e têm timeout de 10 min por tentativa: num serviço interactivo define timeout por tentativa e um prazo total por turno.',
    'Em streaming, um erro pode chegar depois do 200 OK como evento `error`; o TTFT mede-se no primeiro delta de texto, não no cabeçalho.',
    'Cache de prompt: prefixo exactamente igual (ordem tools, system, messages), leitura a ≈ 10% do preço de entrada (varia por modelo), escrita ≈ 1,25×, TTL de 5 min renovado em cada uso.',
    'Lote: metade do preço, resultados em até 24 h, junta-se pelo `custom_id`. Serve avaliação nocturna e reprocessamento, não o que alguém está a ler.',
    'Rate limits por minuto (RPM, ITPM, OTPM na Anthropic; RPM e TPM na OpenAI) aplicados como token bucket e em janelas mais curtas: a média por minuto esconde os picos por segundo.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-apis-modelos-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Anatomia de um pedido e de uma resposta de mensagens',
      enunciado:
        'Descreve-me um pedido à API de mensagens de um fornecedor como a Anthropic ou a OpenAI e o que vem na resposta. Que campos da resposta o teu código tem de ler, além do texto?',
      minutos: 4,
      dica: 'O texto é o campo menos interessante da resposta.',
      resposta: [
        {
          type: 'p',
          text:
            'Um pedido é um `POST` com o modelo, um tecto de saída (`max_tokens`), um prompt de sistema, a lista de mensagens alternadas `user`/`assistant` e, opcionalmente, ferramentas. A resposta traz blocos de conteúdo, o **motivo de paragem** e o **uso em tokens** — e são estes dois últimos que o código de produção tem de ler sempre.',
        },
        {
          type: 'p',
          text:
            'A API é **sem estado**: o fornecedor não se lembra do turno anterior, por isso cada pedido reenvia o histórico inteiro. Isto tem duas consequências que digo logo: a entrada cresce a cada turno (uma conversa de 12 turnos custa bem mais do que 12 vezes um turno), e o que o meu código cortar ou resumir do histórico deixa de existir para o modelo. Na Anthropic o `system` é um campo de topo; na OpenAI é uma mensagem com papel `system` ou `developer`, ou o campo `instructions` na Responses API.',
        },
        {
          type: 'table',
          head: ['Campo', 'O que faço com ele'],
          rows: [
            ['`content` (blocos `text`, `tool_use`, `thinking`)', 'Não assumo `content[0].text`: itero pelos blocos e trato cada tipo'],
            ['`stop_reason: end_turn`', 'Fim natural: entrego a resposta'],
            ['`stop_reason: max_tokens`', 'Corte a meio: trato como falha, métrica de cortes, nunca mostro como completa'],
            ['`stop_reason: tool_use`', 'Executo a ferramenta e devolvo o resultado no pedido seguinte'],
            ['`stop_reason: refusal`', 'Resposta de recurso e registo para análise'],
            ['`usage`', 'Custo por pedido, por papel e por cliente; alimenta o orçamento e o alarme'],
            ['cabeçalho `request-id`', 'Guardo no span: é o que o suporte do fornecedor pede'],
          ],
        },
        {
          type: 'p',
          text:
            'No `usage` da Anthropic, `input_tokens` é só a parte que não veio da cache: o total de entrada é a soma com `cache_read_input_tokens` e `cache_creation_input_tokens`. Quem calcula custo só com `input_tokens` subestima a entrada; quem normaliza através do LangChain recebe o total já somado. Por isso o código de custo tem de saber de onde vem o número.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Ler só o texto',
          text:
            'O erro clássico é `resposta.content[0].text` e seguir. Uma resposta sobre um reembolso cortada por `max_tokens` omite exactamente a condição que vinha no fim, e com ferramentas o primeiro bloco pode nem ser texto.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Messages API', url: 'https://platform.claude.com/docs/en/api/messages' },
            { label: 'Anthropic — handling stop reasons', url: 'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons' },
            { label: 'OpenAI — Responses API', url: 'https://platform.openai.com/docs/api-reference/responses' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que a API é sem estado e que o histórico é reenviado em cada pedido.',
          'Nomeia pelo menos três valores de `stop_reason` e o tratamento de `max_tokens` como corte.',
          'Explica que o `usage` alimenta o custo e como se soma a entrada com cache.',
          'Itera pelos blocos de conteúdo em vez de assumir um único bloco de texto.',
        ],
        fraco: 'Descreve o pedido com `messages` e diz que a resposta «é o texto», sem motivo de paragem nem uso.',
        solido: 'Explica papéis, ausência de estado, `stop_reason` com tratamento por valor e o `usage` para custo.',
        excelente: 'Acrescenta a soma correcta da entrada com cache, o `request-id` nos traços, e liga a ausência de estado ao crescimento do custo por conversa e à necessidade de um orçamento de tokens.',
      },
      seguimento: [
        'O que fazes quando `max_tokens` aparece em 3% das respostas?',
        'Onde fica o prompt de sistema na Responses API da OpenAI?',
        'Como reconcilias o custo calculado pelo `usage` com a factura do mês?',
      ],
      sinaisAlarme: [
        'Achar que o fornecedor guarda a conversa entre pedidos.',
        'Mostrar ao cliente uma resposta com `max_tokens` como se estivesse completa.',
        'Estimar custo contando caracteres em vez de ler o `usage`.',
      ],
      modulos: ['apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-apis-modelos-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Streaming por SSE: o que muda no cliente',
      enunciado:
        'Passaste o assistente de resposta síncrona para streaming. O que muda no teu código de cliente, para além de mostrar o texto aos bocados?',
      minutos: 5,
      dica: 'Pensa em onde chegam o uso, o motivo de paragem e os erros.',
      resposta: [
        {
          type: 'p',
          text:
            'Muda quase tudo o que era simples: a resposta deixa de ser um objecto e passa a ser uma **sequência de eventos SSE** que tenho de acumular; o uso e o motivo de paragem só chegam **no fim**; e um erro pode chegar **depois do 200 OK**, a meio do stream, quando o cliente já leu metade da frase.',
        },
        {
          type: 'p',
          text:
            'Na Messages API a sequência é `message_start` (com o uso inicial e `stop_reason` nulo), depois para cada bloco `content_block_start`, vários `content_block_delta` e `content_block_stop`, depois `message_delta` com o `stop_reason` e o uso **cumulativo**, e por fim `message_stop`. Pelo meio podem vir `ping`, e o fornecedor avisa que pode acrescentar tipos de evento — o parser tem de ignorar o que não conhece. Os argumentos de uma chamada de ferramenta chegam como fragmentos `input_json_delta` que só posso fazer parse no `content_block_stop`.',
        },
        {
          type: 'list',
          items: [
            '**TTFT** mede-se no primeiro delta de texto, não no cabeçalho HTTP nem no `message_start`, que chegam antes do prefill acabar.',
            '**Erros a meio** chegam como `event: error` (por exemplo `overloaded_error`, o equivalente ao 529). As retentativas automáticas do SDK não se aplicam aqui: o meu código decide.',
            '**Retentar a meio** não é transparente: o cliente já viu texto. Ou mostro uma mensagem de recurso e recomeço, ou peço ao modelo que continue a partir do parcial, e nunca recupero meio bloco de ferramenta.',
            '**Cancelamento**: se o utilizador fecha a app, fecho o stream para deixar de gerar (e de pagar) tokens.',
            '**Infra**: proxies e balanceadores com buffering ou timeout de inactividade cortam streams longos; desligo o buffering e confirmo os timeouts de cada salto.',
          ],
        },
        {
          type: 'p',
          text:
            'No serviço, normalmente há dois streams: o do fornecedor para o meu backend, e o do meu backend para a app (SSE ou WebSocket). Não reencaminho os eventos crus do fornecedor: traduzo-os para um protocolo meu (texto, estado, fim, erro), para a app não depender do formato do fornecedor e para eu poder filtrar o que não deve sair, como blocos de raciocínio ou chamadas de ferramenta.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que meço',
          text:
            'TTFT e duração total por modelo, tokens por segundo de saída, taxa de streams terminados por erro e por cancelamento, e o uso final registado mesmo quando o stream acaba mal — senão o custo dos streams falhados desaparece do painel.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — streaming de mensagens', url: 'https://platform.claude.com/docs/en/build-with-claude/streaming' },
            { label: 'WHATWG — server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
            { label: 'OpenAI — streaming responses', url: 'https://platform.openai.com/docs/guides/streaming-responses' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o `stop_reason` e o uso final só chegam no fim do stream.',
          'Sabe que pode chegar um erro depois do 200 OK e que as retentativas do SDK não o cobrem.',
          'Define o TTFT no primeiro delta de texto.',
          'Menciona o parse diferido dos argumentos de ferramentas ou o cancelamento quando o utilizador sai.',
          'Propõe um protocolo próprio entre backend e app em vez de reencaminhar eventos crus.',
        ],
        fraco: '«Muda só a UI, o texto aparece aos poucos.» Nada sobre erros a meio, uso ou TTFT.',
        solido: 'Descreve a sequência de eventos, o uso e o motivo de paragem no fim, erros a meio do stream e onde medir o TTFT.',
        excelente: 'Acrescenta a política para erros depois de texto já mostrado, o cancelamento para poupar tokens, o buffering de proxies e a tradução para um protocolo próprio que isola a app do fornecedor.',
      },
      seguimento: [
        'O modelo já escreveu meia frase e chega um `overloaded_error`. O que vê o cliente?',
        'Como testas o parser de SSE sem chamar o fornecedor?',
        'Streaming compensa num classificador que devolve uma etiqueta?',
      ],
      sinaisAlarme: [
        'Medir o TTFT no primeiro byte HTTP.',
        'Assumir que um 200 OK garante que a resposta chega inteira.',
        'Reencaminhar para o browser os eventos crus do fornecedor, incluindo raciocínio.',
      ],
      modulos: ['apis-de-modelos', 'fastapi-servico'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-apis-modelos-03',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Que erros se repetem e quais nunca',
      enunciado:
        'A chamada ao modelo falhou. Como decides se repetes? Dá-me exemplos de códigos que repetes, que não repetes, e um caso em que repetir é perigoso.',
      minutos: 4,
      dica: 'Pergunta-te se o mesmo pedido, daqui a dois segundos, tem hipótese de correr bem — e se a chamada teve efeitos.',
      resposta: [
        {
          type: 'p',
          text:
            'Repito o que é **transitório** e não repito o que é **permanente**: se o mesmo pedido, sem alterações, pode correr bem daqui a uns segundos, retento com backoff; se vai falhar da mesma maneira, propago já. E separo isto de outra pergunta: se a operação **tem efeitos**, só a repito com idempotência.',
        },
        {
          type: 'table',
          head: ['Código', 'Significado (Anthropic)', 'Repito?'],
          rows: [
            ['400 `invalid_request_error`', 'Pedido mal formado (histórico com `tool_use` sem resultado, parâmetro inválido)', 'Não: é um bug'],
            ['401 / 403', 'Chave inválida ou sem permissão', 'Não: alarme, a chave não fica válida por esperar'],
            ['404 / 413', 'Modelo inexistente; pedido grande de mais', 'Não: corrijo o pedido (cortar contexto, nome do modelo)'],
            ['408 / 409', 'Timeout do pedido; conflito', 'Sim'],
            ['429 `rate_limit_error`', 'Quota da organização esgotada', 'Sim, respeitando `retry-after`; se persistir, fila ou fallback'],
            ['500 / 504', 'Erro interno; timeout no processamento', 'Sim, com backoff'],
            ['529 `overloaded_error`', 'Fornecedor sobrecarregado, não é quota minha', 'Poucas vezes; depois fallback'],
            ['Erro de ligação, reset', 'Rede', 'Sim'],
          ],
        },
        {
          type: 'p',
          text:
            'Há duas subtilezas. O 429 nem sempre é transitório: na Anthropic, um 429 por tecto de gasto mensal **não traz `retry-after`** e continua a falhar até o acesso ser reposto — por isso logo o corpo do erro e trato esse caso como incidente, não como espera. E o 529 é sobrecarga do lado do fornecedor: insistir agrava-a, por isso faço menos tentativas e passo a um modelo alternativo.',
        },
        {
          type: 'p',
          text:
            'Gerar texto não tem efeitos: retentar custa, no máximo, tokens pagos duas vezes. O perigo está **nas ferramentas** que o modelo pede. Se o agente chamou `emitir_reembolso` e a resposta HTTP do meu serviço de pagamentos se perdeu, repetir pode reembolsar duas vezes. Aí a ferramenta recebe uma chave de idempotência derivada do pedido (por exemplo, id da conversa mais id da chamada da ferramenta) e o serviço de pagamentos devolve o resultado anterior se a chave já existir.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Retentar 400',
          text:
            'Um wrapper genérico que retenta «qualquer excepção» transforma um bug determinista em três pedidos falhados, gasta o prazo do turno e esconde a causa nos logs. Os tipos de erro do fornecedor também podem crescer: classifico por estado HTTP e trato o desconhecido como não retentável.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — erros da API', url: 'https://platform.claude.com/docs/en/api/errors' },
            { label: 'Anthropic — rate limits', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
            { label: 'RFC 9110 — Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc9110#field.retry-after' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa transitórios (429, 5xx, 529, ligação) de permanentes (400, 401, 403, 404, 413).',
          'Menciona que 429 deve respeitar `retry-after` e que há 429 que não se resolvem a esperar.',
          'Distingue 529 (sobrecarga do fornecedor) de 429 (quota própria) no tratamento.',
          'Identifica as ferramentas com efeitos como o sítio onde repetir é perigoso e propõe chave de idempotência.',
        ],
        fraco: '«Repito sempre três vezes.» Sem distinção por código nem menção a efeitos.',
        solido: 'Tabela de retentáveis e permanentes, `retry-after` no 429, menos tentativas no 529.',
        excelente: 'Acrescenta o 429 de tecto de gasto sem `retry-after`, a separação entre retentar a chamada ao modelo e retentar a ferramenta, e a chave de idempotência derivada de ids estáveis.',
      },
      seguimento: [
        'De onde vem a chave de idempotência e quanto tempo a guardas?',
        'O que fazes ao 413 quando o histórico ficou grande de mais?',
        'Como distingues no painel 429 de quota de 529 de sobrecarga?',
      ],
      sinaisAlarme: [
        'Retentar 401 ou 400 «para o caso de ser passageiro».',
        'Não pensar no que acontece a uma ferramenta com efeitos repetida.',
        'Tratar 529 e 429 como a mesma coisa.',
      ],
      modulos: ['apis-de-modelos', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-apis-modelos-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Timeouts: TTFT, duração total e o stream que parou',
      enunciado:
        'Que timeouts configuras numa chamada a um LLM num serviço interactivo? E o que acontece quando o stream fica parado a meio sem erro?',
      minutos: 5,
      dica: 'O timeout de um cliente HTTP raramente é o que parece.',
      resposta: [
        {
          type: 'p',
          text:
            'Configuro três coisas distintas: um limite para o **primeiro token**, um limite de **inactividade entre eventos** do stream e um **prazo total do turno** que cobre todas as tentativas. Os valores por omissão dos SDKs não servem: são pensados para gerações longas e, num chat, prendem workers durante minutos.',
        },
        {
          type: 'p',
          text:
            'Os SDKs Python da Anthropic e da OpenAI vêm com **10 minutos** de timeout por tentativa e duas retentativas, o que dá um pior caso de mais de meia hora por chamada. E o timeout do `httpx` que usam é **por operação** (ligar, ler, escrever), não da duração total: um stream que envia um `ping` ou um token a cada 20 segundos nunca dispara um timeout de leitura de 30 s, mesmo que o turno dure cinco minutos. Por isso o prazo total tem de existir **por cima** do cliente HTTP, por exemplo com `asyncio.timeout` à volta do turno inteiro.',
        },
        {
          type: 'table',
          head: ['Timeout', 'Valor típico num chat', 'O que apanha'],
          rows: [
            ['Ligação', '≈ 5 s', 'Rede ou DNS em baixo'],
            ['Até ao primeiro token', '2 a 4× o p95 do TTFT do modelo', 'Fila do fornecedor ou prefill anormal'],
            ['Inactividade no stream', '≈ 10 a 20 s sem delta de texto', 'Stream pendurado que continua a mandar pings'],
            ['Prazo total do turno', 'O orçamento do produto (por exemplo 8 a 15 s)', 'A soma de tentativas, recuos e ferramentas'],
          ],
        },
        {
          type: 'p',
          text:
            'O stream parado é o caso traiçoeiro: a ligação está viva, chegam pings, não chega texto. Meço o tempo desde o último delta útil, não desde o último byte, e quando passa o limite cancelo, registo o parcial e decido como no erro a meio do stream: mensagem de recurso ou nova tentativa se ainda houver prazo. O prazo total é o que manda: se só faltam 2 s, não começo uma tentativa que precisa de 3 s para o primeiro token.',
        },
        {
          type: 'p',
          text:
            'Para trabalho longo (extracção de um PDF de 200 páginas, relatórios) é ao contrário: timeouts grandes, streaming ou API de lote, porque um pedido síncrono longo sem streaming arrisca ser cortado por redes que fecham ligações inactivas.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Timeouts que se somam',
          text:
            'Timeout de 20 s com 3 retentativas e um recuo até 8 s dá mais de 80 s no pior caso. Se o balanceador corta aos 60 s, o cliente vê um 504 enquanto o backend ainda está a pagar tokens de uma resposta que ninguém vai ler.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic SDK Python — timeouts e retentativas', url: 'https://github.com/anthropics/anthropic-sdk-python' },
            { label: 'Python — asyncio.timeout', url: 'https://docs.python.org/3/library/asyncio-task.html#timeouts' },
            { label: 'Anthropic — erros e pedidos longos', url: 'https://platform.claude.com/docs/en/api/errors' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue timeout de ligação, primeiro token, inactividade e prazo total.',
          'Sabe que o timeout por omissão dos SDKs é longo (minutos) e inadequado para chat.',
          'Explica que o timeout do cliente HTTP é por operação e não limita a duração total do stream.',
          'Trata o stream parado medindo tempo desde o último delta útil, não desde o último byte.',
          'Calcula ou menciona o pior caso de timeouts multiplicados por retentativas.',
        ],
        fraco: '«Ponho timeout de 30 segundos.» Sem distinguir fases nem pensar em retentativas.',
        solido: 'Separa TTFT, inactividade e prazo total, e sabe que o prazo total tem de ser imposto acima do cliente HTTP.',
        excelente: 'Acrescenta o cálculo do pior caso, a regra de não começar uma tentativa que não cabe no prazo restante e a coerência com os timeouts do balanceador e da app.',
      },
      seguimento: [
        'Como escolhes o valor do timeout de primeiro token sem dados de produção?',
        'O balanceador corta aos 60 s. Como alinhas isso com o backend?',
        'Que métrica te avisa de que os timeouts estão demasiado apertados?',
      ],
      sinaisAlarme: [
        'Deixar o timeout por omissão do SDK num serviço interactivo.',
        'Achar que um timeout de leitura de 30 s limita a duração do stream a 30 s.',
        'Não ter prazo total por turno.',
      ],
      modulos: ['apis-de-modelos', 'fastapi-servico'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-apis-modelos-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Como funciona a cache de prompt e o que a invalida',
      enunciado:
        'Explica-me a cache de prompt dos fornecedores: o que fica guardado, o que a invalida e quanto poupa, em custo e em latência.',
      minutos: 5,
      dica: 'A palavra que importa é «prefixo».',
      resposta: [
        {
          type: 'p',
          text:
            'O fornecedor guarda o estado de atenção já calculado (o KV cache) de um **prefixo** do pedido durante alguns minutos; se o pedido seguinte começa **exactamente** igual, esse prefixo não é recalculado e é cobrado a uma fracção do preço. Poupa custo de entrada e tempo de prefill, e não muda a resposta.',
        },
        {
          type: 'p',
          text:
            'Na Anthropic marco o fim do prefixo com `cache_control` (até 4 marcadores, ou o modo automático que avança o marcador com a conversa). O prefixo segue a ordem `tools` → `system` → `messages`, por isso um marcador no fim do sistema também cobre os esquemas das ferramentas. A escrita custa ≈ 1,25× o preço de entrada com TTL de 5 minutos (≈ 2× com 1 hora), a leitura ≈ 0,1× na maioria dos modelos, e o TTL renova-se a cada uso. Na OpenAI a cache é automática a partir de 1 024 tokens. Há um mínimo de tokens para cachear que depende do modelo; abaixo dele não há erro, simplesmente não há cache.',
        },
        {
          type: 'list',
          items: [
            '**Qualquer byte diferente antes do marcador** gera um prefixo novo: uma data ou um id de pedido no sistema, um espaço a mais, esquemas de ferramentas serializados com chaves por outra ordem.',
            '**Mudar ferramentas** invalida tudo; mudar `tool_choice`, imagens ou parâmetros de raciocínio invalida a parte das mensagens.',
            '**Expirar**: com tráfego baixo, o prefixo morre entre pedidos e cada um paga a escrita sem nunca ler.',
            '**Isolamento**: a cache não é partilhada entre organizações e, na API da Anthropic, nem entre workspaces.',
          ],
        },
        {
          type: 'p',
          text:
            'Por isso o desenho do prompt muda: **estável à esquerda, variável à direita**. Instruções, políticas e esquemas no início; histórico depois; contexto recuperado e pergunta no fim. Num assistente de suporte com 5 200 tokens de entrada e 60% em prefixo cacheado, a entrada paga cai para perto de metade. Há um bónus menos óbvio: na Anthropic, para a maioria dos modelos, os tokens lidos da cache não contam para o limite de tokens de entrada por minuto, o que aumenta o débito efectivo.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como sei que está a funcionar',
          text:
            'Registo `cache_read_input_tokens` e `cache_creation_input_tokens` por pedido e mostro a taxa de acerto no painel. Uma queda súbita depois de um deploy quase sempre é um byte variável que entrou no prefixo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
            { label: 'OpenAI — prompt caching', url: 'https://platform.openai.com/docs/guides/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que a cache é de prefixo e exige igualdade exacta até ao marcador.',
          'Dá a ordem de grandeza: escrita mais cara que a entrada normal, leitura a ≈ 10%, TTL de minutos.',
          'Dá exemplos concretos de invalidação (data no sistema, ferramentas mudadas, ordem das chaves).',
          'Tira a consequência de desenho: estável primeiro, variável no fim.',
          'Propõe medir a taxa de acerto a partir do `usage`.',
        ],
        fraco: '«Guarda as respostas para perguntas repetidas.» Confunde com cache semântica de respostas.',
        solido: 'Explica prefixo, igualdade exacta, preços relativos, TTL e a ordem estável-variável.',
        excelente: 'Acrescenta o efeito no rate limit de entrada, o custo de escrita sem leitura em tráfego baixo, o isolamento por organização e o alarme sobre a taxa de acerto depois de cada deploy.',
      },
      seguimento: [
        'Com 20 pedidos por hora, a cache compensa? E o TTL de 1 hora?',
        'Onde pões a data de hoje se o prompt precisar dela?',
        'Qual é a diferença para uma cache semântica de respostas?',
      ],
      sinaisAlarme: [
        'Confundir cache de prompt com guardar respostas.',
        'Pôr timestamps ou ids no início do prompt de sistema.',
        'Afirmar poupanças sem medir a taxa de acerto.',
      ],
      modulos: ['apis-de-modelos', 'custo-escala', 'prompt-engineering'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-apis-modelos-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'API de lote ou chamadas síncronas',
      enunciado:
        'Tens de reclassificar 400 mil tickets antigos com a nova taxonomia e, ao mesmo tempo, correr a avaliação do gate de CI. Usarias a API de lote para algum deles? Em que condições compensa?',
      minutos: 7,
      dica: 'O desconto é o mesmo nos dois; o que muda é quem está à espera.',
      resposta: [
        {
          type: 'p',
          text:
            'A reclassificação vai para lote, o gate de CI não. O lote cobra **metade do preço** em troca de **não garantir latência abaixo de 24 horas**: compensa para trabalho que ninguém está a ler e que tolera horas; não serve para nada que bloqueie uma pessoa ou um merge.',
        },
        {
          type: 'p',
          text:
            'Mecânica, na Anthropic: submeto até 100 mil pedidos ou 256 MB por lote, cada um com um `custom_id`; a maioria acaba em menos de uma hora mas o contrato é 24 h, e o que não for processado nesse prazo vem como `expired`. Os resultados ficam disponíveis 29 dias e chegam **por qualquer ordem**, por isso junto-os pelo `custom_id`. Pedidos com erro, cancelados ou expirados não são cobrados. A OpenAI tem o mesmo modelo: ficheiro JSONL, janela de 24 h, desconto de 50%.',
        },
        {
          type: 'compare',
          left: {
            title: 'Lote',
            items: [
              'Metade do preço; o desconto acumula com a cache de prompt',
              'Não consome a quota síncrona do produto',
              'Sem garantia abaixo de 24 h; sem streaming',
              'Exige orquestração: submeter, sondar, juntar por `custom_id`, reprocessar falhas',
              'Acertos de cache são best-effort',
            ],
          },
          right: {
            title: 'Síncrono',
            items: [
              'Latência previsível, resultado no mesmo pedido',
              'Preço cheio',
              'Compete com o tráfego do produto pelos mesmos RPM e TPM',
              'Código simples, retentativas pelo SDK',
              'Cache de prompt controlável pelo ritmo dos pedidos',
            ],
          },
        },
        {
          type: 'p',
          text:
            'Os 400 mil tickets: com, digamos, 800 tokens de entrada e 20 de saída cada, são ≈ 320 M tokens de entrada. Em síncrono, além de pagar o dobro, isto disputaria o limite de tokens por minuto com o produto durante horas; em lote fica fora dessa quota. Partia em lotes de 50 mil, guardava o estado de cada lote numa tabela e reprocessava os `errored` e `expired` num lote seguinte. O gate de CI tem de responder em minutos dentro do pull request: fica síncrono, com concorrência limitada e cache de prompt na rubrica do juiz.',
        },
        {
          type: 'p',
          text:
            'Quando é que o lote **não** compensa, mesmo sem pressa? Quando o volume é pequeno (poupar 3 USD não paga a orquestração), quando preciso de iterar no prompt e ver resultados em minutos, ou quando o pedido seguinte depende do resultado do anterior — um agente com ferramentas não cabe num lote.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Lote no caminho crítico',
          text:
            'Pôr num lote a avaliação que decide um deploy ou uma resposta a um cliente porque «normalmente demora menos de uma hora». O normal não é o contrato: no dia em que demorar 20 horas, o deploy ou o cliente ficam à espera.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Message Batches', url: 'https://platform.claude.com/docs/en/build-with-claude/batch-processing' },
            { label: 'OpenAI — Batch API', url: 'https://platform.openai.com/docs/guides/batch' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Coloca a reclassificação em lote e o gate de CI em síncrono, com a razão (quem espera).',
          'Diz os números do contrato: ≈ 50% de desconto e até 24 h.',
          'Menciona `custom_id` e a ordem arbitrária dos resultados.',
          'Trata falhas e expirados com reprocessamento.',
          'Diz quando o lote não compensa (volume pequeno, iteração rápida, dependências entre pedidos).',
        ],
        fraco: '«Uso lote para tudo porque é mais barato.» Ou nunca usa porque «é complicado».',
        solido: 'Separa cargas por tolerância à latência, conhece desconto e janela, junta por `custom_id`.',
        excelente: 'Faz a conta de tokens, nota que o lote não disputa a quota síncrona do produto, desenha o reprocessamento de falhas e diz explicitamente quando a orquestração não se paga.',
      },
      seguimento: [
        'Como garantes que a cache de prompt acerta dentro do lote?',
        'O lote expirou com 8% dos pedidos por processar. E agora?',
        'Como controlas versões do prompt num lote que demora horas?',
      ],
      sinaisAlarme: [
        'Pôr num lote algo com um humano ou um merge à espera.',
        'Assumir que os resultados vêm pela ordem de submissão.',
        'Não ter plano para pedidos falhados ou expirados.',
      ],
      modulos: ['apis-de-modelos', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-apis-modelos-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Abstracção própria sobre o fornecedor e fallback entre fornecedores',
      enunciado:
        'A equipa quer «não ficar presa a um fornecedor» e propõe uma camada de abstracção com fallback automático para outro fornecedor quando o principal falha. Concordas? O que é que essa camada deve e não deve esconder?',
      minutos: 8,
      dica: 'A interface esconde a diferença de API. Esconde a diferença de comportamento?',
      resposta: [
        {
          type: 'p',
          text:
            'Concordo com uma camada **fina** que concentra a política (versão, timeouts, retentativas, escalão, métricas de uso) e esconde o SDK do resto do código. Não concordo com um fallback automático entre fornecedores **sem avaliação**: a interface esconde a diferença de API, não a diferença de comportamento, e um modelo de outro fornecedor com o mesmo prompt é, para efeitos práticos, outro produto.',
        },
        {
          type: 'p',
          text:
            'O que a camada deve concentrar: o nome exacto da versão do modelo (nada de aliases móveis), timeouts e retentativas num só sítio, o mapeamento de papéis para escalões (classificador no pequeno, resposta no médio), o registo do `usage` e do `request-id` em cada span, e um duplo para testes que permita correr o CI sem rede. Quando o fornecedor muda, muda um módulo e a configuração, não catorze ficheiros. O que **não** deve fazer: reinventar o formato das mensagens ou o streaming quando já há uma biblioteca que o faz, nem nivelar por baixo funcionalidades que só um fornecedor tem (cache explícita, raciocínio, saída estruturada) só para manter a interface «pura».',
        },
        {
          type: 'table',
          head: ['Opção de resiliência', 'Ganho', 'Custo e risco'],
          rows: [
            ['Retentar no mesmo modelo', 'Resolve transitórios curtos', 'Não ajuda numa queda longa; agrava sobrecarga'],
            ['Outro modelo do mesmo fornecedor', 'Prompts e formato iguais, comportamento parecido', 'Não cobre uma queda do fornecedor inteiro'],
            ['Mesmo modelo noutra cloud (região ou hyperscaler)', 'Comportamento idêntico', 'Outra conta, outros limites, residência de dados a validar'],
            ['Outro fornecedor', 'Cobre a queda total', 'Prompts afinados para outro modelo, ferramentas e saída estruturada diferentes, outro DPA'],
            ['Degradar sem modelo', 'Sempre disponível', 'Resposta pobre: mensagem fixa, encaminhar para humano'],
          ],
        },
        {
          type: 'p',
          text:
            'Se o negócio justificar o fallback para outro fornecedor, trato-o como um **segundo produto**: um prompt próprio para esse modelo, o mesmo golden set a correr nos dois em cada alteração, um circuit breaker que liga o fallback por taxa de erro e não por pedido, e uma lista de funcionalidades que o fallback não faz (por exemplo, emitir reembolsos), passando nesses casos para um humano. E verifico o contrato: enviar dados de clientes para um segundo fornecedor tem de estar coberto pelo acordo de tratamento de dados.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Quanto custa não ter fallback',
          text:
            'Decido pelo número: minutos de indisponibilidade por mês do fornecedor principal vezes o custo por minuto sem assistente (conversas que vão para humanos), contra o custo de manter e avaliar um segundo caminho. Muitas vezes a degradação para humano chega.',
        },
        {
          type: 'adr',
          ref: 'adr-0003',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — modelos de chat e init_chat_model', url: 'https://docs.langchain.com/oss/python/langchain/models' },
            { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Martin Fowler — Circuit Breaker', url: 'https://martinfowler.com/bliki/CircuitBreaker.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Defende uma camada fina que concentra política (versão, timeouts, retentativas, métricas), não uma reimplementação das APIs.',
          'Diz que trocar de fornecedor muda comportamento e exige avaliação com o mesmo golden set.',
          'Ordena as opções de resiliência (mesmo modelo, outro modelo, outra cloud, outro fornecedor, degradação) com custos.',
          'Menciona circuit breaker por taxa de erro e funcionalidades desligadas no modo de fallback.',
          'Lembra a questão contratual e de dados ao enviar tráfego a um segundo fornecedor.',
        ],
        fraco: '«Sim, usamos uma biblioteca que fala com todos e trocamos quando falha.»',
        solido: 'Camada fina com política centralizada, fallback avaliado e circuit breaker.',
        excelente: 'Acrescenta a análise de custo da indisponibilidade contra o custo de manter o segundo caminho, o fallback como produto com prompt e evals próprios, as funcionalidades restritas e a verificação do acordo de dados.',
      },
      seguimento: [
        'Como testas o caminho de fallback se ele quase nunca é usado?',
        'O que fazes às funcionalidades que só o fornecedor principal tem?',
        'Quem decide ligar o fallback: o código ou uma pessoa?',
      ],
      sinaisAlarme: [
        '«Os modelos são todos iguais, é só mudar o endpoint.»',
        'Abstracção com o mínimo denominador comum que impede usar cache ou saída estruturada.',
        'Fallback que nunca foi exercitado em teste nem em game day.',
      ],
      modulos: ['apis-de-modelos', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-apis-modelos-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Rate limits do fornecedor: fila própria ou bater no 429',
      enunciado:
        'Três serviços da empresa partilham a mesma organização no fornecedor, com limites de pedidos e tokens por minuto. Deixas cada um bater no 429 e retentar, ou metes alguma coisa à frente? Como decides quem passa quando não chega para todos?',
      minutos: 8,
      dica: 'O 429 diz-te que já passaste o limite. O que precisas é de não lá chegar.',
      resposta: [
        {
          type: 'p',
          text:
            'Ponho um **controlo de admissão** à frente: a quota do fornecedor é um recurso partilhado, e deixar três serviços descobri-la por 429 é deixar o batch nocturno de um tirar capacidade ao chat de outro. Retentar com backoff fica como segunda linha, não como mecanismo de partilha.',
        },
        {
          type: 'p',
          text:
            'Começo por perceber o limite. Na Anthropic há três por classe de modelo: pedidos (RPM), tokens de entrada (ITPM) e de saída (OTPM); na OpenAI, pedidos e tokens por minuto. São aplicados como **token bucket**, com reposição contínua, e podem ser impostos em janelas mais curtas — 60 RPM pode significar 1 por segundo —, por isso um pico de alguns segundos dá 429 com uma média baixa. Os cabeçalhos de resposta dizem quanto resta (`anthropic-ratelimit-*`, `x-ratelimit-*` na OpenAI), e isso é o sinal que o meu limitador usa.',
        },
        {
          type: 'table',
          head: ['Abordagem', 'Quando serve', 'Problema'],
          rows: [
            ['Cada serviço retenta o 429', 'Um só serviço, tráfego baixo', 'Sem prioridade; retentativas sincronizadas amplificam o pico'],
            ['Quota fixa por serviço (workspaces ou chaves com limite)', 'Equipas independentes, cargas estáveis', 'Capacidade parada num serviço enquanto outro falha'],
            ['Limitador central (token bucket partilhado em Redis) com prioridades', 'Cargas mistas: chat, agentes, batch', 'Mais um componente crítico; tem de falhar aberto ou fechado de forma pensada'],
            ['Fila assíncrona para o que tolera atraso', 'Batch, enriquecimentos, avaliação', 'Latência; precisa de prazo e de descarte'],
          ],
        },
        {
          type: 'p',
          text:
            'A prioridade sai do negócio: tráfego interactivo de clientes primeiro, depois agentes internos, depois batch. O limitador reserva uma fracção (por exemplo 70%) para o interactivo e deixa o batch usar o que sobra, recuando assim que os cabeçalhos mostram o balde a esvaziar. O batch que tolera horas devia, aliás, ir para a API de lote, que não disputa esta quota. Para estimar tokens antes do pedido uso a contagem de tokens do prompt mais o `max_tokens` como reserva e corrijo com o `usage` real no fim.',
        },
        {
          type: 'p',
          text:
            'Quando mesmo assim não chega, **descarto cedo** em vez de enfileirar para sempre: um pedido de chat que já esperou 5 s na fila vale menos do que uma resposta de recurso imediata. E as alavancas de capacidade antes de pedir mais quota: cache de prompt (tokens lidos da cache não contam para o ITPM na maioria dos modelos da Anthropic), cortar contexto inútil, modelo mais pequeno no classificador.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Fila sem prazo',
          text:
            'Uma fila sem tempo máximo de espera esconde o problema e devolve respostas a clientes que já desistiram, pagando os tokens. Cada pedido entra com o seu prazo e sai da fila quando ele passa.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — rate limits', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
            { label: 'OpenAI — rate limits', url: 'https://platform.openai.com/docs/guides/rate-limits' },
            { label: 'Google SRE — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia os limites (pedidos e tokens de entrada e saída por minuto) e o token bucket.',
          'Explica que janelas curtas tornam a média por minuto enganadora.',
          'Propõe controlo de admissão com prioridade por tipo de tráfego, não só retentativas.',
          'Usa os cabeçalhos de rate limit como sinal e reconcilia a estimativa de tokens com o `usage`.',
          'Descarta pedidos que passam o prazo em vez de os enfileirar indefinidamente.',
          'Menciona alavancas de capacidade (cache, API de lote, contexto menor) antes de pedir mais quota.',
        ],
        fraco: '«Retento com backoff até passar.»',
        solido: 'Limitador partilhado com prioridade para o interactivo, batch em fila ou API de lote, cabeçalhos como sinal.',
        excelente: 'Acrescenta reservas por classe, descarte por prazo, comportamento do limitador quando cai, e reduz a procura de tokens antes de negociar quota.',
      },
      seguimento: [
        'O teu limitador central em Redis cai. Os serviços param ou passam sem controlo?',
        'Como estimas os tokens de saída de um pedido antes de o fazer?',
        'Quando é que pedes ao fornecedor um aumento de limite?',
      ],
      sinaisAlarme: [
        'Achar que a média por minuto abaixo do limite garante que não há 429.',
        'Partilhar quota entre chat e batch sem prioridade.',
        'Filas sem prazo nem descarte.',
      ],
      modulos: ['apis-de-modelos', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-apis-modelos-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Cliente com retentativas, backoff, jitter e Retry-After',
      enunciado:
        'Escreve uma função que chama o modelo com retentativas: backoff exponencial com jitter, respeita o `Retry-After`, não repete erros 4xx não retentáveis e nunca passa um prazo total. Mostra como a testarias sem rede.',
      contexto:
        'Assinatura: `chamar(fn, *, tentativas=4, base=0.5, teto=8.0, prazo=20.0) -> resultado`, onde `fn()` faz o pedido e levanta `ErroHTTP(status, headers)` ou erros de ligação. Python 3.13, só biblioteca padrão. O `Retry-After` pode vir em segundos ou como data HTTP (RFC 9110). O teste não pode dormir de verdade.',
      minutos: 20,
      dica: 'Injecta o relógio, o sono e o gerador aleatório.',
      resposta: [
        {
          type: 'p',
          text:
            'Classifico primeiro, espero depois. Um conjunto explícito de estados retentáveis (408, 409, 429, 5xx, 529) e as falhas de ligação; tudo o resto sobe logo como definitivo. A espera é **full jitter** — aleatória entre 0 e `min(teto, base × 2ⁿ)` — e, se o servidor mandou `Retry-After`, espero pelo menos isso. Antes de dormir verifico se a espera cabe no prazo: se não cabe, falho já em vez de dormir para nada. Complexidade O(tentativas); injecto relógio, sono e aleatório para testar de forma determinista.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Corre com `python3`; as linhas de comentário depois de cada `print` são a saída real.',
          code: `import random
import time
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

RETENTAVEIS = {408, 409, 429, 500, 502, 503, 504, 529}


@dataclass
class ErroHTTP(Exception):
    status: int
    headers: dict[str, str]


class ErroDefinitivo(Exception):
    """Falha que não vale a pena repetir (ou o prazo acabou)."""


def ler_retry_after(headers: dict[str, str], agora: datetime) -> float | None:
    """RFC 9110: segundos inteiros ou uma data HTTP. Devolve segundos ou None."""
    valor = {k.lower(): v for k, v in headers.items()}.get("retry-after")
    if valor is None:
        return None
    valor = valor.strip()
    if valor.isdigit():
        return float(valor)
    try:
        return max(0.0, (parsedate_to_datetime(valor) - agora).total_seconds())
    except (TypeError, ValueError):
        return None  # cabeçalho mal formado: ignora e usa o backoff


def chamar(fn, *, tentativas=4, base=0.5, teto=8.0, prazo=20.0,
           dormir=time.sleep, relogio=time.monotonic, rng=random.random,
           agora_utc=lambda: datetime.now(timezone.utc)):
    """Chama fn() com backoff exponencial + full jitter, respeitando Retry-After.

    Repete só erros transitórios (RETENTAVEIS e falhas de ligação); 4xx
    permanentes sobem logo. Nunca dorme para lá do prazo total.
    """
    inicio = relogio()
    for n in range(tentativas):
        try:
            return fn()
        except ErroHTTP as e:
            if e.status not in RETENTAVEIS:
                raise ErroDefinitivo(f"HTTP {e.status} não retentável") from e
            ultimo, ra = e, ler_retry_after(e.headers, agora_utc())
        except (ConnectionError, TimeoutError) as e:
            ultimo, ra = e, None
        if n == tentativas - 1:
            break
        espera = rng() * min(teto, base * 2 ** n)      # full jitter
        if ra is not None:
            espera = max(espera, ra)                   # o servidor manda
        if relogio() - inicio + espera > prazo:
            raise ErroDefinitivo(f"esperar {espera:.1f} s passa o prazo") from ultimo
        dormir(espera)
    raise ErroDefinitivo(f"esgotou {tentativas} tentativas") from ultimo


# ---------- teste com relógio falso: sem rede e sem esperas reais
class Relogio:
    def __init__(self):
        self.t = 0.0
        self.esperas = []

    def dormir(self, s):
        self.esperas.append(round(s, 2))
        self.t += s


def roteiro(*passos):
    it = iter(passos)
    def fn():
        p = next(it)
        if isinstance(p, Exception):
            raise p
        return p
    return fn


r = Relogio()
fn = roteiro(ErroHTTP(529, {}), ErroHTTP(429, {"Retry-After": "3"}), "ok")
print(chamar(fn, dormir=r.dormir, relogio=lambda: r.t, rng=lambda: 0.5), r.esperas)
# ok [0.25, 3.0]

r = Relogio()
try:
    chamar(roteiro(ErroHTTP(400, {}), "nunca"), dormir=r.dormir, relogio=lambda: r.t)
except ErroDefinitivo as e:
    print(e, r.esperas)
# HTTP 400 não retentável []

r = Relogio()
try:
    chamar(roteiro(ErroHTTP(429, {"retry-after": "60"})), dormir=r.dormir, relogio=lambda: r.t)
except ErroDefinitivo as e:
    print(e)
# esperar 60.0 s passa o prazo

fixo = datetime(2026, 10, 23, 20, 0, 0, tzinfo=timezone.utc)
print(ler_retry_after({"Retry-After": "Fri, 23 Oct 2026 20:00:07 GMT"}, fixo))
# 7.0`,
        },
        {
          type: 'list',
          items: [
            '**Casos-limite cobertos**: `Retry-After` em segundos, como data HTTP, mal formado ou ausente; nomes de cabeçalho em qualquer capitalização; `Retry-After` maior do que o prazo restante; última tentativa sem dormir.',
            '**Porquê full jitter**: com mil clientes a receber 429 no mesmo segundo, um recuo fixo fá-los voltar todos no mesmo segundo seguinte; o aleatório espalha-os.',
            '**O que não faço**: não retento 4xx desconhecidos, não engulo a causa (`from ultimo` mantém a cadeia de excepções) e não meto esta camada por cima das retentativas do SDK — ou `max_retries=0` no SDK, ou não uso esta função.',
          ],
        },
        {
          type: 'p',
          text:
            'Testes que acrescentava: falhas de ligação seguidas de sucesso; esgotar as quatro tentativas com 500; propriedade de que a soma das esperas nunca passa o prazo para qualquer sequência de erros (com Hypothesis); e um teste de que 401 não dorme nunca.',
        },
        {
          type: 'p',
          text:
            'Extensões que o entrevistador costuma pedir: versão `async` com `asyncio.sleep` e `asyncio.timeout` à volta da tentativa; um **orçamento de retentativas** por cliente (por exemplo, retentativas abaixo de 10% dos pedidos, como no livro de SRE da Google) para que uma queda não multiplique o tráfego; métricas de tentativas por chamada e de espera total; e, para ferramentas com efeitos, uma chave de idempotência passada em todas as tentativas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RFC 9110 — Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc9110#field.retry-after' },
            { label: 'AWS Architecture Blog — Exponential Backoff and Jitter', url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/' },
            { label: 'Google SRE — Handling Overload (orçamento de retentativas)', url: 'https://sre.google/sre-book/handling-overload/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Classifica estados retentáveis e não retentáveis antes de esperar, e os 4xx permanentes sobem sem dormir.',
          'Implementa backoff exponencial com jitter aleatório e tecto.',
          'Lê `Retry-After` nos dois formatos da RFC 9110 e usa-o como espera mínima.',
          'Impõe um prazo total e não dorme quando a espera não cabe.',
          'Testa de forma determinista, injectando relógio, sono e aleatório, com resultados esperados.',
        ],
        fraco: 'Um ciclo `for` com `time.sleep(2 ** n)` que apanha `Exception` e retenta tudo, sem teste.',
        solido: 'Classificação correcta, full jitter, `Retry-After` em segundos, prazo total e um teste com relógio falso.',
        excelente: 'Acrescenta a data HTTP no `Retry-After`, a regra de uma só camada de retentativas com o SDK, orçamento de retentativas por cliente, métricas, e a idempotência para chamadas com efeitos.',
      },
      seguimento: [
        'Como passavas isto para `async` sem bloquear o event loop?',
        'O fornecedor manda `Retry-After: 0`. Retentas logo?',
        'Como evitas que este código e o `max_retries` do SDK se multipliquem?',
      ],
      sinaisAlarme: [
        'Apanhar `Exception` e retentar tudo.',
        'Backoff sem jitter.',
        'Testes que dormem de verdade ou chamam a API real.',
      ],
      modulos: ['apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-apis-modelos-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'Picos de 429 às sextas à noite com média baixa',
      enunciado:
        'O painel mostra que usamos em média 35% do limite de tokens por minuto do fornecedor, mas às sextas entre as 20h e as 21h30 a taxa de 429 sobe de 0,1% para 9%. O fornecedor diz que não há incidente. Como investigas?',
      contexto:
        'Assistente de apoio de um banco móvel em Maputo, sobre um modelo médio de um fornecedor externo. O tráfego de clientes às sextas à noite é ≈ 2,5× a média horária. Métricas agregadas por minuto. Os cabeçalhos de rate limit não são registados. A organização no fornecedor é partilhada com a equipa de dados, que tem jobs agendados. O cliente HTTP usa o SDK com `max_retries=2` dentro de um decorador `@retry(tentativas=3)`. Na quinta-feira anterior ao primeiro pico houve um deploy que acrescentou ao prompt de sistema o nome e o segmento do cliente.',
      minutos: 12,
      dica: 'Uma média por minuto de uma organização inteira esconde três coisas diferentes.',
      resposta: [
        {
          type: 'p',
          text:
            'A média por minuto é a métrica errada: o limite é aplicado como token bucket, em janelas que podem ser de segundos, e conta o consumo da **organização inteira**. As hipóteses mais prováveis são, por ordem: o deploy de quinta **partiu a cache de prompt** e os tokens de entrada que contam para o limite subiram; um **job da equipa de dados** a disputar a mesma quota à mesma hora; e **retentativas em duas camadas** que transformam o primeiro 429 numa rajada.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'A cache (mais provável, barata de verificar)',
              text:
                'Pôr o nome e o segmento do cliente no prompt de sistema faz o prefixo mudar por cliente: a cache deixa de acertar. Na maioria dos modelos da Anthropic, tokens lidos da cache não contam para o ITPM — com 60% de acerto, a entrada que conta é 40% da total; sem cache passa a 100%, ou seja, 2,5× mais. Verifico `cache_read_input_tokens` por dia: se caiu para perto de zero depois de quinta, está explicado, e a média de 35% está a ser calculada sobre total ou sobre o tráfego médio, não sobre o pico de sexta.',
            },
            {
              title: 'Quem mais consome a quota',
              text:
                'Peço à equipa de dados o calendário de jobs e cruzo com os 429 ao minuto. Começo a registar os cabeçalhos `anthropic-ratelimit-*-remaining` em cada resposta: se o balde está a esvaziar antes de o nosso tráfego subir, o consumidor é outro. A consola do fornecedor mostra o uso por workspace ou chave.',
            },
            {
              title: 'Amplificação por retentativas',
              text:
                'O SDK com `max_retries=2` dentro de `@retry(3)` faz até 9 pedidos por chamada lógica. Conto pedidos HTTP por chamada lógica no pico: se a razão passa de 1,05 para 2 ou 3, as retentativas estão a alimentar o pico. Se a resposta trouxer `retry-after` e o decorador o ignorar, os clientes voltam todos ao mesmo tempo.',
            },
            {
              title: 'Granularidade',
              text:
                'Reagrego as métricas ao segundo (ou uso os traços) para ver rajadas: 2,5× por hora pode ser 10× durante 30 s no fim de um jogo de futebol ou de uma campanha de notificações push. Confirmo também que são mesmo 429 e não 529 de sobrecarga, que pedem tratamento diferente.',
            },
          ],
        },
        {
          type: 'p',
          text:
            'Correcção, por ordem: tirar os dados do cliente do prompt de sistema e pô-los no fim, depois do prefixo cacheado (o nome do cliente não justifica perder a cache); remover uma das camadas de retentativas e respeitar `retry-after`; separar a quota da equipa de dados num workspace com limite próprio, ou mover os jobs para a API de lote; e só depois, se ainda faltar capacidade, um limitador com prioridade para o tráfego de clientes ou pedido de aumento de limite.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text:
            'Alarme sobre a taxa de acerto da cache por deploy, métrica de pedidos HTTP por chamada lógica, registo dos cabeçalhos de quota restante, e um teste de carga com o perfil de sexta à noite (rajadas incluídas) no gate de releases que mexem no prompt.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — rate limits (token bucket, cache e ITPM)', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
            { label: 'Google SRE — Addressing Cascading Failures', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica porque é que a média por minuto não exclui 429 (token bucket, janelas curtas, organização partilhada).',
          'Liga o deploy do prompt à perda de cache e ao aumento dos tokens que contam para o limite.',
          'Identifica a multiplicação de retentativas (2 camadas, até 9 pedidos por chamada).',
          'Propõe medições concretas: cabeçalhos de quota restante, taxa de acerto da cache, pedidos por chamada lógica, métricas ao segundo.',
          'Ordena as correcções pelo custo e propõe alarmes que impeçam a regressão.',
        ],
        fraco: '«Pedimos mais quota ao fornecedor.» Ou culpa o fornecedor sem medir nada.',
        solido: 'Encontra a multiplicação de retentativas e o job partilhado, e passa a registar os cabeçalhos de rate limit.',
        excelente: 'Encontra a perda de cache pelo deploy e quantifica o efeito no ITPM, corrige a ordem do prompt, separa quotas por workspace e acrescenta alarmes por deploy e teste de carga com rajadas.',
      },
      seguimento: [
        'Como confirmavas a hipótese da cache sem esperar pela sexta seguinte?',
        'A equipa de dados recusa-se a mudar de horário. O que propões?',
        'Que alarme te teria avisado na quinta-feira?',
      ],
      sinaisAlarme: [
        'Pedir aumento de quota antes de medir.',
        'Não relacionar o deploy da véspera com o sintoma.',
        'Acrescentar mais retentativas para «aguentar» os 429.',
      ],
      modulos: ['apis-de-modelos', 'observabilidade-llmops', 'custo-escala'],
    },
  ],
};
