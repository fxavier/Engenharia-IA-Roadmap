import type { Section } from '../types';

/* Secções 5 a 7 do módulo 13: resiliência, callbacks e streaming, e quando não usar LangChain. */

export const seccoesB: Section[] = [
  /* ================================================================= 5 */
  {
    id: 'resiliencia',
    title: 'Resiliência: `with_retry`, `with_fallbacks`, timeouts e rate limits',
    blocks: [
      {
        type: 'p',
        text:
          'Um fornecedor de modelos é uma dependência externa com o pior perfil que conheces: latência de segundos, variância alta, 429 nas horas de ponta e degradações parciais que não aparecem na página de estado. O módulo 3 tratou disto ao nível do SDK. O LangChain acrescenta duas peças ao nível da cadeia: `with_retry` (tenta outra vez o mesmo runnable) e `with_fallbacks` (tenta outro runnable). As duas são decoradores: devolvem um runnable novo e deixam o original intacto.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Assinaturas reais em `langchain-core` 1.x. Nota o `retry_if_exception_type`: por omissão apanha `Exception`, o que inclui erros de programação que nunca vão passar à segunda.',
        code: `from langchain_core.runnables import Runnable

# Runnable.with_retry(*, retry_if_exception_type=(Exception,),
#                     wait_exponential_jitter=True,
#                     exponential_jitter_params=None,
#                     stop_after_attempt=3)
# Runnable.with_fallbacks(fallbacks, *, exceptions_to_handle=(Exception,),
#                         exception_key=None)

import httpx
from anthropic import APIStatusError, APITimeoutError

medio = criar_modelo(cfg, "responder")              # timeout=30 s, max_retries=2 no SDK
local = init_chat_model("llama3.2:3b", model_provider="ollama", temperature=0)

gerar = (prompt | medio | StrOutputParser()).with_retry(
    retry_if_exception_type=(APITimeoutError, httpx.ConnectError),
    stop_after_attempt=2,
).with_fallbacks(
    [prompt | local | StrOutputParser()],           # degradar, não falhar
    exceptions_to_handle=(APITimeoutError, APIStatusError, httpx.ConnectError),
)`,
      },
      {
        type: 'run',
        run: {
          id: 'run-langchain-lcel-03',
          title: 'Retentativas com backoff e fallback, sem relógio',
          brief:
            'Didáctico: `com_retry` e `com_fallbacks` em Python puro, com jitter de semente fixa. O modelo médio está degradado (timeout); ao fim de três tentativas a cadeia passa para o modelo local. Conta quantas chamadas pagaste antes de responder.',
          code: `# Retentativas com backoff e fallback, sem relógio: contamos tentativas e esperas.
import random

rng = random.Random(7)                      # semente fixa: jitter reprodutível


def backoff(tentativa, inicial=1.0, maximo=10.0):
    # exponencial com jitter: 1 s, 2 s, 4 s... mais até 1 s aleatório
    return min(maximo, inicial * 2 ** (tentativa - 1)) + rng.random()


def com_retry(fn, tentativas=3, apanhar=(TimeoutError,)):
    def correr(x, log):
        for t in range(1, tentativas + 1):
            try:
                return fn(x, log)
            except apanhar as e:
                if t == tentativas:
                    raise
                log.append(f"tentativa {t} falhou ({type(e).__name__}); espera {backoff(t):.2f} s")
    return correr


def com_fallbacks(principal, *alternativas, apanhar=(Exception,)):
    def correr(x, log):
        for i, fn in enumerate((principal, *alternativas)):
            try:
                return fn(x, log)
            except apanhar as e:
                log.append(f"opção {i} esgotada: {type(e).__name__}: {e}")
        raise RuntimeError("sem alternativas")
    return correr


estado = {"medio": 0}


def modelo_medio(x, log):
    estado["medio"] += 1
    raise TimeoutError("30 s sem resposta")      # o fornecedor está degradado


def modelo_local(x, log):
    return f"resposta do modelo local a {x!r}"


cadeia = com_fallbacks(com_retry(modelo_medio, tentativas=3), modelo_local)
log = []
print(cadeia("Posso juntar dois cupões?", log))
print("\\n".join(log))
print("chamadas ao modelo médio:", estado["medio"])`,
          expected: `resposta do modelo local a 'Posso juntar dois cupões?'
tentativa 1 falhou (TimeoutError); espera 1.32 s
tentativa 2 falhou (TimeoutError); espera 2.15 s
opção 0 esgotada: TimeoutError: 30 s sem resposta
chamadas ao modelo médio: 3`,
        },
      },
      {
        type: 'p',
        text:
          'Faz a conta do tempo, não só das chamadas: três tentativas com timeout de 30 s e esperas de ≈ 1,3 s e ≈ 2,2 s são **≈ 93 s** até ao fallback. O requisito RNF-01 pede a primeira palavra em 1,5 s. Retentativas protegem a taxa de sucesso e destroem a latência; num caminho interactivo, o orçamento de tempo decide o número de tentativas, não o contrário.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-langchain-lcel-01',
          title: 'Um turno com o fornecedor degradado: retentativa, fallback e o relógio do cliente',
          intro: 'Sexta às 20h, pico de 190 conversas por hora. O fornecedor do modelo médio responde a metade dos pedidos com 529 (sobrecarregado). Repara em onde se gasta o tempo.',
          lanes: [
            { id: 'api', label: 'API do «Balcão»', sub: 'rota SSE', kind: 'service' },
            { id: 'cadeia', label: 'cadeia LCEL', sub: 'with_retry + with_fallbacks', kind: 'agent' },
            { id: 'medio', label: 'Modelo médio', sub: 'fornecedor comercial', kind: 'external' },
            { id: 'local', label: 'Modelo de recurso', sub: 'outro fornecedor ou local', kind: 'model' },
          ],
          steps: [
            { from: 'api', to: 'cadeia', label: 'astream_events({pergunta})', detail: 'O cliente está a ver o indicador de «a escrever».', kind: 'req', ms: 5 },
            { from: 'cadeia', to: 'medio', label: 'POST /messages (tentativa 1)', detail: 'Timeout do SDK a 8 s neste caminho, não os 30 s de omissão do laboratório.', kind: 'req', ms: 1200 },
            { from: 'medio', to: 'cadeia', label: '529 overloaded', detail: 'Erro retentável. O SDK já fez as suas `max_retries` antes de a excepção chegar à cadeia.', kind: 'err', ms: 10 },
            { from: 'cadeia', to: 'cadeia', label: 'backoff ≈ 1,3 s', detail: '`wait_exponential_jitter=True`: exponencial com jitter, para que 190 conversas não retentem ao mesmo milissegundo.', kind: 'self', ms: 1300 },
            { from: 'cadeia', to: 'medio', label: 'POST /messages (tentativa 2)', kind: 'req', ms: 1100 },
            { from: 'medio', to: 'cadeia', label: '529 overloaded', kind: 'err', ms: 10 },
            { from: 'cadeia', to: 'local', label: 'fallback: o mesmo prompt, outro modelo', detail: '`with_fallbacks` passa a mesma entrada. O prompt tem de funcionar nos dois modelos: é por isso que se avalia o fallback (módulo 20), não só o principal.', kind: 'req', ms: 900, tokens: 3100 },
            { from: 'local', to: 'api', label: 'tokens em streaming', detail: 'O primeiro token chega ≈ 4,5 s depois do pedido: pior do que o alvo, melhor do que um erro.', kind: 'res', ms: 3000 },
          ],
          outro: 'O traço deste turno tem de mostrar as duas tentativas e o fallback (módulo 29). Sem isso, o painel mostra só «TTFT p95 subiu» e ninguém sabe porquê.',
        },
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Retentativas empilhadas multiplicam-se',
        text:
          'O `ChatAnthropic` configurado com `max_retries=2` já faz até 3 pedidos HTTP por chamada. Envolto em `with_retry(stop_after_attempt=3)`, são até 9. Se o grafo tiver um `RetryPolicy` no nó (módulo 16), podem ser 27. Escolhe **uma** camada para retentar erros de rede (o SDK), outra para degradar (o fallback), e nenhuma para erros de validação: um `ValidationError` do Pydantic não se resolve a pedir outra vez o mesmo.',
      },
      {
        type: 'p',
        text:
          'O controlo de caudal fica do lado do cliente. Todos os modelos de chat aceitam `rate_limiter=InMemoryRateLimiter(requests_per_second=..., max_bucket_size=...)`, um token bucket por processo. Serve para um job em lote (avaliações, reclassificação nocturna); não serve para o serviço com várias réplicas, porque cada réplica tem o seu balde. Aí o limite vive num sítio partilhado (módulo 30).',
      },
      { type: 'file', ref: 'src/balcao/modelos.py' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — modelos: retentativas, timeouts e rate limiting', url: 'https://docs.langchain.com/oss/python/langchain/models' },
          { label: 'LangChain — erro MODEL_RATE_LIMIT', url: 'https://docs.langchain.com/oss/python/langchain/errors/MODEL_RATE_LIMIT' },
          { label: 'Anthropic — erros da API', url: 'https://docs.anthropic.com/en/api/errors' },
        ],
      },
    ],
  },

  /* ================================================================= 6 */
  {
    id: 'callbacks-streaming',
    title: 'Callbacks, eventos e streaming',
    blocks: [
      {
        type: 'p',
        text:
          'Cada runnable emite eventos de ciclo de vida: começou, produziu um token, terminou, falhou. Há duas formas de os apanhar. Os **callbacks** (`BaseCallbackHandler` com métodos como `on_chat_model_start`, `on_llm_new_token`, `on_llm_end`, `on_retriever_end`, `on_tool_start`) são passados em `config["callbacks"]` e propagam-se por toda a árvore. Os **eventos** (`astream_events`) são um iterador assíncrono sobre os mesmos momentos, pensado para quem quer consumir em vez de reagir.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Contar tokens por modelo sem instrumentar nada à mão: `get_usage_metadata_callback` agrega o `usage_metadata` de todas as chamadas feitas dentro do bloco.',
        code: `from langchain_core.callbacks import get_usage_metadata_callback

with get_usage_metadata_callback() as uso:
    cadeia_rag.invoke({"pergunta": "Durante quanto tempo posso usar um cupão?"})

# {'balcao-sim-responder': {'input_tokens': ..., 'output_tokens': ..., 'total_tokens': ...}}
for modelo, u in uso.usage_metadata.items():
    registar_custo(modelo, u["input_tokens"], u["output_tokens"])   # gen_ai.usage.* (módulo 29)`,
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O streaming da cadeia RAG (de `cadeias.py`): tokens do modelo interno à medida que chegam, e o resultado validado no evento de fim da cadeia com `run_name="cadeia_rag"`.',
        code: `async def transmitir_rag(cadeia, entrada):
    async for ev in cadeia.astream_events(entrada, version="v2"):
        if ev["event"] == "on_chat_model_stream":
            texto = ev["data"]["chunk"].text
            if texto:
                yield {"tipo": "token", "texto": texto}
        elif ev["event"] == "on_chain_end" and ev["name"] == NOME_CADEIA:
            saida = ev["data"]["output"]
            yield {"tipo": "fim", "resposta": saida["resposta"],
                   "citacoes": saida["citacoes"], "recusa": saida["recusa"]}`,
      },
      {
        type: 'p',
        text:
          'Repara na consequência de desenho: os tokens chegam ao cliente **antes** de a guarda de citações correr. Se a guarda trocar a resposta pela recusa, o evento `fim` traz o texto final e o cliente substitui o que já mostrou. É um compromisso consciente entre RNF-01 (primeira palavra em 1,5 s) e adr-0011 (citações obrigatórias); a alternativa, validar antes de mostrar, custaria os ≈ 3 s de geração em cada turno. O módulo 25 mostra o protocolo SSE que torna a substituição visível e limpa.',
      },
      {
        type: 'table',
        head: ['Evento (`version="v2"`)', 'Quando', 'Uso no «Balcão»'],
        rows: [
          ['`on_chat_model_start` / `on_chat_model_end`', 'Antes e depois de cada chamada a um modelo de chat.', 'Spans `chat` com `gen_ai.request.model` e `gen_ai.usage.*`.'],
          ['`on_chat_model_stream`', 'Cada pedaço gerado.', 'Tokens para o SSE.'],
          ['`on_retriever_start` / `on_retriever_end`', 'Pesquisa no retriever.', 'Ids e scores dos documentos no traço.'],
          ['`on_tool_start` / `on_tool_end`', 'Execução de uma ferramenta.', 'Span `execute_tool`; nunca os argumentos com PII em claro.'],
          ['`on_chain_start` / `on_chain_end`', 'Qualquer runnable composto, incluindo lambdas.', 'Fim da cadeia com o resultado validado.'],
        ],
        caption: 'Os eventos que a API e a observabilidade consomem. Filtra por `name`, `tags` ou `include_types`: sem filtro, uma cadeia de dez passos emite dezenas de eventos por turno.',
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'Tracing: LangSmith, Langfuse ou OpenTelemetry',
        text:
          'O LangChain envia traços para o LangSmith se as variáveis de ambiente o pedirem; é o caminho mais curto e é um serviço externo. O «Balcão» decidiu OpenTelemetry com as convenções `gen_ai.*` e Langfuse auto-hospedado (adr-0025), ligados por um callback handler. O ponto técnico é o mesmo em qualquer opção: os callbacks já existem em cada runnable, e é por eles que a instrumentação entra, sem mexer no código de negócio.',
      },
      { type: 'file', ref: 'src/balcao/simulado.py' },
      {
        type: 'p',
        text:
          'O `ChatSimulado` do laboratório mostra o contrato mínimo de um modelo de chat: implementa `_generate` e `_stream`, preenche `usage_metadata` e `tool_calls`, e o resto (`invoke`, `batch`, `astream_events`, callbacks) vem de `BaseChatModel`. É assim que os testes correm a cadeia inteira sem rede e com resultados exactos, e é o padrão que vais usar para testar cadeias no módulo 14.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — streaming', url: 'https://docs.langchain.com/oss/python/langchain/streaming' },
          { label: 'LangChain — event streaming', url: 'https://docs.langchain.com/oss/python/langchain/event-streaming' },
          { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
        ],
      },
    ],
  },

  /* ================================================================= 7 */
  {
    id: 'quando-nao',
    title: 'Quando não usar LangChain',
    blocks: [
      {
        type: 'p',
        text:
          'Uma biblioteca de orquestração vale o que poupa menos o que custa. O custo é real: mais uma camada entre o teu código e o pedido HTTP, stack traces com vinte frames de `runnables/base.py`, actualizações a acompanhar, e uma curva de aprendizagem para quem entra na equipa. O ganho também é real, mas concentra-se em poucos sítios. A decisão do «Balcão» (adr-0012) é usar a biblioteca **onde ela poupa código difícil** e não usá-la onde apenas envolveria código simples.',
      },
      {
        type: 'compare',
        left: {
          title: 'Onde o LangChain paga o que custa',
          items: [
            'Trocar de fornecedor por configuração (`init_chat_model`), com mensagens, tool calls e `usage_metadata` normalizados.',
            'Streaming de eventos de uma cadeia composta, com callbacks propagados a cada passo.',
            '`with_structured_output` com o mecanismo nativo de cada fornecedor.',
            'Integrações mantidas por terceiros: splitters, Ollama, pgvector.',
            'E, com o LangGraph, persistência, interrupts e replay (módulo 17).',
          ],
        },
        right: {
          title: 'Onde não paga',
          items: [
            'Uma chamada a um modelo com um prompt fixo: o SDK do fornecedor chega.',
            'Lógica de negócio (limites de reembolso, regras de fraude): Python puro, testável sem nada.',
            'Transformações simples de dados embrulhadas em `RunnableLambda` só para «ficar em LCEL».',
            'Um serviço cujo único fornecedor é fixo por contrato e cuja equipa já domina o SDK.',
            'Código que tem de correr em ambientes onde cada dependência é auditada.',
          ],
        },
      },
      {
        type: 'decision',
        tree: {
          id: 'dt-langchain-lcel-01',
          title: 'LangChain, LangGraph ou o SDK directo?',
          intro: 'Uma árvore para cada componente novo do «Balcão» (ou de outro serviço). Decide componente a componente, não para o projecto inteiro.',
          start: 'q1',
          nodes: [
            { id: 'q1', question: 'O componente tem estado que atravessa turnos, espera por humanos ou precisa de ser retomado depois de um crash?', options: [{ label: 'Sim', next: 'grafo' }, { label: 'Não', next: 'q2' }] },
            { id: 'q2', question: 'Precisa de mais do que um fornecedor de modelo (principal, fallback, local para testes)?', options: [{ label: 'Sim', next: 'q3' }, { label: 'Não, um só e fixo', next: 'q4' }] },
            { id: 'q3', question: 'É uma sequência curta de passos (reformular, pesquisar, gerar, validar) com streaming?', options: [{ label: 'Sim', next: 'lcel' }, { label: 'Não, é uma chamada única', next: 'modelo' }] },
            { id: 'q4', question: 'A equipa vai precisar de tracing por passo e de testes com modelo falso?', options: [{ label: 'Sim', next: 'lcel' }, { label: 'Não', next: 'sdk' }] },
            { id: 'grafo', answer: 'LangGraph (`StateGraph` com checkpointer).', detail: 'É o caso do fluxo da conversa: router, ciclo de ferramentas, interrupt de aprovação. Módulos 16 e 17.' },
            { id: 'lcel', answer: 'Uma cadeia LCEL curta, com a lógica de negócio em funções do domínio.', detail: 'É o caso da cadeia RAG de `cadeias.py`: cinco passos, um ramo, streaming de eventos.' },
            { id: 'modelo', answer: 'Só `init_chat_model` e `invoke`: sem cadeia.', detail: 'O classificador e o resumo de memória usam o modelo directamente; embrulhá-los numa cadeia não acrescenta nada.' },
            { id: 'sdk', answer: 'O SDK do fornecedor, atrás de uma interface própria (adr-0003).', detail: 'Menos uma dependência. A interface própria mantém a porta aberta para trocar mais tarde.' },
          ],
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O teste do limite de 500 MZN não importa LangChain: a regra vive no domínio. Se amanhã a biblioteca sair, este teste não muda.',
        code: `from balcao import didactico as d

def test_reembolso_acima_do_limite_pede_aprovacao() -> None:
    r = d.calcular_reembolso("PD-8842507", "nao_entregue")
    assert r["valor_mzn"] == 2910 and r["precisa_aprovacao"] is True

def test_emitir_acima_do_limite_e_recusado_no_codigo() -> None:
    r = d.emitir_reembolso("PD-8842507", 2910, "chave-teste-1")
    assert r["codigo"] == "APROVACAO_NECESSARIA"`,
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Abstracções que escondem o pedido',
        text:
          'Quando uma resposta sai errada, a primeira pergunta é sempre «o que é que o modelo recebeu, exactamente?». Se a resposta exige ler três classes da biblioteca, a abstracção está a custar mais do que vale. Regra prática do «Balcão»: qualquer cadeia tem de permitir imprimir as mensagens finais enviadas ao modelo (`prompt.invoke(x).to_messages()`) e o traço tem de as guardar, mascaradas, para cada turno.',
      },
      {
        type: 'p',
        text:
          'Há ainda uma razão de longo prazo. As APIs de LLM mudaram mais em três anos do que as de bases de dados em vinte: mensagens com blocos de conteúdo, tool calling paralelo, *extended thinking*, prompt caching. Uma biblioteca de orquestração segue essas mudanças por ti, mas também muda com elas. O `langchain-classic` existe porque a 1.0 partiu com o passado. Manter o domínio fora da biblioteca é o que torna a próxima migração num trabalho de fronteira, não numa reescrita.',
      },
      { type: 'adr', ref: 'adr-0003' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — filosofia e arquitectura de componentes', url: 'https://docs.langchain.com/oss/python/langchain/philosophy' },
          { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
        ],
      },
    ],
  },
];
