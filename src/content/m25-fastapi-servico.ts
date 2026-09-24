import type { Module } from '../types';
import { seccoesB, quizM25, exerciciosM25, labsM25, casosM25 } from './m25-fastapi-servico.parte-a';

export const m25: Module = {
  id: 'fastapi-servico',
  number: 25,
  part: 'producao',
  title: 'O serviço FastAPI',
  subtitle: 'Do grafo que funciona num notebook a um endpoint que aguenta clientes a desligar a meio da resposta',
  icon: '🛎️',
  minutes: 95,
  tags: ['fastapi', 'sse', 'streaming', 'rfc 9457', 'testes'],
  goals: [
    'Montar uma aplicação FastAPI com `lifespan` que cria modelos, índice, grafo e pools uma vez por processo, e os fecha por ordem inversa.',
    'Desenhar o contrato HTTP com esquemas Pydantic estritos e dependências para autenticação e papéis, sabendo quando uma rota é `def` e quando é `async def`.',
    'Servir um turno do «Balcão» por Server-Sent Events com `StreamingResponse`, eventos nomeados, cabeçalhos anti-buffering e cancelamento quando o cliente desliga.',
    'Devolver erros como Problem Details (RFC 9457), antes e depois do primeiro byte, e separar vivacidade (`/healthz`) de prontidão (`/readyz`).',
    'Testar a API com `TestClient` e `httpx.AsyncClient` sem rede, e escolher entre workers do uvicorn e réplicas do contentor.',
  ],
  sections: [
    /* ============================================================ 1 */
    {
      id: 'contrato',
      title: 'Do grafo ao serviço: a aplicação e o `lifespan`',
      blocks: [
        {
          type: 'p',
          text:
            'Até aqui o «Balcão» foi um grafo LangGraph que se invoca num teste. Em produção, quem o invoca é a aplicação móvel do «Chega» e o conector de WhatsApp, através da API Gateway que a plataforma já opera. O serviço HTTP é a fronteira onde três coisas que o grafo não sabe passam a existir: **quem** está a falar (autenticação e papel), **quanto** pode pedir (tamanhos, rate limit, orçamento de tokens) e **como** a resposta chega (streaming, erros, cancelamento). Nada disto é engenharia de IA no sentido estrito, e é exactamente aqui que a maior parte dos incidentes de um sistema LLM acontece.',
        },
        {
          type: 'p',
          text:
            'A escolha de Python e FastAPI, em vez da stack JVM onde vive o resto do «Chega», está registada no adr-0001: o ecossistema de LangChain, LangGraph, avaliação e observabilidade `gen_ai` é Python-first, e o serviço de IA é um componente isolado atrás da gateway, com um contrato HTTP que qualquer equipa Java consome. Se vens de Spring Boot, o mapa mental é directo: `FastAPI()` é o `ApplicationContext`, o `lifespan` é o `@PostConstruct`/`@PreDestroy` do contexto inteiro, as dependências são injecção por parâmetro, e os esquemas Pydantic são os DTOs com Bean Validation — mas validados antes de o teu código correr, não por anotação opcional.',
        },
        { type: 'adr', ref: 'adr-0001' },
        {
          type: 'diagram',
          diagram: {
            title: 'O serviço do «Balcão» dentro de um processo',
            caption:
              'Um processo uvicorn, um event loop, e os recursos pesados criados uma vez no `lifespan`. Cada pedido só toca em referências já prontas em `app.state.servicos`.',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'borda', label: 'Borda', col: 0, row: 0, colSpan: 1, rowSpan: 3, tone: 'edge' },
              { id: 'proc', label: 'Processo uvicorn (1 por contentor)', col: 1, row: 0, colSpan: 3, rowSpan: 3, tone: 'service' },
              { id: 'dep', label: 'Dependências', col: 4, row: 0, colSpan: 1, rowSpan: 3, tone: 'data' },
            ],
            nodes: [
              { id: 'app', label: 'App móvel', sub: 'SSE via fetch', col: 0, row: 0, kind: 'user' },
              { id: 'gw', label: 'API Gateway', sub: 'TLS, JWT, buffering off', col: 0, row: 1, kind: 'external' },
              { id: 'wa', label: 'Conector WhatsApp', sub: 'consome o fim', col: 0, row: 2, kind: 'user' },
              { id: 'rotas', label: 'Rotas + dependências', sub: 'auth, papéis, validação', col: 1, row: 1, kind: 'service' },
              { id: 'erros', label: 'Handlers de erro', sub: 'RFC 9457', col: 1, row: 2, kind: 'note' },
              { id: 'estado', label: 'app.state.servicos', sub: 'criado no lifespan', col: 2, row: 1, kind: 'data' },
              { id: 'grafo', label: 'Grafo compilado', sub: 'checkpointer PostgreSQL', col: 3, row: 0, kind: 'agent' },
              { id: 'repo', label: 'Repositório', sub: 'pool psycopg', col: 3, row: 2, kind: 'service' },
              { id: 'pg', label: 'PostgreSQL + pgvector', col: 4, row: 1, kind: 'vector' },
              { id: 'llm', label: 'Fornecedor de modelo', sub: 'ou Ollama', col: 4, row: 0, kind: 'model' },
              { id: 'metr', label: '/metrics', sub: 'Prometheus', col: 4, row: 2, kind: 'note' },
            ],
            edges: [
              { from: 'app', to: 'gw' },
              { from: 'wa', to: 'gw' },
              { from: 'gw', to: 'rotas', label: 'HTTP/1.1' },
              { from: 'rotas', to: 'erros', style: 'dashed' },
              { from: 'rotas', to: 'estado' },
              { from: 'estado', to: 'grafo' },
              { from: 'estado', to: 'repo' },
              { from: 'grafo', to: 'llm' },
              { from: 'grafo', to: 'pg' },
              { from: 'repo', to: 'pg' },
              { from: 'rotas', to: 'metr', style: 'dashed' },
            ],
          },
        },
        {
          type: 'p',
          text:
            'O `lifespan` é um gestor de contexto assíncrono que o FastAPI corre uma vez no arranque (até ao `yield`) e uma vez no fim (depois do `yield`). É o sítio para tudo o que é caro e partilhável: o grafo compilado, o pool de ligações do checkpointer, o cliente HTTP do fornecedor de modelo, o índice. O laboratório usa um `AsyncExitStack` para registar cada `close` à medida que abre recursos, o que garante a ordem inversa no fecho mesmo que o arranque falhe a meio — o mesmo contrato que um `try-with-resources` com vários recursos em Java.',
        },
        { type: 'file', ref: 'src/balcao/api/app.py' },
        {
          type: 'code',
          lang: 'python',
          caption: 'O esqueleto do `lifespan` do «Balcão» (simplificado de `api/app.py`): recursos abertos uma vez, fechados por ordem inversa.',
          code: String.raw`from contextlib import AsyncExitStack, asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from starlette.concurrency import run_in_threadpool


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
    cfg = app.state.cfg
    async with AsyncExitStack() as pilha:
        sistema = await run_in_threadpool(montar_sistema, cfg)   # I/O síncrono fora do event loop
        pool = AsyncConnectionPool(cfg.conninfo, min_size=cfg.pool_min, max_size=cfg.pool_max,
                                   open=False, kwargs={"autocommit": True, "prepare_threshold": 0})
        await pool.open()
        pilha.push_async_callback(pool.close)                     # fecha-se em último lugar
        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()
        app.state.servicos = Servicos(cfg=cfg, sistema=sistema, grafo=sistema.compilar(checkpointer))
        yield                                                     # o serviço atende pedidos aqui
    # ao sair do with: pool.close() e os restantes callbacks, pela ordem inversa


def create_app(cfg: Configuracao | None = None) -> FastAPI:
    app = FastAPI(title="Balcão", version=(cfg or obter_config()).versao, lifespan=ciclo_de_vida)
    app.state.cfg = cfg or obter_config()
    app.include_router(router)
    return app`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: o cliente do modelo criado dentro da rota',
          text:
            'Na primeira versão quase toda a gente escreve `modelo = ChatAnthropic(...)` ou `psycopg.connect(...)` dentro da função da rota. Funciona no portátil e cai no primeiro pico: cada pedido abre um pool HTTP novo (TLS e DNS incluídos) e uma ligação nova ao PostgreSQL, o p95 sobe centenas de milissegundos e o PostgreSQL gerido começa a recusar ligações ao chegar ao `max_connections`. O extremo oposto — criar tudo ao nível do módulo, no import — também falha: os testes não conseguem trocar a configuração e um erro de ligação rebenta no `import`, antes de haver logs. O sítio certo é o `lifespan`, com a fábrica `create_app(cfg)`.',
        },
        {
          type: 'p',
          text:
            'A fábrica `create_app(cfg)` é o padrão *application factory*: o uvicorn chama-a com `--factory`, os testes chamam-na com uma `Configuracao` explícita (modelo simulado, índice em memória, tokens de teste). A configuração é uma `BaseSettings` do `pydantic-settings` validada no arranque — um valor inválido rebenta ao subir o serviço e não à primeira conversa, e as chaves dos fornecedores são `SecretStr`, que não aparecem em `repr` nem em logs.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Os esquemas de entrada são estritos: campos a mais são erro, espaços são aparados, e o tamanho máximo é uma defesa de custo (adr-0027).',
          code: String.raw`from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class CriarConversa(_Base):
    canal: Literal["app", "whatsapp"] = "app"

class EnviarMensagem(_Base):
    # 2 000 caracteres ≈ 550 tokens. Uma mensagem de 50 000 caracteres não é uma pergunta:
    # é um ataque ao orçamento de tokens da conversa.
    texto: str = Field(min_length=1, max_length=2000,
                       examples=["O meu pedido PD-8842507 ainda vai demorar muito?"])

# Repara no que NÃO está aqui: cliente_id. Vem do token, nunca do corpo (RI-03).`,
        },
        {
          type: 'table',
          head: ['Onde', 'O que se valida', 'Falha com', 'Porquê aqui'],
          rows: [
            ['Esquema Pydantic', 'Tipos, tamanhos, enums, campos a mais', '422 Problem Details', 'Antes de o código da rota correr; aparece no OpenAPI'],
            ['Dependência de autenticação', 'Token válido, papel, `cliente_id`', '401 ou 403', 'Reutilizável e testável isoladamente'],
            ['Rota', 'Existência e posse da conversa, estado (`a_aguardar_aprovacao`)', '404 ou 409', 'Precisa do repositório e do estado'],
            ['Guardas de entrada (no grafo)', 'PII, suspeita de injecção', 'Resposta de recusa em SSE', 'É comportamento do assistente, não erro HTTP'],
            ['Ferramentas', 'Limites de valor, posse do pedido', 'Resultado de erro para o modelo', 'A última linha de defesa (adr-0020)'],
          ],
          caption: 'Validação em camadas. Cada camada só verifica o que tem informação para verificar.',
        },
        { type: 'endpoint', ref: 'conversa-criar' },
        {
          type: 'refs',
          items: [
            { label: 'FastAPI — Lifespan Events', url: 'https://fastapi.tiangolo.com/advanced/events/' },
            { label: 'Pydantic — Settings Management', url: 'https://docs.pydantic.dev/latest/concepts/pydantic_settings/' },
            { label: 'Pydantic — Configuration (extra, str_strip_whitespace)', url: 'https://docs.pydantic.dev/latest/api/config/' },
          ],
        },
      ],
    },

    /* ============================================================ 2 */
    {
      id: 'dependencias',
      title: 'Dependências, papéis e a regra do `def` contra `async def`',
      blocks: [
        {
          type: 'p',
          text:
            'O sistema de dependências do FastAPI resolve, antes de cada pedido, um grafo de funções declaradas nos parâmetros com `Annotated[T, Depends(f)]`. Uma dependência pode depender de outras (a autenticação depende do esquema `HTTPBearer` e dos serviços), e o resultado é cacheado dentro do mesmo pedido. É assim que o «Balcão» faz autenticação, autorização por papel e acesso aos serviços do `lifespan` sem uma única variável global.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Autenticação e papéis como dependências (excerto de `api/rotas.py`). O `cliente_id` sai do token e segue até às ferramentas.',
          code: String.raw`_bearer = HTTPBearer(auto_error=False)   # sem auto_error: o 401 sai em Problem Details, não no formato por omissão

def servicos(request: Request) -> Servicos:
    return request.app.state.servicos

def utilizador(cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
               s: Annotated[Servicos, Depends(servicos)]) -> Utilizador:
    if cred is None:
        raise ErroProblema(401, "Não autenticado", "Falta o cabeçalho Authorization: Bearer <token>.")
    encontrado = None
    for token, valor in s.cfg.tokens_api.items():            # tempo constante: não revela qual quase acertou
        if secrets.compare_digest(token.encode(), cred.credentials.encode()):
            encontrado = valor
    if encontrado is None:
        raise ErroProblema(401, "Token inválido")
    papel, _, cliente = encontrado.partition(":")
    return Utilizador(papel=papel, cliente_id=cliente or None, sujeito=f"{papel}:{cliente or '…'}")

def exigir(*papeis: Papel):
    def _verificar(u: Annotated[Utilizador, Depends(utilizador)]) -> Utilizador:
        if u.papel not in papeis:
            raise ErroProblema(403, "Sem permissão", f"Esta operação exige o papel {' ou '.join(papeis)}.")
        return u
    return _verificar

@router.post("/v1/conversas", status_code=201, response_model=Conversa)
def criar_conversa(corpo: CriarConversa,
                   u: Annotated[Utilizador, Depends(exigir("cliente"))],
                   s: Annotated[Servicos, Depends(servicos)]) -> Conversa:
    return s.repo.criar_conversa(str(u.cliente_id), corpo.canal)`,
        },
        {
          type: 'callout',
          tone: 'key',
          title: '404 e não 403 para a conversa de outro cliente',
          text:
            'Quando a Aida pede a conversa do Nelson, a resposta é 404 «Conversa não encontrada», não 403. Um 403 confirma que o id existe, e ids sequenciais ou previsíveis passam a ser enumeráveis. É a mesma regra que as ferramentas seguem: o `cliente_id` vem do token, e um recurso de outro cliente simplesmente não existe para quem pergunta.',
        },
        {
          type: 'p',
          text:
            'Em produção o token é um JWT emitido pelo IdP do «Chega» e validado localmente (assinatura e `exp`) contra as chaves públicas em cache: não há chamada de rede por pedido, o que cabe nos 60 ms que o orçamento dá à fase «rede, autenticação e carregar a conversa». O laboratório usa uma tabela de tokens estáticos em `BALCAO_TOKENS_API` porque o objectivo é a forma do código, não a criptografia; trocar para JWT é mudar só a dependência `utilizador`.',
        },
        {
          type: 'h',
          text: '`def` ou `async def`: onde corre cada rota',
        },
        {
          type: 'p',
          text:
            'Esta é a decisão que mais engana quem vem de Spring MVC. O FastAPI corre uma rota `async def` directamente no event loop; uma rota `def` corre num thread pool (o limitador por omissão do AnyIO tem 40 lugares). Uma rota `async def` que faz I/O bloqueante — `psycopg.connect`, `requests.get`, `time.sleep`, ler um ficheiro grande — pára o event loop inteiro, e com ele todos os streams SSE abertos nesse processo. Uma rota `def` com I/O bloqueante é aceitável: ocupa um thread, não o loop.',
        },
        {
          type: 'table',
          head: ['Rota', 'Onde corre', 'Serve para', 'No «Balcão»'],
          rows: [
            ['`async def` com `await` em I/O assíncrono', 'Event loop', 'Streaming, chamadas ao modelo, grafo `astream`', '`enviar_mensagem`, `decidir_aprovacao`'],
            ['`def` com I/O síncrono', 'Thread pool (40 por omissão)', 'Repositório síncrono, CRUD simples', '`criar_conversa`, `ler_conversa`, `pesquisar`'],
            ['`async def` com I/O síncrono', 'Event loop, bloqueado', 'Nada', 'Proibido; o ruff apanha parte com as regras `ASYNC`'],
            ['`async def` + `run_in_threadpool(f)`', 'Loop, delegando `f` num thread', 'Uma chamada síncrona dentro de uma rota assíncrona', 'Gravar a mensagem antes do stream'],
          ],
          caption: 'A regra prática: `async def` só quando tudo o que a função espera é aguardável.',
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-fastapi-servico-01',
            title: 'Esta rota é `def` ou `async def`?',
            intro: 'Três perguntas, pela ordem em que custam caro se errares.',
            start: 'stream',
            nodes: [
              {
                id: 'stream',
                question: 'A rota devolve um stream ou espera pelo modelo?',
                options: [
                  { label: 'Sim', next: 'libs', note: 'SSE, `astream` do grafo, chamada ao fornecedor.' },
                  { label: 'Não', next: 'sync' },
                ],
              },
              {
                id: 'libs',
                question: 'Todas as bibliotecas que chama têm API assíncrona?',
                options: [
                  { label: 'Sim', next: 'async' },
                  { label: 'Não, uma ou outra é síncrona', next: 'misto' },
                ],
              },
              {
                id: 'sync',
                question: 'O corpo faz I/O síncrono (repositório, ficheiro)?',
                options: [
                  { label: 'Sim', next: 'def' },
                  { label: 'Não, é só CPU leve', next: 'def' },
                ],
              },
              { id: 'async', answer: '`async def` com `await` em tudo.', detail: 'É o caso de `enviar_mensagem`: o grafo corre com `astream` e o checkpointer é o `AsyncPostgresSaver`.' },
              { id: 'misto', answer: '`async def`, com cada chamada síncrona em `run_in_threadpool`.', detail: 'O «Balcão» grava a mensagem do cliente assim, antes de abrir o stream.' },
              { id: 'def', answer: '`def`. O FastAPI põe-na no thread pool.', detail: 'Mais simples de ler e impossível de bloquear o loop. Vigia o limite de 40 threads se as chamadas forem lentas.' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O thread pool também esgota',
          text:
            'Quarenta threads parecem muitos até uma dependência lenta os prender: se o repositório demorar 2 s por causa de um lock no PostgreSQL, 40 pedidos simultâneos bastam para os pedidos seguintes ficarem em fila antes de entrar na rota — incluindo o `/readyz`. Mede a fila (tempo entre a chegada e o início da rota) antes de aumentar o limite; o limite maior só esconde a lentidão.',
        },
        {
          type: 'refs',
          items: [
            { label: 'FastAPI — Dependencies', url: 'https://fastapi.tiangolo.com/tutorial/dependencies/' },
            { label: 'FastAPI — Concurrency and async / await', url: 'https://fastapi.tiangolo.com/async/' },
            { label: 'FastAPI — Security (HTTPBearer)', url: 'https://fastapi.tiangolo.com/tutorial/security/' },
          ],
        },
      ],
    },

    /* ============================================================ 3 */
    {
      id: 'sse',
      title: 'Streaming por Server-Sent Events',
      blocks: [
        {
          type: 'p',
          text:
            'O modelo médio gera a ≈ 60 tokens por segundo; uma resposta de 180 tokens leva ≈ 3 s. Sem streaming, o cliente olha para um ecrã vazio durante o turno inteiro, ≈ 4,4 s. Com streaming, a primeira palavra aparece aos ≈ 1,36 s e o resto chega enquanto o cliente lê. O RNF-01 (primeira palavra com p95 abaixo de 1,5 s) só é cumprível com streaming, e o adr-0021 escolheu fazê-lo com Server-Sent Events.',
        },
        { type: 'adr', ref: 'adr-0021' },
        {
          type: 'p',
          text:
            'O formato é texto simples, definido na especificação HTML da WHATWG: cada evento são linhas `campo: valor` terminadas por uma linha vazia. Os campos são `event` (o tipo), `data` (a carga; várias linhas `data` juntam-se com `\\n`), `id` (o último id visto, que o browser reenvia no cabeçalho `Last-Event-ID` ao reconectar) e `retry` (milissegundos até reconectar). Uma linha que começa por `:` é comentário — é assim que se faz o heartbeat. O «Balcão» usa eventos nomeados com JSON numa só linha: `token`, `ferramenta`, `citacao`, `aprovacao`, `fim` e `erro`.',
        },
        {
          type: 'run',
          run: {
            id: 'run-fastapi-servico-01',
            title: 'Um turno em SSE, feito à mão',
            brief:
              'Recupera contexto, pede a resposta ao modelo simulado em pedaços e enquadra cada pedaço como um evento SSE. O `balcao` é um runtime didáctico: o modelo responde por extracção, mas a forma dos eventos é a mesma que a API real emite.',
            code: String.raw`import json
import balcao as b

pergunta = "Posso juntar dois cupões no mesmo pedido?"
hits = b.recuperar(pergunta, k=3, metodo="rerank")
mensagens = b.montar_prompt_rag(pergunta, hits)

def sse(evento: str, dados: dict) -> str:
    # Uma linha event:, uma linha data: com JSON numa só linha, e uma linha vazia.
    return f"event: {evento}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"

fluxo = [sse("token", {"texto": pedaco}) for pedaco in b.ModeloSimulado().stream(mensagens)]
texto = "".join(json.loads(e.split("data: ", 1)[1])["texto"] for e in fluxo)
citacoes = sorted({c.doc for c, _ in hits if f"[{c.doc}]" in texto})
fluxo += [sse("citacao", {"id": c}) for c in citacoes]
fluxo.append(sse("fim", {"texto": texto.strip(), "citacoes": citacoes}))

print(repr(fluxo[0]))
print(repr(fluxo[1]))
print("...")
print(repr(fluxo[-1][:90]) + "...")
bytes_total = sum(len(e.encode()) for e in fluxo)
print(f"eventos: {len(fluxo)} ({len(fluxo) - len(citacoes) - 1} token, {len(citacoes)} citacao, 1 fim)")
print(f"bytes no fio: {bytes_total}; bytes do texto: {len(texto.encode())}")
print(f"sobrecarga do enquadramento: {bytes_total / len(texto.encode()):.1f}x")`,
            expected: String.raw`'event: token\ndata: {"texto": "Um "}\n\n'
'event: token\ndata: {"texto": "pedido "}\n\n'
...
'event: fim\ndata: {"texto": "Um pedido em grupo junta até 8 pessoas no mesmo carrinho. [faq'...
eventos: 33 (30 token, 2 citacao, 1 fim)
bytes no fio: 1568; bytes do texto: 188
sobrecarga do enquadramento: 8.3x`,
          },
        },
        {
          type: 'p',
          text:
            'Repara na sobrecarga: 8,3 bytes no fio por byte de texto. Não importa para a largura de banda (1,5 KB por resposta), mas importa para os proxies com buffering, como se vai ver já a seguir, e explica porque é que muitos fornecedores agrupam vários tokens por evento. A rota real do laboratório faz o mesmo que este bloco, mas a partir de `grafo.astream(..., stream_mode=["messages", "updates"])`: o modo `messages` dá os pedaços de texto do nó que responde, o modo `updates` dá as chamadas de ferramenta e o `__interrupt__` da aprovação.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'A rota de streaming (excerto de `api/rotas.py`): validação e escrita síncronas antes do primeiro byte, depois um gerador assíncrono.',
          code: String.raw`@router.post("/v1/conversas/{conversa_id}/mensagens",
             responses={200: {"content": {"text/event-stream": {}}}})
async def enviar_mensagem(conversa_id: str, corpo: EnviarMensagem,
                          u: Annotated[Utilizador, Depends(exigir("cliente"))],
                          s: Annotated[Servicos, Depends(servicos)]) -> StreamingResponse:
    conversa = _conversa_acessivel(s, conversa_id, u, so_dono=True)      # 404 ainda é possível aqui
    if conversa.estado == "a_aguardar_aprovacao":
        raise ErroProblema(409, "Conversa à espera de aprovação")        # e 409 também
    await run_in_threadpool(s.repo.adicionar_mensagem, conversa_id, "cliente", mascarar(corpo.texto))
    config = config_de_execucao(conversa_id, str(u.cliente_id), s.cfg, canal=conversa.canal)
    entrada = {"messages": [HumanMessage(corpo.texto)], "cliente_id": str(u.cliente_id)}
    return StreamingResponse(
        _turno(s, conversa_id, entrada, config),          # gerador assíncrono de str
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

async def _turno(s, conversa_id, entrada, config) -> AsyncIterator[str]:
    async for modo, dados in s.grafo.astream(entrada, config, stream_mode=["messages", "updates"]):
        if modo == "messages":
            msg, meta = dados
            if meta.get("langgraph_node") in _NOS_VISIVEIS and msg.text:
                yield _sse("token", {"texto": msg.text})
        ...
    yield _sse("fim", {...})`,
        },
        {
          type: 'p',
          text:
            'Tudo o que pode falhar com um código HTTP próprio (404, 409, 422) acontece **antes** de devolver a `StreamingResponse`. Depois do primeiro byte, o estado 200 já foi enviado e não há volta atrás: um erro a meio vai num evento `erro`. É por isto que a rota é dividida em duas partes, e é a consequência negativa que o adr-0021 regista.',
        },
        {
          type: 'code',
          lang: 'text',
          caption: 'O que o `TestClient` recebe do laboratório para «O meu pedido PD-8842507 ainda vai demorar muito?» (excerto real, modelo simulado).',
          code: String.raw`HTTP/1.1 200 OK
content-type: text/event-stream; charset=utf-8
cache-control: no-cache
x-accel-buffering: no

event: ferramenta
data: {"nome": "ler_pedido", "estado": "chamada", "id": "call_6c07961a3c5c"}

event: ferramenta
data: {"nome": "ler_pedido", "estado": "resultado", "id": "call_6c07961a3c5c", "erro": false}

event: token
data: {"texto": "O "}

event: token
data: {"texto": "pedido "}

...

event: fim
data: {"mensagem_id": "MS-20c94e8b5450", "texto": "O pedido PD-8842507 está em preparacao. Chegada estimada em 38 minutos.", "substituir": false, "intencao": "onde-esta", "citacoes": [], "aprovacao_pendente": false}`,
        },
        { type: 'endpoint', ref: 'mensagem-enviar' },
        {
          type: 'callout',
          tone: 'info',
          title: 'Contrato e laboratório não são iguais — e isso é normal',
          text:
            'O contrato do endpoint (acima) pede `id` sequencial em cada evento, um `: ping` a cada 15 s e `Idempotency-Key` obrigatória. O laboratório implementa o essencial — eventos nomeados, cabeçalhos, cancelamento — e deixa o `id`, o heartbeat e a idempotência como exercício deste módulo. Um contrato à frente da implementação é o que um PR pequeno fecha; o inverso (implementação sem contrato) é o que ninguém consegue consumir.',
        },
        {
          type: 'p',
          text:
            'Do lado do cliente há uma surpresa para quem conhece a API `EventSource` do browser: ela só faz `GET`, sem corpo e sem cabeçalhos próprios, logo não serve para `POST /mensagens` com `Authorization`. A aplicação móvel lê o stream com `fetch` e um `ReadableStream`, e faz o parsing ela própria. O parsing não é `split("\\n\\n")`: os pedaços TCP não respeitam fronteiras de evento, as linhas podem terminar em CRLF, e há comentários e campos `id` que persistem entre eventos.',
        },
        {
          type: 'run',
          run: {
            id: 'run-fastapi-servico-02',
            title: 'Um leitor SSE incremental, segundo a especificação',
            brief:
              'Parser de `text/event-stream` que recebe pedaços arbitrários da rede: guarda a linha incompleta, ignora comentários, junta várias linhas `data` e lembra o último `id` para reconectar.',
            code: String.raw`class LeitorSSE:
    """Parser incremental de text/event-stream, segundo o algoritmo da especificação WHATWG."""

    def __init__(self):
        self.resto = ""
        self.evento, self.dados, self.ultimo_id = "", [], ""

    def alimentar(self, pedaco: str):
        self.resto += pedaco
        linhas = self.resto.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        self.resto = linhas.pop()          # a última linha pode estar incompleta
        for linha in linhas:
            if linha == "":                # linha vazia: despacha o evento acumulado
                if self.dados:
                    yield (self.evento or "message", "\n".join(self.dados), self.ultimo_id)
                self.evento, self.dados = "", []
            elif linha.startswith(":"):    # comentário (heartbeat): ignorado
                continue
            else:
                campo, _, valor = linha.partition(":")
                valor = valor[1:] if valor.startswith(" ") else valor
                if campo == "event":
                    self.evento = valor
                elif campo == "data":
                    self.dados.append(valor)
                elif campo == "id" and "\0" not in valor:
                    self.ultimo_id = valor

# O que a rede entrega: pedaços TCP que não respeitam fronteiras de evento.
pedacos = [
    ": ping\n\n",
    'event: token\nid: 1\ndata: {"texto": "O reem',
    'bolso "}\n\nevent: token\nid: 2\ndata: {"texto": "chega em 24 horas."}\r\n\r\n',
    "data: linha um\ndata: linha dois\n\n",
    'event: fim\nid: 3\ndata: {"citacoes": ["pol-reembolso-prazos"]}\n',
    "\n",
]
leitor = LeitorSSE()
for i, p in enumerate(pedacos):
    for evento, dados, ultimo in leitor.alimentar(p):
        print(f"pedaco {i}: {evento:<7} id={ultimo or '-'} dados={dados!r}")
print("Last-Event-ID para reconectar:", leitor.ultimo_id)`,
            expected: String.raw`pedaco 2: token   id=1 dados='{"texto": "O reembolso "}'
pedaco 2: token   id=2 dados='{"texto": "chega em 24 horas."}'
pedaco 3: message id=2 dados='linha um\nlinha dois'
pedaco 5: fim     id=3 dados='{"citacoes": ["pol-reembolso-prazos"]}'
Last-Event-ID para reconectar: 3`,
          },
        },
        {
          type: 'widget',
          id: 'streaming-sse',
        },
        {
          type: 'compare',
          left: {
            title: 'SSE sobre HTTP (a escolha)',
            items: [
              'HTTP normal: a gateway, os logs de acesso, o JWT e o rate limit funcionam sem mudanças.',
              'Pedido e fluxo de resposta: exactamente o padrão de um turno.',
              'Eventos tipados e legíveis com `curl -N`.',
              'Custa: desligar buffering em cada proxy; erros depois do 200 vão num evento.',
            ],
          },
          right: {
            title: 'WebSocket (rejeitado)',
            items: [
              'Bidireccional — que o «Balcão» não usa: o cliente fala uma vez por turno.',
              'Ligação com estado: sticky sessions, autenticação no handshake, reconexão própria.',
              'A gateway existente precisaria de configuração nova e de timeouts longos.',
              'Ganharia só se o cliente precisasse de interromper a meio com mensagens (não precisa: fecha a ligação).',
            ],
          },
        },
        {
          type: 'p',
          text:
            'Nota de versão: o FastAPI 0.12x, a linha de referência deste tutorial, faz SSE com `StreamingResponse` e texto formatado à mão, como o laboratório. Versões mais recentes trazem `fastapi.sse.EventSourceResponse` e `ServerSentEvent` (a 0.141 instalada no laboratório já os tem), que fazem o enquadramento e documentam o stream no OpenAPI. O formato no fio é o mesmo; a migração é uma troca local na rota.',
        },
        {
          type: 'refs',
          items: [
            { label: 'WHATWG — Server-sent events', url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html' },
            { label: 'MDN — Using server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events' },
            { label: 'FastAPI — Custom Response (StreamingResponse)', url: 'https://fastapi.tiangolo.com/advanced/custom-response/' },
          ],
        },
      ],
    },
    ...seccoesB,
  ],
  quiz: quizM25,
  exercises: exerciciosM25,
  labs: labsM25,
  useCases: casosM25,
};
