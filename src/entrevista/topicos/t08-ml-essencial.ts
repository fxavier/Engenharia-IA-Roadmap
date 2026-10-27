import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'ml-essencial',
  numero: 8,
  bloco: 'llm',
  titulo: 'ML essencial para AI engineers',
  resumo:
    'O ML clássico que um AI engineer usa todas as semanas mesmo sem treinar modelos de fundação: separar dados sem fuga, escolher métricas e limiares pelo custo dos erros, calibrar, saber quando um classificador simples bate um LLM, ler um teste A/B e reconhecer drift.',
  icon: '📐',
  modulos: ['engenharia-ia', 'avaliacao-fundamentos', 'escolher-modelo'],
  essencial: [
    'Treino para ajustar, validação para escolher (hiperparâmetros, limiar, prompt), teste uma única vez no fim. Escolher no teste transforma-o em validação.',
    'Precisão = TP/(TP+FP); recall = TP/(TP+FN); F1 = 2PR/(P+R). A exactidão engana com classes desbalanceadas.',
    'A precisão depende da prevalência: com TPR 0,9 e FPR 0,05, é 0,95 com 50% de positivos e 0,27 com 2%.',
    'ROC-AUC não muda com a prevalência; PR-AUC sim, e o seu baseline é a própria prevalência — com positivos raros, olha para PR.',
    'Com probabilidades calibradas, o limiar que minimiza o custo esperado é t = C_FP / (C_FP + C_FN).',
    'Calibração: diagrama de fiabilidade; Platt (sigmoid) com poucos dados, isotónica com mais de ~1 000 exemplos; temperature scaling para redes.',
    'Regressão logística sobre embeddings é muitas vezes o baseline a bater: treina em segundos, serve em milissegundos, calibra bem.',
    'Tamanho de amostra por braço ≈ (z_α/2 + z_β)² · [p1(1−p1) + p2(1−p2)] / δ²; de 10% para 11% com α = 0,05 e potência 0,8 são ~14 750 por braço.',
    'Espreitar um teste A/B 10 vezes e parar no primeiro p < 0,05 leva o falso positivo de 5% para ~20%.',
    'Data drift: muda P(X). Concept drift: muda P(Y dado X) — os mesmos inputs passam a ter outra resposta certa. O segundo só se vê com etiquetas.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-ml-essencial-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Treino, validação, teste e as formas de fuga de dados',
      enunciado:
        'Para que servem os conjuntos de treino, validação e teste? E dá-me três exemplos de data leakage que já viste ou que esperas encontrar num projecto com LLMs.',
      minutos: 5,
      dica: 'Pensa em todas as decisões que tomas olhando para números — cada uma «treina» alguma coisa.',
      resposta: [
        {
          type: 'p',
          text: 'Treino serve para ajustar parâmetros, validação para **tomar decisões** (hiperparâmetros, limiar, escolha de prompt ou de modelo) e teste para estimar, **uma vez no fim**, o desempenho em dados nunca vistos. Data leakage é qualquer caminho pelo qual informação do teste, ou do futuro, chega ao treino ou às decisões — e torna o número optimista.',
        },
        {
          type: 'p',
          text: 'O ponto que muita gente falha num projecto com LLMs: mesmo sem treinar pesos, iterar 40 versões de prompt e escolher a melhor no conjunto dourado é ajustar ao dourado. Por isso separo um conjunto de desenvolvimento, onde itero, de um conjunto de teste que só corro antes de uma decisão de lançamento.',
        },
        {
          type: 'list',
          items: [
            '**Duplicados e grupos**: a mesma conversa, cliente ou template de email dos dois lados do split. Resolve-se com split por grupo (`GroupKFold`) e deduplicação de quase-duplicados.',
            '**Tempo**: split aleatório quando o produto prevê o futuro — o modelo vê Abril no treino e é testado em Março. Resolve-se com split temporal.',
            '**Features do futuro**: uma coluna preenchida depois do evento, como «estado final do ticket» ou «motivo do reembolso», usada para prever se o ticket vai escalar.',
            '**Pré-processamento no conjunto inteiro**: normalizar, seleccionar features ou ajustar um vectorizador antes do split. Resolve-se com um `Pipeline` ajustado só no treino.',
            '**Fontes partilhadas**: perguntas sintéticas geradas pelo mesmo LLM a partir dos mesmos documentos para o treino e para o teste.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O teste que se olha muitas vezes',
          text: 'Cada vez que vês o resultado do teste e mudas alguma coisa, o teste perde valor. Se precisas de iterar, cria um conjunto novo para teste final.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — armadilhas comuns e data leakage', url: 'https://scikit-learn.org/stable/common_pitfalls.html' },
            { label: 'scikit-learn — validação cruzada (GroupKFold, TimeSeriesSplit)', url: 'https://scikit-learn.org/stable/modules/cross_validation.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue validação (decidir) de teste (estimar uma vez no fim).',
          'Dá pelo menos três tipos diferentes de fuga (grupos/duplicados, tempo, features do futuro, pré-processamento).',
          'Associa a cada fuga uma correcção concreta (split por grupo, temporal, pipeline).',
          'Aplica a ideia a LLMs: iterar prompts no dourado também é ajustar ao dourado.',
        ],
        fraco: 'Define os três conjuntos e dá só «dados de teste no treino» como exemplo de fuga.',
        solido: 'Explica o papel de cada conjunto e dá três fugas distintas com a correcção de cada uma.',
        excelente: 'Acrescenta a fuga por iteração de prompts no dourado, a separação dev/teste e a fuga via dados sintéticos gerados das mesmas fontes.',
      },
      seguimento: [
        'Como detectarias uma feature do futuro num dataset que não conheces?',
        'Quando usavas validação cruzada em vez de um conjunto de validação fixo?',
        'Com 300 exemplos anotados, como os dividias?',
      ],
      sinaisAlarme: [
        'Afinar hiperparâmetros ou o prompt directamente no conjunto de teste.',
        'Usar split aleatório num problema temporal sem o justificar.',
        'Não reconhecer fuga quando não há texto exactamente igual.',
      ],
      modulos: ['avaliacao-fundamentos', 'engenharia-ia'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-ml-essencial-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Precisão, recall, F1 e ROC-AUC vs PR-AUC',
      enunciado:
        'Tens um detector de mensagens de fraude: 1% das mensagens são fraude. Que métricas reportas e porque é que a exactidão de 99% não te diz nada? E ROC-AUC ou PR-AUC?',
      minutos: 5,
      dica: 'Qual é a exactidão de um modelo que diz sempre «não é fraude»?',
      resposta: [
        {
          type: 'p',
          text: 'Um modelo que diz sempre «não» tem 99% de exactidão e zero utilidade. Reporto **precisão** (das que marquei, quantas eram fraude), **recall** (das fraudes, quantas apanhei) e, para comparar modelos independentemente do limiar, **PR-AUC**, porque com positivos raros a ROC-AUC parece boa mesmo quando a precisão é má.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Precisão', def: 'TP / (TP + FP). Mede o custo dos falsos alarmes: equipa de revisão, clientes bloqueados.' },
            { term: 'Recall (TPR)', def: 'TP / (TP + FN). Mede o que deixas passar.' },
            { term: 'F1', def: 'Média harmónica de precisão e recall. Útil para comparar, mas pesa os dois erros por igual — raramente é o que o negócio quer.' },
            { term: 'FPR', def: 'FP / (FP + TN). O eixo x da curva ROC.' },
          ],
        },
        {
          type: 'p',
          text: 'Porque é que a ROC engana aqui: TPR e FPR são calculados cada um dentro da sua classe, por isso a ROC não muda com a prevalência. Mas a precisão muda. Com TPR de 0,9 e FPR de 0,05, a precisão é 0,95 quando metade das mensagens é fraude e cai para 0,27 quando só 2% são — três em cada quatro alertas são falsos, com a mesma curva ROC. A curva precisão-recall mostra isso, e o seu baseline é a própria prevalência (0,01 aqui), não 0,5.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Sensível à prevalência', 'Quando usar'],
          rows: [
            ['Exactidão', 'Sim, e enganadora', 'Classes equilibradas e erros com o mesmo custo'],
            ['ROC-AUC', 'Não', 'Comparar capacidade de ordenação entre populações com prevalências diferentes'],
            ['PR-AUC (average precision)', 'Sim', 'Positivos raros e interesse no topo da lista'],
            ['Precisão e recall num limiar', 'Sim', 'Decisão operacional: o que acontece com o limiar escolhido'],
          ],
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Multiclasse',
          text: 'Com várias classes, macro-F1 dá o mesmo peso a cada classe e expõe as raras; micro-F1 é dominado pelas frequentes. Num classificador de intenções reporto macro-F1 e o recall das intenções críticas em separado.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — métricas de classificação', url: 'https://scikit-learn.org/stable/modules/model_evaluation.html' },
            { label: 'scikit-learn — Precision-Recall', url: 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_precision_recall.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Mostra que a exactidão é inútil com 1% de positivos (o modelo constante tem 99%).',
          'Define precisão e recall com TP, FP e FN e liga cada um a um custo do negócio.',
          'Explica que a ROC não depende da prevalência e a precisão depende.',
          'Diz que o baseline da PR-AUC é a prevalência.',
          'Distingue macro de micro em multiclasse.',
        ],
        fraco: 'Diz «uso F1» sem explicar porquê nem distinguir as curvas.',
        solido: 'Define as métricas, rejeita a exactidão e escolhe PR-AUC pelos positivos raros.',
        excelente: 'Acrescenta o cálculo da precisão a prevalências diferentes, o baseline da PR-AUC, e reporta precisão e recall no limiar operacional, não só a área.',
      },
      seguimento: [
        'Se a prevalência de fraude duplicar no Natal, o que muda nas tuas métricas?',
        'Porque é que o F1 raramente é a métrica certa para decidir o limiar?',
        'Como reportavas incerteza na precisão quando só tens 40 positivos no teste?',
      ],
      sinaisAlarme: [
        'Reportar exactidão como métrica principal num problema desbalanceado.',
        'Achar que uma ROC-AUC de 0,95 garante poucos falsos alarmes.',
        'Não saber escrever precisão e recall em termos da matriz de confusão.',
      ],
      modulos: ['avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-ml-essencial-03',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Escolher o limiar de decisão pelo custo dos erros',
      enunciado:
        'Escreve uma função que, dados scores de um classificador, as etiquetas verdadeiras e o custo de um falso positivo e de um falso negativo, devolve o limiar que minimiza o custo total e a matriz de confusão correspondente. Escreve também as métricas a partir da matriz.',
      contexto:
        'Python puro, sem bibliotecas. Assinaturas: `metricas(tp, fp, fn, tn) -> dict[str, float]` e `melhor_limiar(scores: list[float], labels: list[int], custo_fp: float, custo_fn: float) -> tuple[float, float, tuple[int, int, int, int]]`. Prediz positivo se `score >= limiar`. Até 10^6 exemplos. Exemplo: detector de fraude de um banco móvel em que deixar passar uma fraude custa 500 MZN e bloquear uma transacção legítima custa 20 MZN.',
      minutos: 20,
      dica: 'Ordena uma vez por score decrescente: cada novo limiar só move um grupo de exemplos de um lado para o outro.',
      resposta: [
        {
          type: 'p',
          text: 'Ordeno por score decrescente e varro: cada limiar candidato é um score distinto, e ao descer o limiar os exemplos com esse score passam a positivos. Mantenho TP e FP acumulados, calculo FN e TN por diferença e o custo em O(1) por passo. Total **O(n log n)** pela ordenação, O(n) de memória.',
        },
        {
          type: 'code',
          lang: 'python',
          code: `from math import inf


def metricas(tp: int, fp: int, fn: int, tn: int) -> dict[str, float]:
    """Métricas a partir da matriz de confusão; divisão por zero dá 0.0."""
    def div(a: float, b: float) -> float:
        return a / b if b else 0.0

    precisao = div(tp, tp + fp)
    recall = div(tp, tp + fn)
    return {
        "precisao": precisao,
        "recall": recall,
        "f1": div(2 * precisao * recall, precisao + recall),
        "fpr": div(fp, fp + tn),
        "exactidao": div(tp + tn, tp + fp + fn + tn),
    }


def melhor_limiar(scores: list[float], labels: list[int],
                  custo_fp: float, custo_fn: float) -> tuple[float, float, tuple[int, int, int, int]]:
    """Limiar t (positivo se score >= t) que minimiza custo_fp*FP + custo_fn*FN.

    Devolve (t, custo, (tp, fp, fn, tn)). O(n log n): ordena uma vez e varre.
    t = inf significa «nunca marcar positivo».
    """
    if len(scores) != len(labels):
        raise ValueError("scores e labels com tamanhos diferentes")
    if not scores:
        raise ValueError("sem dados")
    if any(y not in (0, 1) for y in labels):
        raise ValueError("labels têm de ser 0 ou 1")

    pares = sorted(zip(scores, labels), key=lambda p: p[0], reverse=True)
    pos = sum(labels)
    neg = len(labels) - pos
    tp = fp = 0
    # Ponto de partida: ninguém é positivo, todos os positivos são FN.
    melhor = (inf, custo_fn * pos, (0, 0, pos, neg))
    i = 0
    while i < len(pares):
        t = pares[i][0]
        # Empates: todos os exemplos com o mesmo score mudam de lado juntos.
        while i < len(pares) and pares[i][0] == t:
            tp += pares[i][1]
            fp += 1 - pares[i][1]
            i += 1
        fn, tn = pos - tp, neg - fp
        custo = custo_fp * fp + custo_fn * fn
        if custo < melhor[1]:
            melhor = (t, custo, (tp, fp, fn, tn))
    return melhor


if __name__ == "__main__":
    # Fraude num banco móvel: deixar passar custa 500 MZN, bloquear por engano custa 20 MZN.
    scores = [0.95, 0.80, 0.80, 0.60, 0.40, 0.30, 0.20, 0.10, 0.05, 0.02]
    labels = [1,    1,    0,    1,    0,    1,    0,    0,    0,    0]
    t, custo, (tp, fp, fn, tn) = melhor_limiar(scores, labels, custo_fp=20, custo_fn=500)
    print(t, custo, (tp, fp, fn, tn))
    # 0.3 40 (4, 2, 0, 4)
    m = metricas(tp, fp, fn, tn)
    print({k: round(v, 3) for k, v in m.items()})
    # {'precisao': 0.667, 'recall': 1.0, 'f1': 0.8, 'fpr': 0.333, 'exactidao': 0.8}
    print(melhor_limiar(scores, labels, custo_fp=500, custo_fn=20))
    # (0.95, 60, (1, 0, 3, 6))
    print(round(20 / (20 + 500), 4))  # limiar teórico com probabilidades calibradas
    # 0.0385`,
        },
        {
          type: 'p',
          text: 'Casos-limite tratados: listas vazias ou de tamanhos diferentes, etiquetas fora de {0, 1}, empates de score (movem-se juntos, senão o limiar devolvido não reproduz a matriz), só uma classe presente (o limiar infinito ou o mínimo ganham naturalmente) e divisões por zero nas métricas. Com os custos invertidos o limiar sobe para 0,95: o mesmo modelo, outra decisão.',
        },
        {
          type: 'p',
          text: 'Se as probabilidades estiverem calibradas, nem preciso de varrer: marcar positivo compensa quando `p · C_FN > (1 − p) · C_FP`, isto é, `p > C_FP / (C_FP + C_FN)` — aqui 0,0385. Na prática os scores raramente estão calibrados, por isso varro num conjunto de validação e nunca no teste; para dados maiores uso `TunedThresholdClassifierCV` do scikit-learn com um scorer de custo.',
        },
        {
          type: 'p',
          text: 'Testes que escrevia: o exemplo acima; uma propriedade (o custo devolvido é igual a recalcular a matriz com o limiar devolvido); todos positivos e todos negativos; empates; e comparação com força bruta (testar todos os limiares em O(n²)) em listas aleatórias pequenas. Extensões prováveis: restrição de capacidade («a equipa só revê 200 alertas por dia»), custos por exemplo (o montante da transacção) e intervalo de confiança do custo por bootstrap.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — ajustar o limiar de decisão', url: 'https://scikit-learn.org/stable/modules/classification_threshold.html' },
            { label: 'scikit-learn — métricas de classificação', url: 'https://scikit-learn.org/stable/modules/model_evaluation.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Ordena uma vez e varre os limiares em O(n log n), sem recalcular a matriz para cada limiar.',
          'Trata empates de score movendo o grupo inteiro de uma vez.',
          'Inclui o limiar «nunca positivo» como candidato e trata divisões por zero nas métricas.',
          'Escreve a regra de decisão com probabilidades calibradas: t = C_FP / (C_FP + C_FN).',
          'Diz que o limiar se escolhe em validação e não no teste, e propõe teste contra força bruta.',
        ],
        fraco: 'Testa 100 limiares fixos entre 0 e 1 com um ciclo O(n) cada, ou optimiza F1 ignorando os custos dados.',
        solido: 'Solução O(n log n) correcta, com empates, casos-limite e o exemplo verificado.',
        excelente: 'Acrescenta a regra analítica com calibração, o teste de propriedade contra força bruta, e discute restrições de capacidade e custos por exemplo.',
      },
      seguimento: [
        'E se a equipa de revisão só aguentar 200 alertas por dia?',
        'Como mudava o código se o custo de um falso negativo fosse o montante da transacção?',
        'Porque é que o limiar óptimo no teu conjunto de validação pode não ser óptimo no mês seguinte?',
      ],
      sinaisAlarme: [
        'Usar 0,5 como limiar «porque é uma probabilidade».',
        'Escolher o limiar no conjunto de teste.',
        'Ignorar empates e devolver um limiar que não reproduz a matriz reportada.',
      ],
      modulos: ['avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-ml-essencial-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Calibração: quando 0,8 quer dizer 80%',
      enunciado:
        'O que significa um classificador estar calibrado, como o medes e como o corriges? E o LLM que diz «tenho 90% de certeza» — isso é uma probabilidade calibrada?',
      minutos: 5,
      dica: 'Junta todas as previsões com score perto de 0,8. Quantas eram positivas?',
      resposta: [
        {
          type: 'p',
          text: 'Um classificador está calibrado quando, entre os exemplos a que dá 0,8, cerca de 80% são positivos. Mede-se com um **diagrama de fiabilidade** (score médio por bin contra a fracção de positivos) e corrige-se com um mapeamento ajustado em validação: Platt (sigmoid), regressão isotónica ou temperature scaling. A confiança verbalizada por um LLM não é calibrada por construção; trato-a como uma feature, não como probabilidade.',
        },
        {
          type: 'p',
          text: 'Calibração importa sempre que uso o número e não só a ordem: escolher um limiar pela fórmula de custo, combinar scores de modelos diferentes, decidir quando encaminhar para humano, mostrar «confiança» a um operador. Para ordenar, um modelo descalibrado com boa ROC-AUC serve; para decidir com custos, não.',
        },
        {
          type: 'table',
          head: ['Método', 'Como funciona', 'Quando'],
          rows: [
            ['Platt (sigmoid)', 'Ajusta uma logística ao score', 'Poucos dados de validação; distorção em forma de S'],
            ['Isotónica', 'Função monótona por patamares', 'Mais de ~1 000 exemplos de validação; distorções arbitrárias; sobre-ajusta com poucos dados'],
            ['Temperature scaling', 'Divide os logits por um T aprendido', 'Redes neuronais; um só parâmetro, não muda a ordem'],
          ],
        },
        {
          type: 'p',
          text: 'Pontos práticos: a regressão logística tende a sair bem calibrada porque optimiza log-loss directamente, desde que a regularização esteja bem escolhida; random forests e SVMs tipicamente não. Guo et al. (2017) mostraram que redes neuronais modernas tendem a ser sobre-confiantes e que temperature scaling corrige bem a maioria dos casos. Para um LLM, se preciso de uma probabilidade, uso as log-probs do token de resposta quando a API as expõe, ou a concordância entre várias amostras, e calibro esse sinal contra etiquetas — e verifico de novo cada vez que o modelo muda.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Calibração não é estacionária',
          text: 'Um modelo calibrado em Janeiro deixa de estar quando a prevalência muda. Re-verifico o diagrama de fiabilidade em dados recentes etiquetados, e o Brier score sozinho não chega — mistura calibração com capacidade de separação.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — calibração de probabilidades', url: 'https://scikit-learn.org/stable/modules/calibration.html' },
            { label: 'Guo et al. (2017) — On Calibration of Modern Neural Networks', url: 'https://arxiv.org/abs/1706.04599' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define calibração em termos de frequência observada por nível de score.',
          'Descreve o diagrama de fiabilidade como forma de medir.',
          'Compara pelo menos dois métodos de correcção e diz quando cada um se aplica.',
          'Explica quando a calibração importa (decisões com custo, encaminhamento) e quando não (só ordenar).',
          'Diz que a confiança verbalizada do LLM não é uma probabilidade e propõe um sinal alternativo calibrado contra etiquetas.',
        ],
        fraco: '«Calibrado é quando o modelo tem boa exactidão.»',
        solido: 'Define, mede com diagrama de fiabilidade, corrige com Platt ou isotónica e distingue ordenar de decidir.',
        excelente: 'Acrescenta temperature scaling para redes, o tratamento da confiança do LLM via log-probs ou amostras, e a re-verificação quando a prevalência ou o modelo mudam.',
      },
      seguimento: [
        'Calibravas no mesmo conjunto onde escolhes o limiar?',
        'Como calibravas um classificador multiclasse de 35 intenções?',
        'Que forma tem o diagrama de fiabilidade de um modelo sobre-confiante?',
      ],
      sinaisAlarme: [
        'Usar a confiança verbalizada pelo LLM directamente como probabilidade.',
        'Calibrar no conjunto de teste.',
        'Confundir calibração com exactidão ou com ROC-AUC.',
      ],
      modulos: ['avaliacao-fundamentos', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-ml-essencial-05',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Overfitting e as formas de regularizar',
      enunciado:
        'O teu classificador tem 99% no treino e 81% na validação. O que está a acontecer e que alavancas tens para o corrigir?',
      minutos: 4,
      dica: 'Lista as alavancas por três famílias: o modelo, os dados e o processo de treino.',
      resposta: [
        {
          type: 'p',
          text: 'É **overfitting**: o modelo ajustou-se a particularidades do treino, incluindo ruído, que não generalizam. As alavancas são restringir a capacidade do modelo (regularização), dar-lhe mais e melhores dados, e parar o treino a tempo — sempre a decidir pela métrica de validação.',
        },
        {
          type: 'table',
          head: ['Família', 'Alavanca', 'O que faz'],
          rows: [
            ['Modelo', 'L2 (ridge, weight decay)', 'Penaliza pesos grandes; encolhe tudo um pouco'],
            ['Modelo', 'L1 (lasso)', 'Empurra pesos para zero; selecciona features'],
            ['Modelo', 'Menor capacidade', 'Árvores mais rasas, menos features, rank LoRA mais baixo'],
            ['Dados', 'Mais exemplos, limpeza de etiquetas, augmentation', 'Reduz a variância e o ruído que o modelo memoriza'],
            ['Treino', 'Early stopping, dropout', 'Pára quando a validação deixa de melhorar; impede co-adaptação'],
          ],
        },
        {
          type: 'p',
          text: 'Antes de regularizar, verifico se o fosso é real: 18 pontos podem ser fuga ao contrário (o treino tem duplicados que o modelo decora) ou uma validação de distribuição diferente — por exemplo, outro mês ou outro canal. Na regressão logística do scikit-learn, o `C` é o inverso da força da regularização; escolho-o por validação cruzada e olho para a curva de validação em função de `C`, que mostra a zona em que o modelo deixa de ser sub-ajustado e passa a sobre-ajustado.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'O mesmo vale para fine-tuning',
          text: 'Num LLM afinado com algumas centenas de exemplos, o sintoma é a loss de treino a descer e a de validação a subir a partir da segunda ou terceira época. Early stopping e um learning rate mais baixo são as primeiras alavancas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — modelos lineares e regularização', url: 'https://scikit-learn.org/stable/modules/linear_model.html' },
            { label: 'scikit-learn — curvas de validação e de aprendizagem', url: 'https://scikit-learn.org/stable/modules/learning_curve.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica overfitting pelo fosso treino-validação.',
          'Dá alavancas de pelo menos duas famílias (modelo, dados, treino).',
          'Distingue L1 de L2 pelo efeito nos pesos.',
          'Verifica primeiro se o fosso não vem de fuga ou de validação com distribuição diferente.',
        ],
        fraco: '«Treino mais épocas» ou «uso um modelo maior».',
        solido: 'Explica overfitting e propõe regularização, mais dados e early stopping com escolha por validação.',
        excelente: 'Acrescenta a verificação de fuga e de distribuição antes de agir, a curva de validação para escolher a força de regularização e a ponte para fine-tuning de LLMs.',
      },
      seguimento: [
        'Como escolhias o C da regressão logística?',
        'E se treino e validação estiverem ambos em 81%?',
        'O dropout afecta a inferência?',
      ],
      sinaisAlarme: [
        'Propor aumentar a capacidade do modelo para resolver overfitting.',
        'Escolher a regularização a olhar para o teste.',
        'Não distinguir L1 de L2.',
      ],
      modulos: ['engenharia-ia', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-ml-essencial-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Quando um classificador clássico bate um LLM',
      enunciado:
        'Precisas de classificar tickets de uma farmácia online em 12 categorias. Usavas um LLM com prompt, um classificador clássico ou as duas coisas? Defende com custo, latência e qualidade.',
      minutos: 7,
      dica: 'Quantos exemplos etiquetados tens, quantos pedidos por segundo, e as categorias mudam?',
      resposta: [
        {
          type: 'p',
          text: 'Com algumas centenas de exemplos etiquetados por classe e categorias estáveis, começo por **regressão logística sobre embeddings** ou gradient boosting: treina em segundos, serve em milissegundos por uma fracção do custo de uma chamada a um LLM, e dá probabilidades que se calibram. O LLM entra quando não tenho etiquetas, quando as categorias mudam muito, ou como recurso para os casos de baixa confiança.',
        },
        {
          type: 'compare',
          left: {
            title: 'Classificador clássico',
            items: [
              'Inferência: embedding (milissegundos num modelo pequeno) + produto interno; corre em CPU.',
              'Custo por pedido próximo de zero depois do embedding.',
              'Determinístico, versionável, fácil de auditar e de calibrar.',
              'Precisa de etiquetas; categorias novas exigem re-treino.',
              'Fraco quando a decisão exige ler contexto longo ou raciocinar sobre regras.',
            ],
          },
          right: {
            title: 'LLM com prompt',
            items: [
              'Zero ou poucos exemplos; categorias novas mudam-se no prompt.',
              'Centenas de milissegundos a segundos por pedido; custo por token.',
              'Lida com instruções complexas e explica a decisão.',
              'Não determinístico; confiança verbalizada não é calibrada.',
              'Mais difícil de manter estável quando o fornecedor muda de modelo.',
            ],
          },
        },
        {
          type: 'p',
          text: 'Na prática faço três coisas. Primeiro meço: o mesmo dourado para os dois, com macro-F1 e recall das classes críticas (aqui, «reacção adversa» e «receita controlada»). Segundo, se não tenho etiquetas, uso o LLM para etiquetar alguns milhares de tickets, reviso uma amostra, e treino o clássico nessas etiquetas — o SetFit (Tunstall et al., 2022) mostra que afinar um sentence-transformer com poucos pares e uma cabeça logística dá bons resultados com muito poucos exemplos. Terceiro, sirvo em cascata: o clássico decide quando a probabilidade calibrada está acima de um limiar; abaixo, vai ao LLM; as classes críticas têm regras que forçam revisão.',
        },
        {
          type: 'p',
          text: 'Trade-off a dizer em voz alta: o clássico perde quando a fronteira entre classes depende de regras longas que mudam (por exemplo, a política de devoluções de medicamentos). Aí o LLM com a regra no prompt é mais barato de manter do que re-etiquetar a cada mudança.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O LLM como martelo',
          text: 'Mandar 200 000 tickets por dia a um modelo médio para escolher uma de 12 etiquetas é pagar geração para fazer classificação. Pergunta sempre qual é o baseline barato e por quanto o LLM o bate.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Tunstall et al. (2022) — SetFit: Efficient Few-Shot Learning Without Prompts', url: 'https://arxiv.org/abs/2209.11055' },
            { label: 'scikit-learn — modelos lineares', url: 'https://scikit-learn.org/stable/modules/linear_model.html' },
            { label: 'scikit-learn — ensembles e gradient boosting', url: 'https://scikit-learn.org/stable/modules/ensemble.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Começa por perguntar ou assumir quantas etiquetas há, volume e estabilidade das categorias.',
          'Compara custo, latência, calibração e manutenção das duas opções com ordens de grandeza.',
          'Propõe medir os dois no mesmo dourado com macro-F1 e recall das classes críticas.',
          'Propõe usar o LLM para etiquetar e treinar o clássico quando faltam etiquetas.',
          'Propõe uma cascata com limiar de confiança e regras para classes críticas.',
        ],
        fraco: 'Escolhe o LLM «porque é mais inteligente» ou o clássico «porque é mais barato», sem medir.',
        solido: 'Compara as duas opções nas dimensões certas e propõe medir no mesmo dourado.',
        excelente: 'Acrescenta o LLM como etiquetador, a cascata com limiar calibrado e o critério de quando o LLM é mais barato de manter (regras longas que mudam).',
      },
      seguimento: [
        'Que modelo de embeddings usavas e como sabias que é bom para português?',
        'Como escolhias o limiar da cascata?',
        'E se aparecer uma 13.ª categoria amanhã?',
      ],
      sinaisAlarme: [
        'Não considerar um baseline clássico.',
        'Descartar o LLM sem pensar no custo de etiquetar.',
        'Comparar os dois em conjuntos de teste diferentes.',
      ],
      modulos: ['escolher-modelo', 'embeddings', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-ml-essencial-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Testes A/B: tamanho de amostra e o problema de espreitar',
      enunciado:
        'Queres testar um prompt novo do assistente contra o actual, medindo a taxa de conversas resolvidas sem humano. Como dimensionas o teste e porque é que não deves pará-lo no dia em que o p-valor fica abaixo de 0,05?',
      minutos: 6,
      dica: 'O p-valor flutua durante o teste. Quantas oportunidades lhe dás de cruzar 0,05 por acaso?',
      resposta: [
        {
          type: 'p',
          text: 'Dimensiono antes de começar a partir do **efeito mínimo que me interessa detectar**, do nível de significância e da potência, e corro até atingir esse tamanho. Parar no primeiro p < 0,05 (peeking) inflaciona o falso positivo: com 10 espreitadelas, a taxa de 5% passa para perto de 20%. Se preciso de parar cedo, uso um método sequencial desenhado para isso.',
        },
        {
          type: 'p',
          text: 'Para proporções, o tamanho por braço é aproximadamente `n ≈ (z_α/2 + z_β)² · [p1(1−p1) + p2(1−p2)] / δ²`. Com taxa actual de 10%, efeito mínimo de 1 ponto (10% → 11%), α = 0,05 bilateral e potência de 0,8 (z de 1,96 e 0,84), dá cerca de **14 750 conversas por braço**. Se o assistente tem 1 500 conversas por dia e divido 50/50, são uns 20 dias. Isto obriga à conversa certa com o produto: ou aceitamos detectar só efeitos de 2 pontos (cerca de quatro vezes menos amostra), ou esperamos.',
        },
        {
          type: 'p',
          text: 'Sobre o peeking: simulei testes A/A (sem diferença real) com 5 e 10 verificações intermédias e paragem no primeiro p < 0,05; a taxa de falsos positivos ficou perto de 14% e 20%, respectivamente, em vez de 5%. Johari et al. propõem inferência «sempre válida» (testes sequenciais) para quem precisa de olhar continuamente; a alternativa simples é fixar o tamanho e só decidir no fim, com monitorização apenas de guardrails (erros, latência, custo).',
        },
        {
          type: 'list',
          items: [
            '**Unidade de aleatorização**: o utilizador, não a mensagem — senão a mesma pessoa vê os dois prompts e as observações deixam de ser independentes.',
            '**Uma métrica primária** decidida antes; as secundárias são exploratórias (testar 20 métricas dá uma «significativa» por acaso).',
            '**Efeito de novidade e sazonalidade**: correr pelo menos semanas completas.',
            '**Teste A/A** de vez em quando para validar a infra-estrutura de atribuição.',
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'Offline antes de online',
          text: 'Um A/B custa semanas de tráfego. O prompt novo só entra no A/B se já passou o gate offline no dourado; o A/B responde à pergunta que o offline não responde — o efeito nos utilizadores reais.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Johari, Pekelis e Walsh — Always Valid Inference: Bringing Sequential Analysis to A/B Testing', url: 'https://arxiv.org/abs/1512.04922' },
            { label: 'Python — statistics.NormalDist (quantis z)', url: 'https://docs.python.org/3/library/statistics.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Dimensiona a partir do efeito mínimo detectável, α e potência, antes de começar.',
          'Faz a conta de ordem de grandeza (milhares por braço para 1 ponto sobre 10%) e converte em dias de tráfego.',
          'Explica que espreitar e parar no primeiro p < 0,05 inflaciona o falso positivo, com ordem de grandeza.',
          'Menciona testes sequenciais como alternativa legítima a parar cedo.',
          'Aleatoriza por utilizador e fixa uma métrica primária.',
        ],
        fraco: '«Corro uma semana e vejo se é significativo.»',
        solido: 'Calcula o tamanho de amostra, explica o peeking e fixa a métrica primária.',
        excelente: 'Acrescenta a conversa de produto sobre efeito mínimo vs duração, testes sequenciais, unidade de aleatorização, testes A/A e a relação com o gate offline.',
      },
      seguimento: [
        'Como mudava o tamanho de amostra se quisesses detectar uma descida, não uma subida?',
        'O que fazes se o prompt novo melhora a resolução mas aumenta o custo por conversa em 30%?',
        'Como lidavas com utilizadores que falam com o assistente várias vezes por semana?',
      ],
      sinaisAlarme: [
        'Parar o teste quando o p-valor «finalmente» fica abaixo de 0,05.',
        'Aleatorizar por mensagem num assistente conversacional.',
        'Não saber de que depende o tamanho de amostra.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-ml-essencial-08',
      tipo: 'conceito',
      nivel: 'staff',
      titulo: 'Data drift e concept drift: detectar e responder',
      enunciado:
        'Qual é a diferença entre data drift e concept drift? Como os detectavas num classificador de intenções em produção e o que fazias quando um alarme dispara?',
      minutos: 6,
      dica: 'Qual dos dois consegues ver sem etiquetas?',
      resposta: [
        {
          type: 'p',
          text: '**Data drift** é mudar a distribuição dos inputs, P(X): mensagens mais longas, outra língua, um canal novo. **Concept drift** é mudar a relação entre input e resposta certa, P(Y dado X): a mesma mensagem passa a ter outra etiqueta correcta, porque o produto ou a política mudou. O primeiro detecta-se sem etiquetas; o segundo exige etiquetas ou um sinal de negócio.',
        },
        {
          type: 'p',
          text: 'Um exemplo de concept drift num operador móvel: «quero cancelar o pacote» era a intenção *cancelamento*; quando a empresa lança a migração de pacote, a resposta certa passa a ser *mudança de plano*. Os inputs não mudaram nada e a exactidão cai. Data drift sem concept drift pode não fazer mal nenhum — uma campanha traz mais perguntas de saldo, o modelo continua certo.',
        },
        {
          type: 'table',
          head: ['Sinal', 'Detecta', 'Precisa de etiquetas', 'Custo'],
          rows: [
            ['Distância entre distribuições de features ou de embeddings (janela actual vs referência)', 'Data drift', 'Não', 'Baixo, contínuo'],
            ['Distribuição das previsões e da confiança', 'Ambos, indirectamente', 'Não', 'Baixo'],
            ['Concordância com um modelo de referência (por exemplo, o LLM que serviu de professor) numa amostra', 'Ambos', 'Não (proxy)', 'Médio'],
            ['Métrica em amostra etiquetada semanalmente', 'Concept drift', 'Sim', 'Alto, mas é o único sinal directo'],
            ['KPIs de negócio: transferências para humano, reaberturas', 'Efeito real', 'Não', 'Já existe'],
          ],
        },
        {
          type: 'p',
          text: 'Quando um alarme dispara, a resposta depende do tipo. Data drift: vejo que segmento mudou (canal, língua, comprimento), avalio o modelo nessa fatia com etiquetas novas, e só re-treino se o desempenho na fatia cair. Concept drift: é quase sempre uma mudança de negócio — falo com quem a fez, actualizo a definição das etiquetas e o dourado, re-etiqueto os exemplos afectados e re-treino. Em ambos, há uma decisão rápida possível: baixar a cobertura do modelo (subir o limiar de confiança) e mandar mais casos ao recurso enquanto se corrige.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Ligar o ML ao calendário da empresa',
          text: 'A forma mais barata de detectar concept drift é saber dos lançamentos antes de acontecerem. Peço para estar no circuito de mudanças de produto e política; cada mudança relevante gera exemplos novos no dourado antes de ir para produção.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Lu et al. — Learning under Concept Drift: A Review', url: 'https://arxiv.org/abs/2004.05785' },
            { label: 'Google — Rules of Machine Learning', url: 'https://developers.google.com/machine-learning/guides/rules-of-ml' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define data drift como mudança em P(X) e concept drift como mudança em P(Y dado X).',
          'Diz que concept drift só se detecta directamente com etiquetas ou sinais de negócio.',
          'Propõe sinais concretos de monitorização para cada tipo, com custo.',
          'Diferencia a resposta: avaliar a fatia antes de re-treinar vs actualizar definições e dourado.',
          'Propõe uma mitigação imediata (subir o limiar, mais casos ao recurso) e a ligação a mudanças de negócio.',
        ],
        fraco: '«Drift é quando o modelo piora; re-treino todos os meses.»',
        solido: 'Distingue os dois, propõe monitorização sem e com etiquetas e re-treino quando o desempenho cai.',
        excelente: 'Acrescenta que data drift pode ser inofensivo, a mitigação por cobertura, o proxy de concordância com um modelo de referência e o processo organizacional de saber das mudanças antes.',
      },
      seguimento: [
        'Que métrica de distância usavas para embeddings e com que janela?',
        'Quantas mensagens etiquetavas por semana e como as escolhias?',
        'Como evitavas alarmes falsos todas as segundas-feiras?',
      ],
      sinaisAlarme: [
        'Tratar qualquer mudança de distribuição como razão para re-treinar.',
        'Achar que concept drift se detecta só olhando para os inputs.',
        'Não ter uma acção imediata além de «re-treinar».',
      ],
      modulos: ['observabilidade-llmops', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-ml-essencial-09',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Bias-variance: mais dados, mais features ou modelo maior',
      enunciado:
        'Tens orçamento para uma de três coisas: etiquetar mais 5 000 exemplos, passar para um modelo de embeddings maior, ou afinar o classificador. Como decides onde investir antes de gastar?',
      minutos: 7,
      dica: 'Uma curva de aprendizagem diz-te o que acontece se tiveres mais dados — antes de os teres.',
      resposta: [
        {
          type: 'p',
          text: 'Decido com **curvas de aprendizagem**: treino com fracções crescentes dos dados que já tenho e vejo como evoluem o erro de treino e o de validação. Se a validação ainda está a melhorar e há fosso para o treino, o problema é variância e mais dados ajudam. Se as duas curvas estão juntas e altas, é viés — mais dados não ajudam; preciso de um modelo ou de features com mais capacidade.',
        },
        {
          type: 'p',
          text: 'O enquadramento é a decomposição bias-variance: o erro esperado é viés ao quadrado (o modelo não consegue representar a relação), mais variância (sensibilidade à amostra de treino concreta), mais ruído irredutível (etiquetas inconsistentes, mensagens genuinamente ambíguas). O ruído é o terceiro factor que costumo medir: se dois anotadores só concordam em 85% dos casos, nenhum modelo vai passar muito disso contra um só anotador.',
        },
        {
          type: 'table',
          head: ['O que a curva mostra', 'Diagnóstico', 'Onde investir'],
          rows: [
            ['Validação a subir com mais dados, fosso grande para o treino', 'Variância', 'Etiquetar mais; regularizar'],
            ['Treino e validação juntos e baixos', 'Viés', 'Embeddings maiores, features novas, modelo com mais capacidade'],
            ['Validação estagnada perto da concordância entre anotadores', 'Ruído', 'Rever a definição das etiquetas, não mais volume'],
            ['Validação boa no geral mas fraca em 3 classes', 'Cobertura', 'Etiquetar só essas classes (aprendizagem activa)'],
          ],
        },
        {
          type: 'p',
          text: 'Antes de gastar, faço experiências baratas: a curva com 10%, 25%, 50% e 100% dos dados; a mesma regressão logística sobre os embeddings maiores (custa um re-embedding do conjunto, não do corpus); e a concordância entre dois anotadores em 200 exemplos. Com isto estimo o ganho de cada opção e comparo com o custo — 5 000 etiquetas a um minuto cada são mais de 80 horas de especialista.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mais dados não curam viés',
          text: 'Se o modelo não separa duas classes no treino, duplicar os exemplos não muda nada. A curva diz isso em uma tarde; o orçamento de anotação gasta-se em semanas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — curvas de validação e de aprendizagem', url: 'https://scikit-learn.org/stable/modules/learning_curve.html' },
            { label: 'Google — Rules of Machine Learning', url: 'https://developers.google.com/machine-learning/guides/rules-of-ml' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe curvas de aprendizagem para decidir antes de gastar.',
          'Lê as curvas: fosso e validação a subir é variância; curvas juntas e altas é viés.',
          'Inclui o ruído das etiquetas e propõe medir a concordância entre anotadores.',
          'Propõe experiências baratas para estimar o ganho de cada opção.',
          'Compara o ganho estimado com o custo (horas de anotação, re-embedding).',
        ],
        fraco: 'Escolhe «mais dados» por omissão, sem diagnóstico.',
        solido: 'Usa curvas de aprendizagem para distinguir viés de variância e escolhe a opção correspondente.',
        excelente: 'Acrescenta o ruído irredutível medido pela concordância entre anotadores, a anotação dirigida a classes fracas e a conta de custo de cada opção.',
      },
      seguimento: [
        'Como farias a curva de aprendizagem com um LLM com few-shot em vez de um classificador treinado?',
        'Se a concordância entre anotadores for 80%, que tecto esperas para o modelo?',
        'Como escolhias os 5 000 exemplos a etiquetar?',
      ],
      sinaisAlarme: [
        'Gastar o orçamento de anotação sem olhar para a curva de aprendizagem.',
        'Ignorar o ruído das etiquetas como limite.',
        'Confundir viés estatístico com enviesamento social sem esclarecer o termo.',
      ],
      modulos: ['engenharia-ia', 'embeddings', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-ml-essencial-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'Métricas excelentes offline e más em produção',
      enunciado:
        'O modelo que prevê se um ticket vai escalar para reclamação formal teve 0,93 de precisão e 0,88 de recall offline. Em produção, a equipa diz que a maioria dos alertas é falsa. O que investigas?',
      contexto:
        'Empresa de logística. Treino com 40 000 tickets de 18 meses, split aleatório, conjunto de teste balanceado por amostragem (50% escalados). Em produção cerca de 3% dos tickets escalam. Features: texto do primeiro email (embedding), categoria, tempo até primeira resposta, número de contactos do cliente, e a coluna `prioridade` do CRM. Limiar de 0,5. Na primeira semana, 1 200 alertas, dos quais a equipa confirmou 190.',
      minutos: 12,
      dica: 'Começa pela conta: que precisão esperarias em produção com aquela matriz e 3% de prevalência?',
      resposta: [
        {
          type: 'p',
          text: 'A causa mais provável é **aritmética, não do modelo**: a precisão de 0,93 foi medida num teste com 50% de positivos e em produção há 3%. Com o mesmo recall e taxa de falsos positivos, a precisão esperada cai para perto de 0,3. Depois disso suspeito de fuga em `prioridade` e no split aleatório, que inflacionam tudo o resto.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Refazer a conta com a prevalência real', text: 'Precisão 0,93 com recall 0,88 num teste balanceado implica FPR ≈ 0,88 × (1 − 0,93) / 0,93 ≈ 0,066. Com 3% de prevalência: 0,88 × 0,03 / (0,88 × 0,03 + 0,066 × 0,97) ≈ 0,29. Os 190 confirmados em 1 200 alertas dão 0,16 — pior ainda, logo há mais alguma coisa.' },
            { title: 'Procurar features do futuro', text: 'Verifico quando é que `prioridade` é preenchida no CRM. Se um agente a sobe para «alta» depois de o cliente ameaçar reclamar, no histórico ela já contém a resposta; em produção, no momento da previsão, ainda está vazia ou em «normal». O mesmo para «número de contactos» se foi lido no fim do ticket e não no momento da previsão. Comparo a distribuição de cada feature no treino e nos pedidos reais.' },
            { title: 'Refazer o teste com split temporal', text: 'Treino nos primeiros 15 meses, testo nos últimos 3, com a prevalência natural e features reconstruídas como estavam no momento da previsão. Este é o número honesto, e espero que fique perto do de produção.' },
            { title: 'Training-serving skew', text: 'Confirmo que o embedding em produção usa o mesmo modelo e o mesmo pré-processamento (assinatura removida, só o primeiro email, mesmo truncamento) que no treino, comparando vectores para os mesmos tickets.' },
            { title: 'Escolher o limiar com custos', text: 'Com o número honesto, escolho o limiar pelo custo: quanto custa um alerta falso à equipa e quanto custa uma reclamação formal não prevenida. Talvez o modelo só valha a pena no topo, com um limiar alto e 100 alertas por dia.' },
          ],
        },
        {
          type: 'p',
          text: 'Causa provável: prevalência artificial no teste somada a fuga pela coluna `prioridade` (point-in-time incorrecto) e a um split aleatório num problema temporal. Correcção: remover ou reconstruir as features com o valor no momento da previsão, re-treinar, avaliar com split temporal e prevalência natural, e escolher o limiar por custo em validação.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'As features passam a vir de um único código partilhado entre treino e serving, com timestamps de quando cada valor ficou disponível. O relatório de avaliação reporta sempre precisão à prevalência de produção, e a precisão real dos alertas confirmados entra num painel semanal com alarme.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — armadilhas comuns e data leakage', url: 'https://scikit-learn.org/stable/common_pitfalls.html' },
            { label: 'Google — Rules of Machine Learning (training-serving skew)', url: 'https://developers.google.com/machine-learning/guides/rules-of-ml' },
            { label: 'scikit-learn — ajustar o limiar de decisão', url: 'https://scikit-learn.org/stable/modules/classification_threshold.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Recalcula a precisão esperada com a prevalência de produção a partir de recall e FPR.',
          'Suspeita de features preenchidas depois do evento (prioridade, contactos) e propõe verificar quando são escritas.',
          'Propõe refazer a avaliação com split temporal e prevalência natural.',
          'Verifica training-serving skew no pré-processamento e no embedding.',
          'Propõe escolher o limiar pelo custo dos erros e um processo que impeça a regressão.',
        ],
        fraco: 'Culpa drift e propõe re-treinar com dados mais recentes.',
        solido: 'Identifica o efeito da prevalência e a fuga pela coluna de prioridade, e refaz a avaliação com split temporal.',
        excelente: 'Faz a conta completa, nota que o número real (0,16) ainda é pior do que a prevalência explica, encontra a fuga point-in-time e o skew, e fecha com features partilhadas com timestamps e monitorização da precisão real.',
      },
      seguimento: [
        'Como reconstruías o valor de uma feature no momento da previsão a partir do CRM?',
        'Se a equipa só consegue tratar 100 alertas por dia, como mudas a avaliação?',
        'Que painel punhas para a equipa de operações?',
      ],
      sinaisAlarme: [
        'Não ligar a queda de precisão à diferença de prevalência.',
        'Propor re-treinar antes de perceber a causa.',
        'Usar features sem saber em que momento são preenchidas.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },
  ],
};
