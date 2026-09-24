import type { Module } from '../types';
import { seccoesA } from './m03-apis-de-modelos.parte-a';
import { seccoesB } from './m03-apis-de-modelos.parte-b';

const EVENTOS_LAB = `EVENTOS = [
    (0, {"type": "message_start", "message": {"usage": {"input_tokens": 1850, "cache_read_input_tokens": 2000, "output_tokens": 1}}}),
    (640, {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}),
    (650, {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Vou confirmar o pedido."}}),
    (700, {"type": "content_block_stop", "index": 0}),
    (700, {"type": "content_block_start", "index": 1, "content_block": {"type": "tool_use", "id": "toolu_01", "name": "ler_pedido", "input": {}}}),
    (720, {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": '{"pedido_id": "PD-88'}}),
    (740, {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": '41990"}'}}),
    (745, {"type": "content_block_stop", "index": 1}),
    (750, {"type": "message_delta", "delta": {"stop_reason": "tool_use"}, "usage": {"output_tokens": 48}}),
    (751, {"type": "message_stop"}),
]`;

export const m03: Module = {
  id: 'apis-de-modelos',
  number: 3,
  part: 'fundamentos',
  title: 'APIs de modelos na prática',
  subtitle:
    'O pedido HTTP por baixo de tudo: mensagens, motivo de paragem, uso, streaming, erros, retentativas, cache, lote e custo — e a camada fina que mantém o fornecedor fora do teu domínio',
  icon: '🔌',
  minutes: 90,
  tags: ['Messages API', 'streaming', 'retentativas', 'prompt caching', 'custo', 'init_chat_model'],
  goals: [
    'Ler e escrever um pedido de mensagens nas APIs da Anthropic, da OpenAI (Chat Completions e Responses) e do Ollama, e tratar cada `stop_reason` explicitamente em vez de ler só o texto.',
    'Consumir um stream SSE evento a evento, medir o TTFT no primeiro delta de texto e ler o uso e o motivo de paragem que só chegam no fim.',
    'Classificar erros em permanentes e transitórios, configurar timeout, retentativas com backoff e jitter e um prazo total por turno, com uma só camada de retentativas no sistema.',
    'Usar os SDKs oficiais e `init_chat_model` sabendo o que cada um uniformiza e o que não, e aplicar cache de prompt e processamento em lote onde reduzem custo sem mudar a resposta.',
    'Calcular o custo de cada chamada a partir do `usage` e justificar a interface própria sobre o fornecedor (adr-0003) com o que ela concentra: versão, timeouts, retentativas, escalão e métricas.',
  ],

  sections: [...seccoesA, ...seccoesB],

  /* ================================================================== quiz */
  quiz: [
    {
      id: 'q-apis-de-modelos-01',
      topic: 'stop-reason',
      prompt:
        'Uma resposta sobre um reembolso chega com `stop_reason: "max_tokens"`. O código actual mostra `content[0].text` ao cliente. O que está errado?',
      options: [
        'Nada: `max_tokens` quer dizer que o modelo usou a resposta toda que tinha.',
        'A resposta foi cortada a meio; mostrá-la como completa pode omitir a condição ou o valor que vinha no fim. Deve ser tratada como falha (resposta de recurso, métrica de cortes, rever o tecto).',
        'É um erro HTTP que o SDK devia ter levantado.',
        'O modelo recusou responder por segurança.',
      ],
      answer: [1],
      explain:
        '`max_tokens` é um corte, não um fim natural. Numa resposta sobre dinheiro, meia frase é pior do que nenhuma. O tecto de 400 tokens do «Balcão» é de segurança: um corte frequente quer dizer que o prompt está a pedir respostas longas de mais, e isso mede-se.',
    },
    {
      id: 'q-apis-de-modelos-02',
      topic: 'erros',
      prompt: 'Quais destas respostas do fornecedor devem ser retentadas automaticamente? (escolhe duas)',
      options: [
        '400 `invalid_request_error` — o histórico tem uma chamada de ferramenta sem resultado.',
        '429 `rate_limit_error` com `retry-after: 3`.',
        '529 `overloaded_error`.',
        '401 `authentication_error`.',
      ],
      answer: [1, 2],
      explain:
        '429 e 529 são transitórios: a quota repõe-se e a sobrecarga passa. 400 e 401 são permanentes — o mesmo pedido falha outra vez. Retentá-los gasta prazo e quota e esconde um bug (o histórico mal formado) ou um incidente (a chave revogada).',
      why: [
        'Um pedido mal formado falha sempre da mesma maneira: é um bug a corrigir, não uma falha a esperar.',
        'Transitório, e o servidor diz quanto esperar: os SDKs respeitam o cabeçalho.',
        'Sobrecarga do lado do fornecedor: poucas tentativas espaçadas, depois fallback.',
        'A chave não fica válida por esperar. Alarme e readiness em falha.',
      ],
    },
    {
      id: 'q-apis-de-modelos-03',
      topic: 'streaming',
      prompt: 'Onde se mede o TTFT de uma chamada em streaming à Messages API?',
      options: [
        'No `200 OK` com `content-type: text/event-stream`.',
        'No evento `message_start`.',
        'No primeiro `content_block_delta` com texto.',
        'No `message_stop`.',
      ],
      answer: [2],
      explain:
        'O cabeçalho e o `message_start` chegam antes do prefill terminar; nenhum tem texto para o cliente. O primeiro `text_delta` é a primeira palavra. Medir antes disso faz o painel mostrar dezenas de milissegundos enquanto o cliente espera mais de um segundo.',
    },
    {
      id: 'q-apis-de-modelos-04',
      topic: 'timeouts',
      prompt:
        'O serviço usa `Anthropic()` sem argumentos. Num dia em que o fornecedor está lento mas não falha, o que acontece aos workers?',
      options: [
        'Nada: o SDK corta cada pedido aos 30 segundos.',
        'Cada tentativa pode esperar até 10 minutos (o timeout por omissão), com até duas retentativas: workers e ligações SSE ficam presos muito para lá do orçamento do turno.',
        'O SDK passa automaticamente para um modelo mais pequeno.',
        'O SDK devolve `stop_reason: "timeout"`.',
      ],
      answer: [1],
      explain:
        'Os SDKs têm timeout de 600 s por omissão, pensado para gerações longas. Num serviço interactivo define-se um timeout por tentativa e, por cima, um prazo total do turno (`asyncio.timeout`), porque o timeout do cliente HTTP é de inactividade e não de duração total.',
    },
    {
      id: 'q-apis-de-modelos-05',
      topic: 'usage',
      prompt:
        'Uma resposta da Messages API traz `input_tokens: 2080`, `cache_read_input_tokens: 3120`, `cache_creation_input_tokens: 0`. Quantos tokens de entrada teve o pedido?',
      options: ['2 080', '3 120', '5 200', '1 040'],
      answer: [2],
      explain:
        'Na API da Anthropic, `input_tokens` é só a parte fora da cache; o total é a soma dos três campos. O LangChain normaliza ao contrário (`usage_metadata.input_tokens` é o total), e é por isso que o código de custo tem de saber de onde vem o número.',
    },
    {
      id: 'q-apis-de-modelos-06',
      topic: 'batch',
      prompt: 'Que cargas do «Balcão» são boas candidatas à API de lote (metade do preço, resultados em até 24 h)? (escolhe duas)',
      options: [
        'A avaliação nocturna do conjunto dourado com o juiz.',
        'A resposta ao cliente no WhatsApp.',
        'A reclassificação das conversas do último mês depois de mudar a taxonomia de intenções.',
        'O gate de evals do CI, que tem de responder em 20 minutos.',
      ],
      answer: [0, 2],
      explain:
        'O lote serve o que ninguém está a ler e tolera horas. A resposta ao cliente precisa de TTFT abaixo de 1,5 s; o gate de CI precisa de resultado no mesmo pedido de merge, e o lote não garante nada abaixo das 24 h.',
    },
    {
      id: 'q-apis-de-modelos-07',
      topic: 'retentativas',
      prompt:
        'O cliente do SDK tem `max_retries=2` e alguém embrulha a chamada em `with_retry(stop_after_attempt=3)`. No pior caso, quantos pedidos chegam ao fornecedor por turno?',
      options: ['3', '5', '6', '9'],
      answer: [3],
      explain:
        'Cada uma das 3 tentativas externas faz até 3 pedidos (1 + 2 retentativas do SDK): 9 pedidos, com esperas somadas que ninguém previu. Em hora de ponta, é exactamente o que transforma um 429 numa tempestade de 429. Uma só camada retenta; as outras propagam.',
    },
    {
      id: 'q-apis-de-modelos-08',
      topic: 'custo',
      prompt: 'Porque é que o custo de uma conversa de 12 turnos é mais do que 12 vezes o de um turno?',
      options: [
        'Porque o fornecedor cobra mais a partir do décimo turno.',
        'Porque a API é sem estado e cada turno reenvia o histórico dos anteriores: a entrada de cada pedido cresce com a conversa.',
        'Porque a cache de prompt expira ao fim de 3 turnos.',
        'Porque a saída fica mais longa a cada turno.',
      ],
      answer: [1],
      explain:
        'A entrada do turno n inclui os n − 1 turnos anteriores. A cache de prompt amortece (o histórico anterior é prefixo), mas o crescimento continua. É a razão da janela com resumo do módulo 18 e do orçamento de tokens por conversa (adr-0027).',
    },
    {
      id: 'q-apis-de-modelos-09',
      topic: 'interface',
      prompt: 'Qual é o principal ganho de o «Balcão» ter `modelos.py` como única porta para os fornecedores?',
      options: [
        'Torna as respostas iguais entre fornecedores.',
        'Concentra num sítio a política — versão fixada, timeouts, retentativas, escalão por papel, métricas de uso — e permite trocar o fornecedor, ou usar o simulado nos testes, sem tocar no grafo.',
        'Elimina a necessidade de avaliar um modelo novo antes de o usar.',
        'Evita pagar a cache de prompt.',
      ],
      answer: [1],
      explain:
        'A interface esconde a diferença de API, não a de comportamento. Trocar de fornecedor continua a exigir evals; o que deixa de exigir é mexer em 14 ficheiros. E é o que permite ao CI correr sem rede nem chave (RE-03).',
    },
  ],

  /* ============================================================= exercícios */
  exercises: [
    {
      id: 'e-apis-de-modelos-01',
      title: 'Um turno no escalão grande, com cache',
      statement:
        'Com os preços do `balcao` (grande: 3,00 USD por milhão de entrada, 0,30 de leitura de cache, 15,00 de saída; câmbio 63,9), quanto custa em MZN um turno de 5 200 tokens de entrada, dos quais 3 120 lidos da cache, e 180 de saída? Arredonda a duas casas decimais.',
      kind: 'input',
      accept: ['0,63', '0.63', '0,63 mzn', '0.63 mzn'],
      hint: '(5 200 − 3 120) × 3,00 + 3 120 × 0,30 + 180 × 15,00, a dividir por um milhão, vezes o câmbio.',
      solution:
        '(2 080 × 3,00 + 3 120 × 0,30 + 180 × 15,00) / 10⁶ = 0,009876 USD × 63,9 ≈ 0,6311 MZN (`b.custo_mzn(5200, 180, "grande", 3120)`). O triplo do médio com a mesma cache (0,2104): é por isso que o grande só atende os ≈ 4% de conversas difíceis.',
      difficulty: 1,
    },
    {
      id: 'e-apis-de-modelos-02',
      title: 'Pior caso de uma chamada',
      statement:
        'Um colega configura o cliente com `timeout=20` e `max_retries=3`, com a fórmula de recuo dos SDKs (0,5 × 2ⁿ segundos, máximo 8, sem contar o jitter). No pior caso, quantos segundos pode demorar uma chamada que nunca responde?',
      kind: 'input',
      accept: ['83,5', '83.5', '83,5 s', '83.5 s'],
      hint: 'Quatro tentativas que esgotam o timeout, mais três recuos.',
      solution:
        '4 × 20 = 80 s de tentativas, mais 0,5 + 1 + 2 = 3,5 s de recuos: 83,5 s. Com um orçamento de turno de ≈ 5 s (RNF-01), a configuração só faz sentido com um prazo total por cima (`asyncio.timeout`) que corte muito antes.',
      difficulty: 1,
    },
    {
      id: 'e-apis-de-modelos-03',
      title: 'Falha a meio do stream',
      statement:
        'O modelo já enviou ao cliente «Lamento o atraso. O pedido chegou 53 minutos depois do tempo prometido, por isso tem direito a» quando chega um `event: error` com `overloaded_error`. Descreve o que o serviço e a aplicação devem fazer, e o que não devem.',
      kind: 'open',
      hint: 'Pensa no que o cliente já viu, no que o SSE entre o serviço e a app pode transportar, e no checkpoint do grafo.',
      solution:
        'Não retentar em silêncio (o cliente veria o início duas vezes) nem deixar a frase pendurada. O serviço envia à app um evento próprio (por exemplo `event: erro` com um código) que manda descartar o texto parcial e mostrar «Um momento…»; depois tenta de novo a partir do último checkpoint do grafo (o pedido e o cálculo já estão feitos, não se repetem ferramentas), com o prazo que resta, e em último caso degrada para a oferta de colega humano. Regista o `request-id`, a taxa de erros a meio do stream por fornecedor e se a segunda tentativa resultou. Nunca deixar a frase incompleta como resposta final, sobretudo com um valor em MZN por dizer.',
      difficulty: 2,
    },
    {
      id: 'e-apis-de-modelos-04',
      title: 'Fallback dentro da interface própria',
      statement:
        'Desenha como `modelos.py` passaria a suportar um modelo alternativo de outro fornecedor para o papel `responder`: que erros o accionam, onde vivem as retentativas, como se regista o custo, e o que muda nos prompts e nas evals.',
      kind: 'design',
      hint: 'Fallback é para disponibilidade, não para qualidade; e o outro fornecedor tem outra tabela de preços e outro tokenizador.',
      solution:
        'Accionam o fallback só erros transitórios esgotados (429 persistente, 529, 5xx, timeout do prazo por tentativa) e nunca 400/401. As retentativas continuam só no SDK de cada modelo (`max_retries` pequeno no primário para o fallback entrar dentro do prazo); o fallback é `primario.with_fallbacks([alternativo], exceptions_to_handle=...)` construído dentro de `criar_modelo`, para o resto do código não saber. O custo regista-se por chamada com o nome do modelo que efectivamente respondeu (vem no `response_metadata`), com a tabela de preços do fornecedor alternativo. O prompt de sistema é o mesmo ficheiro versionado, mas as evals correm contra os dois modelos todos os meses (RI-07) e o fallback só é ligado se o alternativo passar o gate por intenção. Métrica: fracção de turnos servidos pelo alternativo, com alarme.',
      difficulty: 3,
    },
    {
      id: 'e-apis-de-modelos-05',
      title: 'Custo a partir da Chat Completions',
      statement:
        'Escreve `custo_openai(usage, precos)` que recebe o `usage` de uma resposta da Chat Completions (como dict: `prompt_tokens`, `completion_tokens`, `prompt_tokens_details.cached_tokens`) e a tabela de preços de um escalão do `balcao`, e devolve o custo em MZN. Testa com 5 200 de entrada, 3 120 em cache e 180 de saída no escalão médio.',
      kind: 'code',
      hint: 'Na OpenAI, `prompt_tokens` já é o total da entrada (inclui a parte em cache), ao contrário do `input_tokens` da Anthropic.',
      solution:
        'import balcao as b\n\ndef custo_openai(usage: dict, precos: dict) -> float:\n    entrada = usage["prompt_tokens"]\n    cache = (usage.get("prompt_tokens_details") or {}).get("cached_tokens", 0)\n    saida = usage["completion_tokens"]\n    usd = ((entrada - cache) * precos["entrada"] + cache * precos["cache_leitura"] + saida * precos["saida"]) / 1e6\n    return round(usd * b.CAMBIO_USD_MZN, 4)\n\nprint(custo_openai({"prompt_tokens": 5200, "completion_tokens": 180, "prompt_tokens_details": {"cached_tokens": 3120}}, b.MODELOS["medio"]))\n# 0.2104 — igual a b.custo_mzn(5200, 180, "medio", 3120). O erro típico é subtrair a cache duas vezes, tratando prompt_tokens como se fosse o input_tokens da Anthropic.',
      difficulty: 2,
    },
  ],

  /* ================================================================= labs */
  labs: [
    {
      id: 'lab-apis-de-modelos-01',
      moduleId: 'apis-de-modelos',
      title: 'Retentativas com recuo, jitter e prazo total',
      brief:
        'Implementa `chamar_com_retentativas(fn, ...)`: retenta só os estados transitórios (408, 409, 429, 5xx, 529), espera o `retry_after` do servidor quando existe e, senão, um recuo exponencial com *full jitter*, e nunca deixa a soma das esperas passar `prazo_s` — nesse caso levanta `TimeoutError`. Erros permanentes propagam-se logo. A função `dormir` é injectada para o teste não esperar de verdade.',
      lang: 'python',
      starter: `import random
import time
from collections.abc import Callable


class ErroAPI(Exception):
    def __init__(self, estado: int, retry_after: float | None = None):
        super().__init__(f"HTTP {estado}")
        self.estado = estado
        self.retry_after = retry_after


def chamar_com_retentativas(fn: Callable[[], str], max_tentativas: int = 3, prazo_s: float = 12.0,
                            base: float = 0.5, teto: float = 8.0,
                            rng: random.Random | None = None,
                            dormir: Callable[[float], None] = time.sleep) -> str:
    for tentativa in range(max_tentativas):
        try:
            return fn()
        except Exception:
            dormir(1.0)
    return fn()`,
      checks: [
        { id: 'estados', label: 'Lista explícita de estados retentáveis', re: 'RETENTAVEIS\\s*=\\s*\\{[^}]*429[^}]*529', why: 'Só erros transitórios se retentam; 400 ou 401 falham outra vez da mesma maneira.' },
        { id: 'permanente', label: 'Propaga logo os erros permanentes', re: 'not in RETENTAVEIS', why: 'Retentar um 400 gasta prazo e quota e esconde o bug.' },
        { id: 'retry-after', label: 'Respeita o retry-after do servidor', re: 'e\\.retry_after', why: 'Quando o fornecedor diz quanto esperar, esperar menos garante outro 429.' },
        { id: 'exponencial', label: 'Recuo exponencial com tecto', re: 'min\\(\\s*teto\\s*,\\s*base\\s*\\*\\s*2\\s*\\*\\*\\s*tentativa', why: 'O intervalo dobra a cada tentativa, até ao tecto.' },
        { id: 'jitter', label: 'Full jitter', re: 'rng\\.uniform\\(\\s*0', why: 'Sem aleatoriedade, os clientes que falharam juntos voltam juntos.' },
        { id: 'prazo', label: 'Prazo total das esperas', re: 'raise TimeoutError', why: 'Um turno tem orçamento; esperar para lá dele é pior do que degradar.' },
        { id: 'sem-except-largo', label: 'Não apanha `Exception` à toa', re: 'except Exception\\s*:', forbid: true, why: 'Apanhar tudo retenta bugs de programação (KeyError, TypeError) como se fossem falhas de rede.' },
      ],
      hints: [
        'Define `RETENTAVEIS = {408, 409, 429, 500, 502, 503, 504, 529}` e apanha só `ErroAPI`.',
        'Na última tentativa, ou se `e.estado not in RETENTAVEIS`, faz `raise` sem esperar.',
        'Soma as esperas numa variável; se a próxima fizer passar `prazo_s`, `raise TimeoutError(...) from e`.',
      ],
      solution: `import random
import time
from collections.abc import Callable

RETENTAVEIS = {408, 409, 429, 500, 502, 503, 504, 529}


class ErroAPI(Exception):
    def __init__(self, estado: int, retry_after: float | None = None):
        super().__init__(f"HTTP {estado}")
        self.estado = estado
        self.retry_after = retry_after


def chamar_com_retentativas(fn: Callable[[], str], max_tentativas: int = 3, prazo_s: float = 12.0,
                            base: float = 0.5, teto: float = 8.0,
                            rng: random.Random | None = None,
                            dormir: Callable[[float], None] = time.sleep) -> str:
    """Retenta só erros transitórios, com recuo exponencial e full jitter, e nunca passa o prazo total."""
    rng = rng or random.Random()
    esperado = 0.0
    for tentativa in range(max_tentativas):
        try:
            return fn()
        except ErroAPI as e:
            if e.estado not in RETENTAVEIS or tentativa == max_tentativas - 1:
                raise
            if e.retry_after is not None:
                espera = e.retry_after                       # o servidor sabe melhor
            else:
                espera = rng.uniform(0, min(teto, base * 2 ** tentativa))
            if esperado + espera > prazo_s:
                raise TimeoutError(f"prazo de {prazo_s} s esgotado") from e
            esperado += espera
            dormir(espera)
    raise AssertionError("inalcançável")


def fornecedor(falhas: list[ErroAPI]) -> Callable[[], str]:
    """Simula um fornecedor que falha com os erros dados e depois responde."""
    def chamar() -> str:
        if falhas:
            raise falhas.pop(0)
        return "Depois de aprovado, o reembolso para M-Pesa chega em até 24 horas [pol-reembolso-prazos]."
    return chamar


esperas: list[float] = []
r = chamar_com_retentativas(fornecedor([ErroAPI(529), ErroAPI(429, retry_after=2.0)]),
                            rng=random.Random(7), dormir=esperas.append)
print("resposta:", r[:40], "| esperas:", [round(x, 2) for x in esperas])
for falhas in ([ErroAPI(400)], [ErroAPI(429, retry_after=30.0)], [ErroAPI(500)] * 3):
    try:
        chamar_com_retentativas(fornecedor(list(falhas)), rng=random.Random(7), dormir=lambda s: None)
    except (ErroAPI, TimeoutError) as e:
        print(type(e).__name__, e)
# resposta: Depois de aprovado, o reembolso para M-P | esperas: [0.16, 2.0]
# ErroAPI HTTP 400
# TimeoutError prazo de 12.0 s esgotado
# ErroAPI HTTP 500`,
      difficulty: 2,
      executavel: true,
    },
    {
      id: 'lab-apis-de-modelos-02',
      moduleId: 'apis-de-modelos',
      title: 'Juntar um stream com texto e chamadas de ferramenta',
      brief:
        'Implementa `acumular(eventos)` para os eventos da Messages API: devolve o texto, as chamadas de ferramenta (o JSON dos argumentos chega aos pedaços em `input_json_delta` e só se interpreta no `content_block_stop`), o `stop_reason`, o `usage` (o `output_tokens` do `message_delta` é acumulado, não incremental) e o TTFT no primeiro delta de texto. Um evento `error` a meio levanta excepção.',
      lang: 'python',
      starter: `import json

${EVENTOS_LAB}


def acumular(eventos: list[tuple[int, dict]]) -> dict:
    texto, uso = [], {}
    for ms, ev in eventos:
        if ev["type"] == "content_block_delta":
            texto.append(ev["delta"].get("text", ""))
        elif ev["type"] == "message_delta":
            uso["output_tokens"] = uso.get("output_tokens", 0)
            uso["output_tokens"] += ev["usage"]["output_tokens"]
    return {"texto": "".join(texto), "usage": uso}


print(acumular(EVENTOS))`,
      checks: [
        { id: 'erro', label: 'Trata o evento `error` a meio do stream', re: '==\\s*"error"', why: 'Depois do 200 OK, o estado HTTP já não diz nada: o erro chega como evento.' },
        { id: 'json-parcial', label: 'Acumula o `input_json_delta`', re: 'partial_json', why: 'Os argumentos da ferramenta chegam em pedaços de JSON inválido até ao fim do bloco.' },
        { id: 'parse-no-fim', label: 'Interpreta o JSON no fim do bloco', re: 'json\\.loads\\(', why: 'Só no `content_block_stop` o JSON está completo.' },
        { id: 'stop-reason', label: 'Lê o `stop_reason`', re: '\\["stop_reason"\\]', why: 'Sem ele não sabes se há texto para o cliente ou uma ferramenta para executar.' },
        { id: 'ttft', label: 'Mede o TTFT no primeiro delta de texto', re: 'ttft\\s*=\\s*ms', why: 'É a primeira palavra que o cliente vê.' },
        { id: 'nao-soma', label: 'Não soma o `output_tokens` do `message_delta`', re: '\\["output_tokens"\\]\\s*\\+=', forbid: true, why: 'O valor é acumulado: somá-lo conta tokens a mais e o custo sai inflacionado.' },
      ],
      hints: [
        'Guarda cada bloco aberto num dict por `index`, com um campo `json` que começa vazio.',
        'No `content_block_stop`, se o bloco for `tool_use`, faz `json.loads(bloco["json"] or "{}")`.',
        'No `message_delta`, `uso["output_tokens"] = ev["usage"]["output_tokens"]` (atribuição, não soma).',
      ],
      solution: `import json

${EVENTOS_LAB}


def acumular(eventos: list[tuple[int, dict]]) -> dict:
    """Junta um stream da Messages API: texto, chamadas de ferramenta, stop_reason, usage e TTFT."""
    texto: list[str] = []
    blocos: dict[int, dict] = {}
    chamadas: list[dict] = []
    uso: dict = {}
    paragem, ttft = None, None
    for ms, ev in eventos:
        tipo = ev["type"]
        if tipo == "error":
            raise RuntimeError(f"erro a meio do stream: {ev['error']['type']}")
        if tipo == "message_start":
            uso.update(ev["message"]["usage"])
        elif tipo == "content_block_start":
            blocos[ev["index"]] = {**ev["content_block"], "json": ""}
        elif tipo == "content_block_delta":
            d = ev["delta"]
            if d["type"] == "text_delta":
                if ttft is None:
                    ttft = ms
                texto.append(d["text"])
            elif d["type"] == "input_json_delta":
                blocos[ev["index"]]["json"] += d["partial_json"]
        elif tipo == "content_block_stop":
            b = blocos[ev["index"]]
            if b["type"] == "tool_use":
                chamadas.append({"id": b["id"], "name": b["name"], "input": json.loads(b["json"] or "{}")})
        elif tipo == "message_delta":
            paragem = ev["delta"]["stop_reason"]
            uso["output_tokens"] = ev["usage"]["output_tokens"]
    return {"texto": "".join(texto), "chamadas": chamadas, "stop_reason": paragem, "usage": uso, "ttft_ms": ttft}


r = acumular(EVENTOS)
for k, v in r.items():
    print(f"{k}: {v}")
try:
    acumular(EVENTOS[:3] + [(900, {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}})])
except RuntimeError as e:
    print(e)
# chamadas: [{'id': 'toolu_01', 'name': 'ler_pedido', 'input': {'pedido_id': 'PD-8841990'}}]
# stop_reason: tool_use · ttft_ms: 650 · erro a meio do stream: overloaded_error`,
      difficulty: 2,
      executavel: true,
    },
  ],

  /* ============================================================ casos de uso */
  useCases: [
    {
      id: 'uc-apis-de-modelos-01',
      title: 'Seguradora em Portugal: participações de sinistro sem workers presos nem factura dupla',
      area: 'Seguros',
      level: 2,
      scenario:
        'Uma seguradora automóvel portuguesa recebe ≈ 3 000 participações de sinistro por dia, cada uma com um formulário, uma descrição livre do condutor e as condições particulares da apólice. Quer duas coisas de um LLM: extrair campos e um resumo de cada participação para a triagem, e um assistente em que os gestores de sinistros fazem perguntas sobre a apólice. A primeira versão chamava o SDK directamente em 14 sítios, com os valores por omissão. No primeiro dia de tempestade, o fornecedor respondeu 429 e 529 durante uma hora: os workers ficaram presos em pedidos de minutos, as retentativas do SDK somaram-se às de uma biblioteca de retry, e a factura do mês duplicou.',
      requirements: [
        'Participações com feridos triadas em menos de 5 minutos; as restantes até ao início do dia útil seguinte.',
        'Assistente dos gestores com primeira palavra em menos de 2 s.',
        'Custo por participação conhecido no dia, por tipo de chamada.',
        'Nenhuma resposta cortada tratada como completa.',
      ],
      constraints: [
        'Dados pessoais e de saúde: residência de dados e retenção acordadas com o fornecedor (módulo 6).',
        'Picos de 5× em dias de tempestade, exactamente quando o fornecedor também está mais carregado.',
      ],
      approach: [
        { title: 'Uma porta para o fornecedor', text: 'Um módulo `modelos` com timeout de 30 s por tentativa, `max_retries=2` no SDK e mais nenhuma camada de retentativas; prazos totais por tipo de trabalho (8 s no assistente, 120 s na extracção urgente). A biblioteca de retry foi removida.' },
        { title: 'Separar interactivo, urgente e diferível', text: 'Só o assistente usa streaming. As participações com feridos vão por pedido síncrono com prioridade; as outras juntam-se num lote de hora a hora na API de lote, a metade do preço, com resultados juntos pelo `custom_id`.' },
        { title: 'Prefixo em cache', text: 'As condições gerais da apólice (≈ 6 000 tokens) e as instruções de extracção passam a prefixo fixo com marcador de cache; as condições particulares e a descrição vão no fim.' },
        { title: 'Motivo de paragem e uso em cada resposta', text: '`max_tokens` passa a falha com reprocessamento e métrica; o `usage` alimenta o custo por participação no traço, reconciliado com a factura uma vez por mês.' },
      ],
      diagram: {
        title: 'Três caminhos até ao mesmo fornecedor',
        cols: 5,
        rows: 3,
        nodes: [
          { id: 'part', label: 'Participação', sub: 'formulário + descrição', col: 0, row: 0, kind: 'user' },
          { id: 'triagem', label: 'Tem feridos?', sub: 'regra, sem modelo', col: 1, row: 0, kind: 'decision' },
          { id: 'fila', label: 'Fila horária', sub: 'agrega participações', col: 2, row: 1, kind: 'queue' },
          { id: 'gestor', label: 'Gestor de sinistros', sub: 'pergunta sobre a apólice', col: 0, row: 2, kind: 'user' },
          { id: 'porta', label: 'Módulo modelos', sub: 'timeouts, retentativas, custo', col: 3, row: 1, kind: 'service' },
          { id: 'api', label: 'API do fornecedor', sub: 'síncrona, streaming, lote', col: 4, row: 1, kind: 'external' },
          { id: 'custo', label: 'Custo por participação', sub: 'usage no traço', col: 3, row: 2, kind: 'data' },
        ],
        edges: [
          { from: 'part', to: 'triagem' },
          { from: 'triagem', to: 'porta', label: 'sim: síncrono' },
          { from: 'triagem', to: 'fila', label: 'não' },
          { from: 'fila', to: 'porta', label: 'lote (50%)' },
          { from: 'gestor', to: 'porta', label: 'streaming' },
          { from: 'porta', to: 'api' },
          { from: 'porta', to: 'custo', style: 'dashed' },
        ],
      },
      solution:
        'Uma camada fina com a política de chamadas, três caminhos com prazos diferentes e o lote para tudo o que pode esperar. No dia de tempestade seguinte, os 429 continuaram a acontecer, mas os urgentes passaram dentro do prazo (com poucos pedidos, eram os únicos síncronos), o lote absorveu o resto sem workers presos, e o custo por participação ficou visível no próprio dia.',
      tools: [
        { name: 'SDK oficial com `max_retries=2`', role: 'Única camada de retentativas, respeita retry-after', badge: 'API' },
        { name: 'API de lote', role: 'Extracção das participações sem feridos', badge: 'custo' },
        { name: 'Cache de prompt', role: 'Condições gerais da apólice como prefixo', badge: 'custo' },
        { name: 'Streaming SSE', role: 'Só no assistente dos gestores', badge: 'latência' },
      ],
      rejected: [
        { option: 'Biblioteca de retry por cima do SDK com 5 tentativas', why: 'Multiplicava as tentativas do SDK (até 15 pedidos por chamada) e estendia o tempo preso para lá de qualquer prazo.' },
        { option: 'Streaming para a extracção de campos', why: 'Ninguém lê a extracção à medida que é gerada; o streaming só acrescentava ligações abertas e tratamento de erros a meio.' },
        { option: 'Mudar para um modelo maior «mais fiável»', why: 'Os 429 eram de quota e os 529 de sobrecarga do fornecedor; um modelo maior tem quotas menores e o mesmo problema.' },
      ],
      costNote:
        'Com a extracção em lote, o custo das participações não urgentes caiu para metade; o prefixo em cache baixou a entrada repetida para um décimo do preço. O maior ganho, porém, foi deixar de pagar pedidos retentados em cascata — que não apareciam em nenhuma métrica antes de o `usage` ir para o traço.',
      takeaways: [
        'Define timeout por tentativa e prazo total; os omissos dos SDKs são para gerações de minutos, não para serviços interactivos.',
        'Uma só camada retenta. Contar pedidos por chamada é a forma de o provar.',
        'Streaming para quem lê, síncrono para quem espera pouco, lote para o resto.',
      ],
      refs: [
        { label: 'Anthropic — rate limits', url: 'https://docs.anthropic.com/en/api/rate-limits' },
        { label: 'OpenAI — referência da Chat Completions', url: 'https://platform.openai.com/docs/api-reference/chat' },
      ],
    },
  ],
};
