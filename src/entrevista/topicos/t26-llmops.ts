import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'llmops',
  numero: 26,
  bloco: 'producao',
  titulo: 'Observabilidade e LLMOps',
  resumo:
    'Saber o que o sistema fez e se fez bem, depois de estar em produção: traços OpenTelemetry com as convenções gen_ai, métricas e alertas de qualidade, logs sem dados pessoais, versões de prompts, feedback e avaliações online, e drift das perguntas. É aqui que se vê quem já operou um produto LLM e quem só fez a demo.',
  icon: '🔭',
  modulos: ['observabilidade-llmops', 'llm-como-juiz', 'avaliacao-fundamentos'],
  essencial: [
    'Um turno = um traço: span HTTP → `invoke_agent` → `embeddings`, `retrieval`, `chat {modelo}`, `execute_tool {ferramenta}`. O `trace_id` volta ao cliente para ligar o feedback.',
    'Atributos gen_ai mínimos: `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.input_tokens`/`output_tokens`, `gen_ai.response.finish_reasons`.',
    'As convenções gen_ai estão em estado Development e mudam de nome entre versões; o conteúdo das mensagens (`gen_ai.input.messages`) é opt-in. Fixa a versão que usas.',
    'Métricas calculam-se sobre 100% do tráfego; traços com conteúdo amostram-se. Nunca calcules custo a partir de traços amostrados.',
    'Tail sampling: guarda sempre erros, lentos, feedback negativo e escalamentos; uma percentagem fixa do resto.',
    'Prompt é artefacto versionado e imutável; a versão vai em cada span (`gen_ai.prompt.name`/`version`) e o rollback é mudar uma etiqueta, em segundos.',
    'Avaliação online: juiz assíncrono sobre amostra estratificada (mais 100% do feedback negativo), calibrado contra humanos; o score volta ao traço.',
    'Alerta (acorda alguém) por sintomas com volume: erros, TTFT p95 por burn rate, custo/hora, bloqueios de guardrail, falhas de ferramentas. Qualidade média do juiz é ticket diário, não página.',
    'Uma queda de qualidade sem deploy: o que muda sem deploy é o modelo atrás de um alias, o prompt no registo, a base de conhecimento, as ferramentas e o tráfego.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-llmops-01',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'O traço de um turno de agente com RAG, span a span',
      enunciado:
        'Desenha-me o traço OpenTelemetry de um turno do teu assistente: o utilizador pergunta, há recuperação, o modelo chama uma ferramenta e responde. Que spans existem e que atributos pões em cada um?',
      minutos: 6,
      dica: 'Pensa no que precisas para responder, uma semana depois, a «porque é que esta resposta saiu assim e quanto custou».',
      resposta: [
        {
          type: 'p',
          text: 'Um turno é **um traço**, com um span raiz HTTP e filhos para cada passo que pode falhar, demorar ou custar. Uso as convenções semânticas gen_ai do OpenTelemetry para os spans de modelo, embeddings, recuperação, ferramentas e agente — assim qualquer backend (Langfuse, Tempo, um APM) os entende — e acrescento atributos meus, com prefixo próprio, para o que é do domínio.',
        },
        {
          type: 'code',
          lang: 'text',
          caption: 'Nomes de span seguem `{gen_ai.operation.name} {alvo}`. Atributos de domínio com prefixo da empresa.',
          code: String.raw`POST /v1/conversas/{id}/mensagens     http.route, http.response.status_code, app.tenant
└─ invoke_agent suporte               gen_ai.agent.name, gen_ai.conversation.id
   ├─ guarda_entrada                  app.guarda.resultado = permitido | bloqueado
   ├─ embeddings modelo-emb           gen_ai.request.model, gen_ai.usage.input_tokens
   ├─ retrieval politicas             gen_ai.data_source.id, app.k = 20, app.doc_ids, app.score_top1
   ├─ rerank                          app.k_saida = 5, latência
   ├─ chat modelo-medio               gen_ai.provider.name, gen_ai.request.model, gen_ai.response.model,
   │                                  gen_ai.usage.input_tokens / output_tokens,
   │                                  gen_ai.usage.cache_read.input_tokens,
   │                                  gen_ai.response.finish_reasons = ["tool_call"],
   │                                  gen_ai.prompt.name / gen_ai.prompt.version
   ├─ execute_tool estado_pedido      gen_ai.tool.name, gen_ai.tool.call.id, error.type (se falhar)
   └─ chat modelo-medio               … finish_reasons = ["stop"], TTFT como atributo ou evento`,
        },
        {
          type: 'p',
          text: 'Os atributos que mais uso a investigar: `gen_ai.response.model` (o snapshot que respondeu de facto, que pode diferir do pedido), `finish_reasons` (um `length` é uma resposta cortada), tokens por tipo incluindo cache, a versão do prompt, os ids dos documentos recuperados com os scores, e `error.type` nas ferramentas. Com isto calculo custo por turno, vejo onde foi o tempo e reproduzo o contexto.',
        },
        {
          type: 'p',
          text: 'Duas regras de produção. O **conteúdo** das mensagens (`gen_ai.input.messages`, `gen_ai.output.messages`) é opt-in nas convenções e, para mim, só vai para um backend com controlo de acesso e retenção curta, depois de mascarar PII. E as convenções gen_ai estão em estado **Development**: já mudaram nomes (por exemplo, de `gen_ai.system` para `gen_ai.provider.name`), por isso fixo a versão na instrumentação e trato a migração como qualquer outra mudança de esquema.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Um span gigante por turno',
          text: 'Registar só «pedido ao LLM: 4,2 s» esconde que 3 s foram a ferramenta. Sem spans filhos não sabes se a lentidão é recuperação, re-ranking, fila ou modelo, e não consegues somar custo por passo de um agente com 6 chamadas.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — semantic conventions for generative AI (repositório)', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
            { label: 'OpenTelemetry — GenAI semantic conventions', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'OpenTelemetry Python — instrumentação manual', url: 'https://opentelemetry.io/docs/languages/python/instrumentation/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Estrutura o turno como um traço com spans filhos por passo (guarda, embeddings, recuperação, modelo, ferramenta).',
          'Nomeia pelo menos quatro atributos gen_ai correctos, incluindo tokens e modelo pedido vs respondido.',
          'Inclui a versão do prompt e os ids dos documentos recuperados no traço.',
          'Trata o conteúdo das mensagens como opt-in com mascaramento e retenção.',
          'Sabe que as convenções gen_ai estão em Development e fixa a versão.',
        ],
        fraco: '«Uso o Langfuse e ele trata disso», sem saber que spans existem nem que atributos importam.',
        solido: 'Desenha a árvore de spans com atributos gen_ai de tokens, modelo e ferramenta, e liga o traço à conversa.',
        excelente: 'Acrescenta `response.model` vs `request.model`, `finish_reasons`, versão do prompt, ids recuperados, conteúdo opt-in com PII mascarada e a gestão da instabilidade das convenções.',
      },
      seguimento: [
        'Como propagavas o contexto do traço para uma ferramenta que é outro microserviço em Java?',
        'Onde medias o TTFT num stream e como o registavas?',
        'O que mudava no traço se o agente corresse em background, fora do pedido HTTP?',
      ],
      sinaisAlarme: [
        'Pôr o prompt e a resposta completos em todos os spans, sem pensar em PII.',
        'Não distinguir modelo pedido de modelo que respondeu.',
        'Inventar nomes de atributos com segurança, sem saber que a especificação está a mudar.',
      ],
      modulos: ['observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-llmops-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'As métricas do painel de um produto LLM',
      enunciado:
        'Vais montar o painel principal do teu assistente em produção. Que métricas pões lá, e o que é que cada uma te diz?',
      minutos: 5,
      dica: 'Os quatro sinais de ouro continuam a valer; o que é que um LLM acrescenta a eles?',
      resposta: [
        {
          type: 'p',
          text: 'Parto dos sinais clássicos — tráfego, erros, latência, saturação — e acrescento três famílias próprias de LLMs: **tokens e custo**, **comportamento do modelo** (recusas, cortes, bloqueios) e **resultado de negócio** (escalamentos, resolução, feedback). Tudo calculado sobre 100% do tráfego e com cortes por modelo, versão do prompt e tenant.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Como', 'O que me diz'],
          rows: [
            ['TTFT p50/p95 e duração do turno', 'Histograma, em segundos', 'Experiência percebida; a diferença entre o TTFT do utilizador e o do fornecedor é tempo meu'],
            ['Erros por tipo', 'Contador por `error.type`: 429, 5xx do fornecedor, timeout, erro de ferramenta', 'Separa problemas meus, do fornecedor e das integrações'],
            ['Tokens de entrada, saída e cache por turno', 'Contadores e histograma por turno', 'Custo e crescimento do contexto; queda da cache = prompt mudou'],
            ['Custo por turno, por conversa e por tenant', 'Tokens × preço da tabela versionada', 'Margem e anomalias (um loop de agente aparece aqui primeiro)'],
            ['Taxa de recusa e de bloqueio por guardrail', 'Fracção dos turnos', 'Modelo demasiado cauteloso, ou ataque em curso'],
            ['`finish_reason = length`', 'Fracção dos turnos', 'Respostas cortadas por `max_tokens`'],
            ['Recuperação vazia ou de score baixo', 'Fracção dos turnos', 'Perguntas fora da base de conhecimento'],
            ['Escalamentos para humano e feedback negativo', 'Fracção das conversas', 'Proxy de qualidade de negócio'],
          ],
        },
        {
          type: 'p',
          text: 'Dois cuidados. **Cardinalidade**: modelo, versão do prompt, tenant e intenção são boas dimensões; id de utilizador ou de conversa não — esses ficam nos traços. E **nomes**: as convenções gen_ai definem métricas de cliente (nas versões publicadas, `gen_ai.client.operation.duration` e `gen_ai.client.token.usage`; o repositório novo está a reorganizá-las em `gen_ai.client.inference.*`), por isso confirmo a versão antes de construir painéis em cima.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'O que costuma faltar',
          text: 'Custo por unidade de negócio. «Gastámos 900 USD ontem» não diz nada; «0,04 USD por conversa resolvida, contra 0,03 na semana passada» diz se piorámos.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Book — Monitoring Distributed Systems (os quatro sinais)', url: 'https://sre.google/sre-book/monitoring-distributed-systems/' },
            { label: 'OpenTelemetry — semantic conventions for generative AI (métricas)', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
            { label: 'Prometheus — histogramas e summaries', url: 'https://prometheus.io/docs/practices/histograms/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Inclui latência com TTFT separado da duração total, em percentis.',
          'Separa erros por origem (fornecedor, timeout, ferramenta).',
          'Inclui tokens e custo, idealmente por unidade de negócio.',
          'Inclui pelo menos dois sinais de comportamento do modelo (recusa, `length`, guardrail, recuperação vazia).',
          'Fala de cardinalidade das dimensões.',
        ],
        fraco: 'Latência média e número de pedidos, como num serviço CRUD.',
        solido: 'Sinais clássicos mais tokens, custo, recusas e escalamentos, com cortes por modelo e prompt.',
        excelente: 'Acrescenta custo por conversa resolvida, a diferença entre TTFT próprio e do fornecedor, `finish_reason` e cuidado com cardinalidade e com a versão das convenções.',
      },
      seguimento: [
        'Como calculavas o custo se o preço do fornecedor muda a meio do mês?',
        'Que dimensão punhas para conseguir ver um tenant a abusar?',
        'Como medias a taxa de recusa sem um classificador?',
      ],
      sinaisAlarme: [
        'Só médias, sem percentis.',
        'Id de utilizador como label de métrica.',
        'Nenhuma métrica de custo.',
      ],
      modulos: ['observabilidade-llmops', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-llmops-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Logs e traços sem dados pessoais, e o que amostrar',
      enunciado:
        'O jurídico diz que as conversas têm dados pessoais e de saúde. A equipa quer guardar tudo para depurar. Como resolves: o que guardas, onde, durante quanto tempo, e que traços amostras?',
      minutos: 8,
      dica: 'Metadados e conteúdo têm valores e riscos muito diferentes.',
      resposta: [
        {
          type: 'p',
          text: 'Separo **metadados** de **conteúdo**. Metadados (tokens, latências, modelo, versão do prompt, ids de documentos, erros) vão para todos os traços e métricas, sem PII. Conteúdo (perguntas, respostas, contexto) é mascarado na origem, guardado só para uma amostra, num backend com acesso restrito e retenção curta — e tudo isto com base legal e acordo com quem hospeda.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Mascarar na origem', text: 'A instrumentação mascara antes de exportar: NIF, telefone, email, cartões e moradas por regras e por um detector de entidades. O colector OTel volta a filtrar como defesa em profundidade. Ids de utilizador viram pseudónimos com HMAC e chave rodada, para ligar eventos sem expor a pessoa.' },
            { title: 'Retenção diferente por tipo', text: 'Métricas: meses. Traços só com metadados: semanas. Conteúdo mascarado: dias a poucas semanas, com acesso registado. Um pedido de apagamento tem de conseguir encontrar e apagar o conteúdo de um titular.' },
            { title: 'Amostragem na cauda', text: 'Head sampling (decidir no início) perde precisamente os casos interessantes. Com tail sampling no colector guardo 100% dos traços com erro, lentos, com feedback negativo ou escalados, e 5–10% dos restantes.' },
            { title: 'Métricas antes da amostragem', text: 'Custo, taxas e percentis calculam-se no serviço sobre todos os pedidos. Um painel de custo construído a partir de traços amostrados está errado pelo factor de amostragem, e de forma enviesada.' },
          ],
        },
        {
          type: 'table',
          head: ['Opção', 'Ganha', 'Perde'],
          rows: [
            ['Guardar tudo, sem mascarar', 'Depuração total', 'Risco legal e de fuga; acesso amplo a dados de saúde'],
            ['Só metadados', 'Risco mínimo', 'Não consegues ver porque é que uma resposta saiu mal'],
            ['Conteúdo mascarado, amostrado e com retenção curta', 'Depuração dos casos que importam', 'Pipeline de mascaramento para manter e testar; falsos negativos'],
          ],
        },
        {
          type: 'p',
          text: 'Em Portugal e na UE isto não é só boa prática: dados de saúde são categoria especial no RGPD, o fornecedor de observabilidade em SaaS é subcontratante e precisa de acordo, e a localização dos dados importa. Prefiro um backend auto-hospedado ou em região UE para o conteúdo, e o SaaS só com metadados.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O mascaramento que ninguém testa',
          text: 'Um regex de telefone que só apanha o formato português deixa passar números de Moçambique (+258). O mascarador tem um conjunto de teste próprio com exemplos reais anonimizados e corre no CI como qualquer outro código.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — Sampling (head e tail)', url: 'https://opentelemetry.io/docs/concepts/sampling/' },
            { label: 'OWASP Top 10 para aplicações LLM', url: 'https://genai.owasp.org/llm-top-10/' },
            { label: 'EDPB — Comité Europeu para a Protecção de Dados', url: 'https://www.edpb.europa.eu/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa metadados (sempre) de conteúdo (mascarado, amostrado, acesso restrito).',
          'Mascara na origem e repete no colector como defesa em profundidade.',
          'Distingue head de tail sampling e diz o que a cauda guarda sempre.',
          'Diz que métricas e custo se calculam antes da amostragem.',
          'Menciona retenção por tipo de dado e obrigações (RGPD, subcontratante, apagamento).',
        ],
        fraco: '«Guardamos tudo encriptado» ou «não guardamos nada», sem amostragem nem retenção.',
        solido: 'Metadados sempre, conteúdo mascarado e amostrado com tail sampling, retenção curta.',
        excelente: 'Acrescenta pseudonimização com HMAC, testes ao mascarador, métricas sobre 100% do tráfego e o enquadramento RGPD (categoria especial, subcontratante, localização, apagamento).',
      },
      seguimento: [
        'Como apagavas os dados de um titular que pediu o apagamento, se estão em traços?',
        'Que percentagem de amostragem escolhias e como validavas que chega?',
        'Como mascaravas PII dentro de argumentos de ferramentas em JSON?',
      ],
      sinaisAlarme: [
        'Guardar conversas de saúde num SaaS sem pensar em acordo nem região.',
        'Calcular custo a partir de traços amostrados.',
        'Confiar no mascaramento sem o testar.',
      ],
      modulos: ['observabilidade-llmops', 'guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-llmops-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Prompts em produção: registo, rollout e rollback',
      enunciado:
        'O produto quer mudar o prompt do assistente sem esperar por um deploy. A equipa de engenharia quer o prompt no git. Como geres versões de prompts em produção, e como fazes rollout e rollback?',
      minutos: 7,
      dica: 'Um prompt muda o comportamento tanto como código. O que é que o código tem que um campo de texto num painel não tem?',
      resposta: [
        {
          type: 'p',
          text: 'Trato o prompt como **artefacto versionado e imutável**, com o mesmo gate de avaliação que o código. Fonte de verdade no git, avaliação no CI, publicação num registo de prompts com etiquetas (`staging`, `production`); a aplicação lê a etiqueta com cache e fallback. Rollout por percentagem com a versão em cada span; rollback é mover a etiqueta, em segundos.',
        },
        {
          type: 'compare',
          left: {
            title: 'Prompt no código',
            items: [
              'Revisão, histórico e CI de graça',
              'Avaliação obrigatória antes de chegar a produção',
              'Cada mudança exige deploy: lento para iterar',
              'Rollback = redeploy',
            ],
          },
          right: {
            title: 'Prompt num registo editável',
            items: [
              'Muda em minutos, sem deploy, por quem conhece o domínio',
              'Rollback instantâneo movendo a etiqueta',
              'Fácil contornar a avaliação: é a causa clássica de regressões «sem deploy»',
              'Mais uma dependência em tempo de execução',
            ],
          },
        },
        {
          type: 'p',
          text: 'O meio-termo que uso: o produto edita num ambiente de staging do registo (Langfuse, MLflow ou uma tabela própria), uma mudança dispara o mesmo conjunto dourado do CI, e só passa a `production` com o resultado anexado e aprovação. A aplicação faz cache do prompt e, se o registo cair, usa a última versão conhecida embebida na imagem.',
        },
        {
          type: 'list',
          items: [
            '**Identidade**: nome + versão imutável; o modelo e os parâmetros (temperatura, ferramentas) fazem parte da versão, porque mudam o comportamento tanto como o texto.',
            '**Rollout**: canary de 5–10% decidido por hash do id da conversa, para uma conversa não trocar de prompt a meio.',
            '**Comparação**: `gen_ai.prompt.name` e `gen_ai.prompt.version` em cada span permitem cortar feedback, escalamentos, custo e scores do juiz por versão.',
            '**Rollback**: critério escrito antes do rollout (por exemplo, escalamentos +3 pontos com n suficiente) e acção de um clique.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mudar o prompt e o modelo ao mesmo tempo',
          text: 'Se a versão nova muda texto e modelo, e a qualidade cai, não sabes qual das duas foi. Uma variável por rollout, ou pelo menos uma avaliação que as separe.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Langfuse — gestão de prompts', url: 'https://langfuse.com/docs/prompt-management/overview' },
            { label: 'MLflow — documentação', url: 'https://mlflow.org/docs/latest/' },
            { label: 'Martin Fowler — Feature Toggles', url: 'https://martinfowler.com/articles/feature-toggles.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Trata o prompt como artefacto versionado e imutável, que inclui modelo e parâmetros.',
          'Exige o mesmo gate de avaliação para mudanças feitas fora do git.',
          'Propõe rollout por percentagem com afinidade por conversa.',
          'Regista a versão do prompt nos traços e compara métricas por versão.',
          'Define critério de rollback antecipado e cache/fallback se o registo falhar.',
        ],
        fraco: '«Pomos num ficheiro de configuração» ou «no Langfuse», sem avaliação, rollout nem rollback.',
        solido: 'Registo com etiquetas, avaliação antes de promover, versão nos traços e rollback por etiqueta.',
        excelente: 'Acrescenta afinidade por conversa no canary, critério de rollback escrito antes, fallback embebido e o aviso de que um registo sem gate é a principal causa de regressões sem deploy.',
      },
      seguimento: [
        'Como fazias um teste A/B de dois prompts com significância estatística?',
        'Onde guardavas os exemplos few-shot: no prompt ou num índice?',
        'O registo de prompts está em baixo no arranque do serviço. O que acontece?',
      ],
      sinaisAlarme: [
        'Editar o prompt de produção directamente num painel, sem avaliação.',
        'Não conseguir dizer que versão do prompt gerou uma resposta de há uma semana.',
        'Rollback dependente de um deploy completo.',
      ],
      modulos: ['observabilidade-llmops', 'ci-cd'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-llmops-05',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Ligar o feedback do utilizador ao traço',
      enunciado:
        'Tens botões de polegar para cima e para baixo na resposta. Como ligas esse clique ao que o sistema fez, e que outros sinais de satisfação recolhes sem pedir nada ao utilizador?',
      minutos: 5,
      dica: 'O clique chega minutos depois, noutro pedido HTTP. O que é que ele tem de levar consigo?',
      resposta: [
        {
          type: 'p',
          text: 'Devolvo ao cliente o **id do turno** (o `trace_id`, ou um id meu mapeado para ele) no fim do stream; o clique manda esse id para um endpoint de feedback, que regista o valor como **score associado ao traço**. Assim cada polegar aponta para o prompt, a versão, os documentos recuperados e o modelo que geraram aquela resposta.',
        },
        {
          type: 'list',
          items: [
            '**Explícito**: polegar, comentário opcional, motivo escolhido de uma lista curta («incorrecto», «não respondeu», «demasiado longo»). O motivo vale mais do que o polegar.',
            '**Implícito**: o utilizador reformula a mesma pergunta logo a seguir; pede «falar com uma pessoa»; regenera; copia a resposta; abandona a conversa a meio; abre ticket no mesmo dia. Cada um é um evento com o mesmo id.',
            '**De negócio**: o pedido foi resolvido sem ticket em 48 h, o reembolso foi pedido, a encomenda foi cancelada — ligado à conversa por um id e não por texto.',
          ],
        },
        {
          type: 'p',
          text: 'No backend, as convenções gen_ai já têm um evento `gen_ai.evaluation.result` (com `gen_ai.evaluation.name`, `score.value`, `score.label`) que serve tanto para juízes como para feedback humano; em Langfuse é um *score* sobre o traço. Ligado assim, consigo filtrar «todos os polegares para baixo da versão 14 do prompt» e abrir os traços.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'O feedback explícito é raro e enviesado',
          text: 'Só uma pequena fracção dos utilizadores carrega no botão, e quem carrega está muitas vezes zangado. Não uso a taxa de polegares como métrica de qualidade absoluta; uso-a como **fila de revisão** (100% dos negativos vão para a amostra do juiz e para revisão humana) e para comparar versões com a mesma população.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — gen_ai events (evaluation result)', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
            { label: 'Langfuse — scores pelo SDK', url: 'https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Devolve um id do turno ao cliente e associa o feedback ao traço por esse id.',
          'Recolhe motivo e não só polegar.',
          'Nomeia pelo menos três sinais implícitos (reformulação, escalamento, regenerar, abandono).',
          'Reconhece o enviesamento e a raridade do feedback explícito.',
          'Usa o feedback negativo para alimentar revisão e avaliação, não só um número no painel.',
        ],
        fraco: 'Guarda os polegares numa tabela sem ligação ao traço, ou usa a taxa de polegares como métrica de qualidade.',
        solido: 'Liga por id ao traço, junta sinais implícitos e sabe que o explícito é enviesado.',
        excelente: 'Acrescenta sinais de negócio a jusante, o evento de avaliação padronizado e o uso do feedback para alimentar o juiz, a revisão humana e o conjunto dourado.',
      },
      seguimento: [
        'Como distinguias uma reformulação por má resposta de uma pergunta de seguimento normal?',
        'O que fazias com os comentários escritos que contêm dados pessoais?',
        'Como usavas o feedback para crescer o conjunto dourado?',
      ],
      sinaisAlarme: [
        'Feedback sem forma de chegar ao traço.',
        'Tratar 2% de polegares como representativo de todos.',
        'Não pensar em sinais implícitos.',
      ],
      modulos: ['observabilidade-llmops', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-llmops-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Avaliação online com juiz: quanto amostrar e quanto custa',
      enunciado:
        'Queres medir a qualidade em produção todos os dias com um LLM-como-juiz. Avalias todas as conversas? Como escolhes a amostra, o que medes sem resposta de referência, e como sabes que o juiz é de confiança?',
      minutos: 8,
      dica: 'Em produção não tens a resposta certa. Que propriedades consegues verificar só com a pergunta, o contexto e a resposta?',
      resposta: [
        {
          type: 'p',
          text: 'Não avalio tudo: avalio uma **amostra estratificada** mais 100% dos casos de risco, de forma assíncrona e fora do caminho do pedido, com critérios que não precisam de referência — fidelidade ao contexto recuperado, resposta à pergunta, cumprimento de política. O juiz é calibrado contra anotações humanas antes de confiar nele, e re-calibrado periodicamente.',
        },
        {
          type: 'table',
          head: ['Fatia', 'Taxa', 'Porquê'],
          rows: [
            ['Feedback negativo, escalamentos, guardrail activado', '100%', 'São os casos que mais informam e são poucos'],
            ['Tráfego geral, estratificado por intenção', '2–5%', 'Estimar a qualidade por intenção com intervalos razoáveis'],
            ['Versão nova do prompt ou modelo em canary', '20–50% durante o rollout', 'Decidir o rollout com n suficiente'],
            ['Intenções raras ou de alto risco (saúde, dinheiro)', 'Sobre-amostradas', 'Senão nunca aparecem na amostra'],
          ],
        },
        {
          type: 'p',
          text: 'Conta de custo, por ordem de grandeza: 4 000 turnos por dia × 5% = 200 avaliações, cada uma com ~3 k tokens de entrada para um juiz de escalão grande — alguns dólares por dia, irrelevante face ao custo do produto. O custo real é o de **interpretar**: com 200 avaliações por dia, uma proporção de 80% tem intervalo de confiança de ±5–6 pontos; para ver quedas de 3 pontos preciso de agregar por semana ou aumentar a amostra.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Calibrar', text: '200–300 turnos anotados por duas pessoas; meço a concordância do juiz com os humanos (kappa ou exactidão por classe) e itero o critério até estar ao nível da concordância entre humanos.' },
            { title: 'Vigiar o juiz', text: 'Toda a semana, 30–50 avaliações do juiz revistas por um humano. Se o fornecedor do juiz mudar o modelo, re-calibro: o juiz também tem drift.' },
            { title: 'Fechar o ciclo', text: 'O score volta ao traço; os casos que falham entram na fila de revisão e os confirmados entram no conjunto dourado.' },
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O juiz que avalia o próprio modelo',
          text: 'Usar o mesmo modelo para responder e julgar infla os scores (auto-preferência). Uso um juiz de outra família ou de escalão superior, e critérios binários estreitos em vez de «dá uma nota de 1 a 10».',
        },
        {
          type: 'refs',
          items: [
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'RAGAS — métricas sem referência (faithfulness, answer relevancy)', url: 'https://docs.ragas.io/en/stable/' },
            { label: 'Langfuse — avaliação', url: 'https://langfuse.com/docs/evaluation/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe amostra estratificada com 100% dos casos de risco, e justifica não avaliar tudo.',
          'Escolhe critérios que não precisam de referência (fidelidade ao contexto, relevância, política).',
          'Calibra o juiz contra humanos com uma métrica de concordância.',
          'Faz a conta de custo e, sobretudo, de tamanho de amostra para detectar uma queda.',
          'Fecha o ciclo: score no traço, revisão humana, entrada no conjunto dourado.',
        ],
        fraco: '«Avalio tudo com o GPT» ou «avalio 1% aleatório», sem calibração nem estatística.',
        solido: 'Amostra estratificada, critérios sem referência, juiz calibrado e score ligado ao traço.',
        excelente: 'Acrescenta o cálculo de intervalo de confiança e de n para detectar uma queda, sobre-amostragem de intenções raras, drift do próprio juiz e o viés de auto-preferência.',
      },
      seguimento: [
        'Que critério usavas para uma intenção de reembolso, e como o tornavas binário?',
        'O juiz e os humanos concordam em 70%. O que fazes?',
        'Como evitavas que a avaliação online enviasse dados pessoais para mais um fornecedor?',
      ],
      sinaisAlarme: [
        'Confiar no juiz sem nenhuma comparação com humanos.',
        'Avaliar só uma amostra aleatória pequena e tirar conclusões por dia.',
        'Correr o juiz no caminho síncrono do pedido.',
      ],
      modulos: ['llm-como-juiz', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-llmops-07',
      tipo: 'conceito',
      nivel: 'staff',
      titulo: 'Detectar drift nas perguntas e intenções novas',
      enunciado:
        'Seis meses depois do lançamento, o tipo de perguntas que chega já não é o do conjunto dourado. Como detectas automaticamente que a distribuição de perguntas mudou e que surgiram intenções novas?',
      minutos: 6,
      dica: 'Já calculas embeddings das perguntas para a recuperação.',
      resposta: [
        {
          type: 'p',
          text: 'Uso os embeddings das perguntas (já calculados para a recuperação, depois de mascarar PII) e comparo distribuições entre janelas: a **proporção por cluster** de intenções conhecidas e a fracção de perguntas **longe de qualquer cluster conhecido**. Os outliers agrupam-se em candidatos a intenção nova, que um modelo resume e uma pessoa revê.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Referência', text: 'Agrupo as perguntas de um período de referência (k-means ou HDBSCAN sobre os embeddings, eventualmente reduzidos) e dou nome aos clusters; idealmente alinhados com as intenções do conjunto dourado.' },
            { title: 'Atribuir e medir', text: 'Cada pergunta nova vai para o centróide mais próximo, ou fica como «desconhecida» se a semelhança máxima estiver abaixo de um limiar calibrado na referência (por exemplo, o percentil 5 das semelhanças da própria referência).' },
            { title: 'Comparar janelas', text: 'Semana contra referência: proporção por cluster com um índice como o PSI (por convenção, acima de ~0,25 é mudança forte) e a taxa de desconhecidas. Também sinais a jusante por cluster: score top-1 da recuperação, escalamentos, feedback negativo.' },
            { title: 'Descobrir', text: 'Agrupo só as desconhecidas da semana; para cada cluster novo com volume, um LLM resume 20 exemplos num nome e descrição, e uma pessoa decide: intenção nova a suportar, fora do âmbito, ou ruído.' },
          ],
        },
        {
          type: 'p',
          text: 'O que muda depois: as intenções novas confirmadas entram no conjunto dourado (senão a avaliação offline mede um produto que já não existe), a base de conhecimento ganha documentos onde a recuperação está fraca, e o painel passa a ter cortes por intenção — a média global esconde uma intenção nova com 30% de escalamentos se ela for 5% do tráfego.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mudar o modelo de embeddings e chamar-lhe drift',
          text: 'Se o modelo de embeddings muda, o espaço muda e todos os clusters «derivam» de uma vez. A referência tem de ser recalculada com o mesmo modelo, e a mudança de modelo regista-se como evento no painel.',
        },
        {
          type: 'refs',
          items: [
            { label: 'scikit-learn — Clustering (k-means, HDBSCAN)', url: 'https://scikit-learn.org/stable/modules/clustering.html' },
            { label: 'Grootendorst (2022) — BERTopic: neural topic modeling', url: 'https://arxiv.org/abs/2203.05794' },
            { label: 'Sentence Transformers — clustering', url: 'https://sbert.net/examples/sentence_transformer/applications/clustering/README.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa embeddings das perguntas e compara distribuições entre janelas, não exemplos soltos.',
          'Distingue mudança de proporção entre intenções conhecidas de aparecimento de intenções novas (outliers).',
          'Define um limiar de «desconhecida» calibrado e não arbitrário.',
          'Liga o drift a sinais a jusante por intenção (recuperação, escalamentos, feedback).',
          'Fecha o ciclo: revisão humana, conjunto dourado, base de conhecimento.',
        ],
        fraco: '«Olho para as perguntas de vez em quando» ou «calculo a distância média dos embeddings».',
        solido: 'Clusters de referência, atribuição, proporções por janela e outliers agrupados para descoberta.',
        excelente: 'Acrescenta PSI ou equivalente, sinais a jusante por cluster, nomeação assistida com revisão humana, actualização do conjunto dourado e o cuidado com a troca do modelo de embeddings.',
      },
      seguimento: [
        'Como escolhias o número de clusters de referência?',
        'Que fazias se uma intenção nova tiver dados sensíveis (por exemplo, perguntas sobre saúde num banco)?',
        'Como distinguias drift sazonal de drift real?',
      ],
      sinaisAlarme: [
        'Usar só a média do vector das perguntas como sinal.',
        'Detectar e não alterar o conjunto dourado.',
        'Clusterizar texto com PII e mostrá-lo num painel aberto.',
      ],
      modulos: ['observabilidade-llmops', 'embeddings', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-llmops-08',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Alertas de qualidade: o que acorda alguém e o que fica para segunda',
      enunciado:
        'Que alertas configuras para um assistente LLM em produção? O que é que deve acordar alguém às 3 da manhã e o que é que não deve?',
      minutos: 7,
      dica: 'Um alerta que dispara e ninguém consegue resolver naquela hora é ruído.',
      resposta: [
        {
          type: 'p',
          text: 'Pago (acordo alguém) por **sintomas com volume e acção possível**: o serviço falha, está lento contra o SLO, o custo dispara, uma ferramenta caiu, ou os guardrails estão a bloquear muito mais do que o normal. Sinais de qualidade estatísticos — score médio do juiz, feedback, drift — viram **tickets** com revisão diária, porque precisam de horas de dados para serem significativos e raramente têm uma acção nocturna.',
        },
        {
          type: 'table',
          head: ['Sinal', 'Tipo', 'Regra'],
          rows: [
            ['Taxa de erro e TTFT p95', 'Página', 'Burn rate do orçamento de erro em duas janelas (curta e longa)'],
            ['Custo por hora', 'Página', 'Acima de N× o mesmo período da semana anterior, ou do tecto diário: um loop de agente gasta depressa'],
            ['Erros de uma ferramenta', 'Página', 'Taxa acima do limiar com volume mínimo; o agente pode estar a inventar respostas sem ela'],
            ['Bloqueios de guardrail e recusas', 'Página se pico brusco', 'Ataque de prompt injection em curso, ou um deploy que tornou o modelo cauteloso'],
            ['`finish_reason = length`, recuperação vazia', 'Ticket', 'Subida sustentada durante horas'],
            ['Score do juiz, feedback negativo, escalamentos', 'Ticket diário', 'Queda além do intervalo de confiança, por intenção, com n mínimo'],
            ['Drift de perguntas', 'Relatório semanal', 'PSI ou taxa de desconhecidas acima do limiar'],
          ],
        },
        {
          type: 'p',
          text: 'Três regras que evitam ruído. **Volume mínimo**: uma taxa de 50% de erro com 4 pedidos às 4 da manhã não é incidente. **Comparar com a mesma hora da semana anterior**, porque o tráfego e o tipo de perguntas têm ciclo diário e semanal. **Cada alerta tem um runbook** com o primeiro passo — se não sei o que mandar fazer, não é página.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Alertar sobre a média do juiz',
          text: 'Um juiz em 3% das conversas, com variância própria, a disparar páginas por quedas de 2 pontos acorda pessoas por ruído estatístico, e em poucas semanas o alerta é silenciado. Qualidade é tendência, revista com cortes por intenção e versão.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Workbook — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' },
            { label: 'Prometheus — regras de alerta', url: 'https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa página de ticket pelo critério de urgência e de acção possível.',
          'Usa burn rate de SLO para erro e latência, não limiares fixos.',
          'Inclui custo por hora e erros de ferramentas como alertas de página.',
          'Trata scores de qualidade como tendência com significância, não como página.',
          'Exige volume mínimo, comparação sazonal e runbook.',
        ],
        fraco: 'Alertas sobre tudo, incluindo média do juiz, sem volume mínimo nem runbook.',
        solido: 'Página para erros, latência e custo; qualidade como ticket diário com cortes.',
        excelente: 'Acrescenta guardrails como sinal de ataque, burn rate multi-janela, comparação com a semana anterior e a regra de que um alerta sem acção não é página.',
      },
      seguimento: [
        'Como definias o SLO de TTFT para um produto de chat?',
        'O alerta de custo disparou às 3h. Qual é o primeiro passo do runbook?',
        'Como alertavas sobre uma ferramenta que devolve 200 com dados errados?',
      ],
      sinaisAlarme: [
        'Páginas por métricas de qualidade estatísticas e ruidosas.',
        'Nenhum alerta de custo.',
        'Alertas sem dono nem runbook.',
      ],
      modulos: ['observabilidade-llmops', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-llmops-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Plataforma de observabilidade para 12 aplicações LLM',
      enunciado:
        'A empresa tem 12 aplicações com LLMs, feitas por equipas diferentes, cada uma com a sua forma de registar o que faz. Pedem-te uma plataforma comum de observabilidade e avaliação. Como a desenhas? Compras, usas open source ou constróis?',
      contexto:
        'Seguradora em Portugal com operação em Moçambique. 12 aplicações (Python, Java e TypeScript) usam 3 fornecedores de modelos e um modelo self-hosted. Total de ~40 000 turnos por dia, 8 pessoas na equipa de plataforma, 2 delas disponíveis para isto durante um trimestre. Algumas aplicações tratam dados de saúde. Hoje o custo mensal de LLMs só se sabe pela factura dos fornecedores.',
      minutos: 18,
      dica: 'O que tem de ser igual em todas as aplicações, e o que pode continuar a ser escolha de cada equipa?',
      resposta: [
        {
          type: 'p',
          text: 'Padronizo **o formato e o caminho** dos dados, não as ferramentas das equipas: OpenTelemetry com as convenções gen_ai como contrato, um colector central que mascara, amostra e encaminha, e um backend LLM open source auto-hospedado (Langfuse) para traços com conteúdo, scores, datasets e prompts. Construo só a cola: convenções da casa, painéis modelo, um gateway de modelos para custo e chaves, e os workers de avaliação.',
        },
        {
          type: 'h',
          text: 'Clarificar e estimar',
        },
        {
          type: 'list',
          items: [
            'Perguntas: que equipas têm SLO? Quem paga o custo de cada app? Onde podem estar os dados de saúde (região, SaaS ou não)? Já existe stack de observabilidade (Prometheus, Grafana, um APM)?',
            '40 000 turnos/dia × ~8 spans = ~320 000 spans/dia de metadados: volume pequeno para qualquer backend.',
            'Conteúdo: ~10 KB por turno mascarado; com 20% amostrado, ~80 MB/dia, ~2,4 GB por 30 dias de retenção. O problema não é volume, é acesso e conformidade.',
          ],
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Plataforma comum de observabilidade LLM',
            caption: 'As apps emitem OTLP com convenções gen_ai; o gateway de modelos garante custo e uso mesmo em apps mal instrumentadas; o colector central mascara, amostra na cauda e encaminha.',
            cols: 6,
            rows: 4,
            zones: [
              { id: 'z-apps', label: '12 aplicações', col: 0, row: 0, colSpan: 2, rowSpan: 4, tone: 'service' },
              { id: 'z-plat', label: 'Plataforma (região UE)', col: 2, row: 0, colSpan: 4, rowSpan: 4, tone: 'data' },
            ],
            nodes: [
              { id: 'apps', label: 'Apps Python, Java, TS', sub: 'SDK OTel + convenções da casa', col: 0, row: 1, kind: 'service' },
              { id: 'gw', label: 'Gateway de modelos', sub: 'chaves, quotas, custo por app', col: 1, row: 2, kind: 'service' },
              { id: 'forn', label: 'Fornecedores e vLLM', col: 1, row: 3, kind: 'external' },
              { id: 'col', label: 'Colector OTel central', sub: 'mascara PII, tail sampling', col: 2, row: 1, kind: 'queue' },
              { id: 'lf', label: 'Langfuse auto-hospedado', sub: 'conteúdo, scores, prompts', col: 3, row: 0, kind: 'data' },
              { id: 'apm', label: 'Traços e métricas', sub: 'stack existente', col: 3, row: 2, kind: 'data' },
              { id: 'eval', label: 'Workers de avaliação', sub: 'juiz por amostra', col: 4, row: 0, kind: 'agent' },
              { id: 'graf', label: 'Painéis e alertas', sub: 'modelo por app', col: 4, row: 2, kind: 'service' },
              { id: 'dw', label: 'Custo e uso', sub: 'por app, equipa, tenant', col: 5, row: 2, kind: 'data' },
            ],
            edges: [
              { from: 'apps', to: 'col', label: 'OTLP' },
              { from: 'apps', to: 'gw' },
              { from: 'gw', to: 'forn' },
              { from: 'gw', to: 'col', label: 'uso e custo', style: 'dashed' },
              { from: 'col', to: 'lf' },
              { from: 'col', to: 'apm' },
              { from: 'lf', to: 'eval', dir: 'both' },
              { from: 'apm', to: 'graf' },
              { from: 'gw', to: 'dw', style: 'dashed' },
            ],
          },
        },
        {
          type: 'h',
          text: 'Componentes críticos',
        },
        {
          type: 'steps',
          items: [
            { title: 'Contrato de telemetria', text: 'Uma página de convenções: atributos gen_ai obrigatórios, atributos da casa (`app.id`, `app.equipa`, `app.tenant`, versão do prompt), e uma versão fixa das convenções gen_ai. Um teste de conformidade no CI de cada app valida um traço de exemplo contra o contrato.' },
            { title: 'Gateway de modelos', text: 'Todas as chamadas passam por ele: chaves centralizadas, quotas por app, tabela de preços versionada e custo atribuído por app e equipa desde o primeiro dia — mesmo para as apps que ainda não instrumentaram nada. É a peça que dá retorno mais depressa.' },
            { title: 'Colector central', text: 'Mascaramento de PII (com testes), remoção de conteúdo das apps de saúde para o backend geral, tail sampling (100% de erros, lentos e feedback negativo) e encaminhamento por sensibilidade.' },
            { title: 'Avaliação como serviço', text: 'Workers que leem amostras do Langfuse, correm juízes configurados por app e escrevem scores de volta. Cada equipa define critérios; a plataforma fornece execução, calibração e custos.' },
          ],
        },
        {
          type: 'table',
          head: ['Opção', 'A favor', 'Contra'],
          rows: [
            ['SaaS de observabilidade LLM', 'Pronto amanhã; zero operação', 'Dados de saúde fora de casa; custo por evento cresce; dependência'],
            ['Open source auto-hospedado (Langfuse)', 'Dados na região certa; aceita OTLP; prompts e avaliação incluídos', 'Operar Postgres, ClickHouse e armazenamento; upgrades'],
            ['Construir sobre a stack existente', 'Nada novo para operar', 'UI de traços com conteúdo, datasets e scores é meses de trabalho que ninguém financia'],
          ],
        },
        {
          type: 'p',
          text: 'Com 2 pessoas num trimestre, escolho open source auto-hospedado para o conteúdo e a stack existente para métricas e alertas, e não construo UI. Como o contrato é OTLP, trocar de backend mais tarde é configuração do colector, não reescrita das 12 apps. Fases: gateway e custo (mês 1), contrato e colector com as 3 apps mais críticas (mês 2), avaliação online e painéis modelo (mês 3).',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como sei que resultou',
          text: 'Custo por app visível e reconciliado com a factura dentro de ±5%; 12 de 12 apps com traços conformes ao contrato; tempo para responder «porque é que esta resposta saiu assim» de dias para minutos; e cada app com pelo menos um score de qualidade online.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Langfuse — auto-hospedagem', url: 'https://langfuse.com/self-hosting' },
            { label: 'Langfuse — integração OpenTelemetry', url: 'https://langfuse.com/integrations/native/opentelemetry' },
            { label: 'OpenTelemetry Collector', url: 'https://opentelemetry.io/docs/collector/' },
            { label: 'OpenTelemetry — semantic conventions for generative AI', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Padroniza o formato (OTLP com convenções gen_ai e um contrato da casa) e não obriga a uma ferramenta.',
          'Faz estimativas de volume e conclui que o problema é conformidade e acesso, não escala.',
          'Propõe um ponto central (gateway de modelos e/ou colector) para custo, chaves, mascaramento e amostragem.',
          'Compara SaaS, open source e construir com critérios concretos (dados de saúde, equipa, prazo).',
          'Define fases e métricas de sucesso da própria plataforma.',
        ],
        fraco: '«Compramos a ferramenta X para todos», sem contrato de dados, sem PII nem custo por app.',
        solido: 'OTel como contrato, colector central, backend LLM auto-hospedado e comparação buy/build.',
        excelente: 'Acrescenta o gateway como vitória rápida de custo, testes de conformidade no CI das apps, encaminhamento por sensibilidade, avaliação como serviço e métricas de sucesso reconciliadas com a factura.',
      },
      seguimento: [
        'Uma equipa Java recusa-se a passar pelo gateway por causa da latência. O que fazes?',
        'Como atribuías o custo de um modelo self-hosted às apps que o usam?',
        'Como mantinhas as 12 apps actualizadas quando as convenções gen_ai mudarem de nome?',
      ],
      sinaisAlarme: [
        'Construir uma UI de traços de raiz com 2 pessoas.',
        'Enviar dados de saúde para um SaaS sem avaliação de conformidade.',
        'Uma plataforma sem forma de atribuir custo por aplicação.',
      ],
      modulos: ['observabilidade-llmops', 'custo-escala'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-llmops-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A satisfação caiu 8 pontos e ninguém fez deploy',
      enunciado:
        'Na última semana, a satisfação do assistente caiu de 78% para 70%. Não houve deploy de código. O director quer saber o que aconteceu até ao fim do dia. Como investigas?',
      contexto:
        'Assistente de apoio ao cliente de um operador de telecomunicações em Moçambique. ~2 000 avaliações de satisfação por semana (sim/não no fim da conversa). RAG sobre ~600 documentos de tarifários e procedimentos, sincronizados todas as noites a partir do CMS do site; ferramentas para consultar saldo e estado de pedidos. Prompts num registo com etiquetas; modelo de API referido por um alias. Traços com versão do prompt, modelo respondido, ids dos documentos e intenção classificada.',
      minutos: 12,
      dica: 'Faz a lista de tudo o que muda o comportamento do sistema sem passar pelo pipeline de deploy.',
      resposta: [
        {
          type: 'p',
          text: 'Primeiro confirmo que a queda é real; depois **segmento** até ela se concentrar num sítio; depois cruzo com tudo o que muda sem deploy — modelo atrás do alias, prompt no registo, base de conhecimento, ferramentas, tráfego e a própria medição. Com 2 000 avaliações por semana, o erro-padrão de uma proporção de ~75% é ~1 ponto: 8 pontos são real, não ruído.',
        },
        {
          type: 'steps',
          items: [
            { title: 'A medição mudou?', text: 'Nova versão da app ou do inquérito, inquérito mostrado a outra população, canal novo. Se a taxa de resposta ao inquérito mudou muito, desconfio da medição antes do sistema.' },
            { title: 'Segmentar a queda', text: 'Por intenção, canal, versão da app, versão do prompt, `gen_ai.response.model`, idioma. Procuro o corte onde a queda se concentra; uma queda uniforme aponta para modelo ou prompt, uma concentrada aponta para conteúdo ou ferramenta.' },
            { title: 'Cruzar com o que muda sem deploy', text: 'Histórico de etiquetas no registo de prompts; mudança de `response.model` com o mesmo `request.model`; logs da sincronização nocturna (documentos alterados, apagados, falhados); taxa de erro e latência das ferramentas; drift de intenções e campanhas comerciais.' },
            { title: 'Ler traços', text: '30–50 conversas com «não» no segmento afectado: que documentos foram recuperados, de que data, e o que a resposta disse.' },
          ],
        },
        {
          type: 'p',
          text: 'Neste cenário, a queda concentra-se na intenção «tarifários e pacotes» (de 80% para 52%), que cresceu de 15% para 25% do tráfego. Modelo e prompt estáveis. O marketing lançou novos pacotes de dados na segunda-feira; a sincronização nocturna falha desde essa altura numa secção do CMS que mudou de estrutura — corre «com sucesso» com 0 documentos actualizados. O assistente responde com preços antigos, com toda a confiança e fiel ao contexto (o juiz de faithfulness não vê nada de errado).',
        },
        {
          type: 'p',
          text: 'Correcção imediata: corrigir o conector, reindexar, e até lá uma resposta que encaminha perguntas sobre pacotes novos para a página oficial. Comunicação ao director: causa, segmento afectado, número de conversas, data da correcção.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Monitorização de frescura por fonte (idade do documento mais recente, número de documentos alterados por noite, alerta se 0 durante 2 dias numa fonte que costuma mudar); um conjunto pequeno de perguntas sentinela sobre preços correntes, avaliadas todas as manhãs; painel de satisfação com corte por intenção; e o calendário de campanhas comerciais como anotação no painel.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Book — Effective Troubleshooting', url: 'https://sre.google/sre-book/effective-troubleshooting/' },
            { label: 'Langfuse — documentação (traços, sessões e scores)', url: 'https://langfuse.com/docs' },
            { label: 'OpenTelemetry — semantic conventions for generative AI', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Verifica se a queda é estatisticamente real e se a medição mudou.',
          'Segmenta a queda (intenção, versão do prompt, modelo respondido, canal) antes de formular a causa.',
          'Lista o que muda sem deploy: alias do modelo, registo de prompts, base de conhecimento, ferramentas, tráfego.',
          'Lê traços reais do segmento afectado.',
          'Propõe prevenção concreta (frescura das fontes, perguntas sentinela, cortes por intenção).',
        ],
        fraco: '«O modelo piorou» ou «vamos mudar o prompt», sem segmentar nem olhar para traços.',
        solido: 'Segmenta, cruza com mudanças fora do deploy, encontra a causa nos traços e corrige.',
        excelente: 'Quantifica a significância, explica porque o juiz de faithfulness não apanhou o problema, e deixa monitorização de frescura e perguntas sentinela para não voltar.',
      },
      seguimento: [
        'E se a queda fosse uniforme em todas as intenções?',
        'Como detectavas que o fornecedor mudou o modelo por trás do alias?',
        'O que dizias ao director se ainda não tivesses a causa às 18h?',
      ],
      sinaisAlarme: [
        'Mudar o prompt para «melhorar» antes de saber a causa.',
        'Assumir que sem deploy nada mudou.',
        'Olhar só para a média global.',
      ],
      modulos: ['observabilidade-llmops', 'ingestao-chunking', 'avaliar-rag'],
    },
  ],
};
