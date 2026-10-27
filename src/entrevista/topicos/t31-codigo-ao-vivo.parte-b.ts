import type { PerguntaEntrevista } from '../../types';

/* Tópico 31 — perguntas 6 a 10: robustez de chamadas a APIs (retentativas, rate limit,
   streaming SSE), ciclo de agente e cache semântica.
   O código de cada solução foi executado com python3 (3.13) e numpy; os asserts passam. */

export const perguntasB: PerguntaEntrevista[] = [
  {
    id: 'p-codigo-ao-vivo-06',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'Retentativas com backoff exponencial, jitter total e Retry-After',
    enunciado:
      'Escreve um wrapper de retentativas para chamadas a uma API de LLM: backoff exponencial com jitter total, respeito pelo cabeçalho Retry-After, nada de repetir o que não deve ser repetido — e quero testá-lo sem dormir de verdade.',
    contexto:
      'Assinatura: `com_retentativas(fn, *, tentativas=5, base=0.5, teto=20.0, prazo=60.0, dormir=..., monotonic=..., agora=..., aleatorio=...)`. A API devolve 429 com `Retry-After: 7` ou com uma data HTTP, 503 em picos, e às vezes a ligação cai; 400 e 401 nunca se resolvem a repetir. O pedido tem um prazo total de 60 s porque há um utilizador à espera. Exemplo: 503, depois 429 com Retry-After 7, depois falha de ligação, depois sucesso, com `aleatorio` fixo em 0,5 → esperas `[0.25, 7.0, 1.0]`.',
    minutos: 20,
    dica: 'Tudo o que depende do tempo ou do acaso entra como parâmetro.',
    resposta: [
      {
        type: 'p',
        text: 'Um ciclo de tentativas que classifica o erro, calcula a espera e verifica o orçamento **antes** de dormir. A espera é *full jitter* — uniforme entre 0 e `min(teto, base · 2^tentativa)` — e, se o servidor mandou Retry-After, nunca espero menos do que isso. Relógio monotónico, sono, hora de parede e gerador aleatório são injectáveis, por isso os testes correm em milissegundos e são determinísticos.',
      },
      {
        type: 'p',
        text: 'O jitter existe porque, sem aleatoriedade, mil clientes que falharam ao mesmo tempo voltam todos ao mesmo tempo e derrubam o serviço outra vez; na simulação publicada pela AWS, espalhar uniformemente pelo intervalo inteiro faz menos chamadas no total do que o jitter parcial. O Retry-After, pela RFC 9110, é um número de segundos **ou** uma HTTP-date: parseio as duas formas e ignoro valores inválidos em vez de rebentar. Uso `time.monotonic` para o prazo, porque não salta com acertos do relógio, e a hora de parede só para converter a data.',
      },
      { type: 'code', lang: 'python', caption: 'Retentativas com full jitter, Retry-After e prazo total, com relógio injectável', code: `import random
import time
from collections.abc import Callable
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import TypeVar

T = TypeVar("T")
RETENTAVEIS = {408, 429, 500, 502, 503, 504}


class ErroHTTP(Exception):
    def __init__(self, status: int, retry_after: str | None = None):
        super().__init__(f"HTTP {status}")
        self.status, self.retry_after = status, retry_after


class OrcamentoEsgotado(Exception):
    """A próxima espera ultrapassaria o prazo total: falha já, não dorme em vão."""


def ler_retry_after(valor: str | None, agora: datetime) -> float | None:
    """RFC 9110 §10.2.3: delay-seconds (inteiro >= 0) ou HTTP-date."""
    if valor is None:
        return None
    v = valor.strip()
    if v.isdigit():
        return float(v)
    try:
        quando = parsedate_to_datetime(v)
    except (TypeError, ValueError):
        return None                               # cabeçalho inválido: ignora-o
    if quando.tzinfo is None:
        quando = quando.replace(tzinfo=UTC)
    return max(0.0, (quando - agora).total_seconds())


def com_retentativas(
    fn: Callable[[], T],
    *,
    tentativas: int = 5,
    base: float = 0.5,
    teto: float = 20.0,
    prazo: float = 60.0,
    dormir: Callable[[float], None] = time.sleep,
    monotonic: Callable[[], float] = time.monotonic,
    agora: Callable[[], datetime] = lambda: datetime.now(UTC),
    aleatorio: Callable[[], float] = random.random,
) -> T:
    inicio = monotonic()
    for tentativa in range(tentativas):
        try:
            return fn()
        except ErroHTTP as e:
            if e.status not in RETENTAVEIS:
                raise                             # 400, 401, 403, 404, 422: repetir não ajuda
            erro: Exception = e
        except (ConnectionError, TimeoutError) as e:
            erro = e
        if tentativa == tentativas - 1:
            raise erro
        # full jitter: uniforme em [0, min(teto, base * 2^tentativa)]
        espera = aleatorio() * min(teto, base * 2 ** tentativa)
        pedido = ler_retry_after(getattr(erro, "retry_after", None), agora())
        if pedido is not None:
            espera = max(espera, pedido)          # nunca antes do que o servidor pediu
        if monotonic() - inicio + espera > prazo:
            raise OrcamentoEsgotado(f"esperar {espera:.1f}s passa o prazo") from erro
        dormir(espera)
    raise AssertionError("inalcançável")


# --- testes com relógio falso: nada dorme de verdade ---
class Relogio:
    def __init__(self):
        self.t, self.sonos = 0.0, []

    def dormir(self, s):
        self.sonos.append(s)
        self.t += s


def roteiro(*passos):
    """Devolve uma fn que lança/devolve os passos por ordem e conta as chamadas."""
    it = iter(passos)

    def fn():
        fn.chamadas += 1
        p = next(it)
        if isinstance(p, Exception):
            raise p
        return p
    fn.chamadas = 0
    return fn


def correr(fn, rel, **kw):
    agora_fixo = datetime(2026, 10, 27, 12, 0, 0, tzinfo=UTC)
    return com_retentativas(fn, dormir=rel.dormir, monotonic=lambda: rel.t,
                            agora=lambda: agora_fixo, aleatorio=lambda: 0.5, **kw)


rel = Relogio()
fn = roteiro(ErroHTTP(503), ErroHTTP(429, "7"), ConnectionError(), "ok")
assert correr(fn, rel) == "ok" and fn.chamadas == 4
assert rel.sonos == [0.25, 7.0, 1.0]       # 0.5*0.5 ; Retry-After 7 > 0.5 ; 0.5*2

rel = Relogio()
fn = roteiro(ErroHTTP(429, "Tue, 27 Oct 2026 12:00:30 GMT"), "ok")
assert correr(fn, rel) == "ok" and rel.sonos == [30.0]   # HTTP-date: 30 s a partir de agora

rel = Relogio()
fn = roteiro(ErroHTTP(400), "ok")
try:
    correr(fn, rel)
    raise AssertionError("400 não se repete")
except ErroHTTP as e:
    assert e.status == 400 and fn.chamadas == 1 and rel.sonos == []

rel = Relogio()
fn = roteiro(ErroHTTP(503, "120"), "ok")
try:
    correr(fn, rel, prazo=60)
    raise AssertionError("devia desistir")
except OrcamentoEsgotado:
    assert rel.sonos == []                  # desiste sem dormir 120 s

rel = Relogio()
fn = roteiro(*[ErroHTTP(502)] * 3)
try:
    correr(fn, rel, tentativas=3)
    raise AssertionError("devia esgotar as tentativas")
except ErroHTTP as e:
    assert e.status == 502 and fn.chamadas == 3 and len(rel.sonos) == 2

assert ler_retry_after("lixo", datetime.now(UTC)) is None
assert ler_retry_after(" 0 ", datetime.now(UTC)) == 0.0
print("ok")
` },
      {
        type: 'list',
        items: [
          '4xx que não seja 408 ou 429: erro do pedido, repetir só gasta quota.',
          'Retry-After maior do que o prazo restante: falho já, sem dormir para falhar de qualquer forma.',
          'Última tentativa: relanço o erro original, não um genérico, para não perder o diagnóstico.',
          'Operações não idempotentes (emitir um reembolso): só repito com chave de idempotência, senão um timeout seguido de retentativa emite dois.',
        ],
      },
      {
        type: 'p',
        text: 'Os testes usam um relógio falso que regista os sonos e uma função roteirizada que lança os erros por ordem: verifico a sequência exacta de esperas, a HTTP-date convertida em 30 s, que um 400 não repete nem dorme, que o prazo corta antes de dormir e que, esgotadas as tentativas, sai o erro certo.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'As retentativas multiplicam a carga',
        text: 'Se três camadas repetem cinco vezes cada, uma falha vira 125 pedidos. Repito numa só camada, junto um orçamento de retentativas por serviço (uma fracção máxima de pedidos extra) e um circuit breaker, e registo cada tentativa no traço com o motivo, para o custo das retentativas aparecer no dashboard.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: versão `asyncio` (a função passa a corrotina e `dormir` a `asyncio.sleep`), circuit breaker, e fallback para outro modelo ou fornecedor depois de N falhas 5xx seguidas.',
      },
      {
        type: 'refs',
        items: [
          { label: 'RFC 9110 — HTTP Semantics, secção 10.2.3 Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3' },
          { label: 'AWS Architecture Blog — Exponential Backoff and Jitter', url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/' },
          { label: 'Python — email.utils.parsedate_to_datetime', url: 'https://docs.python.org/3/library/email.utils.html' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Implementa full jitter com teto e diz porque é que o jitter é necessário.',
        'Respeita Retry-After nas duas formas (segundos e HTTP-date).',
        'Distingue erros retentáveis (408, 429, 5xx, rede) de não retentáveis (4xx).',
        'Tem um prazo total e falha antes de dormir quando a espera o ultrapassaria.',
        'Injecta relógio, sono e aleatoriedade e testa sem esperas reais.',
        'Menciona idempotência para operações com efeito.',
      ],
      fraco: 'Faz `time.sleep(2 ** n)` em ciclo, repete qualquer excepção, incluindo 400, e testa a correr o código a sério.',
      solido: 'Backoff com jitter, classificação de erros, Retry-After em segundos e testes com relógio falso.',
      excelente: 'Acrescenta HTTP-date, prazo total verificado antes de dormir, idempotência, o efeito multiplicador das retentativas em camadas e orçamento de retentativas com circuit breaker.',
    },
    seguimento: [
      'Como fazias isto com asyncio e cancelamento?',
      'O que muda se a chamada for em streaming e falhar a meio da resposta?',
      'Como evitas que as retentativas de 16 workers se somem num pico?',
    ],
    sinaisAlarme: [
      'Repetir erros 400 ou 401.',
      'Backoff sem jitter nem teto.',
      'Testes que demoram minutos porque dormem a sério.',
    ],
    modulos: ['apis-de-modelos', 'custo-escala'],
  },
  {
    id: 'p-codigo-ao-vivo-07',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'Rate limiter de token bucket para RPM e TPM em simultâneo',
    enunciado:
      'O fornecedor limita-te a 500 pedidos por minuto e a 200 000 tokens por minuto. Escreve um rate limiter do lado do cliente que respeite os dois limites ao mesmo tempo e funcione com várias threads.',
    contexto:
      'Assinatura: `LimitadorRPMTPM(rpm, tpm, relogio=..., dormir=...)` com `adquirir(tokens, timeout=None)`, `tentar(tokens) -> segundos de espera` e `acertar(estimados, reais)`. Os tokens de um pedido só se sabem ao certo depois da resposta; antes, estimas com o tamanho do prompt mais `max_tokens`. 16 threads de workers partilham o limitador. Exemplo com `rpm=2, tpm=120`: dois pedidos de 60 e 30 tokens passam logo; o terceiro espera 30 s pelo RPM.',
    minutos: 30,
    dica: 'Um pedido só passa se couber nos dois baldes — e não pode consumir de um enquanto espera pelo outro.',
    resposta: [
      {
        type: 'p',
        text: 'Dois token buckets — um de pedidos, um de tokens — que enchem continuamente à taxa `limite/60` por segundo até à capacidade. Um pedido passa só se houver 1 pedido **e** os tokens estimados, e consome os dois de forma atómica, dentro de um lock. Se não couber, calculo a espera exacta (a maior das duas faltas a dividir pela respectiva taxa) e durmo **fora do lock**. O(1) por chamada.',
      },
      {
        type: 'p',
        text: 'A atomicidade é o ponto: consumir do RPM e depois esperar pelo TPM desperdiça capacidade e, com várias threads, deixa duas a segurar meio recurso cada. Capacidade igual ao limite por minuto permite uma rajada de um minuto inteiro; se o fornecedor medir em janelas mais curtas, baixo a capacidade. O `acertar` corrige a estimativa com o `usage` da resposta: devolve tokens se a resposta foi curta e deixa o balde negativo (dívida) se foi mais longa, e o pedido seguinte espera por isso.',
      },
      { type: 'code', lang: 'python', caption: 'Token bucket duplo (RPM e TPM), thread-safe, com relógio injectável', code: `import threading
import time
from collections.abc import Callable


class _Balde:
    """Token bucket: enche \`taxa\` unidades/s até \`capacidade\`; o nível pode ficar negativo (dívida)."""

    def __init__(self, capacidade: float, por_minuto: float, agora: float):
        self.capacidade = capacidade
        self.taxa = por_minuto / 60.0
        self.nivel = capacidade
        self.t = agora

    def encher(self, agora: float) -> None:
        self.nivel = min(self.capacidade, self.nivel + (agora - self.t) * self.taxa)
        self.t = agora

    def espera(self, quantidade: float) -> float:
        falta = quantidade - self.nivel
        return 0.0 if falta <= 1e-9 else falta / self.taxa


class LimitadorRPMTPM:
    """Um pedido só passa quando há 1 pedido E \`tokens\` tokens; consome os dois de forma atómica."""

    def __init__(self, rpm: int, tpm: int, relogio: Callable[[], float] = time.monotonic,
                 dormir: Callable[[float], None] = time.sleep):
        if rpm <= 0 or tpm <= 0:
            raise ValueError("rpm e tpm têm de ser positivos")
        self._relogio, self._dormir = relogio, dormir
        self._lock = threading.Lock()
        t = relogio()
        self._pedidos = _Balde(rpm, rpm, t)
        self._tokens = _Balde(tpm, tpm, t)

    def tentar(self, tokens: int) -> float:
        """0.0 se consumiu; senão, segundos até poder passar (não consome nada)."""
        if tokens > self._tokens.capacidade:
            raise ValueError(f"{tokens} tokens nunca cabem num balde de {self._tokens.capacidade}")
        with self._lock:
            agora = self._relogio()
            self._pedidos.encher(agora)
            self._tokens.encher(agora)
            espera = max(self._pedidos.espera(1), self._tokens.espera(tokens))
            if espera == 0.0:
                self._pedidos.nivel -= 1
                self._tokens.nivel -= tokens
            return espera

    def adquirir(self, tokens: int, timeout: float | None = None) -> None:
        limite = None if timeout is None else self._relogio() + timeout
        while (espera := self.tentar(tokens)) > 0:
            if limite is not None and self._relogio() + espera > limite:
                raise TimeoutError(f"precisava de esperar {espera:.2f}s")
            self._dormir(espera)          # dorme fora do lock

    def acertar(self, estimados: int, reais: int) -> None:
        """Depois da resposta: devolve ou cobra a diferença entre a estimativa e o \`usage\` real."""
        with self._lock:
            self._tokens.encher(self._relogio())
            self._tokens.nivel = min(self._tokens.capacidade, self._tokens.nivel + estimados - reais)


# --- testes determinísticos com relógio falso ---
class Relogio:
    def __init__(self):
        self.t, self.sonos = 0.0, []

    def __call__(self):
        return self.t

    def dormir(self, s):
        self.sonos.append(round(s, 6))
        self.t += s


rel = Relogio()
lim = LimitadorRPMTPM(rpm=2, tpm=120, relogio=rel, dormir=rel.dormir)   # 1 pedido/30 s, 2 tokens/s
lim.adquirir(60)
lim.adquirir(30)                 # balde de pedidos vazio; restam 30 tokens
assert rel.sonos == []
lim.adquirir(10)                 # limitado pelo RPM: 30 s até haver 1 pedido
assert rel.sonos == [30.0]       # t=30: tokens 30 + 60 - 10 = 80
lim.adquirir(120)                # TPM pede 20 s (faltam 40 a 2/s), RPM pede 30 s: manda o maior
assert rel.sonos == [30.0, 30.0] and rel.t == 60.0
assert lim._tokens.nivel == 0.0  # t=60: 80 + 60 = 140, cortado a 120, consumido

rel = Relogio()
lim = LimitadorRPMTPM(rpm=10, tpm=100, relogio=rel, dormir=rel.dormir)
lim.adquirir(100)
lim.acertar(estimados=100, reais=40)   # a resposta gastou menos: devolve 60
assert lim.tentar(60) == 0.0
try:
    lim.adquirir(50, timeout=5)        # faltam 50 tokens a 100/60 por s = 30 s
    raise AssertionError("devia dar timeout")
except TimeoutError:
    pass

# thread-safety: relógio parado, 50 threads a disputar 1000 tokens em pedidos de 30
lim = LimitadorRPMTPM(rpm=100, tpm=1000, relogio=lambda: 0.0)
ok = []
barreira = threading.Barrier(50)


def trabalhador():
    barreira.wait()
    if lim.tentar(30) == 0.0:
        ok.append(1)


ts = [threading.Thread(target=trabalhador) for _ in range(50)]
for t in ts:
    t.start()
for t in ts:
    t.join()
assert len(ok) == 33             # floor(1000 / 30), nunca mais
print("ok")
` },
      {
        type: 'list',
        items: [
          'Pedido com mais tokens do que a capacidade: erro imediato, porque nunca passaria e ficava em ciclo para sempre.',
          'Vírgula flutuante: depois de dormir exactamente a espera, o nível pode ficar 1e-12 abaixo; a tolerância de 1e-9 evita uma série de sonos minúsculos.',
          'Timeout: se a espera ultrapassa o limite, falho sem dormir.',
          'Relógio monotónico: um acerto do relógio de parede não pode encher nem esvaziar baldes.',
        ],
      },
      {
        type: 'p',
        text: 'Com relógio falso verifico a sequência de esperas e o nível depois de cada passo. Para a thread-safety congelo o relógio e ponho 50 threads atrás de uma barreira a disputar 1000 tokens em pedidos de 30: passam exactamente 33, nunca mais. A barreira serve para maximizar a contenção — sem o lock, este teste pode falhar de forma intermitente.',
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Isto limita um processo, não a frota',
        text: 'O estado vive em memória: com 4 réplicas, cada uma fica com um quarto do limite ou o estado passa para um sítio partilhado (Redis com uma operação atómica). E os cabeçalhos de rate limit que o fornecedor devolve são a verdade: uso-os para recalibrar, e trato um 429 como sinal de que a estimativa está errada.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: versão `asyncio` com `asyncio.Lock` e `asyncio.sleep`, justiça (uma fila FIFO para que os pedidos grandes não sejam ultrapassados para sempre pelos pequenos), quotas por tenant, e baldes separados para tokens de entrada e de saída, como alguns fornecedores medem.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Python — threading (Lock, Barrier)', url: 'https://docs.python.org/3/library/threading.html' },
          { label: 'OpenAI — guia de rate limits (RPM e TPM)', url: 'https://platform.openai.com/docs/guides/rate-limits' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Usa dois baldes com reabastecimento contínuo e consumo atómico dos dois.',
        'Calcula a espera exacta em vez de fazer polling com sleep fixo.',
        'Dorme fora do lock.',
        'Trata a incerteza dos tokens com estimativa e acerto posterior pelo usage.',
        'Testa a concorrência com um cenário determinístico (relógio parado, barreira).',
        'Reconhece que o limitador local não coordena várias réplicas.',
      ],
      fraco: 'Conta pedidos numa janela fixa por minuto, ignora os tokens ou dorme com o lock na mão.',
      solido: 'Dois token buckets atómicos, espera calculada, thread-safe e testado com relógio falso.',
      excelente: 'Acrescenta o acerto pelo usage com dívida, a falha imediata para pedidos impossíveis, a justiça entre pedidos grandes e pequenos e a coordenação entre réplicas com os cabeçalhos do fornecedor como verdade.',
    },
    seguimento: [
      'Como partilhavas este limite entre 4 réplicas do serviço?',
      'Um pedido de 150 000 tokens nunca passa à frente dos pequenos. Como resolves?',
      'Que diferença faz janela deslizante contra token bucket para este caso?',
    ],
    sinaisAlarme: [
      'Consumir de um balde e depois esperar pelo outro.',
      'Ignorar que os tokens reais só se conhecem depois da resposta.',
      'Usar `time.time()` para medir intervalos.',
    ],
    modulos: ['custo-escala', 'apis-de-modelos'],
  },
  {
    id: 'p-codigo-ao-vivo-08',
    tipo: 'codigo',
    nivel: 'staff',
    titulo: 'Ciclo de agente com despacho validado e paragem segura',
    enunciado:
      'Escreve o ciclo de um agente com ferramentas. O modelo é simulado: devolve texto final ou chamadas a ferramentas. Quero validação dos argumentos, limite de passos, detecção de chamadas repetidas, e os erros das ferramentas devolvidos ao modelo em vez de rebentarem o processo.',
    contexto:
      'Assinatura: `correr_agente(modelo, ferramentas, pergunta, max_passos=6, max_repeticoes=2) -> Resultado(resposta, motivo, passos, mensagens)`. `modelo(mensagens) -> RespostaModelo(texto, chamadas)`; cada ferramenta declara parâmetros, tipos e obrigatórios. Agente de suporte de entregas com a ferramenta `estado_pedido(pedido_id: str)`. Exemplo: o modelo chama com `pedido_id=17` (inteiro), recebe o erro de validação, corrige para `"A-17"` e responde → motivo `final` em 3 passos.',
    minutos: 35,
    dica: 'Separa os erros que o modelo consegue corrigir dos que significam que tens de parar.',
    resposta: [
      {
        type: 'p',
        text: 'Um ciclo limitado: chamo o modelo; se não há chamadas, é a resposta final; senão, para cada chamada verifico repetição, existência da ferramenta e argumentos, executo dentro de um `try` e devolvo o resultado ou o erro como mensagem `tool` com o id da chamada. Paro por três motivos explícitos — `final`, `limite_passos`, `repeticao` — e devolvo sempre a transcrição, porque é ela que se avalia e se depura.',
      },
      {
        type: 'p',
        text: 'Os erros dividem-se em dois grupos. Os **recuperáveis** (tipo errado, ferramenta inexistente, pedido não encontrado) voltam ao modelo como dados estruturados, porque o modelo corrige-se muito melhor quando o erro diz o que estava errado. Os **de controlo** (repetição, limite de passos) terminam o ciclo: o modelo já mostrou que não converge e cada passo extra é uma chamada com o contexto inteiro. A chave de repetição é o nome mais os argumentos serializados com `sort_keys`, para que a mesma chamada com as chaves por outra ordem conte como igual.',
      },
      { type: 'code', lang: 'python', caption: 'Ciclo de ferramentas com validação, limites e erros como dados', code: `import json
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ChamadaFerramenta:
    id: str
    nome: str
    args: dict[str, Any]


@dataclass
class RespostaModelo:
    texto: str | None = None
    chamadas: list[ChamadaFerramenta] = field(default_factory=list)


@dataclass
class Ferramenta:
    fn: Callable[..., Any]
    params: dict[str, type]                     # nome -> tipo esperado
    obrigatorios: frozenset[str] = frozenset()


@dataclass
class Resultado:
    resposta: str | None
    motivo: str                                 # final | limite_passos | repeticao
    passos: int
    mensagens: list[dict]


def validar(f: Ferramenta, args: Any) -> list[str]:
    if not isinstance(args, dict):
        return ["args tem de ser um objecto"]
    erros = [f"falta '{p}'" for p in sorted(f.obrigatorios - args.keys())]
    erros += [f"parâmetro desconhecido '{p}'" for p in sorted(args.keys() - f.params.keys())]
    for p, v in args.items():
        tipo = f.params.get(p)
        # bool é subclasse de int: True não pode passar por um id numérico
        if tipo and (not isinstance(v, tipo) or (isinstance(v, bool) and tipo is not bool)):
            erros.append(f"'{p}' deve ser {tipo.__name__}, veio {type(v).__name__}")
    return erros


def correr_agente(
    modelo: Callable[[list[dict]], RespostaModelo],
    ferramentas: dict[str, Ferramenta],
    pergunta: str,
    max_passos: int = 6,
    max_repeticoes: int = 2,
    max_chars_resultado: int = 2000,
) -> Resultado:
    msgs: list[dict] = [{"role": "user", "content": pergunta}]
    vistas: Counter[tuple[str, str]] = Counter()
    for passo in range(1, max_passos + 1):
        r = modelo(msgs)
        msgs.append({"role": "assistant", "content": r.texto,
                     "tool_calls": [c.__dict__ for c in r.chamadas]})
        if not r.chamadas:
            return Resultado(r.texto, "final", passo, msgs)
        for c in r.chamadas:
            chave = (c.nome, json.dumps(c.args, sort_keys=True, ensure_ascii=False, default=str))
            vistas[chave] += 1
            if vistas[chave] > max_repeticoes:
                return Resultado(None, "repeticao", passo, msgs)
            f = ferramentas.get(c.nome)
            if f is None:
                conteudo = {"erro": f"ferramenta '{c.nome}' não existe", "disponiveis": sorted(ferramentas)}
            elif erros := validar(f, c.args):
                conteudo = {"erro": "argumentos inválidos", "detalhes": erros}
            else:
                try:
                    conteudo = {"ok": f.fn(**c.args)}
                except Exception as e:          # o erro é um dado para o modelo, não um crash
                    conteudo = {"erro": f"{type(e).__name__}: {e}"}
            texto = json.dumps(conteudo, ensure_ascii=False, default=str)[:max_chars_resultado]
            msgs.append({"role": "tool", "tool_call_id": c.id, "content": texto})
    return Resultado(None, "limite_passos", max_passos, msgs)


# --- testes com um modelo simulado ---
PEDIDOS = {"A-17": {"estado": "em trânsito", "eta_min": 12}}


def estado_pedido(pedido_id: str) -> dict:
    if pedido_id not in PEDIDOS:
        raise KeyError(f"pedido {pedido_id} não encontrado")
    return PEDIDOS[pedido_id]


FERR = {"estado_pedido": Ferramenta(estado_pedido, {"pedido_id": str}, frozenset({"pedido_id"}))}


def roteiro(*respostas):
    it = iter(respostas)
    return lambda msgs: next(it)


def chamada(i, nome, **args):
    return RespostaModelo(chamadas=[ChamadaFerramenta(f"c{i}", nome, args)])


# 1) tipo errado -> erro devolvido -> o modelo corrige -> resposta final
m = roteiro(chamada(1, "estado_pedido", pedido_id=17),
            chamada(2, "estado_pedido", pedido_id="A-17"),
            RespostaModelo(texto="O pedido A-17 chega em cerca de 12 minutos."))
r = correr_agente(m, FERR, "Onde está o meu pedido A-17?")
assert (r.motivo, r.passos) == ("final", 3)
tools = [x["content"] for x in r.mensagens if x["role"] == "tool"]
assert "deve ser str" in tools[0] and '"eta_min": 12' in tools[1]

# 2) excepção da ferramenta e ferramenta inexistente viram mensagens de erro
m = roteiro(chamada(1, "estado_pedido", pedido_id="Z-1"), chamada(2, "reembolsar", valor=10),
            RespostaModelo(texto="Não encontrei o pedido."))
r = correr_agente(m, FERR, "E o Z-1?")
tools = [x["content"] for x in r.mensagens if x["role"] == "tool"]
assert "KeyError" in tools[0] and "não existe" in tools[1] and r.motivo == "final"

# 3) o modelo insiste na mesma chamada -> pára por repetição antes da 3.ª execução
r = correr_agente(lambda msgs: chamada(9, "estado_pedido", pedido_id="A-17"), FERR, "?")
assert (r.motivo, r.passos) == ("repeticao", 3)

# 4) chamadas sempre diferentes -> limite de passos
cont = iter(range(100))
r = correr_agente(lambda msgs: chamada(0, "estado_pedido", pedido_id=f"X-{next(cont)}"), FERR, "?",
                  max_passos=4)
assert (r.motivo, r.passos, r.resposta) == ("limite_passos", 4, None)
assert validar(FERR["estado_pedido"], {"pedido_id": True}) == ["'pedido_id' deve ser str, veio bool"]
print("ok")
` },
      {
        type: 'list',
        items: [
          '`bool` é subclasse de `int` em Python: sem a verificação explícita, `True` passava por um id numérico.',
          'Resultado de ferramenta enorme: corto a `max_chars_resultado` para não encher a janela de contexto.',
          'Várias chamadas na mesma resposta: cada uma recebe a sua mensagem `tool` com o `tool_call_id`, porque as APIs exigem a correspondência.',
          'Ao parar por repetição a meio de um lote, ficam chamadas sem resposta na transcrição; se a conversa continuar, fecho-as com um erro.',
        ],
      },
      {
        type: 'p',
        text: 'O modelo simulado é um roteiro de respostas, por isso cada teste é um cenário: corrigir após erro de validação, excepção da ferramenta e ferramenta inexistente, modelo preso na mesma chamada, e chamadas sempre diferentes até ao limite. Verifico o motivo, o número de passos e o conteúdo das mensagens `tool` — é a mesma forma de um eval de trajectória.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O que um staff acrescenta',
        text: 'Os limites vivem em código, não no prompt: orçamento de tokens e de custo por conversa, ferramentas com efeito (reembolsos) atrás de confirmação humana ou de uma política verificada fora do modelo, e um traço por passo com a chamada, a validação e a latência. O prompt pode dizer «não repitas»; é o contador que o garante.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: validação com JSON Schema ou Pydantic em vez de tipos simples, timeouts por ferramenta, execução em paralelo de chamadas independentes, e compressão do histórico quando a transcrição se aproxima da janela.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — tool use', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use' },
          { label: 'OpenAI — function calling', url: 'https://platform.openai.com/docs/guides/function-calling' },
          { label: 'Yao et al. (2022) — ReAct: Synergizing Reasoning and Acting in Language Models', url: 'https://arxiv.org/abs/2210.03629' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Tem limite de passos e devolve um motivo de paragem explícito.',
        'Valida argumentos (obrigatórios, desconhecidos, tipos) antes de executar.',
        'Devolve erros de ferramenta ao modelo como mensagens, associados ao id da chamada.',
        'Detecta chamadas repetidas com uma chave canónica dos argumentos.',
        'Testa com um modelo simulado por cenários e verifica a trajectória.',
        'Coloca limites de custo e de efeitos fora do prompt.',
      ],
      fraco: 'Um `while True` que chama o modelo até haver texto, sem validação, e uma excepção da ferramenta derruba o processo.',
      solido: 'Ciclo limitado, validação, erros como dados, detecção de repetição e testes com modelo simulado.',
      excelente: 'Acrescenta a distinção entre erros recuperáveis e de controlo, o caso do `bool`, a correspondência de ids em chamadas paralelas, orçamento de custo e ferramentas com efeito atrás de política verificada em código.',
    },
    seguimento: [
      'Como avaliavas este agente num conjunto de 200 conversas?',
      'O que fazes quando o modelo inventa uma ferramenta que não existe três vezes seguidas?',
      'Como impedias que um documento recuperado mandasse o agente emitir um reembolso?',
    ],
    sinaisAlarme: [
      'Um ciclo sem limite de passos.',
      'Deixar que a excepção de uma ferramenta termine a conversa sem resposta.',
      'Confiar no prompt para impedir acções perigosas.',
    ],
    modulos: ['tool-calling', 'agentes', 'avaliar-agentes'],
  },
  {
    id: 'p-codigo-ao-vivo-09',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'Parser incremental de Server-Sent Events para streaming',
    enunciado:
      'A API do modelo devolve a resposta em streaming por Server-Sent Events. Escreve um parser que recebe bytes em pedaços arbitrários — uma linha pode chegar partida a meio, até um carácter UTF-8 pode chegar partido — e devolve eventos completos. Pára no `[DONE]`.',
    contexto:
      'Assinatura: `ParserSSE().alimentar(pedaco: bytes) -> list[Evento]` e `fechar() -> list[Evento]`, mais um gerador `eventos_ate_done(pedacos)`. `Evento(tipo, dados, id)`. O stream mistura `\\r\\n`, `\\n` e `\\r`, tem comentários de keep-alive (`: ping`), eventos com várias linhas `data:` e campos `event:`, `id:` e `retry:`. Teste obrigatório: o mesmo stream partido em pedaços de 1 a 40 bytes dá exactamente os mesmos eventos.',
    minutos: 30,
    dica: 'Um `\\r` no fim de um pedaço ainda não é um fim de linha que possas processar.',
    resposta: [
      {
        type: 'p',
        text: 'Três estados: um **descodificador UTF-8 incremental** (guarda os bytes de um carácter incompleto), um **buffer de texto** com a linha por terminar, e o **evento em construção** (linhas de dados, tipo, último id). Cada pedaço é descodificado e junto ao buffer, processo todas as linhas completas, e uma linha vazia despacha o evento. O(n) no total de bytes.',
      },
      {
        type: 'p',
        text: 'As regras da especificação do HTML que se esquecem ao vivo: os três terminadores de linha são válidos; uma linha que começa por `:` é comentário; só **um** espaço depois dos dois pontos é removido; várias linhas `data:` juntam-se com `\\n`; um bloco sem dados não despacha nada mas limpa o tipo; o `id` persiste para os eventos seguintes (é o que vai no `Last-Event-ID` ao religar); e um evento sem linha vazia final quando o stream fecha **é descartado**. O `[DONE]` não é da especificação — é uma convenção de alguns fornecedores — por isso trato-o num gerador por cima do parser, não dentro dele.',
      },
      { type: 'code', lang: 'python', caption: 'Parser SSE incremental, testado com todos os tamanhos de pedaço de 1 a 40 bytes', code: `import codecs
import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass

_FIM_LINHA = re.compile(r"\\r\\n|\\r|\\n")


@dataclass(frozen=True)
class Evento:
    tipo: str
    dados: str
    id: str


class ParserSSE:
    """Parser incremental conforme o algoritmo do HTML Living Standard (secção server-sent events)."""

    def __init__(self) -> None:
        self._dec = codecs.getincrementaldecoder("utf-8")(errors="replace")
        self._buf = ""
        self._inicio = True
        self._dados: list[str] = []
        self._tipo = ""
        self.ultimo_id = ""                      # persiste entre eventos (Last-Event-ID)
        self.retry_ms: int | None = None

    def alimentar(self, pedaco: bytes) -> list[Evento]:
        texto = self._dec.decode(pedaco)          # guarda bytes UTF-8 incompletos
        if self._inicio and texto:
            self._inicio = False
            texto = texto.removeprefix("﻿")  # BOM só no início do stream
        self._buf += texto
        eventos: list[Evento] = []
        pos = 0
        while m := _FIM_LINHA.search(self._buf, pos):
            if m.group() == "\\r" and m.end() == len(self._buf):
                break                             # pode ser metade de um \\r\\n: espera
            ev = self._linha(self._buf[pos:m.start()])
            if ev:
                eventos.append(ev)
            pos = m.end()
        self._buf = self._buf[pos:]
        return eventos

    def fechar(self) -> list[Evento]:
        """Fim do stream: processa um \\\\r pendente; um evento sem linha vazia final é descartado."""
        self._buf += self._dec.decode(b"", final=True)
        eventos = []
        if self._buf.endswith("\\r"):
            ev = self._linha(self._buf[:-1])
            eventos = [ev] if ev else []
        self._buf, self._dados, self._tipo = "", [], ""
        return eventos

    def _linha(self, linha: str) -> Evento | None:
        if linha == "":
            return self._despachar()
        if linha.startswith(":"):
            return None                           # comentário (keep-alive)
        campo, sep, valor = linha.partition(":")
        if sep and valor.startswith(" "):
            valor = valor[1:]                     # só um espaço é removido
        match campo:
            case "data":
                self._dados.append(valor)
            case "event":
                self._tipo = valor
            case "id":
                if "\\0" not in valor:
                    self.ultimo_id = valor
            case "retry":
                if valor.isascii() and valor.isdigit():
                    self.retry_ms = int(valor)
            case _:
                pass                              # campo desconhecido: ignora
        return None

    def _despachar(self) -> Evento | None:
        dados, tipo = self._dados, self._tipo
        self._dados, self._tipo = [], ""
        if not dados:
            return None                           # bloco sem data: não despacha
        return Evento(tipo or "message", "\\n".join(dados), self.ultimo_id)


def eventos_ate_done(pedacos: Iterable[bytes]) -> Iterator[Evento]:
    """Convenção das APIs de LLM tipo OpenAI: \`data: [DONE]\` termina o stream."""
    p = ParserSSE()
    for pedaco in pedacos:
        for ev in p.alimentar(pedaco):
            if ev.dados == "[DONE]":
                return
            yield ev
    yield from p.fechar()


# --- testes ---
STREAM = (
    "﻿: ping\\r\\n"
    "retry: 3000\\r\\n"
    "id: 1\\r\\n"
    'data: {"delta": "Olá, "}\\r\\n\\r\\n'
    "event: uso\\n"
    "data:linha 1\\n"
    "data: linha 2 com é e 50 €\\n"
    "\\n"
    "id\\r"                                        # campo sem «:» -> id vazio
    "data\\r"                                      # data vazio conta como uma linha
    "\\r"
    "data: [DONE]\\n\\n"
    "data: depois do DONE\\n\\n"
    "data: incompleto sem linha vazia\\n"
).encode()

ESPERADO = [
    Evento("message", '{"delta": "Olá, "}', "1"),
    Evento("uso", "linha 1\\nlinha 2 com é e 50 €", "1"),
    Evento("message", "", ""),
]

# o mesmo stream partido em pedaços de 1 a 40 bytes dá sempre o mesmo resultado
for tam in range(1, 41):
    pedacos = [STREAM[i:i + tam] for i in range(0, len(STREAM), tam)]
    assert list(eventos_ate_done(pedacos)) == ESPERADO, tam

p = ParserSSE()
todos = p.alimentar(STREAM) + p.fechar()
assert [e.dados for e in todos][-2:] == ["[DONE]", "depois do DONE"]   # o incompleto não sai
assert p.retry_ms == 3000
assert ParserSSE().alimentar(b"data: x\\r") == []   # \\r no fim: ainda não sabe se vem \\n
print("ok")
` },
      {
        type: 'list',
        items: [
          '`\\r` no fim do pedaço: espero pelo pedaço seguinte, porque pode ser metade de `\\r\\n` — processá-lo logo criava uma linha vazia falsa e despachava um evento a meio.',
          'Carácter multibyte partido entre pedaços: o descodificador incremental guarda-o; `bytes.decode` em cada pedaço dava `UnicodeDecodeError`.',
          'O BOM só é removido no início do stream.',
          '`retry` só aceita dígitos ASCII; um `id` com NUL é ignorado.',
        ],
      },
      {
        type: 'p',
        text: 'O teste decisivo é o dos pedaços: o mesmo stream partido em todos os tamanhos de 1 a 40 bytes tem de produzir a mesma lista de eventos, e isso apanha de uma vez o `\\r\\n` partido, o UTF-8 partido e o buffer mal reposto. Junto o fecho com evento incompleto descartado e o `retry`.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Partir cada pedaço por \\n',
        text: 'Um parser que faz `pedaco.decode().split("\\n")` funciona na demo e falha em produção quando um proxy ou balanceador reagrupa os pedaços. O sintoma típico é JSON inválido a meio de uma resposta longa, só com alguns clientes e só às vezes.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: versão assíncrona sobre o iterador de bytes do cliente HTTP, reconstrução da resposta a partir dos deltas JSON (incluindo argumentos de tool calls que chegam em fragmentos), e religação com `Last-Event-ID` e o `retry` recebido.',
      },
      {
        type: 'refs',
        items: [
          { label: 'HTML Living Standard — Server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
          { label: 'Python — codecs.getincrementaldecoder', url: 'https://docs.python.org/3/library/codecs.html' },
          { label: 'MDN — Using server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Usa um descodificador UTF-8 incremental em vez de descodificar cada pedaço isoladamente.',
        'Trata os três terminadores de linha e o \\r no fim de um pedaço.',
        'Junta várias linhas data com \\n e despacha só na linha vazia.',
        'Ignora comentários e trata id, event e retry segundo a especificação.',
        'Testa com o mesmo stream partido em vários tamanhos de pedaço.',
      ],
      fraco: 'Descodifica cada pedaço e faz split por \\n, assumindo que um pedaço é um evento.',
      solido: 'Buffer de linhas, várias linhas data, comentários, [DONE] e testes com pedaços partidos.',
      excelente: 'Acrescenta o descodificador incremental, o \\r pendente, a regra do evento incompleto descartado, o Last-Event-ID para religar, e o teste exaustivo por tamanhos de pedaço.',
    },
    seguimento: [
      'Como reconstróis os argumentos de uma tool call que chegam em fragmentos JSON?',
      'O que fazes se a ligação cair a meio da resposta?',
      'Como medias o tempo até ao primeiro token com este parser?',
    ],
    sinaisAlarme: [
      'Assumir que cada pedaço de rede é uma linha ou um evento.',
      'Ignorar caracteres multibyte partidos.',
      'Testar só com o stream inteiro num único pedaço.',
    ],
    modulos: ['apis-de-modelos', 'fastapi-servico'],
  },
  {
    id: 'p-codigo-ao-vivo-10',
    tipo: 'codigo',
    nivel: 'staff',
    titulo: 'Cache semântica com limiar, TTL e despejo LRU',
    enunciado:
      'Queremos uma cache semântica à frente do LLM: se uma pergunta é suficientemente parecida com uma já respondida, devolve a resposta guardada. Escreve-a com limiar de similaridade, TTL e capacidade máxima com despejo LRU. A função de embedding é injectada.',
    contexto:
      'Assinatura: `CacheSemantica(embed, limiar=0.92, ttl_s=3600, capacidade=10_000, relogio=...)` com `obter(consulta, escopo)` a devolver `(resposta, similaridade)` ou `None`, e `guardar(consulta, resposta, escopo)`. Assistente de FAQ de uma operadora de telecomunicações, multi-tenant, com uma fracção grande de perguntas quase repetidas. Exemplo: guardada «qual o horário da loja?», a consulta «a que horas abre a loja?» (cosseno ~0,95) acerta com limiar 0,9; a mesma consulta noutro tenant falha.',
    minutos: 30,
    dica: 'Antes de escrever a similaridade, pensa no que nunca pode ser partilhado entre duas entradas da cache.',
    resposta: [
      {
        type: 'p',
        text: 'Um `OrderedDict` dá o LRU (a ordem é a recência: `move_to_end` num acerto, `popitem(last=False)` quando passa a capacidade); cada entrada guarda o vector normalizado, a resposta, o escopo e a hora de expiração; a consulta é um produto matriz-vector sobre as entradas do mesmo escopo seguido de `argmax`. O(n·d) por consulta nesta versão; o embedding corre fora do lock porque é a parte lenta.',
      },
      {
        type: 'p',
        text: 'O **escopo** é a decisão de staff: tenant, modelo, versão do prompt e idioma entram na chave, porque a resposta de um tenant pode conter dados que outro não pode ver e uma resposta gerada com o prompt antigo não deve sobreviver a uma mudança de prompt. O limiar é o trade-off central: alto dá poucos acertos; baixo serve respostas erradas com toda a confiança — «como cancelo o pedido?» e «como cancelo a encomenda de ontem?» podem ficar acima de 0,9 e pedir respostas diferentes.',
      },
      { type: 'code', lang: 'python', caption: 'Cache semântica com escopo, limiar, TTL e LRU', code: `import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from dataclasses import dataclass

import numpy as np


@dataclass
class _Entrada:
    escopo: Hashable
    vetor: np.ndarray            # normalizado
    resposta: str
    expira: float


class CacheSemantica:
    """Cache de respostas por semelhança de consulta: limiar, TTL e LRU por capacidade.

    \`escopo\` separa o que nunca pode ser partilhado (tenant, modelo, versão do prompt, idioma).
    """

    def __init__(self, embed: Callable[[str], np.ndarray], limiar: float = 0.92,
                 ttl_s: float = 3600, capacidade: int = 10_000,
                 relogio: Callable[[], float] = time.monotonic):
        if not -1 <= limiar <= 1 or ttl_s <= 0 or capacidade <= 0:
            raise ValueError("parâmetros inválidos")
        self._embed, self.limiar, self.ttl, self.cap = embed, limiar, ttl_s, capacidade
        self._relogio = relogio
        self._dados: OrderedDict[int, _Entrada] = OrderedDict()   # ordem = recência (LRU)
        self._seq = 0
        self._lock = threading.Lock()
        self.acertos = self.falhas = 0

    def _vetor(self, texto: str) -> np.ndarray | None:
        v = np.asarray(self._embed(texto), dtype=np.float32)
        n = float(np.linalg.norm(v))
        return None if n == 0 or not np.isfinite(n) else v / n

    def _purgar(self, agora: float) -> None:
        for k in [k for k, e in self._dados.items() if e.expira <= agora]:
            del self._dados[k]

    def obter(self, consulta: str, escopo: Hashable = None) -> tuple[str, float] | None:
        v = self._vetor(consulta)                 # embedding fora do lock (é I/O)
        with self._lock:
            self._purgar(self._relogio())
            chaves = [k for k, e in self._dados.items() if e.escopo == escopo]
            if v is None or not chaves:
                self.falhas += 1
                return None
            mat = np.stack([self._dados[k].vetor for k in chaves])
            sims = mat @ v                        # O(n·d); em produção, índice ANN por escopo
            i = int(np.argmax(sims))
            if sims[i] < self.limiar:
                self.falhas += 1
                return None
            self._dados.move_to_end(chaves[i])    # LRU: usado agora
            self.acertos += 1
            return self._dados[chaves[i]].resposta, float(sims[i])

    def guardar(self, consulta: str, resposta: str, escopo: Hashable = None) -> None:
        v = self._vetor(consulta)
        if v is None:
            return
        with self._lock:
            agora = self._relogio()
            self._purgar(agora)
            self._seq += 1
            self._dados[self._seq] = _Entrada(escopo, v, resposta, agora + self.ttl)
            while len(self._dados) > self.cap:
                self._dados.popitem(last=False)   # sai o menos usado recentemente


# --- testes com embedding falso e relógio falso ---
VEC = {
    "qual o horário da loja?": [1.0, 0.0, 0.0],
    "a que horas abre a loja?": [0.95, 0.31, 0.0],    # cosseno ~0.95 com a anterior
    "como cancelo o pedido?": [0.0, 1.0, 0.0],
    "quanto custa a entrega?": [0.0, 0.0, 1.0],
    "": [0.0, 0.0, 0.0],
}
t = [0.0]
c = CacheSemantica(lambda s: np.array(VEC[s]), limiar=0.9, ttl_s=60, capacidade=2,
                   relogio=lambda: t[0])

c.guardar("qual o horário da loja?", "Das 8h às 22h.", escopo="tenant-a")
hit = c.obter("a que horas abre a loja?", escopo="tenant-a")
assert hit is not None and hit[0] == "Das 8h às 22h." and round(hit[1], 2) == 0.95
assert c.obter("a que horas abre a loja?", escopo="tenant-b") is None   # outro tenant
assert c.obter("como cancelo o pedido?", escopo="tenant-a") is None     # abaixo do limiar
assert c.obter("", escopo="tenant-a") is None                           # vector nulo

# LRU: capacidade 2; o «horário» foi usado, por isso sai o «cancelar»
c.guardar("como cancelo o pedido?", "Na app, em Pedidos.", escopo="tenant-a")
c.obter("qual o horário da loja?", escopo="tenant-a")
c.guardar("quanto custa a entrega?", "A partir de 50 MT.", escopo="tenant-a")
assert c.obter("como cancelo o pedido?", escopo="tenant-a") is None
assert c.obter("qual o horário da loja?", escopo="tenant-a") is not None

# TTL
t[0] = 61.0
assert c.obter("qual o horário da loja?", escopo="tenant-a") is None
assert (c.acertos, c.falhas) == (3, 5)
print("ok")
` },
      {
        type: 'table',
        head: ['Parâmetro', 'Se subir', 'Se descer'],
        rows: [
          ['Limiar', 'Menos acertos e menos respostas erradas', 'Mais acertos e mais respostas para a pergunta errada'],
          ['TTL', 'Mais acertos e respostas desactualizadas (preços, horários)', 'Menos risco e menos poupança'],
          ['Capacidade', 'Mais memória e consulta O(n) mais lenta', 'Mais despejos de entradas úteis'],
        ],
      },
      {
        type: 'list',
        items: [
          'Vector nulo ou não finito: não guarda nem consulta.',
          'Entradas expiradas são purgadas antes de procurar, para nunca servir uma resposta fora do TTL.',
          'Perguntas que dependem da conversa («e o segundo?») não deviam entrar na cache: a resposta depende do histórico, não só do texto.',
        ],
      },
      {
        type: 'p',
        text: 'Testo com um embedding falso (um dicionário de vectores) e relógio falso: acerto acima do limiar, falha abaixo, isolamento por escopo, ordem de despejo LRU depois de um acesso, expiração por TTL e os contadores de acertos e falhas.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Medir antes de servir',
        text: 'Ligo a cache em modo sombra: calcula o acerto mas serve sempre a resposta do LLM, e um juiz calibrado ou amostragem humana compara as duas. Escolho o limiar pela curva de taxa de acerto contra taxa de resposta errada, não por intuição, e só depois sirvo da cache.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: índice ANN por escopo quando n cresce, invalidação explícita quando a base de conhecimento muda, e uma cache exacta (hash do texto normalizado) à frente da semântica, mais barata e sem risco de resposta trocada.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Python — collections.OrderedDict', url: 'https://docs.python.org/3/library/collections.html#collections.OrderedDict' },
          { label: 'GPTCache — cache semântica para LLMs', url: 'https://github.com/zilliztech/GPTCache' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Implementa LRU com OrderedDict (ou equivalente) e TTL verificado antes de servir.',
        'Normaliza os vectores e compara por cosseno com um limiar configurável.',
        'Isola as entradas por escopo (tenant, modelo, versão do prompt).',
        'Explica o trade-off do limiar com um exemplo de falso acerto.',
        'Propõe validar o limiar em modo sombra antes de servir respostas da cache.',
      ],
      fraco: 'Um dicionário com o texto exacto como chave, sem TTL nem limite, partilhado entre todos os tenants.',
      solido: 'Limiar, TTL e LRU correctos, embedding injectável e testes com relógio falso.',
      excelente: 'Acrescenta o escopo como requisito de segurança, a escolha do limiar por curva medida em modo sombra, a exclusão de perguntas dependentes do contexto e a cache exacta à frente da semântica.',
    },
    seguimento: [
      'Como escolhias o limiar com dados reais?',
      'O que acontece à cache quando mudas o modelo de embeddings?',
      'Como invalidavas as entradas quando o preço da entrega muda?',
    ],
    sinaisAlarme: [
      'Uma cache partilhada entre tenants.',
      'Escolher o limiar «a olho» e servir logo.',
      'Não ter TTL para respostas com preços ou horários.',
    ],
    modulos: ['custo-escala', 'embeddings'],
  },
];
