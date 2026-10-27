/* PADRÃO DE QUALIDADE para quem escreve tópicos de entrevista.
   Não é carregado pela aplicação. Mostra a densidade, o tom e a estrutura
   esperados de uma pergunta `conceito` e de uma pergunta `debug`.        */

import type { PerguntaEntrevista } from '../types';

export const exemplos: PerguntaEntrevista[] = [
  {
    id: 'p-exemplo-01',
    tipo: 'conceito',
    nivel: 'senior',
    titulo: 'Porque é que o RRF funde por posição e não por score',
    enunciado:
      'Tens um retriever denso e um BM25 e queres combinar os resultados. Porque é que tanta gente usa Reciprocal Rank Fusion em vez de somar os scores?',
    minutos: 4,
    dica: 'Pensa no que significa um score de 0,82 num e de 14,3 no outro.',
    resposta: [
      {
        type: 'p',
        text: 'Porque os scores dos dois retrievers **não vivem na mesma escala nem têm a mesma distribuição**, e a posição tem. O RRF soma `1 / (k + rank)` de cada lista, com `k` tipicamente 60, e assim funde sem calibrar nada.',
      },
      {
        type: 'p',
        text: 'O cosseno de um modelo de embeddings fica normalmente concentrado numa banda estreita (muitas vezes entre 0,6 e 0,9 para tudo o que é minimamente relacionado), enquanto o BM25 não tem limite superior e depende do comprimento do documento, da frequência dos termos e do tamanho do corpus. Somar os dois é dar ao BM25 um peso implícito que muda de consulta para consulta. Normalizar com min-max por consulta ajuda, mas é sensível a outliers e ao tamanho da lista.',
      },
      {
        type: 'p',
        text: 'O `k` suaviza a diferença entre os primeiros lugares: com `k = 60`, o 1.º lugar vale 1/61 e o 10.º vale 1/70 — um documento que aparece em 3.º nas duas listas bate um que aparece em 1.º numa e não aparece na outra. É exactamente o comportamento que queremos quando cada retriever falha em sítios diferentes: o denso falha em códigos, números e nomes próprios; o lexical falha em sinónimos e paráfrases.',
      },
      {
        type: 'table',
        head: ['Fusão', 'Precisa de calibrar', 'Quando faz sentido'],
        rows: [
          ['RRF', 'Não', 'Ponto de partida por omissão; robusto e sem parâmetros sensíveis'],
          ['Soma ponderada de scores normalizados', 'Sim, por domínio', 'Quando há um conjunto avaliado para afinar o peso e os scores são estáveis'],
          ['Re-ranking com cross-encoder', 'Não (mas custa latência)', 'Depois da fusão, sobre os 20–50 primeiros, quando a precisão no topo paga ~50–200 ms'],
        ],
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Fundir e não medir',
        text: 'O RRF não garante melhoria. Em produção comparo recall@k e MRR das três variantes (denso, lexical, híbrido) no conjunto dourado antes de ligar a fusão — pode subir o recall e baixar o MRR, e com 1 chunk no contexto é o MRR que importa.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Cormack, Clarke e Büttcher (2009) — Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods', url: 'https://dl.acm.org/doi/10.1145/1571941.1572114' },
          { label: 'Qdrant — consultas híbridas e fusão', url: 'https://qdrant.tech/documentation/concepts/hybrid-queries/' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Diz que os scores do denso e do BM25 estão em escalas diferentes e não comparáveis.',
        'Escreve a fórmula 1/(k + rank) e explica o papel de k.',
        'Explica porque é que denso e lexical falham em sítios diferentes (e por isso a fusão ajuda).',
        'Menciona que a fusão tem de ser validada com métricas de recuperação num conjunto avaliado.',
      ],
      fraco: '«Porque o RRF é melhor» ou «porque é mais rápido», sem falar de escalas nem da fórmula.',
      solido: 'Explica o problema das escalas, a fórmula e o efeito de k, e compara com soma ponderada normalizada.',
      excelente: 'Acrescenta quando a soma ponderada ganha (scores calibrados e conjunto para afinar), coloca o re-ranker depois da fusão com custo em latência, e decide pela métrica certa (recall vs MRR) conforme quantos chunks entram no contexto.',
    },
    seguimento: [
      'O que acontece ao RRF se um dos retrievers devolver só 5 resultados e o outro 100?',
      'Como escolherias o k sem conjunto dourado?',
      'Onde metes o re-ranker e quantos candidatos lhe passas?',
    ],
    sinaisAlarme: [
      'Somar cosseno com BM25 «porque ambos são relevância».',
      'Não saber dizer em que tipo de consulta cada retriever falha.',
      'Propor híbrido sem dizer como se mede se ajudou.',
    ],
    modulos: ['pesquisa-hibrida', 'avaliar-rag'],
  },
  {
    id: 'p-exemplo-02',
    tipo: 'debug',
    nivel: 'senior',
    titulo: 'O recall subiu e as queixas também',
    enunciado:
      'Mudaste o chunking de 1000 para 300 tokens. O recall@5 no conjunto dourado subiu de 0,82 para 0,91, mas as queixas de «resposta incompleta» duplicaram na semana seguinte. O que se passa e como confirmas?',
    contexto:
      'Assistente de suporte com RAG, 214 documentos de políticas, k = 5 chunks no contexto, modelo médio. O conjunto dourado tem 240 perguntas anotadas com o documento relevante (não o chunk). Os traços guardam a consulta, os chunks recuperados e a resposta.',
    minutos: 10,
    dica: 'O que é que o conjunto dourado mede exactamente — documento ou passagem completa?',
    resposta: [
      {
        type: 'p',
        text: 'A hipótese mais provável é que **a métrica mede a coisa errada**: o dourado conta um acerto quando *algum* chunk do documento certo aparece no top-5, e com chunks de 300 tokens isso é mais fácil — mas a resposta precisa de várias partes do documento (condições, excepções, prazos) que agora ficam espalhadas por chunks que não entram todos no top-5.',
      },
      {
        type: 'steps',
        items: [
          { title: 'Confirmar com os traços', text: 'Amostro 30–50 conversas com queixa e vejo, para cada uma, que chunks entraram no contexto e que partes do documento a resposta precisava. Se faltam as excepções ou a segunda condição, está confirmado.' },
          { title: 'Medir ao nível certo', text: 'Anoto as passagens necessárias (não só o documento) num subconjunto e meço *context recall* — fracção das passagens necessárias que chegaram ao contexto. Espero ver este número a descer com os 300 tokens, apesar de o recall@5 de documento subir.' },
          { title: 'Excluir as outras hipóteses', text: 'Verifico que não mudou mais nada no mesmo deploy (prompt, modelo, k, limiar de score) e que as queixas não vêm de uma intenção nova ou de um documento actualizado nessa semana.' },
        ],
      },
      {
        type: 'p',
        text: 'Correcções, por ordem de custo: recuperar com chunks pequenos mas **entregar o pai** (parent-document retrieval: procura no chunk de 300, injecta a secção de ~1000); ou expandir para os chunks vizinhos do mesmo documento; ou subir k com um re-ranker para manter o contexto curto. Escolho pela métrica nova e pelo custo em tokens por conversa.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Impedir a regressão',
        text: 'O gate de CI passa a ter duas métricas de recuperação — recall@k ao nível do documento e context recall ao nível da passagem — e uma métrica de geração (completude ou faithfulness avaliada por juiz calibrado). Uma alteração de chunking só passa se nenhuma descer além do intervalo de confiança.',
      },
      {
        type: 'refs',
        items: [
          { label: 'RAGAS — métricas de context recall e precision', url: 'https://docs.ragas.io/en/stable/' },
          { label: 'LangChain — text splitters', url: 'https://docs.langchain.com/oss/python/integrations/splitters/index' },
        ],
      },
    ],
    rubrica: {
      criterios: [
        'Suspeita da métrica antes de suspeitar do modelo: o dourado mede documento, não passagem.',
        'Propõe confirmar com amostras de traços antes de mudar código.',
        'Exclui causas concorrentes (outras mudanças no deploy, sazonalidade, documentos novos).',
        'Propõe uma correcção concreta (parent-document, vizinhos, re-ranking) com o custo associado.',
        'Altera o gate de avaliação para apanhar este tipo de regressão.',
      ],
      fraco: 'Culpa o modelo ou propõe voltar aos 1000 tokens sem explicar porque é que a métrica subiu.',
      solido: 'Identifica que a granularidade da anotação esconde o problema, confirma com traços e propõe parent-document retrieval.',
      excelente: 'Acrescenta a métrica ao nível da passagem, controla variáveis concorrentes, quantifica o custo em tokens de cada correcção e muda o gate de CI para que a regressão não volte.',
    },
    seguimento: [
      'Como anotarias passagens necessárias sem gastar semanas?',
      'Que tamanho de pai escolhias e como o validavas?',
      'E se o juiz de completude discordar dos humanos em 20% dos casos?',
    ],
    sinaisAlarme: [
      'Confiar no número porque «subiu, logo está melhor».',
      'Mudar três coisas de uma vez para ver se resolve.',
      'Não olhar para nenhum traço real.',
    ],
    modulos: ['ingestao-chunking', 'avaliar-rag', 'rag-avancado'],
  },
];
