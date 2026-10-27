import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'rag-falhas',
  numero: 12,
  bloco: 'rag',
  titulo: 'RAG de ponta a ponta e modos de falha',
  resumo:
    'O pipeline indexar, recuperar, aumentar e gerar, e o que fazer quando a resposta sai errada: distinguir falha de recuperação de falha de síntese, validar citações, recusar sem suporte e escolher entre RAG, contexto longo e fine-tuning. É o tema mais perguntado em vagas de AI engineer aplicado.',
  icon: '🧩',
  modulos: ['rag-basico', 'langchain-rag', 'avaliar-rag'],
  essencial: [
    'RAG (Lewis et al., 2020): condicionar a geração em passagens recuperadas de um índice externo, em vez de depender só dos parâmetros do modelo.',
    'Quatro fases, quatro sítios para falhar: indexar (o conteúdo nunca entrou), recuperar (entrou mas não veio), aumentar (veio mas foi cortado ou afogado), gerar (estava lá e o modelo errou).',
    'Diagnóstico pelo traço: a passagem certa estava no contexto? Se não, é recuperação ou ingestão; se sim, é síntese.',
    'Métricas separadas: recall@k e context recall para recuperação; faithfulness e correcção da resposta para geração.',
    'Uma citação válida aponta para um id que estava no contexto **e** o texto citado sustenta a frase. A segunda parte só se verifica depois da geração.',
    'Recusar sem suporte combina três camadas: limiar de recuperação, instrução explícita e verificação pós-geração; cada uma tem falsos positivos.',
    'Lost in the Middle (Liu et al., 2023): o desempenho cai quando a informação relevante está no meio de contextos longos. Ordem e quantidade importam.',
    'Contexto longo não substitui RAG quando o corpus é maior que a janela, muda todos os dias, tem permissões por utilizador ou custo por pergunta importa.',
    'Fine-tuning ensina formato e comportamento; RAG dá factos actualizáveis e citáveis. Para conhecimento novo, RAG ganha (Ovadia et al., 2023).',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-rag-falhas-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O pipeline RAG de ponta a ponta, fase a fase',
      enunciado:
        'Explica-me um sistema RAG do princípio ao fim, como se eu fosse um engenheiro backend que nunca construiu um. O que acontece offline e o que acontece em cada pergunta?',
      minutos: 4,
      dica: 'Separa o caminho de escrita do caminho de leitura, como num sistema de pesquisa.',
      resposta: [
        {
          type: 'p',
          text: 'RAG é **pesquisa seguida de geração**: em vez de esperar que o modelo saiba a resposta, recupero passagens relevantes de um índice e ponho-as no prompt, pedindo que responda com base nelas e cite. Tem um caminho offline (indexar) e um caminho por pedido (recuperar, aumentar, gerar).',
        },
        {
          type: 'steps',
          items: [
            { title: 'Indexar (offline)', text: 'Carregar documentos, limpar, partir em chunks, calcular embeddings e guardar vector, texto e metadados (fonte, ACL, vigência) num índice vectorial, normalmente com um índice lexical ao lado.' },
            { title: 'Recuperar (por pedido)', text: 'Transformar a pergunta (reescrita opcional), calcular o embedding, pesquisar os k vizinhos mais próximos com filtros de metadados, opcionalmente fundir com BM25 e re-ordenar com um cross-encoder.' },
            { title: 'Aumentar', text: 'Montar o prompt: instruções, os chunks seleccionados com ids e fontes, histórico relevante e a pergunta, dentro de um orçamento de tokens.' },
            { title: 'Gerar', text: 'O modelo produz a resposta condicionada no contexto, com citações para os ids; depois valido as citações e decido se mostro, recuso ou escalo.' },
          ],
        },
        {
          type: 'p',
          text: 'Para um engenheiro backend a analogia útil é: a ingestão é um ETL com idempotência e apagamentos; a recuperação é uma consulta com índice e filtros; o prompt é a vista que se renderiza; e o modelo é um componente não determinístico que precisa de validação à saída. Cada fase tem a sua métrica, e é isso que permite saber onde está o erro quando a resposta sai mal.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A frase que tens de dizer',
          text: 'O modelo só pode usar o que chega ao contexto. Se a passagem certa não está lá, nenhum prompt resolve; se está lá e a resposta sai errada, mudar o retriever não resolve.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Lewis et al. (2020) — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', url: 'https://arxiv.org/abs/2005.11401' },
            { label: 'LangChain — RAG', url: 'https://docs.langchain.com/oss/python/langchain/rag' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa o caminho offline (indexar) do caminho por pedido (recuperar, aumentar, gerar).',
          'Menciona metadados e filtros na recuperação, não só similaridade.',
          'Menciona orçamento de tokens na fase de aumentar.',
          'Inclui validação depois da geração (citações, recusa).',
        ],
        fraco: 'Descreve RAG como «meter os documentos no ChatGPT», sem separar fases.',
        solido: 'Descreve as quatro fases com os componentes de cada uma.',
        excelente: 'Acrescenta a métrica de cada fase e a regra de diagnóstico (a passagem estava ou não no contexto) que permite localizar falhas.',
      },
      seguimento: [
        'Onde metes o re-ranker e porquê nessa posição?',
        'O que fazes quando a pergunta é de seguimento («e para cartões?»)?',
        'Que parte deste pipeline é mais cara em latência?',
      ],
      sinaisAlarme: [
        'Achar que RAG é treinar o modelo com os documentos.',
        'Não mencionar nenhuma forma de verificar a resposta.',
      ],
      modulos: ['rag-basico', 'langchain-rag'],
    },
    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-rag-falhas-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Taxonomia de falhas de RAG e como as distingues pelo traço',
      enunciado:
        'Um utilizador queixa-se de que a resposta está errada. Quais são os modos de falha possíveis de um RAG, e como sabes em qual deles estás só a olhar para o traço?',
      minutos: 6,
      dica: 'Começa pela pergunta binária: a passagem que responde estava no contexto?',
      resposta: [
        {
          type: 'p',
          text: 'Uso cinco categorias e uma árvore de decisão simples: **a passagem certa existe no índice? Chegou ao contexto? A resposta é fiel a ela? A citação aponta para ela?** Cada «não» identifica uma fase diferente e uma correcção diferente.',
        },
        {
          type: 'table',
          head: ['Falha', 'O que se vê no traço', 'Onde corrigir'],
          rows: [
            ['Recuperação falhada', 'A passagem certa existe no índice mas não está no top-k (procuro-a por id ou texto)', 'Pesquisa híbrida, reescrita da consulta, chunking, re-ranking'],
            ['Contexto ruidoso', 'A passagem certa está lá, rodeada de chunks parecidos ou contraditórios; a resposta mistura-os', 'Menos k, re-ranking, deduplicação, ordem dos chunks'],
            ['Fonte desactualizada', 'O chunk usado é de uma versão revogada, ou a versão nova não está no índice', 'Ingestão: apagamentos, vigência, frescura'],
            ['Síntese errada', 'A passagem certa está no contexto e a resposta contradiz-a ou omite condições', 'Prompt, modelo, formato do contexto, verificação de faithfulness'],
            ['Citação inventada ou errada', 'A citação aponta para um id que não estava no contexto, ou para um chunk que não diz aquilo', 'Validação pós-geração, citações nativas da API'],
          ],
        },
        {
          type: 'p',
          text: 'Há uma sexta que convém nomear: **a resposta não existe no corpus**. O traço mostra chunks com scores baixos e um modelo que respondeu na mesma, de memória. Não é falha de recuperação — é falta de recusa.',
        },
        {
          type: 'p',
          text: 'Em produção isto só funciona se o traço guardar o necessário: consulta original e reescrita, ids e scores dos candidatos antes e depois do re-ranking, o prompt montado, a resposta e as citações. Com isso, classifico uma amostra de 50 queixas por categoria e sei onde investir. Sem isso, a discussão fica em «o modelo alucinou», que não diz nada.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Chamar tudo de alucinação',
          text: 'A maioria das respostas erradas que vi em RAG não eram o modelo a inventar: eram a passagem certa a não chegar ao contexto, ou uma versão antiga a chegar. Trocar de modelo não resolve nenhuma das duas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RAGAS — métricas para recuperação e geração', url: 'https://docs.ragas.io/en/stable/' },
            { label: 'Barnett et al. (2024) — Seven Failure Points When Engineering a RAG System', url: 'https://arxiv.org/abs/2401.05856' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue falha de recuperação de falha de síntese pela presença da passagem no contexto.',
          'Inclui fonte desactualizada como categoria própria, ligada à ingestão.',
          'Inclui citação errada ou inventada.',
          'Menciona o caso «a resposta não existe no corpus» e a falta de recusa.',
          'Diz o que o traço tem de guardar para o diagnóstico ser possível.',
        ],
        fraco: 'Diz que o modelo alucinou e propõe trocar de modelo ou baixar a temperatura.',
        solido: 'Dá as categorias e a regra da passagem no contexto, com uma correcção por categoria.',
        excelente: 'Acrescenta o que instrumentar, propõe classificar uma amostra de queixas por categoria para priorizar, e liga cada categoria à sua métrica.',
      },
      seguimento: [
        'Como automatizarias esta classificação sobre milhares de conversas?',
        'A passagem está no contexto em 5.º lugar de 8 e a resposta ignora-a. O que tentas?',
        'Que campos do traço são dados pessoais e como os guardas?',
      ],
      sinaisAlarme: [
        'Não ter forma de saber se a passagem certa estava no contexto.',
        'Propor uma solução antes de localizar a fase que falhou.',
      ],
      modulos: ['rag-basico', 'avaliar-rag', 'observabilidade-llmops'],
    },
    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-rag-falhas-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Citações verificáveis e como as validas depois da geração',
      enunciado:
        'O produto exige que cada afirmação tenha uma citação. Como desenhas isso para que as citações sejam verificáveis, e o que verificas depois de o modelo responder?',
      minutos: 6,
      dica: 'Há dois níveis: a citação aponta para algo que existia no contexto, e esse algo diz mesmo aquilo.',
      resposta: [
        {
          type: 'p',
          text: 'Dou a cada chunk um **id estável no prompt**, peço ao modelo que cite por id e, idealmente, com a frase literal de suporte; depois da geração verifico em dois níveis: **o id existia no contexto** (determinístico, barato) e **o texto citado sustenta a afirmação** (literal ou por um modelo de entailment/juiz).',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Verificação barata: o id existe e a citação literal está no chunk',
          code: `import re, unicodedata
from difflib import SequenceMatcher

def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"\\s+", " ", s).strip()

def validar_citacao(citacao: str, chunk: str, minimo: float = 0.9) -> bool:
    """A citação literal tem de existir no chunk citado (tolerando espaços e maiúsculas)."""
    c, t = norm(citacao), norm(chunk)
    if not c:
        return False
    if c in t:
        return True
    bloco = SequenceMatcher(None, c, t, autojunk=False).find_longest_match(0, len(c), 0, len(t))
    return bloco.size / len(c) >= minimo

chunks = {
    "pol-7#3": "Cartões de débito: o estorno é processado em até 10 dias úteis.",
    "pol-7#4": "Carteiras móveis: o estorno é processado em até 24 horas.",
}
resposta = [
    ("O estorno para carteiras móveis demora até 24 horas.", "pol-7#4", "o estorno é processado em até 24 horas"),
    ("O estorno em cartão demora até 3 dias úteis.", "pol-7#3", "estorno é processado em até 3 dias úteis"),
    ("Não há taxa de estorno.", "pol-7#9", "sem qualquer taxa"),
]
for frase, cid, citacao in resposta:
    ok = cid in chunks and validar_citacao(citacao, chunks[cid])
    print(cid, ok)
# pol-7#4 True
# pol-7#3 False   (o chunk diz 10 dias, não 3)
# pol-7#9 False   (id que nem estava no contexto)`,
        },
        {
          type: 'p',
          text: 'A verificação literal apanha ids inventados e citações adulteradas, mas não apanha o caso subtil: a citação existe e é literal, e a frase da resposta afirma algo que ela não implica. Para isso uso um modelo de NLI ou um juiz que recebe (frase, citação) e responde «sustenta / não sustenta», calibrado contra anotações humanas. É a ideia de *citation recall* e *citation precision* do benchmark ALCE.',
        },
        {
          type: 'p',
          text: 'Se a API o oferece, uso citações nativas: na API da Anthropic, documentos com `citations.enabled` devolvem blocos de texto com `cited_text` e a localização exacta no documento, e a documentação garante que os ponteiros são válidos. Isso resolve o primeiro nível; o segundo (se o texto citado sustenta a frase) continua a ser meu.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que fazer com uma citação inválida',
          text: 'Não a escondo em silêncio. Ou removo a frase sem suporte, ou regenero com feedback, ou mostro a resposta marcada como não verificada. Registo a taxa de citações inválidas como métrica com alarme: subidas costumam indicar mudança de modelo ou de formato do contexto.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Claude — citations', url: 'https://platform.claude.com/docs/en/build-with-claude/citations' },
            { label: 'Gao et al. (2023) — Enabling Large Language Models to Generate Text with Citations (ALCE)', url: 'https://arxiv.org/abs/2305.14627' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Dá ids estáveis aos chunks no prompt e pede citação por id.',
          'Verifica deterministicamente que o id existia no contexto.',
          'Distingue citação existente de citação que sustenta a afirmação.',
          'Propõe NLI ou juiz calibrado para o segundo nível.',
          'Define o que acontece na interface quando a citação falha.',
        ],
        fraco: 'Pede ao modelo «cita as fontes» e mostra o que vier.',
        solido: 'Ids no prompt, validação de que o id existia e verificação literal da citação.',
        excelente: 'Acrescenta verificação de entailment calibrada, usa citações nativas quando existem sabendo o que elas garantem e o que não, e transforma a taxa de citações inválidas numa métrica com alarme.',
      },
      seguimento: [
        'Quanto custa em latência verificar cada frase com um juiz? Fazias em todas as respostas?',
        'Como citas uma resposta que combina dois documentos numa só frase?',
        'O que mostras ao utilizador: o chunk, a página ou um link para o original?',
      ],
      sinaisAlarme: [
        'Confiar que uma citação no formato certo é uma citação correcta.',
        'Deixar o modelo inventar URLs para as fontes.',
      ],
      modulos: ['rag-basico', 'llm-como-juiz'],
    },
    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-rag-falhas-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Recusar quando não há suporte: limiar, instrução ou verificação',
      enunciado:
        'Não queres que o assistente responda quando os documentos não suportam a resposta. Como implementas a recusa, e o que perdes com cada abordagem?',
      minutos: 8,
      dica: 'Uma recusa errada também é uma falha. Quanto custa cada tipo de erro neste negócio?',
      resposta: [
        {
          type: 'p',
          text: 'Em camadas, porque nenhuma é suficiente sozinha: **limiar de recuperação** antes de gerar, **instrução explícita** no prompt com uma saída de recusa estruturada, e **verificação** depois de gerar. O ponto de equilíbrio depende do custo relativo de uma resposta errada e de uma recusa desnecessária — numa farmácia online não é o mesmo que num FAQ de entregas.',
        },
        {
          type: 'table',
          head: ['Camada', 'Como funciona', 'Ganha', 'Perde'],
          rows: [
            ['Limiar de score', 'Se o melhor candidato (de preferência após re-ranking) está abaixo de t, não chama o modelo', 'Barato, determinístico, poupa a chamada', 'Scores de cosseno não estão calibrados entre consultas; perguntas curtas ou com jargão ficam abaixo e são recusadas'],
            ['Instrução e saída estruturada', 'O prompt diz quando recusar e o formato tem um campo de suporte (sim/não) ou uma resposta tipo', 'Usa a compreensão do modelo; trata perguntas parcialmente respondidas', 'O modelo obedece de forma imperfeita, sobretudo quando o contexto tem algo parecido'],
            ['Verificação pós-geração', 'Juiz ou NLI verifica se cada afirmação é sustentada pelo contexto', 'Apanha respostas confiantes sem suporte', 'Latência e custo extra; o juiz também erra'],
          ],
        },
        {
          type: 'p',
          text: 'Como calibro: construo um conjunto com perguntas respondíveis e **perguntas não respondíveis** (fora do corpus, ou parecidas com algo que está no corpus mas com a resposta ausente), e meço duas taxas — respostas sem suporte entre as não respondíveis, e recusas indevidas entre as respondíveis. Escolho o limiar e o prompt pela curva entre as duas, com o negócio a dizer quanto vale cada erro.',
        },
        {
          type: 'p',
          text: 'A recusa tem de ser útil: dizer o que não foi encontrado, oferecer o que existe de próximo e, quando o domínio o pede, encaminhar para um humano. Uma recusa seca a 15% das perguntas mata a adopção tão depressa como respostas erradas.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Limiar fixo copiado de um tutorial',
          text: 'Um limiar de cosseno de 0,8 não significa nada fora do modelo e do corpus em que foi medido. Mudar de modelo de embeddings muda a distribuição dos scores e invalida o limiar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — reduzir alucinações (permitir dizer «não sei», citar)', url: 'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations' },
            { label: 'Yan et al. (2024) — Corrective Retrieval Augmented Generation', url: 'https://arxiv.org/abs/2401.15884' },
            { label: 'RAGAS — faithfulness', url: 'https://docs.ragas.io/en/stable/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe pelo menos duas camadas e explica porque uma só não chega.',
          'Diz que scores de similaridade não estão calibrados e que o limiar se mede no corpus.',
          'Constrói um conjunto com perguntas não respondíveis para medir.',
          'Mede as duas taxas de erro (resposta sem suporte e recusa indevida) e liga-as ao custo do negócio.',
          'Desenha uma recusa útil (o que falta, alternativa, escalamento).',
        ],
        fraco: 'Acrescenta «se não souberes, diz que não sabes» ao prompt e considera resolvido.',
        solido: 'Limiar, instrução e verificação, com os custos de cada um.',
        excelente: 'Calibra com perguntas não respondíveis e uma curva entre as duas taxas, deixa o negócio decidir o ponto, e desenha a experiência da recusa.',
      },
      seguimento: [
        'Como gerarias perguntas não respondíveis realistas sem as escrever todas à mão?',
        'A pergunta é parcialmente respondível. Recusas, respondes à parte suportada, ou outra coisa?',
        'Qual é o limiar certo para uma farmácia online? Como o defendias perante o director clínico?',
      ],
      sinaisAlarme: [
        'Um limiar fixo sem dizer como foi escolhido.',
        'Ignorar o custo das recusas indevidas.',
        'Confiar só na instrução do prompt.',
      ],
      modulos: ['rag-basico', 'avaliar-rag', 'guardrails-seguranca'],
    },
    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-rag-falhas-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Escolher k e o limiar de score da recuperação',
      enunciado:
        'Quantos chunks metes no contexto, e cortas por score? Explica como escolhias o k e se usavas um limiar.',
      minutos: 6,
      dica: 'Há dois k: quantos candidatos recuperas e quantos chegam ao modelo.',
      resposta: [
        {
          type: 'p',
          text: 'Separo **dois k**: um k de recuperação largo (dezenas de candidatos) para maximizar recall, e um k de contexto pequeno (tipicamente 3 a 10) depois de re-ranking e deduplicação, para maximizar precisão e caber no orçamento. Ambos se escolhem pela curva de recall@k e de qualidade da resposta, e o limiar de score usa-se como corte adicional só se estiver calibrado.',
        },
        {
          type: 'compare',
          left: {
            title: 'k de contexto alto',
            items: [
              'Mais probabilidade de a passagem certa lá estar.',
              'Mais tokens: custo e latência sobem linearmente.',
              'Mais ruído e passagens contraditórias.',
              'Informação relevante no meio do contexto tende a ser menos usada.',
            ],
          },
          right: {
            title: 'k de contexto baixo',
            items: [
              'Contexto limpo, prompt barato.',
              'Perguntas que precisam de várias passagens ficam incompletas.',
              'Depende muito da qualidade do topo do ranking.',
              'Exige re-ranker bom, que custa latência.',
            ],
          },
        },
        {
          type: 'p',
          text: 'Como meço: no conjunto dourado calculo recall@k para k = 1, 3, 5, 10, 20, 50. A curva diz-me onde o recall satura; se recall@50 é alto e recall@5 baixo, a recuperação encontra, mas ordena mal — é caso para re-ranker, não para subir o k de contexto. Depois avalio a resposta (correcção e faithfulness) para k de contexto 3, 5 e 8, com o custo em tokens ao lado. A Anthropic reportou, no estudo de contextual retrieval, melhores resultados com 20 chunks do que com 5 ou 10 no seu conjunto — mostra que a resposta depende do corpus e do modelo e que se mede.',
        },
        {
          type: 'p',
          text: 'Sobre o limiar: um corte de score absoluto é frágil porque a distribuição muda por consulta e por modelo. Prefiro cortes relativos (descartar candidatos muito abaixo do primeiro) ou o score de um re-ranker, que é mais comparável entre consultas. Um k dinâmico — parar quando o score cai abruptamente — ajuda em perguntas simples a gastar menos tokens.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. (2023) — Lost in the Middle', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Anthropic — Contextual Retrieval (comparação de k = 5, 10, 20)', url: 'https://www.anthropic.com/news/contextual-retrieval' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa k de recuperação de k de contexto.',
          'Usa a curva de recall@k para decidir entre subir k e acrescentar re-ranking.',
          'Avalia a resposta final, não só a recuperação, para escolher o k de contexto.',
          'Explica porque um limiar absoluto de cosseno é frágil.',
          'Põe o custo em tokens e latência na decisão.',
        ],
        fraco: '«k = 5 porque é o valor por omissão.»',
        solido: 'Distingue os dois k, mede recall@k e explica o custo de contexto grande.',
        excelente: 'Lê a forma da curva para decidir entre re-ranker e k maior, propõe cortes relativos ou k dinâmico, e quantifica o custo por pergunta.',
      },
      seguimento: [
        'O teu re-ranker demora 150 ms para 50 candidatos. Como reduzias isso?',
        'Usavas o mesmo k para todas as intenções?',
        'Como ordenas os chunks dentro do prompt?',
      ],
      sinaisAlarme: [
        'Subir o k sempre que falta informação, sem olhar para o custo.',
        'Usar um limiar de cosseno absoluto sem calibração.',
      ],
      modulos: ['rag-basico', 'pesquisa-hibrida', 'avaliar-rag'],
    },
    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-rag-falhas-06',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O orçamento de tokens do contexto e como o divides',
      enunciado:
        'O modelo aceita muitos tokens de entrada. Mesmo assim, como decides quanto do contexto vai para cada coisa num pedido de RAG?',
      minutos: 4,
      dica: 'Lista o que compete pelo espaço e o que cada um custa.',
      resposta: [
        {
          type: 'p',
          text: 'Defino um **orçamento explícito por pedido**, muito abaixo da janela máxima, e reparto-o entre instruções, histórico, chunks e espaço reservado para a resposta. A janela máxima é um limite técnico; o orçamento é uma decisão de custo, latência e qualidade.',
        },
        {
          type: 'table',
          head: ['Componente', 'Como o controlo'],
          rows: [
            ['Instruções do sistema', 'Fixas e estáveis no início, o que também as torna elegíveis para prompt caching'],
            ['Histórico da conversa', 'Últimos N turnos, ou resumo dos anteriores; corta primeiro aqui'],
            ['Chunks recuperados', 'k de contexto e tamanho de chunk; deduplicar e cortar pelo re-ranker'],
            ['Pergunta', 'Inteira; se for enorme (um documento colado), trata-se como caso à parte'],
            ['Resposta', 'max_tokens reservado; janela total = entrada + saída'],
          ],
        },
        {
          type: 'p',
          text: 'Porque não encher a janela: o custo e a latência do prefill crescem com os tokens de entrada; mais chunks trazem mais ruído e contradições; e o desempenho em contextos longos depende da posição — Liu et al. mostraram que a informação relevante no meio de contextos longos é usada pior do que no início ou no fim. Por isso ponho os documentos antes da pergunta e os chunks mais relevantes no início do bloco — a documentação da Anthropic recomenda documentos longos no topo e a pergunta no fim, e reporta melhorias até 30% em testes com entradas multi-documento.',
        },
        {
          type: 'p',
          text: 'Em produção conto tokens com o tokenizer do modelo (ou com o endpoint de contagem do fornecedor) antes de enviar, corto por prioridade quando excede e registo nos traços os tokens por componente, para saber, por exemplo, que o histórico está a comer metade do orçamento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Liu et al. (2023) — Lost in the Middle', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Claude — boas práticas de prompting (contexto longo)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue janela máxima de orçamento escolhido.',
          'Lista os componentes que competem pelo espaço, incluindo a resposta.',
          'Justifica não encher a janela com custo, latência e qualidade (posição no contexto).',
          'Diz como conta e corta tokens antes de enviar.',
        ],
        fraco: '«O modelo aceita muitos tokens, ponho tudo.»',
        solido: 'Reparte o orçamento entre componentes e explica custo e lost in the middle.',
        excelente: 'Acrescenta ordem dos componentes, corte por prioridade, prompt caching do prefixo estável e métricas de tokens por componente nos traços.',
      },
      seguimento: [
        'O histórico tem 40 turnos. O que fazes?',
        'Como ordenavas 8 chunks dentro do prompt?',
        'Que parte do prompt beneficia de prompt caching?',
      ],
      sinaisAlarme: [
        'Não reservar espaço para a resposta.',
        'Achar que mais contexto é sempre melhor.',
      ],
      modulos: ['rag-basico', 'prompt-engineering', 'custo-escala'],
    },
    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-rag-falhas-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Porque não pôr tudo numa janela de 1M tokens?',
      enunciado:
        'Os modelos já aceitam centenas de milhares de tokens, alguns um milhão. Porque é que ainda precisamos de RAG? Não é mais simples pôr a documentação toda no prompt?',
      minutos: 8,
      dica: 'Pensa em tamanho do corpus, frescura, permissões, custo por pergunta e qualidade.',
      resposta: [
        {
          type: 'p',
          text: 'Às vezes é mesmo mais simples, e digo-o: **se o corpus cabe com folga na janela, muda pouco e todos os utilizadores podem ver tudo**, pôr tudo no prompt com prompt caching é uma boa primeira versão — a própria Anthropic sugere isso para bases abaixo de ~200 mil tokens. Fora desse caso, RAG continua a ganhar em custo, frescura, permissões e, muitas vezes, em qualidade.',
        },
        {
          type: 'table',
          head: ['Critério', 'Contexto longo', 'RAG'],
          rows: [
            ['Corpus maior que a janela', 'Não cabe; tem de se escolher na mesma', 'Escala para milhões de documentos'],
            ['Custo por pergunta', 'Paga-se o corpus inteiro em cada pedido (com cache, menos, mas não zero)', 'Paga-se o que foi recuperado'],
            ['Latência', 'Prefill de centenas de milhares de tokens sem cache demora segundos', 'Pesquisa em dezenas de ms mais um prompt curto'],
            ['Frescura', 'Cada mudança invalida a cache do prefixo', 'Actualiza-se um documento no índice'],
            ['Permissões por utilizador', 'Um prompt por combinação de permissões', 'Filtro de ACL na consulta'],
            ['Citação e auditoria', 'Possível, mas sobre um contexto enorme', 'O que entrou no contexto está registado e é pequeno'],
            ['Perguntas que precisam de ver tudo', 'Ganha: resumos globais, comparações transversais', 'Perde: a recuperação só traz pedaços'],
          ],
        },
        {
          type: 'p',
          text: 'Na qualidade, «cabe» não significa «é usado»: o desempenho em contextos longos varia com a posição da informação (Lost in the Middle), e testes de agulha num palheiro medem encontrar um facto isolado, não raciocinar sobre vários. Do outro lado, Xu et al. (2023) mostraram que um modelo com janela de 4K mais recuperação simples ficou comparável a um com 16K de contexto em tarefas longas, e que a recuperação ajudou mesmo os modelos de janela maior.',
        },
        {
          type: 'p',
          text: 'A resposta de staff é que não é binário. Uso RAG para encontrar os documentos relevantes e contexto longo para os ler **inteiros** em vez de chunks — parent-document no limite. E faço as contas: tokens do corpus × perguntas por dia × preço de entrada (com e sem cache), contra o custo de manter um índice. Para uma base de 150 páginas usada por 20 pessoas, ganha o contexto longo; para 2 milhões de documentos com ACL, nem se põe a questão.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Ganhar a discussão em vez de responder',
          text: 'Dizer que contexto longo «nunca funciona» é tão fraco como dizer que RAG está morto. O entrevistador quer ver os critérios e as contas, e o caso em que a resposta muda.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Xu et al. (2023) — Retrieval meets Long Context Large Language Models', url: 'https://arxiv.org/abs/2310.03025' },
            { label: 'Liu et al. (2023) — Lost in the Middle', url: 'https://arxiv.org/abs/2307.03172' },
            { label: 'Anthropic — Contextual Retrieval (nota sobre bases pequenas)', url: 'https://www.anthropic.com/news/contextual-retrieval' },
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Admite o caso em que o contexto longo é a melhor escolha e o caracteriza.',
          'Compara custo por pergunta e latência de prefill, com e sem cache.',
          'Menciona frescura e permissões por utilizador como limites do contexto longo.',
          'Distingue «cabe na janela» de «é usado bem» (posição, raciocínio sobre vários factos).',
          'Propõe uma solução híbrida e faz contas para decidir.',
        ],
        fraco: '«RAG é sempre melhor» ou «com 1M tokens já não é preciso RAG», sem critérios.',
        solido: 'Compara os dois em custo, latência, frescura e permissões, e reconhece o caso de corpus pequeno.',
        excelente: 'Cita evidência sobre qualidade em contexto longo, propõe o híbrido (recuperar documentos, ler inteiros) e decide com uma conta de custo por pergunta explícita.',
      },
      seguimento: [
        'Consegues fazer-me a conta de custo para 500 páginas e 2000 perguntas por dia?',
        'Como avaliavas se o modelo está mesmo a usar o contexto todo?',
        'Que perguntas o RAG nunca vai responder bem?',
      ],
      sinaisAlarme: [
        'Ignorar permissões e frescura na comparação.',
        'Tratar testes de agulha num palheiro como prova de raciocínio em contexto longo.',
        'Não conseguir dar um caso em que contexto longo ganha.',
      ],
      modulos: ['rag-basico', 'custo-escala', 'rag-avancado'],
    },
    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-rag-falhas-08',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'RAG ou fine-tuning para um assistente sobre documentos internos',
      enunciado:
        'Pergunta rápida: temos 5 mil documentos internos e queremos um assistente que responda sobre eles. RAG ou fine-tuning?',
      minutos: 3,
      dica: 'O que é que cada técnica muda: o que o modelo sabe ou como se comporta?',
      resposta: [
        {
          type: 'p',
          text: '**RAG.** O problema é dar acesso a factos que mudam, com citação e permissões; fine-tuning muda comportamento e formato, não é uma boa forma de injectar conhecimento novo e actualizável.',
        },
        {
          type: 'list',
          items: [
            'Frescura: um documento alterado no RAG é um upsert; no fine-tuning é um novo treino.',
            'Citação: o RAG sabe de onde veio cada facto; um modelo afinado não consegue apontar a fonte.',
            'Permissões: o RAG filtra por utilizador; os pesos de um modelo afinado não têm ACL.',
            'Evidência: Ovadia et al. (2023) compararam injecção de conhecimento e o RAG superou o fine-tuning não supervisionado, tanto para factos vistos como para factos novos.',
          ],
        },
        {
          type: 'p',
          text: 'Fine-tuning entra depois, se houver um problema de comportamento que o prompt não resolve: formato de saída muito específico, tom, classificação de intenções barata num modelo pequeno. E as duas coisas combinam — um modelo afinado para usar bem o contexto recuperado.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Ovadia et al. (2023) — Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs', url: 'https://arxiv.org/abs/2312.05934' },
            { label: 'Lewis et al. (2020) — Retrieval-Augmented Generation', url: 'https://arxiv.org/abs/2005.11401' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escolhe RAG e justifica com frescura, citação e permissões.',
          'Diz que fine-tuning muda comportamento e formato, não é bom a acrescentar factos.',
          'Dá um caso em que fine-tuning faz sentido.',
        ],
        fraco: 'Escolhe fine-tuning «para o modelo aprender os documentos».',
        solido: 'Escolhe RAG com as três razões e um caso para fine-tuning.',
        excelente: 'Responde em 30 segundos, cita evidência e propõe a combinação quando há um problema de comportamento medido.',
      },
      seguimento: [
        'E se os documentos não mudassem nunca e não houvesse permissões?',
        'Que problema concreto te faria acrescentar fine-tuning ao RAG?',
      ],
      sinaisAlarme: [
        'Propor fine-tuning para conhecimento que muda todas as semanas.',
        'Não mencionar permissões num corpus interno.',
      ],
      modulos: ['rag-basico', 'escolher-modelo'],
    },
    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-rag-falhas-09',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A citação aponta para um documento que não diz aquilo',
      enunciado:
        'Num assistente jurídico interno, um advogado reparou que a resposta afirmava um prazo de 30 dias e citava o documento X, mas o documento X não fala desse prazo. Como investigas?',
      contexto:
        'SaaS B2B de gestão de contratos, assistente para equipas jurídicas de clientes empresariais em Portugal. Recuperação híbrida, top-8 chunks no contexto, chunks de ~400 tokens. O modelo devolve citações como [n] ao fim de cada frase, onde n é a posição do chunk no contexto. A interface transforma [n] no título do documento. Os traços guardam o prompt montado e a resposta. Uma auditoria a 100 respostas encontra 9 citações que não sustentam a frase.',
      minutos: 12,
      dica: 'Há pelo menos três sítios onde [n] pode deixar de apontar para o sítio certo: no modelo, no mapeamento e na interface.',
      resposta: [
        {
          type: 'p',
          text: 'Separo três hipóteses: **o modelo citou o chunk errado** (o prazo veio de outro chunk do contexto ou de memória), **o mapeamento de [n] para documento está errado** (ordem dos chunks diferente da que o código assume) e **a citação está certa ao nível do chunk mas a interface mostra outro nível** (o chunk diz 30 dias, o advogado leu o documento errado ou a versão errada). Começo pelos traços porque distinguem as três em minutos.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Reproduzir com o prompt guardado', text: 'Abro o prompt montado da conversa e procuro «30 dias» em todos os chunks. Se aparece no chunk [5] e a resposta citou [3], foi o modelo; se aparece no [3] mas a interface mostrou o documento X que não é a fonte do [3], foi o mapeamento.' },
            { title: 'Se não aparece em nenhum chunk', text: 'O prazo veio de memória paramétrica ou de inferência («prazo legal típico»). É síntese sem suporte com uma citação decorativa — e o mais perigoso num domínio jurídico.' },
            { title: 'Verificar o mapeamento', text: 'Confirmo que a lista usada para converter [n] em título é a mesma, na mesma ordem, que foi enviada ao modelo. Bugs típicos: re-ranking feito depois de construir o mapa, deduplicação que remove um chunk e desloca os índices, índice a começar em 0 no código e em 1 no prompt.' },
            { title: 'Classificar as 9', text: 'Aplico o mesmo procedimento às 9 citações da auditoria e conto por causa. A correcção depende da distribuição, não do primeiro caso.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcções. Para o mapeamento: ids estáveis em vez de posições (`[contrato-881#s4.2]`), construídos uma vez e usados tanto no prompt como na interface, com um teste unitário que verifica a ida e volta. Para citações do modelo: validação pós-geração — o id tem de existir no contexto e o texto do chunk tem de sustentar a frase, verificado por um juiz ou NLI calibrado; frases que falham são removidas ou marcadas. Para respostas de memória: instrução para afirmar só o que está nos documentos, mais a mesma verificação. Se o fornecedor tem citações nativas com ponteiros garantidos para o texto citado, uso-as para eliminar a classe de erros de mapeamento.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Impacto e comunicação',
          text: 'Nove em cem é uma taxa alta para um produto que vende confiança jurídica. Enquanto corrijo, mostro o excerto citado ao lado da frase (não só o título), para que o utilizador veja o suporte, e aviso os clientes afectados se a auditoria mostrar decisões tomadas com base nisto.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Taxa de citações não sustentadas como métrica em produção, sobre uma amostra diária avaliada por juiz calibrado, com alarme; e um conjunto de regressão com estas 9 conversas e as suas variantes, corrido em cada mudança de prompt, re-ranker ou modelo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Claude — citations', url: 'https://platform.claude.com/docs/en/build-with-claude/citations' },
            { label: 'Gao et al. (2023) — ALCE: citation recall e precision', url: 'https://arxiv.org/abs/2305.14627' },
            { label: 'RAGAS — faithfulness', url: 'https://docs.ragas.io/en/stable/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa erro do modelo, erro de mapeamento e erro de apresentação.',
          'Usa o prompt guardado para localizar a origem da afirmação.',
          'Nomeia bugs concretos de mapeamento (re-ranking depois do mapa, deduplicação, off-by-one).',
          'Propõe ids estáveis e validação pós-geração de suporte.',
          'Classifica todos os casos da auditoria antes de decidir a correcção.',
          'Define métrica e conjunto de regressão.',
        ],
        fraco: 'Acrescenta ao prompt «cita correctamente» ou culpa o modelo sem olhar para o traço.',
        solido: 'Reproduz com o traço, encontra a causa entre modelo e mapeamento e propõe ids estáveis e validação.',
        excelente: 'Classifica as 9 por causa, considera citações nativas, trata o impacto no cliente e põe a taxa de citações não sustentadas como métrica com alarme.',
      },
      seguimento: [
        'Como escreverias o teste unitário para o mapeamento de citações?',
        'O juiz de suporte discorda dos advogados em 15% dos casos. Usas na mesma?',
        'Mostravas a resposta enquanto a verificação corre ou esperavas?',
      ],
      sinaisAlarme: [
        'Assumir que é alucinação sem verificar o código de mapeamento.',
        'Resolver só o caso reportado sem olhar para os outros oito.',
        'Desvalorizar o problema por ser «só 9%».',
      ],
      modulos: ['rag-basico', 'llm-como-juiz', 'observabilidade-llmops'],
    },
    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-rag-falhas-10',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'MVP de RAG sobre documentação interna em duas semanas',
      enunciado:
        'Tens duas semanas para pôr um assistente sobre a documentação interna nas mãos de 200 engenheiros. O que constróis, o que cortas e o que não cortas de maneira nenhuma?',
      contexto:
        'Empresa de logística com sede em Lisboa e operação em Moçambique. Cerca de 4000 páginas em Confluence e repositórios Markdown, algumas com acesso restrito (segurança, RH técnico). Um engenheiro (tu) e meio dia por semana de alguém da plataforma. Acesso a uma API de modelos comercial e a PostgreSQL gerido. O patrocinador quer uma demo no fim da semana 1.',
      minutos: 16,
      dica: 'O que é barato de acrescentar depois e caro de corrigir depois?',
      resposta: [
        {
          type: 'p',
          text: 'Corto tudo o que é optimização de qualidade e mantenho tudo o que é **segurança, rastreabilidade e capacidade de medir**: permissões, citações, traços, um conjunto dourado pequeno e uma forma de recolher feedback. Optimizações acrescentam-se depois com dados; uma fuga de documentos de RH ou a falta de forma de medir não se corrigem retroactivamente.',
        },
        {
          type: 'h',
          text: 'Clarificações e números',
        },
        {
          type: 'p',
          text: 'Pergunto: as permissões do Confluence estão em grupos que consigo ler pela API? Quantas perguntas por dia se esperam? Há documentação em inglês e português? Com 4000 páginas a ~800 tokens, são ~3 milhões de tokens, perto de 6 a 8 mil chunks — cabe numa única tabela PostgreSQL com pgvector e um índice de texto completo, sem infraestrutura nova. 200 engenheiros a fazer algumas perguntas por dia são umas centenas de pedidos diários: o custo do modelo não é o problema, a confiança é.',
        },
        {
          type: 'table',
          head: ['Corto (fica para depois)', 'Não corto'],
          rows: [
            ['Contextual retrieval, chunking semântico, HyDE', 'Filtro de ACL na consulta, com a identidade do SSO'],
            ['Re-ranker dedicado (só se o dourado mostrar que falta)', 'Citações com link para a página e validação de que o id existia no contexto'],
            ['Agentes, multi-hop, ferramentas', 'Traços completos: consulta, chunks com scores, prompt, resposta, latência, custo'],
            ['Ingestão por eventos; basta um job nocturno com hash e apagamentos', 'Conjunto dourado de 50 a 80 perguntas reais com a página que responde'],
            ['Interface própria; uso o chat que já existe (Slack ou Teams) ou uma página mínima', 'Botão de feedback (útil, não útil, errado) ligado ao traço'],
            ['Fine-tuning de qualquer tipo', 'Recusa quando não há suporte, com link para pesquisar à mão'],
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'Dias 1 a 3', text: 'Ingestão: exportar Confluence e Markdown para Markdown limpo, chunking estrutural por título com fallback recursivo, metadados (espaço, página, url, grupos com acesso, última edição), embeddings e BM25 no PostgreSQL. Pedir em paralelo 50 perguntas reais a 5 engenheiros de equipas diferentes.' },
            { title: 'Dias 4 e 5', text: 'Recuperação híbrida com RRF e filtro de ACL, prompt com chunks identificados e instrução de recusa, verificação de ids citados, traços. Demo ao patrocinador com perguntas do conjunto, incluindo uma que deve ser recusada e uma de um utilizador sem acesso a RH.' },
            { title: 'Dias 6 a 8', text: 'Correr o dourado: recall@k ao nível da página, correcção da resposta lida por mim, taxa de recusas. Corrigir os dois ou três maiores problemas encontrados — normalmente extracção de tabelas e páginas duplicadas, não o modelo.' },
            { title: 'Dias 9 e 10', text: 'Piloto com 20 engenheiros, feedback ligado ao traço, painel com volume, latência, custo, feedback negativo e recusas. Documento de uma página com o que ficou de fora e os critérios para o abrir aos 200.' },
          ],
        },
        {
          type: 'p',
          text: 'Riscos que nomeio ao patrocinador: páginas desactualizadas no Confluence vão gerar respostas desactualizadas com citação correcta — mostro a data de edição da fonte em cada citação; e o dourado de 50 perguntas é pequeno, por isso diferenças de poucos pontos entre variantes não são sinal. Critério para passar do piloto aos 200: zero fugas de permissões no teste dedicado, taxa de «errado» no feedback abaixo de um valor acordado, e recall@5 no dourado acima de outro.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'A demo que vira produção',
          text: 'Uma demo sem ACL na semana 1 é a forma mais rápida de ter a demo em produção na semana 3 com os documentos de RH pesquisáveis por toda a gente. Faço a demo já com o filtro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — construir um RAG', url: 'https://docs.langchain.com/oss/python/langchain/rag' },
            { label: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
            { label: 'PostgreSQL — pesquisa de texto completo', url: 'https://www.postgresql.org/docs/current/textsearch.html' },
            { label: 'RAGAS — avaliação de RAG', url: 'https://docs.ragas.io/en/stable/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa explicitamente o que se corta do que não se corta, com critério (barato depois vs caro depois).',
          'Mantém ACL, citações, traços, conjunto dourado e feedback no MVP.',
          'Faz estimativas que justificam infraestrutura mínima (PostgreSQL com pgvector).',
          'Apresenta um plano dia a dia realista com a demo da semana 1.',
          'Define critérios mensuráveis para sair do piloto.',
          'Nomeia riscos de conteúdo (páginas desactualizadas) e de medição (dourado pequeno).',
        ],
        fraco: 'Promete agentes, re-ranking e fine-tuning em duas semanas, ou constrói uma demo sem permissões nem avaliação.',
        solido: 'MVP com híbrida, ACL, citações e dourado, num plano credível.',
        excelente: 'Justifica cada corte com o critério de reversibilidade, faz a demo já com ACL, define critérios de saída do piloto e gere as expectativas do patrocinador com riscos explícitos.',
      },
      seguimento: [
        'O patrocinador pede para tirar o filtro de ACL da demo porque está a atrasar. O que respondes?',
        'Na semana 3, o feedback negativo está a 25%. O que fazes primeiro?',
        'Como decidias se vale a pena acrescentar um re-ranker?',
      ],
      sinaisAlarme: [
        'Cortar permissões ou avaliação para cumprir o prazo.',
        'Escolher infraestrutura nova (cluster vectorial dedicado) para 8 mil chunks.',
        'Não ter nenhum critério para dizer se o MVP funciona.',
      ],
      modulos: ['rag-basico', 'langchain-rag', 'avaliar-rag'],
    },
  ],
};
