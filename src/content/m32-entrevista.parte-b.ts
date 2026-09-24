import type { Section } from '../types';

export const seccoesB: Section[] = [
  /* ==================================================================== 5 */
  {
    id: 'debugging',
    title: 'Cenários de debugging',
    blocks: [
      {
        type: 'p',
        text:
          'A ronda de debugging mede método, não memória. O entrevistador descreve um sintoma («depois do deploy de terça, as recusas triplicaram») e vê o que perguntas primeiro. A resposta fraca propõe logo uma correcção («baixava o limiar de relevância»). A resposta forte localiza: que componente mudou, que sinal o confirma, que experiência o isola — e só depois corrige.',
      },
      {
        type: 'decision',
        tree: {
          id: 'dt-entrevista-01',
          title: 'A qualidade caiu: localizar antes de corrigir',
          start: 'quando',
          nodes: [
            {
              id: 'quando',
              question: 'A queda coincide com um deploy, uma ingestão, ou nenhum dos dois?',
              options: [
                { label: 'Deploy', next: 'deploy' },
                { label: 'Ingestão', next: 'ingestao' },
                { label: 'Nenhum', next: 'externo' },
              ],
            },
            {
              id: 'deploy',
              question: 'O documento certo está no contexto dos turnos maus (span de pesquisa)?',
              options: [
                { label: 'Não', next: 'recuperacao' },
                { label: 'Sim', next: 'geracao' },
              ],
            },
            { id: 'recuperacao', answer: 'Falha de recuperação.', detail: 'Mudou o modelo de embeddings, o chunking, os filtros ou o k? Correr recall@k do conjunto dourado nas duas versões.' },
            { id: 'geracao', answer: 'Falha de geração ou de guarda.', detail: 'Mudou o prompt, o modelo ou a guarda de saída? Comparar respostas da mesma pergunta com o mesmo contexto nas duas versões.' },
            { id: 'ingestao', answer: 'Documentos novos, metadados ou chunks.', detail: 'Os turnos maus citam documentos do lote novo? Reverter a ingestão (idempotente) e corrigir.' },
            {
              id: 'externo',
              question: 'Mudou a distribuição de perguntas (drift) ou o fornecedor?',
              options: [
                { label: 'Perguntas novas', next: 'drift' },
                { label: 'Fornecedor', next: 'fornecedor' },
              ],
            },
            { id: 'drift', answer: 'O conjunto dourado deixou de representar produção.', detail: 'Amostrar conversas da semana, anotar, acrescentar ao conjunto; só depois mexer no sistema.' },
            { id: 'fornecedor', answer: 'Versão de modelo a mudar por trás de um alias, ou degradação do serviço.', detail: 'gen_ai.response.model nos traços; fixar versão com data; avaliação nocturna contra a versão fixada.' },
          ],
        },
      },
      {
        type: 'trace',
        trace: {
          id: 'tr-entrevista-01',
          title: 'Cenário: recusas triplicaram depois do deploy de terça',
          brief: 'O traço de um turno recusado. O deploy trocou o modelo de embeddings na configuração; o índice não foi reingerido.',
          spans: [
            { id: 'p', name: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ms: 1420, attrs: [['http.response.status_code', '200'], ['balcao.recusa', 'true']] },
            { id: 'w', parent: 'p', name: 'invoke_workflow balcao', kind: 'no', ms: 1380, attrs: [['balcao.intencao', 'politica'], ['service.version', 'a1f9c3e']] },
            { id: 'e', parent: 'w', name: 'embeddings modelo-embeddings-v2', kind: 'embedding', ms: 60, attrs: [['gen_ai.operation.name', 'embeddings'], ['gen_ai.request.model', 'modelo-embeddings-v2'], ['gen_ai.embeddings.dimension.count', '768']], detail: 'A mesma dimensão: nada rebentou. Vectores de modelos diferentes com a mesma dimensão comparam-se sem erro e sem significado.' },
            { id: 'r', parent: 'w', name: 'retrieval chunks', kind: 'retriever', ms: 40, attrs: [['gen_ai.operation.name', 'retrieval'], ['balcao.filtro.modelo_embedding', 'modelo-embeddings-v2'], ['balcao.candidatos_densos', '0'], ['balcao.candidatos_lexicais', '12']], detail: 'A consulta filtra por modelo_embedding (adr-0007) e nenhum chunk tem o modelo novo: a metade densa devolve zero. Só o lexical sobrevive.' },
            { id: 'k', parent: 'w', name: 'rerank top-20', kind: 'retriever', ms: 160, attrs: [['balcao.score_max', '0.07'], ['balcao.limiar_relevancia', '0.1']], detail: 'Sem os candidatos densos, os melhores lexicais ficam abaixo do limiar.' },
            { id: 'g', parent: 'w', name: 'recusa (sem chamar o modelo)', kind: 'guarda', ms: 5, attrs: [['balcao.recusa.motivo', 'sem_relevancia']] },
          ],
          note: 'O filtro por modelo_embedding transformou um erro silencioso (respostas com vectores incomparáveis) num erro visível (recusas). Correcção: reingerir com o modelo novo antes de o activar — índice azul/verde, com a versão em cada linha — e um teste de CI que falha se a configuração apontar para um modelo sem chunks.',
        },
      },
      {
        type: 'table',
        head: ['Sintoma', 'Hipótese mais provável', 'Primeiro sinal a ver', 'Correcção'],
        rows: [
          ['Recusas triplicaram depois de um deploy', 'modelo de embeddings trocado sem reindexar', '`gen_ai.request.model` do span embeddings vs `modelo_embedding` dos chunks', 'reingerir antes de activar; teste de CI'],
          ['TTFT subiu 400 ms sem mudar de modelo', 'cache de prompt partida', '`gen_ai.usage.cache_read.input_tokens` por turno', 'repor o prefixo estável; alarme na fracção cacheada'],
          ['Custo por conversa duplicou', 'agente em ciclo ou mais conversas para o agente', 'p99 de chamadas de ferramentas por turno; rota por intenção', 'orçamento de passos; descrição da ferramenta; router'],
          ['Respostas citam uma política antiga', 'filtro de vigência fora da consulta, ou cache semântica', '`balcao.docs` nos traços e origem da resposta', 'filtro na SQL antes do LIMIT; invalidação por documento'],
          ['Juiz dá 92%, feedback piora', 'juiz não calibrado ou enviesado (verbosidade)', 'kappa do juiz contra a revisão humana da semana', 'rubrica binária, modelo diferente, recalibrar'],
          ['2% de JSON inválido no classificador', 'saída livre em vez de estruturada', 'erros de parsing por versão do modelo', '`with_structured_output`, validação Pydantic, fallback por regras'],
          ['Funciona em dev, falha com clientes reais', 'conjunto dourado não representa produção', 'distribuição de intenções e vocabulário das conversas reais', 'amostrar produção para o conjunto; red team com calão'],
        ],
        caption: 'Sete cenários que aparecem em entrevistas e em produção. O padrão é sempre sintoma → sinal no traço ou na métrica → experiência que isola → correcção com teste.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O teste que teria apanhado o cenário do traço antes do deploy: a configuração não pode apontar para um modelo de embeddings sem chunks no índice.',
        code: `import psycopg
import pytest

from balcao.config import obter_config
from balcao.modelos import nome_embeddings


@pytest.mark.postgres
def test_modelo_de_embeddings_configurado_tem_indice():
    cfg = obter_config()
    with psycopg.connect(cfg.conninfo) as conn:
        modelos = {r[0] for r in conn.execute("SELECT DISTINCT modelo_embedding FROM chunks")}
    assert nome_embeddings(cfg) in modelos, (
        f"o serviço vai pesquisar com {nome_embeddings(cfg)!r} mas o índice só tem {sorted(modelos)}: "
        "reingerir antes de activar"
    )`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Mudar o prompt antes de localizar a falha',
        text:
          'É o reflexo mais comum, e na entrevista é o mais penalizado. Se a falha está na recuperação, nenhuma instrução no prompt a resolve; se está num dado desactualizado, o prompt só a esconde. Diz primeiro onde procurarias e o que esperas ver — o entrevistador quer o raciocínio, não o palpite certo.',
      },
      {
        type: 'p',
        text:
          'Um segundo cenário clássico merece resposta preparada: «o modelo prometeu a um cliente um cupão de 200 MZN a que ele não tinha direito». A resposta sénior começa pela pergunta «o valor veio de uma ferramenta ou do texto?». Se veio do texto, a falha é de arquitectura — o dinheiro nunca deve ser gerado — e a correcção é estrutural: o valor vem de `calcular_reembolso`, e a guarda de saída rejeita valores monetários que não estejam no resultado de uma ferramenta desse turno. Se veio da ferramenta, é um bug de regra, com teste unitário.',
      },
      {
        type: 'refs',
        items: [
          { label: 'OpenTelemetry — convenções GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
          { label: 'Langfuse — tracing', url: 'https://langfuse.com/docs/observability/overview' },
          { label: 'Google SRE Book — Effective Troubleshooting', url: 'https://sre.google/sre-book/effective-troubleshooting/' },
        ],
      },
    ],
  },

  /* ==================================================================== 6 */
  {
    id: 'codigo-ao-vivo',
    title: 'Código ao vivo: RRF, recall@k, chunker e ciclo de ferramentas',
    blocks: [
      {
        type: 'p',
        text:
          'Os exercícios de código numa entrevista de AI engineer são pequenos e conhecidos: fusão de rankings, métricas de recuperação, um chunker, um ciclo de ferramentas, parsing de saída estruturada. O que distingue candidatos não é chegar à solução, é o que fazem com os casos de fronteira (lista vazia, empates, documento repetido, JSON inválido), se escrevem a verificação, e se explicam a complexidade. Todas as soluções abaixo foram verificadas contra o módulo `balcao`.',
      },
      {
        type: 'run',
        run: {
          id: 'run-entrevista-02',
          title: 'RRF de raiz, verificado contra a implementação de referência',
          brief: 'Denso e BM25 do runtime didáctico, sem filtros. A ordem de desempate (id) tem de ser determinista — um detalhe que o entrevistador costuma perguntar.',
          code: `import balcao as b

def rrf(rankings, k=60):
    """rankings: listas de ids por ordem. Devolve [(id, score)] por score decrescente."""
    score = {}
    for ranking in rankings:
        for pos, doc in enumerate(ranking, start=1):
            score[doc] = score.get(doc, 0.0) + 1.0 / (k + pos)
    return sorted(score.items(), key=lambda x: (-x[1], x[0]))

q = "Fui cobrado duas vezes no M-Pesa"
denso = b.recuperar(q, k=20, metodo="denso")
lexical = b.recuperar(q, k=20, metodo="bm25")
meu = rrf([[c.id for c, _ in denso], [c.id for c, _ in lexical]])[:5]
ref = [(c.id, round(s, 5)) for c, s in b.rrf(denso, lexical)[:5]]
for (i, s), (j, t) in zip(meu, ref):
    print(f"{i:28s} {s:.5f}   {j:28s} {t:.5f}")
print("iguais:", [i for i, _ in meu] == [j for j, _ in ref])`,
          expected: `pol-cobranca-duplicada#0     0.03279   pol-cobranca-duplicada#0     0.03279
pol-pagamento-mpesa#0        0.03226   pol-pagamento-mpesa#0        0.03226
int-escalamento#0            0.03175   int-escalamento#0            0.03175
pol-pagamento-falhado#0      0.03054   pol-pagamento-falhado#0      0.03054
pol-reembolso-2025#0         0.02971   pol-reembolso-2025#0         0.02971
iguais: True`,
        },
      },
      {
        type: 'p',
        text:
          'O resultado tem uma segunda lição que vale pontos se a disseres sem que perguntem: sem filtros, o terceiro lugar é `int-escalamento` (documento interno, nunca citável ao cliente) e o quinto é `pol-reembolso-2025` (versão substituída). O algoritmo está certo e o sistema estaria errado: os filtros `publico` e `vigente` pertencem à consulta, antes da fusão.',
      },
      {
        type: 'run',
        run: {
          id: 'run-entrevista-03',
          title: 'recall@k e MRR@k de raiz, sobre as 30 perguntas douradas',
          brief: 'O pormenor que separa as boas respostas: contar ao nível do documento (vários chunks do mesmo documento contam uma vez).',
          code: `import balcao as b

def recall_at_k(recuperados, relevantes, k):
    rel = set(relevantes)
    return len(rel & set(recuperados[:k])) / len(rel) if rel else 0.0

def mrr_at_k(recuperados, relevantes, k):
    for i, d in enumerate(recuperados[:k], start=1):
        if d in relevantes:
            return 1.0 / i
    return 0.0

def docs_unicos(resultados):
    vistos = []
    for c, _ in resultados:            # vários chunks do mesmo documento contam uma vez
        if c.doc not in vistos:
            vistos.append(c.doc)
    return vistos

k = 3
for metodo in ("bm25", "denso", "hibrido", "rerank"):
    r, m = [], []
    for p in b.PERGUNTAS:
        docs = docs_unicos(b.recuperar(p["pergunta"], k=30, metodo=metodo))
        r.append(recall_at_k(docs, p["relevantes"], k))
        m.append(mrr_at_k(docs, p["relevantes"], k))
    meu = (round(sum(r) / len(r), 3), round(sum(m) / len(m), 3))
    ref = b.avaliar_recuperacao(metodo, k)
    print(f"{metodo:8s} recall@3={meu[0]:.3f} MRR@3={meu[1]:.3f}  confere: {meu == (ref['recall'], ref['mrr'])}")`,
          expected: `bm25     recall@3=0.833 MRR@3=0.706  confere: True
denso    recall@3=0.900 MRR@3=0.867  confere: True
hibrido  recall@3=0.933 MRR@3=0.828  confere: True
rerank   recall@3=0.950 MRR@3=0.889  confere: True`,
        },
      },
      {
        type: 'p',
        text:
          'Repara que o híbrido tem recall@3 mais alto do que o denso (0,933 vs 0,900) mas MRR@3 mais baixo (0,828 vs 0,867): apanha mais documentos certos no top-3, mas nem sempre em primeiro. É o tipo de observação que um entrevistador quer ouvir — as métricas medem coisas diferentes, e a escolha depende de quantos chunks vão para o contexto.',
      },
      {
        type: 'run',
        run: {
          id: 'run-entrevista-04',
          title: 'Um ciclo de ferramentas com limite de passos e erros como dados',
          brief: 'O `ModeloSimulado` pede ferramentas quando vê um número de pedido e redige a resposta quando recebe o resultado. A estrutura do ciclo é a de qualquer SDK real.',
          code: `import json
import balcao as b

def ciclo(pergunta, max_passos=4):
    modelo = b.ModeloSimulado()
    esquemas = [b.FERRAMENTAS[n]["esquema"] for n in ("ler_pedido", "calcular_reembolso")]
    msgs = [{"role": "system", "content": "És o assistente do Chega."},
            {"role": "user", "content": pergunta}]
    for passo in range(1, max_passos + 1):
        r = modelo.gerar(msgs, esquemas)
        if not r.chamadas:                         # o modelo respondeu: fim do ciclo
            return passo, r.texto
        for ch in r.chamadas:                      # executar e devolver o resultado como mensagem
            resultado = b.executar_ferramenta(ch)  # erros voltam como dados, não como excepção
            print(f"  passo {passo}: {ch['name']}({ch['arguments']}) -> {sorted(resultado)[:4]}")
            msgs.append({"role": "tool", "name": ch["name"], "content": json.dumps(resultado, ensure_ascii=False)})
    return max_passos, "Limite de passos: passo a conversa a um colega."

for q in ["O PD-8841990 chegou atrasado, quero o dinheiro de volta",
          "Onde está o PD-8841273?",
          "O PD-9999999 não chegou"]:
    print(q)
    print("  ->", ciclo(q))`,
          expected: `O PD-8841990 chegou atrasado, quero o dinheiro de volta
  passo 1: calcular_reembolso({'pedido_id': 'PD-8841990', 'motivo': 'atraso'}) -> ['pedido', 'precisa_aprovacao', 'regra', 'tipo']
  -> (2, 'Tem direito a cupão de 200 MZN (atraso de 53 min (> 45)). Posso avançar se confirmar.')
Onde está o PD-8841273?
  passo 1: ler_pedido({'pedido_id': 'PD-8841273'}) -> ['criado_em', 'decorrido_min', 'estado', 'eta_min']
  -> (2, 'O pedido PD-8841273 está a caminho. Chegada estimada em 12 minutos.')
O PD-9999999 não chegou
  passo 1: ler_pedido({'pedido_id': 'PD-9999999'}) -> ['erro']
  -> (2, 'Não consegui concluir: pedido PD-9999999 não encontrado. Vou passar a conversa a um colega.')`,
        },
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O mesmo ciclo com o SDK da Anthropic: `stop_reason == "tool_use"`, blocos `tool_use` na resposta, `tool_result` com `is_error` de volta. As perguntas de seguimento: limite de passos, chamadas paralelas, timeouts por ferramenta, idempotência.',
        code: `import anthropic

cliente = anthropic.Anthropic()


def ciclo(mensagens: list[dict], ferramentas: list[dict], executar, max_passos: int = 6) -> str:
    for _ in range(max_passos):
        r = cliente.messages.create(model=MODELO, max_tokens=400, tools=ferramentas, messages=mensagens)
        mensagens.append({"role": "assistant", "content": r.content})
        if r.stop_reason != "tool_use":
            return "".join(b.text for b in r.content if b.type == "text")
        resultados = []
        for bloco in (b for b in r.content if b.type == "tool_use"):
            try:
                saida, erro = executar(bloco.name, bloco.input), False
            except Exception as e:                       # o erro é informação para o modelo
                saida, erro = f"{type(e).__name__}: {e}", True
            resultados.append({"type": "tool_result", "tool_use_id": bloco.id,
                               "content": str(saida), "is_error": erro})
        mensagens.append({"role": "user", "content": resultados})
    raise RuntimeError("limite de passos: escalar para humano")`,
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'Solução de referência do chunker recursivo (o laboratório 3 pede-o). Complexidade O(n) em palavras por nível de separador; o passo de junção evita chunks minúsculos.',
        code: `SEPARADORES = ("\\n\\n", "\\n", ". ", " ")


def chunk_recursivo(texto: str, max_palavras: int = 80) -> list[str]:
    def partir(t: str, seps: tuple[str, ...]) -> list[str]:
        if len(t.split()) <= max_palavras or not seps:
            return [t.strip()] if t.strip() else []
        sep, resto = seps[0], seps[1:]
        partes = [p for p in t.split(sep) if p.strip()]
        if len(partes) == 1:                      # este separador não parte nada: desce
            return partir(t, resto)
        out = []
        for i, p in enumerate(partes):
            p = p + ("." if sep == ". " and i < len(partes) - 1 else "")   # repõe o ponto final
            out.extend(partir(p, resto))
        return out

    juntos: list[str] = []
    for p in partir(texto, SEPARADORES):          # junta vizinhos pequenos até ao limite
        if juntos and len(juntos[-1].split()) + len(p.split()) <= max_palavras:
            juntos[-1] = juntos[-1] + " " + p
        else:
            juntos.append(p)
    return juntos`,
      },
      { type: 'lab', ref: 'lab-entrevista-01' },
      { type: 'lab', ref: 'lab-entrevista-02' },
      { type: 'lab', ref: 'lab-entrevista-03' },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Como se comporta um sénior a programar ao vivo',
        text:
          'Diz o contrato da função antes de a escrever (entradas, saída, casos de fronteira). Escreve primeiro o teste mais simples. Narra as decisões («desempato pelo id para ser determinista»). Quando acabares, diz a complexidade e o que farias em produção (tipos, testes de propriedades, métricas). Silêncio durante 20 minutos seguido de código perfeito vale menos do que código razoável com raciocínio visível.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — tool use', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview' },
          { label: 'LangChain — RecursiveCharacterTextSplitter', url: 'https://python.langchain.com/docs/how_to/recursive_text_splitter/' },
        ],
      },
    ],
  },

  /* ==================================================================== 7 */
  {
    id: 'sinais',
    title: 'Sinais de senioridade e erros que custam a vaga',
    blocks: [
      {
        type: 'p',
        text:
          'No fim de cada ronda, o entrevistador escreve uma nota com três colunas: o que o candidato fez sem que lhe pedissem, onde precisou de ajuda, e o que o preocupou. Para um papel sénior, a primeira coluna pesa mais do que as outras duas juntas.',
      },
      {
        type: 'list',
        items: [
          '**Mede antes de afirmar**: «o híbrido melhora recall@3 de 0,900 para 0,933 no nosso conjunto, com IC que se sobrepõe; só adoptaria com mais perguntas».',
          '**Põe limites em código**: dinheiro, identidade e acções irreversíveis nunca dependem do modelo.',
          '**Pensa em falha**: o que acontece quando o fornecedor devolve 429, quando o retriever não traz nada, quando o classificador erra um caso de saúde.',
          '**Fala de custo e latência sem que perguntem**: tokens por turno, custo por conversa, TTFT p95.',
          '**Sabe o que não construir**: base vectorial dedicada para 5,7 MB, multi-agente para um problema com um só caminho, fine-tuning para factos que mudam.',
          '**Liga técnica a negócio**: resolução autónoma, respostas erradas na revisão humana, custo por conversa humana evitada.',
        ],
      },
      {
        type: 'table',
        head: ['Erro que custa a vaga', 'Porque pesa tanto'],
        rows: [
          ['Antropomorfizar («o modelo percebe», «o agente decide sozinho que…»)', 'Mostra que o modelo mental é de utilizador, não de engenheiro'],
          ['Nenhuma palavra sobre avaliação no system design', 'É o sinal nº 1 de quem nunca pôs um sistema LLM em produção'],
          ['Confiar no prompt para segurança', 'Prompt injection é o risco nº 1 da OWASP para LLM; o prompt não é um controlo'],
          ['Números inventados com confiança', 'É exactamente o defeito que o sistema devia evitar'],
          ['Framework como resposta («uso LangGraph») sem o porquê', 'A ferramenta é detalhe; a decisão e o trade-off são o que se avalia'],
          ['Ignorar PII e retenção', 'Em banca, seguros, telecomunicações e saúde é o que bloqueia o projecto'],
        ],
      },
      {
        type: 'table',
        head: ['Pergunta a fazer ao entrevistador', 'O que a resposta te diz'],
        rows: [
          ['Como avaliam uma mudança de prompt antes de ir para produção?', 'Se há conjunto dourado e gate, ou se é «parece bem»'],
          ['Quem é dono do conjunto de avaliação e com que frequência muda?', 'Se o produto e o negócio participam, ou se a engenharia adivinha'],
          ['Qual foi o último incidente com o sistema LLM e como o detectaram?', 'Maturidade de observabilidade e cultura de post-mortem'],
          ['Como decidem entre um modelo mais caro e um mais barato?', 'Se há métricas por custo, ou preferências pessoais'],
        ],
      },
      {
        type: 'steps',
        items: [
          { title: 'Semana 1 — fundamentos e RAG', text: 'Módulos 2 a 12: tokenização, amostragem, APIs, prompts, tool calling, embeddings, HNSW, chunking, híbrido. Implementa de raiz RRF, recall@k, MRR e um chunker, e compara com o `balcao`.' },
          { title: 'Semana 2 — agentes e avaliação', text: 'Módulos 15 a 24: grafos, interrupts, memória, MCP, conjuntos dourados, juiz calibrado, trajectórias, guardrails. Escreve o ciclo de ferramentas com limite e erros como dados.' },
          { title: 'Semana 3 — produção e design', text: 'Módulos 25 a 31: serviço, CI com evals, observabilidade, custo. Faz os dois system designs deste módulo em voz alta, cronometrados a 45 minutos, e grava-te.' },
          { title: 'Véspera', text: 'Revê três histórias do teu trabalho com números (antes, depois, como mediste). Uma sobre uma decisão que reverteste.' },
        ],
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Cuidado com o vocabulário da moda',
        text:
          'Termos como «agentic», «autonomous», «reasoning» impressionam pouco um entrevistador sénior e convidam a perguntas difíceis. Troca-os pelo mecanismo: «um ciclo em que o modelo escolhe a próxima ferramenta, com limite de 6 chamadas e aprovação humana acima de 500 MZN». É mais longo e muito mais convincente.',
      },
      {
        type: 'p',
        text:
          'O último conselho é o mais simples: constrói alguma coisa e mede-a. Um laboratório como o do «Balcão», com testes, um conjunto dourado de 30 perguntas, um relatório com intervalos de confiança e uma decisão que tomaste por causa desse relatório, é a melhor preparação para qualquer uma destas rondas — porque transforma cada resposta-modelo deste módulo numa história verdadeira.',
      },
      {
        type: 'refs',
        items: [
          { label: 'OWASP Top 10 para LLM (2025)', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' },
          { label: 'Anthropic — engenharia (artigos técnicos)', url: 'https://www.anthropic.com/engineering' },
          { label: 'OpenAI — guia de avaliações', url: 'https://platform.openai.com/docs/guides/evals' },
        ],
      },
    ],
  },
];
