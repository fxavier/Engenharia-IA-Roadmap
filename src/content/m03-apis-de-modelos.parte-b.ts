import type { Section } from '../types';

/* Secções 4 a 6 do módulo 3: SDKs e init_chat_model, prompt caching e batch, custo e interface própria. */

export const seccoesB: Section[] = [
  /* ================================================================= 4 */
  {
    id: 'sdks',
    title: 'SDKs Python e `init_chat_model`',
    blocks: [
      {
        type: 'p',
        text:
          'Os SDKs oficiais são clientes HTTP gerados a partir da especificação da API, com tipos, retentativas, timeouts e helpers de streaming. Usa-os em vez de `httpx` à mão: o que se poupa em código é pouco, o que se ganha em comportamento correcto (recuo que respeita `retry-after`, parsing de SSE, erros tipados) é muito. A pergunta de desenho não é «SDK ou HTTP», é **onde é que o SDK pode aparecer no teu código** — e no «Balcão» a resposta é: num só ficheiro.',
      },
      {
        type: 'table',
        head: ['', '`anthropic` 1.8', '`openai` 3.x', '`ollama` 0.6', '`langchain` 1.x (`init_chat_model`)'],
        rows: [
          ['Cliente', '`Anthropic()` / `AsyncAnthropic()`', '`OpenAI()` / `AsyncOpenAI()`', '`Client(host=...)` / `AsyncClient()`', '`init_chat_model("fornecedor:modelo", ...)`'],
          ['Chamada', '`messages.create`, `messages.stream`', '`responses.create`, `chat.completions.create`', '`chat(model, messages, stream=...)`', '`invoke`, `stream`, `ainvoke`, `astream`, `batch`'],
          ['Retentativas por omissão', '2, com recuo e `retry-after`', '2, com recuo e `retry-after`', 'nenhuma', 'as do SDK por baixo (`max_retries`)'],
          ['Timeout por omissão', '600 s (ligação 5 s)', '600 s (ligação 5 s)', 'nenhum (`timeout=None`)', 'o do SDK, salvo `timeout=`'],
          ['Contar tokens sem gerar', '`messages.count_tokens`', '`tiktoken` local', '`prompt_eval_count` depois', '`get_num_tokens_from_messages` (aproximado em alguns)'],
          ['Uso na resposta', '`usage.*` com cache', '`usage.*`, `cached_tokens`', '`prompt_eval_count`, `eval_count`', '`AIMessage.usage_metadata` normalizado'],
        ],
        caption:
          'Versões instaladas no laboratório (`uv.lock`). O cliente do Ollama sem timeout espera para sempre por um modelo que está a carregar: define-o sempre.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'OpenAI, Responses API: `instructions` e `input`, texto agregado em `output_text`, paragem em `status`. `store=False` para não guardar a conversa do lado do fornecedor.',
        code: `from openai import OpenAI

cliente = OpenAI(timeout=30.0, max_retries=2)      # OPENAI_API_KEY do ambiente
r = cliente.responses.create(
    model=MODELO_MEDIO_OPENAI,                      # identificador com data, nunca um alias (RI-07)
    instructions=SISTEMA,
    input=[{"role": "user", "content": pergunta_com_contexto}],
    max_output_tokens=400,
    store=False,                                    # dados de clientes: sem retenção no fornecedor
)
if r.status == "incomplete":
    print("cortada:", r.incomplete_details.reason)  # "max_output_tokens"
print(r.output_text)
print(r.usage.input_tokens, r.usage.input_tokens_details.cached_tokens, r.usage.output_tokens)`,
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Ollama local: um servidor HTTP na porta 11434 que carrega o modelo na primeira chamada (segundos) e o mantém em memória durante `keep_alive`. O `num_ctx` é do pedido: acima dele, o prompt é cortado sem erro (módulo 2).',
        code: `from ollama import Client

cliente = Client(host="http://localhost:11434", timeout=30)
r = cliente.chat(
    model="llama3.2:3b",
    messages=[{"role": "system", "content": SISTEMA}, {"role": "user", "content": pergunta_com_contexto}],
    options={"num_ctx": 8192, "num_predict": 400, "temperature": 0},
    keep_alive="30m",                    # evita recarregar o modelo entre pedidos do laboratório
)
print(r.message.content)
print(r.done_reason, r.prompt_eval_count, r.eval_count)
print("carregar:", r.load_duration / 1e9, "s · prefill:", r.prompt_eval_duration / 1e9, "s")`,
      },
      {
        type: 'p',
        text:
          '`init_chat_model` do LangChain 1.x é uma fábrica: recebe `"anthropic:<id>"`, `"openai:<id>"` ou `"ollama:llama3.2:3b"` (ou o nome e `model_provider=`), importa o pacote de integração certo e devolve um `BaseChatModel`. Todos os modelos devolvidos falam a mesma língua — mensagens do LangChain à entrada, `AIMessage` à saída, `usage_metadata` com `input_tokens`, `output_tokens` e `input_token_details.cache_read` — e todos têm `invoke`, `stream`, `batch`, `bind_tools` e `with_structured_output`. Os argumentos extra (`max_tokens`, `timeout`, `max_retries`, `num_ctx`) passam para a classe concreta.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Três fornecedores, uma interface. Com `configurable_fields`, o mesmo objecto troca de modelo por chamada — útil para a avaliação nocturna de um candidato, perigoso se o valor vier de um pedido do utilizador.',
        code: `from langchain.chat_models import init_chat_model

local = init_chat_model("ollama:llama3.2:3b", temperature=0, num_ctx=8192, num_predict=400)
medio = init_chat_model("anthropic:" + MODELO_MEDIO, max_tokens=400, timeout=30, max_retries=2)
alternativo = init_chat_model("openai:" + MODELO_MEDIO_OPENAI, max_tokens=400, timeout=30, max_retries=2)

for m in (local, medio, alternativo):
    r = m.invoke([("system", SISTEMA), ("human", pergunta_com_contexto)])
    print(type(m).__name__, r.usage_metadata["input_tokens"], r.usage_metadata["output_tokens"])

# Um só objecto, modelo escolhido por configuração (avaliação de candidatos)
candidato = init_chat_model(configurable_fields=("model", "model_provider"), max_tokens=400)
r = candidato.invoke(mensagens, config={"configurable": {"model": ID_CANDIDATO, "model_provider": "openai"}})`,
      },
      {
        type: 'p',
        text:
          'O que o LangChain **não** uniformiza é o comportamento. Os três modelos seguem instruções de forma diferente, partem texto em tokens de forma diferente, aceitam parâmetros diferentes e falham de forma diferente; funcionalidades exclusivas (marcações de cache explícitas, raciocínio explícito, `store`) continuam a exigir argumentos específicos. A interface comum serve para trocar de fornecedor sem reescrever o grafo; a decisão de trocar continua a ser tomada com evals (módulo 6).',
      },
      { type: 'file', ref: 'src/balcao/modelos.py' },
      {
        type: 'callout',
        tone: 'info',
        title: 'O SDK também é uma dependência que muda de comportamento',
        text:
          'Entre versões maiores, os SDKs mudam nomes de parâmetros (`max_tokens` passou a `max_completion_tokens` na Chat Completions), removem-nos (a amostragem na Messages API) e mudam os omissos. Fixa as versões no `uv.lock`, actualiza-as num PR próprio com as evals a correr, e lê as notas de versão como lês as de um driver de base de dados.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — modelos de chat e `init_chat_model`', url: 'https://docs.langchain.com/oss/python/langchain/models' },
          { label: 'SDK Python da OpenAI', url: 'https://github.com/openai/openai-python' },
          { label: 'Ollama — biblioteca Python', url: 'https://github.com/ollama/ollama-python' },
          { label: 'LangChain — integração ChatAnthropic', url: 'https://docs.langchain.com/oss/python/integrations/chat/anthropic' },
        ],
      },
    ],
  },

  /* ================================================================= 5 */
  {
    id: 'cache-batch',
    title: 'Prompt caching e processamento em lote',
    blocks: [
      {
        type: 'p',
        text:
          'Duas funcionalidades das APIs mudam o custo sem mudar a resposta. A **cache de prompt** guarda o estado de atenção de um prefixo do pedido durante alguns minutos e cobra os tokens desse prefixo a ≈ 10% do preço de entrada quando o pedido seguinte começa exactamente igual. O **processamento em lote** (*batch*) aceita milhares de pedidos de uma vez, devolve os resultados em até 24 horas e cobra metade. A primeira é para o tráfego interactivo; a segunda, para tudo o que ninguém está à espera de ler. O módulo 30 trata da economia da cache; aqui fica o mecanismo na API.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Messages API: o `cache_control` marca o fim do prefixo a guardar. A ordem de processamento é `tools` → `system` → `messages`, por isso um marcador no sistema cobre também os esquemas de ferramentas. Até 4 marcadores por pedido; `ttl` de `5m` (omisso) ou `1h`.',
        code: `def marcar_fim(mensagens: list[dict]) -> list[dict]:
    """Põe o marcador de cache no último bloco da última mensagem do histórico."""
    *antes, ultima = mensagens
    blocos = [{"type": "text", "text": ultima["content"], "cache_control": {"type": "ephemeral"}}]
    return [*antes, {"role": ultima["role"], "content": blocos}]

r = cliente.messages.create(
    model=MODELO_MEDIO,
    max_tokens=400,
    tools=ESQUEMAS,                                 # 1 100 tokens, sempre pela mesma ordem
    system=[
        {"type": "text", "text": SISTEMA,           # 900 tokens, sem datas nem nomes
         "cache_control": {"type": "ephemeral"}},   # marcador 1: tools + system
    ],
    messages=[
        *marcar_fim(historico),                     # marcador 2: a conversa até ao turno anterior
        {"role": "user", "content": contexto_rag_e_pergunta},   # parte variável, fora da cache
    ],
)
u = r.usage
entrada_total = u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens
print(entrada_total, "=", u.input_tokens, "+ escritos", u.cache_creation_input_tokens,
      "+ lidos", u.cache_read_input_tokens)`,
      },
      {
        type: 'p',
        text:
          'Três regras práticas saem da documentação. O prefixo tem de ter um **tamanho mínimo** para ser guardado (1 024 tokens na maioria dos modelos da Anthropic e na OpenAI, mais em alguns modelos pequenos) — abaixo disso o pedido corre normalmente e não há erro, só não há cache. A **comparação é exacta**: um espaço, um esquema com as chaves por outra ordem ou uma data no sistema dão um prefixo novo. E o `usage` separa os três tipos de entrada: `input_tokens` na Anthropic é **só** a parte fora da cache, e somar os três dá o total. Na OpenAI a cache é automática a partir de 1 024 tokens, `usage.prompt_tokens_details.cached_tokens` (ou `input_tokens_details.cached_tokens` na Responses) diz quanto acertou, e o parâmetro `prompt_cache_key` ajuda a encaminhar pedidos com o mesmo prefixo para a mesma cache.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Com LangChain: o `ChatAnthropic` passa o `cache_control` dos blocos de conteúdo; o `usage_metadata` traz `cache_read` e `cache_creation` normalizados, que é o que o «Balcão» regista em `gen_ai.usage.*`.',
        code: `from langchain_core.messages import HumanMessage, SystemMessage

sistema = SystemMessage(content=[
    {"type": "text", "text": SISTEMA, "cache_control": {"type": "ephemeral"}},
])
r = medio.invoke([sistema, *historico, HumanMessage(contexto_rag_e_pergunta)])
d = r.usage_metadata.get("input_token_details", {})
print(r.usage_metadata["input_tokens"], d.get("cache_read", 0), d.get("cache_creation", 0))
# Atenção: no LangChain, input_tokens é o TOTAL (inclui cache); na API crua da Anthropic, não.`,
      },
      {
        type: 'run',
        run: {
          id: 'run-apis-de-modelos-04',
          title: 'A avaliação nocturna: síncrona, com cache ou em lote',
          brief:
            'A corrida nocturna do conjunto de produção: ≈ 560 turnos no modelo médio mais uma chamada ao juiz no grande por turno (números do módulo 28). Preços do `balcao`; o desconto de lote de 50% é o das páginas oficiais em 2026 — confirma antes de orçamentar.',
          code: `import balcao as b

# Avaliação nocturna: 560 turnos no médio + o juiz no grande (uma chamada por turno)
turnos = 560
def noite(desconto_batch=1.0, cache=0):
    resposta = b.custo_mzn(5200, 180, "medio", tokens_cache=cache)
    juiz = b.custo_mzn(2500, 150, "grande")
    return turnos * (resposta + juiz) * desconto_batch

online = noite()
print(f"síncrono, sem cache:        {online:7.2f} MZN")
print(f"síncrono, sistema em cache: {noite(cache=2000):7.2f} MZN")
print(f"batch (50%), sem cache:     {noite(0.5):7.2f} MZN")
print(f"batch + cache do sistema:   {noite(0.5, 2000):7.2f} MZN")
print(f"por mês (30 noites), batch + cache: {30 * noite(0.5, 2000):,.0f} MZN")`,
          expected: `síncrono, sem cache:         567.17 MZN
síncrono, sistema em cache:  502.77 MZN
batch (50%), sem cache:      283.58 MZN
batch + cache do sistema:    251.38 MZN
por mês (30 noites), batch + cache: 7,542 MZN`,
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Message Batches da Anthropic: cada pedido leva um `custom_id` e os `params` de um `messages.create`. Os resultados chegam por ordem arbitrária — junta-os pelo `custom_id`, nunca pela posição. A Batch API da OpenAI faz o mesmo com um ficheiro JSONL e `completion_window="24h"`.',
        code: `lote = cliente.messages.batches.create(requests=[
    {"custom_id": p["id"], "params": {
        "model": MODELO_MEDIO, "max_tokens": 400,
        "system": [{"type": "text", "text": SISTEMA, "cache_control": {"type": "ephemeral"}}],
        "messages": montar_mensagens(p),
    }}
    for p in conjunto_dourado
])

# ... mais tarde (job agendado, não um sleep num worker)
lote = cliente.messages.batches.retrieve(lote.id)
if lote.processing_status == "ended":
    for res in cliente.messages.batches.results(lote.id):
        if res.result.type == "succeeded":
            guardar(res.custom_id, res.result.message)
        else:                                        # errored, canceled, expired
            repetir_sincrono(res.custom_id, res.result.type)`,
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'Lote para o que ninguém está a ler',
        text:
          'Avaliação nocturna, reclassificação de conversas antigas por intenção, geração de perguntas sintéticas, resumos de escalamento para o relatório semanal: tudo isto tolera horas de latência e custa metade em lote. Duas ressalvas. A latência de um lote não tem garantia abaixo das 24 h, por isso um gate de CI que precisa de resposta em 20 minutos (módulo 28) continua síncrono. E os acertos de cache dentro de um lote são possíveis mas não garantidos: não orçamentes com eles.',
      },
      { type: 'adr', ref: 'adr-0026' },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — prompt caching', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching' },
          { label: 'Anthropic — processamento em lote', url: 'https://docs.anthropic.com/en/docs/build-with-claude/batch-processing' },
          { label: 'OpenAI — Batch API', url: 'https://platform.openai.com/docs/guides/batch' },
          { label: 'OpenAI — prompt caching', url: 'https://platform.openai.com/docs/guides/prompt-caching' },
        ],
      },
    ],
  },

  /* ================================================================= 6 */
  {
    id: 'custo-interface',
    title: 'Custo por pedido e a interface própria sobre o fornecedor',
    blocks: [
      {
        type: 'p',
        text:
          'Com o `usage` de cada resposta e a tabela de preços do escalão, o custo de um pedido é uma conta de três parcelas: entrada fora da cache ao preço de entrada, entrada lida da cache ao preço de leitura, e saída ao preço de saída (a escrita na cache, quando existe, cobra-se com um acréscimo sobre a entrada). A conta faz-se **por chamada, no momento**, com os tokens que o fornecedor devolveu — não com estimativas no fim do mês.',
      },
      {
        type: 'formula',
        formula: {
          id: 'f-apis-de-modelos-01',
          title: 'Custo de uma chamada ao modelo',
          expr: 'custo = [ (E − C) · p_e + C · p_c + S · p_s ] / 10⁶ · câmbio',
          where: [
            { sym: 'E', means: 'tokens de entrada totais do pedido (sistema, esquemas, histórico, contexto, pergunta)' },
            { sym: 'C', means: 'tokens de entrada lidos da cache de prompt (`cache_read_input_tokens`)' },
            { sym: 'S', means: 'tokens de saída, incluindo os de raciocínio explícito quando existe (`output_tokens`)' },
            { sym: 'p_e, p_c, p_s', means: 'preços por milhão de tokens do escalão: entrada, leitura de cache e saída (1,00 / 0,10 / 5,00 USD no médio)' },
            { sym: 'câmbio', means: '63,9 MZN por USD, o câmbio de referência do `balcao`' },
          ],
          reading: 'Paga-se a entrada nova a preço cheio, a entrada repetida a um décimo, e cada token gerado a cinco vezes o preço de um token lido.',
          note: 'É a função `custo_mzn` do `balcao`. Omite a sobretaxa de escrita na cache (≈ 1,25× a entrada durante 5 min), que se dilui ao fim de uma leitura (módulo 30).',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-apis-de-modelos-05',
          title: 'Quanto custa um turno e uma conversa do «Balcão»',
          brief:
            'Os números do desenho: classificação no pequeno, resposta no médio, com e sem 60% de cache. A conversa usa `custo_conversa`, em que a entrada de cada turno inclui os anteriores.',
          code: `import balcao as b

# Um turno do «Balcão»: classificação (pequeno) + resposta (médio)
cls = b.custo_mzn(700, 20, "pequeno")
resp = b.custo_mzn(5200, 180, "medio")
resp_cache = b.custo_mzn(5200, 180, "medio", tokens_cache=3120)
print(f"classificar (pequeno, 700→20):        {cls:.4f} MZN")
print(f"responder   (médio, 5200→180):        {resp:.4f} MZN")
print(f"responder   com 60% em cache:         {resp_cache:.4f} MZN")
print(f"o mesmo turno no grande, sem cache:   {b.custo_mzn(5200, 180, 'grande'):.4f} MZN")
# Onde está o dinheiro de um pedido ao médio
p = b.MODELOS["medio"]
entrada = 5200 * p["entrada"] / 1e6 * b.CAMBIO_USD_MZN
saida = 180 * p["saida"] / 1e6 * b.CAMBIO_USD_MZN
print(f"entrada {entrada / (entrada + saida):.0%} · saída {saida / (entrada + saida):.0%} do custo sem cache")
# A conversa: o histórico volta a cada turno
for turnos in (1, 3, 6, 12):
    print(f"{turnos:>2} turnos: {b.custo_conversa(turnos, 5200, 180, 'medio', 0.6):.4f} MZN")`,
          expected: `classificar (pequeno, 700→20):        0.0128 MZN
responder   (médio, 5200→180):        0.3898 MZN
responder   com 60% em cache:         0.2104 MZN
o mesmo turno no grande, sem cache:   1.1694 MZN
entrada 85% · saída 15% do custo sem cache
 1 turnos: 0.2104 MZN
 3 turnos: 0.6576 MZN
 6 turnos: 1.3944 MZN
12 turnos: 3.1063 MZN`,
        },
      },
      {
        type: 'p',
        text:
          'Duas leituras. No «Balcão», **85% do custo é entrada**, apesar de a saída ser cinco vezes mais cara por token: é o contexto (sistema, esquemas, RAG, histórico) que pesa, e é aí que estão as alavancas. E a conversa de 3 turnos fica em ≈ 0,66 MZN, dentro do alvo de 1,00 MZN (RNF-02), mas a de 12 turnos passa os 3 MZN: o custo cresce mais depressa do que os turnos porque cada turno reenvia os anteriores. Experimenta no widget com o teu próprio turno.',
      },
      { type: 'widget', id: 'custo-tokens' },
      {
        type: 'diagram',
        diagram: {
          title: 'A interface própria: um ficheiro entre o «Balcão» e os fornecedores',
          caption:
            'O grafo e a cadeia RAG pedem «o modelo que responde» ou «o que classifica»; só `modelos.py` sabe que fornecedor, que versão, que timeout. Os testes e o CI usam o simulado na mesma interface (RE-03).',
          cols: 5,
          rows: 3,
          zones: [
            { id: 'z-balcao', label: 'Código do «Balcão»', col: 0, row: 0, colSpan: 3, rowSpan: 3, tone: 'service' },
            { id: 'z-fora', label: 'Fornecedores', col: 3, row: 0, colSpan: 2, rowSpan: 3, tone: 'external' },
          ],
          nodes: [
            { id: 'grafo', label: 'grafo.py · cadeias.py', sub: 'pedem um papel: responder, classificar, juiz', col: 0, row: 1, kind: 'service' },
            { id: 'config', label: 'config.py', sub: 'fornecedor, versão, timeout, retentativas', col: 1, row: 0, kind: 'data' },
            { id: 'modelos', label: 'modelos.py', sub: 'criar_modelo(cfg, papel)', col: 1, row: 1, kind: 'service' },
            { id: 'obs', label: 'observabilidade.py', sub: 'gen_ai.usage.* e custo por chamada', col: 1, row: 2, kind: 'service' },
            { id: 'sim', label: 'ChatSimulado', sub: 'testes e CI, sem rede', col: 2, row: 2, kind: 'model' },
            { id: 'ollama', label: 'Ollama', sub: 'llama3.2:3b no laboratório', col: 3, row: 2, kind: 'model' },
            { id: 'anthropic', label: 'Anthropic', sub: 'escalões com data fixada', col: 3, row: 0, kind: 'external' },
            { id: 'openai', label: 'OpenAI', sub: 'alternativo, avaliado todos os meses', col: 4, row: 1, kind: 'external' },
          ],
          edges: [
            { from: 'grafo', to: 'modelos', label: 'BaseChatModel' },
            { from: 'config', to: 'modelos', style: 'dashed' },
            { from: 'modelos', to: 'sim', label: 'simulado' },
            { from: 'modelos', to: 'ollama', label: 'init_chat_model' },
            { from: 'modelos', to: 'anthropic', label: 'init_chat_model' },
            { from: 'modelos', to: 'openai', label: 'init_chat_model', style: 'dashed' },
            { from: 'modelos', to: 'obs', label: 'usage_metadata', style: 'dashed' },
          ],
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Medir tokens e custo sem tocar em cada chamada: `get_usage_metadata_callback` do `langchain-core` soma o `usage_metadata` de todas as chamadas dentro do bloco, por modelo. O «Balcão» faz o mesmo num callback próprio que escreve os atributos `gen_ai.*` no span.',
        code: `from langchain_core.callbacks import get_usage_metadata_callback

from balcao.config import obter_config
from balcao.didactico import custo_mzn
from balcao.modelos import criar_modelo, escalao_de, nome_modelo

cfg = obter_config()
responder = criar_modelo(cfg, "responder")
classificar = criar_modelo(cfg, "classificar")
escalao = {nome_modelo(cfg, p): escalao_de(p, cfg.modelo_fornecedor) for p in ("classificar", "responder")}

with get_usage_metadata_callback() as cb:
    intencao = classificar.invoke(mensagens_classificacao)
    resposta = responder.invoke(mensagens_resposta)

for modelo, u in cb.usage_metadata.items():       # {nome do modelo: UsageMetadata somado}
    cache = u.get("input_token_details", {}).get("cache_read", 0)
    print(modelo, u["input_tokens"], cache, u["output_tokens"],
          custo_mzn(u["input_tokens"], u["output_tokens"], escalao.get(modelo, "medio"), cache))`,
      },
      {
        type: 'p',
        text:
          'A interface própria é fina de propósito. Não reinventa mensagens nem streaming — isso já vem do LangChain —, concentra a **política**: que versão é usada (recusa aliases móveis, RI-07), com que timeout e quantas retentativas, que escalão paga cada papel, e onde se regista o uso. Quando o fornecedor muda, muda um ficheiro e a configuração; quando o fornecedor cai, é aqui que o fallback se liga (módulo 6); quando os testes correm, é aqui que entra o simulado. O custo é mais uma camada e a obrigação de expor explicitamente o que é específico de um fornecedor, como os marcadores de cache.',
      },
      { type: 'adr', ref: 'adr-0003' },
      { type: 'file', ref: 'src/balcao/config.py' },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Em produção: o custo é uma métrica, não uma factura',
        text:
          'Cada span de chamada ao modelo leva `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` e os tokens de cache, e o serviço calcula o custo em MZN no momento, com a tabela de preços versionada no repositório. Com isso, o painel de RNF-02 mostra o custo por conversa por versão de prompt e de modelo no próprio dia, e o alarme de 1,20 MZN dispara antes de a factura chegar. A factura do fornecedor serve para reconciliar uma vez por mês: uma divergência acima de alguns pontos percentuais quer dizer que há chamadas fora da interface.',
      },
      {
        type: 'refs',
        items: [
          { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          { label: 'Anthropic — preços', url: 'https://www.anthropic.com/pricing' },
          { label: 'OpenAI — preços da API', url: 'https://openai.com/api/pricing/' },
        ],
      },
    ],
  },
];
