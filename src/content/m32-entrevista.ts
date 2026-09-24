import type { Module } from '../types';
import { seccoesA } from './m32-entrevista.parte-a';
import { seccoesB } from './m32-entrevista.parte-b';

export const m32: Module = {
  id: 'entrevista',
  number: 32,
  part: 'balcao',
  title: 'Preparação para entrevista de AI engineer',
  subtitle: 'Perguntas conceptuais com resposta-modelo, dois system designs resolvidos, cenários de debugging, código ao vivo e os sinais que decidem uma vaga sénior',
  icon: '🎯',
  minutes: 105,
  tags: ['entrevista', 'system design', 'código ao vivo', 'debugging', 'senioridade'],
  goals: [
    'Responder às perguntas conceptuais mais comuns (RAG vs fine-tuning, alucinação, determinismo, avaliação, pesquisa híbrida, injecção, agente vs workflow) com mecanismo, trade-off e número.',
    'Conduzir um system design de um sistema LLM pela ordem certa: requisitos com medida, avaliação, estimativas, caminhos, limites, operação e trade-offs.',
    'Resolver dois enunciados clássicos — RAG com controlo de acesso e agente com efeitos financeiros — com diagramas, grafo, código e conjunto de avaliação.',
    'Localizar falhas a partir de traços e métricas antes de propor correcções.',
    'Implementar ao vivo, e verificar, RRF, recall@k e MRR, um chunker recursivo e um ciclo de ferramentas com limite.',
  ],
  sections: [...seccoesA, ...seccoesB],

  /* ======================================================================= quiz */
  quiz: [
    {
      id: 'q-entrevista-01',
      topic: 'rag',
      prompt: 'Um entrevistador pergunta: «O conhecimento muda todas as semanas e as respostas têm de citar a fonte. Fine-tuning ou RAG?» Qual é a melhor resposta?',
      options: [
        'Fine-tuning, porque o modelo fica a saber as políticas.',
        'RAG: actualiza-se reindexando, e a resposta pode citar o documento; fine-tuning serve para comportamento e formato, não para factos que mudam.',
        'Pôr tudo no prompt de sistema, sempre.',
        'Os dois, sempre, porque somam qualidade.',
      ],
      answer: [1],
      explain: 'É a decisão de adr-0002. A resposta sénior diz também quando o fine-tuning compensaria (formato consistente, destilação para um problema fechado).',
    },
    {
      id: 'q-entrevista-02',
      topic: 'determinismo',
      prompt: 'Porque é que temperatura 0 numa API não garante respostas idênticas?',
      options: [
        'Não-determinismo numérico em GPU e batching no servidor.',
        'A temperatura 0 é ignorada pelas APIs.',
        'Aliases de modelo que mudam de versão por trás.',
        'Os tokens são amostrados sempre com top-p = 0,9.',
      ],
      answer: [0, 2],
      explain: 'A amostragem gananciosa escolhe o token mais provável, mas as probabilidades podem variar ligeiramente entre execuções, e o modelo por trás de um alias pode mudar. Daí fixar versões e avaliar com conjuntos, não com uma execução.',
    },
    {
      id: 'q-entrevista-03',
      topic: 'rrf',
      prompt: 'Porque é que o RRF funde por posição e não por score?',
      options: [
        'Porque é mais rápido de calcular.',
        'Porque os scores do denso (cosseno) e do BM25 vivem em escalas diferentes e não comparáveis; a posição é comparável.',
        'Porque o BM25 não devolve scores.',
        'Porque a posição é sempre mais precisa do que o score.',
      ],
      answer: [1],
      explain: 'Somar cosseno com BM25 exige normalizar e pesar, e os pesos mudam com cada consulta. Σ 1/(k + rank) evita o problema; k = 60 suaviza a diferença entre os primeiros lugares.',
    },
    {
      id: 'q-entrevista-04',
      topic: 'métricas',
      prompt: 'No `balcao`, o híbrido tem recall@3 de 0,933 e MRR@3 de 0,828; o denso tem 0,900 e 0,867. O que isto significa?',
      options: [
        'O híbrido é pior em tudo.',
        'O híbrido traz mais documentos certos para o top-3, mas nem sempre em primeiro lugar.',
        'Os números estão errados: recall e MRR sobem sempre juntos.',
        'O denso tem mais documentos relevantes no top-3.',
      ],
      answer: [1],
      explain: 'Recall mede presença no top-k; MRR mede a posição do primeiro relevante. Com 3 chunks no contexto, o recall pesa mais; com 1, o MRR.',
    },
    {
      id: 'q-entrevista-05',
      topic: 'segurança',
      prompt: 'Num agente que emite créditos, quais destas defesas contra prompt injection são estruturais?',
      options: [
        'Limite de valor autónomo e aprovação humana no código e no grafo.',
        'Uma instrução no prompt de sistema a pedir para ignorar instruções do cliente.',
        'Identidade do cliente tirada do token, nunca dos argumentos do modelo.',
        'Um detector de palavras como «ignora as regras».',
      ],
      answer: [0, 2],
      explain: 'Estruturais são as que funcionam mesmo que o modelo seja convencido. O prompt e o detector são camadas úteis, mas contornáveis.',
    },
    {
      id: 'q-entrevista-06',
      topic: 'system design',
      prompt: 'Num RAG com documentos restritos por departamento, onde se aplica o controlo de acesso?',
      options: [
        'No prompt, pedindo ao modelo para não mostrar documentos restritos.',
        'Em Python, filtrando o top-20 depois da pesquisa.',
        'Na consulta à base de dados, antes do LIMIT, com os grupos que vêm do token do utilizador.',
        'No re-ranker.',
      ],
      answer: [2],
      explain: 'Pós-filtrar esvazia o top-k para quem tem poucas permissões e deixa o texto restrito passar por memória, caches e traços. O modelo não é um mecanismo de controlo de acesso.',
    },
    {
      id: 'q-entrevista-07',
      topic: 'debugging',
      prompt: 'Depois de um deploy, as recusas triplicaram. O traço mostra zero candidatos densos e 12 lexicais. Qual é a hipótese mais provável?',
      options: [
        'O limiar de relevância está alto demais.',
        'O modelo de embeddings da configuração mudou e o índice não foi reingerido com ele.',
        'O modelo de resposta ficou mais conservador.',
        'O PostgreSQL está lento.',
      ],
      answer: [1],
      explain: 'A consulta filtra por `modelo_embedding` e nenhum chunk tem o modelo novo. Baixar o limiar esconderia o sintoma e deixaria o sistema a funcionar só com metade da pesquisa.',
    },
    {
      id: 'q-entrevista-08',
      topic: 'agentes',
      prompt: 'Que métricas apanham um agente que acerta às vezes mas não é fiável?',
      options: [
        'pass@k com k alto.',
        'pass^k: sucesso em todas as k tentativas do mesmo caso.',
        'Taxa de chamadas a ferramentas proibidas, com gate a zero.',
        'Número médio de tokens de saída.',
      ],
      answer: [1, 2],
      explain: 'pass@k premeia a sorte (basta um sucesso); pass^k mede consistência. Chamadas proibidas medem-se caso a caso, porque uma basta para um incidente.',
    },
    {
      id: 'q-entrevista-09',
      topic: 'entrevista',
      prompt: 'Qual destas aberturas de um system design transmite mais senioridade?',
      options: [
        '«Vou usar LangGraph com um agente ReAct.»',
        '«Antes de escolher o modelo, queria saber que perguntas são, quantas, e o que custa uma resposta errada — e como vamos medir se isto funciona.»',
        '«Uso o modelo mais recente do mercado.»',
        '«Começo pela base vectorial.»',
      ],
      answer: [1],
      explain: 'Requisitos com medida e avaliação antes da tecnologia. As outras escolhem a ferramenta antes de saber o problema.',
    },
  ],

  /* ================================================================== exercícios */
  exercises: [
    {
      id: 'e-entrevista-01',
      title: 'Resposta de 60 segundos: «como reduzes alucinações?»',
      kind: 'open',
      statement: 'Escreve a resposta que darias em 60 segundos, com mecanismo, três técnicas por ordem de impacto, e como medes.',
      solution:
        'Mecanismo: o modelo gera a continuação provável, não a verdadeira; sem o facto no contexto, inventa com fluência. Técnicas: (1) dar o facto no contexto com RAG e tirar do modelo o que é cálculo (valores vêm de ferramentas); (2) citação obrigatória validada em código contra os documentos recuperados, e recusa quando a recuperação fica abaixo de um limiar calibrado; (3) prompt que separa instruções de dados e pede resposta só a partir do contexto. Medir: fidelidade (afirmações suportadas) e correcção contra referência, que são diferentes, num conjunto dourado com IC, mais revisão humana semanal e alarme de respostas sem citação.',
      difficulty: 1,
    },
    {
      id: 'e-entrevista-02',
      title: 'System design cronometrado',
      kind: 'design',
      statement: 'Em 45 minutos, desenha «um assistente que responde a dúvidas de pacientes sobre marcações e preparação para exames de uma rede de clínicas», seguindo os 7 passos da secção 1. Entrega: requisitos com medida, estimativas, diagrama, tabela de autonomia, conjunto de avaliação e lista do que fica de fora.',
      solution:
        'Requisitos: respostas sobre preparação de exames citadas do protocolo em vigor; marcações só por ferramenta com autenticação; qualquer sintoma ou urgência → humano/linha de saúde, sempre, por regra antes do modelo; nenhum dado clínico no fornecedor sem acordo; TTFT < 2 s. Estimativas: volume por dia, tokens, custo, índice pequeno. Arquitectura: guarda de entrada (PII, sintomas) → classificador → RAG protocolos / ferramentas de marcação / humano; limites em código (cancelar só as próprias marcações, confirmação). Avaliação: perguntas por tipo de exame escritas por enfermeiros, casos de sintomas (recall 100% no escalamento), red team. Fora: aconselhamento clínico, diagnóstico, leitura de resultados.',
      difficulty: 3,
    },
    {
      id: 'e-entrevista-03',
      title: 'Debugging: o assistente prometeu um cupão inexistente',
      kind: 'open',
      statement: 'Um cliente recebeu do assistente a promessa de um cupão de 200 MZN a que não tinha direito. Descreve a investigação e a correcção.',
      solution:
        'Abrir o traço da conversa: o valor aparece num resultado de ferramenta (execute_tool calcular_reembolso) ou só no texto do span chat? Se só no texto, é falha de arquitectura: o dinheiro foi gerado. Correcção estrutural: valores monetários só a partir de ferramentas, e a guarda de saída rejeita valores que não estejam num resultado de ferramenta desse turno; caso novo no conjunto dourado e no red team. Se veio da ferramenta, é bug de regra: teste unitário com o pedido, correcção, e auditoria dos cupões emitidos com a mesma regra.',
      difficulty: 2,
    },
    {
      id: 'e-entrevista-04',
      title: 'nDCG@k de raiz',
      kind: 'code',
      statement: 'Implementa `ndcg_at_k(recuperados, relevantes, k)` com relevância binária e verifica que dá o mesmo que `balcao.ndcg_at_k` para `(["a", "x", "b"], {"a", "b"}, 3)`.',
      hint: 'DCG = Σ 1/log2(i + 1) para cada posição i (a começar em 1) com documento relevante; IDCG é o DCG ideal com min(k, |relevantes|) relevantes no topo.',
      solution:
        'import math\n\ndef ndcg_at_k(recuperados, relevantes, k):\n    rel = set(relevantes)\n    dcg = sum(1 / math.log2(i + 1) for i, d in enumerate(recuperados[:k], start=1) if d in rel)\n    idcg = sum(1 / math.log2(i + 1) for i in range(1, min(k, len(rel)) + 1))\n    return dcg / idcg if idcg else 0.0\n\n# (1 + 1/log2(4)) / (1 + 1/log2(3)) = 1,5 / 1,6309 = 0,9197 — igual a balcao.ndcg_at_k',
      difficulty: 2,
    },
    {
      id: 'e-entrevista-05',
      title: 'Estimativa rápida',
      kind: 'input',
      statement: 'Um índice de 400 000 chunks com embeddings de 768 dimensões em float4 ocupa quantos GB (duas casas decimais)?',
      accept: ['1,23', '1.23'],
      solution: '400 000 × 768 × 4 bytes = 1,23 GB; em halfvec, 0,61 GB. Cabe numa máquina: não é um problema de escala de pesquisa.',
      difficulty: 1,
    },
  ],

  /* ================================================================ laboratórios */
  labs: [
    {
      id: 'lab-entrevista-01',
      moduleId: 'entrevista',
      title: 'Reciprocal Rank Fusion',
      brief:
        'Implementa `rrf(rankings, k=60)`: recebe listas de ids por ordem de relevância e devolve `[(id, score)]` ordenado por score decrescente, com desempate determinista pelo id. Verifica contra `b.rrf` com os rankings denso e BM25 do `balcao`.',
      lang: 'python',
      executavel: true,
      starter: `import balcao as b


def rrf(rankings, k=60):
    return []


q = "Fui cobrado duas vezes no M-Pesa"
denso = b.recuperar(q, k=20, metodo="denso")
lexical = b.recuperar(q, k=20, metodo="bm25")
print(rrf([[c.id for c, _ in denso], [c.id for c, _ in lexical]])[:3])`,
      checks: [
        { id: 'formula', label: 'Soma 1 / (k + posição)', re: '1(\\.0)?\\s*/\\s*\\(\\s*k\\s*\\+\\s*\\w+\\s*\\)' },
        { id: 'enumerate', label: 'Posições a começar em 1', re: 'enumerate\\([^)]*start\\s*=\\s*1' },
        { id: 'ordem', label: 'Ordena por score decrescente com desempate', re: 'sorted\\([\\s\\S]*key\\s*=\\s*lambda[^:]*:\\s*\\(\\s*-' },
        { id: 'vazio', label: 'Não devolve lista vazia fixa', re: 'return\\s+\\[\\]\\s*$', forbid: true, flags: 'm' },
      ],
      hints: [
        'Um dicionário `score` acumula as contribuições de cada ranking.',
        '`sorted(score.items(), key=lambda x: (-x[1], x[0]))` ordena e desempata.',
      ],
      solution: `import balcao as b


def rrf(rankings, k=60):
    score = {}
    for ranking in rankings:
        for pos, doc in enumerate(ranking, start=1):
            score[doc] = score.get(doc, 0.0) + 1.0 / (k + pos)
    return sorted(score.items(), key=lambda x: (-x[1], x[0]))


q = "Fui cobrado duas vezes no M-Pesa"
denso = b.recuperar(q, k=20, metodo="denso")
lexical = b.recuperar(q, k=20, metodo="bm25")
meu = [i for i, _ in rrf([[c.id for c, _ in denso], [c.id for c, _ in lexical]])[:5]]
ref = [c.id for c, _ in b.rrf(denso, lexical)[:5]]
print(meu)
print("confere:", meu == ref)
print("casos de fronteira:", rrf([]), rrf([[], ["a"]]))`,
      difficulty: 1,
    },
    {
      id: 'lab-entrevista-02',
      moduleId: 'entrevista',
      title: 'recall@k e MRR ao nível do documento',
      brief:
        'Implementa `recall_at_k`, `mrr_at_k` e `docs_unicos` (vários chunks do mesmo documento contam uma vez) e calcula recall@3 e MRR@3 do método `rerank` sobre `b.PERGUNTAS`. Tem de dar o mesmo que `b.avaliar_recuperacao("rerank", 3)`: 0,950 e 0,889.',
      lang: 'python',
      executavel: true,
      starter: `import balcao as b


def recall_at_k(recuperados, relevantes, k):
    return len(set(recuperados[:k]) & set(relevantes)) / k


def mrr_at_k(recuperados, relevantes, k):
    return 0.0`,
      checks: [
        { id: 'denominador', label: 'Divide pelo número de relevantes, não por k', re: '/\\s*len\\(\\s*rel\\w*\\s*\\)' },
        { id: 'reciproco', label: 'MRR devolve 1 / posição do primeiro relevante', re: 'return\\s+1(\\.0)?\\s*/\\s*\\w+' },
        { id: 'unicos', label: 'Deduplica documentos', re: 'def\\s+docs_unicos' },
        { id: 'confere', label: 'Compara com b.avaliar_recuperacao', re: 'avaliar_recuperacao\\(' },
        { id: 'porK', label: 'Não divide o recall por k', re: '/\\s*k\\s*$', forbid: true, flags: 'm', why: 'Isso é precisão@k, não recall@k.' },
      ],
      hints: [
        'recall@k = |relevantes ∩ top-k| / |relevantes| (0 se não houver relevantes).',
        'Recupera com k=30 e deduplica por `c.doc` antes de cortar ao top-k.',
      ],
      solution: `import balcao as b


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
    for c, _ in resultados:
        if c.doc not in vistos:
            vistos.append(c.doc)
    return vistos


r, m = [], []
for p in b.PERGUNTAS:
    docs = docs_unicos(b.recuperar(p["pergunta"], k=30, metodo="rerank"))
    r.append(recall_at_k(docs, p["relevantes"], 3))
    m.append(mrr_at_k(docs, p["relevantes"], 3))
meu = (round(sum(r) / len(r), 3), round(sum(m) / len(m), 3))
ref = b.avaliar_recuperacao("rerank", 3)
print(meu, "confere:", meu == (ref["recall"], ref["mrr"]))`,
      difficulty: 2,
    },
    {
      id: 'lab-entrevista-03',
      moduleId: 'entrevista',
      title: 'Chunker recursivo',
      brief:
        'Implementa `chunk_recursivo(texto, max_palavras)`: parte pelo separador mais forte (parágrafo, linha, frase, palavra) e só desce quando um pedaço ainda passa o limite; depois junta vizinhos pequenos. Verifica contra `b.chunk_recursivo` em todos os documentos do corpus com 40 palavras.',
      lang: 'python',
      executavel: true,
      starter: `import balcao as b


def chunk_recursivo(texto, max_palavras=80):
    palavras = texto.split()
    return [" ".join(palavras[i:i + max_palavras]) for i in range(0, len(palavras), max_palavras)]`,
      checks: [
        { id: 'seps', label: 'Usa a hierarquia de separadores', re: '\\\\n\\\\n[\\s\\S]*\\\\n[\\s\\S]*\\.\\s' },
        { id: 'recursao', label: 'Desce recursivamente para o separador seguinte', re: 'def\\s+partir[\\s\\S]*partir\\(' },
        { id: 'juntar', label: 'Junta vizinhos pequenos', re: 'juntos\\[-1\\]' },
        { id: 'fixo', label: 'Não é um corte fixo por palavras', re: 'range\\(0,\\s*len\\(palavras\\),\\s*max_palavras\\)', forbid: true, why: 'Corte fixo parte frases e secções a meio.' },
      ],
      hints: [
        'Uma função interna `partir(t, seps)` devolve `[t]` se couber; senão parte por `seps[0]` e chama-se a si própria com `seps[1:]` para cada parte.',
        'Ao partir por ". ", repõe o ponto final nas partes que não são a última.',
      ],
      solution: `import balcao as b

SEPARADORES = ("\\n\\n", "\\n", ". ", " ")


def chunk_recursivo(texto: str, max_palavras: int = 80) -> list[str]:
    def partir(t: str, seps: tuple[str, ...]) -> list[str]:
        if len(t.split()) <= max_palavras or not seps:
            return [t.strip()] if t.strip() else []
        sep, resto = seps[0], seps[1:]
        partes = [p for p in t.split(sep) if p.strip()]
        if len(partes) == 1:
            return partir(t, resto)
        out = []
        for i, p in enumerate(partes):
            p = p + ("." if sep == ". " and i < len(partes) - 1 else "")
            out.extend(partir(p, resto))
        return out

    juntos: list[str] = []
    for p in partir(texto, SEPARADORES):
        if juntos and len(juntos[-1].split()) + len(p.split()) <= max_palavras:
            juntos[-1] = juntos[-1] + " " + p
        else:
            juntos.append(p)
    return juntos


total = sum(len(chunk_recursivo(d["texto"], 40)) for d in b.DOCUMENTOS)
iguais = all(chunk_recursivo(d["texto"], 40) == b.chunk_recursivo(d["texto"], 40) for d in b.DOCUMENTOS)
maior = max(len(c.split()) for d in b.DOCUMENTOS for c in chunk_recursivo(d["texto"], 40))
print(f"{len(b.DOCUMENTOS)} documentos -> {total} chunks; maior com {maior} palavras; igual ao balcao: {iguais}")`,
      difficulty: 2,
    },
  ],

  /* ================================================================ casos de uso */
  useCases: [
    {
      id: 'uc-entrevista-01',
      title: 'Uma entrevista real, reconstituída: assistente de uma farmácia online',
      area: 'Saúde e retalho',
      level: 3,
      scenario:
        'Ronda de system design de 60 minutos numa empresa de farmácia online com entregas em Maputo e Lisboa. Enunciado: «Queremos um assistente que responda a perguntas sobre encomendas, receitas e produtos, e que ajude a renovar receitas crónicas.» O candidato forte gastou os primeiros 10 minutos em perguntas e o resultado foi este desenho.',
      requirements: [
        'Estado de encomendas por ferramenta; perguntas de política (entregas, devoluções) por RAG com citação.',
        'Nenhum conselho de posologia ou interacções: sempre farmacêutico humano.',
        'Renovação de receita só com receita válida no sistema e confirmação do cliente; medicamentos sujeitos a receita especial nunca automáticos.',
        'Dados de saúde fora do fornecedor de modelo sem acordo; logs sem PII.',
      ],
      constraints: [
        'Regulação farmacêutica diferente nos dois países: políticas com metadado de país.',
        'Equipa de três engenheiros.',
      ],
      approach: [
        { title: 'Perguntas antes do desenho', text: 'Volume (≈ 2 000 conversas por dia), o que é um erro caro (conselho clínico errado, medicamento errado renovado), que sistemas existem (receitas electrónicas, encomendas), quem responde hoje.' },
        { title: 'Caminhos por intenção', text: 'Encomenda → ferramenta; política → RAG filtrado por país; renovação → agente com ferramentas de leitura da receita e acção de renovar com confirmação; qualquer menção a sintomas, dose ou interacção → farmacêutico, por regra antes do modelo.' },
        { title: 'Limites em código', text: 'A ferramenta de renovação verifica validade da receita, lista de medicamentos proibidos para automação, e só aceita o cliente do token.' },
        { title: 'Avaliação desde o início', text: 'Conjunto escrito por farmacêuticos: 150 perguntas por intenção e país, 50 casos clínicos que têm de escalar (recall 100%), red team para renovar medicamentos proibidos.' },
      ],
      diagram: {
        title: 'O desenho apresentado no quadro',
        cols: 5,
        rows: 3,
        nodes: [
          { id: 'cli', label: 'Cliente', col: 0, row: 1, kind: 'user' },
          { id: 'g', label: 'Guarda + regras clínicas', sub: 'sintomas, dose → humano', col: 1, row: 1, kind: 'service' },
          { id: 'c', label: 'Classificar', sub: 'modelo pequeno', col: 2, row: 1, kind: 'decision' },
          { id: 'rag', label: 'RAG políticas', sub: 'filtro por país', col: 3, row: 0, kind: 'vector' },
          { id: 'ag', label: 'Agente renovação', sub: 'confirmação, limites', col: 3, row: 1, kind: 'agent' },
          { id: 'enc', label: 'Encomendas', sub: 'ferramenta', col: 3, row: 2, kind: 'tool' },
          { id: 'farm', label: 'Farmacêutico', col: 4, row: 1, kind: 'user' },
        ],
        edges: [
          { from: 'cli', to: 'g' },
          { from: 'g', to: 'farm', label: 'clínico', style: 'dashed' },
          { from: 'g', to: 'c' },
          { from: 'c', to: 'rag' },
          { from: 'c', to: 'ag' },
          { from: 'c', to: 'enc' },
          { from: 'ag', to: 'farm', label: 'proibidos' },
        ],
      },
      solution:
        'O que valeu a oferta não foi o diagrama, foi a ordem: requisitos e erros caros primeiro, avaliação antes da arquitectura, regras deterministas para o que é clínico, limites em código para o que tem efeito, e uma lista explícita do que ficava fora (conselho clínico, medicamentos de receita especial, voz).',
      tools: [
        { name: 'LangGraph', role: 'Grafo com router e interrupt para confirmação' },
        { name: 'PostgreSQL + pgvector', role: 'Políticas por país com filtro na consulta' },
        { name: 'Conjunto dourado por país e intenção', role: 'Gate de CI; recall 100% nos casos clínicos' },
        { name: 'OpenTelemetry', role: 'Traços com decisões de routing auditáveis' },
      ],
      rejected: [
        { option: 'Agente único com todas as ferramentas', why: 'Um caso clínico não pode depender de o modelo escolher escalar.' },
        { option: 'Fine-tuning com o prontuário de medicamentos', why: 'Informação clínica que muda e tem de ser citada; e o assistente não dá conselho clínico de todo.' },
        { option: 'Renovação totalmente automática', why: 'Medicamentos de receita especial e interacções exigem farmacêutico; a automação só cobre crónicos sem restrições.' },
      ],
      costNote: 'O candidato estimou custo por conversa e mostrou que era irrelevante face ao custo de um farmacêutico — e mudou a conversa para o custo de um erro, que é onde o entrevistador a queria.',
      takeaways: [
        'Numa entrevista, a ordem das decisões comunica mais do que as decisões.',
        'O que é clínico, financeiro ou irreversível decide-se em código, não no modelo.',
        'Dizer o que fica de fora é um sinal de senioridade.',
      ],
      refs: [
        { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
        { label: 'NIST AI RMF', url: 'https://www.nist.gov/itl/ai-risk-management-framework' },
      ],
    },
  ],
};
