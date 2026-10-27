import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'servir-modelos',
  numero: 25,
  bloco: 'producao',
  titulo: 'Servir LLMs: streaming, concorrência e inferência',
  resumo:
    'Do endpoint que faz streaming de tokens ao servidor de inferência na GPU: SSE, async em Python, cancelamento, timeouts e backpressure, continuous batching e PagedAttention, memória de GPU, quantização e autoscaling. É onde um engenheiro de backend sénior mostra que sabe aplicar o que já sabe a um recurso caro e lento.',
  icon: '🚀',
  modulos: ['fastapi-servico', 'escolher-modelo', 'custo-escala'],
  essencial: [
    'SSE é HTTP normal, unidireccional, com reconexão e `Last-Event-ID`; WebSocket só compensa quando o cliente também envia a meio (voz, interrupções, colaboração).',
    'Uma chamada síncrona dentro de `async def` bloqueia o event loop inteiro: todas as conversas desse processo param, não só a tua.',
    'Cliente desligou = cancelar o gerador e fechar o stream ao modelo; um `except BaseException` que engole `CancelledError` transforma abandono em factura.',
    'Memória KV por token = 2 × camadas × cabeças KV × dim. da cabeça × bytes. 8B com GQA (32, 8, 128) em fp16: 128 KiB/token, 1 GiB por sequência de 8k.',
    'Pesos ≈ N parâmetros × bytes: fp16 = 2 B, int8 = 1 B, int4 ≈ 0,5 B (mais escalas e camadas que ficam em 16 bits). 8B fp16 ≈ 16 GB; 70B fp16 ≈ 140 GB.',
    'Decode é limitado por largura de banda de memória: cada passo lê os pesos todos. Batch maior amortiza essa leitura: mais tokens/s agregados, mais latência por pedido.',
    'Continuous batching agenda ao nível da iteração; PagedAttention guarda a KV cache em blocos não contíguos. O artigo do vLLM reporta 2–4× de throughput à mesma latência.',
    'Speculative decoding: um modelo pequeno propõe k tokens, o grande verifica-os num só passo; a distribuição de saída mantém-se. Ganha em carga baixa, perde valor com batches cheios.',
    'Escala GPUs pela fila (pedidos à espera, uso da KV cache, TTFT p95), não pela «utilização da GPU»; arrancar uma réplica leva minutos, por isso há sempre um mínimo quente.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-servir-modelos-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'SSE ou WebSocket para fazer streaming de tokens',
      enunciado:
        'Vais mostrar a resposta do assistente palavra a palavra numa app web e móvel. Usas Server-Sent Events ou WebSocket? Porquê?',
      minutos: 4,
      dica: 'Em que direcção vão os dados durante a geração, e o que a tua infraestrutura HTTP já sabe fazer?',
      resposta: [
        {
          type: 'p',
          text: 'Por omissão uso **SSE**: o fluxo durante a geração é só servidor → cliente, e SSE é um pedido HTTP normal com resposta `text/event-stream`, que passa por load balancers, autenticação, rate limiting e observabilidade sem nada de especial. WebSocket só ganha quando o cliente precisa de enviar dados *a meio* da geração com baixa latência.',
        },
        {
          type: 'table',
          head: ['Critério', 'SSE', 'WebSocket'],
          rows: [
            ['Direcção', 'Servidor → cliente; o pedido vai no corpo do POST', 'Bidireccional, full-duplex'],
            ['Infraestrutura', 'HTTP puro: gateways, WAF, tracing e auth funcionam como em qualquer endpoint', 'Upgrade de protocolo; ligações longas com estado, sticky, timeouts próprios'],
            ['Reconexão', 'Nativa no `EventSource`, com `Last-Event-ID`', 'Tens de a implementar'],
            ['Escala horizontal', 'Pedido sem estado, qualquer réplica serve', 'Ligação presa a uma réplica; drenar num deploy é mais difícil'],
            ['Quando escolher', 'Chat, completions, eventos de progresso de um agente', 'Voz em tempo real, barge-in, edição colaborativa'],
          ],
        },
        {
          type: 'p',
          text: 'Há dois detalhes que mostram que já fiz isto. Primeiro, o `EventSource` do browser só faz GET e não deixa pôr cabeçalhos, por isso para um chat com POST e `Authorization` uso `fetch` e leio o `ReadableStream`, fazendo o parse do formato SSE à mão (ou uma biblioteca pequena). Segundo, sobre HTTP/1.1 o browser limita a cerca de 6 ligações por domínio, o que com vários separadores abertos bloqueia; com HTTP/2 o problema desaparece. Do lado do servidor, desligo o buffering do proxy (`X-Accel-Buffering: no` no nginx), mando um comentário `: ping` a cada ~15 s para os idle timeouts e trato o fecho da ligação como cancelamento.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Escolher WebSocket «porque é tempo real»',
          text: 'Streaming de tokens é tempo real num só sentido. Com WebSocket passas a gerir estado de ligação, heartbeats, reconexão e autenticação fora do pipeline HTTP — e para cancelar uma geração com SSE basta o cliente fechar a ligação.',
        },
        {
          type: 'refs',
          items: [
            { label: 'MDN — Server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events' },
            { label: 'WHATWG — Server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
            { label: 'MDN — WebSocket API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe SSE para o caso unidireccional e justifica com a direcção do fluxo.',
          'Diz que SSE é HTTP normal e por isso reaproveita gateway, auth, tracing e escala sem estado.',
          'Sabe que o `EventSource` não faz POST nem cabeçalhos e propõe `fetch` com stream.',
          'Menciona um cuidado de infraestrutura: buffering de proxy, heartbeat ou limite de ligações em HTTP/1.1.',
          'Nomeia um caso em que WebSocket é a escolha certa.',
        ],
        fraco: '«WebSocket porque é mais rápido» ou «SSE porque é mais simples», sem falar de direcção, infraestrutura nem reconexão.',
        solido: 'Escolhe SSE pela direcção e por ser HTTP, explica a reconexão e o caso do WebSocket para voz ou interrupções.',
        excelente: 'Acrescenta os detalhes operacionais (EventSource vs fetch, proxy buffering, heartbeat, HTTP/2) e liga o fecho da ligação ao cancelamento da geração e ao custo.',
      },
      seguimento: [
        'Como retomavas um stream depois de a rede móvel cair a meio da resposta?',
        'O utilizador quer interromper a resposta e mandar outra pergunta. Com SSE, como fazes?',
        'Que timeouts tens de rever entre o cliente, a CDN, o load balancer e o serviço?',
      ],
      sinaisAlarme: [
        'Não saber que SSE corre sobre HTTP comum.',
        'Propor polling de segundo a segundo para mostrar tokens.',
        'Ignorar o que acontece quando o cliente fecha a ligação.',
      ],
      modulos: ['fastapi-servico'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-servir-modelos-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que bloqueia o event loop num serviço LLM em Python',
      enunciado:
        'O teu serviço é FastAPI com `async def` em todo o lado. Explica-me como é que ele atende 200 conversas em streaming ao mesmo tempo num só processo, e o que é que estraga isso.',
      minutos: 5,
      dica: 'O que faz o processo enquanto espera pelo próximo token do fornecedor?',
      resposta: [
        {
          type: 'p',
          text: 'Atende porque o trabalho é quase todo **espera de I/O**: enquanto um stream aguarda o próximo token, o `await` devolve o controlo ao event loop, que avança as outras 199 conversas. Isso só funciona se **nada** no caminho bloquear a thread do loop — uma chamada síncrona de 300 ms congela todas as conversas desse processo durante 300 ms.',
        },
        {
          type: 'h',
          text: 'O que bloqueia, na prática',
        },
        {
          type: 'list',
          items: [
            'Um SDK ou cliente HTTP síncrono (`requests`, o cliente síncrono do fornecedor, um driver de base de dados síncrono) chamado dentro de `async def`.',
            'Trabalho de CPU no loop: contar tokens de um contexto de 50 k, regex de PII sobre documentos grandes, parse de PDFs, gerar embeddings com um modelo local.',
            'Coisas escondidas: um handler de logging que escreve para a rede de forma síncrona, `time.sleep` num retry, leitura de ficheiros grandes.',
          ],
        },
        {
          type: 'p',
          text: 'As saídas: usar clientes assíncronos (`httpx.AsyncClient`, o cliente async do SDK, `asyncpg`); para código síncrono inevitável, `await asyncio.to_thread(...)` ou declarar a rota com `def` para o FastAPI a correr no threadpool (limitado a 40 threads por omissão no AnyIO); para CPU pesado, um `ProcessPoolExecutor` ou um serviço à parte. E escalar em processos: vários workers do uvicorn ou, em Kubernetes, um worker por pod e mais pods, porque o GIL faz com que um processo use no máximo um core para código Python.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como o apanho em produção',
          text: 'Meço o lag do event loop com uma tarefa que dorme 100 ms e regista quanto dormiu de facto; em teste ligo o modo debug do asyncio, que avisa quando um callback demora mais de 100 ms. Um lag p99 de centenas de ms com CPU baixa é quase sempre uma chamada síncrona.',
        },
        {
          type: 'refs',
          items: [
            { label: 'FastAPI — Concurrency and async / await', url: 'https://fastapi.tiangolo.com/async/' },
            { label: 'Python — Developing with asyncio (modo debug)', url: 'https://docs.python.org/3/library/asyncio-dev.html' },
            { label: 'Uvicorn — Deployment', url: 'https://www.uvicorn.org/deployment/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que a concorrência vem de o trabalho ser espera de I/O e de o `await` ceder o loop.',
          'Diz que uma chamada síncrona bloqueia todas as conversas do processo, não só a sua.',
          'Dá pelo menos dois exemplos concretos de bloqueio (SDK síncrono, CPU de tokenização ou PII).',
          'Propõe as saídas certas: cliente async, `to_thread`/threadpool, processos para CPU.',
          'Explica o papel dos workers/processos face ao GIL.',
        ],
        fraco: '«É async, por isso é concorrente», sem saber o que acontece com uma chamada síncrona lá dentro.',
        solido: 'Explica o loop, dá exemplos de bloqueio e as três saídas (async, threadpool, processos).',
        excelente: 'Acrescenta como detectar em produção (lag do loop, modo debug), o limite do threadpool e porque um worker por pod é a configuração típica em Kubernetes.',
      },
      seguimento: [
        'O FastAPI corre rotas `def` num threadpool. Porque não declarar tudo `def` e esquecer o async?',
        'Quantos workers punhas num pod de 2 vCPU e porquê?',
        'Como mediras o lag do event loop sem ferramentas externas?',
      ],
      sinaisAlarme: [
        'Achar que `async def` torna qualquer código não bloqueante.',
        'Resolver a lentidão a subir réplicas sem perceber que o loop está bloqueado.',
        'Usar `time.sleep` em retries dentro de código async.',
      ],
      modulos: ['fastapi-servico'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-servir-modelos-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Timeouts e backpressure quando o modelo é o recurso escasso',
      enunciado:
        'O teu serviço chama um modelo com rate limit de tokens por minuto e, nas horas de ponta, chegam mais pedidos do que ele aguenta. Como desenhas timeouts e backpressure? Pões os pedidos numa fila ou rejeitas?',
      minutos: 8,
      dica: 'Quanto tempo está um utilizador de chat disposto a esperar pelo primeiro token, e quanto um job batch?',
      resposta: [
        {
          type: 'p',
          text: 'Separo por tipo de tráfego. Para **interactivo** limito a concorrência em voo e uso uma fila **curta** com prazo: se o pedido não começa a ser servido em 1–2 s, rejeito com 429 e `Retry-After` ou degrado para um modelo mais pequeno. Para **batch** uso uma fila durável sem pressa. Uma fila longa num chat só transforma sobrecarga em timeouts que já pagaste.',
        },
        {
          type: 'h',
          text: 'Timeouts em camadas, de dentro para fora',
        },
        {
          type: 'list',
          items: [
            'Ligação ao fornecedor: 2–5 s (apanhar rede morta depressa).',
            'Até ao primeiro token: ~10 s; depois disso, prazo do turno inteiro (30–60 s) ou um timeout entre tokens.',
            'Prazo total do pedido no serviço menor do que o idle timeout do load balancer, para o erro ser teu e com significado, não um corte mudo.',
            'Retries só antes do primeiro token e com backoff exponencial com jitter; depois de enviar tokens ao cliente, um retry duplica texto.',
          ],
        },
        {
          type: 'table',
          head: ['Mecanismo', 'Protege', 'Custo'],
          rows: [
            ['Semáforo de concorrência por réplica', 'O rate limit do fornecedor e a memória do processo', 'Pedidos acima do limite esperam ou falham'],
            ['Fila curta com prazo de admissão', 'A latência dos que entram', 'Rejeitas alguns pedidos explicitamente'],
            ['Rate limit por cliente/tenant', 'Justiça entre clientes; um tenant não come a quota de todos', 'Configuração por plano'],
            ['Degradação (modelo pequeno, sem re-ranking)', 'Disponibilidade', 'Qualidade inferior, tem de ser medida'],
            ['Fila durável para batch', 'Trabalho que pode esperar minutos', 'Infraestrutura e idempotência'],
          ],
        },
        {
          type: 'p',
          text: 'Os números saem da lei de Little: concorrência em voo = débito × duração. Se cada turno dura 4 s e o fornecedor me deixa ~10 turnos/s, o máximo útil em voo é ~40 por todas as réplicas — é esse o tamanho do semáforo global, não «o que a máquina aguenta». Com o modelo self-hosted, a backpressure natural é a fila do próprio servidor de inferência: olho para os pedidos à espera e rejeito à entrada antes de a fila crescer.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Retry sem orçamento',
          text: 'Com o fornecedor a devolver 429, três retries por pedido triplicam a carga exactamente quando ele está saturado. Uso um orçamento de retries (por exemplo, no máximo 10% dos pedidos) e respeito o `retry-after` que o fornecedor envia.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Book — Handling Overload', url: 'https://sre.google/sre-book/handling-overload/' },
            { label: 'Google SRE Book — Addressing Cascading Failures', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
            { label: 'Python — asyncio.timeout e Semaphore', url: 'https://docs.python.org/3/library/asyncio-sync.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue tráfego interactivo de batch e trata-os de forma diferente.',
          'Prefere rejeitar cedo (429 com Retry-After) ou degradar a deixar crescer uma fila longa no interactivo.',
          'Ordena os timeouts por camada, com o de dentro a disparar antes do de fora.',
          'Diz que retries só são seguros antes do primeiro token enviado e precisam de orçamento.',
          'Usa a lei de Little ou um cálculo equivalente para dimensionar a concorrência.',
        ],
        fraco: '«Ponho tudo numa fila» ou «aumento o timeout», sem prazos nem distinção entre tipos de tráfego.',
        solido: 'Semáforo, fila curta com prazo, 429 com Retry-After, timeouts por camada e backoff com jitter.',
        excelente: 'Dimensiona com a lei de Little a partir da quota do fornecedor, propõe degradação medida, rate limit por tenant e um orçamento de retries para não amplificar a sobrecarga.',
      },
      seguimento: [
        'Como implementavas o semáforo global se tens 6 réplicas?',
        'Que métrica te diz que a fila de admissão está a crescer antes de os utilizadores sentirem?',
        'Como degradas para um modelo mais pequeno sem que a qualidade caia sem ninguém saber?',
      ],
      sinaisAlarme: [
        'Timeouts iguais em todas as camadas, ou o de fora mais curto que o de dentro.',
        'Retry depois de já ter enviado tokens ao cliente.',
        'Fila sem limite «para não perder pedidos» num produto de chat.',
      ],
      modulos: ['fastapi-servico', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-servir-modelos-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Continuous batching e PagedAttention: porque sobem o throughput',
      enunciado:
        'Porque é que servir um modelo com vLLM dá muito mais throughput do que um servidor que faz `model.generate` por pedido, ou que junta pedidos em batches estáticos? Explica continuous batching e PagedAttention.',
      minutos: 6,
      dica: 'Pensa em dois desperdícios: GPU parada à espera do pedido mais longo do batch, e memória reservada que nunca é usada.',
      resposta: [
        {
          type: 'p',
          text: 'Porque ataca os dois desperdícios da geração autoregressiva. **Continuous batching** reagenda o batch a cada passo de decode, por isso uma sequência que acaba sai e entra outra logo; **PagedAttention** guarda a KV cache em blocos pequenos não contíguos, por isso cabem muito mais sequências na mesma memória. Mais sequências por passo = mais tokens por segundo pela mesma leitura de pesos. O artigo do vLLM reporta 2–4× de throughput face aos sistemas da altura, à mesma latência.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'O problema do batch estático',
              text: 'Num batch de 16 pedidos, um pede 20 tokens e outro 800. O batch só termina quando o mais longo acaba; os lugares dos que acabaram ficam vazios e os pedidos novos esperam. A GPU faz trabalho para uma fracção do batch.',
            },
            {
              title: 'Continuous batching (escalonamento por iteração)',
              text: 'O escalonador decide quem entra a cada passo. Quem emite o token de fim sai, quem está na fila entra, e o prefill dos novos é intercalado com o decode dos antigos. A ocupação mantém-se alta com pedidos de comprimentos muito diferentes, que é o caso normal num chat.',
            },
            {
              title: 'PagedAttention (memória paginada para a KV cache)',
              text: 'Os sistemas anteriores reservavam KV contígua para o comprimento máximo da sequência, e a maior parte ficava por usar (fragmentação interna e externa). O vLLM divide a KV em blocos de tamanho fixo (16 tokens por omissão, por exemplo) com uma tabela de blocos por sequência, como a memória virtual de um SO. O desperdício fica quase nulo e os blocos podem ser partilhados — prefixos comuns, várias amostras do mesmo prompt — com copy-on-write.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Porque é que mais sequências por passo dá mais throughput: em decode, cada passo lê todos os pesos da memória da GPU para produzir **um** token por sequência. Com batch 1, a GPU passa o tempo à espera de memória; com batch 32, a mesma leitura serve 32 tokens. O limite passa a ser a memória para KV cache — e é aí que a paginação entra.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Throughput não é latência',
          text: 'Estas técnicas aumentam tokens por segundo **agregados**. A latência por pedido pode subir com batches maiores, e um prompt longo em prefill atrasa o passo de todos. Por isso o servidor tem limites de sequências e de tokens por passo, e prefill em blocos (chunked prefill).',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kwon et al. (2023) — Efficient Memory Management for LLM Serving with PagedAttention', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'vLLM — documentação', url: 'https://docs.vllm.ai/en/latest/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que o batch estático desperdiça GPU à espera da sequência mais longa.',
          'Define continuous batching como escalonamento por iteração (entrar e sair a cada passo).',
          'Explica PagedAttention como blocos não contíguos com tabela, como memória virtual, eliminando a reserva para o comprimento máximo.',
          'Liga throughput a decode limitado por largura de banda: mais sequências por leitura de pesos.',
          'Distingue throughput agregado de latência por pedido.',
        ],
        fraco: '«O vLLM é optimizado» ou «usa batching», sem distinguir batch estático de contínuo nem explicar a KV cache.',
        solido: 'Explica os dois mecanismos e porque se complementam (um enche o batch, o outro deixa caber mais).',
        excelente: 'Acrescenta porque é que decode é memory-bound, a partilha de prefixos com copy-on-write, o efeito do prefill longo na latência e os limites que se configuram.',
      },
      seguimento: [
        'O que acontece quando a KV cache enche a meio de uma geração?',
        'Como é que prefix caching ajuda num assistente com um system prompt de 3 000 tokens?',
        'Se o teu tráfego é 1 pedido de cada vez, o vLLM ainda compensa?',
      ],
      sinaisAlarme: [
        'Confundir continuous batching com micro-batching por tempo no cliente.',
        'Dizer que PagedAttention reduz o cálculo da atenção (reduz o desperdício de memória).',
        'Citar ganhos sem dizer face a quê nem com que carga.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-servir-modelos-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Quantas conversas cabem numa GPU de 80 GB',
      enunciado:
        'Queres servir um modelo de 8 mil milhões de parâmetros em fp16 numa GPU de 80 GB. Estima, no quadro, quanta memória vai para pesos e para KV cache, e quantas sequências de 8 k tokens consegues ter em simultâneo. E para um de 70B?',
      minutos: 6,
      dica: 'A KV cache guarda chave e valor, por camada, por cabeça KV, por token.',
      resposta: [
        {
          type: 'p',
          text: 'Memória = pesos + KV cache + activações e overhead. Pesos ≈ N × bytes por parâmetro; KV por token = **2 × camadas × cabeças KV × dimensão da cabeça × bytes**. Para um 8B em fp16 numa GPU de 80 GB, ficam ~16 GB de pesos e ~50 GB de KV, o que dá ~400 k tokens: ~48 sequências de 8 k cheias, ou bem mais se o comprimento médio real for 2 k.',
        },
        {
          type: 'code',
          lang: 'text',
          caption: 'Configuração tipo de um 8B com grouped-query attention (a do Llama 3 8B): 32 camadas, 8 cabeças KV, dimensão 128.',
          code: String.raw`Pesos      8e9 × 2 B                    ≈ 16 GB
KV/token   2 × 32 × 8 × 128 × 2 B       = 131 072 B = 128 KiB
KV/seq 8k  8 192 × 128 KiB              = 1 GiB

GPU 80 GB × 0,9 (fracção que o servidor reserva)  ≈ 72 GB
  − 16 GB pesos − ~4 GB activações/overhead      ≈ 52 GB para KV
52e9 / 131 072                                   ≈ 397 000 tokens
  → ~48 sequências de 8 k, ou ~190 de 2 k`,
        },
        {
          type: 'p',
          text: 'Para um **70B** (80 camadas, 8 cabeças KV, dimensão 128): KV = 2 × 80 × 8 × 128 × 2 = 320 KiB/token e pesos ≈ 140 GB em fp16. Em duas GPUs de 80 GB com tensor parallelism sobram ~4 GB para KV — ~12 k tokens, inútil. As opções reais são 4 GPUs, ou pesos em int4 (~35–40 GB com escalas), que numa só GPU deixam ~28 GB para KV, ~85 k tokens.',
        },
        {
          type: 'list',
          items: [
            '**GQA importa**: sem ela (cabeças KV = cabeças de query, 32), o 8B gastava 512 KiB/token, 4× mais.',
            '**KV em fp8** corta a KV a metade; é uma opção do servidor e tem custo de qualidade que se mede.',
            'O número que decide a capacidade é o **comprimento real** das sequências (prompt + saída), não a janela máxima do modelo. Limitar o contexto máximo servido é uma decisão de custo.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Contar só os pesos',
          text: '«O modelo tem 16 GB, cabe numa GPU de 24 GB» — cabe, com ~4 GB para KV, ou seja ~30 k tokens: três ou quatro conversas longas. Quem dimensiona pelos pesos descobre em produção que a fila cresce com 5 utilizadores.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kwon et al. (2023) — PagedAttention (análise da memória KV)', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'Ainslie et al. (2023) — GQA: Grouped-Query Attention', url: 'https://arxiv.org/abs/2305.13245' },
            { label: 'vLLM — argumentos do motor (gpu-memory-utilization, kv-cache-dtype)', url: 'https://docs.vllm.ai/en/latest/configuration/engine_args.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve a fórmula da KV por token com o factor 2 (chave e valor), camadas, cabeças KV, dimensão e bytes.',
          'Chega a ~16 GB de pesos e ~128 KiB/token para o 8B, ou a números consistentes com a configuração que assumiu.',
          'Desconta a fracção reservada e o overhead antes de dividir pela KV por sequência.',
          'Mostra que o 70B em fp16 não cabe com KV útil em 2×80 GB e propõe 4 GPUs ou int4.',
          'Menciona o efeito de GQA ou de KV em fp8.',
        ],
        fraco: 'Conta só os pesos, ou não sabe que a KV cresce com o comprimento da sequência.',
        solido: 'Faz as contas do 8B correctamente, chega a dezenas de sequências de 8 k e explica o papel do comprimento real.',
        excelente: 'Faz também o 70B, mostra o beco sem saída de 2 GPUs em fp16, e discute GQA, KV em fp8 e limitar o contexto servido como alavancas de custo.',
      },
      seguimento: [
        'O teu tráfego tem prompts médios de 5 k tokens com um system prompt comum de 3 k. Como muda a conta com prefix caching?',
        'Onde vai a memória das activações e porque cresce com os tokens por passo?',
        'Como validavas a estimativa antes de comprar as GPUs?',
      ],
      sinaisAlarme: [
        'Esquecer o factor 2 ou usar o número de cabeças de query em vez das cabeças KV.',
        'Dimensionar pela janela de contexto máxima anunciada.',
        'Responder «depende» sem fazer nenhuma conta.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-servir-modelos-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Quantizar para int4: o que ganhas e o que perdes',
      enunciado:
        'A equipa quer servir o modelo em int4 para caber numa GPU mais barata. Que tipos de quantização conheces, o que se perde, e como decidias se avançam?',
      minutos: 7,
      dica: 'Quantizar pesos e quantizar activações ou KV cache são decisões diferentes, com custos diferentes.',
      resposta: [
        {
          type: 'p',
          text: 'Quantizar pesos para int8 ou int4 corta a memória de pesos a metade ou a um quarto e, como o decode é limitado por largura de banda, normalmente acelera a geração. Perde-se alguma qualidade, de forma **desigual por tarefa** — e por isso só avanço depois de medir no meu conjunto de avaliação, não em benchmarks genéricos.',
        },
        {
          type: 'table',
          head: ['Técnica', 'Ideia', 'Notas'],
          rows: [
            ['int8 pesos (weight-only)', 'Pesos a 8 bits, cálculo em 16 bits', 'Perda geralmente pequena; metade da memória'],
            ['GPTQ', 'Pós-treino, uma passagem, usa informação de segunda ordem para compensar o erro ao quantizar coluna a coluna', 'Artigo: 3–4 bits com perda pequena; precisa de dados de calibração'],
            ['AWQ', 'Protege ~1% de pesos salientes, escolhidos pelas activações, escalando esses canais antes de quantizar', 'Weight-only 4 bits; também precisa de calibração'],
            ['FP8 (pesos e activações)', 'Formato de 8 bits em vírgula flutuante, com suporte em GPUs recentes', 'Acelera também o prefill; depende do hardware'],
            ['KV cache em fp8', 'Reduz a memória por token, não os pesos', 'Mais sequências em simultâneo; medir em contexto longo'],
          ],
        },
        {
          type: 'p',
          text: 'O que costuma degradar primeiro: raciocínio em vários passos, aritmética, código, línguas com menos dados no treino (português de Moçambique, por exemplo) e saídas estruturadas longas. Os dados de calibração contam: calibrar com texto genérico em inglês e servir pt-PT técnico pode dar perdas maiores do que o esperado.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Medir', text: 'Corro o conjunto dourado completo em fp16 e na versão quantizada, com as mesmas métricas (exactidão, faithfulness, validade de JSON, tool-call accuracy) e intervalos de confiança. Olho por categoria, não só a média.' },
            { title: 'Pôr o ganho em dinheiro', text: 'Ganho de memória → mais sequências por GPU ou GPU mais barata → custo por 1 000 conversas. Se int4 poupa 40% e perde 3 pontos numa categoria crítica, a decisão é de produto, não minha sozinho.' },
            { title: 'Comparar com a alternativa', text: 'Um modelo mais pequeno em fp16 com o mesmo custo pode ser melhor do que um grande em int4. Testo os dois.' },
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Confiar na perplexidade',
          text: 'Uma diferença pequena de perplexidade num corpus genérico não diz nada sobre o teu caso. Já vi quantizações quase neutras em média e com quebras grandes em JSON longo. A métrica que decide é a do teu produto.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Frantar et al. (2022) — GPTQ', url: 'https://arxiv.org/abs/2210.17323' },
            { label: 'Lin et al. (2023) — AWQ: Activation-aware Weight Quantization', url: 'https://arxiv.org/abs/2306.00978' },
            { label: 'vLLM — quantização', url: 'https://docs.vllm.ai/en/latest/features/quantization/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue quantizar pesos de quantizar activações ou a KV cache.',
          'Explica em alto nível GPTQ (compensação do erro com segunda ordem) e AWQ (proteger pesos salientes pelas activações).',
          'Diz que a perda é desigual por tarefa e nomeia onde aparece primeiro.',
          'Propõe decidir com o conjunto de avaliação próprio, por categoria, com intervalos de confiança.',
          'Converte o ganho de memória em custo por unidade de negócio e compara com um modelo mais pequeno sem quantização.',
        ],
        fraco: '«int4 é 4× mais pequeno e quase igual», sem falar de medição nem do que degrada.',
        solido: 'Explica os tipos, sabe que precisa de calibração e propõe comparar no conjunto dourado.',
        excelente: 'Acrescenta a alternativa do modelo mais pequeno a custo igual, a sensibilidade à língua e ao formato de saída, e põe a decisão em custo por conversa com o dono do produto.',
      },
      seguimento: [
        'Que dados usavas para calibrar AWQ num assistente em português?',
        'Quantizar acelera o prefill? E o decode? Porquê?',
        'Como monitorizavas em produção se a versão quantizada está a falhar mais num tipo de pedido?',
      ],
      sinaisAlarme: [
        'Afirmar que a quantização não tem perda nenhuma.',
        'Decidir por uma tabela de benchmark de terceiros.',
        'Não saber que existe calibração.',
      ],
      modulos: ['escolher-modelo', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-servir-modelos-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'TTFT, throughput e custo por token: o preço do batch grande',
      enunciado:
        'O financeiro quer o custo por token mais baixo possível no teu cluster self-hosted; o produto quer o primeiro token em menos de 1 segundo. Como é que o tamanho do batch mexe nestas duas coisas, e onde é que speculative decoding entra?',
      minutos: 9,
      dica: 'Separa prefill de decode e pensa no que limita cada um.',
      resposta: [
        {
          type: 'p',
          text: 'É uma curva, não um número: batches maiores amortizam a leitura dos pesos por mais sequências e baixam o custo por token, mas aumentam o tempo por passo (tokens/s por utilizador descem) e, com prefills longos a entrar no mesmo passo, sobem o TTFT. O meu trabalho é encontrar o ponto da curva em que o **TTFT p95 cumpre o SLO** e servir aí com o maior batch possível.',
        },
        {
          type: 'compare',
          left: {
            title: 'Batch pequeno',
            items: [
              'TTFT baixo e muitos tokens/s por utilizador',
              'GPU limitada por memória, a maior parte da capacidade de cálculo parada',
              'Custo por token alto',
              'Bom para agentes com muitos passos sequenciais',
            ],
          },
          right: {
            title: 'Batch grande',
            items: [
              'Muito mais tokens/s agregados pela mesma GPU',
              'Cada passo demora mais: menos tokens/s por utilizador',
              'Prefills na fila e no passo: TTFT sobe e fica com cauda',
              'Bom para batch offline, sumarização, classificação em massa',
            ],
          },
        },
        {
          type: 'p',
          text: 'Uma conta de ordem de grandeza, como roofline e não como benchmark: um 8B em fp16 lê ~16 GB de pesos por passo; com 2–3 TB/s de largura de banda isso dá um mínimo de ~5–8 ms por passo, ou seja ~125–200 tokens/s para uma sequência sozinha. Com 32 sequências o passo demora pouco mais e saem ~32 tokens por passo: o custo por token cai mais de uma ordem de grandeza enquanto a GPU não passa a ser limitada por cálculo. Os números reais tiro-os com um teste de carga: curva TTFT p95 e tokens/s agregados em função da concorrência.',
        },
        {
          type: 'h',
          text: 'Alavancas para mexer na curva',
        },
        {
          type: 'list',
          items: [
            '**Limites do servidor**: máximo de sequências e de tokens por passo, e chunked prefill para um prompt de 30 k não congelar o decode dos outros.',
            '**Separar pools**: interactivo com batch moderado e SLO de TTFT; batch offline com batch máximo e sem SLO. Muitas vezes é a decisão que mais poupa.',
            '**Prefix caching**: um system prompt comum não volta a ser processado; baixa TTFT e custo ao mesmo tempo.',
            '**Speculative decoding**: um modelo pequeno (ou cabeças extra) propõe k tokens e o grande verifica-os num só passo, aceitando os que coincidem; a distribuição de saída é a mesma do modelo grande. O artigo original reporta 2–3× em T5-XXL. Ganha quando a GPU tem cálculo de sobra — carga baixa, batch pequeno — e o ganho encolhe ou inverte com batches cheios, porque o cálculo da verificação deixa de ser grátis. Também não mexe no TTFT: acelera o decode.',
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A frase que o entrevistador quer ouvir',
          text: 'Escolho o batch máximo que cumpre o SLO de TTFT p95 com a mistura de prompts real, separo tráfego offline para outro pool, e comparo o custo por 1 000 conversas com o da API gerida antes de defender self-hosting.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Leviathan et al. (2022) — Fast Inference from Transformers via Speculative Decoding', url: 'https://arxiv.org/abs/2211.17192' },
            { label: 'Kwon et al. (2023) — PagedAttention / vLLM', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'vLLM — documentação (speculative decoding, prefix caching)', url: 'https://docs.vllm.ai/en/latest/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que batch maior baixa o custo por token e aumenta latência por passo e TTFT.',
          'Distingue prefill (limitado por cálculo) de decode (limitado por largura de banda).',
          'Propõe escolher o ponto da curva pelo SLO de TTFT p95, medido com teste de carga e mistura real.',
          'Propõe separar tráfego interactivo de offline em pools diferentes.',
          'Explica speculative decoding (rascunho + verificação, distribuição preservada) e quando deixa de compensar.',
        ],
        fraco: '«Batch maior é sempre melhor» ou «speculative decoding acelera sempre», sem relação com carga.',
        solido: 'Descreve a curva, a diferença prefill/decode e a ideia de speculative decoding.',
        excelente: 'Faz uma estimativa roofline com números, propõe pools separados e chunked prefill, diz que speculative decoding perde valor com batches cheios e liga tudo ao custo por conversa versus API gerida.',
      },
      seguimento: [
        'Como desenhavas o teste de carga para obter esta curva?',
        'Que taxa de aceitação do modelo de rascunho precisas para speculative decoding compensar?',
        'Prefill e decode em máquinas diferentes: quando faz sentido?',
      ],
      sinaisAlarme: [
        'Falar de throughput sem falar de latência, ou o contrário.',
        'Dizer que speculative decoding muda a qualidade das respostas.',
        'Defender self-hosting sem comparar custo com a API.',
      ],
      modulos: ['custo-escala', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-servir-modelos-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Autoscaling de réplicas com GPU: o que medir e o que esperar',
      enunciado:
        'Tens um modelo self-hosted em Kubernetes com 4 réplicas de GPU e um pico diário de 3× às 12h. Como fazes autoscaling? Que métrica usas e o que é que te pode correr mal?',
      minutos: 8,
      dica: 'Quanto tempo demora uma réplica nova a servir o primeiro pedido, a contar do momento em que decides escalar?',
      resposta: [
        {
          type: 'p',
          text: 'Escalo pela **fila e pela pressão na KV cache** — pedidos à espera, percentagem de KV usada e TTFT p95 — não pela utilização da GPU nem pelo CPU. E como uma réplica nova demora minutos a servir, combino um mínimo quente, escala antecipada pelo padrão diário e um plano de transbordo (degradar ou enviar para uma API gerida) para os minutos em que a capacidade ainda não chegou.',
        },
        {
          type: 'table',
          head: ['Fase do arranque', 'Ordem de grandeza', 'Como encurtar'],
          rows: [
            ['Provisionar um nó com GPU', 'Minutos; às vezes sem capacidade na zona', 'Nós em reserva, capacidade reservada, várias zonas e tipos de instância'],
            ['Puxar a imagem (CUDA, PyTorch, servidor)', 'Imagens de ~10 GB: dezenas de segundos a minutos', 'Imagem pré-carregada no nó, imagens mais pequenas'],
            ['Descarregar pesos', '16 GB (8B) a 140 GB (70B)', 'Cache local ou volume partilhado; nunca descarregar do hub no arranque'],
            ['Carregar na GPU, compilar grafos, aquecer', 'Dezenas de segundos', 'Readiness probe só depois de um pedido de aquecimento'],
          ],
        },
        {
          type: 'h',
          text: 'Métricas: certas e enganadoras',
        },
        {
          type: 'list',
          items: [
            '**Boas**: pedidos à espera por réplica (no vLLM, `vllm:num_requests_waiting`), uso da KV cache (`vllm:kv_cache_usage_perc`), TTFT p95 do servidor. Expõem-se por Prometheus e escala-se com um HPA de métricas externas ou KEDA.',
            '**Enganadoras**: a «utilização» da GPU reportada pelo driver mede a fracção de tempo com algum kernel a correr — está perto de 100% com batch 1 e com batch 64. CPU e memória do pod também não dizem nada.',
          ],
        },
        {
          type: 'p',
          text: 'Outros cuidados: scale-down lento e com drenagem (os streams em curso podem durar um minuto; o `terminationGracePeriodSeconds` tem de os cobrir); readiness só depois do aquecimento, senão a primeira vaga de pedidos apanha uma réplica fria; e um limite superior de réplicas ligado ao orçamento, porque um bug que gera loops de agente escala o custo tão depressa quanto o tráfego legítimo.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Escalar a zero para poupar',
          text: 'Para um produto interactivo, zero réplicas significa que o primeiro utilizador da manhã espera minutos. Escalar a zero faz sentido para jobs batch ou ambientes de teste; em produção interactiva o mínimo quente paga-se, ou o tráfego de vale vai para uma API gerida.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Kubernetes — Horizontal Pod Autoscaling', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/' },
            { label: 'vLLM — métricas de produção', url: 'https://docs.vllm.ai/en/latest/usage/metrics.html' },
            { label: 'Kubernetes — Pod Lifecycle (terminação e drenagem)', url: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe métricas de fila/KV/TTFT e explica porque a utilização da GPU engana.',
          'Decompõe o tempo de arranque (nó, imagem, pesos, aquecimento) e propõe como encurtar cada fase.',
          'Propõe mínimo quente e escala antecipada pelo padrão diário.',
          'Trata o scale-down com drenagem de streams e readiness depois do aquecimento.',
          'Tem um plano para o intervalo sem capacidade (degradar ou transbordar para API) e um tecto de custo.',
        ],
        fraco: '«HPA a 70% de utilização da GPU», sem falar de arranque lento nem de drenagem.',
        solido: 'Escala pela fila ou KV, conhece o arranque lento e mantém um mínimo quente.',
        excelente: 'Junta escala antecipada, transbordo para API gerida, tecto de réplicas ligado ao orçamento e uma explicação clara de porque a utilização da GPU não serve como sinal.',
      },
      seguimento: [
        'Como escolhias o limiar de pedidos à espera para escalar?',
        'Vale a pena manter réplicas em spot instances? Com que salvaguardas?',
        'Como fazes um deploy de uma versão nova do modelo sem perder capacidade no pico?',
      ],
      sinaisAlarme: [
        'Escalar pela utilização da GPU ou pelo CPU do pod.',
        'Descarregar os pesos do hub em cada arranque.',
        'Esquecer que os streams em curso morrem num scale-down sem drenagem.',
      ],
      modulos: ['custo-escala', 'docker'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-servir-modelos-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Endpoint SSE com prazos e cancelamento quando o cliente desliga',
      enunciado:
        'Escreve um endpoint FastAPI que recebe uma pergunta e devolve a resposta do modelo em streaming SSE. Tem de ter prazo para o primeiro token e para o turno inteiro, e tem de parar de gerar se o cliente fechar a ligação. Mostra como o testavas.',
      contexto:
        'Assinatura pedida: `POST /v1/respostas` com corpo `{"pergunta": str}` (1 a 4 000 caracteres), resposta `text/event-stream` com eventos `token`, `fim` e `erro`. O modelo é uma função `fonte(pergunta) -> AsyncGenerator[str, None]` que devolve tokens; substitui-a por um falso nos testes. Prazos: 10 s até ao primeiro token, 60 s para o turno. Python 3.13, FastAPI e pytest.',
      minutos: 25,
      dica: 'Fechar o gerador da fonte é o que fecha a ligação ao modelo. Onde garantes que isso acontece em todos os caminhos de saída?',
      resposta: [
        {
          type: 'p',
          text: 'Separo a lógica em `eventos()`, um gerador assíncrono que transforma tokens em eventos SSE e que posso testar sem HTTP, e o endpoint fino que o embrulha num `StreamingResponse`. Os prazos são um só `asyncio.timeout_at` que começa com o prazo do primeiro token e é reagendado para o fim do turno quando o primeiro token chega. O cancelamento vem de graça: o Starlette ouve o `http.disconnect` e cancela a tarefa do stream; o `CancelledError` chega ao meu gerador no `await` em curso, e o `finally` fecha o gerador da fonte — que, num cliente real, fecha a ligação ao fornecedor ou aborta o pedido no vLLM. Custo: O(1) por token.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Solução e testes (pytest -q: 4 passed). O teste de desligar chama a app ASGI directamente com um `receive` que devolve `http.disconnect` ao fim de 0,1 s.',
          code: String.raw`# servico.py
import asyncio
import json
import logging
from collections.abc import AsyncGenerator, AsyncIterator, Callable

from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

log = logging.getLogger("stream")
PRAZO_TTFT_S = 10.0    # até ao primeiro token
PRAZO_TOTAL_S = 60.0   # turno inteiro


class Pedido(BaseModel):
    pergunta: str = Field(min_length=1, max_length=4000)


Fonte = Callable[[str], AsyncGenerator[str, None]]   # stream de tokens do modelo


def sse(evento: str, dados: dict, ident: int | None = None) -> str:
    cabeca = f"id: {ident}\n" if ident is not None else ""
    return f"{cabeca}event: {evento}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"


async def eventos(tokens: AsyncGenerator[str, None], *, prazo_ttft: float = PRAZO_TTFT_S,
                  prazo_total: float = PRAZO_TOTAL_S) -> AsyncIterator[str]:
    loop = asyncio.get_running_loop()
    fim = loop.time() + prazo_total
    n = 0
    try:
        async with asyncio.timeout_at(min(fim, loop.time() + prazo_ttft)) as prazo:
            async for tok in tokens:
                if n == 0:
                    prazo.reschedule(fim)          # chegou o 1.º token: passa a valer o prazo do turno
                n += 1
                yield sse("token", {"t": tok}, n)
        yield sse("fim", {"tokens": n}, n + 1)
    except TimeoutError:
        fase = "primeiro token" if n == 0 else "turno"
        yield sse("erro", {"status": 504, "title": f"Prazo excedido ({fase})"}, n + 1)
    except asyncio.CancelledError:
        log.info("cliente desligou após %d tokens", n)   # regista e propaga: nunca engolir
        raise
    finally:
        await tokens.aclose()        # fecha o stream ao fornecedor: deixa de gerar (e de cobrar)


async def fonte_modelo(pergunta: str) -> AsyncGenerator[str, None]:
    raise NotImplementedError        # cliente do fornecedor ou do vLLM, em streaming
    yield ""


def obter_fonte() -> Fonte:
    return fonte_modelo


app = FastAPI()


@app.post("/v1/respostas")
async def responder(pedido: Pedido, fonte: Fonte = Depends(obter_fonte)) -> StreamingResponse:
    return StreamingResponse(
        eventos(fonte(pedido.pergunta)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# test_servico.py  (pytest -q  ->  4 passed)
import asyncio
import json

from fastapi.testclient import TestClient

from servico import app, eventos, obter_fonte

estado = {"gerados": 0, "fechado": False}


async def modelo_falso(pergunta: str, n: int = 50, atraso: float = 0.01, ttft: float = 0.0):
    estado.update(gerados=0, fechado=False)
    try:
        await asyncio.sleep(ttft)
        for i in range(n):
            await asyncio.sleep(atraso)
            estado["gerados"] += 1
            yield f"t{i}"
    finally:
        estado["fechado"] = True


def test_stream_completo():
    app.dependency_overrides[obter_fonte] = lambda: (lambda p: modelo_falso(p, n=3, atraso=0))
    with TestClient(app) as c:
        r = c.post("/v1/respostas", json={"pergunta": "onde está o meu pedido?"})
    assert r.headers["content-type"].startswith("text/event-stream")
    eventos_ = [b for b in r.text.split("\n\n") if b]
    assert eventos_[-1].startswith("id: 4\nevent: fim")          # 3 tokens + fim
    assert json.loads(eventos_[0].split("data: ")[1]) == {"t": "t0"}
    app.dependency_overrides.clear()


def test_prazo_primeiro_token():
    async def corre():
        return [e async for e in eventos(modelo_falso("x", ttft=1.0), prazo_ttft=0.05)]
    saida = asyncio.run(corre())
    assert "Prazo excedido (primeiro token)" in saida[-1]
    assert estado["fechado"] is True


def test_prazo_total():
    async def corre():
        return [e async for e in eventos(modelo_falso("x", n=100, atraso=0.01), prazo_ttft=1, prazo_total=0.2)]
    saida = asyncio.run(corre())
    assert "Prazo excedido (turno)" in saida[-1] and 10 < len(saida) < 30
    assert estado["fechado"] is True


def test_cliente_desliga_para_de_gerar():
    app.dependency_overrides[obter_fonte] = lambda: (lambda p: modelo_falso(p, n=500, atraso=0.01))
    corpo = json.dumps({"pergunta": "olá"}).encode()
    pedidos = [{"type": "http.request", "body": corpo, "more_body": False}]

    async def receive():
        if pedidos:
            return pedidos.pop()
        await asyncio.sleep(0.1)                     # ~10 tokens depois, o cliente fecha a app
        return {"type": "http.disconnect"}

    async def send(msg):
        pass

    scope = {"type": "http", "asgi": {"version": "3.0", "spec_version": "2.3"}, "http_version": "1.1",
             "method": "POST", "path": "/v1/respostas", "raw_path": b"/v1/respostas", "query_string": b"",
             "headers": [(b"content-type", b"application/json")], "scheme": "http",
             "server": ("t", 80), "client": ("c", 1), "root_path": ""}
    asyncio.run(app(scope, receive, send))
    assert estado["fechado"] is True
    assert estado["gerados"] < 50, estado              # longe dos 500
    app.dependency_overrides.clear()`,
        },
        {
          type: 'h',
          text: 'Casos-limite que tratei e porquê',
        },
        {
          type: 'list',
          items: [
            '`CancelledError` é apanhado só para registar e **é relançado**; engoli-lo deixava a tarefa viva e o modelo a gerar.',
            'O `TimeoutError` vira um evento `erro` com 504: o cliente já recebeu 200 no início do stream, por isso o erro tem de ir dentro do stream.',
            'O `id` sequencial em cada evento permite ao cliente retomar com `Last-Event-ID` se eu guardar o turno.',
            '`X-Accel-Buffering: no` e `Cache-Control: no-cache` impedem um nginx de juntar os tokens num bloco só.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O heartbeat com `wait_for(anext(...))`',
          text: 'A forma óbvia de mandar `: ping` quando não há tokens — `asyncio.wait_for(anext(fonte), 15)` — **mata a fonte** no primeiro timeout: o `wait_for` cancela o `anext`, o `CancelledError` entra no gerador e ele termina. Testei: o stream acaba silenciosamente. Para heartbeat, um produtor numa tarefa à parte que escreve numa `asyncio.Queue` e o consumidor faz `wait_for` sobre a fila. Em FastAPI 0.135 ou mais recente, o `EventSourceResponse` de `fastapi.sse` já envia pings a cada 15 s.',
        },
        {
          type: 'p',
          text: 'Extensões que o entrevistador costuma pedir: guardar os eventos do turno (Redis com TTL) para retomar com `Last-Event-ID`; contar tokens de entrada e saída e registá-los no span mesmo quando cancelado; um semáforo de concorrência à volta da fonte, com 429 se a fila de admissão estiver cheia; e um evento `fim` com `finish_reason` para o cliente distinguir corte por limite de tokens de fim natural.',
        },
        {
          type: 'refs',
          items: [
            { label: 'FastAPI — Server-Sent Events', url: 'https://fastapi.tiangolo.com/tutorial/server-sent-events/' },
            { label: 'Starlette — Responses (StreamingResponse)', url: 'https://www.starlette.io/responses/' },
            { label: 'Python — asyncio.timeout_at e reschedule', url: 'https://docs.python.org/3/library/asyncio-task.html' },
            { label: 'MDN — Using server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Produz eventos no formato SSE correcto (`event:`, `data:`, linha em branco) com `media_type` `text/event-stream`.',
          'Implementa os dois prazos (primeiro token e turno) e devolve o erro dentro do stream.',
          'Garante que a fonte é fechada em todos os caminhos (`finally` com `aclose`) e não engole `CancelledError`.',
          'Testa o caminho feliz, o timeout e a desconexão, com a fonte injectada por dependência.',
          'Separa a lógica de eventos do endpoint para a testar sem HTTP.',
        ],
        fraco: 'Um `StreamingResponse` sobre a fonte, sem prazos, sem tratar a desconexão e sem teste.',
        solido: 'Prazos, `finally` a fechar a fonte, erro como evento, e testes do caminho feliz e do timeout.',
        excelente: 'Testa a desconexão de verdade (chamada ASGI com `http.disconnect`) e mostra que a fonte parou; conhece a armadilha do heartbeat com `wait_for` e propõe retoma com `Last-Event-ID`.',
      },
      seguimento: [
        'Como registavas os tokens consumidos de um turno cancelado no traço e na métrica de custo?',
        'Como mudava o código para retomar o stream com `Last-Event-ID` depois de uma queda de rede?',
        'O teu `fonte` real é o SDK do fornecedor. Como confirmas que fechar o gerador fecha mesmo a ligação HTTP?',
      ],
      sinaisAlarme: [
        'Um `except Exception` ou `except BaseException` que apanha tudo e continua o ciclo.',
        'Devolver um 504 HTTP depois de já ter começado a enviar o stream.',
        'Não ter forma de testar sem um modelo real.',
      ],
      modulos: ['fastapi-servico'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-servir-modelos-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O TTFT p95 dispara com carga moderada',
      enunciado:
        'O teu serviço de chat tem TTFT p95 de 0,9 s com pouco tráfego. A 20 pedidos por segundo — nada de especial — o p95 sobe para 7 s, mas o p50 fica em 1,1 s. O fornecedor diz que está tudo bem. Por onde começas?',
      contexto:
        'FastAPI com uvicorn, 1 worker por pod, 4 pods de 2 vCPU. Cada turno: guarda de PII, embedding da pergunta, pesquisa vectorial, chamada ao modelo em streaming. O span do modelo (`chat`) mostra o tempo até ao primeiro token do fornecedor estável em ~600 ms no p95. O CPU por pod está em ~50%. Não houve deploy nos últimos dias; o tráfego cresceu 3× com uma campanha.',
      minutos: 12,
      dica: 'p50 estável e p95 a explodir aponta para espera, não para trabalho mais lento. Onde é que um pedido espera dentro do teu processo?',
      resposta: [
        {
          type: 'p',
          text: 'Se o fornecedor está estável e o p50 também, os pedidos estão a **esperar dentro do meu serviço**. Os 50% de CPU em 2 vCPU são o sinal: um core a 100%, o outro parado — o processo Python está saturado ou o event loop está bloqueado. A hipótese mais provável é uma chamada síncrona no caminho do pedido que, a 5 pedidos por segundo por pod, deixa de caber no loop.',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Decompor o TTFT pelos spans',
              text: 'TTFT do utilizador = admissão + guarda + embedding + pesquisa + TTFT do fornecedor. Comparo traços lentos e rápidos: se a diferença está em «buracos» entre spans, ou em spans curtos como a guarda que ficaram longos sem razão, é espera pelo loop, não trabalho.',
            },
            {
              title: 'Medir o lag do event loop',
              text: 'Uma tarefa que dorme 100 ms e regista o atraso real. Lag p99 de centenas de ms confirma bloqueio. Em paralelo, `py-spy dump` num pod sob carga mostra a stack que está a segurar a thread.',
            },
            {
              title: 'Procurar os suspeitos habituais',
              text: 'Por ordem de probabilidade: cliente síncrono de embeddings (`requests`) dentro de `async def`; a guarda de PII com regex sobre o histórico inteiro, que cresce com a conversa; contagem de tokens do contexto no loop; logging síncrono para a rede.',
            },
            {
              title: 'Excluir pools esgotados',
              text: 'Um `httpx.AsyncClient` criado por pedido, ou partilhado com o limite por omissão de 100 ligações, faz os pedidos esperar por ligação; rotas ou dependências `def` esgotam o threadpool de 40. Ambos aparecem como espera antes do span do fornecedor começar.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Causa provável neste cenário: o cliente de embeddings era síncrono (~120 ms por chamada). A 5 pedidos/s por pod são ~600 ms de cada segundo com o loop bloqueado; qualquer pedido que chegue atrás de uma rajada espera a fila inteira — daí a cauda longa com p50 normal. A correcção é trocar por um cliente async (ou `asyncio.to_thread` como remendo), mover a regex de PII para só a mensagem nova, e passar a 2 workers por pod ou a pods de 1 vCPU para usar os cores que estão parados.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Métrica de lag do event loop com alerta; teste de carga no CI a 2× o pico com SLO de TTFT p95; uma regra de lint que proíbe `requests` e SDKs síncronos em módulos async; e no painel, TTFT do utilizador ao lado do TTFT do fornecedor — a diferença entre os dois é o «meu» tempo e tem de ter dono.',
        },
        {
          type: 'refs',
          items: [
            { label: 'FastAPI — Concurrency and async / await', url: 'https://fastapi.tiangolo.com/async/' },
            { label: 'Python — Developing with asyncio', url: 'https://docs.python.org/3/library/asyncio-dev.html' },
            { label: 'Google SRE Book — Monitoring Distributed Systems', url: 'https://sre.google/sre-book/monitoring-distributed-systems/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Lê p50 estável com p95 a explodir como espera em fila, não como trabalho mais lento.',
          'Usa o TTFT do fornecedor para excluir o modelo e decompõe o TTFT pelos spans.',
          'Interpreta 50% de CPU em 2 vCPU como um core saturado num processo Python.',
          'Propõe medir o lag do event loop e/ou usar um profiler de amostragem em produção.',
          'Lista suspeitos concretos (cliente síncrono, CPU no loop, pool de ligações, threadpool) e a correcção de cada um.',
          'Propõe uma salvaguarda contra regressão (alerta de lag, teste de carga, lint).',
        ],
        fraco: '«Subo as réplicas» ou «o fornecedor está lento», sem olhar para os spans.',
        solido: 'Decompõe o TTFT, suspeita de bloqueio do loop, confirma e corrige com cliente async.',
        excelente: 'Explica a cauda pela teoria de filas, lê o CPU a 50% como um core preso, verifica pools de ligações e threadpool, e deixa métricas e testes de carga para não voltar.',
      },
      seguimento: [
        'E se o lag do loop estiver baixo e mesmo assim houver buracos entre spans?',
        'Como dimensionavas o número de workers por pod?',
        'Que diferença esperavas ver no traço se o problema fosse o pool de ligações do httpx?',
      ],
      sinaisAlarme: [
        'Escalar horizontalmente antes de perceber o que está a esperar.',
        'Culpar o fornecedor sem olhar para o TTFT que ele próprio mostra no span.',
        'Olhar só para médias.',
      ],
      modulos: ['fastapi-servico', 'observabilidade-llmops'],
    },
  ],
};
