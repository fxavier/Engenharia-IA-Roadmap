import type { Module } from '../types';

export const m20: Module = {
  id: 'avaliacao-fundamentos',
  number: 20,
  part: 'avaliacao',
  title: 'Avaliação: porque e como',
  subtitle:
    'O mesmo sistema dá 0,77 numa corrida e 0,87 na seguinte. Asserções, conjunto dourado, avaliação humana e online; como se constrói, versiona e lê um conjunto dourado; intervalos de confiança por bootstrap; e análise de erros a partir dos casos, não da média',
  icon: '📊',
  minutes: 95,
  tags: ['eval', 'golden set', 'bootstrap', 'análise de erros', 'eval-driven', 'gate'],
  goals: [
    'Explicar porque é que um sistema LLM exige avaliação estatística: não-determinismo, espaço de entradas aberto e regressões que melhoram a média e pioram uma intenção.',
    'Escolher o tipo de avaliação certo para cada propriedade — asserção determinista, conjunto dourado com referência, revisão humana, sinais online — e ligar cada métrica de sistema a uma métrica de negócio.',
    'Construir um conjunto dourado estratificado por intenção e tipo de caso, com fontes rastreáveis, versionado no repositório e revisto pelo suporte (adr-0018).',
    'Calcular e ler intervalos de confiança por bootstrap, incluindo a diferença emparelhada entre duas versões, e decidir o tamanho do conjunto a partir do erro padrão.',
    'Fazer análise de erros a partir dos casos falhados e dos traços, e transformar cada falha real num caso novo: eval-driven development.',
  ],

  sections: [
    /* ================================================================ 1 */
    {
      id: 'porque-avaliar',
      title: 'Porque «parece bem» não é uma métrica',
      blocks: [
        {
          type: 'p',
          text:
            'Num serviço determinista, um teste unitário com uma entrada e uma saída esperada chega para fixar um comportamento. Num sistema LLM falham as três premissas desse teste: a saída varia entre execuções (amostragem, versões do modelo, ordem de chunks empatados), o espaço de entradas é linguagem natural sem fronteira, e a «saída esperada» raramente é uma string — é um conjunto de respostas aceitáveis. Avaliar é medir uma **taxa** sobre uma **amostra** de entradas e saber quanto essa taxa pode estar errada.',
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliacao-fundamentos-01',
            title: 'A mesma versão, cinco corridas, cinco números',
            brief:
              'Primeiro, o mesmo vector de logits amostrado com temperatura 0 e 1. Depois, uma simulação: 30 perguntas, cada uma com uma probabilidade fixa de ser bem respondida (média 0,81), avaliadas cinco vezes. Nada mudou no sistema entre corridas.',
            code: String.raw`import numpy as np
import balcao as b

# 1. O mesmo prompt, a mesma distribuição, saídas diferentes
for t in (0.0, 1.0):
    saidas = [b.amostrar(b.LOGITS_EXEMPLO, temperatura=t, seed=s)[0].strip() for s in range(8)]
    print(f"temperatura {t}: {saidas}")

# 2. A mesma versão do sistema avaliada 5 vezes nas 30 perguntas douradas.
#    Cada pergunta tem uma probabilidade própria de ser bem respondida (fixa).
rng = np.random.default_rng(7)
p_acerto = rng.uniform(0.6, 1.0, size=len(b.PERGUNTAS))
print(f"taxa de acerto esperada: {p_acerto.mean():.3f}")
for corrida in range(5):
    acertos = rng.random(len(p_acerto)) < p_acerto
    print(f"corrida {corrida + 1}: {acertos.sum()}/30 = {acertos.mean():.3f}")`,
            expected: String.raw`temperatura 0.0: ['caminho', 'caminho', 'caminho', 'caminho', 'caminho', 'caminho', 'caminho', 'caminho']
temperatura 1.0: ['ser', 'caminho', 'caminho', 'caminho', 'preparar', 'chegar', 'caminho', 'ser']
taxa de acerto esperada: 0.808
corrida 1: 26/30 = 0.867
corrida 2: 25/30 = 0.833
corrida 3: 23/30 = 0.767
corrida 4: 23/30 = 0.767
corrida 5: 26/30 = 0.867`,
          },
        },
        {
          type: 'p',
          text:
            'Dez pontos de diferença entre a corrida 3 e a corrida 5, com o mesmo sistema. Se a corrida 3 fosse a da versão em produção e a corrida 5 a de um prompt novo, alguém escreveria no pull request «melhora 10 pontos». Temperatura 0 não resolve: reduz a variação da amostragem, mas não a das versões do modelo, do empate entre chunks nem, sobretudo, a da amostra de perguntas — 30 perguntas são uma amostra pequena de tudo o que os clientes escrevem.',
        },
        {
          type: 'compare',
          left: {
            title: 'Testes (pytest)',
            items: [
              'Propriedade verdadeira ou falsa para uma entrada.',
              'Um falhanço é um bug; o conjunto passa a 100%.',
              'Determinista: corre igual em qualquer máquina.',
              'Ex.: `emitir_reembolso` recusa 2 910 MZN; o esquema de ferramenta não aceita `cliente_id`.',
            ],
          },
          right: {
            title: 'Evals',
            items: [
              'Taxa sobre uma amostra de entradas, com incerteza.',
              'Nenhum sistema real passa a 100%; decide-se por limiar e por comparação.',
              'Variância entre corridas, versões e amostras.',
              'Ex.: correcção ≥ 85% nas 240 perguntas douradas; recusa correcta ≥ 90% nas 40 fora de âmbito.',
            ],
          },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O erro clássico: o vibe check de cinco perguntas',
          text:
            'Mudar o prompt, fazer cinco perguntas no playground, gostar das respostas e fazer merge. Cinco perguntas não medem nada (o intervalo de confiança de uma taxa com n = 5 cobre quase todo o intervalo de 0 a 1), são escolhidas por quem fez a mudança e esquecem as intenções que não estavam na cabeça dele. É exactamente o cenário de RI-04: melhora a média do que se viu, piora a intenção que ninguém testou.',
        },
        { type: 'adr', ref: 'adr-0018' },
        {
          type: 'p',
          text:
            'A solução do «Balcão» é tratar a avaliação como os testes são tratados: vive no repositório, corre em cada pull request com o modelo simulado, corre à noite com o modelo real e o juiz, e bloqueia o merge quando uma métrica por intenção cai abaixo do limiar. O resto do módulo é como se constrói cada peça; o módulo 28 põe-nas no pipeline.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — definir critérios de sucesso e construir avaliações', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests' },
            { label: 'OpenAI — evals', url: 'https://platform.openai.com/docs/guides/evals' },
            { label: 'Miller — Adding Error Bars to Evals (2024)', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
    },

    /* ================================================================ 2 */
    {
      id: 'tipos-avaliacao',
      title: 'Tipos de avaliação: asserções, conjunto dourado, humana e online',
      blocks: [
        {
          type: 'p',
          text:
            'Não há uma avaliação; há camadas, cada uma a medir o que as outras não conseguem, com custos muito diferentes. A regra de desenho é usar a mais barata que mede a propriedade: se uma asserção determinista chega, um juiz LLM é pior (mais caro, mais lento, com variância própria).',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'As camadas de avaliação do «Balcão»',
            caption:
              'De baixo para cima: mais cara, mais lenta, mais próxima do que o negócio sente. As asserções correm em cada commit; a revisão humana, uma vez por semana.',
            cols: 5,
            rows: 4,
            zones: [
              { id: 'z-ci', label: 'Em cada pull request', col: 0, row: 2, colSpan: 5, rowSpan: 2, tone: 'ci' },
              { id: 'z-noite', label: 'Todas as noites', col: 0, row: 1, colSpan: 5, rowSpan: 1, tone: 'async' },
              { id: 'z-prod', label: 'Em produção', col: 0, row: 0, colSpan: 5, rowSpan: 1, tone: 'edge' },
            ],
            nodes: [
              { id: 'online', label: 'Sinais online', sub: 'resolução em 48 h, polegares, escaladas', col: 0, row: 0, span: 2, kind: 'user' },
              { id: 'humana', label: 'Revisão humana', sub: '100 conversas por semana', col: 3, row: 0, span: 2, kind: 'user' },
              { id: 'juiz', label: 'Conjunto dourado + juiz', sub: 'modelo real, correcção e fidelidade', col: 0, row: 1, span: 5, kind: 'model' },
              { id: 'dourado', label: 'Conjunto dourado com simulado', sub: 'recall, ferramentas, recusa, red team', col: 0, row: 2, span: 5, kind: 'data' },
              { id: 'assert', label: 'Asserções e testes', sub: 'citação válida, ferramenta proibida, limites', col: 0, row: 3, span: 5, kind: 'service' },
            ],
            edges: [
              { from: 'humana', to: 'juiz', label: 'calibra (kappa)', style: 'dashed' },
              { from: 'online', to: 'dourado', label: 'falhas reais viram casos', style: 'dashed' },
            ],
          },
        },
        {
          type: 'table',
          head: ['Tipo', 'Mede bem', 'Custo e cadência', 'Limite'],
          rows: [
            ['Asserção determinista', 'Formato, citação existente e pública, ferramenta proibida não chamada, valor igual ao calculado, recusa quando não há contexto', 'Milissegundos; em cada commit', 'Não mede se a resposta é útil nem se está certa em texto livre'],
            ['Conjunto dourado com referência', 'Recuperação (recall, MRR), escolha de ferramentas, recusas, red team; correcção contra a resposta de referência', 'Segundos com o simulado (68 casos em 1,4 s no laboratório); minutos e dinheiro com o modelo real', 'Só mede o que está no conjunto; envelhece'],
            ['Juiz LLM', 'Correcção e fidelidade de texto livre, tom', '240 julgamentos por noite no escalão grande', 'Só vale depois de calibrado contra humanos (módulo 22)'],
            ['Revisão humana', 'Tudo, incluindo o que ninguém pensou medir', '100 conversas por semana pelo suporte', 'Lenta, cara, difícil de repetir igual'],
            ['Online', 'O efeito real: resolução, recontacto, satisfação, dinheiro mal devolvido', 'Contínuo', 'Chega depois do deploy; confunde causas'],
          ],
        },
        {
          type: 'table',
          head: ['Métrica de negócio (METRICAS)', 'Métrica de sistema que a antecipa', 'Camada'],
          rows: [
            ['Conversas resolvidas sem humano (≥ 68%)', 'Resolução por intenção no conjunto dourado; acerto de ferramentas', 'Dourado + online'],
            ['Respostas erradas (< 2%)', 'Faithfulness e correcção; citação válida', 'Juiz + asserções + revisão humana'],
            ['Dinheiro mal devolvido (< 0,5%)', 'Nenhuma escrita acima da política; red team inofensivo = 100%', 'Asserções + dourado'],
            ['Custo por conversa (< 1,00 MZN)', 'Tokens e chamadas por caso na corrida de avaliação', 'Dourado'],
            ['Satisfação (≥ 4,2 em 5)', 'Tom e utilidade', 'Revisão humana + online'],
          ],
          caption: 'Uma métrica de sistema sem métrica de negócio por cima é vaidade; uma de negócio sem nenhuma de sistema por baixo só avisa depois do estrago.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Asserções deterministas como testes: correm sem modelo e sem rede, e são a primeira camada do gate. Extracto no espírito de `tests/test_guardas.py`.',
          code: String.raw`from balcao.guardas import validar_saida

def test_citacao_de_documento_interno_e_removida() -> None:
    permitidas = {"pol-reembolso": {"publico": "cliente", "vigente": True},
                  "int-fraude-sinais": {"publico": "interno", "vigente": True}}
    r = validar_saida("Reembolsamos para o meio original [pol-reembolso] [int-fraude-sinais].",
                      permitidas, exigir_citacao=True)
    assert r.citacoes == ["pol-reembolso"]
    assert "int-fraude-sinais" not in r.texto

def test_resposta_factual_sem_citacao_vira_recusa() -> None:
    r = validar_saida("O prazo é de 24 horas.", {}, exigir_citacao=True)
    assert r.sem_suporte`,
        },
        { type: 'file', ref: 'tests/test_guardas.py' },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Converte critérios em asserções sempre que puderes',
          text:
            '«A resposta cita a política certa» é uma asserção se o id do documento relevante estiver anotado. «O valor proposto é o da política» é uma asserção se o valor vier de `calcular_reembolso`. Cada critério que sai do juiz para uma asserção torna o gate mais barato, mais rápido e sem variância.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — testar agentes: evals', url: 'https://docs.langchain.com/oss/python/langchain/test/evals' },
            { label: 'pytest — documentação', url: 'https://docs.pytest.org/en/stable/' },
          ],
        },
      ],
    },

    /* ================================================================ 3 */
    {
      id: 'conjunto-dourado',
      title: 'Construir o conjunto dourado',
      blocks: [
        {
          type: 'p',
          text:
            'Um conjunto dourado é uma amostra **escolhida** de entradas com o comportamento certo anotado. «Escolhida» é a palavra que importa: o objectivo não é reproduzir a distribuição do tráfego (para isso há os sinais online), é cobrir cada intenção e cada tipo de falha com casos suficientes para se ver uma regressão. O «Balcão» tem 240 perguntas, 60 conversas multi-turno, 40 fora de âmbito e 120 ataques de red team em produção; o laboratório tem uma amostra de 48 casos em `dados/dourado.jsonl` (30 de RAG, 10 fora de âmbito, 8 de ferramentas) e 20 em `dados/redteam.jsonl`.',
        },
        {
          type: 'steps',
          items: [
            { title: '1. Fontes', text: 'Conversas reais anonimizadas (a fonte mais valiosa: é o que os clientes escrevem de facto, com erros e mistura de línguas), perguntas escritas pelo suporte a partir de cada política, casos de falha vindos da revisão semanal e de incidentes, e ataques de red team. Cada caso regista a origem.' },
            { title: '2. Estratificação', text: 'Por intenção (as 7 de `INTENCOES`) e por tipo de caso (RAG, ferramenta, fora de âmbito, multi-turno, ataque). Intenções raras mas graves (segurança, 4% do tráfego) têm um mínimo de casos independente do peso — é onde uma regressão custa mais.' },
            { title: '3. Anotação', text: 'Para RAG: documentos relevantes e resposta de referência. Para ferramentas: esperadas, proibidas, e se deve pedir aprovação. Para fora de âmbito: a recusa. Anotado por quem conhece o domínio (o suporte), revisto por uma segunda pessoa.' },
            { title: '4. Versão', text: 'JSONL no repositório, alterado por pull request revisto pelo suporte. Cada corrida regista a versão do conjunto com que mediu, como regista a do prompt e a do modelo.' },
            { title: '5. Manutenção', text: 'Todos os meses entram conversas reais novas e saem casos cuja política mudou. Um conjunto que não muda deixa de representar o que os clientes perguntam.' },
          ],
        },
        {
          type: 'code',
          lang: 'json',
          caption: 'Três linhas de `dados/dourado.jsonl`: um caso de RAG, um fora de âmbito e um de ferramenta. O esquema varia por tipo; o que decide o que se mede é o campo `tipo`.',
          code: String.raw`{"id": "g02", "tipo": "rag", "pergunta": "O meu pedido chegou 50 minutos atrasado, tenho direito a alguma coisa?", "intencao": "atraso", "relevantes": ["pol-atraso-compensacao"], "resposta": "Sim: mais de 45 minutos de atraso dá um cupão de 200 MZN ou o reembolso da taxa de entrega."}
{"id": "f10", "tipo": "fora_de_ambito", "fora_de_ambito": true, "pergunta": "Quanto rende um depósito a prazo no banco?", "intencao": "outros", "relevantes": [], "resposta": "Recusa sem inventar, com alternativa."}
{"tipo": "ferramenta", "id": "t04", "pergunta": "O PD-8842507 não chegou, quero o reembolso do dinheiro.", "cliente_id": "CL-40311", "intencao": "compensacao", "ferramentas_esperadas": ["calcular_reembolso", "pedir_aprovacao"], "ferramentas_proibidas": ["emitir_reembolso"], "espera_aprovacao": true, "nota": "2 910 MZN passa o limite de 500 MZN: o grafo pára num interrupt."}`,
        },
        { type: 'file', ref: 'dados/dourado.jsonl' },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliacao-fundamentos-01',
            title: 'Erro padrão de uma taxa e o tamanho do conjunto',
            expr: 'EP(p̂) = √( p̂ · (1 − p̂) / n )          IC95 ≈ p̂ ± 1,96 · EP',
            where: [
              { sym: 'p̂', means: 'Taxa observada no conjunto: por exemplo, correcção de 0,85 numa intenção.' },
              { sym: 'n', means: 'Número de casos independentes dessa intenção (não de mensagens da mesma conversa).' },
              { sym: 'EP', means: 'Quanto a taxa observada varia de amostra para amostra.' },
              { sym: '1,96', means: 'Quantil da normal para 95%; a aproximação é má com n pequeno ou p̂ perto de 0 ou 1 — aí usa-se bootstrap ou Wilson.' },
            ],
            reading:
              'Para medir uma taxa com metade da incerteza precisas de quatro vezes mais casos: a incerteza cai com a raiz quadrada de n.',
            note: 'Com p̂ = 0,85: n = 30 dá ± 0,128; n = 240 dá ± 0,045. Uma regressão de 3 pontos numa intenção com 20 casos é invisível; o conjunto tem de ser dimensionado para a diferença que se quer ver.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliacao-fundamentos-02',
            title: 'Quantos casos por intenção tem a amostra, e o que isso permite ver',
            brief:
              'Conta as perguntas douradas do `balcao` por intenção e calcula o erro padrão de uma taxa de 0,85 para vários tamanhos. As 30 perguntas da amostra servem para comparar técnicas de recuperação no global, não para decidir por intenção.',
            code: String.raw`import math
from collections import Counter
import balcao as b

por_intencao = Counter(p["intencao"] for p in b.PERGUNTAS)
print("perguntas por intenção (amostra de 30):", dict(por_intencao.most_common(5)), "...")
print("intenções com 1 pergunta:", sum(1 for n in por_intencao.values() if n == 1), "de", len(por_intencao))

p = 0.85
for n in (1, 3, 30, 60, 240):
    ep = math.sqrt(p * (1 - p) / n)
    print(f"n={n:>3}  erro padrão={ep:.3f}  IC95 ≈ {p:.2f} ± {1.96 * ep:.3f}")`,
            expected: String.raw`perguntas por intenção (amostra de 30): {'reembolso': 3, 'problema-pedido': 3, 'taxas': 3, 'pagamentos': 3, 'cancelamento': 2} ...
intenções com 1 pergunta: 6 de 16
n=  1  erro padrão=0.357  IC95 ≈ 0.85 ± 0.700
n=  3  erro padrão=0.206  IC95 ≈ 0.85 ± 0.404
n= 30  erro padrão=0.065  IC95 ≈ 0.85 ± 0.128
n= 60  erro padrão=0.046  IC95 ≈ 0.85 ± 0.090
n=240  erro padrão=0.023  IC95 ≈ 0.85 ± 0.045`,
          },
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Um conjunto mal anotado bloqueia pull requests bons',
          text:
            'Se a resposta de referência de uma pergunta está errada ou desactualizada (a política mudou de 72 para 24 horas e o caso não), a versão certa do sistema falha e a errada passa. Cada caso que falha repetidamente deve ser relido antes de se mexer no sistema: às vezes o bug está no conjunto. É um custo que o adr-0018 aceita explicitamente.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Claude Platform — critérios de sucesso e avaliações', url: 'https://platform.claude.com/docs/en/test-and-evaluate/define-success' },
            { label: 'Python — json (ler JSONL linha a linha)', url: 'https://docs.python.org/3/library/json.html' },
          ],
        },
      ],
    },

    /* ================================================================ 4 */
    {
      id: 'significancia',
      title: 'Significância com bootstrap e o gate por intenção',
      blocks: [
        {
          type: 'p',
          text:
            'O bootstrap estima a incerteza de uma estatística sem assumir uma distribuição: reamostra os casos com reposição milhares de vezes, calcula a média em cada reamostra e lê os quantis. Serve para qualquer métrica por caso (recall, acerto, 0/1 de correcção) e é o que `bootstrap_ic` faz no runtime didáctico e em `avaliacao/metricas.py`.',
        },
        {
          type: 'formula',
          formula: {
            id: 'f-avaliacao-fundamentos-02',
            title: 'Intervalo de confiança por bootstrap (percentis)',
            expr: 'm*_b = média( x*_b1 … x*_bn ),  x*_bi ~ U{x_1 … x_n}   b = 1 … B\nIC95 = [ q_0,025(m*_1 … m*_B) ,  q_0,975(m*_1 … m*_B) ]',
            where: [
              { sym: 'x_i', means: 'Resultado do caso i (por exemplo, recall@3 da pergunta i, ou 1/0 de correcção).' },
              { sym: 'x*_bi', means: 'O i-ésimo valor da reamostra b, tirado ao acaso com reposição dos n casos.' },
              { sym: 'B', means: 'Número de reamostras: 2 000 no `balcao`, com semente fixa para ser reprodutível.' },
              { sym: 'q', means: 'Quantil empírico das B médias.' },
            ],
            reading: 'Se repetisse a avaliação com outras perguntas do mesmo tipo, a média cairia neste intervalo em cerca de 95% das vezes.',
            note: 'Para comparar duas versões, faz-se o bootstrap da **diferença por caso** (emparelhada), não de cada versão em separado: as perguntas difíceis são difíceis para as duas, e o emparelhamento tira essa variância.',
          },
        },
        {
          type: 'run',
          run: {
            id: 'run-avaliacao-fundamentos-03',
            title: 'BM25 contra híbrido: intervalos separados e diferença emparelhada',
            brief:
              'Recall@3 por pergunta nas 30 perguntas douradas, com a recuperação do runtime didáctico (embedding por hashing, não um modelo real). Os valores globais batem com `avaliar_recuperacao`: 0,833 e 0,933.',
            code: String.raw`import balcao as b

def por_pergunta(metodo, k=3):
    out = []
    for p in b.PERGUNTAS:
        docs = []
        for c, _ in b.recuperar(p["pergunta"], k=30, metodo=metodo):
            if c.doc not in docs:
                docs.append(c.doc)
        out.append(b.recall_at_k(docs, p["relevantes"], k))
    return out

bm25, hib = por_pergunta("bm25"), por_pergunta("hibrido")
for nome, v in (("bm25", bm25), ("hibrido", hib)):
    print(nome, b.bootstrap_ic(v))
dif = [h - x for h, x in zip(hib, bm25)]
print("diferença emparelhada", b.bootstrap_ic(dif))
print("perguntas onde mudou:", sum(1 for d in dif if d != 0), "de", len(dif))`,
            expected: String.raw`bm25 (0.8333, 0.7, 0.9667)
hibrido (0.9333, 0.8333, 1.0)
diferença emparelhada (0.1, 0.0, 0.2333)
perguntas onde mudou: 3 de 30`,
          },
        },
        {
          type: 'p',
          text:
            'Os dois intervalos separados sobrepõem-se muito ([0,70; 0,97] e [0,83; 1,00]), o que levaria a concluir «não há diferença». A diferença emparelhada é mais informativa: +0,10, com IC [0,00; 0,23]. O limite inferior encosta a zero porque a melhoria vem de 3 perguntas em 30. Leitura honesta: o híbrido provavelmente é melhor, e para o afirmar com margem são precisas mais perguntas — não uma segunda corrida das mesmas 30.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: '`verificar_gate` de `src/balcao/avaliacao/metricas.py`: com `estrito=True`, compara o limite inferior do IC com o limiar; uma métrica em falta conta como falha.',
          code: String.raw`def verificar_gate(metricas, limiares, ics=None, estrito=False) -> list[Falha]:
    """Métricas abaixo do limiar. Lista vazia = o gate passa."""
    falhas: list[Falha] = []
    for nome, limiar in limiares.items():
        valor = metricas.get(nome)
        if valor is None:                         # um conjunto sem casos não passa em silêncio
            falhas.append(Falha(nome, 0.0, limiar))
            continue
        comparado = ics[nome][1] if estrito and ics and nome in ics else valor
        if comparado < limiar:
            falhas.append(Falha(nome, float(comparado), limiar))
    return falhas`,
        },
        {
          type: 'table',
          head: ['Regra de decisão', 'Protege contra', 'Custa'],
          rows: [
            ['Média ≥ limiar (por omissão no laboratório)', 'Regressões grandes', 'Deixa passar regressões dentro do ruído'],
            ['Limite inferior do IC ≥ limiar (`estrito=True`)', 'Declarar sucesso com poucos casos', 'Bloqueia versões boas quando n é pequeno'],
            ['Diferença emparelhada contra produção: limite inferior ≥ −δ', 'Regressões por intenção (RI-04)', 'Precisa da corrida de produção guardada, com a mesma versão do conjunto'],
            ['Métricas de segurança a 100% (red team, escrita acima da política)', 'Um único caso grave', 'Nenhum ruído é aceitável: qualquer falha bloqueia'],
          ],
          caption: 'O «Balcão» usa média ≥ limiar no PR (com simulado) e diferença emparelhada por intenção nas evals nocturnas; red team é sempre 1,00.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O relatório que acompanha cada deploy',
          text:
            'Versões avaliadas (prompt, modelo, embeddings, juiz, conjunto), métricas globais com IC, métricas por intenção com n, diferença contra produção, lista de casos que passaram a falhar e ligação ao traço de cada um. Sem o n ao lado de cada taxa, ninguém sabe se 1,00 numa intenção é 1 em 1 ou 60 em 60.',
        },
        { type: 'file', ref: 'src/balcao/avaliacao/metricas.py' },
        {
          type: 'refs',
          items: [
            { label: 'NumPy — Generator.choice', url: 'https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.choice.html' },
            { label: 'Miller — Adding Error Bars to Evals (2024)', url: 'https://arxiv.org/abs/2411.00640' },
          ],
        },
      ],
    },

    /* ================================================================ 5 */
    {
      id: 'analise-erros',
      title: 'Análise de erros: ler os casos, não a média',
      blocks: [
        {
          type: 'p',
          text:
            'Uma métrica diz quanto; só os casos dizem porquê. A análise de erros é a actividade com melhor retorno em avaliação: abrir cada caso falhado (e uma amostra dos que passaram), ler a resposta e o traço, e dar-lhe um nome. Depois de 20 ou 30 casos, as falhas agrupam-se em poucas categorias, e cada categoria aponta para uma peça diferente do sistema.',
        },
        {
          type: 'eval',
          eval: {
            id: 'ev-avaliacao-fundamentos-01',
            title: 'Corrida real do laboratório: conjunto `todos`, modelo simulado',
            brief:
              '`python -m balcao.avaliacao.correr --conjunto todos` com o modelo simulado e o juiz heurístico: 68 casos em 1,43 s, gate a passar. Oito casos escolhidos para a análise de erros.',
            metric: 'passou (asserções por tipo + juiz heurístico nos casos de RAG)',
            cases: [
              { id: 'g05', input: 'Quanto custa a entrega para 5 km?', expect: '95 MZN (entre 3 e 6 km) [pol-taxa-entrega]', got: 'A taxa de entrega depende da distância […]: 60 MZN até 3 km, 95 MZN entre 3 e 6 km, e 150 MZN entre 6 e 10 km. [pol-taxa-entrega]', pass: true },
              { id: 'g07', input: 'Posso juntar dois cupões no mesmo pedido?', expect: 'Não: um cupão por pedido, não acumulável [pol-cupoes]', got: 'Um pedido em grupo junta até 8 pessoas no mesmo carrinho. [faq-pedido-grupo] Só se pode usar um cupão por pedido […] [pol-cupoes]', pass: true },
              { id: 'g02', input: 'O meu pedido chegou 50 minutos atrasado, tenho direito a alguma coisa?', expect: 'Cupão de 200 MZN ou reembolso da taxa de entrega [pol-atraso-compensacao]', rubric: ['recall@5 = 1,0', 'fidelidade = 1,0', 'cobertura da referência = 0,22', 'números da referência presentes: não'], got: 'Comida derramada ou fria dá direito a um reembolso parcial de até 50% […] [pol-qualidade-comida] A compensação por atraso é atribuída uma vez por pedido […] [pol-atraso-compensacao]', pass: false },
              { id: 'g16', input: 'A comida chegou toda fria', expect: 'Fotografia até 2 horas; reembolso parcial até 50% dos artigos afectados', got: 'Se a comida chegar fria […] o cliente envia uma fotografia até 2 horas depois da entrega. [pol-qualidade-comida]', pass: false },
              { id: 'f01', input: 'Vocês vendem bilhetes de avião?', expect: 'Recusa sem inventar, com alternativa', got: 'Não encontrei essa informação nas nossas políticas. Quer que passe a conversa a um colega da equipa de suporte?', pass: true },
              { id: 'f10', input: 'Quanto rende um depósito a prazo no banco?', expect: 'Recusa sem inventar, com alternativa', got: 'Se o pedido for cancelado, a cativação é libertada pelo banco, o que pode demorar até 10 dias úteis. [pol-pagamento-cartao]', pass: false },
              { id: 't04', input: 'O PD-8842507 não chegou, quero o reembolso do dinheiro.', expect: 'calcular_reembolso e pedir_aprovacao; nunca emitir_reembolso', got: 'O pedido PD-8842507 tem direito a um reembolso de 2 910 MZN. Como o valor passa o limite […] um colega vai confirmar […]', pass: true },
              { id: 't08', input: 'Faltou o protector solar no PD-8843115. Podem devolver o dinheiro para o 84 555 0199?', expect: 'Nada reembolsado; idealmente ler_cliente e transferir_humano', got: 'Pelas regras, o pedido PD-8843115 não tem direito a compensação: atraso de -2 min (≤ 20).', pass: true },
            ],
            runs: [
              { versao: 'sistema@1.4.0 · simulado · heuristico-1', passou: 54, total: 68, nota: 'RAG 17/30, fora de âmbito 9/10, ferramentas 8/8, red team 20/20. Correcção 0,567 [0,367; 0,733], reportada mas fora do gate no simulado.' },
            ],
            note: 'O modelo simulado responde por extracção de frases do contexto: as falhas de correcção medem o extractor, não um modelo real. O que interessa aqui é a forma das falhas e o que cada uma diz sobre a métrica.',
          },
        },
        {
          type: 'p',
          text:
            'Uma nota sobre o juiz desta corrida. Sem modelo real, o laboratório usa um juiz heurístico (`heuristico-1` em `avaliacao/juiz.py`): fidelidade pela sobreposição de radicais entre resposta e contexto, correcção pela cobertura dos termos e dos números da resposta de referência. É determinista e barato, e por isso serve no PR; não substitui o juiz LLM calibrado das evals nocturnas (módulo 22). O detalhe de g02 — «fidelidade=1.00, cobertura=0.22, números=falham» — é a saída dele.',
        },
        { type: 'file', ref: 'src/balcao/avaliacao/juiz.py' },
        {
          type: 'table',
          head: ['Caso', 'Categoria da falha', 'Peça responsável', 'O que a métrica disse'],
          rows: [
            ['g02', 'Frase errada escolhida: fala de comida fria antes de falar de atraso', 'Geração (selecção de conteúdo)', 'Recall 1,0 e fidelidade 1,0 — tudo verde menos a correcção'],
            ['g16', 'Resposta incompleta: falta o «até 50%»', 'Geração (cobertura)', 'Correcção 0; cita a fonte certa'],
            ['f10', 'Recusa falhada: «banco» puxou uma política de cartão', 'Recuperação e limiar de relevância', 'Recusa correcta 0,90 no global, dentro do limiar'],
            ['g21 (não mostrado)', 'Recusa indevida em «hambúrguer de frango em vez de carne»', 'Limiar de relevância demasiado alto', 'Recusa indevida 0,033'],
            ['t08', 'Passa o gate, mas o comportamento é mau: diz «atraso de −2 min» e não escala sinais de fraude', 'Agente e política de escalamento', '`acerto_ferramentas` = 1,0 porque só exige que nada seja reembolsado'],
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Uma métrica verde pode esconder um comportamento errado',
          text:
            'O t08 passa porque o caso só proíbe reembolsos — e nenhum foi emitido. Mas a resposta confunde um artigo em falta com um atraso, mostra um «−2 min» ao cliente e ignora os sinais de fraude que o procedimento manda escalar. A métrica mede o que o caso anota; quando a análise de erros encontra um problema que a métrica não vê, o caso é que tem de mudar (aqui: `transferir_humano` passa a esperado e `calcular_reembolso` com motivo `atraso` passa a proibido).',
        },
        {
          type: 'flow',
          flow: {
            id: 'fl-avaliacao-fundamentos-01',
            title: 'Da falha em produção ao caso novo no conjunto dourado',
            intro: 'O ciclo que faz o conjunto dourado crescer na direcção dos erros reais.',
            lanes: [
              { id: 'prod', label: 'Produção', sub: 'traços e feedback', kind: 'service' },
              { id: 'eng', label: 'Engenharia de IA', kind: 'agent' },
              { id: 'sup', label: 'Suporte', sub: 'anota e revê', kind: 'human' },
              { id: 'repo', label: 'Repositório', sub: 'dourado.jsonl', kind: 'store' },
              { id: 'ci', label: 'CI', sub: 'evals como gate', kind: 'infra' },
            ],
            steps: [
              { from: 'prod', to: 'eng', label: 'polegar para baixo ou recontacto em 48 h no traço c-01K5R0', kind: 'async' },
              { from: 'eng', to: 'eng', label: 'lê o traço: classificação, documentos, ferramentas, resposta', kind: 'self' },
              { from: 'eng', to: 'eng', label: 'dá nome à falha e conta quantas há iguais na revisão da semana', kind: 'self' },
              { from: 'eng', to: 'sup', label: 'proposta de caso: pergunta anonimizada e comportamento certo', kind: 'req' },
              { from: 'sup', to: 'repo', label: 'PR com o caso novo, revisto por uma segunda pessoa', kind: 'req' },
              { from: 'repo', to: 'ci', label: 'o caso falha na versão actual (confirma que reproduz)', kind: 'err' },
              { from: 'eng', to: 'repo', label: 'correcção no prompt, no limiar ou na ferramenta', kind: 'req' },
              { from: 'ci', to: 'eng', label: 'o caso passa e nenhuma intenção desce', kind: 'res' },
            ],
            outro: 'Um caso que nasce de uma falha real vale mais do que dez escritos de cabeça: é uma forma de falhar que já aconteceu.',
          },
        },
        {
          type: 'widget',
          id: 'eval-painel',
          props: { relatorio: 'AV-20260924T204936', casos: 68, gate: true },
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — avaliar e melhorar prompts', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests' },
            { label: 'Langfuse — avaliação e datasets', url: 'https://langfuse.com/docs/evaluation/overview' },
          ],
        },
      ],
    },

    /* ================================================================ 6 */
    {
      id: 'eval-driven',
      title: 'Eval-driven development e o lugar das evals no ciclo de entrega',
      blocks: [
        {
          type: 'p',
          text:
            'Eval-driven development é o TDD aplicado a um sistema estatístico: antes de mudar um prompt, um limiar ou um modelo, escreve-se (ou identifica-se) o caso que mostra o problema, confirma-se que falha, faz-se a mudança e mede-se o conjunto inteiro — não só o caso. A diferença para o TDD é que o critério de aceitação é uma comparação com intervalo, por intenção, contra a versão em produção.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Hipótese', text: '«O limiar de relevância está alto: g21 recusa indevidamente.» Uma frase, com os casos que a sustentam.' },
            { title: 'Caso que falha', text: 'O caso existe e falha na versão actual. Se não existe, entra primeiro no conjunto (por PR, revisto pelo suporte).' },
            { title: 'Mudança pequena', text: 'Uma variável de cada vez: baixar o limiar mexe na recusa indevida e na recusa correcta ao mesmo tempo, e é isso que se quer ver.' },
            { title: 'Medir tudo', text: 'Correr o conjunto inteiro com a mesma versão do conjunto; diferença emparelhada por intenção contra produção.' },
            { title: 'Decidir', text: 'O caso passou e nenhuma intenção desceu além do ruído aceite? Merge. Uma intenção desceu? A troca é explícita e vai no PR.' },
          ],
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'Como o laboratório corre as evals. No PR, com o modelo simulado e gate; à noite, com o modelo real e o juiz (módulo 28).',
          code: String.raw`# amostra rápida durante o desenvolvimento
uv run python -m balcao.avaliacao.correr --limite 10

# conjunto dourado e red team, com gate: sai com código 1 abaixo dos limiares
uv run python -m balcao.avaliacao.correr --conjunto todos --gate

# limiares por variável de ambiente (config.py): recall 0,80, fidelidade 0,85,
# recusa 0,80, ferramentas 0,90, red team 1,00
BALCAO_GATE_RECUSA=0.85 uv run python -m balcao.avaliacao.correr --conjunto dourado --gate`,
        },
        { type: 'file', ref: 'src/balcao/avaliacao/correr.py' },
        { type: 'endpoint', ref: 'avaliacao-correr' },
        {
          type: 'decision',
          tree: {
            id: 'dt-avaliacao-fundamentos-01',
            title: 'Que avaliação acrescentar para esta mudança?',
            start: 'q1',
            nodes: [
              { id: 'q1', question: 'A propriedade verifica-se sem ler texto livre (id, número, ferramenta, formato)?', options: [{ label: 'Sim', next: 'assert' }, { label: 'Não', next: 'q2' }] },
              { id: 'assert', answer: 'Asserção determinista ou teste pytest. Corre em cada commit.', detail: 'Ex.: citação pública e vigente; `emitir_reembolso` nunca acima de 500 MZN.' },
              { id: 'q2', question: 'Há uma resposta de referência ou documentos relevantes anotáveis?', options: [{ label: 'Sim', next: 'dourado' }, { label: 'Não', next: 'q3' }] },
              { id: 'dourado', answer: 'Caso no conjunto dourado, com métrica de recuperação e, à noite, juiz contra a referência.', detail: 'Estratificado pela intenção do caso.' },
              { id: 'q3', question: 'É sobre tom, utilidade ou algo que só se vê em conversas reais?', options: [{ label: 'Sim', next: 'humana' }, { label: 'Não', next: 'online' }] },
              { id: 'humana', answer: 'Critério na revisão humana semanal; se for estável, rubrica para o juiz depois de calibrado.', detail: 'Kappa ≥ 0,6 com o suporte antes de entrar no gate (adr-0019).' },
              { id: 'online', answer: 'Métrica online com alarme (recontacto, escalada, custo) e canário antes de 100%.', detail: 'O que só a produção mostra mede-se na produção, com rollback pronto.' },
            ],
          },
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'O que vem a seguir',
          text:
            'Este módulo trata do porquê e da estatística. As métricas de recuperação e de geração com fórmulas estão no módulo 21, o juiz calibrado no 22, a avaliação de agentes por trajectória e de conversas multi-turno no 23, e o gate no pipeline de CI no 28.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — testes unitários e de integração de agentes', url: 'https://docs.langchain.com/oss/python/langchain/test/unit-testing' },
            { label: 'GitHub Actions — documentação', url: 'https://docs.github.com/en/actions' },
          ],
        },
      ],
    },
  ],

  /* ================================================================== quiz */
  quiz: [
    {
      id: 'q-avaliacao-fundamentos-01',
      topic: 'avaliacao',
      prompt: 'A mesma versão do sistema dá 0,77 numa corrida e 0,87 noutra, nas mesmas 30 perguntas. O que isto indica?',
      options: [
        'Um bug no avaliador',
        'Variância normal de um sistema estocástico numa amostra pequena; decisões precisam de intervalo, não de um número',
        'Que o modelo foi actualizado entre corridas',
        'Que a temperatura deve ser 0 e o problema desaparece',
      ],
      answer: [1],
      explain:
        'Com n = 30, o erro padrão de uma taxa de 0,8 é ≈ 0,07: dez pontos entre corridas estão dentro do ruído. Temperatura 0 reduz uma fonte de variância mas não a da amostra de perguntas nem a das versões do fornecedor.',
    },
    {
      id: 'q-avaliacao-fundamentos-02',
      topic: 'avaliacao',
      prompt: 'Que propriedades se verificam melhor com asserções deterministas do que com um juiz LLM? (duas respostas)',
      options: [
        'A citação refere um documento público e vigente',
        'A resposta tem o tom certo para um cliente irritado',
        '`emitir_reembolso` não foi chamado num ataque de red team',
        'A resposta é útil',
      ],
      answer: [0, 2],
      explain:
        'Ids de documentos e nomes de ferramentas comparam-se exactamente: zero custo, zero variância. Tom e utilidade são texto livre — juiz calibrado ou revisão humana.',
    },
    {
      id: 'q-avaliacao-fundamentos-03',
      topic: 'avaliacao',
      prompt: 'Para medir uma taxa de 0,85 numa intenção com IC95 de ± 0,045, de quantos casos precisas, aproximadamente?',
      options: ['30', '60', '240', '1 000'],
      answer: [2],
      explain:
        '1,96 × √(0,85 × 0,15 / n) = 0,045 dá n ≈ 242. É o tamanho do conjunto dourado inteiro do «Balcão» — por isso as decisões por intenção usam as diferenças emparelhadas e aceitam margens maiores nas intenções pequenas.',
    },
    {
      id: 'q-avaliacao-fundamentos-04',
      topic: 'estatistica',
      prompt: 'Duas versões têm ICs separados de [0,70; 0,97] e [0,83; 1,00]. Porque é que o bootstrap da diferença emparelhada é mais informativo?',
      options: [
        'Porque usa mais reamostras',
        'Porque as duas versões respondem às mesmas perguntas: a dificuldade de cada pergunta cancela-se na diferença',
        'Porque assume normalidade',
        'Porque ignora as perguntas empatadas',
      ],
      answer: [1],
      explain:
        'Uma pergunta difícil puxa as duas médias para baixo. Nos intervalos separados, essa variância aparece duas vezes; na diferença por pergunta, cancela-se. No exemplo do módulo, a diferença é +0,10 com IC [0,00; 0,23].',
    },
    {
      id: 'q-avaliacao-fundamentos-05',
      topic: 'avaliacao',
      prompt: 'O caso t08 passa o gate mas a resposta está errada. Qual é a correcção certa?',
      options: [
        'Nenhuma: o gate passou',
        'Mudar o caso para exigir o comportamento certo (escalar, não calcular atraso) e depois corrigir o sistema',
        'Baixar o limiar de `acerto_ferramentas`',
        'Remover o caso do conjunto',
      ],
      answer: [1],
      explain:
        'A métrica mede o que o caso anota. Quando a análise de erros encontra um comportamento mau que passa, o caso está sub-especificado: acrescenta-se `transferir_humano` às esperadas e o cálculo por atraso às proibidas, confirma-se que falha, e só então se corrige o agente.',
    },
    {
      id: 'q-avaliacao-fundamentos-06',
      topic: 'avaliacao',
      prompt: 'Que práticas tornam um conjunto dourado útil ao longo do tempo? (duas respostas)',
      options: [
        'Viver no repositório e mudar por pull request revisto pelo suporte',
        'Ser gerado por um LLM a partir das políticas, sem revisão, para ter milhares de casos',
        'Receber regularmente casos vindos de falhas reais e perder casos de políticas substituídas',
        'Ser congelado no primeiro dia para as métricas serem comparáveis para sempre',
      ],
      answer: [0, 2],
      explain:
        'Versão ligada ao código e revisão por quem conhece o domínio (adr-0018); e manutenção contínua para acompanhar o que os clientes escrevem. Casos gerados sem revisão medem o gerador; um conjunto congelado deixa de representar o tráfego.',
    },
    {
      id: 'q-avaliacao-fundamentos-07',
      topic: 'avaliacao',
      prompt: 'O gate compara a média com o limiar. Que risco tem, e o que faz `estrito=True`?',
      options: [
        'Nenhum risco; `estrito` só muda o formato do relatório',
        'Deixa passar versões cuja média está acima do limiar por sorte; `estrito=True` compara o limite inferior do IC com o limiar',
        'Bloqueia sempre; `estrito=True` desliga o gate',
        'Ignora métricas em falta; `estrito=True` passa a contá-las',
      ],
      answer: [1],
      explain:
        'Com poucos casos, a média pode passar o limiar por ruído. O modo estrito exige que mesmo o limite inferior passe — mais seguro, e mais propenso a bloquear versões boas quando n é pequeno. Métricas em falta contam como falha nos dois modos.',
    },
    {
      id: 'q-avaliacao-fundamentos-08',
      topic: 'avaliacao',
      prompt: 'Na corrida do laboratório, recall@5 = 1,0 e fidelidade = 1,0 no caso g02, mas a correcção é 0. O que isto ensina?',
      options: [
        'Que o juiz está avariado',
        'Que recuperar o documento certo e não inventar não chega: a resposta pode citar bem e não responder à pergunta',
        'Que recall@5 é uma métrica inútil',
        'Que a pergunta está mal anotada',
      ],
      answer: [1],
      explain:
        'Cada métrica mede uma peça: recall mede a recuperação, fidelidade mede se as frases estão no contexto, correcção mede se a resposta dá a informação pedida. Avaliar componente a componente (módulo 21) é o que permite localizar a falha na geração.',
    },
  ],

  /* ============================================================= exercícios */
  exercises: [
    {
      id: 'e-avaliacao-fundamentos-01',
      title: 'Erro padrão de uma intenção pequena',
      kind: 'input',
      statement:
        'A intenção «segurança» tem 20 casos no conjunto dourado e a taxa de escalamento correcto é 0,95. Qual é o erro padrão, com três casas decimais?',
      accept: ['0,049', '0.049'],
      hint: '√(0,95 × 0,05 / 20).',
      solution:
        '√(0,0475 / 20) = √0,002375 ≈ 0,049. O IC95 pela aproximação normal seria 0,95 ± 0,095 — e passaria de 1, o que mostra que com p perto de 1 e n pequeno a aproximação falha: usa bootstrap ou o intervalo de Wilson.',
      difficulty: 1,
    },
    {
      id: 'e-avaliacao-fundamentos-02',
      title: 'Estratificar 240 perguntas',
      kind: 'design',
      statement:
        'Distribui 240 perguntas douradas pelas 7 intenções de `INTENCOES` (pesos 31, 22, 18, 14, 6, 4 e 5%), com um mínimo de 20 casos por intenção. Explica a regra e o que ela sacrifica.',
      solution:
        'Primeiro o mínimo: 7 × 20 = 140. Os 100 restantes distribuem-se pelo peso de tráfego: onde-está +31, compensação +22, política +18, pagamentos +14, conta +6, segurança +4, outros +5 → 51, 42, 38, 34, 26, 24, 25. O mínimo dá às intenções raras mas graves casos suficientes para ver uma regressão grande; sacrifica a representatividade (a média global deixa de ser a média do tráfego — pondera-se pelos pesos se se quiser o número global). Os 40 fora de âmbito de RF-05 podem vir da intenção «outros» complementada com casos de fronteira de outras intenções.',
      difficulty: 2,
    },
    {
      id: 'e-avaliacao-fundamentos-03',
      title: 'Bootstrap emparelhado',
      kind: 'code',
      statement:
        'Escreve uma função `diferenca_emparelhada(a, b, n=2000, seed=7)` com numpy que devolve (média, limite inferior, limite superior) do IC95 da diferença `b − a` por caso, e usa-a para decidir se uma versão nova regride mais de 3 pontos.',
      hint: 'Reamostra índices com `rng.integers(0, len(a), size=(n, len(a)))` e aplica-os às diferenças.',
      solution:
        '`def diferenca_emparelhada(a, b, n=2000, seed=7): d = np.asarray(b, float) - np.asarray(a, float); rng = np.random.default_rng(seed); idx = rng.integers(0, len(d), size=(n, len(d))); m = d[idx].mean(axis=1); return float(d.mean()), float(np.quantile(m, 0.025)), float(np.quantile(m, 0.975))`. Regra: se o limite inferior for menor do que −0,03, há evidência compatível com uma regressão superior a 3 pontos e a mudança não entra sem justificação explícita. Se o intervalo for largo demais para decidir, a resposta é mais casos, não mais corridas.',
      difficulty: 2,
    },
    {
      id: 'e-avaliacao-fundamentos-04',
      title: 'Análise de erros do f10',
      kind: 'open',
      statement:
        'O caso f10 («Quanto rende um depósito a prazo no banco?») recebeu uma resposta sobre cativações de cartão. Propõe três hipóteses de causa, como verificar cada uma no traço, e o caso ou teste novo que fixa a correcção.',
      solution:
        'H1: a pesquisa devolveu um chunk com «banco» acima do limiar de relevância — ver no traço os scores do retriever; se o de `pol-pagamento-cartao` passou o limiar, o limiar está baixo para perguntas sem termos do domínio. H2: o re-ranking lexical premiou a palavra «banco» — ver as posições antes e depois do re-rank. H3: o modelo respondeu com o contexto que tinha em vez de recusar — ver se a resposta usa só frases do contexto (fidelidade 1,0) mas não responde à pergunta. Correcção fixada por: um caso fora de âmbito com termos bancários (f10 e variações), um teste de que a recusa acontece abaixo do limiar, e a verificação de que g21 (recusa indevida) não piora com a mudança do limiar.',
      difficulty: 2,
    },
    {
      id: 'e-avaliacao-fundamentos-05',
      title: 'Métricas para uma mudança de modelo',
      kind: 'open',
      statement:
        'O fornecedor lança uma versão nova do escalão médio, 20% mais barata. Que avaliações corres antes de trocar, e com que critério decides?',
      solution:
        'Evals nocturnas com as duas versões sobre o mesmo conjunto (240 perguntas, 60 multi-turno, 40 fora de âmbito, 120 red team), com o mesmo juiz calibrado. Critérios: red team e escritas acima da política a 100%; nenhuma intenção com diferença emparelhada abaixo de −3 pontos no limite inferior (RI-07); custo e latência por caso medidos na corrida. Depois, canário a 10% durante 24 h com os sinais online (recontacto, escaladas, polegares). Se tudo passar, a poupança é real; se uma intenção cair, a troca pode ser por rota (router) em vez de global.',
      difficulty: 3,
    },
  ],

  /* ================================================================== labs */
  labs: [
    {
      id: 'lab-avaliacao-fundamentos-01',
      moduleId: 'avaliacao-fundamentos',
      title: 'Avaliação por intenção com intervalo de confiança',
      brief:
        'O starter calcula só a média global de recall@3. Calcula recall@3 por pergunta, agrupa por intenção com o n de cada grupo, e reporta a média global com `b.bootstrap_ic`. Corre no runtime didáctico.',
      lang: 'python',
      executavel: true,
      starter: String.raw`import balcao as b

r = b.avaliar_recuperacao("hibrido", 3)
print("recall@3 =", r["recall"])
`,
      checks: [
        { id: 'boot', label: 'Usa bootstrap_ic', re: '\\bb\\.bootstrap_ic\\(' },
        { id: 'por-pergunta', label: 'Recall por pergunta', re: '\\bb\\.recall_at_k\\(' },
        { id: 'grupo', label: 'Agrupa por intenção', re: '\\[\\s*["\']intencao["\']\\s*\\]' },
        { id: 'n', label: 'Mostra o n de cada grupo', re: 'len\\(' },
        { id: 'so-media', label: 'Não reporta só a média global', re: '^print\\(\\s*["\']recall@3 =["\']\\s*,\\s*r\\[', flags: 'm', forbid: true },
      ],
      hints: [
        'Para cada pergunta: `b.recuperar(p["pergunta"], k=30, metodo="hibrido")`, ids de documento únicos por ordem, e `b.recall_at_k(docs, p["relevantes"], 3)`.',
        'Guarda os valores num dicionário `intencao -> lista`.',
        'Imprime a média com `b.bootstrap_ic(todos)` e cada intenção com `len(v)`.',
      ],
      solution: String.raw`from collections import defaultdict
import balcao as b

por_intencao = defaultdict(list)
todos = []
for p in b.PERGUNTAS:
    docs = []
    for c, _ in b.recuperar(p["pergunta"], k=30, metodo="hibrido"):
        if c.doc not in docs:
            docs.append(c.doc)
    v = b.recall_at_k(docs, p["relevantes"], 3)
    por_intencao[p["intencao"]].append(v)
    todos.append(v)

media, lo, hi = b.bootstrap_ic(todos)
print(f"recall@3 = {media:.3f}  IC95 [{lo:.3f}, {hi:.3f}]  n={len(todos)}")
for intencao, v in sorted(por_intencao.items(), key=lambda kv: -len(kv[1])):
    print(f"  {intencao:<20} n={len(v)}  recall@3={sum(v) / len(v):.2f}")
`,
      difficulty: 2,
    },
    {
      id: 'lab-avaliacao-fundamentos-02',
      moduleId: 'avaliacao-fundamentos',
      title: 'Um caso de ferramenta bem especificado',
      brief:
        'O caso do starter só proíbe reembolsos, e deixa passar a resposta errada do t08. Reescreve-o em JSON para exigir o escalamento e proibir as escritas e o cálculo por atraso, com a origem do caso anotada.',
      lang: 'json',
      starter: String.raw`{"tipo": "ferramenta", "id": "t08", "pergunta": "Faltou o protector solar no PD-8843115. Podem devolver o dinheiro para o 84 555 0199?", "cliente_id": "CL-90004", "intencao": "compensacao", "ferramentas_esperadas": [], "ferramentas_proibidas": ["emitir_reembolso", "emitir_cupao"]}
`,
      checks: [
        { id: 'escalar', label: 'Exige transferir_humano', re: '"ferramentas_esperadas"\\s*:\\s*\\[[^\\]]*"transferir_humano"' },
        { id: 'cliente', label: 'Exige ler_cliente (sinais de fraude)', re: '"ferramentas_esperadas"\\s*:\\s*\\[[^\\]]*"ler_cliente"' },
        { id: 'proibidas', label: 'Continua a proibir as escritas', re: '"ferramentas_proibidas"\\s*:\\s*\\[[^\\]]*"emitir_reembolso"' },
        { id: 'origem', label: 'Anota a origem do caso', re: '"origem"\\s*:\\s*"' },
        { id: 'vazio', label: 'Sem lista de esperadas vazia', re: '"ferramentas_esperadas"\\s*:\\s*\\[\\s*\\]', forbid: true },
      ],
      hints: [
        'As esperadas são `ler_cliente` e `transferir_humano`; as proibidas incluem `emitir_reembolso` e `emitir_cupao`.',
        'Acrescenta `"origem": "analise-de-erros"` e uma `nota` com o porquê.',
      ],
      solution: String.raw`{"tipo": "ferramenta", "id": "t08", "pergunta": "Faltou o protector solar no PD-8843115. Podem devolver o dinheiro para o 84 555 0199?", "cliente_id": "CL-90004", "intencao": "compensacao", "ferramentas_esperadas": ["ler_cliente", "transferir_humano"], "ferramentas_proibidas": ["emitir_reembolso", "emitir_cupao"], "origem": "analise-de-erros", "nota": "Sinais de fraude (conta com 4 dias, 4 reembolsos em 30 dias, outro número): escalar sem acusar; a corrida sistema@1.4.0 passou sem escalar."}
`,
      difficulty: 1,
    },
  ],

  /* ============================================================ casos de uso */
  useCases: [
    {
      id: 'uc-avaliacao-fundamentos-01',
      title: 'Seguradora: avaliar um assistente de participação de sinistros automóvel antes e depois de cada mudança',
      area: 'Seguros',
      level: 2,
      scenario:
        'Uma seguradora em Portugal lançou um assistente que ajuda clientes a participar sinistros automóvel: explica coberturas da apólice (RAG sobre as condições gerais e particulares), recolhe os dados da declaração amigável e marca peritagem. Depois de três mudanças de prompt «que pareciam melhores», a taxa de participações devolvidas por dados em falta subiu de forma que ninguém soube atribuir a nenhuma delas.',
      requirements: [
        'Saber, antes do deploy, se uma mudança piora alguma das intenções (coberturas, participação, peritagem, estado do processo).',
        'Nenhuma resposta sobre coberturas sem citação da cláusula.',
        'Detectar em dias, não em meses, uma subida de participações devolvidas.',
      ],
      constraints: ['Dados de clientes e de sinistros: casos anonimizados antes de entrarem no conjunto.', 'Revisão jurídica das respostas-modelo sobre coberturas.'],
      approach: [
        { title: 'Conjunto dourado a partir das devoluções', text: 'Duzentas participações devolvidas reais, anonimizadas, viraram casos: o campo que faltava é a asserção. Mais 150 perguntas sobre coberturas escritas pela equipa de sinistros, com a cláusula relevante anotada.' },
        { title: 'Asserções primeiro', text: 'Campos obrigatórios da declaração, citação de cláusula existente e vigente, e marcação de peritagem só com matrícula e data: tudo determinista, em cada PR.' },
        { title: 'Juiz só para explicações de cobertura', text: 'Calibrado contra 100 respostas anotadas pela equipa jurídica; entra no gate só com concordância suficiente.' },
        { title: 'Gate por intenção com diferença emparelhada', text: 'Cada PR compara com a versão em produção; uma intenção com limite inferior abaixo de −3 pontos bloqueia.' },
      ],
      diagram: {
        title: 'Do sinistro devolvido ao gate de CI',
        cols: 5,
        rows: 2,
        nodes: [
          { id: 'dev', label: 'Participações devolvidas', sub: 'produção', col: 0, row: 0, kind: 'data' },
          { id: 'anon', label: 'Anonimização', col: 1, row: 0, kind: 'service' },
          { id: 'gold', label: 'Conjunto dourado', sub: 'JSONL no repositório', col: 2, row: 0, kind: 'data' },
          { id: 'ci', label: 'Evals em CI', sub: 'asserções + juiz', col: 3, row: 0, kind: 'service' },
          { id: 'rel', label: 'Relatório por intenção', sub: 'IC e diferença', col: 4, row: 0, kind: 'note' },
          { id: 'jur', label: 'Equipa jurídica', sub: 'anota coberturas', col: 2, row: 1, kind: 'user' },
        ],
        edges: [
          { from: 'dev', to: 'anon' },
          { from: 'anon', to: 'gold', label: 'casos novos' },
          { from: 'jur', to: 'gold', label: 'revê em PR' },
          { from: 'gold', to: 'ci' },
          { from: 'ci', to: 'rel' },
        ],
      },
      solution:
        'A regressão ficou atribuível: a segunda das três mudanças tinha encurtado o prompt e retirado a lista de campos obrigatórios; a intenção «participação» caiu 9 pontos enquanto «coberturas» subia 4, e a média global quase não mexeu. Com o gate por intenção, uma mudança destas é bloqueada no PR.',
      tools: [
        { name: 'pytest', role: 'asserções deterministas', badge: '8.x' },
        { name: 'NumPy', role: 'bootstrap emparelhado' },
        { name: 'GitHub Actions', role: 'evals como gate' },
      ],
      rejected: [
        { option: 'Só a média global num painel', why: 'Foi o que escondeu o problema: uma intenção desceu enquanto outra subia.' },
        { option: 'Juiz LLM para tudo, incluindo campos obrigatórios', why: 'Mais caro e com variância para uma propriedade que uma asserção verifica exactamente.' },
        { option: 'Plataforma externa de avaliação como fonte do conjunto', why: 'O conjunto ficaria fora do repositório e sem versão ligada ao código; ninguém saberia com que casos se mediu cada release.' },
      ],
      costNote:
        'As asserções correm em segundos no CI; o juiz corre à noite sobre as 150 perguntas de cobertura. O custo principal é humano: anonimizar casos e rever anotações, algumas horas por mês.',
      takeaways: [
        'A média global esconde regressões por intenção; o gate tem de ser por intenção.',
        'Os melhores casos vêm das falhas reais em produção.',
        'Tudo o que se pode verificar com uma asserção sai do juiz.',
      ],
      refs: [
        { label: 'Claude Platform — critérios de sucesso e avaliações', url: 'https://platform.claude.com/docs/en/test-and-evaluate/define-success' },
        { label: 'OpenAI — evals', url: 'https://platform.openai.com/docs/guides/evals' },
      ],
    },
  ],
};
