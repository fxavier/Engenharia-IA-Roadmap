import type { Section } from '../types';

/* Secções 1 a 3 do módulo 3: anatomia do pedido, streaming, erros e retentativas. */

export const seccoesA: Section[] = [
  /* ================================================================= 1 */
  {
    id: 'anatomia',
    title: 'Anatomia de um pedido de mensagens',
    blocks: [
      {
        type: 'p',
        text:
          'Por baixo de qualquer SDK ou framework, falar com um modelo comercial é um `POST` HTTPS com um corpo JSON e uma resposta JSON. Não há sessão, não há estado do lado do fornecedor que dure entre pedidos (tirando a cache de prompt, que é uma optimização e não memória): cada pedido leva **tudo** o que o modelo vai ver. Para um engenheiro de backend, a melhor forma de pensar nisto é como uma chamada a um serviço externo lento, caro, com variância alta e com um corpo de pedido que cresce a cada turno da conversa.',
      },
      {
        type: 'code',
        lang: 'http',
        caption:
          'Um pedido à Messages API da Anthropic, sem SDK. Três campos são obrigatórios: `model`, `max_tokens` e `messages`. O sistema não é uma mensagem: é um campo de topo.',
        code: `POST https://api.anthropic.com/v1/messages
x-api-key: $ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
content-type: application/json

{
  "model": "<identificador com data, do escalão médio>",
  "max_tokens": 400,
  "system": "És o assistente de suporte ao cliente do Chega...",
  "messages": [
    {"role": "user", "content": "A pizza do PD-8841990 chegou com quase uma hora de atraso."},
    {"role": "assistant", "content": "Lamento o atraso. O pedido chegou 53 minutos depois..."},
    {"role": "user", "content": "O cupão."}
  ],
  "stop_sequences": ["</resposta>"],
  "metadata": {"user_id": "hash-opaco-do-cliente"}
}`,
      },
      {
        type: 'p',
        text:
          'Os papéis são três. **`system`** leva as instruções estáveis (papel, regras, formato); **`user`** leva o que vem de fora — a mensagem do cliente, o contexto recuperado, os resultados de ferramentas; **`assistant`** leva o que o modelo gerou em turnos anteriores, que o teu código reenvia. A Messages API funde mensagens consecutivas do mesmo papel num só turno, e se a última mensagem for `assistant` o modelo continua a partir desse texto (*prefill*). A Chat Completions da OpenAI aceita o sistema como uma mensagem com `role: "system"` (ou `developer`, nos modelos mais recentes); a Responses API usa `instructions` e `input`. O conceito é o mesmo; o sítio do campo muda.',
      },
      {
        type: 'run',
        run: {
          id: 'run-apis-de-modelos-01',
          title: 'O mesmo turno em quatro formatos de pedido',
          brief:
            'Monta o pedido RAG do «Balcão» e mostra-o nos formatos da Messages API, da Chat Completions, da Responses API e do `/api/chat` do servidor local. O modelo simulado devolve texto, motivo de paragem e uso — os três campos que o teu código tem de ler em qualquer fornecedor.',
          code: `import json
import balcao as b

pergunta = "Quanto tempo demora o reembolso no M-Pesa?"
msgs = b.montar_prompt_rag(pergunta, b.recuperar(pergunta, k=3, metodo="rerank", filtro={"vigente": True}))

# A mesma conversa em quatro formatos de pedido
sistema = [m["content"] for m in msgs if m["role"] == "system"][0]
resto = [m for m in msgs if m["role"] != "system"]
formatos = {
    "messages (Anthropic)": {"model": "...", "max_tokens": 400, "system": sistema, "messages": resto},
    "chat.completions":     {"model": "...", "max_completion_tokens": 400, "messages": msgs},
    "responses":            {"model": "...", "max_output_tokens": 400, "instructions": sistema, "input": resto},
    "/api/chat (local)":    {"model": "llama3.2:3b", "messages": msgs, "stream": False, "options": {"num_predict": 400}},
}
for nome, corpo in formatos.items():
    print(f"{nome:<21} campos={list(corpo)}  {len(json.dumps(corpo, ensure_ascii=False))} bytes")

r = b.ModeloSimulado().gerar(msgs)
print("resposta:", r.texto[:78] + "...")
print("paragem:", r.paragem, "| uso:", r.uso)`,
          expected: `messages (Anthropic)  campos=['model', 'max_tokens', 'system', 'messages']  1288 bytes
chat.completions      campos=['model', 'max_completion_tokens', 'messages']  1320 bytes
responses             campos=['model', 'max_output_tokens', 'instructions', 'input']  1298 bytes
/api/chat (local)     campos=['model', 'messages', 'stream', 'options']  1348 bytes
resposta: Depois de aprovado, o reembolso chega em prazos diferentes conforme o meio de ...
paragem: fim | uso: {'entrada': 330, 'saida': 85}`,
        },
      },
      {
        type: 'table',
        head: ['Campo', 'Messages API (Anthropic)', 'Chat Completions (OpenAI)', 'Responses (OpenAI)', '`/api/chat` (Ollama)'],
        rows: [
          ['Instruções', '`system` (topo)', 'mensagem `system`/`developer`', '`instructions`', 'mensagem `system`'],
          ['Tecto de saída', '`max_tokens` (obrigatório)', '`max_completion_tokens`', '`max_output_tokens`', '`options.num_predict`'],
          ['Porque parou', '`stop_reason`', '`choices[0].finish_reason`', '`status` + `incomplete_details.reason`', '`done_reason`'],
          ['Tokens de entrada', '`usage.input_tokens` (+ campos de cache)', '`usage.prompt_tokens`', '`usage.input_tokens`', '`prompt_eval_count`'],
          ['Tokens de saída', '`usage.output_tokens`', '`usage.completion_tokens`', '`usage.output_tokens`', '`eval_count`'],
          ['Streaming', 'SSE com eventos tipados', 'SSE com `data:` e `[DONE]`', 'SSE com eventos tipados', 'NDJSON (uma linha JSON por pedaço)'],
          ['Estado no servidor', 'nenhum', 'nenhum', '`store` e `previous_response_id` (opcional)', 'nenhum (modelo carregado `keep_alive`)'],
        ],
        caption:
          'Os campos que o «Balcão» lê em cada resposta, em quatro APIs (SDKs `anthropic` 1.8, `openai` 3.x e `ollama` 0.6). A Responses API guarda as respostas por omissão (`store`): com dados de clientes, desliga-o ou confirma a retenção com o jurídico (RNF-04).',
      },
      {
        type: 'p',
        text:
          'O campo que mais bugs evita é o **motivo de paragem**. Uma resposta com `stop_reason: "end_turn"` terminou porque o modelo gerou o fim de turno; `max_tokens` quer dizer que foi cortada a meio de uma frase (ou de um JSON); `tool_use` quer dizer que não há texto para o cliente, há um pedido de ferramenta para o teu código executar; `stop_sequence` diz que apareceu uma das tuas sequências de paragem; `refusal` diz que os classificadores de segurança do fornecedor pararam a geração; `pause_turn` aparece com ferramentas do lado do servidor e pede que reenvies para continuar; `model_context_window_exceeded` diz que a janela acabou antes do `max_tokens`. Código que lê só `content[0].text` trata as sete da mesma maneira, e mostra ao cliente meia resposta como se fosse inteira.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Tratar o motivo de paragem explicitamente. O `match` falha de forma visível num valor novo em vez de o engolir: os fornecedores acrescentam motivos (os dois últimos da lista não existiam em 2024).',
        code: `from anthropic import Anthropic

cliente = Anthropic(timeout=30.0, max_retries=2)   # ANTHROPIC_API_KEY do ambiente
r = cliente.messages.create(model=MODELO_MEDIO, max_tokens=400, system=SISTEMA, messages=mensagens)

match r.stop_reason:
    case "end_turn" | "stop_sequence":
        texto = "".join(b.text for b in r.content if b.type == "text")
    case "tool_use":
        return executar_ferramentas([b for b in r.content if b.type == "tool_use"])   # módulo 5
    case "max_tokens" | "model_context_window_exceeded":
        metricas.respostas_cortadas.add(1, {"modelo": r.model})
        texto = RECUSA                                  # meia resposta sobre dinheiro é pior do que nenhuma
    case "refusal":
        texto = TRANSFERIR_PARA_HUMANO
    case outro:
        raise ValueError(f"stop_reason desconhecido: {outro}")

registar_uso(r.usage.input_tokens, r.usage.output_tokens,
             r.usage.cache_read_input_tokens or 0, r.usage.cache_creation_input_tokens or 0)`,
      },
      {
        type: 'prompt',
        prompt: {
          id: 'pr-apis-de-modelos-01',
          title: 'O que vai no terceiro pedido da conversa da Aida',
          brief:
            'A API não guarda a conversa. No terceiro turno, o código do «Balcão» reenvia o sistema, os turnos anteriores e a mensagem nova — e paga-os outra vez. Os tokens são os do orçamento de capacidade (`CAPACIDADE`).',
          messages: [
            { role: 'sistema', tokens: 2000, text: 'És o assistente de suporte ao cliente do Chega... (prompts/sistema.md v1.4.0) + 12 esquemas de ferramentas', note: 'Igual em todos os pedidos de todas as conversas: é o prefixo que a cache de prompt aproveita (secção 5). Na Messages API vai em `system` e `tools`, fora de `messages`.' },
            { role: 'utilizador', tokens: 25, untrusted: true, text: 'A pizza do PD-8841990 chegou com quase uma hora de atraso. Isto não pode ser.', note: 'Turno 1, reenviado pela terceira vez.' },
            { role: 'assistente', tokens: 70, text: 'Lamento o atraso. O pedido chegou 53 minutos depois do tempo prometido, por isso tem direito a um cupão de 200 MZN ou ao reembolso da taxa de entrega (60 MZN) [pol-atraso-compensacao]. Qual prefere?', note: 'Gerado pelo modelo no turno anterior; agora é entrada. Se o teu código o resumir ou cortar, o modelo deixa de o «ver» (módulo 18).' },
            { role: 'utilizador', tokens: 4, untrusted: true, text: 'O cupão.', note: 'Sozinha, esta mensagem não significa nada: é o histórico que lhe dá sentido. É por isso que o histórico volta sempre.' },
            { role: 'assistente', tokens: 60, text: 'Feito: o cupão de 200 MZN já está na sua conta e é válido durante 30 dias, em pedidos a partir de 400 MZN [pol-cupoes].', note: 'Resposta com `stop_reason: end_turn` (depois de uma volta de `tool_use` para `emitir_cupao`, omitida aqui).' },
          ],
          note:
            'Os papéis são convenção de treino, não canais separados: tudo é uma sequência de tokens (módulo 2). A consequência operacional é o custo: a entrada de cada turno inclui todos os anteriores, e o custo de uma conversa cresce mais depressa do que o número de turnos (secção 6).',
        },
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Parâmetros de amostragem: confirma por modelo',
        text:
          'O `messages.create` do SDK `anthropic` 1.8 já não aceita `temperature`, `top_p` nem `top_k`: os modelos recentes fixam a amostragem no fornecedor. A Chat Completions ainda aceita `temperature` e `seed`, mas os modelos de raciocínio recusam valores diferentes do omisso. O Ollama aceita tudo em `options`. O «Balcão» mantém `temperatura = 0.0` em `config.py` para os fornecedores que a aceitam, e mede a variância com evals em vez de a presumir (módulo 2).',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — Messages API (referência)', url: 'https://docs.anthropic.com/en/api/messages' },
          { label: 'Anthropic — tratar os motivos de paragem', url: 'https://docs.anthropic.com/en/api/handling-stop-reasons' },
          { label: 'OpenAI — referência da Responses API', url: 'https://platform.openai.com/docs/api-reference/responses' },
          { label: 'Ollama — API REST (`/api/chat`)', url: 'https://github.com/ollama/ollama/blob/main/docs/api.md' },
        ],
      },
    ],
  },

  /* ================================================================= 2 */
  {
    id: 'streaming',
    title: 'Streaming: eventos SSE e o primeiro token',
    blocks: [
      {
        type: 'p',
        text:
          'Sem streaming, o cliente do «Chega» espera os ≈ 3,7 s da geração inteira antes de ver uma palavra, e RNF-01 (primeira palavra com p95 abaixo de 1,5 s) é impossível. Com `stream: true`, o fornecedor responde `200 OK` com `content-type: text/event-stream` e vai escrevendo **Server-Sent Events** à medida que gera: linhas `event:` e `data:` separadas por uma linha em branco, sobre a mesma ligação HTTP. É o mesmo formato que o «Balcão» usa depois para falar com a aplicação (adr-0021, módulo 25).',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-apis-de-modelos-01',
          title: 'Os eventos de um stream da Messages API',
          intro:
            'Um turno de política no modelo médio, com 60% do prompt em cache. Os tempos são os do orçamento de latência; os eventos são os que a API documenta, pela ordem em que chegam.',
          lanes: [
            { id: 'app', label: 'App do Chega', sub: 'cliente SSE', kind: 'client' },
            { id: 'servico', label: 'Serviço «Balcão»', sub: 'FastAPI + SDK', kind: 'service' },
            { id: 'api', label: 'Messages API', sub: 'escalão médio', kind: 'model' },
          ],
          steps: [
            { from: 'servico', to: 'api', label: 'POST /v1/messages com stream: true', kind: 'req', tokens: 5200, detail: 'O pedido é igual ao síncrono mais `"stream": true`. A ligação fica aberta até `message_stop` ou até um timeout.' },
            { from: 'api', to: 'servico', label: 'message_start', kind: 'res', detail: 'Chega logo: traz o `id`, o modelo e o `usage` de entrada (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`). `output_tokens` ainda é 1.' },
            { from: 'api', to: 'api', label: 'prefill do prompt não cacheado', kind: 'self', ms: 700, detail: 'Aqui passa a maior parte do TTFT (módulo 2). Podem chegar eventos `ping` para manter a ligação viva.' },
            { from: 'api', to: 'servico', label: 'content_block_start (text)', kind: 'res', detail: 'Abre o bloco 0. Com ferramentas, um bloco pode ser `tool_use`; com raciocínio explícito, `thinking`.' },
            { from: 'api', to: 'servico', label: 'content_block_delta · text_delta', kind: 'res', ms: 3000, tokens: 180, detail: 'Um evento por pedaço de texto (alguns tokens). Para `tool_use` o delta é `input_json_delta`, com JSON parcial que só se interpreta no fim do bloco.' },
            { from: 'servico', to: 'app', label: 'reencaminha o texto por SSE', kind: 'async', detail: 'O cliente vê a primeira palavra ≈ 1,37 s depois de enviar a mensagem (TTFT do turno inteiro). As guardas de saída validam citações por frase (módulo 24).' },
            { from: 'api', to: 'servico', label: 'content_block_stop · message_delta', kind: 'res', detail: '`message_delta` traz `stop_reason` e o `usage.output_tokens` **acumulado** — não é um incremento para somar.' },
            { from: 'api', to: 'servico', label: 'message_stop', kind: 'res', detail: 'Fim do stream. Só aqui sabes o custo do pedido e porque parou.' },
            { from: 'api', to: 'servico', label: 'event: error (overloaded_error)', kind: 'err', detail: 'Pode chegar a meio, depois do `200 OK`: o estado HTTP já não o diz. O SDK levanta a excepção na iteração; o texto já enviado ao cliente fica a meio.' },
          ],
          outro:
            'Três consequências. O TTFT mede-se no primeiro `text_delta`, não no `200 OK` nem no `message_start`. O custo só é conhecido no fim. E um erro a meio do stream não se retenta de forma transparente: o cliente já viu metade da resposta.',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-apis-de-modelos-02',
          title: 'Ler um stream SSE à mão',
          brief:
            'Um stream da Messages API abreviado, com o instante de chegada de cada evento. O código acumula o texto, mede o TTFT no primeiro `text_delta` e lê o motivo de paragem e o uso no fim — é o que o SDK faz por ti, e o que tens de saber quando o SDK esconde um bug.',
          code: `import json

# Um stream SSE da Messages API, abreviado (ms = chegada simulada de cada evento)
BRUTO = """\\
0|event: message_start
0|data: {"type":"message_start","message":{"id":"msg_01","role":"assistant","content":[],"stop_reason":null,"usage":{"input_tokens":2080,"cache_read_input_tokens":3120,"output_tokens":1}}}
690|event: content_block_start
690|data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
700|event: content_block_delta
700|data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Depois de aprovado, "}}
760|event: ping
760|data: {"type":"ping"}
820|event: content_block_delta
820|data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"o reembolso para M-Pesa chega "}}
910|event: content_block_delta
910|data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"em até 24 horas [pol-reembolso-prazos]."}}
930|event: content_block_stop
930|data: {"type":"content_block_stop","index":0}
940|event: message_delta
940|data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":22}}
945|event: message_stop
945|data: {"type":"message_stop"}"""

texto, ttft, uso, paragem = [], None, {}, None
for linha in BRUTO.splitlines():
    ms, conteudo = linha.split("|", 1)
    if not conteudo.startswith("data: "):
        continue                       # a linha event: repete o type do JSON
    ev = json.loads(conteudo[6:])
    tipo = ev["type"]
    if tipo == "message_start":
        uso.update(ev["message"]["usage"])
    elif tipo == "content_block_delta" and ev["delta"]["type"] == "text_delta":
        ttft = ttft if ttft is not None else int(ms)
        texto.append(ev["delta"]["text"])
    elif tipo == "message_delta":
        paragem = ev["delta"]["stop_reason"]
        uso["output_tokens"] = ev["usage"]["output_tokens"]   # acumulado, não incremento
    elif tipo == "error":
        raise RuntimeError(ev["error"]["type"])
print("TTFT:", ttft, "ms | fim:", ms, "ms | pedaços:", len(texto))
print("texto:", "".join(texto))
print("stop_reason:", paragem)
print("usage:", uso)`,
          expected: `TTFT: 700 ms | fim: 945 ms | pedaços: 3
texto: Depois de aprovado, o reembolso para M-Pesa chega em até 24 horas [pol-reembolso-prazos].
stop_reason: end_turn
usage: {'input_tokens': 2080, 'cache_read_input_tokens': 3120, 'output_tokens': 22}`,
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'O mesmo em três SDKs. `messages.stream` da Anthropic dá `text_stream` e a mensagem final agregada; na Chat Completions o uso só chega no último pedaço se o pedires com `stream_options`; o Ollama devolve NDJSON e o objecto final (`done: true`) traz as contagens e as durações em nanossegundos.',
        code: `# Anthropic: helper de alto nível
with cliente_anthropic.messages.stream(model=MODELO_MEDIO, max_tokens=400,
                                       system=SISTEMA, messages=mensagens) as s:
    for pedaco in s.text_stream:
        enviar_sse(pedaco)
    final = s.get_final_message()           # stop_reason e usage completos
print(final.stop_reason, final.usage.output_tokens)

# OpenAI Chat Completions: SSE com "data: {...}" e "data: [DONE]"
stream = cliente_openai.chat.completions.create(
    model=MODELO_MEDIO_OPENAI, messages=mensagens, max_completion_tokens=400,
    stream=True, stream_options={"include_usage": True},   # sem isto, não há usage no stream
)
for pedaco in stream:
    if pedaco.choices and pedaco.choices[0].delta.content:
        enviar_sse(pedaco.choices[0].delta.content)
    if pedaco.usage:                         # só no último pedaço, com choices vazio
        print(pedaco.usage.prompt_tokens, pedaco.usage.completion_tokens)

# Ollama: NDJSON, uma linha por pedaço
import ollama
for pedaco in ollama.chat(model="llama3.2:3b", messages=mensagens, stream=True,
                          options={"num_ctx": 8192, "num_predict": 400}):
    enviar_sse(pedaco.message.content)
    if pedaco.done:
        print(pedaco.done_reason, pedaco.prompt_eval_count, pedaco.eval_count,
              pedaco.eval_count / (pedaco.eval_duration / 1e9), "tokens/s")`,
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Com LangChain, `astream` devolve `AIMessageChunk` normalizados. Somar pedaços com `+` junta texto, chamadas de ferramenta parciais e `usage_metadata`; o motivo de paragem fica em `response_metadata`, com o nome que cada fornecedor usa.',
        code: `from langchain.chat_models import init_chat_model

modelo = init_chat_model("anthropic:" + MODELO_MEDIO, max_tokens=400, timeout=30, max_retries=2)

acumulado = None
async for pedaco in modelo.astream(mensagens):
    if pedaco.text:
        await enviar_sse(pedaco.text)
    acumulado = pedaco if acumulado is None else acumulado + pedaco

print(acumulado.usage_metadata)               # {'input_tokens': ..., 'output_tokens': ..., 'input_token_details': {'cache_read': ...}}
print(acumulado.response_metadata.get("stop_reason")   # Anthropic
      or acumulado.response_metadata.get("finish_reason")   # OpenAI
      or acumulado.response_metadata.get("done_reason"))    # Ollama`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O erro clássico: medir o TTFT no `200 OK`',
        text:
          'O cabeçalho da resposta chega em dezenas de milissegundos e o `message_start` logo a seguir: nenhum dos dois é a primeira palavra. Um painel que mede o TTFT aí mostra 80 ms enquanto os clientes esperam 1,4 s, e ninguém repara quando uma mudança no prompt parte a cache e o prefill duplica. Mede no primeiro delta de texto, no servidor e no cliente, e regista-o no traço do turno (`balcao.ttft`, RNF-01). O segundo erro da mesma família é retentar um stream que falhou a meio sem avisar a aplicação: o cliente recebe a resposta duas vezes, a primeira cortada.',
      },
      {
        type: 'p',
        text:
          'Streaming não é grátis. Mantém uma ligação aberta por turno durante segundos (para o «Balcão», ≈ 2,6 em média no teste de carga — é pouco, mas proxies e balanceadores com timeouts de inactividade curtos cortam streams longos), obriga as guardas de saída a trabalhar por frase em vez de sobre a resposta inteira, e complica o tratamento de erros. Para chamadas que ninguém está a ler — classificar a intenção, julgar uma resposta numa avaliação — usa o pedido síncrono: é mais simples e o custo é o mesmo.',
      },
      { type: 'adr', ref: 'adr-0021' },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — streaming de mensagens', url: 'https://docs.anthropic.com/en/docs/build-with-claude/streaming' },
          { label: 'OpenAI — streaming de respostas', url: 'https://platform.openai.com/docs/guides/streaming-responses' },
          { label: 'WHATWG — Server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
        ],
      },
    ],
  },

  /* ================================================================= 3 */
  {
    id: 'erros',
    title: 'Erros, retentativas com backoff e timeouts',
    blocks: [
      {
        type: 'p',
        text:
          'Um fornecedor de modelos falha de mais maneiras do que uma base de dados, e com mais frequência. Os erros dividem-se em dois grupos que pedem tratamento oposto. Os **permanentes** (400 pedido inválido, 401 chave errada, 403 sem permissão, 404 modelo inexistente, 413 pedido grande de mais) não melhoram com repetição: retentar só gasta tempo e quota. Os **transitórios** (408, 409, 429 rate limit, 500, 529 overloaded, ligação cortada, timeout) resolvem-se muitas vezes sozinhos em segundos, e é para eles que existe o *backoff*.',
      },
      {
        type: 'table',
        head: ['HTTP', 'Tipo (Anthropic)', 'Excepção no SDK', 'Retentar?', 'O que faz o «Balcão»'],
        rows: [
          ['400', '`invalid_request_error`', '`BadRequestError`', 'Não', 'Bug do nosso lado (histórico mal formado, chamada sem resultado): alarme e resposta de recurso'],
          ['401 / 403', '`authentication_error` / `permission_error`', '`AuthenticationError` / `PermissionDeniedError`', 'Não', 'Chave rodada ou revogada: falha a readiness, página à plataforma'],
          ['413', '`request_too_large`', '`RequestTooLargeError`', 'Não', 'Contexto a mais: é um bug do orçamento de tokens (adr-0027)'],
          ['429', '`rate_limit_error`', '`RateLimitError`', 'Sim, respeitando `retry-after`', 'Recuo; se persistir, fallback ou degradação (módulo 30)'],
          ['500', '`api_error`', '`InternalServerError`', 'Sim', 'Recuo com jitter'],
          ['529', '`overloaded_error`', '`OverloadedError`', 'Sim, com parcimónia', 'Sobrecarga do fornecedor, não quota tua: poucas tentativas, depois fallback'],
          ['—', 'ligação cortada, timeout', '`APIConnectionError` / `APITimeoutError`', 'Sim', 'Recuo; conta para o prazo total do turno'],
        ],
        caption:
          'Estados e excepções do SDK `anthropic` 1.8; a OpenAI usa os mesmos nomes de excepção (sem o 529). As retentativas automáticas dos dois SDKs cobrem 408, 409, 429, ≥ 500 e erros de ligação, e obedecem ao cabeçalho `x-should-retry` quando o servidor o envia.',
      },
      {
        type: 'p',
        text:
          'O *backoff* exponencial espaça as tentativas (0,5 s, 1 s, 2 s, …) para dar tempo ao fornecedor de recuperar; o *jitter* torna cada espera aleatória para que mil clientes que receberam 429 no mesmo segundo não voltem todos no mesmo segundo seguinte. Os SDKs Python da Anthropic e da OpenAI já fazem isto: `max_retries=2` por omissão, espera de `min(0,5 × 2ⁿ, 8)` segundos reduzida até 25% ao acaso, e, quando a resposta traz `retry-after` (ou `retry-after-ms`), esperam exactamente o que o servidor pede.',
      },
      {
        type: 'run',
        run: {
          id: 'run-apis-de-modelos-03',
          title: 'Recuos, jitter e o pior caso de uma chamada',
          brief:
            'A fórmula de recuo dos SDKs comparada com o *full jitter*, e o tempo máximo que uma chamada pode demorar com três configurações de timeout e retentativas. A semente torna a saída determinista.',
          code: `import random

rng = random.Random(7)

def atraso_sdk(n):
    """A fórmula dos SDKs Python da Anthropic e da OpenAI: 0,5·2ⁿ até 8 s, menos até 25%."""
    return min(0.5 * 2 ** n, 8.0) * (1 - 0.25 * rng.random())

def atraso_full_jitter(n, base=0.5, teto=8.0):
    """Full jitter (AWS): uniforme entre 0 e o exponencial."""
    return rng.uniform(0, min(teto, base * 2 ** n))

print("tentativa  sdk     full-jitter")
for n in range(5):
    print(f"{n:>9}  {atraso_sdk(n):5.2f} s  {atraso_full_jitter(n):5.2f} s")

# Pior caso de uma chamada: cada tentativa esgota o timeout, mais os recuos máximos
def pior_caso(timeout_s, max_retries):
    return (max_retries + 1) * timeout_s + sum(min(0.5 * 2 ** n, 8.0) for n in range(max_retries))

for nome, t, r in [("SDK por omissão", 600, 2), ("config.py do Balcão", 30, 2), ("com prazo do turno", 8, 1)]:
    print(f"{nome:<20} timeout={t:>3} s, retries={r}: até {pior_caso(t, r):7.1f} s")`,
          expected: `tentativa  sdk     full-jitter
        0   0.46 s   0.08 s
        1   0.84 s   0.07 s
        2   1.73 s   0.73 s
        3   3.94 s   2.03 s
        4   7.93 s   3.47 s
SDK por omissão      timeout=600 s, retries=2: até  1801.5 s
config.py do Balcão  timeout= 30 s, retries=2: até    91.5 s
com prazo do turno   timeout=  8 s, retries=1: até    16.5 s`,
        },
      },
      {
        type: 'p',
        text:
          'A última parte da saída é a que importa em produção. O timeout por omissão dos dois SDKs é de **10 minutos** por tentativa (com 5 s para estabelecer a ligação), pensado para gerações longas em lote. Num serviço interactivo isso significa que um fornecedor lento prende um worker e uma ligação SSE durante meia hora no pior caso. E há uma subtileza de HTTP: o timeout do `httpx` que os SDKs usam é de inactividade por operação de leitura, não um prazo total — um stream que pinga um token a cada 20 s nunca dispara um timeout de 30 s. O prazo do turno tem de ser imposto por cima, no teu código.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Três camadas de tempo: timeout por tentativa no SDK, retentativas no SDK (só uma camada de retentativas no sistema inteiro), e um prazo total do turno com `asyncio.timeout` (Python 3.11+) que cancela o que estiver a correr.',
        code: `import asyncio

import anthropic
from anthropic import AsyncAnthropic

cliente = AsyncAnthropic(
    timeout=anthropic.Timeout(30.0, connect=3.0),   # por tentativa; inactividade na leitura
    max_retries=2,                                   # 408, 409, 429, >=500, ligação; respeita retry-after
)

async def responder(mensagens: list[dict]) -> str:
    try:
        async with asyncio.timeout(12.0):            # prazo do turno inteiro, retentativas incluídas
            async with cliente.messages.stream(model=MODELO_MEDIO, max_tokens=400,
                                               system=SISTEMA, messages=mensagens) as s:
                partes = [p async for p in s.text_stream]
            return "".join(partes)
    except TimeoutError:
        metricas.prazo_esgotado.add(1)
        return RESPOSTA_DE_RECURSO                   # ou o modelo alternativo (módulo 6)
    except anthropic.RateLimitError as e:            # retentativas esgotadas
        log.warning("429 persistente", extra={"retry_after": e.response.headers.get("retry-after"),
                                              "request_id": e.response.headers.get("request-id")})
        raise
    except anthropic.BadRequestError:
        log.exception("pedido inválido: bug no histórico ou no esquema")   # não se retenta
        raise`,
      },
      {
        type: 'decision',
        tree: {
          id: 'dt-apis-de-modelos-01',
          title: 'Esta falha deve ser retentada, e por quem?',
          intro: 'A regra: uma só camada retenta, com prazo total. As outras propagam o erro ou degradam.',
          start: 'tipo',
          nodes: [
            { id: 'tipo', question: 'O erro é permanente (4xx que não 408, 409 ou 429)?', options: [
              { label: 'Sim: 400, 401, 403, 404, 413', next: 'fim-nao' },
              { label: 'Não: 429, 5xx, 529, rede, timeout', next: 'onde' },
            ] },
            { id: 'onde', question: 'O stream já enviou texto ao cliente?', options: [
              { label: 'Não: a falha foi antes do primeiro delta', next: 'prazo' },
              { label: 'Sim: falhou a meio', next: 'fim-meio' },
            ] },
            { id: 'prazo', question: 'Ainda há prazo no turno para mais uma tentativa com a espera pedida?', options: [
              { label: 'Sim', next: 'fim-sdk' },
              { label: 'Não', next: 'fim-degradar' },
            ] },
            { id: 'fim-nao', answer: 'Não retentar.', detail: 'Registar com o `request-id` do cabeçalho, alarme se for 400 (é um bug nosso) e resposta de recurso ao cliente.' },
            { id: 'fim-sdk', answer: 'Deixar o SDK retentar.', detail: '`max_retries=2` já faz recuo com jitter e respeita `retry-after`. Não embrulhar em `with_retry` nem em tenacity: 3 × 3 tentativas são 9 pedidos e um prazo impossível de prever.' },
            { id: 'fim-meio', answer: 'Não retentar em silêncio.', detail: 'Enviar à aplicação um evento de erro para descartar o texto parcial, e só então tentar de novo ou degradar. O LangGraph permite retomar do último checkpoint (módulo 17).' },
            { id: 'fim-degradar', answer: 'Fallback ou degradação.', detail: 'Modelo alternativo de outro fornecedor (módulo 6) ou resposta de recurso com oferta de colega humano (módulo 30).' },
          ],
        },
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Em produção: o `request-id` vai para o traço',
        text:
          'Cada resposta da Anthropic traz um cabeçalho `request-id` (a OpenAI usa `x-request-id`), também em `e.response.headers` nos erros e em `r._request_id` nas respostas do SDK. Guarda-o no span da chamada ao modelo: é a única coisa que o suporte do fornecedor precisa para investigar um 500 ou uma resposta estranha. Regista também, por fornecedor e modelo, a taxa de 429 e de 529 e o número de tentativas por chamada — uma subida de tentativas sem subida de erros finais é o primeiro sinal de que a quota está a ficar curta.',
      },
      {
        type: 'p',
        text:
          'Retentar uma chamada ao modelo é seguro porque gerar texto não tem efeitos: o pior que acontece é pagar tokens duas vezes. Retentar a **ferramenta** que o modelo pediu não é: `emitir_reembolso` com retentativas automáticas precisa de uma chave de idempotência, e isso é assunto do módulo 5. Mantém as duas políticas separadas no código.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — erros da API', url: 'https://docs.anthropic.com/en/api/errors' },
          { label: 'SDK Python da Anthropic (retentativas e timeouts)', url: 'https://github.com/anthropics/anthropic-sdk-python' },
          { label: 'RFC 9110 — Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc9110#field.retry-after' },
          { label: 'Google SRE — cascading failures', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
        ],
      },
    ],
  },
];
