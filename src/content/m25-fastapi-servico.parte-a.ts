import type { Exercise, Lab, Question, Section, UseCase } from '../types';

export const seccoesB: Section[] = [
  /* ============================================================ 4 */
  {
    id: 'cancelamento',
    title: 'Buffering, cancelamento e timeouts',
    blocks: [
      {
        type: 'p',
        text:
          'Um stream SSE só é um stream se nenhum componente entre o uvicorn e o ecrã o juntar num bloco. O nginx, por omissão, faz buffering das respostas de upstream (`proxy_buffering on`); algumas gateways e CDNs também. Com buffering ligado, o servidor mede um TTFT de 1,36 s e o cliente vê a primeira palavra quase ao mesmo tempo que a última. O cabeçalho `X-Accel-Buffering: no` desliga o buffering do nginx para essa resposta; `Cache-Control: no-cache` impede caches intermédias de guardar o stream. A validação do adr-0021 é exactamente esta: comparar o TTFT medido no servidor com o medido no cliente, e alarmar quando a diferença passa 300 ms.',
      },
      {
        type: 'run',
        run: {
          id: 'run-fastapi-servico-03',
          title: 'O orçamento de latência e o que um proxy com buffering lhe faz',
          brief:
            'Soma as fases antes do primeiro token (ORCAMENTO_LATENCIA de `design.ts`) e calcula quando o cliente vê a primeira palavra se um proxy só despachar quando enche o buffer.',
          code: String.raw`# Orçamento de um turno de política (ORCAMENTO_LATENCIA em design.ts), em ms.
# O embedding (60 ms) corre em paralelo com a classificação e fica fora do caminho crítico.
antes = {"rede+auth+conversa": 60, "guardas entrada": 25, "classificar (pequeno)": 350,
         "pesquisa hibrida": 45, "re-ranking": 180, "modelo medio ate 1.o token": 700}
depois = {"gerar 180 tokens": 3000, "guardas saida": 30, "persistir": 25}

ttft = sum(antes.values())
total = ttft + sum(depois.values())
print(f"TTFT no servidor: {ttft} ms (alvo p95 < 1500 ms, folga {1500 - ttft} ms)")
print(f"turno completo:   {total} ms (alvo p95 < 5000 ms)")

tokens, tok_s = 180, 60
bytes_por_evento = 52          # medido: 1568 bytes / 30 eventos no bloco anterior
for buffer in (0, 4096, 8192):
    if buffer == 0:
        primeiro = ttft
    else:
        eventos = -(-buffer // bytes_por_evento)          # arredondar para cima
        primeiro = ttft + min(eventos, tokens) / tok_s * 1000 if eventos <= tokens else total
    rotulo = "sem buffering" if buffer == 0 else f"proxy com buffer de {buffer} B"
    print(f"{rotulo:<28} -> cliente ve a 1.a palavra aos {primeiro / 1000:.2f} s")
print(f"sem streaming                -> cliente ve a 1.a palavra aos {total / 1000:.2f} s")`,
          expected: String.raw`TTFT no servidor: 1360 ms (alvo p95 < 1500 ms, folga 140 ms)
turno completo:   4415 ms (alvo p95 < 5000 ms)
sem buffering                -> cliente ve a 1.a palavra aos 1.36 s
proxy com buffer de 4096 B   -> cliente ve a 1.a palavra aos 2.68 s
proxy com buffer de 8192 B   -> cliente ve a 1.a palavra aos 3.99 s
sem streaming                -> cliente ve a 1.a palavra aos 4.42 s`,
        },
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Um buffer de 8 KB come quase todo o ganho do streaming',
        text:
          'Com os números do «Balcão», um proxy com buffer de 8 KB põe a primeira palavra aos 3,99 s — a 0,4 s do caso sem streaming. O serviço está certo, os testes passam, o painel do servidor mostra TTFT de 1,36 s, e o cliente tem a experiência antiga. Por isso o TTFT tem de ser medido também no cliente (a aplicação envia-o com o feedback), e cada camada nova entre o cliente e o uvicorn — um sidecar de service mesh, um WAF, uma CDN — é um candidato a religar o buffering.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-fastapi-servico-01',
          title: 'Um turno em SSE, do POST ao evento `fim` — e o cliente que desliga',
          intro: 'Tempos do orçamento de latência. O caminho feliz primeiro; nos dois últimos passos, o que acontece quando a aplicação é fechada a meio da resposta.',
          lanes: [
            { id: 'cli', label: 'App do cliente', sub: 'fetch + ReadableStream', kind: 'client' },
            { id: 'gw', label: 'Gateway', sub: 'buffering desligado', kind: 'infra' },
            { id: 'api', label: 'FastAPI', sub: 'rota + gerador', kind: 'service' },
            { id: 'grafo', label: 'Grafo', sub: 'astream', kind: 'agent' },
            { id: 'llm', label: 'Modelo médio', kind: 'model' },
            { id: 'pg', label: 'PostgreSQL', kind: 'store' },
          ],
          steps: [
            { from: 'cli', to: 'gw', label: 'POST /v1/conversas/CV-…/mensagens', kind: 'req', code: 'Authorization: Bearer eyJ…\nContent-Type: application/json\n\n{"texto": "Posso juntar dois cupões?"}', lang: 'http', ms: 20 },
            { from: 'gw', to: 'api', label: 'valida JWT, encaminha', kind: 'req', ms: 10 },
            { from: 'api', to: 'pg', label: 'conversa existe e é deste cliente?', detail: 'Ainda antes do primeiro byte: aqui um 404 ou 409 é um código HTTP normal.', kind: 'req', ms: 30 },
            { from: 'api', to: 'cli', label: '200 + cabeçalhos text/event-stream', detail: 'A partir daqui o estado HTTP está fixado. Qualquer erro vai num evento `erro`.', kind: 'res', code: 'HTTP/1.1 200 OK\ncontent-type: text/event-stream; charset=utf-8\ncache-control: no-cache\nx-accel-buffering: no', lang: 'http' },
            { from: 'api', to: 'grafo', label: 'astream(stream_mode=["messages","updates"])', kind: 'req' },
            { from: 'grafo', to: 'grafo', label: 'guardas, classificar, pesquisar, re-rank', kind: 'self', ms: 600 },
            { from: 'grafo', to: 'llm', label: 'prompt com contexto', kind: 'req', ms: 700, tokens: 5200 },
            { from: 'llm', to: 'api', label: 'primeiro pedaço de texto', kind: 'res' },
            { from: 'api', to: 'cli', label: 'event: token (TTFT ≈ 1,36 s)', kind: 'res', code: 'event: token\ndata: {"texto": "Só "}\n', lang: 'text' },
            { from: 'llm', to: 'cli', label: '… mais 170 eventos token', kind: 'async', ms: 3000, tokens: 180 },
            { from: 'api', to: 'pg', label: 'grava resposta e checkpoint', kind: 'req', ms: 25 },
            { from: 'api', to: 'cli', label: 'event: citacao ×2, event: fim', kind: 'res' },
            { from: 'cli', to: 'gw', label: 'Variante: a app é fechada aos 2 s', detail: 'O TCP fecha. O uvicorn entrega `http.disconnect` à aplicação.', kind: 'err' },
            { from: 'api', to: 'grafo', label: 'CancelledError no await corrente', detail: 'O Starlette cancela o gerador; o `astream` é cancelado e a chamada HTTP ao fornecedor é fechada: deixas de pagar tokens de saída.', kind: 'err' },
          ],
          outro:
            'O cancelamento não é opcional: sem ele, cada cliente que fecha a aplicação continua a gerar (e a pagar) até ao fim da resposta, e a ligação ao fornecedor fica ocupada contra o rate limit.',
        },
      },
      {
        type: 'p',
        text:
          'Como é que o cancelamento chega ao teu código? No Starlette 1.x instalado no laboratório, a `StreamingResponse` olha para a versão da especificação ASGI que o servidor anuncia. O uvicorn 0.53 anuncia a 2.3: o Starlette corre o gerador e, em paralelo, uma tarefa que espera por `http.disconnect`; quando ela chega, cancela o grupo de tarefas e o gerador recebe `asyncio.CancelledError` no `await` onde estiver. Com servidores que anunciam 2.4 ou superior, o Starlette deixa de escutar e só dá pela desconexão quando o `send` falha — isto é, no próximo evento que tentares escrever. Em ambos os casos o que tens de garantir é o mesmo: não engolir o cancelamento e limpar em `finally`.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Um gerador SSE bem comportado: cancelamento propagado, limpeza em `finally`, heartbeat e prazo total do turno.',
        code: String.raw`import asyncio
import json
import logging

log = logging.getLogger(__name__)
PING_S = 15          # contrato do endpoint: ": ping" a cada 15 s
PRAZO_TURNO_S = 20   # acima disto o turno é cancelado e o cliente recebe um evento erro

def _sse(evento: str, dados: dict, ident: int) -> str:
    return f"event: {evento}\nid: {ident}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"

async def turno(grafo, entrada, config, conversa_id: str):
    n = 0
    fila: asyncio.Queue = asyncio.Queue()

    async def produtor():
        async for modo, dados in grafo.astream(entrada, config, stream_mode=["messages", "updates"]):
            await fila.put((modo, dados))
        await fila.put(None)

    tarefa = asyncio.create_task(produtor())
    try:
        async with asyncio.timeout(PRAZO_TURNO_S):
            while True:
                try:
                    item = await asyncio.wait_for(fila.get(), timeout=PING_S)
                except TimeoutError:
                    yield ": ping\n\n"                 # comentário SSE: mantém proxies e NAT acordados
                    continue
                if item is None:
                    break
                n += 1
                yield _sse("token", {"texto": "..."}, n)   # traduzir (modo, dados) em eventos
        n += 1
        yield _sse("fim", {"conversa_id": conversa_id}, n)
    except TimeoutError:
        yield _sse("erro", {"type": "about:blank", "title": "Turno excedeu o prazo", "status": 504}, n + 1)
    except Exception as e:                      # Exception, NÃO BaseException: CancelledError tem de passar
        log.exception("turno falhou em %s", conversa_id)
        yield _sse("erro", {"type": "about:blank", "title": "Erro ao processar a mensagem",
                            "status": 500, "detail": type(e).__name__}, n + 1)
    finally:
        tarefa.cancel()                         # cliente desligou, prazo, ou fim normal: pára o grafo`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O `except BaseException` que transforma cancelamento em custo',
        text:
          'Um `except BaseException:` (ou um `except:` nu) à volta do ciclo do stream apanha o `CancelledError` do cliente que desligou, regista «erro» e tenta escrever um evento `erro` para uma ligação que já não existe — ou, pior, continua o ciclo. O efeito em produção é invisível no painel de erros e visível na factura: turnos abandonados a gerar até ao fim. Em Python 3.8+, `CancelledError` é `BaseException` precisamente para que `except Exception` não o apanhe. Se precisares de registar o abandono, apanha-o, regista, e faz `raise`.',
      },
      {
        type: 'trace',
        trace: {
          id: 'tr-fastapi-servico-01',
          title: 'Um turno abandonado pelo cliente aos 2,1 s',
          brief:
            'A aplicação foi fechada a meio da resposta. Com o cancelamento a propagar, o span do modelo fecha como cancelado com 42 tokens de saída em vez dos ≈ 180 que custaria acabar.',
          spans: [
            { id: 's1', name: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ms: 2110, status: 'cancelado', attrs: [['http.request.method', 'POST'], ['http.route', '/v1/conversas/{conversa_id}/mensagens'], ['balcao.cancelado_por', 'cliente']], detail: 'O estado HTTP foi 200 (enviado ao primeiro byte); o span regista o cancelamento como atributo e estado.' },
            { id: 's2', parent: 's1', name: 'guardas_entrada', kind: 'guarda', ms: 24, status: 'ok' },
            { id: 's3', parent: 's1', name: 'chat classificar', kind: 'llm', ms: 342, tokensIn: 610, tokensOut: 3, status: 'ok', attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.request.model', 'pequeno'], ['gen_ai.usage.input_tokens', '610'], ['gen_ai.usage.output_tokens', '3']] },
            { id: 's4', parent: 's1', name: 'pesquisa_hibrida', kind: 'retriever', ms: 47, status: 'ok', attrs: [['balcao.k', '20']] },
            { id: 's5', parent: 's1', name: 'rerank', kind: 'retriever', ms: 176, status: 'ok' },
            { id: 's6', parent: 's1', name: 'chat responder_rag', kind: 'llm', ms: 1490, tokensIn: 5180, tokensOut: 42, status: 'cancelado', attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.request.model', 'medio'], ['gen_ai.usage.input_tokens', '5180'], ['gen_ai.usage.output_tokens', '42']], detail: 'Primeiro token aos 1,36 s do pedido; 42 tokens depois, o cliente desliga e a ligação ao fornecedor é fechada.' },
          ],
          note: 'Sem cancelamento, o s6 fecharia com ≈ 180 tokens de saída e o pedido duraria ≈ 4,4 s, a ocupar lugar no rate limit do fornecedor. O traço completo e as convenções `gen_ai` são o tema do módulo 29.',
        },
      },
      {
        type: 'table',
        head: ['Camada', 'Timeout', 'Valor no «Balcão»', 'O que acontece quando dispara'],
        rows: [
          ['Cliente (app)', 'Sem eventos durante N s', '30 s (dois pings falhados)', 'Fecha e reconecta com `Last-Event-ID`, ou mostra erro'],
          ['Gateway', 'Idle timeout da ligação', '≥ 60 s', 'Corta o stream: o heartbeat de 15 s existe para isto'],
          ['Turno (gerador)', '`asyncio.timeout`', '20 s', 'Evento `erro` 504 e cancelamento do grafo'],
          ['Chamada ao modelo', '`timeout_modelo_s` + `max_retries_modelo`', '30 s, 2 retentativas', 'Retentativa com backoff (módulo 3) ou erro para o nó'],
          ['uvicorn', '`--timeout-graceful-shutdown`', '20 s', 'Streams ainda abertos no SIGTERM são cortados'],
        ],
        caption: 'Os timeouts têm de estar ordenados: o de dentro dispara antes do de fora, para o erro ser teu e com significado, não um corte mudo da gateway.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Starlette — Responses (StreamingResponse)', url: 'https://www.starlette.io/responses/' },
          { label: 'Python — asyncio.timeout e cancelamento', url: 'https://docs.python.org/3/library/asyncio-task.html' },
          { label: 'Uvicorn — Settings', url: 'https://www.uvicorn.org/settings/' },
        ],
      },
    ],
  },

  /* ============================================================ 5 */
  {
    id: 'erros-saude',
    title: 'Erros RFC 9457, vivacidade e prontidão',
    blocks: [
      {
        type: 'p',
        text:
          'O formato de erro por omissão do FastAPI (`{"detail": ...}`) é suficiente para um protótipo e mau para um contrato: cada cliente tem de adivinhar a forma. O «Balcão» usa Problem Details for HTTP APIs, a RFC 9457 (que substituiu a RFC 7807): um objecto JSON servido como `application/problem+json`, com `type` (URI que identifica o tipo de problema; `about:blank` quando o estado HTTP chega), `title` (resumo legível, estável para o mesmo tipo), `status`, `detail` (esta ocorrência) e `instance` (o recurso). As equipas Java do «Chega» já recebem este formato do Spring 6 (`ProblemDetail`), e a gateway sabe registá-lo.',
      },
      {
        type: 'code',
        lang: 'json',
        caption: 'Três respostas reais do laboratório: mensagem vazia, pedido sem token, canal inválido.',
        code: String.raw`// POST /v1/conversas/CV-a32d0e87277d/mensagens  {"texto": ""}   → 422 application/problem+json
{"type":"about:blank","title":"Pedido inválido","status":422,
 "detail":"body.texto: String should have at least 1 character",
 "instance":"/v1/conversas/CV-a32d0e87277d/mensagens"}

// POST /v1/conversas  (sem Authorization)   → 401
{"type":"about:blank","title":"Não autenticado","status":401,
 "detail":"Falta o cabeçalho Authorization: Bearer <token>.","instance":"/v1/conversas"}

// POST /v1/conversas  {"canal": "fax"}   → 422
{"type":"about:blank","title":"Pedido inválido","status":422,
 "detail":"body.canal: Input should be 'app' or 'whatsapp'","instance":"/v1/conversas"}`,
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Os quatro handlers de `api/app.py`: erro de domínio, validação, HTTP do Starlette, e tudo o resto — sem fuga de detalhes internos.',
        code: String.raw`def _problema(status: int, title: str, detail: str | None, request: Request,
              tipo: str = "about:blank") -> JSONResponse:
    corpo = Problema(type=tipo, title=title, status=status, detail=detail, instance=str(request.url.path))
    return JSONResponse(corpo.model_dump(exclude_none=True), status_code=status,
                        media_type="application/problem+json")

@app.exception_handler(ErroProblema)
async def _erro_problema(request: Request, exc: ErroProblema) -> JSONResponse:
    return _problema(exc.status_code, exc.title, exc.detail, request, exc.tipo)

@app.exception_handler(RequestValidationError)
async def _erro_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    campos = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return _problema(422, "Pedido inválido", campos, request)        # não devolve o input: pode ter PII

@app.exception_handler(StarletteHTTPException)
async def _erro_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return _problema(exc.status_code, str(exc.detail), None, request)   # 404 de rota, 405, ...

@app.exception_handler(Exception)
async def _erro_interno(request: Request, exc: Exception) -> JSONResponse:
    log.exception("erro não tratado em %s", request.url.path)             # o stack trace vai para o log
    return _problema(500, "Erro interno", None, request)                  # e nunca para o cliente`,
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'O erro de validação que devolve a mensagem do cliente',
        text:
          'O handler por omissão do FastAPI para `RequestValidationError` inclui o campo `input` de cada erro — o valor recebido. Para `texto` isso é a mensagem do cliente, possivelmente com telefone ou NUIT, a ir para o corpo da resposta e daí para os logs da gateway. O handler do «Balcão» devolve só o caminho do campo e a mensagem de erro, que é o que o RNF-04 exige.',
      },
      {
        type: 'table',
        head: ['Estado', 'Quando no «Balcão»', 'Retentável pelo cliente?'],
        rows: [
          ['400 / 422', 'Corpo inválido, mensagem vazia ou acima de 2 000 caracteres', 'Não, sem corrigir o pedido'],
          ['401', 'Sem token, ou token inválido', 'Só depois de renovar o token'],
          ['403', 'Papel errado (cliente a decidir uma aprovação)', 'Não'],
          ['404', 'Conversa inexistente ou de outro cliente', 'Não'],
          ['409', 'Conversa à espera de aprovação; aprovação já decidida', 'Sim, mais tarde'],
          ['429', 'Rate limit ou orçamento de tokens da conversa esgotado (adr-0027)', 'Sim, depois de `Retry-After`'],
          ['503', '`/readyz` sem base de dados ou índice vazio', 'Sim, noutra réplica'],
          ['evento `erro`', 'Falha depois do primeiro byte do stream', 'Sim, com a mesma `Idempotency-Key`'],
        ],
        caption: 'O `title` é estável por tipo de erro; é nele (ou num `type` próprio) que o cliente decide, não no texto do `detail`.',
      },
      { type: 'adr', ref: 'adr-0027' },
      {
        type: 'h',
        text: 'Vivacidade e prontidão não são a mesma pergunta',
      },
      {
        type: 'p',
        text:
          'O `/healthz` responde «o processo está vivo e o event loop responde» e não toca em dependências. O `/readyz` responde «esta réplica consegue servir um turno agora»: a base de dados responde e o índice tem chunks. A diferença importa no dia em que o PostgreSQL gerido faz failover durante 40 s: se a liveness verificasse a base de dados, o orquestrador mataria e reiniciaria todas as réplicas em cadeia, e quando a base de dados voltasse encontraria o serviço inteiro a arrancar. Com a separação, as réplicas saem do balanceador (readiness a 503) e voltam sozinhas.',
      },
      { type: 'endpoint', ref: 'saude' },
      { type: 'endpoint', ref: 'prontidao' },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'As duas sondas num Deployment Kubernetes (se a plataforma correr o «Balcão» em Kubernetes; no Compose, o `HEALTHCHECK` da imagem usa o `/healthz`).',
        code: `containers:
  - name: balcao
    image: ghcr.io/chega/balcao:sha-3f9c2e1...   # imagem imutável por SHA (módulo 28)
    ports: [{ containerPort: 8000 }]
    livenessProbe:            # vivo? — reinicia o contentor se falhar
      httpGet: { path: /healthz, port: 8000 }
      periodSeconds: 15
      failureThreshold: 3
    readinessProbe:           # pronto? — tira do Service se falhar, sem reiniciar
      httpGet: { path: /readyz, port: 8000 }
      periodSeconds: 5
      failureThreshold: 2
    startupProbe:             # o lifespan monta grafo e pools: dá-lhe tempo antes da liveness
      httpGet: { path: /healthz, port: 8000 }
      periodSeconds: 2
      failureThreshold: 30
    lifecycle:
      preStop:                # deixa o balanceador retirar a réplica antes do SIGTERM
        sleep: { seconds: 5 }
    terminationGracePeriodSeconds: 30   # > --timeout-graceful-shutdown 20 do uvicorn`,
      },
      {
        type: 'refs',
        items: [
          { label: 'RFC 9457 — Problem Details for HTTP APIs', url: 'https://www.rfc-editor.org/rfc/rfc9457' },
          { label: 'FastAPI — Handling Errors', url: 'https://fastapi.tiangolo.com/tutorial/handling-errors/' },
          { label: 'Kubernetes — Liveness, Readiness and Startup Probes', url: 'https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/' },
        ],
      },
    ],
  },

  /* ============================================================ 6 */
  {
    id: 'testes-deploy',
    title: 'Testar sem rede e correr com uvicorn',
    blocks: [
      {
        type: 'p',
        text:
          'Os testes da API correm sem rede e sem chave de API (RE-03): modelo simulado, embeddings simulados, índice em memória, `InMemorySaver`. A fábrica `create_app(cfg)` recebe uma `Configuracao` de teste, e o `TestClient` do Starlette (reexportado em `fastapi.testclient`) chama a aplicação ASGI directamente, sem abrir portas. São 14 testes de ponta a ponta que cobrem SSE, aprovação com `interrupt`, autenticação, validação, feedback, pesquisa, ingestão, avaliação e métricas.',
      },
      { type: 'file', ref: 'tests/test_api.py' },
      {
        type: 'code',
        lang: 'python',
        caption: 'O teste do stream RAG (excerto de `tests/test_api.py`): o cliente do teste é usado como gestor de contexto, para o `lifespan` correr.',
        code: String.raw`@pytest.fixture
def cliente(cfg: Configuracao) -> Iterator[TestClient]:
    with TestClient(create_app(cfg)) as c:       # o with dispara o lifespan (startup e shutdown)
        yield c

def _eventos(corpo: str) -> list[tuple[str, dict]]:
    out = []
    for bloco in corpo.strip().split("\n\n"):
        linhas = dict(l.split(": ", 1) for l in bloco.splitlines() if ": " in l)
        out.append((linhas["event"], json.loads(linhas["data"])))
    return out

def test_mensagem_rag_em_sse_com_tokens_citacao_e_fim(cliente: TestClient) -> None:
    cid = cliente.post("/v1/conversas", json={"canal": "whatsapp"}, headers=_h("tok-aida")).json()["id"]
    r = cliente.post(f"/v1/conversas/{cid}/mensagens",
                     json={"texto": "Posso juntar dois cupões no mesmo pedido?"}, headers=_h("tok-aida"))
    assert r.headers["content-type"].startswith("text/event-stream")
    eventos = _eventos(r.text)
    assert eventos[0][0] == "token" and eventos[-1][0] == "fim"
    assert any(e == "citacao" and d["id"] == "pol-cupoes" for e, d in eventos)`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O `TestClient` sem `with` e o `AsyncClient` que não corre o `lifespan`',
        text:
          'Um `TestClient(app)` sem `with` não dispara o `lifespan`: `app.state.servicos` não existe e o primeiro pedido rebenta com `AttributeError`, ou pior, passa porque alguém criou um global para «resolver». O `httpx.AsyncClient` com `ASGITransport` tem dois limites a conhecer: não corre o `lifespan` (entra-se nele com `app.router.lifespan_context(app)`), e junta o corpo inteiro antes de devolver a resposta — serve para verificar os eventos, não para medir TTFT nem testar cancelamento. Para isso, sobe-se um uvicorn real numa porta local.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O mesmo teste em assíncrono, com `httpx.AsyncClient` e o `lifespan` explícito (verificado contra o laboratório: 200 e 33 eventos).',
        code: String.raw`import httpx
import pytest
from balcao.api.app import create_app

@pytest.fixture
async def cliente_async(cfg):
    app = create_app(cfg)
    async with app.router.lifespan_context(app):                 # o ASGITransport não o faz por ti
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="http://teste") as c:
            yield c

async def test_stream_async(cliente_async):
    h = {"Authorization": "Bearer tok-aida"}
    cid = (await cliente_async.post("/v1/conversas", json={}, headers=h)).json()["id"]
    async with cliente_async.stream("POST", f"/v1/conversas/{cid}/mensagens",
                                    json={"texto": "A que horas fecham?"}, headers=h) as r:
        tipos = [l.split(": ", 1)[1] async for l in r.aiter_lines() if l.startswith("event:")]
    assert r.status_code == 200 and tipos[-1] == "fim"`,
      },
      {
        type: 'table',
        head: ['Nível', 'Ferramenta', 'Apanha', 'Não apanha'],
        rows: [
          ['Unidade', 'pytest sobre funções (`_sse`, guardas, esquemas)', 'Formato dos eventos, validações', 'Integração com o grafo'],
          ['API em processo', '`TestClient` / `AsyncClient` + `ASGITransport`', 'Contrato HTTP, auth, erros, sequência de eventos', 'Buffering, cancelamento real, TTFT'],
          ['API com servidor real', 'uvicorn numa porta + `httpx` com stream', 'Cancelamento, heartbeat, graceful shutdown', 'Comportamento do modelo real'],
          ['Contra PostgreSQL', 'Marca `postgres` no serviço do CI', 'SQL, checkpointer, pool', 'Qualidade das respostas'],
          ['Evals', 'Conjunto dourado (módulos 20–23)', 'Qualidade por intenção', 'Nada disto acima'],
        ],
        caption: 'Cada nível existe porque o anterior tem um ponto cego concreto.',
      },
      {
        type: 'h',
        text: 'uvicorn: workers ou réplicas?',
      },
      {
        type: 'p',
        text:
          'Um processo Python com um event loop aguenta muitas ligações SSE abertas ao mesmo tempo, porque cada uma passa a maior parte do tempo à espera do fornecedor. Faz a conta do «Balcão»: no teste de carga do RNF-03 chegam 35 mensagens por minuto e cada turno dura ≈ 4,4 s, logo há em média 35 / 60 × 4,4 ≈ 2,6 streams abertos. Não é a concorrência que limita o serviço: é o rate limit do fornecedor (módulo 30). O que justifica mais processos é a CPU (guardas, re-ranking local, serialização) e a disponibilidade.',
      },
      {
        type: 'code',
        lang: 'bash',
        caption: 'Três formas de correr o mesmo serviço. No contentor, um processo; escala-se com réplicas.',
        code: `# desenvolvimento: recarga automática, uma porta local
uv run uvicorn balcao.api.app:create_app --factory --reload --port 8000

# contentor (o CMD da imagem): um processo, atrás de um balanceador
uvicorn balcao.api.app:create_app --factory --host 0.0.0.0 --port 8000 \\
  --proxy-headers --timeout-graceful-shutdown 20

# máquina virtual sem orquestrador: vários workers no mesmo host
uvicorn balcao.api.app:create_app --factory --host 0.0.0.0 --port 8000 --workers 4

# ver o stream a chegar, sem buffering do curl
curl -N -X POST localhost:8000/v1/conversas/CV-a32d0e87277d/mensagens \\
  -H 'Authorization: Bearer dev-aida' -H 'Content-Type: application/json' \\
  -d '{"texto": "A que horas fecham?"}'`,
      },
      {
        type: 'compare',
        left: {
          title: '`--workers N` num contentor',
          items: [
            'N lifespans: N pools de ligações ao PostgreSQL e N índices em memória.',
            'O orquestrador vê um contentor; um worker em ciclo de crash passa despercebido.',
            'Métricas Prometheus por processo precisam do modo multiprocesso.',
            'Útil numa VM sem orquestrador.',
          ],
        },
        right: {
          title: 'Um processo por contentor, N réplicas (a escolha)',
          items: [
            'O `HEALTHCHECK` e as sondas falam com o único processo que existe.',
            'Escalar é mudar um número no orquestrador, com métricas por réplica.',
            'O pool de ligações total é réplicas × `pool_max`: fácil de dimensionar contra o PostgreSQL gerido.',
            'Custa: um pouco mais de memória por réplica.',
          ],
        },
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Graceful shutdown com streams abertos',
        text:
          'Num deploy, o orquestrador manda SIGTERM. O uvicorn deixa de aceitar ligações e espera pelos pedidos em curso até `--timeout-graceful-shutdown` (20 s no «Balcão»); um turno dura ≈ 4,4 s, por isso 20 s chega para os streams terminarem. O `terminationGracePeriodSeconds` do orquestrador tem de ser maior do que esse valor, e o `preStop` dá tempo ao balanceador para retirar a réplica antes — senão chegam pedidos novos a um processo que já está a fechar.',
      },
      {
        type: 'refs',
        items: [
          { label: 'FastAPI — Testing', url: 'https://fastapi.tiangolo.com/tutorial/testing/' },
          { label: 'FastAPI — Async Tests', url: 'https://fastapi.tiangolo.com/advanced/async-tests/' },
          { label: 'Uvicorn — Deployment', url: 'https://www.uvicorn.org/deployment/' },
        ],
      },
    ],
  },
];

/* ================================================================= quiz */

export const quizM25: Question[] = [
  {
    id: 'q-fastapi-servico-01',
    topic: 'fastapi',
    prompt: 'Uma rota `async def` do «Balcão» chama `psycopg.connect(...)` (síncrono) para ler a conversa. Em carga, o que acontece primeiro?',
    options: [
      'Nada de especial: o FastAPI detecta a chamada síncrona e move-a para um thread.',
      'O event loop fica bloqueado durante cada ligação, e todos os streams SSE abertos nesse processo param de receber eventos.',
      'O pedido falha com `RuntimeError` porque não se pode chamar código síncrono em `async def`.',
      'Só esse pedido fica mais lento; os outros não são afectados.',
    ],
    answer: [1],
    explain:
      'Uma rota `async def` corre no event loop e o FastAPI não inspecciona o que ela chama. Uma chamada bloqueante pára o loop inteiro: os outros pedidos e os streams abertos no mesmo processo congelam. Ou a rota passa a `def` (vai para o thread pool), ou a chamada vai para `run_in_threadpool`, ou usa-se o driver assíncrono.',
    why: [
      'O FastAPI só usa o thread pool para rotas `def`; não reescreve o corpo de uma `async def`.',
      'Correcto: bloqueia o loop, que é partilhado por todos os pedidos do processo.',
      'Python deixa chamar código síncrono em funções assíncronas; o problema é de desempenho, não um erro.',
      'Afecta todos os pedidos do processo, não só o que faz a chamada.',
    ],
  },
  {
    id: 'q-fastapi-servico-02',
    topic: 'sse',
    prompt: 'O painel do servidor mostra TTFT p95 de 1,3 s, mas o TTFT medido na aplicação é de 4 s. Que causas são plausíveis?',
    options: [
      'Um proxy ou gateway entre o cliente e o uvicorn com buffering de resposta ligado.',
      'O modelo médio está a gerar mais devagar do que o costume.',
      'Uma camada nova (WAF, sidecar) que junta a resposta antes de a reencaminhar.',
      'O `lifespan` está a recriar o grafo em cada pedido.',
    ],
    answer: [0, 2],
    explain:
      'Quando o servidor mede bem e o cliente mede mal, a diferença está no caminho entre os dois. Buffering num proxy, ou numa camada nova que acumula o corpo, faz o cliente ver os eventos em bloco. É a validação do adr-0021: diferença acima de 300 ms entre as duas medições indica buffering.',
    why: [
      'Correcto: é a causa mais comum, e `X-Accel-Buffering: no` só resolve o nginx.',
      'Um modelo mais lento subiria também o TTFT medido no servidor.',
      'Correcto: WAFs e sidecars de service mesh podem acumular o corpo.',
      'Isso subiria o TTFT no servidor, que está bem.',
    ],
  },
  {
    id: 'q-fastapi-servico-03',
    topic: 'sse',
    prompt: 'O grafo lança uma excepção aos 2 s de um turno, depois de 30 eventos `token` enviados. O que recebe o cliente?',
    options: [
      'Um 500 com corpo `application/problem+json`.',
      'O estado 200 que já recebeu, seguido de um evento `erro` com um Problem Details, e o fim do stream.',
      'Um 502 da gateway.',
      'Nada: o stream fica aberto até ao timeout do cliente.',
    ],
    answer: [1],
    explain:
      'O estado HTTP e os cabeçalhos vão no primeiro envio; depois disso não há forma de os mudar. O gerador apanha a excepção (`except Exception`) e emite um evento `erro` com a forma da RFC 9457. O cliente tem de tratar o `erro` como fim do turno e pode oferecer repetir.',
  },
  {
    id: 'q-fastapi-servico-04',
    topic: 'fastapi',
    prompt: 'Porque é que o «Balcão» responde 404, e não 403, quando a Aida pede a conversa do Nelson?',
    options: [
      'Porque o FastAPI não suporta 403 em dependências.',
      'Porque 403 confirmaria que a conversa existe, tornando ids enumeráveis.',
      'Porque 404 é retentável e 403 não.',
      'Porque a conversa do Nelson é apagada quando outro cliente a pede.',
    ],
    answer: [1],
    explain:
      'Não revelar a existência de um recurso a quem não tem acesso é a mesma regra que as ferramentas seguem com o `cliente_id` do token. O supervisor, que tem acesso, recebe 200.',
  },
  {
    id: 'q-fastapi-servico-05',
    topic: 'fastapi',
    prompt: 'O `/healthz` do «Balcão» verifica a ligação ao PostgreSQL. O PostgreSQL gerido faz failover durante 40 s. O que acontece?',
    options: [
      'As réplicas saem do balanceador e voltam quando a base de dados volta.',
      'A liveness falha, o orquestrador reinicia todas as réplicas, e quando a base de dados volta o serviço inteiro ainda está a arrancar.',
      'Nada: o `lifespan` reconecta sozinho.',
      'O uvicorn devolve 503 a todos os pedidos, que é o comportamento certo.',
    ],
    answer: [1],
    explain:
      'É por isso que a vivacidade não toca em dependências. A prontidão (`/readyz`) é que verifica a base de dados: com ela a 503, a réplica sai do balanceador sem ser reiniciada.',
  },
  {
    id: 'q-fastapi-servico-06',
    topic: 'fastapi',
    prompt: 'Um teste usa `httpx.AsyncClient(transport=httpx.ASGITransport(app=app))` sem mais nada. Que problemas vai ter?',
    options: [
      'O `lifespan` não corre, logo `app.state.servicos` não existe.',
      'O corpo do stream chega todo de uma vez: não serve para medir TTFT nem testar cancelamento.',
      'Não consegue enviar cabeçalhos `Authorization`.',
      'Abre uma porta TCP aleatória e falha em CI.',
    ],
    answer: [0, 1],
    explain:
      'O `ASGITransport` do httpx chama a aplicação directamente, sem `lifespan`, e junta as partes do corpo antes de devolver a resposta. Entra-se no `lifespan` com `app.router.lifespan_context(app)`; testes de TTFT e cancelamento precisam de um uvicorn real.',
  },
  {
    id: 'q-fastapi-servico-07',
    topic: 'sse',
    prompt: 'Porque é que a aplicação móvel não usa a API `EventSource` do browser para ler o stream do «Balcão»?',
    options: [
      'Porque `EventSource` não suporta eventos com nome.',
      'Porque `EventSource` só faz `GET`, sem corpo nem cabeçalhos próprios, e o turno é um `POST` autenticado.',
      'Porque `EventSource` não reconecta.',
      'Porque `EventSource` só funciona em HTTP/2.',
    ],
    answer: [1],
    explain:
      'A API `EventSource` suporta eventos nomeados, `Last-Event-ID` e reconexão automática, mas só pedidos `GET` sem cabeçalhos definidos pela aplicação. Um turno é `POST` com corpo e `Authorization`, por isso lê-se com `fetch` e um parser próprio.',
  },
  {
    id: 'q-fastapi-servico-08',
    topic: 'fastapi',
    prompt: 'O ciclo do stream está dentro de `try: ... except BaseException: log.error(...)`. Um cliente fecha a aplicação a meio. Consequência?',
    options: [
      'O `CancelledError` é engolido; o turno pode continuar a gerar e a pagar tokens para uma ligação morta.',
      'O uvicorn mata o processo.',
      'O cliente recebe um evento `erro`.',
      'Nenhuma: `CancelledError` não é `BaseException`.',
    ],
    answer: [0],
    explain:
      '`asyncio.CancelledError` herda de `BaseException` desde o Python 3.8 precisamente para escapar a `except Exception`. Apanhá-lo sem voltar a lançá-lo anula o cancelamento. Se precisas de o registar, regista e faz `raise`.',
  },
  {
    id: 'q-fastapi-servico-09',
    topic: 'fastapi',
    prompt: 'O «Balcão» corre em 4 réplicas com `pool_max=10`, e alguém sugere passar a `--workers 4` em cada contentor. Que efeitos tem?',
    options: [
      'O número máximo de ligações ao PostgreSQL passa de 40 para 160.',
      'Cada worker corre o seu `lifespan`, com índice e grafo próprios em memória.',
      'O TTFT desce para um quarto.',
      'Os streams SSE deixam de funcionar.',
    ],
    answer: [0, 1],
    explain:
      'Cada worker é um processo com o seu `lifespan`: pools, índices e caches multiplicam-se. O TTFT depende do modelo, não do número de processos. A regra do laboratório é um processo por contentor e escalar com réplicas.',
  },
];

/* ============================================================ exercícios */

export const exerciciosM25: Exercise[] = [
  {
    id: 'e-fastapi-servico-01',
    title: 'Quantos streams abertos no pico?',
    statement:
      'No pico de sexta às 20h o «Balcão» recebe ≈ 11 mensagens por minuto. Cada turno dura ≈ 4,4 s. Pela lei de Little, quantos streams SSE estão abertos em média nesse momento? Arredonda a uma casa decimal.',
    kind: 'input',
    accept: ['0.8', '0,8', '0.81', '0,81'],
    hint: 'L = λ × W, com λ em mensagens por segundo.',
    solution:
      '11 / 60 = 0,183 mensagens por segundo; × 4,4 s ≈ 0,8 streams abertos em média. Mesmo com a margem de 3× do RNF-03 (35 por minuto) são ≈ 2,6. A concorrência de ligações não é o problema do serviço; o limite está no rate limit do fornecedor e no custo.',
    difficulty: 1,
  },
  {
    id: 'e-fastapi-servico-02',
    title: 'Idempotência de um turno em rede móvel',
    statement:
      'O contrato do endpoint exige `Idempotency-Key`. Uma cliente em Matola envia «Quero cancelar o PD-8841990», a rede cai depois de o servidor receber o pedido, e a aplicação reenvia com a mesma chave. Desenha o comportamento do servidor para: (a) o primeiro turno ainda está a correr; (b) já acabou; (c) chave igual mas texto diferente. Diz onde guardas a chave e por quanto tempo.',
    kind: 'design',
    hint: 'Pensa no que o cliente precisa de receber em cada caso e no que nunca pode acontecer duas vezes (a ferramenta `cancelar-pedido`).',
    solution:
      'Tabela `idempotencia (conversa_id, chave, hash_do_corpo, estado, mensagem_id, criada_em)` com chave única (conversa_id, chave), inserida na mesma transacção que grava a mensagem do cliente, antes do stream. (a) A inserção falha por duplicado com estado `a_correr`: responde 409 «Turno em curso» com `Retry-After: 2`, ou junta-se ao stream existente se houver um broker de eventos (não há no «Balcão»: 409 chega). (b) Estado `concluido`: devolve de novo o resultado — um stream curto com um único `token` com o texto final e o `fim` com o mesmo `mensagem_id` — sem correr o grafo. (c) Hash diferente: 422 «Chave de idempotência reutilizada com outro corpo». Retenção: 24 h chegam para reenvios de rede; a ferramenta de cancelamento continua a ter a sua própria chave de idempotência, porque a idempotência HTTP não protege retentativas internas do grafo.',
    difficulty: 3,
  },
  {
    id: 'e-fastapi-servico-03',
    title: 'Onde falha e com que código',
    statement:
      'Para cada situação, diz se o cliente recebe um estado HTTP próprio ou um evento `erro`, e qual: (1) mensagem com 2 500 caracteres; (2) o fornecedor devolve 529 durante a geração, depois de 2 retentativas; (3) a conversa está `a_aguardar_aprovacao`; (4) o turno ultrapassa 20 s; (5) token expirado.',
    kind: 'open',
    solution:
      '(1) 422 Problem Details: a validação do esquema corre antes da rota. (2) Evento `erro` com status 502 ou 503 no corpo: aconteceu depois do primeiro byte (o 200 já foi). (3) 409 Problem Details, verificado na rota antes de devolver a `StreamingResponse`. (4) Evento `erro` 504 do `asyncio.timeout` do gerador, e o grafo é cancelado. (5) 401 Problem Details da dependência de autenticação. A linha divisória é sempre a mesma: antes ou depois de devolver a `StreamingResponse`.',
    difficulty: 2,
  },
  {
    id: 'e-fastapi-servico-04',
    title: 'Um teste de cancelamento a sério',
    statement:
      'Escreve um teste pytest que prove que, quando o cliente desliga a meio do stream, o span do modelo termina como cancelado e o repositório não grava a mensagem do assistente. Diz porque é que o `TestClient` não chega e o que usas em vez dele.',
    kind: 'code',
    hint: 'Sobe um uvicorn real numa thread com `uvicorn.Server(uvicorn.Config(...))`, e usa `httpx` com `stream` para ler dois eventos e sair do contexto.',
    solution:
      'O `TestClient` e o `ASGITransport` juntam a resposta e não simulam uma desconexão TCP a meio. Teste: fixture que cria `uvicorn.Config(create_app(cfg_lento), port=0 ou porta livre)` com um modelo simulado que dorme 50 ms por pedaço, arranca `uvicorn.Server(config).run` numa thread e espera por `server.started`. No teste: `with httpx.stream("POST", url, json=..., headers=...) as r:` lê duas linhas `event: token` com `iter_lines()` e sai do `with` (fecha a ligação). Depois espera até 1 s pelo repositório e verifica `len(repo.listar_mensagens(cid)) == 1` (só a do cliente) e que o exportador de spans em memória tem o span `chat` com estado de erro/cancelado. Por fim `server.should_exit = True`.',
    difficulty: 3,
  },
  {
    id: 'e-fastapi-servico-05',
    title: 'O conector de WhatsApp',
    statement:
      'O WhatsApp não mostra texto a crescer: cada mensagem enviada é uma bolha. O conector consome o mesmo endpoint SSE. Propõe como converte o stream em mensagens de WhatsApp, e que parte do contrato do endpoint torna isto simples.',
    kind: 'open',
    solution:
      'Duas opções: esperar pelo evento `fim` e enviar o `texto` final numa só bolha (o contrato já o suporta com `Accept: application/json`, que espera pelo fim); ou partir por frases, enviando uma bolha por frase completa, o que dá sinal de vida em respostas longas mas arrisca enviar uma frase que a guarda de saída depois substitui (o `fim` traz `substituir: true` nesse caso, e no WhatsApp não se apaga uma bolha). Para o «Balcão», a opção segura é esperar pelo `fim`, porque as respostas são curtas (≈ 180 tokens) e o texto validado é o do `fim`. Os eventos `ferramenta` podem virar um indicador «a escrever».',
    difficulty: 2,
  },
];

/* ================================================================= labs */

export const labsM25: Lab[] = [
  {
    id: 'lab-fastapi-servico-01',
    moduleId: 'fastapi-servico',
    title: 'Uma rota SSE que não mente ao cliente',
    brief:
      'Completa a rota `POST /v1/eco/{conversa_id}` que reemite em SSE os pedaços de um gerador de texto. Tem de devolver `text/event-stream` com os cabeçalhos anti-buffering, validar o pedido antes do primeiro byte, emitir `fim`, converter falhas em eventos `erro`, e deixar o cancelamento propagar.',
    lang: 'python',
    starter: String.raw`import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class Pedido(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)


def sse(evento: str, dados: dict) -> str:
    return f"event: {evento}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"


async def gerar(texto: str) -> AsyncIterator[str]:
    for palavra in texto.split():
        yield palavra + " "


@router.post("/v1/eco/{conversa_id}")
async def eco(conversa_id: str, corpo: Pedido):
    # TODO: devolver um stream SSE com eventos token e fim
    partes = [p async for p in gerar(corpo.texto)]
    return {"texto": "".join(partes)}`,
    checks: [
      { id: 'streaming', label: 'Devolve uma StreamingResponse', re: 'StreamingResponse\\(' },
      { id: 'media', label: 'Com media_type text/event-stream', re: 'media_type\\s*=\\s*"text/event-stream"' },
      { id: 'nocache', label: 'Cabeçalho Cache-Control: no-cache', re: '"Cache-Control"\\s*:\\s*"no-cache"' },
      { id: 'accel', label: 'Cabeçalho X-Accel-Buffering: no', re: '"X-Accel-Buffering"\\s*:\\s*"no"' },
      { id: 'fim', label: 'Emite um evento fim', re: 'sse\\(\\s*"fim"' },
      { id: 'erro', label: 'Converte excepções num evento erro', re: 'except Exception[\\s\\S]*sse\\(\\s*"erro"' },
      { id: 'nobase', label: 'Não engole o cancelamento', re: 'except\\s*(BaseException)?\\s*:', forbid: true, why: 'Um `except:` ou `except BaseException:` apanha o `CancelledError` do cliente que desligou.' },
      { id: 'nojson', label: 'Não junta a resposta toda antes de a enviar', re: 'return\\s*\\{\\s*"texto"', forbid: true, why: 'Juntar tudo e devolver JSON é exactamente o que o streaming existe para evitar.' },
    ],
    hints: [
      'Escreve um gerador assíncrono interno que faz `yield sse("token", {...})` por cada pedaço, e `yield sse("fim", {...})` no fim.',
      'O `try/except Exception` fica dentro do gerador, à volta do ciclo; o `CancelledError` passa porque não é `Exception`.',
      'Os cabeçalhos vão no argumento `headers=` da `StreamingResponse`.',
    ],
    solution: String.raw`import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()
log = logging.getLogger(__name__)


class Pedido(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)


def sse(evento: str, dados: dict) -> str:
    return f"event: {evento}\ndata: {json.dumps(dados, ensure_ascii=False)}\n\n"


async def gerar(texto: str) -> AsyncIterator[str]:
    for palavra in texto.split():
        yield palavra + " "


@router.post("/v1/eco/{conversa_id}")
async def eco(conversa_id: str, corpo: Pedido) -> StreamingResponse:
    # A validação (Pedido) já correu: aqui só chega um pedido válido.
    async def eventos() -> AsyncIterator[str]:
        mostrado: list[str] = []
        try:
            async for pedaco in gerar(corpo.texto):
                mostrado.append(pedaco)
                yield sse("token", {"texto": pedaco})
            yield sse("fim", {"conversa_id": conversa_id, "texto": "".join(mostrado).strip()})
        except Exception as e:  # CancelledError não é Exception: o cancelamento propaga
            log.exception("eco falhou em %s", conversa_id)
            yield sse("erro", {"type": "about:blank", "title": "Erro ao processar a mensagem",
                               "status": 500, "detail": type(e).__name__})

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )`,
    difficulty: 2,
  },
  {
    id: 'lab-fastapi-servico-02',
    moduleId: 'fastapi-servico',
    title: 'Problem Details em todas as saídas de erro',
    brief:
      'A aplicação devolve erros no formato por omissão do FastAPI, e o handler de validação inclui o valor recebido (com PII). Regista handlers que devolvem `application/problem+json` (RFC 9457) para erros de domínio, de validação e inesperados, sem stack traces nem o input do cliente.',
    lang: 'python',
    starter: String.raw`from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import traceback

app = FastAPI()


class ErroProblema(Exception):
    def __init__(self, status_code: int, title: str, detail: str | None = None) -> None:
        self.status_code, self.title, self.detail = status_code, title, detail


@app.exception_handler(Exception)
async def tudo(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse({"erro": traceback.format_exc()}, status_code=500)`,
    checks: [
      { id: 'mt', label: 'Usa application/problem+json', re: 'media_type\\s*=\\s*"application/problem\\+json"' },
      { id: 'dom', label: 'Handler para ErroProblema', re: 'exception_handler\\(\\s*ErroProblema\\s*\\)' },
      { id: 'val', label: 'Handler para RequestValidationError', re: 'exception_handler\\(\\s*RequestValidationError\\s*\\)' },
      { id: 'campos', label: 'O corpo tem type, title e status', re: '"type"[\\s\\S]*"title"[\\s\\S]*"status"' },
      { id: 'instance', label: 'Preenche instance com o caminho do pedido', re: 'request\\.url\\.path' },
      { id: 'tb', label: 'Não devolve stack traces', re: 'format_exc\\(', forbid: true, why: 'O stack trace vai para o log (`log.exception`), nunca para o cliente.' },
      { id: 'input', label: 'Não devolve o input do cliente', re: '\\[\\s*"input"\\s*\\]', forbid: true, why: 'O `input` de um erro de validação pode ser a mensagem do cliente com PII (RNF-04).' },
    ],
    hints: [
      'Escreve uma função `problema(status, title, detail, request)` que monta o dicionário e a `JSONResponse` com o `media_type` certo.',
      'Para a validação, usa `exc.errors()` e junta só `loc` e `msg` de cada erro.',
      'No handler de `Exception`, usa `log.exception(...)` e devolve um `title` genérico.',
    ],
    solution: String.raw`import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()
log = logging.getLogger(__name__)


class ErroProblema(Exception):
    def __init__(self, status_code: int, title: str, detail: str | None = None) -> None:
        self.status_code, self.title, self.detail = status_code, title, detail


def problema(status: int, title: str, detail: str | None, request: Request) -> JSONResponse:
    corpo = {"type": "about:blank", "title": title, "status": status, "instance": request.url.path}
    if detail:
        corpo["detail"] = detail
    return JSONResponse(corpo, status_code=status, media_type="application/problem+json")


@app.exception_handler(ErroProblema)
async def dominio(request: Request, exc: ErroProblema) -> JSONResponse:
    return problema(exc.status_code, exc.title, exc.detail, request)


@app.exception_handler(RequestValidationError)
async def validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    campos = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return problema(422, "Pedido inválido", campos, request)


@app.exception_handler(Exception)
async def inesperado(request: Request, exc: Exception) -> JSONResponse:
    log.exception("erro não tratado em %s", request.url.path)
    return problema(500, "Erro interno", None, request)`,
    difficulty: 1,
  },
  {
    id: 'lab-fastapi-servico-03',
    moduleId: 'fastapi-servico',
    title: 'Enquadrar eventos SSE com id, várias linhas e heartbeat',
    brief:
      'O contrato pede `id` sequencial em cada evento e um comentário `: ping` como heartbeat. Escreve `evento(tipo, dados, ident)`, que produz um evento SSE válido mesmo quando os dados têm quebras de linha, e `ping()`. Os `assert` no fim verificam o formato; a solução corre no browser.',
    lang: 'python',
    starter: String.raw`import json


def evento(tipo: str, dados, ident: int) -> str:
    texto = dados if isinstance(dados, str) else json.dumps(dados, ensure_ascii=False)
    return "event: " + tipo + "\ndata: " + texto + "\n"


def ping() -> str:
    return ""


e = evento("token", {"texto": "Olá"}, 1)
assert e == 'event: token\nid: 1\ndata: {"texto": "Olá"}\n\n', e
m = evento("aviso", "linha um\nlinha dois", 2)
assert m == "event: aviso\nid: 2\ndata: linha um\ndata: linha dois\n\n", m
assert ping() == ": ping\n\n"
print("ok")`,
    checks: [
      { id: 'id', label: 'Escreve a linha id', re: '"id: "|f"[^"]*id: \\{' },
      { id: 'split', label: 'Parte os dados por linhas', re: '\\.splitlines\\(\\)|\\.split\\(\\s*"\\\\n"\\s*\\)' },
      { id: 'vazia', label: 'Termina o evento com uma linha vazia', re: '\\\\n\\\\n' },
      { id: 'ping', label: 'O heartbeat é um comentário SSE', re: 'return\\s*":\\s*ping' },
    ],
    hints: [
      'Cada linha dos dados vira uma linha `data: ...`; o receptor junta-as com `\\n`.',
      'O evento termina com uma linha vazia, ou seja, o texto acaba em dois `\\n` seguidos.',
      'Uma linha que começa por `:` é ignorada pelo receptor: serve de heartbeat.',
    ],
    solution: String.raw`import json


def evento(tipo: str, dados, ident: int) -> str:
    texto = dados if isinstance(dados, str) else json.dumps(dados, ensure_ascii=False)
    linhas = [f"event: {tipo}", f"id: {ident}"]
    linhas += [f"data: {l}" for l in texto.split("\n")]
    return "\n".join(linhas) + "\n\n"


def ping() -> str:
    return ": ping\n\n"


e = evento("token", {"texto": "Olá"}, 1)
assert e == 'event: token\nid: 1\ndata: {"texto": "Olá"}\n\n', e
m = evento("aviso", "linha um\nlinha dois", 2)
assert m == "event: aviso\nid: 2\ndata: linha um\ndata: linha dois\n\n", m
assert ping() == ": ping\n\n"
print("ok")`,
    difficulty: 1,
    executavel: true,
  },
];

/* ============================================================ casos de uso */

export const casosM25: UseCase[] = [
  {
    id: 'uc-fastapi-servico-01',
    title: 'Um operador de telecomunicações com a mesma API na aplicação, no WhatsApp e no balcão de loja',
    area: 'Telecomunicações · Moçambique',
    level: 2,
    scenario:
      'Um operador móvel em Moçambique põe um assistente de apoio a responder sobre pacotes de dados, saldo e carregamentos. Três canais consomem o mesmo serviço: a aplicação (quer texto a crescer), o WhatsApp (uma bolha por resposta) e o terminal dos funcionários de loja (uma aplicação web interna atrás de um proxy corporativo antigo). Na primeira semana, a loja queixa-se de que o assistente «demora 6 segundos a dizer qualquer coisa», enquanto o painel do serviço mostra TTFT p95 de 1,2 s.',
    requirements: [
      'Primeira palavra com p95 abaixo de 1,5 s na aplicação e na loja, medida no cliente.',
      'Uma só implementação do turno para os três canais.',
      'O custo de tokens de turnos abandonados abaixo de 2% do total.',
      'Erros com o mesmo formato em todos os canais, legíveis pela gateway.',
    ],
    constraints: [
      'O proxy corporativo da rede de lojas é gerido por outra equipa e faz buffering por omissão.',
      'O WhatsApp Business não permite editar uma mensagem já enviada ao cliente.',
    ],
    approach: [
      { title: 'Um endpoint SSE e negociação por `Accept`', text: 'O turno é sempre um gerador de eventos. Com `Accept: text/event-stream` sai em streaming; com `Accept: application/json` o servidor consome o próprio gerador até ao `fim` e devolve só o resultado — é o que o conector de WhatsApp usa.' },
      { title: 'TTFT medido nos dois lados', text: 'A aplicação e o terminal de loja reportam o TTFT com o feedback. A diferença de 4,8 s na loja apontou para o proxy; a correcção foi uma excepção de buffering para o domínio do assistente e, até ela chegar, heartbeat e primeiro evento com 8 KB de comentário de enchimento (removido depois).' },
      { title: 'Cancelamento e orçamento', text: 'O gerador propaga o cancelamento até ao cliente HTTP do fornecedor. Os turnos abandonados passaram de 11% dos tokens de saída para 1,4%.' },
      { title: 'Problem Details e evento erro', text: 'Erros antes do stream em `application/problem+json`; depois do stream, um evento `erro` com o mesmo corpo. O conector de WhatsApp traduz ambos para uma mensagem fixa e passa a um humano.' },
    ],
    diagram: {
      title: 'Três canais, um gerador de eventos',
      caption: 'A negociação por `Accept` decide só o transporte; a lógica do turno é uma.',
      cols: 4,
      rows: 3,
      zones: [
        { id: 'canais', label: 'Canais', col: 0, row: 0, colSpan: 1, rowSpan: 3, tone: 'edge' },
        { id: 'svc', label: 'Serviço FastAPI', col: 2, row: 0, colSpan: 2, rowSpan: 3, tone: 'service' },
      ],
      nodes: [
        { id: 'app', label: 'Aplicação', sub: 'SSE', col: 0, row: 0, kind: 'user' },
        { id: 'loja', label: 'Terminal de loja', sub: 'SSE', col: 0, row: 1, kind: 'user' },
        { id: 'wa', label: 'Conector WhatsApp', sub: 'Accept: application/json', col: 0, row: 2, kind: 'user' },
        { id: 'proxy', label: 'Proxy corporativo', sub: 'buffering desligado para o domínio', col: 1, row: 1, kind: 'external' },
        { id: 'gw', label: 'Gateway', col: 1, row: 0, kind: 'external' },
        { id: 'rota', label: 'Rota do turno', sub: 'valida antes do 1.º byte', col: 2, row: 1, kind: 'service' },
        { id: 'gerador', label: 'Gerador de eventos', sub: 'token, ferramenta, fim, erro', col: 3, row: 1, kind: 'agent' },
        { id: 'agreg', label: 'Agregador', sub: 'consome até ao fim', col: 2, row: 2, kind: 'service' },
      ],
      edges: [
        { from: 'app', to: 'gw' },
        { from: 'loja', to: 'proxy' },
        { from: 'proxy', to: 'gw' },
        { from: 'gw', to: 'rota' },
        { from: 'wa', to: 'agreg' },
        { from: 'agreg', to: 'gerador', label: 'mesmo gerador' },
        { from: 'rota', to: 'gerador', label: 'StreamingResponse' },
      ],
    },
    solution:
      'Um só gerador de eventos por turno, exposto em SSE ou em JSON conforme o `Accept`; cabeçalhos anti-buffering e excepção no proxy da rede de lojas; TTFT medido no cliente com alarme sobre a diferença para o servidor; cancelamento propagado até ao fornecedor.',
    tools: [
      { name: 'FastAPI + StreamingResponse', role: 'Rota e stream SSE' },
      { name: 'uvicorn', role: 'Servidor ASGI, um processo por contentor' },
      { name: 'Prometheus', role: 'TTFT no servidor e no cliente, tokens por turno' },
    ],
    rejected: [
      { option: 'WebSocket para a aplicação e HTTP para o WhatsApp', why: 'Duas implementações do turno a divergir, e o proxy da loja bloqueava o upgrade.' },
      { option: 'Long polling', why: 'Uma ida e volta por pedaço: o TTFT melhora mas o custo de pedidos e a complexidade no cliente sobem.' },
      { option: 'Endpoint separado sem streaming para o WhatsApp', why: 'Mesma lógica duplicada; o agregador sobre o gerador dá o mesmo resultado com uma só implementação.' },
    ],
    costNote:
      'O cancelamento propagado poupou ≈ 9,6% dos tokens de saída do mês; o proxy da loja custou duas semanas de pedidos entre equipas — o tempo de ciclo que mais vale antecipar.',
    takeaways: [
      'O TTFT do servidor não é o TTFT do cliente; mede os dois.',
      'Streaming é um contrato com cada camada do caminho, não uma propriedade da rota.',
      'Um gerador de eventos serve todos os canais; o transporte decide-se à saída.',
    ],
    refs: [
      { label: 'MDN — Server-sent events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events' },
      { label: 'RFC 9457', url: 'https://datatracker.ietf.org/doc/html/rfc9457' },
    ],
  },
];
