import type { Module } from '../types';

export const m01: Module = {
  id: 'engenharia-ia',
  number: 1,
  part: 'fundamentos',
  title: 'Engenharia de IA e o problema do «Balcão»',
  subtitle:
    'O que muda quando o componente central do sistema é um modelo pré-treinado que se aluga por token — e o problema concreto que vais resolver ao longo de 32 módulos',
  icon: '🧭',
  minutes: 80,
  tags: ['engenharia de IA', 'stack', 'requisitos', 'métricas', 'Balcão'],
  goals: [
    'Distinguir engenharia de IA de ML engineering pelo artefacto, pelo ciclo de iteração e pelo tipo de falha, e dizer onde o teu instinto de backend ajuda e onde engana.',
    'Nomear as camadas da stack de um sistema LLM (serviço, orquestração, ferramentas, contexto, modelo, avaliação, operação) e situar cada peça do «Balcão» numa delas.',
    'Decidir, intenção a intenção, quando um LLM é a ferramenta errada e o problema se resolve com regras, pesquisa ou ML clássico.',
    'Ler os requisitos do «Balcão» como números mensuráveis e ligar cada métrica de negócio à métrica de sistema que a antecipa.',
    'Fazer a conta de guardanapo de custo e capacidade (conversas, turnos, tokens, meticais) antes de escrever código.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'o-que-e',
      title: 'O que é engenharia de IA, e o que não é',
      blocks: [
        {
          type: 'p',
          text:
            'Durante uma década, pôr «IA» num produto queria dizer treinar um modelo: recolher dados etiquetados, escolher features, treinar, validar, servir e re-treinar quando os dados mudavam. Esse trabalho continua a existir e chama-se **ML engineering**. A **engenharia de IA** é outra coisa: construir produtos por cima de um modelo de fundação pré-treinado por outra organização, que se usa por API (ou se corre localmente com pesos abertos) e que já sabe gerar texto razoável sobre quase tudo. O modelo deixa de ser o artefacto que produzes e passa a ser uma **dependência** — cara, lenta, não-determinística e versionada por terceiros.',
        },
        {
          type: 'p',
          text:
            'Isso muda onde se gasta o tempo. Em vez de treinar pesos, adaptas o comportamento do modelo por fora: o que entra na janela de contexto (instruções, documentos recuperados, histórico, resultados de ferramentas), que ferramentas lhe dás, como orquestras várias chamadas, e — acima de tudo — como **medes** se o sistema faz o que devia. O trabalho que domina o calendário de uma equipa de engenharia de IA não é escrever a chamada ao modelo (são cinco linhas); é construir o conjunto de avaliação, ler traços de conversas falhadas e decidir que mudança no contexto corrige a falha sem partir outra coisa.',
        },
        {
          type: 'compare',
          left: {
            title: 'ML engineering',
            items: [
              'O artefacto é o modelo: pesos treinados nos teus dados.',
              'Começa pelos dados etiquetados; sem eles não há nada.',
              'Ciclo de iteração em horas ou dias (treinar, validar).',
              'Saída fechada: uma classe, um score, um número.',
              'Falha típica: drift dos dados, overfitting, leakage.',
              'Avaliação com métricas clássicas sobre um test set fixo.',
            ],
          },
          right: {
            title: 'Engenharia de IA',
            items: [
              'O artefacto é o sistema à volta de um modelo alugado.',
              'Começa pelo produto; os dados de avaliação constroem-se depois.',
              'Ciclo de iteração em minutos (mudar o prompt, reindexar).',
              'Saída aberta: texto livre, chamadas de ferramentas.',
              'Falha típica: resposta plausível e errada, injecção, custo em fuga.',
              'Avaliação com conjuntos dourados, juízes e revisão humana.',
            ],
          },
        },
        {
          type: 'p',
          text:
            'Para um engenheiro de backend a diferença mais desconfortável é a última linha. Um serviço Spring ou Go com a mesma entrada devolve a mesma saída, e um teste unitário prova-o. Um LLM gera tokens amostrados de uma distribuição condicionada ao contexto: a mesma pergunta pode dar duas respostas diferentes, e as duas podem estar certas, ou uma certa e outra errada de forma plausível. O módulo 2 explica o mecanismo; aqui basta a consequência: **«parece bem» não é uma métrica**, e o teste deixa de ser uma asserção sobre um valor e passa a ser uma taxa medida sobre um conjunto de casos.',
        },
        {
          type: 'table',
          head: ['Instinto de backend', 'Onde ajuda', 'Onde engana'],
          rows: [
            ['Contratos e tipos nas fronteiras', 'Saída estruturada validada com Pydantic, esquemas de ferramentas, API com RFC 9457', 'O texto que o modelo gera não tem contrato: só se valida depois, e a validação pode falhar'],
            ['Timeouts, retentativas, idempotência', 'Fornecedores devolvem 429 e 5xx; reembolsos têm de ser idempotentes', 'Repetir uma chamada ao modelo não devolve o mesmo resultado; retentar pode mudar a resposta'],
            ['Testes unitários verdes antes do merge', 'Continuam a existir para o código determinista (ferramentas, parsing, limites)', 'Para o comportamento do modelo precisas de evals com limiar e intervalo de confiança'],
            ['Observabilidade com métricas e traços', 'OpenTelemetry com atributos `gen_ai.*`, tokens por chamada, TTFT', 'Um 200 OK com uma resposta errada não aparece em nenhum painel de erros'],
            ['Escalar horizontalmente', 'O serviço é quase só espera de I/O; escala fácil', 'O gargalo é o rate limit do fornecedor (tokens por minuto), não a CPU'],
          ],
          caption: 'O que trazes da stack JVM/Go e como se transforma quando o componente central é um modelo.',
        },
        {
          type: 'code',
          lang: 'python',
          caption:
            'A parte «IA» de um sistema LLM, sem nada à volta: cinco linhas. Tudo o que o tutorial ensina é o que falta aqui — contexto, ferramentas, limites, avaliação, operação.',
          code: `from langchain.chat_models import init_chat_model

modelo = init_chat_model("llama3.2:3b", model_provider="ollama", temperature=0)
resposta = modelo.invoke("O meu pedido chegou 50 minutos atrasado. Tenho direito a quê?")
print(resposta.text)
# Uma resposta fluente, confiante e sem nenhuma relação com as políticas do Chega:
# o modelo não as conhece, não sabe que pedido é, e não tem forma de calcular o valor.`,
        },
        {
          type: 'p',
          text:
            'A resposta daquele código vai soar razoável — «pedimos desculpa, pode ter direito a um reembolso parcial» — e está errada em tudo o que importa: o «Chega» dá um cupão de 200 MZN acima de 45 minutos de atraso, e o modelo não tem como saber isso nem quanto foi o atraso. O resto deste módulo é o inventário do que é preciso pôr à volta daquelas cinco linhas para a resposta ser certa, auditável, barata e segura.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Modelo de fundação', def: 'Modelo pré-treinado em grandes volumes de texto (e depois afinado para seguir instruções) que se usa como componente genérico. No «Balcão» há três escalões comerciais e um local.' },
            { term: 'Contexto', def: 'Tudo o que vai na janela de um pedido: prompt de sistema, esquemas de ferramentas, documentos recuperados, histórico e a mensagem actual. É a única forma de o modelo «saber» algo que não estava no treino.' },
            { term: 'RAG', def: 'Retrieval-augmented generation: pesquisar os documentos relevantes e pô-los no contexto antes de gerar, com citação da fonte.' },
            { term: 'Ferramenta', def: 'Uma função do teu código que o modelo pode pedir para chamar (ler um pedido, calcular um reembolso). O modelo emite o pedido; quem executa, valida e autoriza é o teu código.' },
            { term: 'Eval', def: 'Avaliação automática do comportamento do sistema sobre um conjunto de casos com resposta esperada, com um limiar que decide se uma mudança entra.' },
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: começar pelo framework',
          text:
            'O primeiro instinto é escolher a framework (LangChain, LlamaIndex, um SDK de agentes) e montar uma demo que responde bem a cinco perguntas escolhidas por quem a escreveu. Duas semanas depois, alguém faz a sexta pergunta e a demo inventa uma política. Começa pelas **30 perguntas com resposta esperada** e por uma forma de medir a taxa de acerto; a framework escolhe-se depois, e troca-se se for preciso. O «Balcão» teve conjunto dourado antes de ter prompt de sistema (adr-0018).',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
            { label: 'Bommasani et al. — On the Opportunities and Risks of Foundation Models (2021)', url: 'https://arxiv.org/abs/2108.07258' },
            { label: 'LangChain — modelos de chat e init_chat_model', url: 'https://docs.langchain.com/oss/python/langchain/models' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'stack',
      title: 'As camadas da stack: do modelo à operação',
      blocks: [
        {
          type: 'p',
          text:
            'Um sistema LLM em produção tem cinco camadas no caminho de um pedido e duas transversais. Não são uma arquitectura imposta por nenhuma framework: são as perguntas que qualquer sistema destes tem de responder, e dar-lhes nome ajuda a saber onde está um problema quando uma conversa corre mal. Se a resposta citou uma política substituída, o problema está no contexto; se emitiu um reembolso que ninguém pediu, está na orquestração e nas ferramentas; se custou 4 MZN em vez de 0,66, está no modelo ou no contexto; se ninguém reparou durante uma semana, está na avaliação e na operação.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'A stack do «Balcão», camada a camada',
            caption:
              'O pedido desce pelas cinco camadas da esquerda; avaliação e operação atravessam todas. Cada caixa é uma peça real do laboratório.',
            cols: 5,
            rows: 6,
            zones: [
              { id: 'z-caminho', label: 'Caminho do pedido', col: 0, row: 0, colSpan: 3, rowSpan: 6, tone: 'service' },
              { id: 'z-transv', label: 'Transversais', col: 3, row: 0, colSpan: 2, rowSpan: 6, tone: 'ci' },
            ],
            nodes: [
              { id: 'cliente', label: 'Cliente', sub: 'aplicação e WhatsApp', col: 0, row: 0, kind: 'user' },
              { id: 'servico', label: 'Serviço', sub: 'FastAPI, SSE, autenticação, rate limit', col: 1, row: 0, span: 2, kind: 'service' },
              { id: 'orq', label: 'Orquestração', sub: 'grafo LangGraph: guardas, router, agente, interrupt', col: 0, row: 1, span: 3, kind: 'agent' },
              { id: 'ferr', label: 'Ferramentas', sub: 'ler_pedido, calcular_reembolso, ...', col: 0, row: 2, kind: 'tool' },
              { id: 'apis', label: 'APIs do Chega', sub: 'pedidos, pagamentos (JVM)', col: 0, row: 3, kind: 'external' },
              { id: 'ctx', label: 'Contexto e RAG', sub: 'prompt versionado, pesquisa híbrida', col: 1, row: 2, span: 2, kind: 'service' },
              { id: 'pg', label: 'PostgreSQL + pgvector', sub: '1 870 chunks, checkpoints', col: 1, row: 3, span: 2, kind: 'data' },
              { id: 'modelo', label: 'Modelo', sub: 'pequeno, médio, grande, local', col: 1, row: 4, span: 2, kind: 'model' },
              { id: 'forn', label: 'Fornecedor ou Ollama', sub: 'por trás de modelos.py', col: 1, row: 5, span: 2, kind: 'external' },
              { id: 'aval', label: 'Avaliação e guardrails', sub: 'conjunto dourado, juiz, red team', col: 3, row: 1, span: 2, kind: 'note' },
              { id: 'oper', label: 'Operação', sub: 'Git, Docker, CI/CD, traços, custo', col: 3, row: 3, span: 2, kind: 'note' },
            ],
            edges: [
              { from: 'cliente', to: 'servico', label: 'HTTP + SSE' },
              { from: 'servico', to: 'orq' },
              { from: 'orq', to: 'ferr', label: 'tool calls' },
              { from: 'ferr', to: 'apis', label: 'HTTP' },
              { from: 'orq', to: 'ctx' },
              { from: 'ctx', to: 'pg', label: 'SQL' },
              { from: 'orq', to: 'modelo', label: 'mensagens' },
              { from: 'modelo', to: 'forn' },
              { from: 'aval', to: 'orq', style: 'dashed', label: 'gate em CI' },
              { from: 'oper', to: 'servico', style: 'dashed', label: 'traços, métricas' },
            ],
          },
        },
        {
          type: 'table',
          head: ['Camada', 'Pergunta que responde', 'No «Balcão»', 'Módulos'],
          rows: [
            ['Modelo', 'Que modelo, a que preço e latência, com que versão fixada?', 'Três escalões comerciais e `llama3.2:3b` local, atrás de `modelos.py`', '2, 3, 6'],
            ['Contexto e RAG', 'O que entra na janela, em que ordem, com que fonte?', 'Prompt versionado, pesquisa híbrida com re-ranking, citações', '4, 7–12'],
            ['Ferramentas', 'Que acções o modelo pode pedir, com que limites?', '12 ferramentas; limites e identidade no código, não no prompt', '5'],
            ['Orquestração', 'Que passos, em que ordem, onde pára para um humano?', 'Grafo com router, agente com orçamento, `interrupt` acima de 500 MZN', '13–19'],
            ['Serviço', 'Como chega ao cliente, depressa e com segurança?', 'FastAPI, SSE, autenticação, erros RFC 9457', '25'],
            ['Avaliação e guardrails', 'Como sei que funciona e que não é abusado?', '240 perguntas douradas, juiz calibrado, 120 ataques', '20–24'],
            ['Operação', 'Como se muda sem partir, e quanto custa?', 'Trunk-based, imagem por SHA, evals como gate, traços `gen_ai.*`', '26–30'],
          ],
          caption: 'As sete camadas, e o sítio do tutorial onde cada uma é construída.',
        },
        {
          type: 'p',
          text:
            'Escolhe uma intenção no mapa e repara em duas coisas. Primeiro, a camada do modelo aparece em quase todas as intenções, mas raramente sozinha: o valor de uma compensação vem de uma ferramenta, o escalamento de saúde vem de uma regra. Segundo, avaliação e operação cobrem 100% das conversas — são as camadas que ninguém pede numa demo e que decidem se o sistema continua ligado ao fim de um mês. Liga o interruptor «Seria melhor sem LLM?» para ver a alternativa em cada caso.',
        },
        { type: 'widget', id: 'mapa-stack' },
        {
          type: 'flow',
          flow: {
            id: 'fl-engenharia-ia-01',
            title: 'Um turno de política, camada a camada',
            intro:
              'A cliente pergunta se pode juntar dois cupões. Os milissegundos são o orçamento de latência do «Balcão» (`ORCAMENTO_LATENCIA`); o primeiro token chega aos ≈ 1,37 s, dentro do alvo de 1,5 s.',
            lanes: [
              { id: 'cli', label: 'Cliente', sub: 'aplicação', kind: 'client' },
              { id: 'api', label: 'Serviço', sub: 'FastAPI', kind: 'service' },
              { id: 'grafo', label: 'Grafo', sub: 'LangGraph', kind: 'agent' },
              { id: 'peq', label: 'Modelo pequeno', sub: 'classificar', kind: 'model' },
              { id: 'pg', label: 'PostgreSQL', sub: 'pgvector + tsvector', kind: 'store' },
              { id: 'med', label: 'Modelo médio', sub: 'responder', kind: 'model' },
            ],
            steps: [
              { from: 'cli', to: 'api', label: 'POST /v1/conversas/{id}/mensagens', kind: 'req', ms: 60, detail: 'JWT validado localmente; histórico e resumo da conversa lidos do PostgreSQL.', code: '{"texto": "Posso juntar dois cupões no mesmo pedido?"}', lang: 'json' },
              { from: 'api', to: 'grafo', label: 'guarda de entrada', kind: 'self', ms: 25, detail: 'Mascarar PII e pontuar prompt injection, sem modelo. Camada de avaliação e guardrails, a correr no caminho.' },
              { from: 'grafo', to: 'peq', label: 'classificar intenção', kind: 'req', ms: 350, tokens: 420, detail: 'Saída estruturada: `{"intencao": "politica", "pedido_id": "", "confianca": 0.94}`. Corre em paralelo com o embedding da pergunta.' },
              { from: 'grafo', to: 'pg', label: 'pesquisa híbrida', kind: 'req', ms: 45, detail: 'HNSW sobre os vectores e `tsvector` sobre o texto, fundidos com RRF numa só consulta, com `vigente = true`.' },
              { from: 'grafo', to: 'grafo', label: 're-ranking dos 20 primeiros', kind: 'self', ms: 180, detail: 'Cross-encoder pequeno: a fase que mais melhora a precisão por milissegundo (módulo 11).' },
              { from: 'grafo', to: 'med', label: 'prompt + contexto', kind: 'req', ms: 700, tokens: 5200, detail: 'Até ao primeiro token, com ≈ 60% do prompt servido da cache do fornecedor (módulo 3).' },
              { from: 'med', to: 'cli', label: 'tokens em streaming (SSE)', kind: 'res', ms: 3000, tokens: 180, detail: '«Não: só pode usar um cupão por pedido [pol-cupoes].» A ≈ 60 tokens por segundo; a cliente está a ler desde o primeiro.' },
              { from: 'grafo', to: 'grafo', label: 'guarda de saída', kind: 'self', ms: 30, detail: 'Cada citação tem de existir no contexto e ser pública; sem citação válida, a resposta é trocada pela recusa.' },
              { from: 'grafo', to: 'pg', label: 'checkpoint + traço', kind: 'async', ms: 25, detail: 'Estado do grafo, mensagem e traço com `gen_ai.usage.*` persistidos; conta para a capacidade, não para o TTFT.' },
            ],
            outro:
              'Das sete camadas, só uma chamada é «o modelo a responder». O resto — guardas, classificação, pesquisa, re-ranking, validação, persistência — é engenharia de sistema, e é onde estão quase todas as decisões deste tutorial.',
          },
        },
        {
          type: 'p',
          text:
            'Uma consequência prática desta decomposição: cada camada tem a sua própria métrica e o seu próprio teste. A recuperação mede-se com recall@k sem nenhum modelo generativo; as ferramentas testam-se com pytest como qualquer função; o grafo testa-se com um modelo simulado determinista; só a camada do modelo precisa de evals com juiz. Quando tudo está misturado numa só chamada com um prompt de 4 000 palavras, deixa de ser possível saber que parte falhou.',
        },
        { type: 'file', ref: 'README.md' },
        {
          type: 'code',
          lang: 'text',
          caption: 'A estrutura do laboratório segue as camadas: cada pasta ou ficheiro vive numa delas.',
          code: `src/balcao/
  modelos.py · simulado.py              modelo       (fábrica, escalões, versão fixada)
  ingestao.py · recuperacao.py          contexto     (chunking, pesquisa híbrida, re-ranking)
  cadeias.py · prompts/*.md             contexto     (prompt versionado, citações, recusa)
  ferramentas.py                        ferramentas  (12 ferramentas, limites no código)
  grafo.py · memoria.py                 orquestração (router, agente, interrupt, resumo)
  api/                                  serviço      (FastAPI, SSE, RFC 9457)
  guardas.py · avaliacao/               avaliação    (PII, injecção, evals, juiz)
  observabilidade.py                    operação     (OpenTelemetry gen_ai.*, Prometheus)
docker/ · .github/workflows/            operação     (imagem multi-stage, CI com evals)`,
        },
        { type: 'adr', ref: 'adr-0001' },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção, o serviço quase não gasta CPU',
          text:
            'Num turno de ≈ 4,4 s, o processo Python passa a maior parte do tempo à espera: 700 ms pelo primeiro token, ≈ 3 s de geração, 45 ms de PostgreSQL. É por isso que a escolha de Python e não da stack JVM (adr-0001) não é uma questão de desempenho, e que o dimensionamento se faz por **ligações concorrentes e tokens por minuto do fornecedor**, não por núcleos. Um único worker async aguenta o pico de 11 mensagens por minuto com folga; o limite que aparece primeiro é o rate limit do fornecedor (módulo 30).',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — visão geral', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
            { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Anthropic — Effective context engineering for AI agents', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'ferramenta-errada',
      title: 'Quando um LLM é a ferramenta errada',
      blocks: [
        {
          type: 'p',
          text:
            'Um LLM é excelente numa coisa: transformar texto livre em texto livre, condicionado por um contexto. Interpreta «o motoqueiro esqueceu-se de mim» como um problema de entrega, reescreve uma política em duas frases no tom certo, extrai `PD-8841273` de uma mensagem mal escrita. É mau — caro, lento, não-determinístico e difícil de auditar — em tudo o que é **cálculo, limite, regra enumerável ou classificação com dados etiquetados**. Um sistema bem desenhado usa o LLM onde há linguagem natural para interpretar ou redigir, e põe código determinista à volta dele em tudo o resto.',
        },
        {
          type: 'table',
          head: ['Alternativa', 'Quando ganha ao LLM', 'Custo típico', 'Exemplo no «Balcão»'],
          rows: [
            ['Regra / código', 'Os casos são enumeráveis e o erro tem de ser previsível e auditável', '< 1 ms, 0 MZN, testável com casos fixos', 'O escalão de compensação por atraso; o limite de 500 MZN; a lista de termos de saúde'],
            ['Pesquisa (BM25, SQL, vectores)', 'A resposta já existe escrita e só é preciso encontrá-la', '≈ 45 ms no PostgreSQL, sem tokens', 'Mostrar o artigo da FAQ de horários; filtrar políticas vigentes'],
            ['ML clássico', 'Saída fechada, dados etiquetados, milhões de previsões', 'milissegundos, sem custo por previsão; precisa de re-treino', 'Pontuação de fraude a partir de reembolsos em 30 dias e antiguidade da conta'],
            ['LLM', 'Texto livre para interpretar ou redigir; variedade que não se enumera', 'centenas de ms a segundos; cêntimos de metical por chamada', 'Perceber a pergunta; redigir a resposta com a política citada'],
          ],
          caption: 'As quatro ferramentas, e o critério que escolhe entre elas.',
        },
        {
          type: 'p',
          text:
            'O caso mais instrutivo é a compensação por atraso. A política diz: mais de 20 minutos, cupão de 100 MZN; mais de 45, cupão de 200 MZN ou reembolso da taxa de entrega. É uma função de duas linhas sobre dois números que estão no pedido. Pedir a um modelo que a aplique a partir do texto da política é pedir-lhe que faça aritmética com números que não tem, sobre um documento que pode nem ter sido recuperado. O bloco seguinte mostra as duas abordagens lado a lado, com o runtime didáctico `balcao`.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'O que é o `balcao` que corre no browser',
          text:
            'Os blocos «Correr» usam um runtime didáctico e determinista: um BM25 real, um embedding por hashing (não é uma rede neuronal), um re-ranker lexical e um **modelo simulado que responde por extracção** de frases do contexto. Serve para comparar técnicas entre si e ver a forma do sistema; não prevê o que um modelo real diria. O laboratório (`docker compose up`) usa as peças reais.',
        },
        {
          type: 'run',
          run: {
            id: 'run-engenharia-ia-01',
            title: 'A mesma pergunta por texto e por código',
            brief:
              'A pergunta da Aida, primeiro pelo caminho «só RAG» (recuperar políticas e gerar), depois pelo caminho em que o valor sai de uma função sobre os dados do pedido.',
            code: `import balcao as b

pergunta = "O meu pedido chegou 50 minutos atrasado, tenho direito a alguma coisa?"

# Caminho 1: só texto — recuperar políticas e pedir ao modelo (simulado) que responda
res = b.recuperar(pergunta, k=3, metodo="rerank", filtro={"vigente": True})
print("fontes recuperadas:", [c.doc for c, _ in res])
resposta = b.ModeloSimulado().gerar(b.montar_prompt_rag(pergunta, res))
print("só RAG  ->", resposta.texto[:90] + "...")

# Caminho 2: o valor sai de código, com os dados do pedido
pedido = b.ler_pedido("PD-8841990")
print("pedido  ->", pedido["prometido_min"], "min prometidos,", pedido["decorrido_min"], "decorridos")
print("regra   ->", b.calcular_reembolso("PD-8841990", "atraso"))`,
            expected: `fontes recuperadas: ['pol-qualidade-comida', 'pol-cancelamento-cliente', 'pol-atraso-compensacao']
só RAG  -> Comida derramada ou fria dá direito a um reembolso parcial de até 50% do valor dos artigos...
pedido  -> 30 min prometidos, 83 decorridos
regra   -> {'pedido': 'PD-8841990', 'tipo': 'cupão', 'valor_mzn': 200, 'regra': 'atraso de 53 min (> 45)', 'precisa_aprovacao': False}`,
          },
        },
        {
          type: 'p',
          text:
            'O caminho só-texto falha de duas formas que vais reencontrar ao longo do tutorial. A recuperação põe `pol-qualidade-comida` à frente de `pol-atraso-compensacao` (a pergunta tem «chegou» e «direito», que a política de comida fria também tem), e o gerador responde com o primeiro documento plausível. Mesmo que a recuperação acertasse, o gerador teria de saber que o atraso foi de 53 minutos — um número que só existe no sistema de pedidos. O caminho por código não tem nenhum destes problemas: lê o pedido, aplica a regra, devolve um valor e a regra que o justifica. O LLM fica com o que sabe fazer: perceber que a pergunta é sobre atraso e redigir «Tem direito a um cupão de 200 MZN» com a política citada.',
        },
        {
          type: 'decision',
          tree: {
            id: 'dt-engenharia-ia-01',
            title: 'Esta tarefa precisa de um LLM?',
            intro: 'Percorre a árvore para cada passo de um fluxo, não para o fluxo inteiro: quase sempre a resposta é «alguns passos sim, outros não».',
            start: 'texto',
            nodes: [
              { id: 'texto', question: 'A entrada ou a saída é texto livre com variedade que não consegues enumerar?', options: [
                { label: 'Não: números, estados, campos fechados', next: 'regra' },
                { label: 'Sim', next: 'existe' },
              ] },
              { id: 'regra', question: 'Consegues escrever a regra (mesmo que longa) e há quem a assine?', options: [
                { label: 'Sim', next: 'fim-regra' },
                { label: 'Não, mas há dados etiquetados', next: 'fim-ml' },
              ] },
              { id: 'existe', question: 'A resposta já existe escrita e só é preciso encontrá-la e mostrá-la tal como está?', options: [
                { label: 'Sim, e o cliente usa as palavras do documento', next: 'fim-pesquisa' },
                { label: 'Não, ou é preciso adaptar e resumir', next: 'risco' },
              ] },
              { id: 'risco', question: 'Um erro tem custo irreversível (dinheiro, saúde, dados de terceiros)?', options: [
                { label: 'Sim', next: 'fim-llm-guardado' },
                { label: 'Não', next: 'fim-llm' },
              ] },
              { id: 'fim-regra', answer: 'Código determinista.', detail: 'Testável com pytest, auditável, grátis. No «Balcão»: `calcular_reembolso`, o limite de 500 MZN, os termos de saúde que mandam para humano.' },
              { id: 'fim-ml', answer: 'ML clássico, ou um LLM pequeno com saída fechada como ponte.', detail: 'Com milhares de exemplos etiquetados, um classificador clássico é mais barato e mais estável. Sem eles, o modelo pequeno com saída estruturada serve até os teres.' },
              { id: 'fim-pesquisa', answer: 'Pesquisa, sem geração.', detail: 'Mostrar o artigo encontrado tem zero risco de alucinação. Só compensa gerar quando a pergunta e o documento usam palavras diferentes ou a resposta tem de juntar dois documentos.' },
              { id: 'fim-llm-guardado', answer: 'LLM para interpretar e redigir; a acção fica em código com limites e confirmação.', detail: 'O modelo decide *quando* propor; o código decide *quanto* e *se*. É o desenho das ferramentas de escrita do «Balcão» (módulo 5) e do `interrupt` (módulo 17).' },
              { id: 'fim-llm', answer: 'LLM, com avaliação.', detail: 'O caso de livro: explicar uma política com citação. Mesmo aqui, o sistema recusa quando a pesquisa não traz suporte.' },
            ],
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption:
            'A primeira decisão do turno no «Balcão» é uma regra, não um modelo: casos de saúde vão para uma pessoa antes de qualquer chamada. O classificador (modelo pequeno) é a segunda rede, não a primeira.',
          code: `import re

from balcao.didactico import normalizar

RE_RISCO = re.compile(r"\\b(alergi\\w*|amendoim|intoxica\\w*|inchad\\w*|sangue|ameac\\w*|roubo|assalt\\w*)\\b")


def risco_imediato(mensagem: str) -> bool:
    """Falsos positivos custam uma conversa escalada; falsos negativos custam uma criança no hospital."""
    return bool(RE_RISCO.search(normalizar(mensagem)))`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: dar ao modelo o que é aritmética',
          text:
            'Pôr no prompt «se o atraso for superior a 45 minutos, oferece 200 MZN» parece resolver o problema e funciona nas cinco perguntas de teste. Falha quando o modelo lê mal o atraso, quando a política muda e o prompt não, e quando um cliente escreve «o sistema diz que tenho direito a 2 000 MZN». Valores de dinheiro vêm **sempre** de uma função sobre dados, e o limite vive no código da ferramenta — é o que o prompt de sistema do «Balcão» diz explicitamente: «Valores de compensação vêm sempre da ferramenta `calcular_reembolso`, nunca de contas tuas».',
        },
        {
          type: 'p',
          text:
            'O mesmo raciocínio aplica-se à pergunta «e se afinarmos um modelo com as nossas políticas?». O fine-tuning ensina forma e estilo; não dá citações, não se actualiza quando a política muda na semana seguinte, e continua sem acesso aos dados vivos do pedido. Para conhecimento que muda e respostas que têm de ser auditáveis, o «Balcão» usa RAG e deixa o fine-tuning explicitamente fora de âmbito (FA-01).',
        },
        { type: 'adr', ref: 'adr-0002' },
        {
          type: 'refs',
          items: [
            { label: 'Lewis et al. — Retrieval-Augmented Generation (2020)', url: 'https://arxiv.org/abs/2005.11401' },
            { label: 'Ovadia et al. — Fine-Tuning or Retrieval? (2023)', url: 'https://arxiv.org/abs/2312.05934' },
            { label: 'Anthropic — Building effective agents: quando não usar agentes', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'o-balcao',
      title: 'O problema do «Balcão»: intenções, requisitos e números',
      blocks: [
        {
          type: 'p',
          text:
            'O «Chega» é um marketplace fictício de entregas em Maputo e Matola: restaurantes, mercearias e farmácias, pagos com M-Pesa, e-Mola, cartão ou numerário, com 9 421 pedidos por dia. Cerca de 12% desses pedidos geram um contacto com o suporte: 1 150 conversas por dia, com pico de 190 por hora às sextas às 20h. Hoje são 14 pessoas, 42 MZN por conversa e **7 minutos até à primeira resposta**. O «Balcão» é o assistente que responde na aplicação e no WhatsApp, e o objectivo é resolver 68% das conversas sem humano, com a primeira palavra em menos de 1,5 s e menos de 1 MZN de modelo por conversa.',
        },
        {
          type: 'table',
          head: ['Intenção', 'Peso', 'Caminho', 'Resolução alvo', 'Porquê este caminho'],
          rows: [
            ['Onde está o meu pedido', '31%', 'ferramenta', '90%', 'Uma chamada a `ler_pedido` resolve; RAG aqui é desperdício'],
            ['Reembolso ou compensação', '22%', 'agente', '70%', 'Política + dados do pedido + acção com efeito e limite'],
            ['Pergunta sobre regras', '18%', 'rag', '85%', 'O caso de livro do RAG: resposta curta com citação'],
            ['Pagamentos', '14%', 'agente', '60%', 'Metade política, metade ver o pedido; fraude vai para humano'],
            ['Conta e dados pessoais', '6%', 'humano', '40%', 'Alterar o telefone exige verificação de identidade por uma pessoa'],
            ['Saúde, segurança ou fraude', '4%', 'humano', '0% — escalar sempre', 'Nenhuma métrica de resolução justifica ficar com estes casos'],
            ['Outros e fora de âmbito', '5%', 'rag', 'recusa correcta ≥ 90%', 'A resposta certa é «não sei» dita bem, com uma alternativa'],
          ],
          caption: 'As sete intenções de `INTENCOES` (design do «Balcão»). O peso é a percentagem das conversas.',
        },
        {
          type: 'p',
          text:
            'A tabela já é um desenho de sistema. A intenção mais frequente (31%) quase não precisa de modelo generativo: é uma leitura de estado e uma frase. A segunda (22%) é a mais difícil e a mais arriscada, porque mexe em dinheiro — é onde o grafo com aprovação humana ganha o seu lugar. E há 10% de conversas (conta e segurança) em que o sucesso é **passar a conversa bem**, com um resumo que evite ao colega humano repetir perguntas. Um único prompt genérico «és um assistente de suporte» trataria as sete da mesma maneira, e falharia em todas as que não são a terceira.',
        },
        {
          type: 'prompt',
          prompt: {
            id: 'pr-engenharia-ia-01',
            title: 'Uma conversa de referência: atraso com direito a cupão',
            brief:
              'A conversa `atraso-compensacao`, tal como o modelo médio a vê. Repara em quem faz o quê: o modelo interpreta e redige; os números vêm das ferramentas; a emissão espera pela confirmação.',
            messages: [
              { role: 'sistema', tokens: 900, text: 'És o assistente de suporte ao cliente do Chega... Valores de compensação vêm sempre da ferramenta `calcular_reembolso`, nunca de contas tuas. Não emites um reembolso ou um cupão sem o cliente ter confirmado que o quer.', note: 'Excerto de `prompts/sistema.md` v1.4.0. O prompt diz a regra, mas não é ele que a garante: é o código da ferramenta.' },
              { role: 'utilizador', tokens: 24, text: 'A pizza do PD-8841990 chegou com quase uma hora de atraso. Isto não pode ser.', untrusted: true, note: 'Texto do cliente: dados, não instruções. «Quase uma hora» é uma estimativa; o número real está no pedido.' },
              { role: 'assistente', text: '', call: { tool: 'calcular_reembolso', args: '{"pedido_id": "PD-8841990", "motivo": "atraso"}' }, note: 'O modelo decide *que* ferramenta chamar e com que argumentos. Não calcula nada.' },
              { role: 'ferramenta', name: 'calcular_reembolso', tokens: 40, text: '{"pedido": "PD-8841990", "tipo": "cupão", "valor_mzn": 200, "regra": "atraso de 53 min (> 45)", "precisa_aprovacao": false}', note: 'Código determinista: 83 minutos decorridos menos 30 prometidos. Este número é auditável.' },
              { role: 'assistente', tokens: 60, text: 'Lamento o atraso. O pedido chegou 53 minutos depois do tempo prometido, por isso tem direito a um cupão de 200 MZN ou ao reembolso da taxa de entrega (60 MZN) [pol-atraso-compensacao]. Qual prefere?', note: 'Redigir, citar e oferecer a escolha que a política dá: é isto que o LLM faz bem.' },
              { role: 'utilizador', tokens: 4, text: 'O cupão.', untrusted: true },
              { role: 'assistente', text: '', call: { tool: 'emitir_cupao', args: '{"pedido_id": "PD-8841990", "valor_mzn": 200, "chave_idempotencia": "conv-5f2a:cupao:PD-8841990"}' }, note: 'Só depois da confirmação, e com chave de idempotência: se a rede falhar e o grafo repetir o passo, não há dois cupões.' },
            ],
            note:
              'A armadilha desta conversa, registada no design: responder «tem direito a um cupão de 100 MZN» só com RAG. O modelo lê a política, não sabe quanto foi o atraso, e escolhe o primeiro escalão que encontra.',
          },
        },
        { type: 'tool', ref: 'calcular-reembolso' },
        {
          type: 'p',
          text:
            'Os requisitos do «Balcão» estão escritos como números, e isso é deliberado. «Responder bem a perguntas sobre políticas» não se testa; «resposta correcta em ≥ 85% das 240 perguntas douradas e 100% das respostas factuais com citação válida» testa-se em cada pull request. O mesmo para a latência (TTFT p95 < 1,5 s), o custo (< 1,00 MZN por conversa), a segurança (≥ 98% dos 120 ataques de red team bloqueados) e a privacidade (nenhum telefone, email ou NUIT em claro no fornecedor ou nos logs).',
        },
        {
          type: 'list',
          items: [
            '**RF-01** Responder sobre políticas com a fonte citada: ≥ 85% correctas no conjunto dourado, 100% com citação válida.',
            '**RF-03** Calcular e emitir compensações até 500 MZN só depois de o cliente confirmar: zero emissões sem confirmação.',
            '**RF-04** Passar a um humano quando a política manda: ≥ 95% de escalamentos correctos.',
            '**RF-05** Recusar sem inventar: ≥ 90% de recusas correctas nas 40 perguntas fora de âmbito.',
            '**RNF-01** Primeira palavra com p95 < 1,5 s; resposta completa com p95 < 5 s.',
            '**RNF-02** Custo de modelo < 1,00 MZN por conversa, em média mensal.',
            '**RE-03** Tudo corre localmente sem chave de API, com Ollama ou com o modelo simulado.',
          ],
        },
        {
          type: 'p',
          text:
            'Antes de escrever código, faz a conta de guardanapo. Um turno típico leva ≈ 5 200 tokens de entrada (900 de prompt de sistema, 1 100 de esquemas de ferramentas, ≈ 2 000 de contexto RAG, o resto histórico) e ≈ 180 de saída. Multiplicado por três turnos e pelos preços do escalão médio, com 60% da entrada servida da cache de prompt, dá o número que está nos factos do projecto.',
        },
        {
          type: 'run',
          run: {
            id: 'run-engenharia-ia-02',
            title: 'Custo de uma conversa, e de um mês',
            brief:
              'A conta de guardanapo com `custo_conversa`: a entrada cresce a cada turno porque o histórico volta a ir para o modelo. Preços dos escalões de referência (Setembro de 2026) e câmbio de 63,9 MZN por USD.',
            code: `import balcao as b

conversas_dia = b.PROJECTO["conversas_dia"]          # 1150
# 3 turnos, 5 200 tokens de entrada e 180 de saída por turno, 60% servido da cache
por_conversa = b.custo_conversa(turnos=3, entrada_por_turno=5200, saida_por_turno=180,
                                modelo="medio", fraccao_cache=0.6)
sem_cache = b.custo_conversa(turnos=3, entrada_por_turno=5200, saida_por_turno=180, modelo="medio")
grande = b.custo_conversa(turnos=3, entrada_por_turno=5200, saida_por_turno=180, modelo="grande")
print(f"médio + cache : {por_conversa:.2f} MZN por conversa")
print(f"médio sem cache: {sem_cache:.2f} MZN por conversa")
print(f"grande sem cache: {grande:.2f} MZN por conversa")
print(f"por dia (médio + cache): {por_conversa * conversas_dia:,.0f} MZN")
print(f"por mês (30 dias):       {por_conversa * conversas_dia * 30:,.0f} MZN")
humano = 42
print(f"conversa humana: {humano} MZN -> {humano / por_conversa:.0f}x o custo de modelo")`,
            expected: `médio + cache : 0.66 MZN por conversa
médio sem cache: 1.23 MZN por conversa
grande sem cache: 3.68 MZN por conversa
por dia (médio + cache): 756 MZN
por mês (30 dias):       22,687 MZN
conversa humana: 42 MZN -> 64x o custo de modelo`,
          },
        },
        {
          type: 'p',
          text:
            'Três leituras. Sem cache de prompt, o escalão médio já passa o orçamento de 1,00 MZN — a cache não é uma optimização opcional, é parte do desenho (módulos 3 e 30). O modelo grande custa três vezes mais do que o médio nas mesmas condições (3,68 contra 1,23 MZN sem cache) e ganharia 3 pontos no conjunto dourado: não compensa como modelo de resposta, compensa como juiz. E o custo de modelo é 64 vezes menor do que o de uma conversa humana, o que significa que a restrição que manda **não é o custo, é a qualidade**: uma resposta errada e confiante custa um cliente, e esse custo não aparece na factura do fornecedor.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Os números de qualidade do simulado não se transferem',
          text:
            'O `ModeloSimulado` e o `llama3.2:3b` do laboratório servem para ver o sistema a funcionar e para os testes de CI correrem sem rede. As taxas de acerto que medires com eles dizem-te se o código está certo, não se o modelo de produção vai acertar. Para isso existe a avaliação nocturna com o modelo real (módulo 28).',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — preços dos modelos', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
            { label: 'OpenAI — preços da API', url: 'https://openai.com/api/pricing/' },
            { label: 'Ollama — documentação', url: 'https://docs.ollama.com/' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 'metricas',
      title: 'Métricas: do negócio ao sistema',
      blocks: [
        {
          type: 'p',
          text:
            'O suporte ao cliente não quer saber de recall@5. Quer saber quantas conversas ficam resolvidas sem ninguém, se os clientes saem satisfeitos, quanto dinheiro sai mal, e quanto tempo esperam. O trabalho de engenharia é encontrar, para cada métrica de negócio, a métrica de sistema que a **antecipa** — que se mede em minutos numa pull request em vez de em semanas em produção — e verificar de vez em quando que as duas continuam a andar juntas.',
        },
        {
          type: 'table',
          head: ['Métrica de negócio', 'Métrica de sistema que a antecipa', 'Alvo', 'Porque não chega a de negócio'],
          rows: [
            ['Conversas resolvidas sem humano', 'Taxa de resolução autónoma por intenção', '≥ 68%; por intenção, os alvos de `INTENCOES`', 'Só se sabe 48 h depois (sem novo contacto), e mistura todas as intenções'],
            ['Satisfação do cliente', 'Polegar por versão de prompt e de modelo', '≥ 84% de polegares para cima', 'Poucos clientes votam; mede tom, mal mede correcção'],
            ['Respostas erradas', 'Faithfulness e correcção no conjunto dourado', '< 2%, nunca pior do que a versão anterior', 'A revisão humana de 100 conversas por semana é lenta e amostral'],
            ['Dinheiro mal devolvido', 'Acções de escrita auditadas contra a política', '< 0,5% do valor compensado', 'A auditoria contabilística chega um mês depois'],
            ['Tempo até à primeira resposta', 'TTFT p95 e duração p95', 'p95 < 1,5 s', 'É a única que se mede directamente; hoje são 7 minutos'],
            ['Custo por conversa', 'Tokens por turno, turnos por conversa, acerto da cache', '< 1,00 MZN de modelo', 'A factura é mensal; um ciclo em fuga gasta o mês numa tarde'],
          ],
          caption: 'As seis ligações de `METRICAS` (design do «Balcão»).',
        },
        {
          type: 'p',
          text:
            'Repara na definição de «resolvida»: fechada sem escalamento **e sem novo contacto do mesmo cliente sobre o mesmo pedido em 48 horas**. Sem a segunda metade, uma resposta errada e confiante conta como sucesso — o cliente desiste da conversa, volta no dia seguinte, e a métrica diz que o assistente resolveu. É o tipo de definição que um engenheiro tem de discutir com o produto antes de haver um painel, porque depois de haver um painel ninguém a muda.',
        },
        {
          type: 'p',
          text:
            'A métrica de sistema que mais trabalho dá a construir é a correcção no conjunto dourado. O «Balcão» de produção tem 240 perguntas com resposta esperada e documentos relevantes, mais 60 conversas multi-turno e 120 ataques de red team. O runtime do browser traz uma amostra de 30, e contá-las por intenção mostra logo um problema de construção.',
        },
        {
          type: 'run',
          run: {
            id: 'run-engenharia-ia-03',
            title: 'O que a amostra do conjunto dourado cobre',
            brief: 'As 30 perguntas douradas do runtime, contadas pela etiqueta de intenção. Compara com a distribuição real das conversas.',
            code: `import balcao as b
from collections import Counter

conta = Counter(p["intencao"] for p in b.PERGUNTAS)
print(len(b.PERGUNTAS), "perguntas douradas na amostra")
for intencao, n in conta.most_common():
    print(f"  {intencao:<20} {n:>2}  {'#' * n}")
g = b.PERGUNTAS[0]
print("exemplo:", g["id"], "|", g["pergunta"], "->", g["relevantes"])`,
            expected: `30 perguntas douradas na amostra
  reembolso             3  ###
  problema-pedido       3  ###
  taxas                 3  ###
  pagamentos            3  ###
  cancelamento          2  ##
  cupoes                2  ##
  cobertura             2  ##
  entrega               2  ##
  conta                 2  ##
  pedidos               2  ##
  atraso                1  #
  seguranca             1  #
  restricoes            1  #
  farmacia              1  #
  subscricao            1  #
  seguranca-alimentar   1  #
exemplo: g01 | Quanto tempo demora a devolução do dinheiro no M-Pesa? -> ['pol-reembolso-prazos']`,
          },
        },
        {
          type: 'p',
          text:
            'A amostra foi desenhada para testar **recuperação** (cada pergunta tem os documentos relevantes), e por isso é quase toda de política: não tem nenhuma pergunta fora de âmbito, e a intenção mais frequente em produção — «onde está o meu pedido», 31% das conversas — não aparece, porque não se resolve com documentos. Um conjunto dourado que mede uma camada não mede o sistema. O conjunto completo é estratificado pelas intenções de produção e inclui as 40 perguntas fora de âmbito que testam a recusa (módulo 20).',
        },
        {
          type: 'code',
          lang: 'json',
          caption:
            'Uma linha de `dados/dourado.jsonl`: pergunta, resposta esperada, documentos relevantes, intenção e caminho. Versionada no repositório como código (adr-0018).',
          code: `{"id": "g02", "pergunta": "O meu pedido chegou 50 minutos atrasado, tenho direito a alguma coisa?",
 "resposta": "Sim: mais de 45 minutos de atraso dá um cupão de 200 MZN ou o reembolso da taxa de entrega.",
 "relevantes": ["pol-atraso-compensacao"], "intencao": "compensacao", "caminho": "agente",
 "ferramentas_esperadas": ["ler_pedido", "calcular_reembolso"]}`,
        },
        { type: 'file', ref: 'dados/dourado.jsonl' },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção, a média esconde a intenção que piorou',
          text:
            'Uma mudança de prompt que sobe a correcção global de 86% para 87% pode ter descido a recusa correcta de 92% para 78% — há poucas perguntas fora de âmbito, e a média quase não mexe. O gate de CI do «Balcão» é **por intenção**, não só global, e uma descida acima do intervalo de confiança em qualquer intenção bloqueia o merge (RI-04). O mesmo vale para os painéis: custo e resolução mostram-se por intenção, porque é assim que as falhas aparecem.',
        },
        { type: 'adr', ref: 'adr-0018' },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI — evals: boas práticas', url: 'https://platform.openai.com/docs/guides/evaluation-best-practices' },
            { label: "Anthropic — criar avaliações empíricas", url: "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests" },
            { label: 'Google SRE — Service Level Objectives', url: 'https://sre.google/sre-book/service-level-objectives/' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'caminhos-e-mapa',
      title: 'Caminhos de resolução e o mapa dos 32 módulos',
      blocks: [
        {
          type: 'p',
          text:
            'Juntando as intenções e a pergunta «precisa de LLM?», o «Balcão» fica com quatro caminhos: **ferramenta** (ler o pedido e responder), **RAG** (pesquisar políticas e responder com citação), **agente** (política, dados e acções, com limites) e **humano** (passar a conversa com resumo). A escolha do caminho é feita por um router explícito num grafo, e não por um agente livre que decide tudo sozinho: quase um quarto das conversas (política e fora de âmbito) não precisa de ferramentas nenhumas, e os casos de saúde têm de ir para uma pessoa antes de qualquer modelo decidir.',
        },
        {
          type: 'graph',
          graph: {
            id: 'gr-engenharia-ia-01',
            title: 'O grafo do «Balcão», em versão de mapa',
            brief: 'Os nós de `grafo.py`, simplificados. O router escolhe o caminho; as guardas correm em todos.',
            entry: 'inicio',
            nodes: [
              { id: 'inicio', label: 'START', kind: 'inicio', col: 0, row: 1 },
              { id: 'guarda_entrada', label: 'guarda_entrada', kind: 'guarda', sub: 'PII, injecção, termos de saúde', col: 1, row: 1, ms: 25 },
              { id: 'classificar', label: 'classificar', kind: 'router', sub: 'regras + modelo pequeno', col: 2, row: 1, ms: 350, tokens: 420 },
              { id: 'responder_rag', label: 'responder_rag', kind: 'retriever', sub: 'pesquisa + modelo médio', col: 3, row: 0, ms: 925, tokens: 5200 },
              { id: 'agente', label: 'agente', kind: 'llm', sub: 'modelo médio com ferramentas', col: 3, row: 1, ms: 700, tokens: 6300 },
              { id: 'ferramentas', label: 'ferramentas', kind: 'ferramenta', sub: 'ToolNode, limites no código', col: 4, row: 1, ms: 120 },
              { id: 'aprovacao', label: 'aguardar_aprovacao', kind: 'humano', sub: 'interrupt acima de 500 MZN', col: 4, row: 2 },
              { id: 'escalar', label: 'escalar', kind: 'humano', sub: 'transferir_humano com resumo', col: 3, row: 2, ms: 80 },
              { id: 'guarda_saida', label: 'guarda_saida', kind: 'guarda', sub: 'citações válidas e públicas', col: 5, row: 1, ms: 30 },
              { id: 'fim', label: 'END', kind: 'fim', col: 6, row: 1 },
            ],
            edges: [
              { from: 'inicio', to: 'guarda_entrada' },
              { from: 'guarda_entrada', to: 'classificar' },
              { from: 'classificar', to: 'responder_rag', label: 'politica, outros', cond: 'intencao in {politica, outros}' },
              { from: 'classificar', to: 'agente', label: 'pedido concreto', cond: 'intencao in {onde-esta, compensacao, pagamentos}' },
              { from: 'classificar', to: 'escalar', label: 'saúde, humano', cond: 'intencao in {seguranca, humano, conta}' },
              { from: 'agente', to: 'ferramentas', label: 'tool_calls', cond: 'última mensagem tem tool_calls' },
              { from: 'ferramentas', to: 'agente', label: 'resultado' },
              { from: 'ferramentas', to: 'aprovacao', label: '> 500 MZN', cond: 'valor > limite_reembolso_mzn' },
              { from: 'agente', to: 'guarda_saida', label: 'resposta' },
              { from: 'responder_rag', to: 'guarda_saida' },
              { from: 'aprovacao', to: 'guarda_saida' },
              { from: 'escalar', to: 'guarda_saida' },
              { from: 'guarda_saida', to: 'fim' },
            ],
            runs: [
              { label: 'Posso juntar dois cupões?', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['responder_rag'], ['guarda_saida'], ['fim']], outcome: 'Resposta com [pol-cupoes]; nenhuma ferramenta.', note: 'Caminho RAG: 18% das conversas.' },
              { label: 'O PD-8842507 não chegou, quero o dinheiro', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['agente'], ['ferramentas'], ['agente'], ['ferramentas'], ['aprovacao']], outcome: '2 910 MZN passa o limite: o grafo pára num interrupt até um supervisor decidir.', note: 'O modelo nunca chega a emitir o reembolso; o limite está no código.' },
              { label: 'O prato tinha amendoim e o meu filho está inchado', path: [['inicio'], ['guarda_entrada'], ['classificar'], ['escalar'], ['guarda_saida'], ['fim']], outcome: 'Escalado com prioridade urgente; a regra de saúde decide antes do modelo.', note: 'Caminho humano: sucesso é passar bem a conversa.' },
            ],
            note: 'O grafo completo, com memória e resumo, é construído no módulo 16; a aprovação humana com checkpoints no módulo 17.',
          },
        },
        { type: 'adr', ref: 'adr-0013' },
        {
          type: 'table',
          head: ['Parte', 'Módulos', 'Camada da stack', 'O que fica a funcionar no «Balcão»'],
          rows: [
            ['I · LLMs', '1–6', 'Modelo, contexto, ferramentas', 'Chamadas com custo medido, prompt versionado, 12 ferramentas com esquemas, escalões de modelo'],
            ['II · RAG e bases vectoriais', '7–12', 'Contexto', 'Ingestão, pgvector com HNSW, pesquisa híbrida com re-ranking, citações e recusa'],
            ['III · LangChain, LangGraph e agentes', '13–19', 'Orquestração', 'Cadeia RAG em LCEL, grafo com router, checkpoints, interrupt, memória, servidor MCP'],
            ['IV · Avaliação e segurança', '20–24', 'Avaliação e guardrails', 'Conjunto dourado, métricas de RAG, juiz calibrado, avaliação de trajectórias, guardrails'],
            ['V · Produção', '25–30', 'Serviço e operação', 'FastAPI com SSE, Git, Docker, CI/CD com evals como gate, OpenTelemetry, custo'],
            ['VI · O «Balcão», ponta a ponta', '31–32', 'Todas', 'O sistema inteiro a correr e a preparação para entrevista'],
          ],
          caption: 'O mapa do tutorial. Cada parte fecha uma camada e deixa uma peça do laboratório a funcionar.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Conjunto dourado primeiro', text: '30 perguntas reais com resposta esperada, estratificadas por intenção, antes de qualquer prompt. É o teu teste de regressão desde o primeiro dia.' },
            { title: 'O caminho mais simples que passa', text: 'Uma chamada com o prompt de sistema e o contexto RAG. Mede. Muitas vezes chega para as perguntas de política.' },
            { title: 'Ferramentas para os dados vivos', text: 'Quando a resposta depende de um pedido concreto, o dado entra por ferramenta, com autorização no código.' },
            { title: 'Grafo quando há acções e humanos', text: 'Router, limites, aprovação, retoma. Só quando o caminho simples provadamente não chega.' },
            { title: 'Operação desde o primeiro deploy', text: 'Traços com tokens e custo, evals em CI, versão de modelo fixada. Não é uma fase final: é o que te deixa mudar sem medo.' },
          ],
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Como ler o resto do tutorial',
          text:
            'Cada módulo começa pelo mecanismo, passa pela decisão (com o ADR que a regista) e termina com código real do laboratório e um erro clássico. Se vens de backend, os módulos 2, 4 e 20 são os que mais mudam a tua forma de pensar; os módulos 25 a 28 vão parecer-te familiares, e é nas diferenças que está o valor.',
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'O laboratório corre sem chave de API e sem rede: modelo simulado, índice em memória, testes offline (RE-03).',
          code: `cd laboratorio
make instalar        # uv sync --frozen
make testes          # testes offline, modelo simulado
make evals           # conjunto dourado + red team; relatório em relatorios/
make api             # http://localhost:8000/docs

# Com modelo local real (Ollama) e PostgreSQL com pgvector:
BALCAO_MODELO_FORNECEDOR=ollama docker compose --profile ollama up -d --build --wait`,
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — workflows e agentes', url: 'https://docs.langchain.com/oss/python/langgraph/workflows-agents' },
            { label: 'uv — documentação', url: 'https://docs.astral.sh/uv/' },
            { label: 'Docker Compose — documentação', url: 'https://docs.docker.com/compose/' },
          ],
        },
      ],
    },
  ],

  /* ================================================================== quiz */
  quiz: [
    {
      id: 'q-engenharia-ia-01',
      topic: 'engenharia-ia',
      prompt: 'Qual destas afirmações descreve melhor a diferença entre engenharia de IA e ML engineering?',
      options: [
        'Engenharia de IA usa redes neuronais; ML engineering usa modelos lineares.',
        'Em engenharia de IA o modelo é uma dependência pré-treinada por terceiros e o trabalho é adaptar o sistema à volta dele e medi-lo; em ML engineering o artefacto é o modelo treinado nos teus dados.',
        'Engenharia de IA não precisa de avaliação porque os modelos de fundação já foram avaliados pelo fornecedor.',
        'A diferença é só de nome: as duas começam por recolher dados etiquetados.',
      ],
      answer: [1],
      explain:
        'O que muda é o artefacto e o ciclo: em engenharia de IA não treinas pesos (em regra), mudas o contexto, as ferramentas e a orquestração, e medes o comportamento com conjuntos dourados. As avaliações do fornecedor são genéricas; nenhuma mede as políticas do «Chega».',
    },
    {
      id: 'q-engenharia-ia-02',
      topic: 'engenharia-ia',
      prompt: 'A equipa quer que o modelo calcule a compensação por atraso a partir do texto da política. Que problemas isto cria? (escolhe dois)',
      options: [
        'O modelo não tem o número de minutos de atraso, que só existe no sistema de pedidos.',
        'O cálculo passa a depender de a política certa ter sido recuperada e bem lida, e deixa de ser auditável como uma função.',
        'Os modelos de linguagem não conseguem fazer somas de dois dígitos.',
        'O custo por token de uma subtracção é proibitivo.',
      ],
      answer: [0, 1],
      explain:
        'O problema não é o modelo «não saber somar»: é que o dado não está no contexto e a regra deixa de ser uma função testável. `calcular_reembolso` lê o pedido, aplica a regra e devolve o valor e a regra que o justifica — auditável e grátis.',
    },
    {
      id: 'q-engenharia-ia-03',
      topic: 'stack',
      prompt: 'Uma resposta do «Balcão» citou a política de reembolsos de 2025 (72 horas) em vez da actual (24 horas). Em que camada está o problema?',
      options: ['Modelo: é preciso um modelo maior.', 'Contexto e RAG: o filtro `vigente` não foi aplicado na pesquisa.', 'Serviço: o SSE entregou a mensagem errada.', 'Operação: falta um alarme de latência.'],
      answer: [1],
      explain:
        'O modelo usou o que lhe deram. A correcção é garantir que chunks não vigentes nunca chegam ao contexto, com o filtro aplicado na base de dados antes do ranking (adr-0010). Um modelo maior citaria a política errada com mais eloquência.',
    },
    {
      id: 'q-engenharia-ia-04',
      topic: 'metricas',
      prompt: 'Porque é que a definição de «conversa resolvida» do «Balcão» inclui «sem novo contacto do mesmo cliente sobre o mesmo pedido em 48 horas»?',
      options: [
        'Para reduzir o número de conversas contadas e melhorar a percentagem.',
        'Porque sem isso uma resposta errada e confiante, que o cliente abandona, conta como resolvida.',
        'Porque o WhatsApp apaga as conversas ao fim de 48 horas.',
        'Porque o fornecedor de modelo cobra por períodos de 48 horas.',
      ],
      answer: [1],
      explain:
        'É a diferença entre medir o que o assistente fez e medir o que o cliente conseguiu. O preço é que a métrica só fica conhecida dois dias depois — por isso precisa de métricas de sistema que a antecipem.',
    },
    {
      id: 'q-engenharia-ia-05',
      topic: 'custo',
      prompt: 'A conta de guardanapo dá 0,66 MZN por conversa com cache de prompt e 1,23 MZN sem ela. O que se conclui?',
      options: [
        'A cache é uma optimização opcional para depois do lançamento.',
        'A cache de prompt faz parte do desenho: sem ela, o escalão médio não cumpre o RNF-02.',
        'É preciso passar para o modelo grande para compensar.',
        'O custo é irrelevante porque uma conversa humana custa 42 MZN.',
      ],
      answer: [1],
      explain:
        'Com o orçamento de 1,00 MZN, 1,23 MZN falha o requisito. E o custo não é irrelevante só por ser menor do que o humano: um ciclo de ferramentas em fuga pode gastar muitas vezes o valor médio numa só conversa (RI-06).',
    },
    {
      id: 'q-engenharia-ia-06',
      topic: 'ferramenta-errada',
      prompt: 'Em que destes passos um LLM é a ferramenta certa? (escolhe dois)',
      options: [
        'Perceber que «o motoqueiro esqueceu-se de mim, paguei 2x no mpesa» é sobre pagamentos e entrega.',
        'Decidir se um reembolso de 2 910 MZN pode ser emitido sem aprovação.',
        'Redigir em duas frases, no tom do «Chega», a política de cupões com a fonte citada.',
        'Verificar se o número de cartão num texto passa o algoritmo de Luhn.',
      ],
      answer: [0, 2],
      explain:
        'Interpretar texto livre e redigir texto livre são as forças do modelo. O limite de 500 MZN e o Luhn são regras exactas: vivem em código, com testes, e não dependem da confiança de ninguém.',
    },
    {
      id: 'q-engenharia-ia-07',
      topic: 'metricas',
      prompt: 'Uma alteração de prompt sobe a correcção global de 86% para 87% no conjunto dourado. O que pode estar escondido?',
      options: [
        'Nada: uma subida global é sempre uma melhoria.',
        'Uma descida numa intenção pequena (por exemplo, recusa correcta fora de âmbito) que a média quase não mostra.',
        'Um aumento do TTFT, que o conjunto dourado mede.',
        'Uma fuga de PII, que a correcção detecta.',
      ],
      answer: [1],
      explain:
        'Com 40 perguntas fora de âmbito em 240, uma queda de 14 pontos na recusa move a média em ≈ 2 pontos, e pode ser compensada por melhorias noutras intenções. Por isso o gate é por intenção, com intervalo de confiança.',
    },
    {
      id: 'q-engenharia-ia-08',
      topic: 'stack',
      prompt: 'O «Balcão» tem de aguentar o pico de 11 mensagens por minuto com margem de 3×. Qual é, em regra, o primeiro limite que aparece?',
      options: ['A CPU do processo Python.', 'O rate limit do fornecedor em tokens por minuto.', 'O número de núcleos do PostgreSQL.', 'O tamanho do índice vectorial (5,7 MB).'],
      answer: [1],
      explain:
        'O serviço passa quase todo o turno à espera de I/O e o índice cabe em memória. O que limita o débito é quantos tokens por minuto o fornecedor aceita — um problema de filas e backpressure, não de CPU (módulo 30).',
    },
    {
      id: 'q-engenharia-ia-09',
      topic: 'balcao',
      prompt: 'Porque é que o «Balcão» usa um router explícito num grafo em vez de um agente livre que decide tudo? (escolhe dois)',
      options: [
        'Porque os casos de saúde têm de ir para uma pessoa antes de qualquer modelo decidir.',
        'Porque muitas conversas não precisam de ferramentas e um agente livre gastaria chamadas e variância nelas.',
        'Porque os agentes livres não conseguem chamar ferramentas.',
        'Porque o LangGraph não suporta agentes.',
      ],
      answer: [0, 1],
      explain:
        'Um agente livre é mais flexível e menos previsível: decide caminhos, número de passos e custo. Com intenções conhecidas e regras de escalamento fixas, um router explícito dá previsibilidade, custo menor e caminhos testáveis (adr-0013).',
    },
  ],

  /* ============================================================= exercícios */
  exercises: [
    {
      id: 'e-engenharia-ia-01',
      title: 'Conversas por dia de uma intenção',
      statement:
        'O «Balcão» recebe 1 150 conversas por dia e a intenção «Onde está o meu pedido» pesa 31%. Quantas conversas por dia são desta intenção (arredonda às unidades)?',
      kind: 'input',
      accept: ['357', '356', '356,5', '356.5', '≈ 357'],
      hint: 'Multiplica o total pelo peso.',
      solution:
        '1 150 × 0,31 = 356,5, ou seja ≈ 357 conversas por dia. Com a resolução alvo de 90%, são ≈ 321 conversas por dia resolvidas por uma chamada a `ler_pedido` e uma frase — a maior fatia do valor do sistema, quase sem modelo generativo.',
      difficulty: 1,
    },
    {
      id: 'e-engenharia-ia-02',
      title: 'Classificar os passos de um fluxo',
      statement:
        'Para a conversa «Fui cobrado duas vezes no M-Pesa pelo PD-8841273», lista os passos que o sistema tem de executar e diz, para cada um, se deve ser regra, pesquisa, ML clássico ou LLM, e porquê.',
      kind: 'open',
      hint: 'Separa interpretar a mensagem, obter dados, aplicar a política, detectar fraude e redigir.',
      solution:
        'Interpretar a mensagem e extrair a intenção e o `PD-8841273`: LLM pequeno com saída estruturada (texto livre, variedade que não se enumera), com um regex para o número de pedido como atalho. Ler o pedido e as cobranças: ferramenta (código). Aplicar a política de cobrança duplicada (reversão automática em até 72 horas): pesquisa da política para a citar; a decisão de reverter é do sistema de pagamentos, não do modelo. Sinais de fraude: regra ou ML clássico sobre features (reembolsos em 30 dias, antiguidade), nunca o modelo a «achar». Redigir a resposta com a fonte citada: LLM médio. Se houver sinais de fraude: escalar sem acusar, por regra.',
      difficulty: 2,
    },
    {
      id: 'e-engenharia-ia-03',
      title: 'Métrica que antecipa a satisfação',
      statement:
        'O produto quer um painel diário de satisfação do cliente, mas só 8% dos clientes carregam no polegar. Propõe duas métricas de sistema, medíveis sem o cliente votar, que antecipem a satisfação, e diz como verificarias que andam juntas com o polegar.',
      kind: 'design',
      hint: 'Pensa em comportamento observável depois da resposta e em avaliação automática.',
      solution:
        'Taxa de novo contacto em 48 h sobre o mesmo pedido (comportamento: se voltou, não ficou resolvido) e taxa de pedido explícito de humano depois de uma resposta do assistente. Uma terceira possível: correcção medida por juiz calibrado numa amostra diária de conversas. Para verificar que antecipam a satisfação: correlacionar, por semana e por intenção, estas taxas com a percentagem de polegares para cima nos 8% que votam, e rever manualmente os casos em que divergem (por exemplo, respostas correctas com tom errado).',
      difficulty: 2,
    },
    {
      id: 'e-engenharia-ia-04',
      title: 'Custo por turno com o escalão pequeno',
      statement:
        'Usa `b.custo_mzn(tokens_entrada, tokens_saida, modelo, tokens_cache)` para calcular o custo da chamada de classificação (≈ 420 tokens de entrada, 20 de saída, sem cache) no escalão pequeno, e o custo por dia se houver 3 900 turnos. Escreve o código e o resultado.',
      kind: 'code',
      hint: 'O custo por chamada é muito pequeno: formata com 5 casas decimais.',
      solution:
        'import balcao as b\npor_chamada = b.custo_mzn(420, 20, "pequeno")\nprint(f"{por_chamada:.5f} MZN por chamada")      # 0.00830 MZN\nprint(f"{por_chamada * 3900:.1f} MZN por dia")   # 32.4 MZN\n\nA classificação custa ≈ 32 MZN por dia, ≈ 4% do custo total de modelo. É por isso que vale a pena ter um escalão pequeno para este papel e não pôr o médio a classificar.',
      difficulty: 1,
    },
    {
      id: 'e-engenharia-ia-05',
      title: 'Desenhar o caminho de uma intenção nova',
      statement:
        'O produto quer que o «Balcão» passe a responder a «Posso agendar um pedido para sábado às 13h?» e também a agendar o pedido. Descreve o caminho no grafo (regras, pesquisa, ferramentas, modelo), os limites de autonomia e a métrica que usarias para decidir se a funcionalidade entra.',
      kind: 'design',
      hint: 'Separa a pergunta sobre a regra (RAG) da acção (ferramenta com efeito).',
      solution:
        'Responder à regra é caminho RAG sobre `faq-agendar-pedido` (até 3 dias de antecedência, janelas de 30 minutos), com citação. Agendar é uma acção com efeito: nova ferramenta `agendar_pedido` com validação no código (janela válida, restaurante aberto, antecedência ≤ 3 dias), confirmação explícita do cliente antes de executar e chave de idempotência. O router encaminha para o agente quando há pedido de acção. Autonomia: autónoma com confirmação, porque o custo de um erro é baixo e reversível. Métrica: tool-call accuracy num conjunto de 30 conversas de agendamento, zero agendamentos sem confirmação, e nenhuma regressão nas outras intenções no gate de CI.',
      difficulty: 3,
    },
  ],

  /* ================================================================= labs */
  labs: [
    {
      id: 'lab-engenharia-ia-01',
      moduleId: 'engenharia-ia',
      title: 'Um pré-router sem modelo',
      brief:
        'Escreve `encaminhar(mensagem)` que devolve `"humano"`, `"ferramenta"` ou `"modelo"` sem chamar nenhum modelo: risco para a saúde ou pedido explícito de pessoa vai para humano; uma mensagem com número de pedido `PD-NNNNNNN` vai para ferramenta; o resto vai para o modelo. Usa `b.normalizar` para tirar acentos e maiúsculas antes de procurar os termos.',
      lang: 'python',
      starter: `import re

import balcao as b

RE_PEDIDO = re.compile(r"PD-\\d+")


def encaminhar(mensagem: str) -> str:
    """Primeira decisão do turno, sem modelo: 'humano', 'ferramenta' ou 'modelo'."""
    # TODO: termos de risco (alergia, amendoim, intoxicação...) e pedido de humano primeiro
    if RE_PEDIDO.search(mensagem):
        return "ferramenta"
    return "modelo"


print(encaminhar("O prato do PD-8843115 tinha amendoim e o meu filho está inchado"))`,
      checks: [
        { id: 'normaliza', label: 'Normaliza o texto antes de procurar termos', re: 'normalizar\\(', why: '«Alérgico», «ALERGIA» e «alergia» têm de dar o mesmo resultado.' },
        { id: 'risco', label: 'Tem uma expressão para termos de risco', re: 'amendoim', why: 'Os termos de saúde são a regra mais importante do router.' },
        { id: 'humano', label: 'Devolve "humano"', re: 'return\\s+"humano"', why: 'Casos de risco e pedidos de pessoa têm de sair do caminho do modelo.' },
        { id: 'pedido-exacto', label: 'O número de pedido tem exactamente 7 dígitos', re: 'PD-\\\\d\\{7\\}', why: '`PD-\\d+` apanha `PD-1` e textos que não são pedidos; o formato do «Chega» é PD-NNNNNNN.' },
        { id: 'ordem', label: 'O risco é verificado antes do número de pedido', re: '"humano"[\\s\\S]*"ferramenta"', why: 'Uma mensagem de alergia com número de pedido tem de ir para humano, não para `ler_pedido`.' },
        { id: 'sem-modelo', label: 'Não chama nenhum modelo', re: 'ModeloSimulado|invoke\\(|init_chat_model', forbid: true, why: 'O objectivo é decidir sem modelo: rápido, grátis e auditável.' },
      ],
      hints: [
        'Compila uma expressão com os termos em minúsculas e sem acentos: `re.compile(r"\\b(alergi\\w*|amendoim|intoxica\\w*|inchad\\w*)\\b")`.',
        'Aplica-a a `b.normalizar(mensagem)`, não à mensagem original.',
        'A ordem dos `if` é a política: risco primeiro, pedido depois.',
      ],
      solution: `import re

import balcao as b

# Termos de risco para a saúde ou a segurança: vão para uma pessoa antes de qualquer modelo.
RE_RISCO = re.compile(r"\\b(alergi\\w*|alergic\\w*|amendoim|intoxica\\w*|inchad\\w*|sangue|ameac\\w*|roubo|assalt\\w*)\\b")
RE_HUMANO = re.compile(r"\\b(falar com (uma )?pessoa|humano|atendente|operador)\\b")
RE_PEDIDO = re.compile(r"\\bPD-\\d{7}\\b")


def encaminhar(mensagem: str) -> str:
    """Primeira decisão do turno, sem modelo: 'humano', 'ferramenta' ou 'modelo'."""
    texto = b.normalizar(mensagem)
    if RE_RISCO.search(texto) or RE_HUMANO.search(texto):
        return "humano"
    if RE_PEDIDO.search(mensagem):
        return "ferramenta"
    return "modelo"


casos = {
    "O prato do PD-8843115 tinha amendoim e o meu filho está inchado": "humano",
    "O meu pedido PD-8842507 ainda vai demorar muito?": "ferramenta",
    "Posso juntar dois cupões no mesmo pedido?": "modelo",
    "Quero falar com uma pessoa": "humano",
}
for msg, esperado in casos.items():
    obtido = encaminhar(msg)
    assert obtido == esperado, (msg, obtido)
    print(f"{obtido:<10} <- {msg}")`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-engenharia-ia-02',
      moduleId: 'engenharia-ia',
      title: 'A conta de guardanapo em código',
      brief:
        'Escreve `custo_dia(modelo, fraccao_cache)` que estima o custo de modelo por dia do «Balcão» a partir dos números do projecto: 1 150 conversas, 3,4 turnos por conversa, 5 200 tokens de entrada e 180 de saída por turno. Usa `b.custo_mzn` (não escrevas os preços à mão) e passa os tokens em cache pelo argumento `tokens_cache`.',
      lang: 'python',
      starter: `import balcao as b

CONVERSAS_DIA = 1150


def custo_dia(modelo: str = "medio", fraccao_cache: float = 0.6) -> float:
    # TODO: turnos por dia, tokens por turno, custo por turno com b.custo_mzn
    return CONVERSAS_DIA * 0.66


print(custo_dia())`,
      checks: [
        { id: 'custo-mzn', label: 'Usa `b.custo_mzn`', re: 'custo_mzn\\(', why: 'Os preços por escalão vêm do runtime; escrevê-los à mão desactualiza-se.' },
        { id: 'turnos', label: 'Usa 3,4 turnos por conversa', re: '3\\.4', why: 'O custo é por turno: cada turno é uma chamada com o histórico.' },
        { id: 'cache', label: 'Passa os tokens em cache', re: 'tokens_cache\\s*=', why: 'A cache de prompt é o que põe o escalão médio dentro do orçamento.' },
        { id: 'entrada', label: 'Usa 5 200 tokens de entrada por turno', re: '5200|5_200', why: 'É o número do orçamento de contexto: sistema, esquemas, RAG e histórico.' },
        { id: 'sem-magico', label: 'Não usa o 0,66 como constante', re: '0\\.66', forbid: true, why: '0,66 é o resultado, não o dado de entrada.' },
      ],
      hints: [
        'Turnos por dia = `CONVERSAS_DIA * TURNOS_POR_CONVERSA`.',
        'Tokens em cache = `int(ENTRADA_TURNO * fraccao_cache)`.',
        'Custo por dia = turnos por dia × `b.custo_mzn(ENTRADA_TURNO, SAIDA_TURNO, modelo, tokens_cache=...)`.',
      ],
      solution: `import balcao as b

CONVERSAS_DIA = 1150
TURNOS_POR_CONVERSA = 3.4
ENTRADA_TURNO = 5200
SAIDA_TURNO = 180
FRACCAO_CACHE = 0.6


def custo_dia(modelo: str = "medio", fraccao_cache: float = FRACCAO_CACHE) -> float:
    turnos_dia = CONVERSAS_DIA * TURNOS_POR_CONVERSA
    em_cache = int(ENTRADA_TURNO * fraccao_cache)
    por_turno = b.custo_mzn(ENTRADA_TURNO, SAIDA_TURNO, modelo, tokens_cache=em_cache)
    return round(turnos_dia * por_turno)


for modelo in ("medio", "grande"):
    print(modelo, custo_dia(modelo), "MZN/dia com cache;", custo_dia(modelo, 0.0), "sem cache")
print("tokens de entrada por dia:", round(CONVERSAS_DIA * TURNOS_POR_CONVERSA * ENTRADA_TURNO / 1e6, 1), "M")
# medio 823 MZN/dia com cache; 1524 sem cache
# grande 2468 MZN/dia com cache; 4572 sem cache
# tokens de entrada por dia: 20.3 M`,
      difficulty: 2,
      executavel: true,
    },
  ],

  /* ============================================================ casos de uso */
  useCases: [
    {
      id: 'uc-engenharia-ia-01',
      title: 'Carteira móvel: reclamações de transferências sem pôr o modelo a decidir dinheiro',
      area: 'Serviços financeiros',
      level: 2,
      scenario:
        'Uma carteira móvel moçambicana recebe ≈ 4 000 reclamações por dia no WhatsApp: transferências para o número errado, cobranças em duplicado, recargas que não chegaram. Hoje 30 pessoas lêem cada mensagem, abrem o histórico da transacção e aplicam um manual de 60 páginas. A direcção quer «um ChatGPT para as reclamações». O regulador exige que cada reversão seja justificada por regra escrita e auditável.',
      requirements: [
        'Primeira resposta em segundos, não em horas, com o estado real da transacção.',
        'Nenhuma reversão de dinheiro decidida por um modelo; todas justificadas por regra.',
        'Suspeitas de fraude encaminhadas para a equipa de risco sem alertar o suspeito.',
        'Português e mistura com changana e inglês nas mensagens.',
      ],
      constraints: [
        'Dados de transacções não podem sair do país para um fornecedor sem acordo de tratamento de dados.',
        'Equipa de dois engenheiros.',
      ],
      approach: [
        { title: 'Separar interpretar de decidir', text: 'Um modelo pequeno extrai da mensagem a intenção e as referências (número da transacção, valor, número de destino) em saída estruturada. Não decide nada.' },
        { title: 'Regras para o dinheiro', text: 'A elegibilidade de reversão é uma função sobre o estado da transacção (já creditada? destinatário activo? dentro de 24 h?) mantida pela equipa de pagamentos, com testes.' },
        { title: 'ML clássico para fraude', text: 'O modelo de risco que já existe (gradient boosting sobre features de transacções) pontua cada caso; acima do limiar, a conversa vai para risco com uma resposta neutra.' },
        { title: 'LLM para explicar', text: 'O modelo médio redige a resposta a partir do resultado da regra e do artigo do manual recuperado, com a referência do artigo.' },
      ],
      diagram: {
        title: 'Reclamação de transferência: quem decide o quê',
        cols: 5,
        rows: 3,
        zones: [
          { id: 'z-llm', label: 'Modelo', col: 1, row: 0, colSpan: 1, rowSpan: 3, tone: 'agente' },
          { id: 'z-det', label: 'Determinista', col: 2, row: 0, colSpan: 2, rowSpan: 3, tone: 'service' },
        ],
        nodes: [
          { id: 'msg', label: 'Mensagem WhatsApp', sub: 'texto livre', col: 0, row: 1, kind: 'user' },
          { id: 'extrair', label: 'Extrair intenção e referências', sub: 'modelo pequeno, saída estruturada', col: 1, row: 0, kind: 'model' },
          { id: 'regra', label: 'Regra de reversão', sub: 'função testada, versionada', col: 2, row: 0, kind: 'service' },
          { id: 'risco', label: 'Pontuação de fraude', sub: 'ML clássico existente', col: 2, row: 2, kind: 'service' },
          { id: 'tx', label: 'Sistema de transacções', col: 3, row: 1, kind: 'data' },
          { id: 'redigir', label: 'Redigir resposta', sub: 'modelo médio + artigo do manual', col: 1, row: 2, kind: 'model' },
          { id: 'humano', label: 'Equipa de risco', col: 4, row: 2, kind: 'user' },
          { id: 'cliente', label: 'Resposta ao cliente', col: 4, row: 0, kind: 'user' },
        ],
        edges: [
          { from: 'msg', to: 'extrair' },
          { from: 'extrair', to: 'regra', label: 'referências' },
          { from: 'regra', to: 'tx', label: 'estado' },
          { from: 'extrair', to: 'risco' },
          { from: 'risco', to: 'humano', label: 'acima do limiar' },
          { from: 'regra', to: 'redigir', label: 'decisão + regra', style: 'dashed' },
          { from: 'redigir', to: 'cliente' },
        ],
      },
      solution:
        'O LLM entra em dois pontos — perceber a mensagem e redigir a resposta — e nunca no caminho da decisão sobre dinheiro. A regra de reversão e o modelo de risco já existiam ou eram fáceis de escrever; o que faltava era a interface em linguagem natural. Os modelos correm num fornecedor com residência de dados aprovada, ou localmente, com as referências de transacção mascaradas antes de sair do perímetro.',
      tools: [
        { name: 'Modelo pequeno', role: 'Extracção estruturada de intenção e referências', badge: 'pequeno' },
        { name: 'Modelo médio', role: 'Redacção da resposta com o artigo citado', badge: 'medio' },
        { name: 'Regras de reversão', role: 'Decisão auditável, mantida por pagamentos', badge: 'código' },
        { name: 'Modelo de risco existente', role: 'Pontuação de fraude', badge: 'ML clássico' },
      ],
      rejected: [
        { option: 'Um agente com uma ferramenta «reverter transacção»', why: 'Põe a decisão de dinheiro dependente do modelo e de uma mensagem que o cliente controla; o regulador exige regra escrita.' },
        { option: 'Fine-tuning com o histórico de reclamações', why: 'Ensina o estilo das respostas antigas, incluindo os erros; não dá citação nem acompanha as mudanças do manual.' },
        { option: 'Só regras com menus («carregue 1 para...»)', why: 'É o que existe hoje no USSD e a taxa de abandono é alta: as reclamações chegam em texto livre e com várias questões na mesma mensagem.' },
      ],
      costNote:
        'Por reclamação, uma chamada pequena (≈ 500 tokens) e uma média (≈ 3 000 de entrada, 150 de saída): na ordem de 0,2 a 0,3 MZN aos preços dos escalões de referência, contra vários minutos de uma pessoa. O custo relevante não é o do modelo; é o de uma reversão errada.',
      takeaways: [
        'O LLM é a interface de linguagem natural, não o motor de decisão.',
        'Quando já existe uma regra ou um modelo clássico, o LLM embrulha-o; não o substitui.',
        'A pergunta «que acontece se o modelo errar aqui?» decide onde ele entra.',
      ],
      refs: [
        { label: 'OWASP — Top 10 para aplicações LLM (Excessive Agency)', url: 'https://genai.owasp.org/llm-top-10/' },
        { label: 'NIST — AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
      ],
    },
  ],
};
