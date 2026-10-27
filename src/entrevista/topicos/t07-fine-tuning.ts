import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'fine-tuning',
  numero: 7,
  bloco: 'llm',
  titulo: 'Fine-tuning, adaptação e quando não treinar',
  resumo:
    'Quando treinar compensa e quando é um projecto caro para resolver o problema errado: o que muda o prompt, o RAG e o fine-tuning, como funcionam SFT, LoRA e preference tuning, como se destila um modelo grande num pequeno e como se avalia e mantém um modelo afinado.',
  icon: '🎛️',
  modulos: ['escolher-modelo', 'engenharia-ia', 'como-funciona-llm'],
  essencial: [
    'Prompt e RAG mudam o que o modelo vê; fine-tuning muda os pesos — serve para comportamento, formato e tarefas estreitas, não para factos que mudam.',
    'Ordem por omissão: prompt bem feito com exemplos → RAG se falta conhecimento → fine-tuning só quando o prompt falhou, medido, numa tarefa estreita.',
    'Full fine-tuning com Adam em precisão mista custa ~16 bytes por parâmetro antes das activações (ZeRO): ~112 GB para 7B.',
    'LoRA: W = W0 + (α/r)·BA, só A e B treinam; numa matriz 4096×4096 com r = 16 são 131 072 parâmetros, 0,78% da matriz. Fundido, não acrescenta latência.',
    'QLoRA: base congelada em 4 bits (NF4) + adapters LoRA; o artigo afina um modelo de 65B numa única GPU de 48 GB.',
    'Um adapter está preso aos pesos do modelo base: mudar de base é re-treinar e re-avaliar, não copiar o adapter.',
    'RLHF: SFT → reward model a partir de comparações → PPO com penalização KL. DPO optimiza directamente nos pares (preferida, rejeitada) sem reward model nem amostragem durante o treino.',
    'LIMA: 1 000 exemplos bem escolhidos chegaram para alinhar o formato; qualidade e cobertura dos dados batem volume.',
    'Avaliar antes e depois com o mesmo harness, dourado separado por conversa/cliente/tempo e deduplicado, mais uma bateria de capacidades gerais e de segurança para apanhar regressões.',
    'Custo total = dados + treino + serving + re-treino a cada mudança de modelo base; o treino é quase sempre a parcela mais pequena.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-fine-tuning-01',
      tipo: 'tradeoff',
      nivel: 'pleno',
      titulo: 'Prompt, RAG ou fine-tuning: o que cada um muda',
      enunciado:
        'A equipa de produto quer que o assistente «saiba as nossas regras» e «fale como nós». Alguém propõe afinar um modelo com o histórico do suporte. Como decides entre melhorar o prompt, fazer RAG ou fazer fine-tuning?',
      minutos: 7,
      dica: 'Separa o pedido em duas partes: o que o modelo tem de saber e como tem de se comportar. Quanto muda cada uma, e com que frequência?',
      resposta: [
        {
          type: 'p',
          text: 'Decido pelo que muda e com que frequência. **Prompt e RAG mudam o que o modelo vê no contexto; fine-tuning muda os pesos.** Conhecimento que muda e tem de ser citado vai para RAG; comportamento, formato e tom consistentes vão primeiro para o prompt e só depois, se falhar medido, para fine-tuning.',
        },
        {
          type: 'p',
          text: 'Neste pedido há duas coisas misturadas. «Saber as regras» é conhecimento: regras de reembolso, preçários, prazos. Mudam todos os meses, e a resposta tem de dizer de onde vem. Fine-tuning não resolve isso bem: não cita, não se actualiza sem re-treinar e não há forma limpa de «desaprender» a regra antiga. Ovadia et al. (2023) compararam as duas vias para injectar factos e o RAG ganhou de forma consistente ao fine-tuning não supervisionado, tanto em conhecimento que o modelo já tinha como em conhecimento novo. «Falar como nós» é comportamento: tom, formato, quando pedir o número da encomenda. Isso um modelo instruído já segue com instruções e alguns exemplos no prompt.',
        },
        {
          type: 'table',
          head: ['Via', 'O que muda', 'Actualizar', 'Bom para', 'Custo escondido'],
          rows: [
            ['Prompt (+ few-shot)', 'O contexto de cada pedido', 'Minutos, versionado como código', 'Tom, formato, regras estáveis curtas', 'Tokens em cada pedido'],
            ['RAG', 'O contexto, com documentos recuperados', 'Reindexar', 'Conhecimento que muda, citações, permissões por documento', 'Pipeline de ingestão e avaliação da recuperação'],
            ['Fine-tuning', 'Os pesos', 'Novo treino e nova avaliação', 'Formato rígido, tarefa estreita, destilar para um modelo mais pequeno', 'Dados, serving, re-treino ao mudar de modelo base'],
          ],
        },
        {
          type: 'p',
          text: 'Afinar com o histórico do suporte tem ainda um problema específico: ensina o modelo a imitar as respostas antigas, incluindo os erros, as políticas revogadas e os dados pessoais que lá estiverem. Eu fazia assim: primeiro um prompt com instruções de tom e cinco a dez exemplos bons, mais RAG sobre as regras em vigor; um conjunto dourado de 150 a 300 perguntas para medir. Só se o formato ou o tom continuarem a falhar numa fracção relevante dos casos é que fine-tuning entra — e nesse caso para comportamento, mantendo o RAG para os factos.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '«Treinamos e ele fica a saber»',
          text: 'Um modelo afinado com as regras de Março continua a responder com as de Março em Junho, com a mesma confiança e sem citação. Quando a pergunta do entrevistador mistura conhecimento e comportamento, separa-os em voz alta antes de escolher.',
        },
        { type: 'adr', ref: 'adr-0002' },
        {
          type: 'refs',
          items: [
            { label: 'Ovadia et al. (2023) — Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs', url: 'https://arxiv.org/abs/2312.05934' },
            { label: 'OpenAI — guia de fine-tuning', url: 'https://platform.openai.com/docs/guides/fine-tuning' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa conhecimento (o que o modelo tem de saber) de comportamento (como responde).',
          'Diz que fine-tuning não dá citação nem se actualiza quando a regra muda.',
          'Propõe começar por prompt com exemplos e RAG, com um conjunto dourado para medir.',
          'Aponta o risco de afinar com histórico: imita erros, políticas revogadas e PII.',
          'Diz em que condição concreta o fine-tuning entraria (falha medida de formato/tom numa tarefa estreita).',
        ],
        fraco: 'Escolhe fine-tuning «porque o modelo fica a saber as regras», ou escolhe RAG sem distinguir o pedido de tom.',
        solido: 'Separa conhecimento de comportamento, escolhe RAG para as regras e prompt para o tom, e explica porque o fine-tuning não cita nem se actualiza.',
        excelente: 'Acrescenta a ordem de experiências com métrica de paragem, o risco de treinar no histórico (erros e PII) e o custo de manutenção de um modelo afinado quando o fornecedor muda de modelo base.',
      },
      seguimento: [
        'E se o prompt com exemplos já tiver 6 000 tokens e o custo por pedido incomodar?',
        'Que métrica usavas para decidir que o tom «continua a falhar»?',
        'Há algum caso em que afinarias com conhecimento factual?',
      ],
      sinaisAlarme: [
        'Dizer que o fine-tuning faz o modelo «memorizar» os documentos de forma fiável.',
        'Propor treinar sem ter primeiro medido o que o prompt consegue.',
        'Ignorar que o histórico do suporte tem dados pessoais.',
      ],
      modulos: ['engenharia-ia', 'rag-basico', 'como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-fine-tuning-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'SFT: que dados, em que formato e quantos',
      enunciado:
        'Decidiste fazer supervised fine-tuning para que o modelo produza um resumo de reclamação num formato fixo. Que dados precisas, em que formato e quantos exemplos?',
      minutos: 5,
      dica: 'Pensa no que o modelo vê durante o treino e no que vai ver em produção, token a token.',
      resposta: [
        {
          type: 'p',
          text: 'Preciso de pares **entrada → saída ideal** que representem a distribuição real de produção, no **mesmo chat template** que vou usar a servir, com a loss calculada só nos tokens da resposta. Para uma tarefa de formato, centenas a poucos milhares de exemplos bem escolhidos costumam bastar; a qualidade e a cobertura pesam mais do que o volume.',
        },
        {
          type: 'p',
          text: 'Formato: em SFT conversacional cada exemplo é uma lista de mensagens (`system`, `user`, `assistant`). O trainer aplica o chat template do modelo — os tokens especiais que delimitam cada papel — e, por omissão no TRL, num dataset prompt-completion só a completion conta para a loss. Isto importa: se o prompt entra na loss, gastas capacidade a ensinar o modelo a prever as reclamações dos clientes. Em produção tenho de enviar exactamente o mesmo template e o mesmo prompt de sistema; um desvio aqui é das causas mais comuns de «funcionava no teste».',
        },
        {
          type: 'p',
          text: 'Quantidade e qualidade: o LIMA (Zhou et al., 2023) alinhou um modelo grande com 1 000 exemplos curados, o que sustenta a ideia de que o SFT ensina sobretudo formato e estilo sobre o que o pré-treino já deu. Na prática começo com 300 a 1 000 exemplos, treino, avalio, e olho para os erros para decidir que exemplos faltam, em vez de pedir 50 000 etiquetas à partida. Cobertura importa mais do que repetição: reclamações curtas e longas, em português e com mistura de línguas, casos sem informação suficiente (onde a saída certa é dizer que falta), casos ambíguos.',
        },
        {
          type: 'list',
          items: [
            '**Origem das saídas**: escritas ou revistas por especialistas, ou geradas por um modelo maior e revistas por amostragem — nunca copiadas sem revisão do histórico.',
            '**Limpeza**: deduplicar (incluindo quase-duplicados), retirar PII, remover exemplos contraditórios entre si.',
            '**Separação**: o conjunto de teste sai antes de tudo, separado por cliente ou por período, para não haver a mesma reclamação dos dois lados.',
            '**Comprimento**: confirmar que nenhum exemplo é truncado pelo `max_length` do treino — um resumo cortado ensina o modelo a parar a meio.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mais dados maus não compensam',
          text: '10 000 exemplos com formato inconsistente ensinam inconsistência. Se três anotadores escrevem o campo «causa» de três maneiras, o modelo aprende as três.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hugging Face TRL — SFTTrainer', url: 'https://huggingface.co/docs/trl/sft_trainer' },
            { label: 'Hugging Face — chat templates', url: 'https://huggingface.co/docs/transformers/chat_templating' },
            { label: 'Zhou et al. (2023) — LIMA: Less Is More for Alignment', url: 'https://arxiv.org/abs/2305.11206' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Descreve os exemplos como pares entrada/saída ideal no formato de mensagens com chat template.',
          'Diz que a loss deve ser calculada só nos tokens da resposta.',
          'Exige o mesmo template e prompt de sistema no treino e em produção.',
          'Dá uma ordem de grandeza (centenas a milhares) e argumenta qualidade e cobertura acima de volume.',
          'Menciona limpeza (duplicados, PII, contradições) e separação do teste antes do treino.',
        ],
        fraco: '«Quantos mais dados melhor», sem formato, sem template e sem falar do conjunto de teste.',
        solido: 'Explica formato de mensagens, chat template, loss só na resposta, ordem de grandeza de exemplos e limpeza de dados.',
        excelente: 'Acrescenta o ciclo iterativo guiado por erros, os exemplos de recusa/falta de informação, a verificação de truncagem e a separação por cliente ou tempo para evitar fuga.',
      },
      seguimento: [
        'Como gerarias 1 000 exemplos se não tens anotadores?',
        'O que acontece se treinares com a loss também no prompt?',
        'Como sabes que já tens exemplos suficientes?',
      ],
      sinaisAlarme: [
        'Não saber o que é um chat template nem porque tem de bater com o de produção.',
        'Propor exportar o histórico inteiro do suporte como dados de treino sem revisão.',
        'Tratar o número de exemplos como a única alavanca de qualidade.',
      ],
      modulos: ['como-funciona-llm', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-fine-tuning-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'LoRA e QLoRA: o que treina, rank e memória',
      enunciado:
        'Explica-me como funciona o LoRA. O que é que treina de facto, o que é o rank, quanta memória poupas em relação a full fine-tuning e o que muda com o QLoRA?',
      minutos: 6,
      dica: 'Escreve a actualização de uma matriz de pesos como uma soma e conta os parâmetros de cada termo.',
      resposta: [
        {
          type: 'p',
          text: 'O LoRA congela os pesos do modelo e aprende, para algumas matrizes (tipicamente as projecções de atenção e às vezes as do MLP), uma actualização de baixo rank: `W = W0 + (α/r)·B·A`, com `B` de d×r e `A` de r×k. **Só A e B treinam**; com r pequeno são uma fracção ínfima dos parâmetros, e o optimizador só guarda estado para eles.',
        },
        {
          type: 'p',
          text: 'Contas para uma matriz 4096×4096: tem 16,8 M parâmetros; com r = 16, `A` e `B` somam 16·(4096 + 4096) = 131 072, cerca de 0,78%. `B` começa a zeros, por isso no passo zero o modelo é exactamente o base. O `α` é um factor de escala; o rank controla a capacidade da actualização. O artigo original (Hu et al., 2021) reporta, para GPT-3 175B, 10 000 vezes menos parâmetros treináveis e 3 vezes menos memória de GPU do que full fine-tuning com Adam, e nenhuma latência extra, porque `BA` pode ser somado a `W0` antes de servir.',
        },
        {
          type: 'table',
          head: ['Abordagem', 'Pesos do base', 'O que tem gradiente e estado de optimizador', 'Ordem de grandeza para 7B'],
          rows: [
            ['Full fine-tuning (Adam, precisão mista)', 'Treináveis', 'Todos: ~16 bytes/parâmetro (pesos, gradientes, cópia fp32, dois momentos)', '~112 GB antes das activações'],
            ['LoRA', 'Congelados em bf16 (2 bytes/parâmetro)', 'Só A e B', '~14 GB para o base + adapters + activações'],
            ['QLoRA', 'Congelados em 4 bits (NF4)', 'Só A e B, em bf16', '~3,5 GB para o base + adapters + activações'],
          ],
        },
        {
          type: 'p',
          text: 'O QLoRA (Dettmers et al., 2023) guarda o base em 4 bits com o tipo NF4, quantiza também as constantes de quantização (double quantization) e usa paged optimizers para absorver picos de memória; os gradientes passam pelo base des-quantizado em tempo de cálculo. O artigo afina um modelo de 65B numa única GPU de 48 GB. O custo é tempo: des-quantizar em cada passo torna o treino mais lento do que LoRA em bf16.',
        },
        {
          type: 'p',
          text: 'Em produção há duas formas de servir: fundir o adapter (zero overhead, mas um modelo inteiro por variante) ou mantê-lo separado e carregar vários adapters sobre o mesmo base — o vLLM permite escolher o adapter por pedido, com `max_loras` e `max_lora_rank` a limitar quantos e de que tamanho. Para um SaaS com dezenas de clientes, um base e N adapters de dezenas de MB é muito mais barato do que N modelos.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'LoRA aprende menos e esquece menos',
          text: 'Biderman et al. (2024) mostram que, em código e matemática, LoRA com rank típico fica abaixo de full fine-tuning no domínio-alvo, mas preserva melhor o desempenho fora dele. Para formato e tarefas estreitas é quase sempre o ponto de partida certo; para injectar um domínio inteiro pode não chegar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hu et al. (2021) — LoRA: Low-Rank Adaptation of Large Language Models', url: 'https://arxiv.org/abs/2106.09685' },
            { label: 'Dettmers et al. (2023) — QLoRA', url: 'https://arxiv.org/abs/2305.14314' },
            { label: 'Hugging Face PEFT', url: 'https://huggingface.co/docs/peft/index' },
            { label: 'vLLM — LoRA adapters', url: 'https://docs.vllm.ai/en/latest/features/lora.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Escreve W = W0 + BA e diz que só A e B treinam, com o base congelado.',
          'Conta parâmetros de A e B para um exemplo concreto e relaciona o rank com a capacidade.',
          'Explica de onde vem a poupança de memória (gradientes e estado do optimizador só para os adapters).',
          'Descreve o QLoRA: base em 4 bits (NF4), adapters em precisão maior, custo em velocidade.',
          'Distingue servir com adapter fundido de servir vários adapters sobre o mesmo base.',
        ],
        fraco: '«O LoRA treina menos camadas» ou «comprime o modelo», sem a decomposição nem a origem da poupança.',
        solido: 'Explica a decomposição de baixo rank, conta parâmetros, compara memória com full fine-tuning e descreve o QLoRA.',
        excelente: 'Acrescenta os 16 bytes/parâmetro do full fine-tuning, a inicialização de B a zero, as duas formas de servir com o trade-off multi-adapter e o resultado «aprende menos, esquece menos».',
      },
      seguimento: [
        'Como escolhias o rank e em que matrizes aplicavas o LoRA?',
        'Podes usar o adapter treinado sobre a versão 3 do modelo base na versão 3.1?',
        'Quando é que preferias full fine-tuning apesar do custo?',
      ],
      sinaisAlarme: [
        'Dizer que o LoRA acrescenta camadas novas que aumentam sempre a latência.',
        'Confundir QLoRA com servir o modelo quantizado depois de afinado.',
        'Não saber de onde vem o grosso da memória num treino com Adam.',
      ],
      modulos: ['escolher-modelo', 'como-funciona-llm'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-fine-tuning-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'RLHF e DPO em alto nível',
      enunciado:
        'O SFT ensina o modelo a imitar respostas. O que é preference tuning, como funciona o RLHF e o que é que o DPO simplifica?',
      minutos: 5,
      dica: 'Que dados recolhes num e noutro, e que modelos tens de treinar ou manter em memória?',
      resposta: [
        {
          type: 'p',
          text: 'Preference tuning optimiza o modelo a partir de **comparações** («esta resposta é melhor do que aquela») em vez de respostas-alvo. O RLHF treina um reward model com essas comparações e depois optimiza a política com RL (PPO) contra esse reward, com uma penalização KL para não se afastar do modelo de referência. O DPO chega a um objectivo equivalente **sem reward model explícito nem amostragem durante o treino**: é uma loss supervisionada sobre pares (preferida, rejeitada).',
        },
        {
          type: 'steps',
          items: [
            { title: 'SFT', text: 'Ponto de partida: o modelo já segue o formato. Fica também como modelo de referência.' },
            { title: 'Dados de preferência', text: 'Para cada prompt, duas ou mais respostas geradas pelo modelo e uma escolha humana (ou de um juiz) sobre qual é melhor. É mais fácil comparar do que escrever a resposta ideal.' },
            { title: 'RLHF', text: 'Treina-se um reward model que dá um score escalar a (prompt, resposta). Depois o PPO gera respostas, recebe o reward, e actualiza a política; o termo KL face à referência impede que o modelo explore falhas do reward model (reward hacking).' },
            { title: 'DPO', text: 'Reescreve o mesmo objectivo de forma a que a política implícita seja o próprio modelo: aumenta a probabilidade relativa da preferida face à rejeitada, medida contra o modelo de referência, com um β que faz o papel do KL.' },
          ],
        },
        {
          type: 'p',
          text: 'O argumento do InstructGPT (Ouyang et al., 2022) é o que dá peso à técnica: as respostas de um modelo de 1,3B com SFT e RLHF foram preferidas pelos avaliadores às do GPT-3 de 175B. Operacionalmente, o RLHF com PPO exige ter em memória política, referência, reward model e um value model, e é sensível a hiperparâmetros; o DPO precisa só da política e da referência e treina como um SFT, o que explica a adopção em equipas pequenas.',
        },
        {
          type: 'p',
          text: 'Para um AI engineer aplicado, a pergunta prática é quando usar. Uso preference tuning quando sei dizer qual de duas respostas é melhor mas não sei escrever a ideal — tom, concisão, recusar no momento certo — e tenho volume de pares. Antes disso verifico se o problema não se resolve com prompt, SFT ou um filtro.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O juiz passa a ser o objectivo',
          text: 'Se as preferências vêm de um LLM-como-juiz, o modelo aprende a agradar ao juiz: respostas mais longas, mais confiantes, com o estilo que o juiz favorece. Calibra o juiz contra humanos antes de o usar para gerar pares.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Ouyang et al. (2022) — Training language models to follow instructions with human feedback', url: 'https://arxiv.org/abs/2203.02155' },
            { label: 'Rafailov et al. (2023) — Direct Preference Optimization', url: 'https://arxiv.org/abs/2305.18290' },
            { label: 'Hugging Face TRL — DPO Trainer', url: 'https://huggingface.co/docs/trl/dpo_trainer' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que preference tuning aprende com comparações entre respostas, não com respostas-alvo.',
          'Descreve o RLHF em três fases: SFT, reward model, PPO com penalização KL.',
          'Explica que o DPO dispensa o reward model explícito e a amostragem durante o treino.',
          'Explica o papel do modelo de referência e do KL (ou do β) contra reward hacking.',
          'Diz quando usaria preference tuning num produto e o que tentaria antes.',
        ],
        fraco: '«RLHF é o modelo aprender com feedback dos utilizadores em tempo real.»',
        solido: 'Descreve as fases do RLHF, o que o DPO simplifica e o papel do modelo de referência.',
        excelente: 'Acrescenta o custo operacional (modelos em memória, estabilidade), o risco de optimizar contra um juiz enviesado e o critério de quando usar no lugar de SFT.',
      },
      seguimento: [
        'Como recolherias pares de preferência num assistente de suporte já em produção?',
        'O que é reward hacking e como o detectarias?',
        'Porque é que o comprimento das respostas tende a crescer depois de preference tuning?',
      ],
      sinaisAlarme: [
        'Dizer que o modelo «aprende online» com os polegares para cima dos utilizadores.',
        'Não saber para que serve o termo KL ou o modelo de referência.',
        'Propor RLHF como primeira opção para um problema de formato.',
      ],
      modulos: ['como-funciona-llm', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-fine-tuning-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Catastrophic forgetting e regressões depois de afinar',
      enunciado:
        'Afinaste um modelo para extrair campos de apólices e a extracção melhorou. Uma semana depois descobres que ele já não responde bem a perguntas simples em inglês e aceita pedidos que antes recusava. O que aconteceu e como o terias evitado?',
      minutos: 5,
      dica: 'Os pesos que mudaste não servem só a tua tarefa.',
      resposta: [
        {
          type: 'p',
          text: 'É **catastrophic forgetting**: ao optimizar os pesos para uma distribuição estreita, o modelo perde parte de capacidades que dependiam dos mesmos pesos — línguas, raciocínio geral e também o comportamento de segurança aprendido no alinhamento. Evita-se com adaptação mais conservadora, dados misturados e, sobretudo, avaliando também o que *não* se queria mudar.',
        },
        {
          type: 'p',
          text: 'O efeito na segurança está documentado: Qi et al. (2023) mostraram que afinar um modelo comercial com 10 exemplos adversariais removia as recusas, e que mesmo datasets benignos, sem intenção maliciosa, degradavam o alinhamento de segurança, em menor grau. Ou seja, um treino «inocente» de extracção pode tornar o modelo mais permissivo.',
        },
        {
          type: 'list',
          items: [
            '**Adaptação de menor capacidade**: LoRA com rank baixo esquece menos do que full fine-tuning (Biderman et al., 2024), à custa de aprender menos no domínio.',
            '**Hiperparâmetros conservadores**: learning rate baixo, poucas épocas, early stopping pela loss de validação — uma época a mais em 800 exemplos é muitas vezes onde a regressão começa.',
            '**Mistura de dados**: incluir uma fracção de exemplos gerais e de recusas correctas no treino (replay), para manter essas saídas no objectivo.',
            '**Âmbito de uso**: se o modelo afinado só recebe pedidos de extracção, encaminhados por um router, a perda de capacidades gerais deixa de ser exposta. É muitas vezes a correcção mais barata.',
          ],
        },
        {
          type: 'p',
          text: 'O que faltou neste caso foi o gate. Antes de promover um modelo afinado corro três baterias com o mesmo harness, no base e no afinado: a tarefa-alvo; um conjunto de capacidades gerais relevantes para o produto (outras línguas, perguntas simples, seguir instruções); e um conjunto de segurança com pedidos que devem ser recusados. A promoção exige ganho na primeira e nenhuma descida fora do intervalo de confiança nas outras duas.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Regressões aparecem fora do dourado',
          text: 'Um dourado só da tarefa-alvo dá sempre boa notícia depois de afinar. As regressões vivem no que não estava no dourado; por isso a bateria de capacidades gerais e de segurança tem de existir antes do primeiro treino.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Qi et al. (2023) — Fine-tuning Aligned Language Models Compromises Safety', url: 'https://arxiv.org/abs/2310.03693' },
            { label: 'Biderman et al. (2024) — LoRA Learns Less and Forgets Less', url: 'https://arxiv.org/abs/2405.09673' },
            { label: 'Kirkpatrick et al. (2017) — Overcoming catastrophic forgetting in neural networks', url: 'https://arxiv.org/abs/1612.00796' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia catastrophic forgetting e explica-o como pesos partilhados optimizados para uma distribuição estreita.',
          'Liga o fenómeno à perda de comportamento de segurança, não só de capacidades gerais.',
          'Propõe pelo menos duas mitigações concretas (LoRA de rank baixo, learning rate e épocas, replay de dados gerais).',
          'Propõe restringir o uso do modelo afinado à tarefa, via router.',
          'Exige baterias de capacidades gerais e de segurança no gate de promoção.',
        ],
        fraco: '«O modelo ficou estragado, re-treinava com mais dados.»',
        solido: 'Explica o esquecimento, propõe LoRA, hiperparâmetros conservadores e mistura de dados, e avalia antes de promover.',
        excelente: 'Acrescenta a evidência de degradação de segurança com dados benignos, a solução de arquitectura (router que confina o modelo à tarefa) e um gate com três baterias e intervalos de confiança.',
      },
      seguimento: [
        'Que proporção de dados gerais misturavas e como a escolhias?',
        'Como construías a bateria de segurança sem a tornar enorme?',
        'Se só pudesses ter um modelo para tudo, afinavas na mesma?',
      ],
      sinaisAlarme: [
        'Avaliar o modelo afinado só na tarefa para que foi treinado.',
        'Assumir que o alinhamento de segurança sobrevive a qualquer fine-tuning.',
        'Propor mais épocas para «consolidar» quando já há regressões.',
      ],
      modulos: ['escolher-modelo', 'guardrails-seguranca', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-fine-tuning-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Avaliar antes e depois sem contaminar o teste',
      enunciado:
        'O teu colega diz que o modelo afinado tem 94% de exactidão contra 78% do base. Que perguntas fazes antes de acreditar nesse número?',
      minutos: 6,
      dica: 'Como foi construído o conjunto de teste e o que é que o modelo afinado já viu dele?',
      resposta: [
        {
          type: 'p',
          text: 'Pergunto se a comparação é justa e se o teste está limpo: **mesmo harness e mesmo conjunto para os dois modelos, baseline com o melhor prompt e não com um prompt fraco, e nenhum exemplo do teste — nem quase-duplicado — no treino.** Sem isso, 16 pontos podem ser fuga de dados ou um baseline mal feito.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Como foi feita a separação', text: 'Se o split foi aleatório por mensagem, mensagens da mesma conversa, do mesmo cliente ou do mesmo template de email ficam dos dois lados e o modelo afinado é premiado por memorizar. Separo por conversa ou cliente e, quando há tempo envolvido, por período: treino até Março, teste em Abril.' },
            { title: 'Quase-duplicados', text: 'Deduplicação exacta não chega. Procuro pares treino-teste com similaridade alta (MinHash ou cosseno de embeddings acima de um limiar) e reporto o número com e sem eles.' },
            { title: 'Dados sintéticos', text: 'Se o treino foi gerado por um modelo a partir dos mesmos documentos que geraram o teste, há fuga de conteúdo mesmo sem texto igual. O teste deve vir de tráfego real ou de anotadores que não viram o treino.' },
            { title: 'Baseline justo', text: 'O 78% foi com um prompt de uma linha ou com instruções e few-shot? Muitos ganhos de fine-tuning encolhem contra um prompt competente.' },
            { title: 'Incerteza', text: 'Com 200 exemplos, o intervalo de confiança de 95% de uma proporção perto de 0,9 tem uma meia-largura de cerca de 4 pontos. Reporto intervalos e uso teste emparelhado (os dois modelos nos mesmos exemplos).' },
          ],
        },
        {
          type: 'p',
          text: 'Há também a contaminação do lado do modelo base: se uso um benchmark público para avaliar capacidades gerais, o base pode ter visto o benchmark no pré-treino (Golchin e Surdeanu, 2023, propõem formas de o detectar). Para decisões de produto prefiro conjuntos privados, construídos a partir do meu tráfego, versionados e nunca usados em treino.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O conjunto de teste nasce primeiro',
          text: 'Separo e congelo o teste antes de escrever o primeiro exemplo de treino, e guardo o hash do ficheiro. Quem gera dados de treino não tem acesso ao teste.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — armadilhas comuns: data leakage', url: 'https://scikit-learn.org/stable/common_pitfalls.html' },
            { label: 'Golchin e Surdeanu (2023) — Time Travel in LLMs: Tracing Data Contamination', url: 'https://arxiv.org/abs/2308.08493' },
            { label: 'scikit-learn — validação cruzada e GroupKFold', url: 'https://scikit-learn.org/stable/modules/cross_validation.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Pergunta como foi feita a separação e propõe split por conversa, cliente ou tempo.',
          'Menciona quase-duplicados e dados sintéticos como fontes de fuga, não só cópias exactas.',
          'Exige um baseline com prompt competente avaliado no mesmo harness.',
          'Fala de incerteza: intervalo de confiança e teste emparelhado.',
          'Distingue contaminação do teste pelo treino de contaminação de benchmarks públicos no pré-treino.',
        ],
        fraco: 'Aceita o número ou pede «mais dados de teste» sem perguntar como foi feita a separação.',
        solido: 'Pergunta pela separação, pelos duplicados e pelo baseline, e pede intervalos de confiança.',
        excelente: 'Acrescenta fuga via dados sintéticos gerados das mesmas fontes, contaminação de benchmarks públicos, e o processo (teste congelado antes do treino, com hash e acesso separado).',
      },
      seguimento: [
        'Como farias o teste de significância entre os dois modelos nos mesmos 200 exemplos?',
        'Que limiar de similaridade usarias para quase-duplicados e como o validavas?',
        'E se o ganho desaparecer com o split temporal?',
      ],
      sinaisAlarme: [
        'Aceitar um ganho de 16 pontos sem perguntar como o teste foi construído.',
        'Comparar o modelo afinado contra o base com um prompt mínimo.',
        'Reportar uma única exactidão sem intervalo com poucas centenas de exemplos.',
      ],
      modulos: ['avaliacao-fundamentos', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-fine-tuning-07',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Afinar o modelo de embeddings para o domínio',
      enunciado:
        'O teu RAG para documentação técnica de uma operadora de telecomunicações falha em termos internos e siglas. Afinavas o modelo de embeddings? O que ganhas, o que pagas e o que tentavas antes?',
      minutos: 7,
      dica: 'Pensa no que acontece ao índice inteiro quando o modelo de embeddings muda.',
      resposta: [
        {
          type: 'p',
          text: 'Só depois de esgotar as opções sem treino. Afinar embeddings pode ajudar quando o vocabulário do domínio falha de forma sistemática, mas obriga a **re-embeddar o corpus inteiro e a versionar o modelo**; antes tento pesquisa híbrida (o BM25 apanha siglas e códigos de forma exacta), re-ranking e expansão de siglas na ingestão.',
        },
        {
          type: 'p',
          text: 'O diagnóstico vem primeiro: pego nas consultas que falham no dourado e classifico-as. Se o problema são siglas e identificadores («APN», «código de erro E-214»), é exactamente onde o lexical ganha e o denso perde — o híbrido resolve sem treino. Se o problema são sinónimos internos («cartão» quer dizer SIM, «linha» quer dizer contrato), um glossário aplicado na ingestão e na consulta resolve uma parte. Fine-tuning compensa quando as falhas são semânticas e espalhadas, e há dados para treinar.',
        },
        {
          type: 'p',
          text: 'Como se faz: pares (consulta, passagem relevante) do domínio — de logs de pesquisa com cliques, de pares pergunta-resposta do suporte, ou gerados por um LLM a partir de chunks e revistos por amostragem. A loss mais comum é contrastiva com negativos in-batch (`MultipleNegativesRankingLoss` no sentence-transformers), e acrescentar negativos difíceis — passagens parecidas mas erradas, minadas com o próprio modelo — é o que mais ensina. Mede-se com recall@k e MRR no dourado de recuperação, comparado com o modelo base e com o híbrido.',
        },
        {
          type: 'table',
          head: ['Opção', 'Ganho típico', 'Custo', 'Risco'],
          rows: [
            ['Híbrido BM25 + denso', 'Siglas, códigos, nomes próprios', 'Um índice lexical e fusão', 'Baixo'],
            ['Re-ranker cross-encoder', 'Precisão no topo', 'Latência por consulta', 'Baixo'],
            ['Glossário na ingestão e na consulta', 'Sinónimos internos conhecidos', 'Manter o glossário', 'Baixo'],
            ['Embeddings afinados', 'Semântica do domínio espalhada', 'Dados, treino, re-embeddar tudo, versionar', 'Esquecer temas gerais; fuga se os pares sintéticos vêm do dourado'],
          ],
        },
        {
          type: 'p',
          text: 'O custo operacional é o que se esquece: vectores de modelos diferentes não são comparáveis, por isso a mudança é uma migração — novo índice em paralelo, re-embeddar todos os chunks, mudar a consulta para o novo modelo no mesmo instante, e manter a versão do modelo em cada linha para poder voltar atrás.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Gerar pares a partir do dourado',
          text: 'Se o LLM gera consultas sintéticas a partir dos mesmos chunks que respondem ao dourado, o recall@k sobe por memorização. Os pares de treino saem de documentos ou períodos diferentes dos do dourado.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Sentence Transformers — visão geral do treino', url: 'https://sbert.net/docs/sentence_transformer/training_overview.html' },
            { label: 'Sentence Transformers — funções de loss', url: 'https://sbert.net/docs/sentence_transformer/loss_overview.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Começa pelo diagnóstico das falhas e distingue siglas/códigos de problemas semânticos.',
          'Propõe pesquisa híbrida, re-ranking ou glossário antes de treinar.',
          'Descreve os dados de treino (pares consulta-passagem) e a loss contrastiva com negativos difíceis.',
          'Diz que mudar o modelo obriga a re-embeddar o corpus inteiro e a versionar o modelo por vector.',
          'Mede com recall@k ou MRR contra o base e contra o híbrido, sem fuga dos pares para o dourado.',
        ],
        fraco: 'Afina logo porque «o modelo não conhece o domínio», sem diagnóstico nem plano de migração do índice.',
        solido: 'Tenta primeiro híbrido e re-ranking, descreve como treinar com pares e negativos e mede no dourado.',
        excelente: 'Acrescenta a migração do índice com versão por linha e rollback, a fuga via pares sintéticos e uma tabela de opções com custo e risco.',
      },
      seguimento: [
        'Como minerarias negativos difíceis sem apanhar falsos negativos?',
        'Quantos pares precisarias para ver diferença e como o sabias?',
        'Como fazias a migração do índice sem downtime?',
      ],
      sinaisAlarme: [
        'Achar que se pode trocar o modelo de embeddings sem re-embeddar o corpus.',
        'Não considerar o BM25 para siglas e códigos.',
        'Avaliar o modelo afinado em consultas geradas dos mesmos chunks do treino.',
      ],
      modulos: ['embeddings', 'pesquisa-hibrida', 'avaliar-rag'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-fine-tuning-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'O custo total de um modelo afinado',
      enunciado:
        'O teu director pergunta quanto custa «ter um modelo nosso» afinado em vez de usar um modelo de API com um bom prompt. Como estruturas a resposta e que números precisas?',
      minutos: 8,
      dica: 'O treino é uma linha da folha de cálculo. Quais são as outras, e quais se repetem?',
      resposta: [
        {
          type: 'p',
          text: 'Estruturo em quatro parcelas — **dados, treino, serving e manutenção** — e comparo com o custo da alternativa ao longo de 12 a 24 meses, não com o custo de um treino. O treino com LoRA é quase sempre a parcela mais pequena; as que pesam são os dados, o serving se for self-hosted e o re-treino sempre que o modelo base muda.',
        },
        {
          type: 'table',
          head: ['Parcela', 'O que inclui', 'Como estimo', 'Repete-se?'],
          rows: [
            ['Dados', 'Recolha, anotação, revisão, limpeza de PII, dourado e baterias de regressão', 'Horas de especialista × exemplos; amostra de revisão', 'Sim, a cada mudança de tarefa ou de política'],
            ['Treino', 'GPU, experiências falhadas, tuning de hiperparâmetros', 'Horas de GPU × número de corridas (conto com várias falhadas)', 'Sim, a cada re-treino'],
            ['Serving', 'API de fine-tuning do fornecedor ou GPUs próprias 24/7, autoscaling, observabilidade', 'Pedidos por segundo × tokens; utilização média das GPUs', 'Contínuo'],
            ['Manutenção', 'Re-treinar e re-avaliar quando o base é descontinuado ou melhora; on-call; equipa', 'Frequência de lançamentos do fornecedor × custo de um ciclo completo', 'Várias vezes por ano'],
          ],
        },
        {
          type: 'p',
          text: 'Dois pontos que mudam a decisão. Primeiro, **um adapter está preso aos pesos do base**: quando o fornecedor lança uma versão nova ou descontinua a antiga, o fine-tune não migra — é um ciclo novo de treino, avaliação e canário. Com um prompt, migrar é correr o dourado no modelo novo. Segundo, **o serving self-hosted paga-se a 24 horas por dia**: uma GPU dedicada a um tráfego que só existe em horário laboral fica ociosa grande parte do tempo, a não ser que haja vários adapters a partilhar o mesmo base.',
        },
        {
          type: 'p',
          text: 'Do lado do ganho, também quantifico: se o modelo afinado é um modelo pequeno que substitui um grande numa tarefa de alto volume, a poupança por pedido multiplicada pelo volume pode pagar tudo em poucos meses — é o caso clássico de destilação. Se é para melhorar o tom de 5% das respostas, raramente paga. Apresento ao director um ponto de equilíbrio: a partir de quantos pedidos por dia o fine-tune compensa, e com que pressupostos.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O custo de oportunidade',
          text: 'Numa equipa pequena, o maior custo é a atenção: um pipeline de treino é mais um sistema para manter. Pergunto sempre que melhoria do produto deixaria de ser feita nesses meses.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI — guia de fine-tuning', url: 'https://platform.openai.com/docs/guides/fine-tuning' },
            { label: 'vLLM — servir vários LoRA adapters', url: 'https://docs.vllm.ai/en/latest/features/lora.html' },
            { label: 'Rajbhandari et al. (2019) — ZeRO: memória de treino por parâmetro', url: 'https://arxiv.org/abs/1910.02054' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Divide o custo em dados, treino, serving e manutenção e diz quais se repetem.',
          'Diz que o treino é tipicamente a parcela mais pequena.',
          'Menciona que o adapter não migra entre versões do base e que isso força re-treino e re-avaliação.',
          'Considera a utilização das GPUs self-hosted e a partilha do base entre adapters.',
          'Apresenta um ponto de equilíbrio em volume e compara com a alternativa num horizonte de meses.',
        ],
        fraco: 'Responde com o preço de uma corrida de treino.',
        solido: 'Lista as quatro parcelas, destaca o re-treino ao mudar de base e compara com o custo da API.',
        excelente: 'Acrescenta o ponto de equilíbrio por volume, a utilização real das GPUs, o caso em que a destilação paga tudo, e o custo de oportunidade da equipa.',
      },
      seguimento: [
        'Que pressupostos fariam o ponto de equilíbrio mudar mais?',
        'Como reduzias o custo de re-treino quando o base muda?',
        'Em que momento recomendavas desligar o modelo afinado?',
      ],
      sinaisAlarme: [
        'Reduzir o custo total ao preço do treino.',
        'Ignorar que o fornecedor descontinua modelos base.',
        'Não ter um critério numérico para decidir.',
      ],
      modulos: ['custo-escala', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-fine-tuning-09',
      tipo: 'design',
      nivel: 'senior',
      titulo: 'Destilar um classificador de intenções de um modelo grande',
      enunciado:
        'Hoje classificas as intenções das mensagens com um modelo grande e um prompt. Funciona, mas é caro e lento. Desenha o pipeline para destilar isto num modelo pequeno.',
      contexto:
        'Banco móvel em Moçambique. 35 intenções (saldo, transferência falhada, PIN bloqueado, fraude suspeita, …), mensagens curtas em português com mistura de changana e inglês. 150 000 mensagens por dia. Hoje: modelo grande via API, p95 de ~2 s, macro-F1 de 0,88 num dourado de 1 200 mensagens anotadas por humanos. Meta: p95 abaixo de 200 ms, custo por mensagem pelo menos 10 vezes menor, macro-F1 não inferior a 0,86, e recall de «fraude suspeita» não inferior ao actual.',
      minutos: 18,
      dica: 'O professor também erra. O que fazes com as mensagens em que o aluno não tem certeza?',
      resposta: [
        {
          type: 'p',
          text: 'Uso o modelo grande como **professor** para etiquetar dezenas de milhares de mensagens reais, treino um aluno pequeno nessas etiquetas, avalio contra o dourado humano (nunca contra o professor), e sirvo o aluno com um **limiar de confiança**: abaixo dele, a mensagem vai ao modelo grande. A intenção «fraude suspeita» tem regras e limiar próprios.',
        },
        {
          type: 'h',
          text: 'Clarificações e estimativas',
        },
        {
          type: 'p',
          text: 'Pergunto se as 35 intenções são estáveis (intenções novas obrigam a re-treinar), qual o custo de errar cada uma (fraude é muito mais cara do que confundir saldo com extracto), e se posso guardar mensagens para treino (consentimento e PII). Volume: 150 000 por dia são ~1,7 por segundo em média; com pico de 5× ficam ~9 por segundo — um modelo pequeno numa CPU ou numa GPU modesta aguenta isto com folga.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Dados', text: 'Amostro 30 000 a 50 000 mensagens de várias semanas, estratificadas por canal e com sobre-amostragem das intenções raras. Mascaro PII antes de tudo. O dourado de 1 200 fica de fora e é deduplicado contra a amostra.' },
            { title: 'Etiquetar com o professor', text: 'O modelo grande devolve intenção, uma justificação curta e uma confiança, com saída estruturada. Uma amostra de 500 é revista por humanos para medir a qualidade do professor por intenção; onde o professor é fraco, essas etiquetas são corrigidas ou excluídas.' },
            { title: 'Baseline barato primeiro', text: 'Regressão logística sobre embeddings de um modelo multilingue. Treina em minutos e diz-me quanto do problema é fácil. Se já cumprir as metas, paro aqui.' },
            { title: 'Aluno', text: 'Se o baseline não chegar: um encoder multilingue pequeno afinado para classificação, ou um LLM pequeno com LoRA que devolve só a etiqueta. Treinar também com a justificação do professor como tarefa auxiliar (distilling step-by-step) pode ajudar com poucos dados.' },
            { title: 'Calibrar e escolher limiares', text: 'Calibro as probabilidades do aluno num conjunto de validação e escolho o limiar de encaminhamento para que a cobertura seja alta e a precisão nas aceites fique acima da do professor. Para fraude, o limiar é escolhido para recall, e há regras (palavras-chave, padrões de montante) que forçam o caminho seguro.' },
            { title: 'Shadow e canário', text: 'O aluno corre em shadow durante uma semana; meço concordância com o professor por intenção e analiso as discordâncias. Depois canário a 5% com métricas de negócio (taxa de transferência para humano, reaberturas).' },
          ],
        },
        {
          type: 'table',
          head: ['Métrica', 'Onde', 'Gate'],
          rows: [
            ['Macro-F1', 'Dourado humano de 1 200', 'Pelo menos 0,86, com intervalo de confiança'],
            ['Recall de «fraude suspeita»', 'Dourado + conjunto dedicado de fraude', 'Não inferior ao do professor'],
            ['Cobertura (aceites pelo aluno)', 'Tráfego em shadow', 'Define a poupança real'],
            ['Concordância aluno-professor', '1% do tráfego, contínuo', 'Alarme se descer — sinal de drift'],
            ['p95 de latência', 'Produção', 'Abaixo de 200 ms no caminho do aluno'],
          ],
        },
        {
          type: 'p',
          text: 'Contas de custo: se o aluno aceitar 90% das mensagens, o modelo grande só recebe 10%, e o custo cai para pouco mais de um décimo do actual mais o serving do aluno. A cobertura é a alavanca: cada ponto de cobertura é um ponto de chamadas ao modelo grande.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Termos do fornecedor e o tecto do professor',
          text: 'Antes de usar saídas de um modelo de API para treinar outro, verifico os termos de utilização do fornecedor. E o aluno raramente passa o professor: se o professor erra sistematicamente numa intenção, o aluno herda o erro — daí a revisão humana por intenção.',
        },
        {
          type: 'p',
          text: 'Operação: re-treino mensal ou quando a concordância desce; versões do aluno com o hash dos dados de treino; uma intenção nova entra primeiro só no professor, até haver exemplos para o aluno. Fica para depois: aprendizagem activa (mandar a humanos as mensagens em que aluno e professor discordam) e um único modelo multi-tarefa para intenção e sentimento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hinton, Vinyals e Dean (2015) — Distilling the Knowledge in a Neural Network', url: 'https://arxiv.org/abs/1503.02531' },
            { label: 'Hsieh et al. (2023) — Distilling Step-by-Step', url: 'https://arxiv.org/abs/2305.02301' },
            { label: 'scikit-learn — calibração de probabilidades', url: 'https://scikit-learn.org/stable/modules/calibration.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa o modelo grande como professor sobre mensagens reais e avalia o aluno contra o dourado humano, não contra o professor.',
          'Mede a qualidade do professor por intenção com revisão humana antes de treinar.',
          'Começa por um baseline barato (regressão logística sobre embeddings) antes de afinar.',
          'Encaminha as mensagens de baixa confiança para o modelo grande, com limiar escolhido em dados de validação.',
          'Trata a intenção de fraude à parte (recall, regras) e define gates com números.',
          'Inclui shadow, canário e monitorização de concordância para drift e re-treino.',
        ],
        fraco: 'Etiqueta com o modelo grande, treina um modelo pequeno e mede a concordância com o professor como métrica final.',
        solido: 'Pipeline completo de dados, professor, aluno, avaliação no dourado humano e encaminhamento por confiança.',
        excelente: 'Acrescenta a qualidade do professor por intenção, o baseline barato, a calibração para escolher limiares, a cobertura como alavanca de custo, os termos do fornecedor e o plano de operação com drift e intenções novas.',
      },
      seguimento: [
        'Como escolhias o limiar de encaminhamento se o custo de errar fraude for 100 vezes o de errar saldo?',
        'O que fazes quando aparece uma intenção nova a meio do mês?',
        'Como lidavas com mensagens em changana em que o professor também é fraco?',
      ],
      sinaisAlarme: [
        'Medir o aluno só pela concordância com o professor.',
        'Saltar directamente para um LLM afinado sem testar um classificador clássico.',
        'Não ter caminho de recurso para mensagens de baixa confiança.',
      ],
      modulos: ['escolher-modelo', 'embeddings', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-fine-tuning-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O modelo afinado é pior em produção do que no teste',
      enunciado:
        'Afinaste um modelo pequeno com LoRA para gerar respostas de seguimento a sinistros. No teste offline teve 91% de respostas aprovadas pelos revisores; em produção, na primeira semana, só 70%. O que investigas e por que ordem?',
      contexto:
        'Seguradora em Portugal. 4 000 exemplos de treino, 400 de teste, separados aleatoriamente por mensagem. O treino foi feito em bf16 com o TRL e o adapter foi servido com vLLM sobre o base quantizado em 4 bits. O prompt de sistema de produção foi actualizado pela equipa de produto na véspera do lançamento. Os traços guardam o prompt completo e a resposta.',
      minutos: 12,
      dica: 'Lista tudo o que é diferente entre a avaliação offline e o pedido real. Há pelo menos quatro diferenças no contexto.',
      resposta: [
        {
          type: 'p',
          text: 'A primeira suspeita é **o pedido em produção não ser o que o modelo viu no treino**: prompt de sistema alterado, chat template diferente, base quantizado em vez de bf16. A segunda é **o teste estar contaminado** pelo split aleatório. Só depois disso suspeito de drift real nos sinistros.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Reproduzir offline o pedido de produção', text: 'Pego em 50 traços de produção e passo-os pelo pipeline de avaliação offline, com os mesmos pesos. Comparo token a token o input renderizado no treino e em produção: o prompt de sistema novo, os tokens especiais do chat template, se o `add_generation_prompt` está igual. Um modelo afinado com um prompt de sistema fixo aprende a depender dele; mudá-lo na véspera é uma mudança de distribuição.' },
            { title: 'Isolar a quantização', text: 'Corro o conjunto de teste em três configurações: base bf16 + adapter (como no treino), base 4 bits + adapter (como em produção), e o mesmo com o prompt antigo. Se a queda está toda na segunda, o adapter não foi treinado para os pesos quantizados; ou sirvo o base em bf16, ou treino com QLoRA sobre o mesmo base quantizado que vou servir.' },
            { title: 'Verificar versões', text: 'Confirmo que o adapter carregado é o que foi avaliado (hash do ficheiro) e que o base em produção é a mesma revisão do treino. Um adapter sobre outra revisão do base dá resultados degradados sem erro nenhum.' },
            { title: 'Medir a contaminação', text: 'O split foi aleatório por mensagem: sinistros do mesmo processo e respostas-modelo quase iguais ficam dos dois lados. Refaço o teste com split por processo ou por mês e removo quase-duplicados. Se o 91% cai para perto de 75%, o número offline nunca foi real.' },
            { title: 'Parâmetros de geração e drift', text: 'Comparo temperatura, `max_tokens` e stop tokens entre avaliação e serving. Só depois olho para a distribuição de produção: tipos de sinistro novos, comprimento das mensagens, línguas — comparando com o treino.' },
          ],
        },
        {
          type: 'p',
          text: 'Pelo contexto, a causa mais provável é uma combinação: o prompt de sistema alterado e a quantização a 4 bits sobre um adapter treinado em bf16, sobre um número offline inflacionado pelo split aleatório. A correcção imediata é voltar ao prompt de treino e servir na mesma precisão do treino; a correcção estrutural é refazer o teste por processo e por tempo.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'O prompt de sistema e o chat template passam a ser artefactos versionados com o adapter; mudar o prompt de um modelo afinado exige correr o gate. O gate corre na configuração exacta de serving (mesma quantização, mesmo motor, mesmos parâmetros de geração). E um pequeno conjunto de traços de produção revisto todas as semanas mede a diferença entre offline e online.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hugging Face — chat templates', url: 'https://huggingface.co/docs/transformers/chat_templating' },
            { label: 'Dettmers et al. (2023) — QLoRA', url: 'https://arxiv.org/abs/2305.14314' },
            { label: 'vLLM — LoRA adapters', url: 'https://docs.vllm.ai/en/latest/features/lora.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Lista as diferenças entre offline e produção: prompt de sistema, template, quantização, parâmetros de geração.',
          'Propõe reproduzir offline os pedidos reais de produção e comparar o input renderizado.',
          'Isola a quantização correndo o teste com o base em bf16 e em 4 bits.',
          'Identifica o split aleatório por mensagem como fonte provável de número offline inflacionado.',
          'Propõe versionar prompt e template com o adapter e correr o gate na configuração exacta de serving.',
        ],
        fraco: 'Conclui que é drift e propõe re-treinar com mais dados de produção.',
        solido: 'Encontra o prompt alterado e a quantização, isola cada um com experiências e corrige.',
        excelente: 'Acrescenta a contaminação do teste por split aleatório, a verificação de versões do adapter e do base, e um gate que corre na configuração de serving com o prompt versionado com o modelo.',
      },
      seguimento: [
        'Se tivesses de servir em 4 bits por custo, como treinavas o adapter?',
        'Como farias para que a equipa de produto possa mudar o prompt sem partir o modelo?',
        'Que tamanho de amostra semanal precisavas para detectar uma queda de 5 pontos?',
      ],
      sinaisAlarme: [
        'Re-treinar antes de comparar o input de produção com o do treino.',
        'Assumir que o adapter funciona igual sobre um base quantizado.',
        'Confiar no 91% sem perguntar como o teste foi separado.',
      ],
      modulos: ['escolher-modelo', 'avaliacao-fundamentos', 'observabilidade-llmops'],
    },
  ],
};
