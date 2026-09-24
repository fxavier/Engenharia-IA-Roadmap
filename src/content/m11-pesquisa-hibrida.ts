import type { Module } from '../types';

export const m11: Module = {
  id: 'pesquisa-hibrida',
  number: 11,
  part: 'rag',
  title: 'Pesquisa híbrida e re-ranking',
  subtitle: 'BM25 para códigos e nomes, vectores para sinónimos, RRF para os fundir sem afinar pesos, e um cross-encoder para acertar a ordem — numa só consulta SQL',
  icon: '🔀',
  minutes: 95,
  tags: ['bm25', 'full-text', 'rrf', 're-ranking', 'postgresql'],
  goals: [
    'Ler a fórmula do BM25 termo a termo e explicar o que k1, b e o IDF fazem a uma pergunta de cliente.',
    'Usar a pesquisa de texto do PostgreSQL (`tsvector`, `tsquery`, `ts_rank_cd`, dicionário `portuguese`) sabendo o que ela não faz: acentos, códigos com hífen, IDF.',
    'Reconhecer com exemplos do «Balcão» onde a pesquisa densa falha (nomes, códigos, números) e onde a lexical falha (sinónimos, paráfrases).',
    'Fundir rankings com RRF, perceber porque é robusto ao parâmetro k e onde esconde o documento que só um dos métodos encontrou.',
    'Decidir quando um cross-encoder compensa os seus ≈ 180 ms e escrever a pesquisa híbrida completa numa só consulta SQL, com filtros antes do LIMIT.',
  ],

  sections: [
    /* ================================================================= 1 */
    {
      id: 'bm25',
      title: 'BM25: pesquisa lexical com vinte anos de afinação',
      blocks: [
        {
          type: 'p',
          text:
            'Antes dos embeddings, a pesquisa de documentos era lexical: contar termos em comum entre a pergunta e o documento, pesar os termos raros mais do que os comuns, e não deixar os documentos longos ganhar só por serem longos. O BM25 (Okapi BM25, da família de modelos probabilísticos de Robertson e colegas) é a forma afinada dessa ideia e continua a ser a linha de base contra a qual se medem retrievers densos — em vários conjuntos do benchmark BEIR, ainda ganha a modelos densos treinados noutro domínio.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-pesquisa-hibrida-01',
            title: 'BM25 de um documento d para uma consulta q',
            expr: 'BM25(d, q) = Σ_{t ∈ q}  IDF(t) · tf(t,d) · (k1 + 1) / ( tf(t,d) + k1 · (1 − b + b · |d| / avgdl) )\nIDF(t) = ln( 1 + (N − df(t) + 0,5) / (df(t) + 0,5) )',
            where: [
              { sym: 't ∈ q', means: 'cada termo da pergunta depois de normalizar e radicalizar («reembolsos» → «reembols»)' },
              { sym: 'tf(t,d)', means: 'quantas vezes o termo aparece no chunk' },
              { sym: 'df(t), N', means: 'em quantos chunks o termo aparece, e quantos chunks há (46 na amostra)' },
              { sym: 'k1', means: 'saturação da frequência: 1,2 no runtime; o terceiro «reembolso» num chunk vale muito menos do que o primeiro' },
              { sym: 'b', means: 'normalização pelo comprimento: 0,75; b = 0 ignora o tamanho, b = 1 normaliza totalmente' },
              { sym: '|d| / avgdl', means: 'tamanho do chunk a dividir pelo tamanho médio (≈ 25 radicais na amostra)' },
            ],
            reading: 'Cada termo da pergunta contribui mais quanto mais raro for no corpus e quanto mais aparecer no chunk, com rendimentos decrescentes e um desconto para chunks longos.',
            note: 'É o IDF que faz o BM25 bom com códigos: «troco» aparece em 1 dos 46 chunks e vale 3,4; «estafeta» aparece em 12 e vale 1,3.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-pesquisa-hibrida-01',
            title: 'O BM25 à mão, termo a termo',
            brief: 'Calcula o score do chunk de pagamento em numerário para a pergunta g22 e confirma que dá o mesmo que `BM25.pontuar`. Repara no terceiro termo.',
            code: `import math
import balcao as b

chunks = b.chunkar_corpus("recursivo")
bm25 = b.BM25(chunks)                      # k1 = 1,2 ; b = 0,75
q = "O estafeta tem troco para 1000?"
termos = b.radicais(q, sinonimos=False)
alvo = next(i for i, c in enumerate(chunks) if c.id == "pol-pagamento-numerario#0")
d = bm25.docs[alvo]
print("termos:", termos, "| |d| =", len(d), "| média =", round(bm25.media, 1), "| N =", bm25.n)
total = 0.0
for t in termos:
    df, tf = bm25.df.get(t, 0), d.count(t)
    idf = math.log(1 + (bm25.n - df + 0.5) / (df + 0.5))
    norma = 1.2 * (1 - 0.75 + 0.75 * len(d) / bm25.media)
    parcela = idf * tf * (1.2 + 1) / (tf + norma) if tf else 0.0
    total += parcela
    print(f"  {t:9} df={df:2} tf={tf} idf={idf:.3f} -> {parcela:.4f}")
print("à mão:", round(total, 4), "| BM25.pontuar:", round(float(bm25.pontuar(q)[alvo]), 4))`,
            expected: `termos: ['estafeta', 'troco', '1000'] | |d| = 23 | média = 25.2 | N = 46
  estafeta  df=12 tf=2 idf=1.324 -> 1.8677
  troco     df= 1 tf=1 idf=3.445 -> 3.5744
  1000      df= 0 tf=0 idf=4.543 -> 0.0000
à mão: 5.4421 | BM25.pontuar: 5.4421`,
          },
        },
        {
          type: 'callout',
          tone: 'warn',
          title: '«1000» não é «1 000»',
          text:
            'O termo `1000` tem df = 0: a política escreve «1 000 MZN», com espaço, e o tokenizador vê `1` e `000`. O termo mais específico da pergunta não contribui nada. Números com separadores de milhares, datas em formatos diferentes e códigos com ou sem hífen («PD-8841990», «PD 8841990») precisam de normalização explícita **dos dois lados** — na ingestão e na consulta — porque nem o BM25 nem o embedding a fazem por ti.',
        },
        {
          type: 'table',
          head: ['Parâmetro', 'Valor típico', 'Se subir', 'Se descer'],
          rows: [
            ['k1', '1,2 a 2,0', 'termos repetidos continuam a somar: chunks que repetem «reembolso» sobem', 'satura cedo: aparecer uma vez vale quase o mesmo que aparecer cinco'],
            ['b', '0,75', 'chunks longos são mais penalizados', 'o tamanho deixa de contar; chunks longos ganham por terem mais palavras'],
            ['radicalização', 'por língua', 'mais variantes coincidem («reembolsos», «reembolsar»)', 'menos colisões, mais falhas por flexão'],
            ['stopwords', 'lista da língua', 'menos ruído de «de», «o», «para»', 'termos funcionais passam a pesar'],
          ],
          caption: 'Com chunks de tamanho parecido (o chunking recursivo garante isso), b importa pouco; k1 e a radicalização importam mais em português, que flexiona muito.',
        },
        {
          type: 'p',
          text:
            'O runtime didáctico tem um detalhe importante: o BM25 corre **sem** a tabela de sinónimos (`sinonimos=False`), e o embedding corre **com** ela. É uma simplificação honesta do que acontece com modelos reais: a pesquisa lexical só casa formas escritas; um modelo de embeddings treinado com pares de frases aprendeu que «estorno» e «reembolso» aparecem em contextos parecidos. É essa assimetria que torna os dois métodos complementares.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O BM25 do runtime (`didactico.BM25`), o mesmo que o `IndiceMemoria` do laboratório usa como metade lexical quando não há PostgreSQL. As estatísticas (df, média) calculam-se uma vez na construção.',
          code: `class BM25:
    def __init__(self, chunks, k1=1.2, b=0.75, sinonimos=False):
        self.docs = [radicais(c.texto, sinonimos) for c in chunks]
        self.n = len(self.docs)
        self.media = sum(len(d) for d in self.docs) / max(1, self.n)
        self.df = {}
        for d in self.docs:
            for t in set(d):
                self.df[t] = self.df.get(t, 0) + 1

    def idf(self, termo):
        df = self.df.get(termo, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def pontuar(self, consulta):
        q = radicais(consulta, self.sinonimos)
        s = np.zeros(self.n)
        for i, d in enumerate(self.docs):
            tf = Counter(d)
            norma = self.k1 * (1 - self.b + self.b * len(d) / self.media)
            s[i] = sum(self.idf(t) * tf[t] * (self.k1 + 1) / (tf[t] + norma) for t in q if t in tf)
        return s`,
        },
        {
          type: 'refs',
          items: [
            { label: 'Thakur et al. — BEIR: benchmark heterogéneo de recuperação (2021)', url: 'https://arxiv.org/abs/2104.08663' },
            { label: 'PostgreSQL — pesquisa de texto', url: 'https://www.postgresql.org/docs/current/textsearch.html' },
          ],
        },
      ],
    },

    /* ================================================================= 2 */
    {
      id: 'postgres-fts',
      title: 'Full-text no PostgreSQL: `tsvector`, `tsquery` e o dicionário `portuguese`',
      blocks: [
        {
          type: 'p',
          text:
            'O «Balcão» não tem um Elasticsearch: tem uma base de dados (RE-02) e a metade lexical da pesquisa híbrida vive nela. O PostgreSQL transforma texto num `tsvector` (lista de lexemas normalizados com posições) com uma configuração de pesquisa — `portuguese` usa o radicalizador Snowball e uma lista de stopwords portuguesas —, transforma a pergunta num `tsquery`, casa os dois com o operador `@@` e ordena com `ts_rank` ou `ts_rank_cd`. Um índice GIN sobre a coluna `tsv` torna o `@@` rápido.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Saída real de `psql` (PostgreSQL 16 local, configuração `portuguese` de origem). Confirma no teu 18: o comportamento destas funções não mudou, mas os resultados dependem da configuração instalada.',
          code: `SELECT to_tsvector('portuguese', 'Quanto tempo demora a devolução do dinheiro no M-Pesa?');
-- 'demor':3 'devolu':5 'dinheir':7 'm':10 'm-pes':9 'pes':11 'quant':1 'temp':2

SELECT to_tsvector('portuguese', 'Os reembolsos para M-Pesa são processados em até 72 horas.');
-- '72':11 'hor':12 'm':5 'm-pes':4 'pes':6 'process':8 'reembols':2

SELECT to_tsvector('portuguese', 'Cupão cupões cupao');
-- 'cupa':3 'cupã':1 'cupõ':2          ← três lexemas diferentes para a mesma palavra

SELECT to_tsvector('portuguese', 'Envie a referência RB-004211 e o pedido PD-8841990');
-- '-004211':5 '-8841990':10 'envi':1 'pd':9 'ped':8 'rb':4 'referent':3

SELECT plainto_tsquery('portuguese', 'Quanto tempo demora o estorno no cartão Visa?');
-- 'quant' & 'temp' & 'demor' & 'estorn' & 'cartã' & 'vis'`,
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: confiar no dicionário `portuguese` sem o testar',
          text:
            'Três surpresas na saída acima. Primeiro, o dicionário não tira acentos: «cupão», «cupões» e «cupao» (como o cliente escreve no telemóvel) dão três lexemas e não casam entre si. Segundo, «PD-8841990» é partido em `pd` e no inteiro com sinal `-8841990`, e «RB-004211» em `rb` e `-004211`: a pesquisa pelo número sem hífen falha. Terceiro, `plainto_tsquery` junta os termos com E (`&`): uma pergunta de seis palavras só casa com chunks que as tenham todas, o que numa pergunta de cliente quase nunca acontece. Testa a configuração com as tuas perguntas antes de confiar nela.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'Uma configuração que remove acentos antes do radicalizador (extensão `unaccent`, que vem com o PostgreSQL). Saída real no mesmo servidor.',
          code: `CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE TEXT SEARCH CONFIGURATION pt_sem_acentos (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION pt_sem_acentos
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;

SELECT to_tsvector('pt_sem_acentos', 'Cupão cupões cupao cupoes');
-- 'cupa':1,3 'cupo':2,4               ← acentos resolvidos; singular e plural ainda diferem

SELECT to_tsvector('pt_sem_acentos', 'devolução devolucao');
-- 'devoluca':1,2`,
        },
        {
          type: 'p',
          text:
            'Repara que mesmo com `unaccent` o singular e o plural de «cupão» continuam diferentes: o Snowball português não conhece todas as flexões irregulares. Mudar a configuração de uma coluna gerada obriga a recalcular o `tsvector` de todas as linhas — no «Balcão» é um `ALTER TABLE` sobre ≈ 1 870 linhas, trivial, mas tem de estar na migração e não num comando manual.',
        },
        {
          type: 'table',
          head: ['Função', 'O que faz à pergunta', 'Serve para'],
          rows: [
            ['`plainto_tsquery`', 'todos os termos com E (`&`)', 'pesquisa de catálogo com poucas palavras; má para perguntas de cliente'],
            ['`websearch_to_tsquery`', 'sintaxe de motor de busca: aspas, OR, menos; nunca dá erro de sintaxe', 'caixas de pesquisa escritas por pessoas'],
            ['`phraseto_tsquery`', 'termos seguidos com `<->`', 'expressões exactas («taxa de serviço»)'],
            ['OR construído à mão', 'lexemas da pergunta unidos com `|`', 'a metade lexical de um híbrido: o ranking decide, não o casamento'],
          ],
          caption: 'O «Balcão» constrói o OR a partir de `tsvector_to_array(to_tsvector(...))`, que devolve os lexemas já normalizados e sem stopwords (secção 6).',
        },
        {
          type: 'p',
          text:
            'Há uma diferença de fundo entre o `ts_rank` e o BM25 que convém saber antes de comparar números: segundo a documentação, as funções de ranking do PostgreSQL **não usam informação global** como o IDF. Pesam a frequência dos lexemas no documento, a proximidade entre eles (`ts_rank_cd`, *cover density*) e, opcionalmente, o comprimento (o parâmetro `normalization`, um bitmask). Um termo raro e um termo comum que casam valem o mesmo. Para um híbrido com RRF isto importa menos do que parece — só a ordem conta — mas quer dizer que o lexical do PostgreSQL é mais fraco do que o BM25 do runtime em perguntas com um termo raro e vários comuns. Existem extensões de terceiros que implementam BM25 no PostgreSQL; avaliá-las é uma decisão de operação, não de qualidade apenas.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: '`ts_rank` e `ts_rank_cd` sobre o mesmo chunk. Os pesos por omissão das classes D, C, B, A são {0,1, 0,2, 0,4, 1,0}; `setweight` permite pesar o título (A) acima do corpo (D).',
          code: `SELECT ts_rank   (to_tsvector('portuguese', 'M-Pesa e e-Mola: até 24 horas.'), to_tsquery('portuguese', 'horas | mpesa')),
       ts_rank_cd(to_tsvector('portuguese', 'M-Pesa e e-Mola: até 24 horas.'), to_tsquery('portuguese', 'horas'));
--  0.030396355 | 0.1

-- título com peso A e corpo com peso D, na coluna gerada:
-- tsv tsvector GENERATED ALWAYS AS (
--     setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
--     setweight(to_tsvector('portuguese', texto), 'D')) STORED`,
        },
        { type: 'file', ref: 'sql/001_esquema.sql' },
        {
          type: 'refs',
          items: [
            { label: 'PostgreSQL — ranking e funções de consulta', url: 'https://www.postgresql.org/docs/current/textsearch-controls.html' },
            { label: 'PostgreSQL — unaccent', url: 'https://www.postgresql.org/docs/current/unaccent.html' },
            { label: 'PostgreSQL — dicionários (Snowball)', url: 'https://www.postgresql.org/docs/current/textsearch-dictionaries.html' },
          ],
        },
      ],
    },

    /* ================================================================= 3 */
    {
      id: 'onde-falham',
      title: 'Onde o denso falha, onde o lexical falha',
      blocks: [
        {
          type: 'p',
          text:
            'O argumento para a pesquisa híbrida não é teórico: cada método tem classes de perguntas em que falha de forma previsível, e as classes quase não se sobrepõem. A pesquisa densa compara vectores que codificam o «assunto» de um texto; falha quando o que importa é uma cadeia exacta que o modelo viu pouco ou nunca (um nome de bairro, um código de pedido, um número). A lexical casa cadeias exactas; falha quando o cliente usa palavras que o documento não usa.',
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-pesquisa-hibrida-01',
            title: 'BM25 com um sinónimo: «cerveja» não está em nenhuma política',
            brief: 'k = 3, sem filtro. O BM25 só casa «pedir», que aparece em dezenas de chunks.',
            query: 'Posso pedir cerveja às 23h?',
            method: 'bm25',
            k: 3,
            hits: [
              { doc: 'faq-conta-apagar', texto: 'O cliente pode pedir para apagar a conta em Perfil > Privacidade.', score: 2.8384, relevante: false },
              { doc: 'faq-codigo-entrega', texto: 'Cada pedido tem um código de entrega de 4 dígitos, que aparece na aplicação.', score: 2.5657, relevante: false },
              { doc: 'faq-dados-pessoais', texto: 'O cliente pode pedir uma cópia dos seus dados em Perfil > Privacidade.', score: 2.4481, relevante: false },
            ],
            note: 'A política certa diz «bebidas alcoólicas». A pesquisa densa põe `pol-bebidas-alcool` em primeiro (cosseno 0,3051), porque o embedding sabe que «cerveja» fica perto de «álcool».',
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-pesquisa-hibrida-02',
            title: 'Denso com um nome próprio: «KaMavota» é só uma cadeia rara',
            brief: 'k = 3, sem filtro. Scores de cosseno.',
            query: 'KaMavota tem entrega?',
            method: 'denso',
            k: 3,
            hits: [
              { doc: 'pol-bebidas-alcool', texto: 'O estafeta pede um documento de identificação na entrega e pode recusar a entrega.', score: 0.3342, relevante: false },
              { doc: 'pol-taxa-entrega', texto: 'A taxa de entrega depende da distância entre o restaurante e a morada.', score: 0.3123, relevante: false },
              { doc: 'faq-zonas-cobertura', texto: 'Entregamos em 38 zonas de Maputo e Matola: os distritos municipais de KaMpfumo, Nlhamankulu, KaMaxakeni, KaMavota e KaMubukwana.', score: 0.2772, relevante: true },
            ],
            note: 'O vector é dominado por «entrega», que as três políticas repetem. O BM25 põe `faq-zonas-cobertura` em primeiro com 3,6356 contra 1,6393 do segundo: «kamavota» aparece num só chunk e o IDF faz o resto.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-pesquisa-hibrida-02',
            title: 'Quem ganha a quem, pergunta a pergunta',
            brief: 'Posição do primeiro documento relevante com BM25 e com denso, nas perguntas douradas em que diferem, mais duas perguntas com nomes e números. «—» quer dizer fora dos 10 primeiros.',
            code: `import balcao as b

def posicao(q, relevantes, metodo):
    docs = []
    for c, _ in b.recuperar(q, 30, metodo):
        if c.doc not in docs:
            docs.append(c.doc)
    for i, d in enumerate(docs[:10], start=1):
        if d in relevantes:
            return str(i)
    return "—"

casos = [(p["id"], p["pergunta"], p["relevantes"]) for p in b.PERGUNTAS]
casos += [("x1", "KaMavota tem entrega?", ["faq-zonas-cobertura"]),
          ("x2", "reembolso do Chega Mais 299", ["faq-subscricao-mais"])]
print("id   bm25 denso  pergunta")
for gid, q, rel in casos:
    bm, de = posicao(q, rel, "bm25"), posicao(q, rel, "denso")
    if bm != de:
        print(f"{gid:4} {bm:>4} {de:>5}  {q}")`,
            expected: `id   bm25 denso  pergunta
g01     3     2  Quanto tempo demora a devolução do dinheiro no M-Pesa?
g02     3     2  O meu pedido chegou 50 minutos atrasado, tenho direito a alguma coisa?
g04     2     1  Faltou uma bebida no meu saco
g10     2     1  Entregam na Matola?
g11     8     1  A que horas fecham?
g14     —     1  Posso pedir cerveja às 23h?
g19     2     4  O restaurante cancelou o meu pedido, e agora?
g23     —     1  Esqueci o meu guarda-chuva com o motoqueiro
g25     4     1  Posso agendar um pedido para sábado?
g30     8     6  Qual é o prazo para pedir reembolso?
x1      1     3  KaMavota tem entrega?
x2      1     9  reembolso do Chega Mais 299`,
          },
        },
        {
          type: 'compare',
          left: {
            title: 'O lexical ganha em',
            items: [
              'Nomes próprios e bairros («KaMavota», «Machava»).',
              'Códigos e referências («RB-», «3-D Secure», «PD-8841990», se normalizados).',
              'Números e valores exactos («299», «troco»), quando escritos da mesma forma.',
              'Termos de domínio raros, em que o IDF alto faz o trabalho.',
            ],
          },
          right: {
            title: 'O denso ganha em',
            items: [
              'Sinónimos e registo do cliente («motoqueiro» por estafeta, «estorno» por reembolso).',
              'Paráfrases sem palavras em comum («a que horas fecham?» por horário de funcionamento).',
              'Perguntas vagas ou mal escritas, sem termos raros.',
              'Mistura de línguas (português com palavras de changana ou inglês), com modelos multilingues.',
            ],
          },
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'O embedding do runtime não é um modelo neuronal',
          text:
            'O embedding didáctico é um hashing de radicais e trigramas com uma tabela de sinónimos escrita à mão; «sabe» que cerveja é álcool porque lho dissemos. Um modelo real aprende estas relações dos dados de treino e falha noutras (nomes locais, siglas do Chega). As classes de falha mantêm-se; os exemplos concretos têm de ser medidos com o teu modelo (módulo 7).',
        },
        {
          type: 'table',
          head: ['Tipo de pergunta', 'Exemplo', 'Método mais fiável', 'Peso no «Balcão»'],
          rows: [
            ['Paráfrase de regra', '«Posso juntar dois cupões?»', 'ambos', 'maioria das perguntas de política'],
            ['Sinónimo do cliente', '«estorno no Visa», «motoqueiro»', 'denso', 'frequente em WhatsApp'],
            ['Nome, zona, marca', '«KaMavota», «Chega Mais»', 'lexical', 'cobertura e subscrição'],
            ['Código ou referência', '«RB-004211», «PD-8841990»', 'lexical com normalização', 'pagamentos; os pedidos vão para ferramenta'],
            ['Número exacto', '«troco para 1000», «5 km»', 'lexical, se o formato coincidir', 'taxas e limites'],
          ],
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — consultas híbridas', url: 'https://qdrant.tech/documentation/concepts/hybrid-queries/' },
            { label: 'Weaviate — pesquisa híbrida', url: 'https://weaviate.io/developers/weaviate/search/hybrid' },
          ],
        },
      ],
    },

    /* ================================================================= 4 */
    {
      id: 'rrf',
      title: 'Reciprocal Rank Fusion',
      blocks: [
        {
          type: 'p',
          text:
            'Ter dois rankings levanta a questão de como os juntar. A tentação é somar scores, mas um cosseno de 0,43 e um BM25 de 6,09 não estão na mesma escala, e normalizar (min-max por consulta) faz o score de um documento depender dos outros documentos devolvidos. O RRF (Cormack, Clarke e Büttcher, SIGIR 2009) ignora os scores e usa só as **posições**: cada lista dá a cada documento 1/(k + posição), e somam-se as contribuições.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-pesquisa-hibrida-02',
            title: 'Reciprocal Rank Fusion',
            expr: 'RRF(d) = Σ_{r ∈ R}  1 / ( k + pos_r(d) )        (a parcela é 0 se d não está em r)',
            where: [
              { sym: 'R', means: 'os rankings a fundir: o denso (HNSW) e o lexical (`tsvector`), 20 candidatos cada' },
              { sym: 'pos_r(d)', means: 'posição de d no ranking r, a começar em 1' },
              { sym: 'k', means: 'constante de suavização: 60 no artigo original e no «Balcão»' },
            ],
            reading: 'Um documento no topo das duas listas soma ≈ 2/61; no topo de uma só, 1/61; a diferença entre o 1.º e o 10.º lugar de uma lista é pequena quando k é grande.',
            note: 'Com k = 60, 1.º lugar numa lista vale 0,01639 e 20.º vale 0,0125: o RRF premeia sobretudo **aparecer nas duas listas**. É a sua força (consenso) e a sua fraqueza (o documento que só um método encontra fica para trás).',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-pesquisa-hibrida-03',
            title: 'RRF à mão: o consenso enterra a resposta certa',
            brief: 'Para a pergunta da cerveja, o denso acerta em 1.º e o BM25 nem encontra a política. Os chunks que aparecem nas duas listas (errados) somam duas parcelas e ficam à frente.',
            code: `import balcao as b

q = "Posso pedir cerveja às 23h?"
ch = b.chunkar_corpus("recursivo")
denso = b.IndiceExacto(ch).procurar(q, 20)
lexical = b.BM25(ch).procurar(q, 20)
pos_d = {c.id: i for i, (c, _) in enumerate(denso, start=1)}
pos_l = {c.id: i for i, (c, _) in enumerate(lexical, start=1)}

for c, s in b.rrf(denso, lexical, k=60)[:5]:
    d, l = pos_d.get(c.id, "—"), pos_l.get(c.id, "—")
    print(f"{s:.5f}  {c.id:24} denso={d!s:>2} bm25={l!s:>2}")
print("à mão, bebidas:", round(1 / (60 + 1), 5), "| conta-apagar:", round(1 / (60 + 3) + 1 / (60 + 1), 5))`,
            expected: `0.03227  faq-conta-apagar#0       denso= 3 bm25= 1
0.03126  faq-dados-pessoais#0     denso= 5 bm25= 3
0.03041  faq-codigo-entrega#0     denso=10 bm25= 2
0.01639  pol-bebidas-alcool#0     denso= 1 bm25= —
0.01613  int-ferramentas-guia#0   denso= 2 bm25= —
à mão, bebidas: 0.01639 | conta-apagar: 0.03227`,
          },
        },
        {
          type: 'p',
          text:
            'Este é o caso em que o híbrido fica **pior** do que o melhor dos dois métodos: o denso tinha a resposta em 1.º e a fusão empurrou-a para 4.º. Não é raro — acontece sempre que um método encontra algo que o outro não encontra de todo. É por isso que o «Balcão» não pára na fusão: o re-ranking (secção 5) lê pergunta e chunk juntos e devolve a política de álcool ao topo. Em média, sobre as 30 perguntas douradas, o híbrido ganha em recall@3 (0,933 contra 0,900 do denso) e perde em MRR@3 (0,828 contra 0,867): encontra mais vezes, mas nem sempre no topo.',
        },
        { type: 'widget', id: 'rrf-lab' },
        {
          type: 'run',
          run: {
            id: 'run-pesquisa-hibrida-04',
            title: 'RRF contra combinação linear, no conjunto dourado',
            brief: 'A combinação linear com normalização min-max e peso α no denso passa o RRF em recall@3 com α = 0,5 ou 0,7, fica abaixo em MRR@3, e depende de um α escolhido nas mesmas 30 perguntas em que se mede. O RRF dá o mesmo resultado com k de 10 a 200.',
            code: `import balcao as b

ch = b.chunkar_corpus("recursivo")
den, lex = b.IndiceExacto(ch), b.BM25(ch)
doc = {c.id: c.doc for c in ch}

def unicos(ids):
    return list(dict.fromkeys(doc[i] for i in ids))

def minmax(r):
    s = [x for _, x in r]
    lo, hi = min(s, default=0), max(s, default=0)
    return {c.id: (x - lo) / (hi - lo) if hi > lo else 1.0 for c, x in r}

def linear(q, a):
    d, l = minmax(den.procurar(q, 20)), minmax(lex.procurar(q, 20))
    t = {i: a * d.get(i, 0) + (1 - a) * l.get(i, 0) for i in set(d) | set(l)}
    return unicos(sorted(t, key=lambda i: (-t[i], i)))

def fundido(q, k):
    return unicos(c.id for c, _ in b.rrf(den.procurar(q, 20), lex.procurar(q, 20), k=k))

def medir(f):
    r = [b.recall_at_k(f(p["pergunta"]), p["relevantes"], 3) for p in b.PERGUNTAS]
    m = [b.mrr(f(p["pergunta"])[:3], p["relevantes"]) for p in b.PERGUNTAS]
    return f"recall@3={sum(r) / 30:.3f} MRR@3={sum(m) / 30:.3f}"

for a in [0.3, 0.5, 0.7]:
    print(f"linear α={a}: ", medir(lambda q: linear(q, a)))
for k in [10, 60, 200]:
    print(f"RRF k={k:<3}:   ", medir(lambda q: fundido(q, k)))`,
            expected: `linear α=0.3:  recall@3=0.917 MRR@3=0.806
linear α=0.5:  recall@3=0.950 MRR@3=0.794
linear α=0.7:  recall@3=0.950 MRR@3=0.822
RRF k=10 :    recall@3=0.933 MRR@3=0.828
RRF k=60 :    recall@3=0.933 MRR@3=0.828
RRF k=200:    recall@3=0.933 MRR@3=0.828`,
          },
        },
        {
          type: 'p',
          text:
            'A leitura certa não é «a linear é melhor»: é que a linear tem um parâmetro que se afina contra o conjunto de avaliação, e com 30 perguntas uma diferença de uma pergunta decide o α. Quando o corpus crescer ou o modelo de embeddings mudar, a escala dos scores muda e o α tem de ser reafinado. O RRF não tem esse problema: é insensível a k numa gama larga e não precisa de saber nada sobre as escalas. É a razão da adr-0009.',
        },
        { type: 'adr', ref: 'adr-0009' },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Lê o código da biblioteca antes de confiar no «RRF» dela',
          text:
            'No `langchain-postgres` (0.0.18), a função `reciprocal_rank_fusion` do `PGVectorStore` soma `1 / (rank + rrf_k)` com o `rank` do `enumerate` a começar em 0, não em 1 como no artigo; a fusão por omissão do `HybridSearchConfig` é `weighted_sum_ranking` (linear), não RRF; e o `tsv_lang` por omissão é `pg_catalog.english`. Nenhum destes é um defeito grave, mas os três mudam resultados em português sem aviso.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O RRF do runtime (`didactico.rrf`), que o `IndiceMemoria` do laboratório usa tal como está. Desempate por id para o resultado ser determinista.',
          code: `def rrf(*rankings: list[tuple[Chunk, float]], k: int = 60) -> list[tuple[Chunk, float]]:
    total: dict[str, float] = {}
    por_id: dict[str, Chunk] = {}
    for ranking in rankings:
        for pos, (c, _) in enumerate(ranking, start=1):     # posição a começar em 1
            total[c.id] = total.get(c.id, 0.0) + 1.0 / (k + pos)
            por_id[c.id] = c
    ordem = sorted(total, key=lambda i: (-total[i], i))
    return [(por_id[i], round(total[i], 5)) for i in ordem]`,
        },
        {
          type: 'refs',
          items: [
            { label: 'Qdrant — fusão RRF em consultas híbridas', url: 'https://qdrant.tech/documentation/concepts/hybrid-queries/' },
            { label: 'langchain-postgres — repositório', url: 'https://github.com/langchain-ai/langchain-postgres' },
          ],
        },
      ],
    },

    /* ================================================================= 5 */
    {
      id: 're-ranking',
      title: 'Re-ranking com cross-encoders',
      blocks: [
        {
          type: 'p',
          text:
            'Os embeddings da pesquisa densa são de um **bi-encoder**: a pergunta e cada chunk são codificados separadamente, e a comparação é um produto interno. É isso que permite pré-calcular os vectores dos chunks e usar um índice HNSW. O preço é que o modelo nunca vê a pergunta e o chunk juntos. Um **cross-encoder** recebe o par (pergunta, chunk) na mesma entrada e produz um score de relevância; a atenção cruza as duas sequências, por isso capta coisas como «a pergunta é sobre depois da entrega, o chunk é sobre antes».',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Recuperar barato e muito, re-ordenar caro e pouco',
            caption: 'O bi-encoder e o BM25 escolhem 20 candidatos entre ≈ 1 870 chunks em milissegundos; o cross-encoder corre 20 vezes, uma por par, e decide os 4 que vão para o prompt.',
            cols: 5,
            rows: 2,
            zones: [
              { id: 'z-rec', label: 'Recuperação (índices)', col: 0, row: 0, colSpan: 3, rowSpan: 2, tone: 'data' },
              { id: 'z-rr', label: 'Re-ranking (modelo)', col: 3, row: 0, colSpan: 2, rowSpan: 2, tone: 'rag' },
            ],
            nodes: [
              { id: 'q', label: 'pergunta', col: 0, row: 0, kind: 'user' },
              { id: 'bi', label: 'bi-encoder + HNSW', sub: '20 por cosseno', col: 1, row: 0, kind: 'vector' },
              { id: 'bm', label: 'tsvector + GIN', sub: '20 por ts_rank_cd', col: 1, row: 1, kind: 'data' },
              { id: 'rrf', label: 'RRF', sub: '≤ 40 → 20', col: 2, row: 0, kind: 'service' },
              { id: 'ce', label: 'cross-encoder', sub: '20 pares (pergunta, chunk)', col: 3, row: 0, kind: 'model' },
              { id: 'top', label: 'top-4', sub: 'com score para o limiar', col: 4, row: 0, kind: 'service' },
            ],
            edges: [
              { from: 'q', to: 'bi' },
              { from: 'q', to: 'bm' },
              { from: 'bi', to: 'rrf' },
              { from: 'bm', to: 'rrf' },
              { from: 'rrf', to: 'ce' },
              { from: 'ce', to: 'top' },
            ],
          },
        },
        {
          type: 'retrieval',
          retrieval: {
            id: 'rt-pesquisa-hibrida-03',
            title: 'O re-ranking devolve a política de álcool ao topo',
            brief: 'Híbrido com re-ranking dos 20 primeiros, k = 4, sem filtro. `antes` é a posição no ranking RRF.',
            query: 'Posso pedir cerveja às 23h?',
            method: 'rerank',
            k: 4,
            hits: [
              { doc: 'pol-bebidas-alcool', texto: 'Bebidas alcoólicas só são vendidas a maiores de 18 anos. As bebidas alcoólicas só são entregues até às 22h00.', score: 0.2429, relevante: true, antes: 4 },
              { doc: 'faq-conta-apagar', texto: 'O cliente pode pedir para apagar a conta em Perfil > Privacidade.', score: 0.1687, relevante: false, antes: 1 },
              { doc: 'faq-dados-pessoais', texto: 'O cliente pode pedir uma cópia dos seus dados em Perfil > Privacidade.', score: 0.1637, relevante: false, antes: 2 },
              { doc: 'faq-codigo-entrega', texto: 'Cada pedido tem um código de entrega de 4 dígitos, que aparece na aplicação.', score: 0.1579, relevante: false, antes: 3 },
            ],
            note: 'O re-ranker didáctico combina cobertura de termos com sinónimos, bigramas, números e o cosseno: é a forma de um cross-encoder (olha para os dois textos juntos), não a substância. A pergunta g14 também precisa de `faq-horarios` (o Chega fecha às 23h), que não aparece: é um caso para decomposição (módulo 12).',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-pesquisa-hibrida-05',
            title: 'Os quatro métodos no conjunto dourado',
            brief: 'Recall e MRR ao nível do documento, com k = 3 e k = 5. São os números de referência da adr-0009.',
            code: `import balcao as b

print("método    recall@3  MRR@3  recall@5  nDCG@5")
for metodo in ["bm25", "denso", "hibrido", "rerank"]:
    a3 = b.avaliar_recuperacao(metodo, 3)
    a5 = b.avaliar_recuperacao(metodo, 5)
    print(f"{metodo:8}  {a3['recall']:8.3f}  {a3['mrr']:5.3f}  {a5['recall']:8.3f}  {a5['ndcg']:6.3f}")`,
            expected: `método    recall@3  MRR@3  recall@5  nDCG@5
bm25         0.833  0.706     0.867   0.753
denso        0.900  0.867     0.950   0.881
hibrido      0.933  0.828     0.950   0.864
rerank       0.950  0.889     0.950   0.896`,
          },
        },
        {
          type: 'p',
          text:
            'Lê a tabela pelas colunas que importam para o «Balcão». O prompt recebe 4 excertos, por isso o recall@5 diz pouco: denso, híbrido e re-rank empatam em 0,950. O que separa os métodos é o topo: o re-ranking tem o melhor MRR@3 (0,889), ou seja, o documento certo aparece mais vezes em 1.º lugar, que é onde o modelo lhe dá mais peso e onde o limiar de recusa olha. E as diferenças são de uma ou duas perguntas em 30: suficientes para decidir uma arquitectura quando concordam com a teoria, insuficientes para afinar parâmetros (módulo 21 mostra o intervalo de confiança).',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Um cross-encoder real com `sentence-transformers`. Os modelos `cross-encoder/ms-marco-*` foram treinados em inglês; para português, mede um multilingue (o `BAAI/bge-reranker-v2-m3` tem 0,6 B de parâmetros e é caro em CPU) no teu conjunto dourado antes de escolher.',
          code: `from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", max_length=512)

def reordenar(pergunta: str, candidatos: list[Document], k: int = 4) -> list[tuple[Document, float]]:
    pares = [(pergunta, d.page_content) for d in candidatos]        # 20 pares
    scores = reranker.predict(pares, batch_size=20)                 # um forward por par, em lote
    ordem = sorted(zip(candidatos, scores), key=lambda x: -float(x[1]))
    return [(d, float(s)) for d, s in ordem[:k]]`,
        },
        {
          type: 'table',
          head: ['Opção de re-ranking', 'Latência para 20 pares', 'Custo', 'Nota'],
          rows: [
            ['Sem re-ranking', '0', 'nulo', 'MRR@3 0,828 no runtime; o topo depende da fusão'],
            ['Cross-encoder pequeno (dezenas de M de parâmetros)', 'dezenas a poucas centenas de ms em CPU', 'uma réplica do serviço', 'a opção do «Balcão»: ≈ 180 ms no orçamento'],
            ['Cross-encoder grande (≈ 0,5 B+)', 'centenas de ms em CPU; precisa de GPU para caber', 'GPU ou API', 'só se o ganho medido pagar o TTFT'],
            ['API de re-ranking de um fornecedor', 'rede + fila do fornecedor', 'por pedido', 'dependência externa no caminho crítico'],
            ['LLM como re-ranker', 'uma chamada ao modelo', 'tokens de 20 chunks', 'caro e lento para cada turno; útil offline para anotar'],
          ],
          caption: 'Ordens de grandeza, dependentes do hardware e do comprimento dos chunks. Mede com os teus 20 candidatos reais antes de decidir.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Em produção: o re-ranker é mais um modelo para servir e avaliar',
          text:
            'Os 180 ms do re-ranking são a fase mais cara antes do primeiro token depois do próprio modelo, e deixam ≈ 140 ms de folga no TTFT de 1,5 s. O re-ranker tem versão fixada, métricas próprias (p95 da fase, alarme acima de 180 ms), e cada troca obriga a recalibrar o limiar de recusa, que vive na escala dele (adr-0011). Se o serviço do re-ranker cair, a cadeia degrada para o ranking RRF em vez de falhar o turno.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Sentence Transformers — cross-encoders', url: 'https://sbert.net/docs/cross_encoder/usage/usage.html' },
            { label: 'Nogueira e Cho — Passage re-ranking with BERT (2019)', url: 'https://arxiv.org/abs/1901.04085' },
            { label: 'BAAI — bge-reranker-v2-m3', url: 'https://huggingface.co/BAAI/bge-reranker-v2-m3' },
          ],
        },
      ],
    },

    /* ================================================================= 6 */
    {
      id: 'sql',
      title: 'A consulta híbrida numa só SQL',
      blocks: [
        {
          type: 'p',
          text:
            'No laboratório, denso, lexical e fusão são uma função SQL (`pesquisa_hibrida` em `001_esquema.sql`). Uma ida à base de dados, um plano, uma transacção: os filtros, o HNSW, o GIN e o RRF correm onde estão os dados. O Python recebe 20 linhas já fundidas, com a posição em cada lista para depuração, e faz o re-ranking.',
        },
        {
          type: 'code',
          lang: 'sql',
          caption: 'O coração de `pesquisa_hibrida`: dois CTE com os filtros **antes** do `LIMIT`, uma consulta lexical em OU, e a fusão com `FULL OUTER JOIN`.',
          code: `WITH denso AS (
    SELECT s.id, row_number() OVER (ORDER BY s.distancia, s.id) AS pos
    FROM (
        SELECT c.id, c.embedding <=> consulta_vector AS distancia
        FROM chunks c JOIN documentos d ON d.id = c.documento_id
        WHERE d.vigente AND d.publico = ANY (publicos) AND c.modelo_embedding = modelo
        ORDER BY c.embedding <=> consulta_vector      -- é este ORDER BY ... LIMIT que usa o HNSW
        LIMIT k
    ) s
),
q AS (   -- OU entre os lexemas da pergunta: o ranking decide, não o casamento de todos os termos
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE string_agg(quote_literal(lexema), ' | ')::tsquery END AS tsq
    FROM unnest(tsvector_to_array(to_tsvector('portuguese', consulta))) AS lexema
),
lexical AS (
    SELECT s.id, row_number() OVER (ORDER BY s.rank DESC, s.id) AS pos
    FROM (
        SELECT c.id, ts_rank_cd(c.tsv, q.tsq) AS rank
        FROM chunks c JOIN documentos d ON d.id = c.documento_id CROSS JOIN q
        WHERE q.tsq IS NOT NULL AND c.tsv @@ q.tsq AND d.vigente AND d.publico = ANY (publicos)
        ORDER BY ts_rank_cd(c.tsv, q.tsq) DESC, c.id
        LIMIT k
    ) s
),
fundido AS (
    SELECT coalesce(dn.id, lx.id) AS id, dn.pos AS rank_denso, lx.pos AS rank_lexical,
           coalesce(1.0 / (k_rrf + dn.pos), 0) + coalesce(1.0 / (k_rrf + lx.pos), 0) AS score
    FROM denso dn FULL OUTER JOIN lexical lx ON lx.id = dn.id
)
SELECT ... FROM fundido f JOIN chunks c ON c.id = f.id ... ORDER BY f.score DESC, c.id LIMIT k;`,
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-pesquisa-hibrida-01',
            title: 'Dentro dos 45 ms da pesquisa híbrida',
            intro: 'Uma chamada do `IndicePostgres.pesquisar` para a pergunta da cerveja, filtrada para o cliente. Os tempos são ordens de grandeza para ≈ 1 870 chunks num PostgreSQL gerido; o total é o do orçamento de latência.',
            lanes: [
              { id: 'py', label: 'IndicePostgres', sub: 'psycopg, pool', kind: 'service' },
              { id: 'pg', label: 'PostgreSQL', sub: 'planeador e executor', kind: 'store' },
              { id: 'hnsw', label: 'Índice HNSW', sub: 'vector_cosine_ops', kind: 'infra' },
              { id: 'gin', label: 'Índice GIN', sub: 'tsv', kind: 'infra' },
            ],
            steps: [
              { from: 'py', to: 'pg', label: 'BEGIN; SET LOCAL hnsw.iterative_scan = relaxed_order; SET LOCAL hnsw.ef_search = 100', detail: 'Valem só nesta transacção. Com o filtro `vigente AND publico`, o iterative scan (pgvector 0.8) continua a procurar no grafo até ter k linhas que passam o filtro.', kind: 'req', ms: 2 },
              { from: 'py', to: 'pg', label: 'SELECT ... FROM pesquisa_hibrida(consulta, vector, [cliente], modelo, 20, 60)', kind: 'req', ms: 2 },
              { from: 'pg', to: 'hnsw', label: 'CTE denso: ORDER BY embedding <=> $v LIMIT 20', detail: 'Travessia do grafo com ef_search = 100; as linhas que falham o filtro são descartadas e a travessia continua.', kind: 'req', ms: 15 },
              { from: 'hnsw', to: 'pg', label: '20 ids por distância; pol-bebidas-alcool em 1.º', kind: 'res', ms: 0 },
              { from: 'pg', to: 'gin', label: "CTE lexical: tsv @@ 'pedir' | 'cervej' | '23h'", detail: 'Com o OU, qualquer chunk com «pedir» casa. O `ts_rank_cd` ordena; «cervej» não existe no corpus.', kind: 'req', ms: 12 },
              { from: 'gin', to: 'pg', label: 'até 20 ids por ts_rank_cd', kind: 'res', ms: 0 },
              { from: 'pg', to: 'pg', label: 'FULL OUTER JOIN + 1/(60 + pos) + ORDER BY score', detail: 'Os chunks nas duas listas ficam à frente; a política de álcool, só no denso, desce.', kind: 'self', ms: 4 },
              { from: 'pg', to: 'py', label: '20 linhas com rank_denso, rank_lexical e score', detail: 'As duas posições vão para os metadados de cada Document: é o que o `POST /v1/pesquisa` mostra ao suporte.', kind: 'res', ms: 10 },
            ],
            outro: 'O re-ranking corre a seguir no Python, sobre as 20 linhas. Se o iterative scan estivesse desligado e o filtro retirasse metade dos vizinhos, o CTE denso podia devolver menos de 20 — um defeito silencioso que o teste de «k linhas devolvidas» apanha.',
          },
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'O lado Python (`IndicePostgres.pesquisar` em `recuperacao.py`), resumido. `SET LOCAL` e a consulta na mesma transacção.',
          code: `def pesquisar(self, consulta: str, vector: list[float], k: int, publicos: Sequence[str]):
    with self.pool.connection() as con, con.transaction():
        if self.cfg.iterative_scan:                       # pgvector >= 0.8
            con.execute("SET LOCAL hnsw.iterative_scan = relaxed_order")
        con.execute(f"SET LOCAL hnsw.ef_search = {int(self.cfg.ef_search)}")
        linhas = con.execute(SQL_PESQUISA_HIBRIDA, {
            "consulta": consulta, "vector": _vector_literal(vector),
            "publicos": list(publicos), "modelo": self.modelo_embedding,
            "k": k, "k_rrf": self.cfg.k_rrf,
        }).fetchall()
    return [(Document(id=ln[0], page_content=ln[3], metadata={...}), float(ln[-1])) for ln in linhas]`,
        },
        { type: 'file', ref: 'src/balcao/recuperacao.py' },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Filtrar depois do LIMIT',
          text:
            'A versão ingénua faz a pesquisa híbrida sem filtros e aplica `WHERE vigente` à saída: `SELECT * FROM (pesquisa LIMIT 20) WHERE vigente`. Na pergunta da política substituída, o chunk de 2025 ocupa um dos 20 lugares e sai depois, e sobram 19 — ou 12, se houver muitas versões antigas. Os filtros vão dentro de cada CTE, antes do `ORDER BY ... LIMIT`, com o iterative scan ligado para o HNSW encontrar k linhas válidas (adr-0010, módulo 12).',
        },
        { type: 'endpoint', ref: 'pesquisa' },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — iterative index scans e filtros', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — índices para pesquisa de texto (GIN)', url: 'https://www.postgresql.org/docs/current/textsearch-indexes.html' },
          ],
        },
      ],
    },
  ],

  /* ================================================================ quiz */
  quiz: [
    {
      id: 'q-pesquisa-hibrida-01',
      topic: 'bm25',
      prompt: 'No cálculo do BM25 para «O estafeta tem troco para 1000?», o termo «1000» contribui 0. Porquê?',
      options: [
        'Porque números são stopwords.',
        'Porque a política escreve «1 000» com espaço, e os termos indexados são «1» e «000»; df(«1000») = 0.',
        'Porque o IDF de números é sempre zero.',
        'Porque k1 satura números.',
      ],
      answer: [1],
      explain: 'O BM25 casa formas escritas. Separadores de milhares, hífens em códigos e formatos de data têm de ser normalizados na ingestão e na consulta; nenhum dos dois métodos o faz sozinho.',
    },
    {
      id: 'q-pesquisa-hibrida-02',
      topic: 'postgres',
      prompt: 'Que problemas tem `to_tsvector(\'portuguese\', ...)` com o texto de clientes do «Chega»? (duas respostas)',
      options: [
        'Não remove acentos: «cupão» e «cupao» dão lexemas diferentes.',
        'Não suporta índices GIN.',
        'Parte «PD-8841990» em `pd` e no inteiro `-8841990`, e a pesquisa pelo número sem hífen falha.',
        'Só funciona com `plainto_tsquery`.',
      ],
      answer: [0, 2],
      explain: 'A saída real de `psql` mostra os dois. `unaccent` numa configuração própria resolve os acentos; os códigos precisam de normalização explícita (ou de irem para uma ferramenta, como os pedidos).',
    },
    {
      id: 'q-pesquisa-hibrida-03',
      topic: 'postgres',
      prompt: 'Porque é que a metade lexical do «Balcão» não usa `plainto_tsquery` sobre a pergunta?',
      options: [
        'Porque junta os termos com E, e uma pergunta de seis palavras raramente casa com um chunk que as tenha todas.',
        'Porque não aceita português.',
        'Porque é mais lenta do que `to_tsquery`.',
        'Porque não usa o índice GIN.',
      ],
      answer: [0],
      explain: 'Numa pesquisa híbrida o lexical deve devolver candidatos ordenados, não só os que casam com tudo. O OU entre lexemas deixa o `ts_rank_cd` decidir a ordem.',
    },
    {
      id: 'q-pesquisa-hibrida-04',
      topic: 'rrf',
      prompt: 'Porque é que o RRF não precisa de normalizar os scores do cosseno e do `ts_rank_cd`?',
      options: [
        'Porque os dois já estão entre 0 e 1.',
        'Porque só usa as posições em cada ranking, não os scores.',
        'Porque multiplica os scores em vez de os somar.',
        'Porque o PostgreSQL normaliza automaticamente.',
      ],
      answer: [1],
      explain: '1/(k + posição) só depende da ordem. É o que o torna robusto a mudanças de modelo ou de corpus, que mudam as escalas dos scores mas não necessariamente a ordem.',
    },
    {
      id: 'q-pesquisa-hibrida-05',
      topic: 'rrf',
      prompt: 'Na pergunta da cerveja, o denso tem a política certa em 1.º e o híbrido põe-na em 4.º. O que explica isto e o que o corrige? (duas respostas)',
      options: [
        'O RRF premeia o consenso: chunks nas duas listas somam duas parcelas e passam à frente do que só uma lista encontrou.',
        'O k = 60 é demasiado pequeno.',
        'O re-ranking, que lê pergunta e chunk juntos, devolve a política ao topo.',
        'Tirar o filtro `vigente` da consulta.',
      ],
      answer: [0, 2],
      explain: 'É a fraqueza estrutural do RRF. Mudar k não ajuda (o resultado é o mesmo de 10 a 200); o re-ranking, sim.',
    },
    {
      id: 'q-pesquisa-hibrida-06',
      topic: 'reranking',
      prompt: 'Porque é que não se usa o cross-encoder directamente sobre os ≈ 1 870 chunks, sem índices?',
      options: [
        'Porque o cross-encoder precisa de um forward por par (pergunta, chunk) e não permite pré-calcular nada: 1 870 forwards por pergunta.',
        'Porque só aceita 20 chunks por limite da biblioteca.',
        'Porque não funciona com português.',
        'Porque devolve vectores de 768 dimensões.',
      ],
      answer: [0],
      explain: 'O bi-encoder permite indexar os chunks uma vez; o cross-encoder não. A arquitectura em duas fases (recuperar barato e muito, re-ordenar caro e pouco) existe por causa disto.',
    },
    {
      id: 'q-pesquisa-hibrida-07',
      topic: 'metricas',
      prompt: 'Denso, híbrido e re-rank têm todos recall@5 de 0,950. Que métrica justifica o re-ranking no «Balcão»?',
      options: [
        'Recall@5.',
        'MRR@3: o re-ranking põe o documento certo em 1.º mais vezes (0,889).',
        'O número de chunks do índice.',
        'A latência, que desce com o re-ranking.',
      ],
      answer: [1],
      explain: 'Com 4 excertos no prompt, o que muda a resposta e o limiar de recusa é a posição do documento certo, não a sua presença algures no top-5.',
    },
    {
      id: 'q-pesquisa-hibrida-08',
      topic: 'sql',
      prompt: 'Que decisões na função `pesquisa_hibrida` evitam devolver menos de k resultados válidos? (duas respostas)',
      options: [
        'Os filtros `vigente` e `publico` dentro de cada CTE, antes do `LIMIT`.',
        'O `FULL OUTER JOIN` em vez de `INNER JOIN` na fusão.',
        '`SET LOCAL hnsw.iterative_scan = relaxed_order` na transacção.',
        'O `row_number()` com desempate por id.',
      ],
      answer: [0, 2],
      explain: 'Filtrar antes do LIMIT impede que chunks proibidos ocupem lugares; o iterative scan deixa o HNSW continuar a procurar quando o filtro descarta vizinhos. O FULL OUTER JOIN serve para não perder os que só uma lista encontrou, e o desempate para determinismo.',
    },
    {
      id: 'q-pesquisa-hibrida-09',
      topic: 'postgres',
      prompt: 'O que distingue o `ts_rank` do PostgreSQL do BM25?',
      options: [
        'O `ts_rank` não usa informação global como o IDF: um termo raro e um comum que casam valem o mesmo.',
        'O `ts_rank` só funciona com índices HNSW.',
        'O BM25 não normaliza pelo comprimento.',
        'O `ts_rank` usa embeddings.',
      ],
      answer: [0],
      explain: 'A documentação do PostgreSQL diz explicitamente que as funções de ranking não usam informação global. Para o RRF só a ordem conta, mas a ordem lexical fica mais fraca em perguntas com um termo raro entre vários comuns.',
    },
  ],

  /* =========================================================== exercícios */
  exercises: [
    {
      id: 'e-pesquisa-hibrida-01',
      title: 'Um score RRF',
      kind: 'input',
      statement:
        'Com k = 60, um chunk está em 2.º lugar no ranking denso e em 5.º no lexical. Qual é o score RRF, com 5 casas decimais?',
      accept: ['0.03151', '0,03151'],
      hint: '1/(60 + 2) + 1/(60 + 5).',
      solution: '1/62 + 1/65 = 0,016129 + 0,015385 = 0,031514 ≈ 0,03151. Um chunk em 1.º nas duas listas teria 2/61 ≈ 0,03279: estar nas duas listas pesa mais do que estar em 1.º numa só (0,01639).',
      difficulty: 1,
    },
    {
      id: 'e-pesquisa-hibrida-02',
      title: 'Referências de reembolso',
      kind: 'open',
      statement:
        'O suporte quer que o «Balcão» responda a «o meu RB-004211 ainda não chegou». A referência não está em nenhuma política. O que deve fazer a pesquisa com este texto, e o que deve fazer o sistema com a referência?',
      hint: 'A referência é um identificador de um objecto com estado, não um termo de pesquisa.',
      solution:
        'Uma referência de reembolso é estado mutável e pessoal: a resposta vem de uma ferramenta (consultar o reembolso), não do índice. Na pesquisa, a referência deve ser retirada ou normalizada antes de chegar ao embedding e ao `tsquery` (como a cadeia já faz com as marcas de PII), para não gerar ruído: `rb` e `-004211` casam com a política de prazos por acaso. A parte útil da pergunta para o RAG é «reembolso não chegou», que recupera `pol-reembolso-prazos` («se o prazo passou... envie a referência»). O classificador de intenção deve encaminhar para o caminho de ferramenta quando detecta o padrão RB-.',
      difficulty: 2,
    },
    {
      id: 'e-pesquisa-hibrida-03',
      title: 'Híbrido para o catálogo de produtos',
      kind: 'design',
      statement:
        'O «Chega» quer pesquisa no catálogo de 40 000 produtos de mercearia e farmácia («paracetamol 500», «leite condensado Nestlé», «fraldas tamanho 4»). Desenha a pesquisa: que métodos, que normalização, que fusão, se há re-ranking, e como avalias.',
      hint: 'Aqui os números e as marcas são a maior parte da pergunta, e há milhares de consultas por minuto.',
      solution:
        'Lexical é o método principal (marcas, dosagens, tamanhos), com normalização forte: `unaccent`, unidades («500mg» = «500 mg»), números sem separadores. Denso para sinónimos e descrições («algo para a febre»), com um modelo multilingue. Fusão RRF com pesos? Não: RRF simples, mas com o lexical a devolver mais candidatos. Filtros por disponibilidade na loja e zona antes do LIMIT. Re-ranking: com milhares de consultas por minuto e latência de pesquisa de catálogo, um cross-encoder por consulta é caro; alternativa é re-ranking só quando o topo é ambíguo, ou sinais de negócio (vendas) numa segunda fase. Avaliação: consultas reais dos logs com cliques como relevância implícita, recall@10 e MRR, por segmento (marca, dosagem, descrição).',
      difficulty: 3,
    },
    {
      id: 'e-pesquisa-hibrida-04',
      title: 'Quem só aparece numa lista',
      kind: 'code',
      statement:
        'Escreve um script que, para cada pergunta dourada, calcula o híbrido (RRF de denso e BM25, 20 candidatos cada) e conta em quantas perguntas o documento relevante está no top-3 de **só um** dos métodos e fora do top-3 do híbrido.',
      hint: 'Usa `b.IndiceExacto`, `b.BM25` e `b.rrf` sobre `b.chunkar_corpus("recursivo")`; compara ao nível do documento.',
      solution:
        'import balcao as b\n\nch = b.chunkar_corpus("recursivo")\nden, lex = b.IndiceExacto(ch), b.BM25(ch)\n\ndef top3(res):\n    return list(dict.fromkeys(c.doc for c, _ in res))[:3]\n\nperdidos = 0\nfor p in b.PERGUNTAS:\n    d, l = den.procurar(p["pergunta"], 20), lex.procurar(p["pergunta"], 20)\n    h = b.rrf(d, l)\n    rel = set(p["relevantes"])\n    em_d, em_l, em_h = bool(rel & set(top3(d))), bool(rel & set(top3(l))), bool(rel & set(top3(h)))\n    if (em_d != em_l) and not em_h:\n        perdidos += 1\n        print(p["id"], p["pergunta"])\nprint("perdidos pela fusão:", perdidos)',
      difficulty: 2,
    },
  ],

  /* ========================================================= laboratórios */
  labs: [
    {
      id: 'lab-pesquisa-hibrida-01',
      moduleId: 'pesquisa-hibrida',
      title: 'Fundir com RRF, não com somas',
      brief:
        'A função `fundir` soma os scores do denso e do BM25, que vivem em escalas diferentes (cosseno até 1, BM25 até ≈ 10): o BM25 domina tudo. Reescreve-a como Reciprocal Rank Fusion com k = 60, posições a começar em 1, desempate por id, e mede o recall@3 no conjunto dourado.',
      lang: 'python',
      starter: `import balcao as b

ch = b.chunkar_corpus("recursivo")
den, lex = b.IndiceExacto(ch), b.BM25(ch)

def fundir(denso, lexical):
    total = {}
    for c, s in denso + lexical:
        total[c.id] = total.get(c.id, 0.0) + s
    return sorted(total, key=lambda i: -total[i])

doc = {c.id: c.doc for c in ch}
r = []
for p in b.PERGUNTAS:
    ids = fundir(den.procurar(p["pergunta"], 20), lex.procurar(p["pergunta"], 20))
    docs = list(dict.fromkeys(doc[i] for i in ids))
    r.append(b.recall_at_k(docs, p["relevantes"], 3))
print(round(sum(r) / len(r), 3))
`,
      checks: [
        { id: 'reciproco', label: 'Soma 1/(k + posição)', re: '1(\\.0)?\\s*/\\s*\\(\\s*k\\s*\\+\\s*pos', why: 'O RRF usa posições, não scores.' },
        { id: 'start1', label: 'Posições a começar em 1', re: 'enumerate\\([^)]*start\\s*=\\s*1', why: 'No artigo, a primeira posição é 1: 1/(60 + 1).' },
        { id: 'k60', label: 'k = 60', re: 'k\\s*(:\\s*int\\s*)?=\\s*60', why: 'O valor do artigo e do «Balcão» (adr-0009).' },
        { id: 'desempate', label: 'Desempate por id', re: '\\(\\s*-\\s*total\\[i\\]\\s*,\\s*i\\s*\\)', why: 'Sem desempate, a ordem de chunks com o mesmo score muda entre execuções.' },
        { id: 'sem-soma-scores', label: 'Não soma scores brutos', re: '\\+\\s*s\\s*$', forbid: true, why: 'Somar cosseno com BM25 deixa o BM25 dominar.' },
      ],
      hints: [
        'Percorre cada ranking com `for pos, (c, _) in enumerate(ranking, start=1)`.',
        'Acumula `total[c.id] = total.get(c.id, 0.0) + 1.0 / (k + pos)`.',
        'Ordena com `sorted(total, key=lambda i: (-total[i], i))`.',
      ],
      solution: `import balcao as b

ch = b.chunkar_corpus("recursivo")
den, lex = b.IndiceExacto(ch), b.BM25(ch)

def fundir(*rankings, k: int = 60):
    total = {}
    for ranking in rankings:
        for pos, (c, _) in enumerate(ranking, start=1):
            total[c.id] = total.get(c.id, 0.0) + 1.0 / (k + pos)
    return sorted(total, key=lambda i: (-total[i], i))

doc = {c.id: c.doc for c in ch}
r = []
for p in b.PERGUNTAS:
    ids = fundir(den.procurar(p["pergunta"], 20), lex.procurar(p["pergunta"], 20))
    docs = list(dict.fromkeys(doc[i] for i in ids))
    r.append(b.recall_at_k(docs, p["relevantes"], 3))
print(round(sum(r) / len(r), 3))
`,
      difficulty: 1,
      executavel: true,
    },
    {
      id: 'lab-pesquisa-hibrida-02',
      moduleId: 'pesquisa-hibrida',
      title: 'O CTE lexical, bem feito',
      brief:
        'O CTE lexical abaixo usa `plainto_tsquery` (E entre todos os termos), filtra `vigente` só depois do `LIMIT` e esquece `publico`. Reescreve-o: consulta em OU construída a partir dos lexemas de `to_tsvector(\'portuguese\', consulta)`, filtros `vigente` e `publico = ANY (publicos)` antes do `LIMIT`, ordenação por `ts_rank_cd` com desempate por id, e a posição com `row_number()`.',
      lang: 'sql',
      starter: `WITH lexical AS (
    SELECT s.id, row_number() OVER (ORDER BY s.rank DESC) AS pos
    FROM (
        SELECT c.id, ts_rank(c.tsv, plainto_tsquery('portuguese', consulta)) AS rank, d.vigente
        FROM chunks c JOIN documentos d ON d.id = c.documento_id
        WHERE c.tsv @@ plainto_tsquery('portuguese', consulta)
        ORDER BY rank DESC
        LIMIT k
    ) s
    WHERE s.vigente
)
SELECT * FROM lexical;
`,
      checks: [
        { id: 'sem-plainto', label: 'Não usa plainto_tsquery', re: 'plainto_tsquery', forbid: true, why: 'E entre todos os termos: perguntas de cliente quase nunca casam.' },
        { id: 'ou', label: 'Consulta em OU a partir dos lexemas', re: "' \\| '[\\s\\S]*tsvector_to_array", why: 'O OU entre lexemas deixa o ranking decidir.' },
        { id: 'rank-cd', label: 'Ordena por ts_rank_cd', re: 'ts_rank_cd\\(', why: 'Cover density considera a proximidade dos termos.' },
        { id: 'publico', label: 'Filtra publico', re: 'publico\\s*=\\s*ANY', why: 'Procedimentos internos nunca chegam ao cliente.' },
        { id: 'filtro-antes', label: 'vigente antes do LIMIT', re: 'WHERE[^;]*vigente[^;]*ORDER BY[^;]*LIMIT', flags: 'i', why: 'Filtrar depois do LIMIT deixa chunks proibidos ocupar lugares.' },
        { id: 'desempate', label: 'Desempate por id', re: 'DESC\\s*,\\s*(s|c)\\.id', why: 'Ordem determinista entre chunks com o mesmo rank.' },
      ],
      hints: [
        'Um CTE `q` com `string_agg(quote_literal(lexema), \' | \')::tsquery FROM unnest(tsvector_to_array(to_tsvector(\'portuguese\', consulta))) AS lexema`.',
        'Junta `CROSS JOIN q` e usa `c.tsv @@ q.tsq` no WHERE, com `d.vigente AND d.publico = ANY (publicos)`.',
      ],
      solution: `WITH q AS (
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE string_agg(quote_literal(lexema), ' | ')::tsquery END AS tsq
    FROM unnest(tsvector_to_array(to_tsvector('portuguese', consulta))) AS lexema
),
lexical AS (
    SELECT s.id, row_number() OVER (ORDER BY s.rank DESC, s.id) AS pos
    FROM (
        SELECT c.id, ts_rank_cd(c.tsv, q.tsq) AS rank
        FROM chunks c
        JOIN documentos d ON d.id = c.documento_id
        CROSS JOIN q
        WHERE q.tsq IS NOT NULL
          AND c.tsv @@ q.tsq
          AND d.vigente
          AND d.publico = ANY (publicos)
        ORDER BY ts_rank_cd(c.tsv, q.tsq) DESC, c.id
        LIMIT k
    ) s
)
SELECT * FROM lexical;
`,
      difficulty: 2,
    },
  ],

  /* ========================================================= casos de uso */
  useCases: [
    {
      id: 'uc-pesquisa-hibrida-01',
      title: 'Operador de telecomunicações em Moçambique: tarifários, códigos USSD e sinónimos',
      area: 'telecomunicações',
      level: 2,
      scenario:
        'Um operador móvel quer um assistente no WhatsApp para dúvidas sobre tarifários e serviços. As perguntas misturam nomes comerciais de pacotes, códigos USSD («*150#»), valores («pacote de 50 MT») e linguagem coloquial em português com palavras de changana e inglês («bundle», «megas», «saldo acabou»). A base tem 600 fichas de tarifário e FAQ, com promoções que mudam todas as semanas.',
      requirements: [
        'Encontrar o pacote certo quando o cliente diz o nome, o código ou só descreve o que quer.',
        'Nunca responder com uma promoção expirada.',
        'Resposta em menos de 2 s no WhatsApp.',
        'Uma só base de dados já operada pela equipa (PostgreSQL).',
      ],
      constraints: [
        'Códigos USSD têm asteriscos e cardinais que os tokenizadores e o dicionário `portuguese` descartam.',
        'Sem GPU no ambiente de produção.',
      ],
      approach: [
        { title: 'Normalização de códigos na ingestão e na consulta', text: 'Uma coluna `codigos` com os USSD e nomes de pacote normalizados («*150#» → «ussd150»), incluída no `tsvector` com peso A; a mesma função corre sobre a pergunta antes da pesquisa.' },
        { title: 'Híbrido com RRF', text: 'Denso multilingue para «os megas acabaram» e lexical para «Pacote Mega 50» e «ussd150», fundidos com RRF (k = 60) numa só SQL, com `valido_ate >= now()` dentro de cada CTE.' },
        { title: 'Re-ranking pequeno em CPU', text: 'Cross-encoder multilingue pequeno sobre 20 candidatos, medido a ≈ 150 ms no hardware de produção; o maior testado passava o orçamento.' },
        { title: 'Avaliação por tipo de pergunta', text: '300 perguntas reais etiquetadas como nome, código, valor ou descrição; recall@3 e MRR por etiqueta, porque a média escondia que o denso sozinho falhava 40% das perguntas com código.' },
      ],
      diagram: {
        title: 'A pesquisa do operador: normalizar, fundir, re-ordenar',
        cols: 6,
        rows: 2,
        zones: [
          { id: 'z-pg', label: 'PostgreSQL (uma consulta)', col: 2, row: 0, colSpan: 2, rowSpan: 2, tone: 'data' },
        ],
        nodes: [
          { id: 'cliente', label: 'cliente', sub: '«o *150# já não dá megas»', col: 0, row: 0, kind: 'user' },
          { id: 'norm', label: 'normalizar', sub: 'ussd150, unidades', col: 1, row: 0, kind: 'service' },
          { id: 'denso', label: 'denso', sub: 'HNSW, válidos', col: 2, row: 0, kind: 'vector' },
          { id: 'lex', label: 'lexical', sub: 'tsvector com códigos (A)', col: 2, row: 1, kind: 'data' },
          { id: 'rrf', label: 'RRF', sub: 'k = 60', col: 3, row: 0, kind: 'service' },
          { id: 'ce', label: 'cross-encoder', sub: 'CPU, 20 pares', col: 4, row: 0, kind: 'model' },
          { id: 'resp', label: 'resposta', sub: 'com ficha citada', col: 5, row: 0, kind: 'model' },
        ],
        edges: [
          { from: 'cliente', to: 'norm' },
          { from: 'norm', to: 'denso' },
          { from: 'norm', to: 'lex' },
          { from: 'denso', to: 'rrf' },
          { from: 'lex', to: 'rrf' },
          { from: 'rrf', to: 'ce' },
          { from: 'ce', to: 'resp' },
        ],
      },
      solution:
        'Pesquisa híbrida com RRF numa só consulta PostgreSQL, com códigos normalizados dos dois lados e filtro de validade antes do LIMIT, e re-ranking com um cross-encoder pequeno em CPU. A decisão veio da avaliação por tipo de pergunta, não da média.',
      tools: [
        { name: 'PostgreSQL + pgvector', role: 'HNSW, tsvector com pesos e filtros de validade' },
        { name: 'sentence-transformers CrossEncoder', role: 're-ranking dos 20 candidatos' },
        { name: 'unaccent', role: 'acentos e grafias do WhatsApp' },
      ],
      rejected: [
        { option: 'Só denso', why: 'Falhava perguntas com código USSD e nome de pacote, que são um terço do tráfego.' },
        { option: 'Combinação linear de scores', why: 'O peso óptimo mudava sempre que entrava uma promoção nova com vocabulário diferente.' },
        { option: 'Motor de pesquisa dedicado ao lado do PostgreSQL', why: 'Duas infra-estruturas para sincronizar e uma equipa pequena; o PostgreSQL chegava para 600 fichas.' },
      ],
      costNote:
        'O custo é o re-ranker (uma réplica em CPU) e o trabalho de manter a tabela de normalização de códigos. Os índices cabem em memória com folga.',
      takeaways: [
        'Avalia por tipo de pergunta: a média esconde a classe em que um método falha sempre.',
        'Códigos e unidades normalizam-se na ingestão e na consulta, com a mesma função.',
        'RRF poupa-te a afinar pesos que mudam com cada documento novo.',
      ],
      refs: [
        { label: 'PostgreSQL — unaccent', url: 'https://www.postgresql.org/docs/current/unaccent.html' },
        { label: 'Sentence Transformers — cross-encoders', url: 'https://sbert.net/docs/cross_encoder/usage/usage.html' },
      ],
    },
  ],
};
