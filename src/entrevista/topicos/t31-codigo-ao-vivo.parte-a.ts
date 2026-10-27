import type { PerguntaEntrevista } from '../../types';

/* Tópico 31 — perguntas 1 a 5: recuperação (cosseno, BM25, RRF, chunking, métricas).
   O código de cada solução foi executado com python3 (3.13) e numpy; os asserts passam. */

export const perguntasA: PerguntaEntrevista[] = [
  {
    id: 'p-codigo-ao-vivo-01',
    tipo: 'codigo',
    nivel: 'pleno',
    titulo: 'Top-k por cosseno vectorizado com numpy',
    enunciado:
      'Tens a matriz de embeddings dos documentos em memória e o embedding de uma consulta. Escreve uma função que devolve os k documentos mais parecidos por cosseno, vectorizada com numpy — sem ciclos em Python sobre os documentos.',
    contexto:
      'Assinatura: `top_k_cosseno(query, matriz, k) -> (indices, scores)`, com `matriz` de forma `(n, d)` e `query` de forma `(d,)`; n até ~1 milhão, d = 768. Os vectores não vêm normalizados e há linhas a zero (documentos vazios que o pipeline embebeu mal). Exemplo: matriz `[[1,0],[0,1],[1,1],[0,0],[2,0]]`, query `[1,0]`, k = 2 → índices `[0, 4]` com scores `[1.0, 1.0]`; com k = 10 → `[0, 4, 2, 1]`. Empates resolvem-se pelo índice menor.',
    minutos: 15,
    dica: 'Ordenar um milhão de scores para ficar com 10 é trabalho a mais; o numpy tem selecção parcial.',
    resposta: [
      {
        type: 'p',
        text: 'Calculo as normas, faço **um** produto matriz-vector e uso selecção parcial: **O(n·d)** para os scores, **O(n)** para escolher os k e O(k log k) para ordenar só os vencedores. O trabalho está nos casos-limite: vectores nulos, k maior do que n e empates no limiar, que a selecção parcial resolve de forma arbitrária.',
      },
      {
        type: 'p',
        text: 'O cosseno é `q·m / (‖q‖·‖m‖)`. Calculo as normas por linha com `np.linalg.norm(axis=1)` e excluo as linhas com norma abaixo de `eps`: o cosseno não está definido e devolver 0 metia lixo no ranking. Para a selecção, `np.partition` dá o k-ésimo maior score em tempo linear; fico com todos os índices com score maior ou igual a esse limiar e ordeno-os com `kind="stable"`, que preserva a ordem crescente de índice nos empates. Com `argpartition` directo, dois documentos empatados no limiar podiam trocar entre versões do numpy — e um ranking que não é reprodutível estraga qualquer comparação de avaliação.',
      },
      { type: 'code', lang: 'python', caption: 'Top-k por cosseno com selecção parcial e empates estáveis', code: `import numpy as np


def top_k_cosseno(query, matriz, k: int, eps: float = 1e-12):
    """Devolve (indices, scores) das k linhas de \`matriz\` mais parecidas com \`query\`.

    Linhas nulas são excluídas (cosseno indefinido); empates ficam por índice crescente.
    """
    m = np.asarray(matriz)
    m = m.astype(np.result_type(m.dtype, np.float32), copy=False)   # float32 fica float32
    q = np.asarray(query, dtype=m.dtype)
    if q.ndim != 1 or m.ndim != 2 or m.shape[1] != q.shape[0]:
        raise ValueError(f"formas incompatíveis: query {q.shape}, matriz {m.shape}")
    if not (np.isfinite(q).all() and np.isfinite(m).all()):
        raise ValueError("NaN ou infinito nos vectores")
    q_norma = np.linalg.norm(q)
    if q_norma < eps:
        raise ValueError("query nula: cosseno indefinido")

    normas = np.linalg.norm(m, axis=1)
    validos = np.flatnonzero(normas >= eps)           # índices crescentes
    k = min(max(int(k), 0), validos.size)
    if k == 0:
        return np.empty(0, dtype=np.int64), np.empty(0, dtype=np.float64)

    scores = (m[validos] @ q) / (normas[validos] * q_norma)   # O(n·d)
    scores = np.clip(scores, -1.0, 1.0)

    # Selecção O(n): o k-ésimo maior valor é o limiar; quem empata no limiar
    # entra por ordem de índice (a ordenação estável preserva essa ordem).
    limiar = np.partition(scores, scores.size - k)[scores.size - k]
    cand = np.flatnonzero(scores >= limiar)
    ordem = cand[np.argsort(-scores[cand], kind="stable")][:k]
    return validos[ordem], scores[ordem]


# --- testes ---
M = np.array([[1, 0], [0, 1], [1, 1], [0, 0], [2, 0]], dtype=float)
idx, sc = top_k_cosseno([1, 0], M, k=2)
assert idx.tolist() == [0, 4]                  # empate a 1.0: índice menor primeiro
assert np.allclose(sc, [1.0, 1.0])

idx, sc = top_k_cosseno([1, 0], M, k=10)       # k > n: devolve só os válidos
assert idx.tolist() == [0, 4, 2, 1]            # a linha nula (3) fica de fora
assert np.allclose(sc, [1.0, 1.0, 2 ** -0.5, 0.0])

assert top_k_cosseno([1, 0], M, k=0)[0].size == 0
assert top_k_cosseno([1, 0], np.zeros((3, 2)), k=2)[0].size == 0
for mau in ([0, 0], [1, 0, 0], [np.nan, 1]):
    try:
        top_k_cosseno(mau, M, k=1)
        raise AssertionError("devia falhar")
    except ValueError:
        pass

# confronto com força bruta num caso aleatório
rng = np.random.default_rng(7)
X, q = rng.normal(size=(1000, 64)), rng.normal(size=64)
ref = np.argsort(-(X @ q) / (np.linalg.norm(X, axis=1) * np.linalg.norm(q)), kind="stable")[:5]
assert top_k_cosseno(q, X, 5)[0].tolist() == ref.tolist()
print("ok")
` },
      {
        type: 'list',
        items: [
          'Query nula, NaN ou infinito: erro explícito, nunca um ranking silencioso de NaN.',
          'k ≤ 0 devolve vazio; k > n devolve só as linhas válidas, por isso o resultado pode ter menos de k elementos — fica escrito no contrato.',
          'Linhas nulas ficam fora do resultado; em produção conto-as numa métrica, porque são sintoma de ingestão partida.',
          '`np.clip` em [−1, 1]: o arredondamento pode dar 1,0000001 e partir um `arccos` a jusante.',
        ],
      },
      {
        type: 'p',
        text: 'Testo com os casos do enunciado, com os limites (k = 0, matriz toda nula, formas erradas) e com um teste contra a força bruta (`argsort` completo) em dados aleatórios com semente fixa: se a selecção parcial divergir da ordenação total, há um bug.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Normalizar a matriz a cada consulta',
        text: 'Em produção normalizo os embeddings **uma vez, na ingestão**, e guardo-os em `float32`: o cosseno passa a ser só um produto interno e a memória fica em metade da de `float64` (1 milhão × 768 × 4 bytes ≈ 3 GB). Por isso a função não converte `float32` para `float64` — essa cópia duplicaria a memória a cada consulta.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: um lote de consultas (`Q @ M.T` com forma `(b, n)` e selecção por linha com `axis=1`), filtros por metadados aplicados como máscara booleana antes da selecção, e «e com 100 milhões de vectores?» — aí entra um índice ANN (HNSW, IVF) com o recall medido contra esta força bruta, que passa a ser o oráculo dos testes.',
      },
      {
        type: 'refs',
        items: [
          { label: 'NumPy — numpy.partition', url: 'https://numpy.org/doc/stable/reference/generated/numpy.partition.html' },
          { label: 'NumPy — numpy.argsort (kind="stable")', url: 'https://numpy.org/doc/stable/reference/generated/numpy.argsort.html' },
          { label: 'NumPy — numpy.linalg.norm', url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Calcula os scores com um único produto matriz-vector, sem ciclo Python sobre os documentos.',
        'Usa selecção parcial (partition/argpartition) e diz a complexidade O(n) da selecção.',
        'Trata vectores nulos (query e linhas) e k maior do que n sem rebentar nem devolver NaN.',
        'Garante desempate determinístico e explica porque importa para a avaliação.',
        'Testa contra uma implementação de força bruta.',
      ],
      fraco: 'Faz um ciclo `for` sobre as linhas ou ordena tudo com `sorted`, e divide por zero quando aparece uma linha nula.',
      solido: 'Vectoriza, usa `argpartition`, trata vectores nulos e k > n, e testa com o exemplo dado.',
      excelente: 'Acrescenta o desempate estável no limiar, a escolha de `float32` e normalização na ingestão com o custo em memória, um teste de propriedade contra a força bruta e a transição para ANN com recall medido.',
    },
    seguimento: [
      'Como mudas isto para 64 consultas em lote?',
      'Quanta memória ocupa 1 milhão de vectores de 768 dimensões, e como a reduzias?',
      'A partir de que tamanho deixavas a força bruta e passavas a HNSW?',
    ],
    sinaisAlarme: [
      'Ordenar o vector inteiro para tirar 10 sem saber que existe selecção parcial.',
      'Dividir por uma norma zero e não reparar nos NaN no resultado.',
      'Dizer que empates «não acontecem na prática».',
    ],
    modulos: ['embeddings', 'bases-vectoriais'],
  },
  {
    id: 'p-codigo-ao-vivo-02',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'BM25 de raiz com índice invertido',
    enunciado:
      'Implementa BM25 de raiz: tokenização simples, IDF, os parâmetros k1 e b, e uma pesquisa que devolve os k melhores documentos. Sem bibliotecas de pesquisa.',
    contexto:
      'Assinatura: `BM25(docs, k1=1.2, b=0.75)` e `pesquisar(consulta, k) -> list[tuple[int, float]]` com (índice do documento, score). Corpus de ~50 000 artigos de ajuda de um marketplace de entregas, em português (acentos, códigos como «M-Pesa»). A consulta típica tem 3 a 8 termos. Exemplo: com os documentos «Reembolso do pedido em 5 dias úteis», «Pedido atrasado: o estafeta ainda não saiu», «Como pedir reembolso de um pedido cancelado? Reembolso por M-Pesa» e um documento vazio, `pesquisar("reembolso pedido", 3)` devolve os índices `[2, 0, 1]`.',
    minutos: 25,
    dica: 'Se a pesquisa percorre todos os documentos para cada termo, ainda não tens um índice.',
    resposta: [
      {
        type: 'p',
        text: 'Pré-calculo na construção tudo o que não depende da consulta — frequências, comprimentos, comprimento médio, IDF e um **índice invertido** termo → lista de (documento, tf) — e na pesquisa só toco nos documentos que contêm pelo menos um termo. Construção O(total de tokens); consulta O(soma das postings dos termos + m log k) para tirar o top-k de m candidatos com um heap.',
      },
      {
        type: 'p',
        text: 'O score é a soma, por termo da consulta, de `IDF(t) · f·(k1+1) / (f + k1·(1 − b + b·len(d)/avgdl))`. O `k1` controla a saturação da frequência — a terceira ocorrência de «reembolso» vale muito menos do que a primeira — e o `b` controla quanto se penaliza um documento longo. Uso o IDF com +1 dentro do logaritmo, `ln(1 + (N − n + 0,5)/(n + 0,5))`, a variante do Lucene: a fórmula original dá IDF **negativo** a termos que aparecem em mais de metade dos documentos, e um documento desceria por conter um termo da consulta.',
      },
      { type: 'code', lang: 'python', caption: 'BM25 com índice invertido e top-k por heap', code: `import heapq
import math
import re
from collections import Counter, defaultdict

_TOKEN = re.compile(r"\\w+")


def tokenizar(texto: str) -> list[str]:
    """Minúsculas (casefold) e sequências de caracteres de palavra, com acentos."""
    return _TOKEN.findall(texto.casefold())


class BM25:
    def __init__(self, docs: list[str], k1: float = 1.2, b: float = 0.75):
        if k1 < 0 or not 0 <= b <= 1:
            raise ValueError("k1 >= 0 e 0 <= b <= 1")
        self.k1, self.b = k1, b
        self.n = len(docs)
        self.comp: list[int] = []
        self.postings: dict[str, list[tuple[int, int]]] = defaultdict(list)
        for i, doc in enumerate(docs):
            tf = Counter(tokenizar(doc))
            self.comp.append(sum(tf.values()))
            for termo, f in tf.items():
                self.postings[termo].append((i, f))
        self.avgdl = sum(self.comp) / self.n if self.n else 0.0
        # IDF com suavização (+1 dentro do log): nunca negativo, mesmo em termos
        # que aparecem em mais de metade dos documentos.
        self.idf = {
            t: math.log(1 + (self.n - len(p) + 0.5) / (len(p) + 0.5))
            for t, p in self.postings.items()
        }

    def pesquisar(self, consulta: str, k: int = 10) -> list[tuple[int, float]]:
        scores: dict[int, float] = defaultdict(float)
        for termo in set(tokenizar(consulta)):       # cada termo conta uma vez
            idf = self.idf.get(termo)
            if idf is None:
                continue                              # termo fora do vocabulário
            for doc, f in self.postings[termo]:       # só toca em quem tem o termo
                norm = 1 - self.b + self.b * self.comp[doc] / self.avgdl
                scores[doc] += idf * f * (self.k1 + 1) / (f + self.k1 * norm)
        # top-k em O(m log k); desempate determinístico por índice do documento
        return heapq.nsmallest(k, scores.items(), key=lambda x: (-x[1], x[0]))


# --- testes ---
docs = [
    "Reembolso do pedido em 5 dias úteis",
    "Pedido atrasado: o estafeta ainda não saiu",
    "Como pedir reembolso de um pedido cancelado? Reembolso por M-Pesa",
    "",
]
bm = BM25(docs)
assert tokenizar("Úteis, M-Pesa!") == ["úteis", "m", "pesa"]
assert bm.n == 4 and bm.comp[3] == 0

r = bm.pesquisar("reembolso pedido", k=3)
assert [d for d, _ in r] == [2, 0, 1]         # o doc 2 tem «reembolso» duas vezes
assert [round(s, 4) for _, s in r] == [1.0573, 1.0007, 0.34]
assert bm.pesquisar("xpto", k=3) == []        # nenhum termo conhecido
assert bm.pesquisar("REEMBOLSO", k=1)[0][0] == 2
# «pedido» aparece em 3 de 4 documentos: IDF pequeno mas positivo
assert 0 < bm.idf["pedido"] < bm.idf["reembolso"] < bm.idf["estafeta"]
assert BM25([]).pesquisar("x") == []
print("ok")
` },
      {
        type: 'table',
        head: ['Parâmetro', 'Efeito', 'Valor típico'],
        rows: [
          ['k1', 'Saturação da frequência do termo; 0 torna o modelo binário', '1,2 a 2,0'],
          ['b', 'Normalização pelo comprimento; 0 desliga, 1 normaliza por completo', '0,75'],
          ['Tokenização', 'Define o que é um termo: pesa mais no resultado do que k1 e b', 'casefold e `\\w+`; stemming se o eval o justificar'],
        ],
      },
      {
        type: 'list',
        items: [
          'Documento vazio: conta para N e para o avgdl, mas nunca entra nas postings, por isso nunca há divisão por zero dentro do ciclo.',
          'Corpus vazio ou consulta sem termos conhecidos: lista vazia, não excepção.',
          'Termo repetido na consulta conta uma vez (`set`); se o entrevistador quiser peso por repetição, multiplica-se pela frequência na consulta.',
          'Desempate pelo índice do documento, para rankings reprodutíveis.',
        ],
      },
      {
        type: 'p',
        text: 'Testo a ordem num corpus pequeno calculado à mão, a monotonia do IDF (termo raro > termo comum > 0), a invariância a maiúsculas e, para confiança, comparo os scores com uma implementação de referência num corpus de amostra — as diferenças costumam vir da tokenização, não da fórmula.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'A tokenização é metade do BM25',
        text: '`\\w+` parte «M-Pesa» em «m» e «pesa» e não junta «reembolso» com «reembolsos». Em português, stemming leve ou um analisador da língua mexe mais no recall do que afinar k1. Mudo uma coisa de cada vez e meço no conjunto dourado.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: documentos novos (mudam N, avgdl e todos os IDF — ou recalculo em lote, ou aceito a deriva até ao próximo rebuild), BM25F por campos com mais peso no título, e consultas longas onde vale a pena parar cedo (WAND). Em produção usava o BM25 do motor de pesquisa; saber a fórmula é o que deixa diagnosticar porque é que um documento longo nunca aparece.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Robertson e Zaragoza (2009) — The Probabilistic Relevance Framework: BM25 and Beyond', url: 'https://dl.acm.org/doi/10.1561/1500000019' },
          { label: 'Python — heapq', url: 'https://docs.python.org/3/library/heapq.html' },
          { label: 'Python — re (classe \\w e Unicode)', url: 'https://docs.python.org/3/library/re.html' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Escreve a fórmula do BM25 com k1, b, comprimento do documento e avgdl e explica o papel de cada parâmetro.',
        'Constrói um índice invertido e só pontua documentos que contêm termos da consulta.',
        'Usa uma variante de IDF que nunca é negativa e sabe porquê.',
        'Trata corpus vazio, documento vazio e termos fora do vocabulário.',
        'Reconhece que a tokenização e a análise da língua dominam a qualidade.',
      ],
      fraco: 'Calcula TF-IDF simples ou percorre todos os documentos por termo, sem normalização por comprimento.',
      solido: 'Implementa a fórmula correcta com índice invertido, top-k por heap e os casos-limite principais.',
      excelente: 'Acrescenta o problema do IDF negativo, o custo das actualizações incrementais, a tokenização para português como alavanca principal e a validação contra uma implementação de referência.',
    },
    seguimento: [
      'O que acontece aos scores quando adicionas 10 000 documentos novos?',
      'Como darias mais peso ao título do que ao corpo?',
      'Porque é que o BM25 ganha ao denso em consultas com códigos de produto?',
    ],
    sinaisAlarme: [
      'Não saber o que fazem k1 e b.',
      'Percorrer o corpus inteiro por consulta e chamar-lhe índice.',
      'Somar o score do BM25 ao cosseno sem normalizar.',
    ],
    modulos: ['pesquisa-hibrida'],
  },
  {
    id: 'p-codigo-ao-vivo-03',
    tipo: 'codigo',
    nivel: 'pleno',
    titulo: 'Reciprocal Rank Fusion de N listas com desempate determinístico',
    enunciado:
      'Tens N rankings de retrievers diferentes. Escreve a fusão RRF, com pesos opcionais, e garante que o resultado é determinístico — o mesmo input dá sempre a mesma ordem.',
    contexto:
      'Assinatura: `rrf(rankings, k=60, pesos=None, top_n=None) -> list[tuple[doc, score]]`. Cada ranking é uma lista de ids, o melhor primeiro; as listas têm tamanhos diferentes e podem ter duplicados (o retriever lexical devolve dois chunks do mesmo documento depois de mapeados para documento). Os retrievers correm em paralelo e as listas chegam em ordem variável. Exemplo: denso `[d1, d2, d3]`, lexical `[d3, d1, d4]`, grafo `[d4, d3]` → `[d3, d1, d4, d2]`.',
    minutos: 12,
    dica: 'Quando dois documentos têm o mesmo score, o que decide a ordem — e o que garante que o score é mesmo igual?',
    resposta: [
      {
        type: 'p',
        text: 'Uma passagem por todas as listas acumula `w_i / (k + rank)` por documento, com rank a começar em 1, e no fim ordeno por score: O(L log L) para L entradas no total. O que separa esta resposta de uma resposta de cábula é o **desempate**, que defino explicitamente — score, depois a melhor posição em qualquer lista, depois a primeira aparição — em vez de depender da ordem de inserção num dicionário.',
      },
      {
        type: 'p',
        text: 'Há um detalhe numérico: a soma de floats não é associativa, e `1/61 + 1/62 + 1/63` pode diferir no último bit de `1/63 + 1/61 + 1/62`. Como as listas chegam em ordem variável, dois documentos empatados de verdade podiam deixar de comparar iguais e trocar de posição entre corridas. Guardo as contribuições e somo com `math.fsum`, que é correctamente arredondado e por isso não depende da ordem.',
      },
      { type: 'code', lang: 'python', caption: 'RRF com pesos, duplicados e desempate determinístico', code: `import math
from collections.abc import Hashable, Sequence


def rrf(
    rankings: Sequence[Sequence[Hashable]],
    k: int = 60,
    pesos: Sequence[float] | None = None,
    top_n: int | None = None,
) -> list[tuple[Hashable, float]]:
    """Reciprocal Rank Fusion: score(d) = soma_i w_i / (k + rank_i(d)), rank a começar em 1.

    Desempate determinístico: score desc, melhor posição desc, primeira aparição.
    """
    if k < 0:
        raise ValueError("k tem de ser >= 0")
    pesos = [1.0] * len(rankings) if pesos is None else list(pesos)
    if len(pesos) != len(rankings):
        raise ValueError("um peso por lista")

    contrib: dict[Hashable, list[float]] = {}
    melhor: dict[Hashable, int] = {}
    primeira: dict[Hashable, tuple[int, int]] = {}
    for i, (lista, w) in enumerate(zip(rankings, pesos)):
        vistos = set()
        for rank, doc in enumerate(lista, start=1):
            if doc in vistos:              # duplicado na mesma lista: conta a 1.ª vez
                continue
            vistos.add(doc)
            contrib.setdefault(doc, []).append(w / (k + rank))
            melhor[doc] = min(melhor.get(doc, rank), rank)
            primeira.setdefault(doc, (i, rank))

    # math.fsum é exacto até ao arredondamento final: a ordem das listas não
    # muda o score, por isso empates verdadeiros comparam como iguais.
    score = {d: math.fsum(c) for d, c in contrib.items()}
    ordem = sorted(score, key=lambda d: (-score[d], melhor[d], primeira[d]))
    if top_n is not None:
        ordem = ordem[:top_n]
    return [(d, score[d]) for d in ordem]


# --- testes ---
denso = ["d1", "d2", "d3"]
lexical = ["d3", "d1", "d4"]
grafo = ["d4", "d3"]
r = rrf([denso, lexical, grafo])
assert [d for d, _ in r] == ["d3", "d1", "d4", "d2"]
assert math.isclose(r[0][1], 1 / 63 + 1 / 61 + 1 / 62)

# empate exacto: d1 e d2 trocam de posição nas duas listas -> mesmo score;
# desempata pela melhor posição (ambos 1) e depois pela primeira aparição.
r = rrf([["d1", "d2"], ["d2", "d1"]])
assert r[0][1] == r[1][1] and [d for d, _ in r] == ["d1", "d2"]
assert [d for d, _ in rrf([["d2", "d1"], ["d1", "d2"]])] == ["d2", "d1"]

# a ordem das listas não muda os scores
a = dict(rrf([denso, lexical, grafo]))
b = dict(rrf([grafo, denso, lexical]))
assert a == b

# duplicado ignorado; «y» mantém a posição original (3)
assert rrf([["x", "x", "y"]]) == [("x", 1 / 61), ("y", 1 / 63)]
assert rrf([]) == [] and rrf([[], []]) == []
assert [d for d, _ in rrf([denso, lexical], pesos=[1.0, 0.0])] == ["d1", "d2", "d3", "d4"]
assert len(rrf([denso, lexical, grafo], top_n=2)) == 2
print("ok")
` },
      {
        type: 'list',
        items: [
          'Duplicado na mesma lista: conta só a primeira ocorrência, com a sua posição original — senão um retriever que devolve três chunks do mesmo documento vota três vezes.',
          'Nenhuma lista ou listas vazias: resultado vazio.',
          'Peso 0 desliga um retriever sem mudar código, útil para ablações.',
          'k = 0 é permitido (fica 1/rank); k negativo não, porque com k = −1 o primeiro lugar divide por zero.',
        ],
      },
      {
        type: 'p',
        text: 'Testo a ordem num exemplo calculado à mão, a invariância à ordem das listas (dicionários de scores iguais), o empate exacto resolvido pela primeira aparição, a regra do duplicado e o peso zero.',
      },
      {
        type: 'callout',
        tone: 'tip',
        title: 'Os empates não são raros',
        text: 'Com duas listas, quaisquer dois documentos em posições trocadas (2.º e 5.º contra 5.º e 2.º) empatam exactamente. Num conjunto dourado de algumas centenas de consultas, um desempate não determinístico chega para o MRR oscilar entre corridas e te convencer de que uma alteração ajudou.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: truncar cada lista a um tamanho fixo antes de fundir (listas de 1000 resultados dão peso à cauda), devolver de que listas veio cada documento para depuração, e normalizar os pesos para os comparar entre configurações.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Cormack, Clarke e Büttcher (2009) — Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods', url: 'https://dl.acm.org/doi/10.1145/1571941.1572114' },
          { label: 'Python — math.fsum', url: 'https://docs.python.org/3/library/math.html#math.fsum' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Usa 1/(k + rank) com rank a começar em 1 e k = 60 por omissão.',
        'Define um desempate explícito e determinístico.',
        'Trata duplicados dentro da mesma lista.',
        'Menciona que a ordem da soma de floats pode quebrar empates e resolve-o (fsum, arredondamento ou inteiros).',
        'Testa a invariância à ordem das listas.',
      ],
      fraco: 'Usa rank a começar em 0 sem dar por isso, ou soma scores brutos dos retrievers em vez de posições.',
      solido: 'Implementa RRF correcto com pesos, trata duplicados e ordena com uma chave de desempate.',
      excelente: 'Acrescenta a não-associatividade da soma de floats, a ligação entre desempate e estabilidade das métricas de avaliação, e o truncamento das listas antes da fusão.',
    },
    seguimento: [
      'O que acontece se um retriever devolver 5 resultados e outro 500?',
      'Como escolherias os pesos sem conjunto dourado?',
      'Onde metes o re-ranker depois da fusão e com quantos candidatos?',
    ],
    sinaisAlarme: [
      'Deixar a ordem dos empates ao acaso do dicionário ou do paralelismo.',
      'Somar scores de cosseno e BM25 e chamar-lhe RRF.',
      'Não saber de onde vem o k = 60.',
    ],
    modulos: ['pesquisa-hibrida', 'rag-avancado'],
  },
  {
    id: 'p-codigo-ao-vivo-04',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'Chunker recursivo com sobreposição que não parte palavras',
    enunciado:
      'Escreve um chunker recursivo: tenta partir por parágrafos, depois por linhas, depois por frases, depois por espaços. Cada chunk tem tamanho máximo e há sobreposição entre chunks consecutivos. Nunca pode partir uma palavra a meio.',
    contexto:
      'Assinatura: `chunk_recursivo(texto, maximo, sobreposicao=0, separadores=("\\n\\n", "\\n", ". ", " "), comp=len) -> list[str]`. `comp` mede o tamanho: caracteres por omissão, mas tem de aceitar um contador de tokens. Documentos de políticas de 2 a 40 páginas. Exemplo: um título curto num parágrafo e um parágrafo de três frases, com `maximo=60` e `sobreposicao=15` → o título sai sozinho, as frases saem agrupadas até 60 caracteres e o início de um chunk repete o fim do anterior quando cabe.',
    minutos: 25,
    dica: 'Separa duas fases: partir em peças que cabem, e juntar peças até ao máximo.',
    resposta: [
      {
        type: 'p',
        text: 'Duas fases. **Partir**: pelo separador mais forte que existe no texto; cada parte que cabe fica como peça, e só a parte que não cabe desce para o separador seguinte. **Juntar**: agrupo peças consecutivas do mesmo nível até ao máximo e, quando fecho um chunk, o seguinte começa com a cauda do anterior até `sobreposicao`. Como o último separador é o espaço, a unidade mínima é a palavra. Partir é O(n·s) para s separadores; juntar recalcula o tamanho do chunk corrente, O(c²) por chunk de c peças, aceitável para chunks de centenas de tokens.',
      },
      {
        type: 'p',
        text: 'Dois detalhes que costumam falhar ao vivo. O separador fica **colado à peça** (`"frase. "`), por isso `"".join` reconstrói o texto exacto — e meço o tamanho sem o espaço final, senão `"a "` mais `"b "` conta 4 e não cabe em 3. E junto peças **só dentro do mesmo nível**: numa lista plana, o título colava-se às primeiras palavras do parágrafo seguinte, que é exactamente a fronteira que o chunker recursivo devia respeitar.',
      },
      { type: 'code', lang: 'python', caption: 'Chunker recursivo por separadores, com sobreposição e comprimento injectável', code: `from collections import deque
from collections.abc import Callable, Sequence

SEPARADORES = ("\\n\\n", "\\n", ". ", " ")


def _partir_mantendo(texto: str, sep: str) -> list[str]:
    """Parte por \`sep\` e cola o separador ao pedaço anterior ("".join reconstrói o texto)."""
    partes = texto.split(sep)
    out = [p + sep for p in partes[:-1]] + [partes[-1]]
    return [p for p in out if p]


def _juntar(pecas: list[str], maximo: int, sobrep: int, medir: Callable[[str], int]) -> list[str]:
    """Junta peças pequenas até \`maximo\`; cada chunk novo herda a cauda do anterior."""
    chunks: list[str] = []
    atual: deque[str] = deque()
    for p in pecas:
        if atual and medir("".join(atual) + p) > maximo:
            chunks.append("".join(atual))
            # guarda a cauda (até \`sobrep\`) que ainda deixa caber a peça nova
            while atual and (medir("".join(atual)) > sobrep or medir("".join(atual) + p) > maximo):
                atual.popleft()
        atual.append(p)
    if atual:
        chunks.append("".join(atual))
    return chunks


def _dividir(texto: str, seps: Sequence[str], maximo: int, sobrep: int,
             medir: Callable[[str], int]) -> list[str]:
    if medir(texto) <= maximo:
        return [texto]
    for i, sep in enumerate(seps):
        if sep not in texto:
            continue
        out: list[str] = []
        boas: list[str] = []
        for parte in _partir_mantendo(texto, sep):
            if medir(parte) <= maximo:
                boas.append(parte)
                continue
            if boas:                      # fecha o que já estava junto a este nível
                out.extend(_juntar(boas, maximo, sobrep, medir))
                boas = []
            out.extend(_dividir(parte, seps[i + 1:], maximo, sobrep, medir))
        if boas:
            out.extend(_juntar(boas, maximo, sobrep, medir))
        return out
    return [texto]        # uma palavra maior do que o máximo: fica inteira, sozinha


def chunk_recursivo(
    texto: str,
    maximo: int,
    sobreposicao: int = 0,
    separadores: Sequence[str] = SEPARADORES,
    comp: Callable[[str], int] = len,
) -> list[str]:
    """Parte pelo separador mais forte que exista; só desce de nível no pedaço que não cabe."""
    if maximo <= 0 or not 0 <= sobreposicao < maximo:
        raise ValueError("maximo > 0 e 0 <= sobreposicao < maximo")
    if not separadores or separadores[-1] != " ":
        raise ValueError("o último separador tem de ser o espaço (garante que não se partem palavras)")
    def medir(s: str) -> int:             # o separador colado no fim não conta
        return comp(s.strip())

    chunks = _dividir(texto, separadores, maximo, sobreposicao, medir)
    return [c.strip() for c in chunks if c.strip()]


# --- testes ---
txt = (
    "Política de reembolsos do Chega.\\n\\n"
    "Pedidos cancelados antes da recolha são reembolsados por inteiro. "
    "Depois da recolha, só a taxa de entrega é devolvida.\\n"
    "O prazo é de 5 dias úteis para M-Pesa e 10 para cartão."
)
cs = chunk_recursivo(txt, maximo=60, sobreposicao=15)
assert cs == [
    "Política de reembolsos do Chega.",
    "Pedidos cancelados antes da recolha são reembolsados por",
    "por inteiro.",                      # «por» repetido: sobreposição de 15 caracteres
    "Depois da recolha, só a taxa de entrega é devolvida.",
    "O prazo é de 5 dias úteis para M-Pesa e 10 para cartão.",
]
palavras = set(txt.split())
assert all(len(c) <= 60 for c in cs)
assert all(p in palavras for c in cs for p in c.split())            # nenhuma palavra partida
# cobertura: nenhuma palavra do texto se perde
assert {p for c in cs for p in c.split()} == palavras

assert chunk_recursivo("supercalifragilístico curto", maximo=10) == ["supercalifragilístico", "curto"]
assert chunk_recursivo("", maximo=10) == []
assert chunk_recursivo("a b c d e f", maximo=3) == ["a b", "c d", "e f"]
assert chunk_recursivo("a b c d e f", maximo=5, sobreposicao=2) == ["a b c", "c d e", "e f"]
# comprimento injectável (p. ex. tokens aproximados por palavras)
assert chunk_recursivo("um dois três quatro cinco", 2, comp=lambda s: len(s.split())) == [
    "um dois", "três quatro", "cinco"]
print("ok")
` },
      {
        type: 'list',
        items: [
          'Palavra maior do que o máximo (um URL, um hash): sai inteira, num chunk acima do limite. A alternativa é parti-la à força e marcar o chunk — combino com o entrevistador, porque o enunciado proíbe partir.',
          '`sobreposicao >= maximo` é erro: o chunk seguinte nunca avançaria.',
          'Texto vazio ou só espaços: lista vazia.',
          'A sobreposição é feita de peças inteiras, por isso pode ficar abaixo do pedido, nunca acima.',
        ],
      },
      {
        type: 'p',
        text: 'Os asserts verificam invariantes e não só um exemplo: todo o chunk cabe no máximo, toda a palavra de cada chunk existe no texto original (nenhuma foi partida) e nenhuma palavra se perde. Num projecto real juntava testes de propriedade com Hypothesis sobre texto aleatório para estas três propriedades.',
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Caracteres não são tokens',
        text: 'Com `comp=len`, 1000 caracteres de português dão da ordem de 250 a 400 tokens, conforme o tokenizador. Se o limite real é o do modelo de embeddings, injecto o contador de tokens desse modelo em `comp` — é por isso que é um parâmetro.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: guardar o offset de início de cada chunk no documento (para citações e para destacar o excerto na interface), separadores próprios para Markdown ou código, e herdar metadados como o título da secção em cada chunk.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — text splitters', url: 'https://docs.langchain.com/oss/python/integrations/splitters/index' },
          { label: 'Python — collections.deque', url: 'https://docs.python.org/3/library/collections.html#collections.deque' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Separa a fase de partir da fase de juntar e explica a recursão por separadores.',
        'Só desce de separador na parte que não cabe, e junta peças dentro do mesmo nível.',
        'Implementa a sobreposição sem ultrapassar o máximo e valida sobreposicao < maximo.',
        'Garante que nenhuma palavra é partida e diz o que faz com palavras maiores do que o máximo.',
        'Torna a medida de tamanho injectável e distingue caracteres de tokens.',
      ],
      fraco: 'Corta o texto em fatias fixas de N caracteres, partindo palavras, ou entra em recursão infinita quando não há separador.',
      solido: 'Implementa partir e juntar com sobreposição, respeita palavras e trata os casos-limite principais.',
      excelente: 'Acrescenta a junção por nível (fronteiras de parágrafo preservadas), a medida sem o separador final, testes por invariantes e a ligação ao contador de tokens do modelo de embeddings.',
    },
    seguimento: [
      'Como guardavas o offset de cada chunk para citar a fonte?',
      'Que sobreposição escolhias e como a validavas no conjunto dourado?',
      'O que mudavas para documentos em Markdown com tabelas?',
    ],
    sinaisAlarme: [
      'Cortar por número fixo de caracteres e chamar-lhe recursivo.',
      'Não testar o caso de uma palavra maior do que o máximo.',
      'Escolher o tamanho do chunk sem falar em medir.',
    ],
    modulos: ['ingestao-chunking'],
  },
  {
    id: 'p-codigo-ao-vivo-05',
    tipo: 'codigo',
    nivel: 'senior',
    titulo: 'recall@k, MRR e nDCG@k com relevância graduada',
    enunciado:
      'Tens um ficheiro de julgamentos de relevância graduados de 0 a 3 e os rankings do teu retriever por consulta. Implementa recall@k, MRR e nDCG@k e a média sobre o conjunto. E diz-me que decisões tomaste.',
    contexto:
      'Assinaturas: `recall_at_k(ranking, qrels, k)`, `reciprocal_rank(ranking, qrels, k=None)`, `ndcg_at_k(ranking, qrels, k)` e `avaliar(runs, qrels, k) -> dict`. `qrels` é `{consulta: {doc: grau}}`; `runs` é `{consulta: [docs]}`. 400 consultas, k = 5 ou 10; algumas consultas não têm nenhum documento relevante, e o sistema falhou (timeout) em algumas. Exemplo: ranking `[a, b, c, d]` com julgamentos `{b: 3, d: 1, e: 2}` → recall@3 = 1/3, RR = 0,5, nDCG@3 ≈ 0,4702.',
    minutos: 20,
    dica: 'O IDCG vem dos julgamentos, não do ranking.',
    resposta: [
      {
        type: 'p',
        text: 'Cada métrica é uma passagem pelo top-k — O(k) por consulta, mais O(R log R) para ordenar os R julgamentos no IDCG. O código é curto; o que se avalia são **as decisões**: o que conta como relevante (grau > 0), o que fazer a consultas sem relevantes, a documentos não julgados, a duplicados no ranking e a consultas que o sistema não respondeu.',
      },
      {
        type: 'p',
        text: 'O nDCG@k é `DCG@k / IDCG@k`, com DCG igual à soma de `(2^g − 1) / log2(posição + 1)`, posição a começar em 1. O IDCG é o DCG da **ordenação ideal dos julgamentos**, cortada a k — não o DCG do próprio ranking reordenado, erro que dá nDCG = 1 a um sistema que só recuperou um documento fraco. O recall@k é a fracção dos relevantes no top-k; o RR é 1/posição do primeiro relevante e o MRR é a média dos RR.',
      },
      { type: 'code', lang: 'python', caption: 'Métricas de recuperação com julgamentos graduados', code: `import math
from collections.abc import Mapping, Sequence

Qrels = Mapping[str, int]          # doc -> grau de relevância (0 = irrelevante)


def _dedup(ranking: Sequence[str]) -> list[str]:
    return list(dict.fromkeys(ranking))           # mantém a 1.ª ocorrência


def recall_at_k(ranking: Sequence[str], qrels: Qrels, k: int) -> float | None:
    relevantes = {d for d, g in qrels.items() if g > 0}
    if not relevantes:
        return None                               # indefinido: fica fora da média
    return len(relevantes.intersection(_dedup(ranking)[:k])) / len(relevantes)


def reciprocal_rank(ranking: Sequence[str], qrels: Qrels, k: int | None = None) -> float | None:
    if not any(g > 0 for g in qrels.values()):
        return None
    for pos, doc in enumerate(_dedup(ranking)[:k], start=1):
        if qrels.get(doc, 0) > 0:
            return 1.0 / pos
    return 0.0


def _dcg(ganhos: Sequence[int]) -> float:
    # ganho exponencial (2^g - 1) e desconto log2(posição + 1), posição a começar em 1
    return sum((2 ** g - 1) / math.log2(i + 2) for i, g in enumerate(ganhos))


def ndcg_at_k(ranking: Sequence[str], qrels: Qrels, k: int) -> float | None:
    ideal = sorted((g for g in qrels.values() if g > 0), reverse=True)[:k]
    if not ideal:
        return None
    obtido = [qrels.get(d, 0) for d in _dedup(ranking)[:k]]   # não julgado = 0
    return _dcg(obtido) / _dcg(ideal)


def avaliar(runs: Mapping[str, Sequence[str]], qrels: Mapping[str, Qrels], k: int) -> dict:
    """Média por consulta julgada. Consulta sem run conta como ranking vazio (0), não é ignorada."""
    soma = {"recall": 0.0, "mrr": 0.0, "ndcg": 0.0}
    n = 0
    for q, julg in qrels.items():
        r = runs.get(q, [])
        rec, rr, nd = recall_at_k(r, julg, k), reciprocal_rank(r, julg, k), ndcg_at_k(r, julg, k)
        if rec is None:
            continue
        n += 1
        soma["recall"] += rec
        soma["mrr"] += rr
        soma["ndcg"] += nd
    return {m: (v / n if n else float("nan")) for m, v in soma.items()} | {"n": n}


# --- testes ---
julg = {"b": 3, "d": 1, "e": 2, "z": 0}
rank = ["a", "b", "c", "d", "b"]                  # «b» repetido no fim
assert recall_at_k(rank, julg, 3) == 1 / 3
assert recall_at_k(rank, julg, 10) == 2 / 3       # «e» nunca foi recuperado
assert reciprocal_rank(rank, julg) == 0.5
assert reciprocal_rank(rank, julg, k=1) == 0.0
# DCG@3 = 7/log2(3) = 4.4165 ; IDCG@3 = 7/1 + 3/log2(3) + 1/2 = 9.3928
assert round(ndcg_at_k(rank, julg, 3), 4) == 0.4702
assert ndcg_at_k(["b", "e", "d"], julg, 3) == 1.0  # ordem ideal
assert recall_at_k(rank, {"z": 0}, 5) is None      # sem relevantes: indefinido

runs = {"q1": rank, "q2": ["x", "y"]}
qrels = {"q1": julg, "q2": {"y": 1}, "q3": {"w": 2}, "q4": {"v": 0}}
m = avaliar(runs, qrels, k=3)
assert m["n"] == 3                                  # q4 sem relevantes fica fora
assert round(m["recall"], 4) == round((1 / 3 + 1 + 0) / 3, 4)
assert round(m["mrr"], 4) == round((0.5 + 0.5 + 0) / 3, 4)
assert round(m["ndcg"], 4) == 0.367               # (0.4702 + 0.6309 + 0) / 3
print({k_: round(v, 4) for k_, v in m.items()})
# {'recall': 0.4444, 'mrr': 0.3333, 'ndcg': 0.367, 'n': 3}
` },
      {
        type: 'table',
        head: ['Decisão', 'Escolha', 'Porquê'],
        rows: [
          ['Consulta sem nenhum relevante', 'Fica fora da média (None)', 'Recall e nDCG não estão definidos; contá-la como 0 ou 1 enviesa a média'],
          ['Consulta sem ranking (timeout)', 'Conta como ranking vazio, ou seja 0', 'Ignorá-la esconde as falhas do sistema'],
          ['Documento não julgado', 'Grau 0', 'Hipótese padrão; com julgamentos incompletos penaliza sistemas novos'],
          ['Duplicado no ranking', 'Fica a primeira ocorrência', 'Senão o mesmo documento soma ganho duas vezes'],
          ['Ganho', 'Exponencial, 2^g − 1', 'Dá mais peso ao grau 3; com ganho linear o número é outro'],
        ],
      },
      {
        type: 'p',
        text: 'Testo com valores calculados à mão (estão nos comentários), a ordem ideal a dar exactamente 1,0 e o caso sem relevantes. Para confiança, comparo com o `ndcg_score` do scikit-learn, que usa o grau directamente como ganho — passo-lhe os ganhos já transformados em `2^g − 1` para as duas contas coincidirem.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Médias que não se comparam',
        text: 'Dois relatórios com nDCG@10 diferentes podem diferir só no ganho, no tratamento das consultas sem relevantes ou no k. Escrevo as decisões no cabeçalho do relatório e reporto um intervalo de confiança por bootstrap sobre as consultas: com 400 consultas, uma diferença de 1 ou 2 pontos pode estar dentro do ruído, e o bootstrap diz-te se está.',
      },
      {
        type: 'p',
        text: 'Extensões prováveis: precision@k e MAP, métricas ao nível do chunk em vez do documento, e um teste pareado entre dois sistemas (bootstrap ou permutação sobre as mesmas consultas).',
      },
      {
        type: 'refs',
        items: [
          { label: 'Järvelin e Kekäläinen (2002) — Cumulated gain-based evaluation of IR techniques', url: 'https://dl.acm.org/doi/10.1145/582415.582418' },
          { label: 'scikit-learn — sklearn.metrics.ndcg_score', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Calcula o IDCG a partir dos julgamentos ordenados, não do ranking.',
        'Escreve o desconto log2(posição + 1) com posição a começar em 1.',
        'Decide explicitamente o que fazer com consultas sem relevantes e com consultas sem resposta.',
        'Trata duplicados e documentos não julgados.',
        'Menciona que a escolha de ganho (linear ou exponencial) muda o número e tem de ser reportada.',
      ],
      fraco: 'Confunde recall com precisão, ou calcula o IDCG reordenando o próprio ranking.',
      solido: 'Implementa as três métricas correctamente com graus e explica as decisões principais.',
      excelente: 'Acrescenta a diferença entre ignorar e zerar consultas falhadas, a escolha de ganho, a validação contra uma biblioteca e intervalos de confiança para comparar sistemas.',
    },
    seguimento: [
      'Quando é que o MRR é a métrica certa e o recall@10 engana?',
      'Como lidas com julgamentos incompletos quando o sistema novo recupera documentos nunca julgados?',
      'Que tamanho de conjunto precisas para detectar uma melhoria de 2 pontos?',
    ],
    sinaisAlarme: [
      'Excluir em silêncio as consultas em que o sistema falhou.',
      'Não saber dizer o que é o IDCG.',
      'Comparar dois números de nDCG calculados com ganhos diferentes.',
    ],
    modulos: ['avaliar-rag', 'avaliacao-fundamentos'],
  },
];
