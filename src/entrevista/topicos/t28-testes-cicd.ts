import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'testes-cicd',
  numero: 28,
  bloco: 'producao',
  titulo: 'Testes, CI/CD e releases',
  resumo:
    'Como se testa uma aplicação que chama modelos não determinísticos: o que corre sem rede em cada commit, o que é eval com modelo real, como uma eval vira gate de CI sem ser ruído, como se versionam prompts e conjuntos dourados com o código, e como se lança uma mudança de prompt ou de modelo com canary, shadow, flags e rollback. É onde o entrevistador separa quem fez demos de quem mantém um sistema.',
  icon: '🧪',
  modulos: ['ci-cd', 'git-fluxo', 'docker'],
  essencial: [
    'Pirâmide para apps LLM: muitos unitários determinísticos com modelo falso, testes de contrato das ferramentas, poucos de integração, e evals com modelo real à parte.',
    'O código à volta do modelo (montar o prompt, validar a saída, retries, routing, ferramentas) é determinístico e testa-se como qualquer código, sem rede, em milissegundos.',
    'Snapshot do prompt montado é útil (apanha mudanças não intencionais e prefixos instáveis); snapshot da resposta do modelo é frágil e testa o fornecedor, não o teu código.',
    'Uma eval é uma estimativa com erro: com n = 80 e p = 0,90 o erro padrão é ≈ 3,4 pontos. Um limiar colado à linha de base falha por acaso.',
    'Gate de PR: comparação pareada com a linha de base, nos mesmos itens, por intenção, com intervalo; eval completa com modelo real e várias amostras corre de noite.',
    'Prompts, configuração de modelo e conjuntos dourados vivem no repositório com o código: um PR muda os três em conjunto e o traço guarda a versão.',
    'Lançar uma mudança de prompt ou modelo é um deploy: shadow para comparar sem risco, canary com métricas online, feature flag para rollback em minutos.',
    'Imagem reprodutível: base fixada por digest, multi-stage, dependências do lockfile, utilizador não-root, sem segredos em camadas.',
    '`git bisect run` com um script de eval encontra o commit que degradou a qualidade em log2(N) passos; exit 0 bom, 1 mau, 125 saltar.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-testes-cicd-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'A pirâmide de testes de uma aplicação LLM',
      enunciado:
        'Entras numa equipa cujo assistente só tem testes «end-to-end» que chamam o modelo real e demoram 20 minutos. Como desenhavas a pirâmide de testes?',
      minutos: 5,
      dica: 'Que partes do sistema são determinísticas, mesmo havendo um modelo no meio?',
      resposta: [
        {
          type: 'p',
          text: 'Separo **o que é determinístico** — quase todo o código à volta do modelo — **do que não é**, a resposta do modelo. O primeiro testa-se com modelo falso, sem rede, em segundos, a cada commit; o segundo mede-se com evals, que são estatística e não testes de passa/falha.',
        },
        {
          type: 'table',
          head: ['Camada', 'O que verifica', 'Modelo', 'Quando corre'],
          rows: [
            ['Unitários', 'Montagem do prompt, parsing e validação da saída, retries, routing, limites de negócio (reembolso até X)', 'Falso, guionado', 'Cada commit, segundos'],
            ['Contrato das ferramentas', 'Esquema JSON das ferramentas contra a API real que implementam; erros estruturados', 'Nenhum', 'Cada commit'],
            ['Integração', 'Serviço com base vectorial e Postgres reais em contentores, fluxo completo com modelo falso ou respostas gravadas', 'Falso ou gravado', 'Cada PR, minutos'],
            ['Evals', 'Qualidade por intenção num conjunto dourado', 'Real', 'PR (subconjunto) e noite (completo)'],
            ['Produção', 'Métricas online, amostragem com juiz e revisão humana', 'Real', 'Contínuo'],
          ],
        },
        {
          type: 'p',
          text: 'Os testes que mais apanham bugs reais nos unitários: o modelo devolve JSON inválido, uma intenção fora da lista, uma ferramenta com argumentos que não passam a validação, um `stop_reason` de truncagem, um 429 a meio — tudo situações fáceis de guionar com um falso e difíceis de provocar com o modelo real. Os testes de contrato apanham a ferramenta cujo esquema diz `order_id: string` e a API passou a exigir um inteiro.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Assert sobre o texto do modelo',
          text: '`assert resposta == "O seu pedido chega às 20h"` num teste com modelo real é um teste que vai falhar sem que nada tenha partido. Asserções sobre texto gerado são propriedades (contém a referência, JSON válido, sem PII) ou ficam para a eval.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Ham Vocke — The Practical Test Pyramid', url: 'https://martinfowler.com/articles/practical-test-pyramid.html' },
            { label: 'pytest — documentação', url: 'https://docs.pytest.org/en/stable/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa código determinístico (testado com modelo falso) da qualidade do modelo (medida com evals).',
          'Inclui testes de contrato das ferramentas.',
          'Dá exemplos de casos-limite que só se testam bem com modelo falso (JSON inválido, truncagem, 429).',
          'Diz onde corre cada camada e quanto tempo demora.',
        ],
        fraco: 'Mantém os testes com modelo real e propõe apenas paralelizá-los.',
        solido: 'Pirâmide com unitários de modelo falso, integração com contentores e evals separadas, com exemplos concretos.',
        excelente: 'Acrescenta contrato de ferramentas, evals em dois ritmos (PR e noite) e monitorização em produção como a camada de topo.',
      },
      seguimento: [
        'O que fica no modelo falso: respostas guionadas ou um modelo local pequeno?',
        'Como testas que o prompt contém as instruções certas sem testar o texto exacto?',
        'Que percentagem de cobertura procuras e onde?',
      ],
      sinaisAlarme: [
        '«Não se pode testar código com LLMs porque não é determinístico.»',
        'Chamar o modelo real em testes unitários.',
        'Confundir testes com evals.',
      ],
      modulos: ['ci-cd', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-testes-cicd-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Testar código que chama modelos sem rede',
      enunciado:
        'Como garantes que a suite de testes nunca chama o fornecedor do modelo, e que mesmo assim testa a integração com o SDK?',
      minutos: 4,
      dica: 'Há três costuras possíveis: a tua interface, o cliente HTTP, e o próprio socket.',
      resposta: [
        {
          type: 'p',
          text: 'Injecto o modelo atrás de uma **interface minha** e nos testes passo um falso; testo o adaptador do SDK à parte com **respostas HTTP gravadas**; e **bloqueio a rede** na suite para que um esquecimento falhe em vez de gastar dinheiro e ficar instável.',
        },
        {
          type: 'list',
          items: [
            '**Interface própria:** um `Protocol` com `completar(...)` ou um wrapper fino sobre o SDK. A lógica de negócio depende da interface; o falso guiona respostas e regista os pedidos para asserções.',
            '**Adaptador:** o único sítio que conhece o SDK. Testo-o com cassetes (vcrpy grava a primeira execução e reproduz depois) ou com um cliente HTTP falso, cobrindo streaming, erros 429/529 e campos de `usage`. As cassetes são revistas como código: limpar cabeçalhos de autorização antes de as commitar.',
            '**Bloquear a rede:** uma fixture `autouse` que faz `monkeypatch` à abertura de sockets, ou um plugin de bloqueio; em CI, os testes unitários correm sem a variável da chave de API definida.',
            '**Modelos locais pequenos:** úteis em integração para testar o caminho real de tokens, mas mais lentos e ainda não determinísticos; não substituem o falso guionado.',
          ],
        },
        {
          type: 'p',
          text: 'O falso deve ser estrito: se for chamado mais vezes do que o guião prevê, falha. Isso apanha retries a mais e ciclos de agente, que são exactamente os bugs que custam dinheiro.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Mock profundo do SDK',
          text: '`mock.patch("anthropic.Anthropic")` em cada teste acopla a suite aos detalhes internos do SDK e parte em cada versão nova. Faz-se mock da tua fronteira, não da biblioteca de outra pessoa.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pytest — monkeypatch', url: 'https://docs.pytest.org/en/stable/how-to/monkeypatch.html' },
            { label: 'Python — unittest.mock', url: 'https://docs.python.org/3/library/unittest.mock.html' },
            { label: 'vcrpy — gravar e reproduzir HTTP', url: 'https://github.com/kevin1024/vcrpy' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define uma interface própria para o modelo e injecta um falso nos testes.',
          'Testa o adaptador do SDK separadamente com respostas gravadas ou cliente HTTP falso.',
          'Bloqueia a rede ou retira a chave em CI para que uma chamada real falhe.',
          'Torna o falso estrito para apanhar chamadas a mais.',
        ],
        fraco: 'Usa a chave de API num ambiente de teste e espera que o modelo responda igual.',
        solido: 'Interface própria com falso, adaptador testado com cassetes, rede bloqueada nos unitários.',
        excelente: 'Acrescenta o falso estrito como detector de retries e ciclos, a limpeza de segredos nas cassetes e o argumento contra mocks profundos do SDK.',
      },
      seguimento: [
        'Como gravas uma resposta em streaming numa cassete?',
        'Como evitas que as cassetes fiquem desactualizadas quando o SDK muda?',
        'Que casos de erro do fornecedor guionas?',
      ],
      sinaisAlarme: [
        'Testes unitários que precisam da chave de API.',
        'Commitar cassetes com cabeçalhos de autorização.',
        'Fazer patch a funções internas do SDK.',
      ],
      modulos: ['ci-cd', 'apis-de-modelos'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-testes-cicd-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Snapshot e golden tests: onde servem e onde mentem',
      enunciado:
        'Um colega quer gravar as respostas do modelo para 200 perguntas e falhar o CI sempre que alguma mude. Outro quer fazer snapshot do prompt montado. Qual defendes?',
      minutos: 7,
      dica: 'O que é que cada snapshot prende: o teu código ou o comportamento do fornecedor?',
      resposta: [
        {
          type: 'p',
          text: 'Defendo o **snapshot do prompt montado** e recuso o snapshot exacto das respostas do modelo. O primeiro prende algo que o meu código controla e que deve mudar só de propósito; o segundo prende o comportamento estatístico do fornecedor, falha sem que nada tenha partido e treina a equipa a carregar em «actualizar snapshots» sem ler.',
        },
        {
          type: 'compare',
          left: {
            title: 'Snapshot do prompt montado',
            items: [
              'Determinístico: mesma entrada, mesmos bytes',
              'Apanha mudanças não intencionais (uma variável a mais, ordem das ferramentas)',
              'Apanha prefixos instáveis que partem a cache de prompt',
              'O diff no PR mostra ao revisor exactamente o que o modelo vai ler',
            ],
          },
          right: {
            title: 'Snapshot da resposta do modelo',
            items: [
              'Muda com amostragem, versões do modelo e infra do fornecedor',
              'Uma resposta diferente pode ser igualmente certa',
              'Falsos alarmes constantes levam a aprovar diffs sem ler',
              'Não diz se a resposta nova é melhor ou pior',
            ],
          },
        },
        {
          type: 'p',
          text: 'Para a resposta do modelo, o equivalente útil é o **conjunto dourado com critérios**, não com strings: para cada pergunta, propriedades verificáveis (intenção esperada, documento que tem de ser citado, campos do JSON, valor do reembolso, ausência de PII) e, para o texto livre, um juiz calibrado. Isso mede regressões em vez de diferenças.',
        },
        {
          type: 'p',
          text: 'Há um caso intermédio legítimo: respostas **gravadas** (cassetes) como fixtures de testes de integração. Não são o oráculo — o teste verifica o que o meu código faz com aquela resposta, não que o modelo responda assim. Com snapshots de prompt uso uma biblioteca como o syrupy, ficheiros por caso e revisão obrigatória do diff; e com dados de teste anonimizados, porque o snapshot vai para o repositório.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Bónus do snapshot de prompt',
          text: 'Serializar o prefixo duas vezes com as mesmas entradas e comparar bytes é um teste de uma linha que impede a regressão mais cara do tópico de custos: o prefixo que deixa de acertar na cache.',
        },
        {
          type: 'refs',
          items: [
            { label: 'syrupy — snapshot testing para pytest', url: 'https://github.com/syrupy-project/syrupy' },
            { label: 'Anthropic — criar casos de teste e critérios de sucesso', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue snapshot de algo determinístico (prompt) de snapshot de saída estocástica (resposta).',
          'Explica o custo dos falsos alarmes: aprovar snapshots sem ler.',
          'Propõe propriedades verificáveis e juiz em vez de igualdade de strings para as respostas.',
          'Menciona o uso de respostas gravadas como fixtures, não como oráculo.',
        ],
        fraco: 'Aceita o snapshot das respostas «para apanhar regressões» ou rejeita os dois sem alternativa.',
        solido: 'Snapshot do prompt sim, das respostas não, e conjunto dourado com propriedades para medir regressões.',
        excelente: 'Liga o snapshot do prompt à estabilidade da cache, separa fixtures gravadas de oráculos e trata os dados dos snapshots como dados do repositório (anonimizados, revistos).',
      },
      seguimento: [
        'Como escreverias as propriedades para uma resposta sobre reembolsos?',
        'Quem aprova uma mudança no snapshot do prompt?',
        'O que fazes quando o fornecedor actualiza o modelo e 30% das propriedades mudam?',
      ],
      sinaisAlarme: [
        'Igualdade exacta de strings sobre texto gerado.',
        'Usar temperatura 0 como garantia de determinismo.',
        'Snapshots que ninguém revê.',
      ],
      modulos: ['ci-cd', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-testes-cicd-04',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Evals como gate de CI: o que corre no PR e o que corre de noite',
      enunciado:
        'Queres que nenhum PR que piore o assistente chegue a produção. Mas correr o conjunto dourado completo com o modelo real e um juiz demora 25 minutos e custa dinheiro. Como desenhas o gate?',
      minutos: 9,
      dica: 'Pensa em três coisas: quando corre, contra quê compara, e quanto ruído tem a medição.',
      resposta: [
        {
          type: 'p',
          text: 'Dois ritmos. No PR, um **gate rápido e pareado** que só corre quando o PR toca no que afecta a qualidade (prompts, retrieval, configuração de modelo), sobre um subconjunto estratificado por intenção e comparado com a linha de base nos mesmos itens. De noite, a **eval completa** com o modelo real, várias amostras por item e juiz, que alimenta a tendência e apanha o que muda fora do repositório.',
        },
        {
          type: 'table',
          head: ['', 'Gate de PR', 'Eval nocturna'],
          rows: [
            ['Dispara', 'Filtro de caminhos (prompts, rag, config de modelo)', 'Agendada sobre main'],
            ['Conjunto', '~300 itens estratificados, intenções críticas inteiras', 'Completo, mais casos adversariais'],
            ['Comparação', 'Pareada com a linha de base de main, por intenção', 'Contra a série histórica'],
            ['Decisão', 'Bloqueia se uma intenção desce além do intervalo', 'Abre incidente ou issue; não bloqueia ninguém'],
            ['Apanha', 'Regressões causadas pelo PR', 'Deriva do fornecedor, dados novos, interacções'],
          ],
        },
        {
          type: 'p',
          text: 'O ruído é o problema central. Com 80 itens numa intenção e exactidão de 0,90, o erro padrão é √(0,9 × 0,1 / 80) ≈ 3,4 pontos; um limiar fixo a 5 pontos da linha de base falha por acaso cerca de 5% das vezes por intenção, e com várias intenções a probabilidade de um falso vermelho no PR passa os 20%. Por isso: comparação **pareada** (mesmos itens, contar os que passaram de certo a errado e vice-versa), limiares definidos pelo intervalo de confiança e não por um número redondo, intenções críticas com limiar mais apertado e mais itens.',
        },
        {
          type: 'p',
          text: 'Custo, por ordem de grandeza: 300 itens × 2 chamadas (sistema e juiz) × ~3 000 tokens de entrada e ~300 de saída são ~2M tokens de entrada e ~0,2M de saída — alguns USD por execução no escalão médio. Com 50 PRs por dia são centenas de USD por mês: aceitável se o filtro de caminhos impedir que PRs de CSS a corram, e se as respostas da linha de base forem guardadas em vez de regeneradas. Corro as chamadas com concorrência limitada para não roubar quota à produção.',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O gate não é a média',
          text: 'Uma média global estável pode esconder uma intenção crítica que caiu 10 pontos compensada por outra que subiu. O gate decide por intenção e mostra no PR a tabela por intenção com o intervalo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'GitHub Actions — workflow syntax (paths, schedule, concurrency)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa um gate de PR rápido e filtrado de uma eval nocturna completa.',
          'Quantifica o ruído da medição (erro padrão ou intervalo) e as suas consequências para o limiar.',
          'Propõe comparação pareada com a linha de base nos mesmos itens, por intenção.',
          'Estima o custo por execução e por mês e reduz com filtro de caminhos e reutilização da linha de base.',
          'Diz o que a nocturna apanha que o PR não apanha (deriva do fornecedor).',
        ],
        fraco: 'Corre o conjunto completo em cada PR com um limiar global fixo, ou não tem gate porque «é caro».',
        solido: 'Dois ritmos, subconjunto estratificado, limiar por intenção e custo estimado.',
        excelente: 'Fundamenta o limiar no intervalo de confiança, usa comparação pareada, explica a probabilidade de falso vermelho com várias intenções e protege a quota de produção.',
      },
      seguimento: [
        'O que fazes quando a eval nocturna desce e nenhum PR mudou nada?',
        'Como decides quantos itens precisa uma intenção crítica?',
        'Quem pode fazer override do gate e como fica registado?',
      ],
      sinaisAlarme: [
        'Limiar global de «90% ou chumba».',
        'Não saber que a medição tem erro.',
        'Correr evals com modelo real em todos os PRs sem filtro.',
      ],
      modulos: ['ci-cd', 'avaliacao-fundamentos', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-testes-cicd-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Versionar prompts e conjuntos dourados com o código',
      enunciado:
        'A equipa de produto quer editar prompts numa ferramenta web, sem passar pelo repositório. Onde vivem os prompts e os conjuntos dourados no teu sistema, e porquê?',
      minutos: 5,
      dica: 'O que é preciso para reproduzir exactamente a resposta que um cliente recebeu há três semanas?',
      resposta: [
        {
          type: 'p',
          text: 'Prompts, configuração de modelo (nome, parâmetros, ferramentas) e conjuntos dourados vivem **no repositório, com o código**, e mudam em PRs pequenos que correm o gate de evals. Um prompt é código: muda o comportamento do sistema, tem de ser revisto, testado e revertível, e tem de estar ligado à versão do código que o monta.',
        },
        {
          type: 'p',
          text: 'Consequências práticas: cada traço em produção guarda a versão do prompt (hash do conteúdo ou o commit), para reproduzir uma resposta antiga; o PR que muda o prompt muda também os itens dourados que ficaram desactualizados, e o revisor vê os dois diffs juntos; a linha de base das evals é a de main, portanto trunk-based com ramos curtos mantém essa comparação válida. Um ramo de três semanas compara-se com uma main que já não existe.',
        },
        {
          type: 'p',
          text: 'Para o conjunto dourado: ficheiros JSONL com esquema validado no CI (id estável, intenção, entrada, propriedades esperadas, origem e data); quando cresce ou tem anexos, ponteiros com Git LFS ou DVC, mas versionados pelo mesmo commit. Itens novos vêm de incidentes reais anonimizados — cada bug corrigido deixa um item.',
        },
        {
          type: 'p',
          text: 'Quanto ao pedido do produto, o trade-off é real: velocidade de iteração contra controlo. A solução que costumo propor é dar-lhes um ambiente de experimentação (playground com o conjunto dourado e as métricas) onde iteram à vontade, e a passagem a produção é um PR gerado a partir dessa versão. Se usarmos um registo de prompts externo, o deploy fixa a versão por id imutável e o gate corre na mesma.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O prompt editado em produção',
          text: 'Um prompt alterado numa consola sem versão nem eval é a causa clássica de «a qualidade caiu e ninguém mudou nada». Também desfaz o `git bisect`: a regressão não está em nenhum commit.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Trunk Based Development', url: 'https://trunkbaseddevelopment.com/' },
            { label: 'Langfuse — gestão de prompts', url: 'https://langfuse.com/docs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Coloca prompts, configuração de modelo e conjuntos dourados sob controlo de versões com o código.',
          'Liga cada traço de produção à versão do prompt para reprodução.',
          'Relaciona ramos curtos com a validade da linha de base das evals.',
          'Propõe uma solução para a iteração rápida do produto sem perder o gate.',
        ],
        fraco: 'Prompts numa base de dados editável sem versão, ou no código sem eval.',
        solido: 'Prompts e dourados no repositório, PRs pequenos com gate, versão no traço.',
        excelente: 'Acrescenta o esquema validado do dourado, itens vindos de incidentes, e um caminho para o produto iterar (playground com promoção por PR ou registo com ids imutáveis).',
      },
      seguimento: [
        'Como anonimizas um caso real antes de o meter no conjunto dourado?',
        'O conjunto dourado pode ser usado para afinar o prompt? Que risco tem?',
        'Como versionas um índice vectorial que também afecta a qualidade?',
      ],
      sinaisAlarme: [
        'Prompts como strings espalhadas no código sem dono.',
        'Conjunto dourado numa folha de cálculo partilhada.',
        'Não saber que versão de prompt produziu uma resposta.',
      ],
      modulos: ['git-fluxo', 'ci-cd', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-testes-cicd-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Lançar um prompt ou modelo novo: canary, shadow ou flag',
      enunciado:
        'Passou o gate offline uma mudança de modelo para o assistente de uma seguradora. Como a lanças? Compara canary, shadow traffic e feature flags, e diz como fazes rollback.',
      minutos: 8,
      dica: 'Qual das três deixa medir sem que nenhum cliente veja a resposta nova?',
      resposta: [
        {
          type: 'p',
          text: 'Uso as três em sequência, porque respondem a perguntas diferentes: **shadow** mede a resposta nova no tráfego real sem risco; **canary** mede o efeito nos utilizadores numa fracção pequena; a **feature flag** é o mecanismo que escolhe a variante por pedido e permite voltar atrás em minutos sem deploy.',
        },
        {
          type: 'table',
          head: ['', 'Shadow', 'Canary', 'Feature flag'],
          rows: [
            ['O que é', 'Variante corre em paralelo, resposta descartada', 'Fracção do tráfego recebe a variante', 'Interruptor por pedido, tenant ou utilizador'],
            ['Risco para o cliente', 'Nenhum', 'Limitado à fracção', 'Depende da regra'],
            ['Custo', 'Duplica as chamadas na amostra', 'Nenhum extra', 'Nenhum extra'],
            ['Mede', 'Diferenças de resposta, latência, custo, juiz', 'Métricas de resultado: escalamento, repetição, satisfação', 'Nada sozinho; é o mecanismo'],
            ['Cuidado', 'Ferramentas com efeito não podem correr em shadow', 'Amostra pequena, sinal lento', 'Flags velhas viram dívida'],
          ],
        },
        {
          type: 'p',
          text: 'O ponto que costuma faltar: **em shadow, ferramentas com efeito ficam desligadas ou simuladas** — a variante não pode emitir um segundo reembolso ou enviar um SMS. E os dados que vão para outro fornecedor em shadow já são uma transferência de dados, que tem de estar autorizada.',
        },
        {
          type: 'p',
          text: 'Canary com critérios escritos antes: 5% durante 48 h, por tenant ou por utilizador de forma estável (o mesmo cliente vê sempre a mesma variante, senão as conversas misturam modelos), com limites de paragem automática — taxa de erro, p95 de latência, custo por conversa — e limites de decisão humana nas métricas lentas. Rollback é desligar a flag; o código das duas variantes coexiste até a nova estar a 100% há uma semana, depois apaga-se a flag e o código antigo.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Rollback que funciona',
          text: 'O rollback de um modelo também inclui o prompt e a configuração que vão com ele, numa só unidade versionada. Trocar só o nome do modelo de volta, deixando o prompt novo, é uma terceira variante nunca avaliada.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Workbook — Canarying Releases', url: 'https://sre.google/workbook/canarying-releases/' },
            { label: 'Pete Hodgson — Feature Toggles', url: 'https://martinfowler.com/articles/feature-toggles.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue o que cada técnica mede e combina-as em sequência.',
          'Desliga ou simula ferramentas com efeito em shadow.',
          'Atribui a variante de forma estável por utilizador ou tenant no canary.',
          'Define critérios de paragem antes e rollback por flag sem deploy.',
          'Faz rollback de prompt, modelo e configuração como uma unidade.',
        ],
        fraco: '«Faz deploy e vê se há queixas», ou um canary sem critérios de paragem.',
        solido: 'Shadow, depois canary com métricas e flag para rollback.',
        excelente: 'Acrescenta efeitos colaterais em shadow, atribuição estável, unidade de rollback e a limpeza das flags depois do lançamento.',
      },
      seguimento: [
        'Com 2% de canary, quanto tempo precisas para ver uma descida de 2 pontos na taxa de resolução?',
        'Como comparas automaticamente as respostas em shadow?',
        'O que fazes se o canary for bom num tenant e mau noutro?',
      ],
      sinaisAlarme: [
        'Shadow com ferramentas reais ligadas.',
        'Atribuir a variante aleatoriamente por pedido numa conversa multi-turno.',
        'Não ter rollback que não exija deploy.',
      ],
      modulos: ['ci-cd', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-testes-cicd-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Uma imagem Docker reprodutível para o serviço',
      enunciado:
        'A imagem do serviço tem 3 GB, corre como root e de vez em quando o build de hoje não se comporta como o de ontem. O que mudavas no Dockerfile?',
      minutos: 5,
      dica: 'O que é que muda entre dois builds do mesmo commit?',
      resposta: [
        {
          type: 'p',
          text: 'Torno o build **função do commit e de nada mais**: imagem base fixada por digest, dependências instaladas do lockfile, multi-stage para deixar as ferramentas de build fora da imagem final, utilizador não-root, e nada de segredos nem pesos de modelo dentro das camadas.',
        },
        {
          type: 'code',
          lang: 'dockerfile',
          caption: 'Multi-stage com uv; os digests ficam fixados (aqui abreviados)',
          code: `FROM python:3.13-slim@sha256:<digest> AS build
COPY --from=ghcr.io/astral-sh/uv@sha256:<digest> /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
# camadas de dependências antes do código: cache de build reaproveitada
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --locked --no-dev --no-install-project
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv sync --locked --no-dev

FROM python:3.13-slim@sha256:<digest>
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER app
CMD ["uvicorn", "assistente.api:app", "--host", "0.0.0.0", "--port", "8000"]`,
        },
        {
          type: 'p',
          text: 'Porque cada linha: `--locked` falha se o lockfile não corresponder ao `pyproject.toml`, em vez de resolver versões novas silenciosamente; o digest impede que `python:3.13-slim` mude por baixo; o multi-stage tira compiladores e caches (é daqui que vêm a maior parte dos GB, juntamente com pesos de modelos e bibliotecas de GPU que um serviço que chama uma API não precisa). Segredos de build, como um token de um índice privado, entram por `--mount=type=secret`, nunca por `ARG` ou `ENV`, que ficam no histórico da imagem.',
        },
        {
          type: 'p',
          text: 'No CI: build com cache remota, scan de vulnerabilidades, SBOM e tag pelo SHA do commit (não `latest`); o deploy referencia a imagem por digest. Um `.dockerignore` mantém `.env`, `.git` e dados fora do contexto de build. Actualizar dependências e digests é um PR automático (Dependabot ou Renovate) que corre o gate de evals — uma versão nova do SDK também pode mudar o comportamento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Docker — multi-stage builds', url: 'https://docs.docker.com/build/building/multi-stage/' },
            { label: 'Docker — boas práticas de build', url: 'https://docs.docker.com/build/building/best-practices/' },
            { label: 'uv — integração com Docker', url: 'https://docs.astral.sh/uv/guides/integration/docker/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Fixa a imagem base por digest e instala dependências de um lockfile com verificação.',
          'Usa multi-stage e explica de onde vem o tamanho.',
          'Corre como utilizador não-root.',
          'Trata segredos de build com secret mounts e nunca com ARG ou ENV.',
          'Etiqueta e faz deploy por SHA ou digest, não por latest.',
        ],
        fraco: 'Muda a base para alpine e acha que resolveu.',
        solido: 'Multi-stage, lockfile, digest, não-root e tag por commit.',
        excelente: 'Acrescenta segredos de build, SBOM e scan no CI, e trata actualizações de dependências como mudanças que passam pelo gate de evals.',
      },
      seguimento: [
        'Onde vivem os pesos de um modelo local se não estão na imagem?',
        'Como verificas que dois builds do mesmo commit dão a mesma imagem?',
        'Que permissões precisa o contentor em Kubernetes?',
      ],
      sinaisAlarme: [
        '`pip install` sem versões fixadas no Dockerfile.',
        'Chave de API num `ENV` do Dockerfile.',
        'Deploy de `:latest`.',
      ],
      modulos: ['docker', 'ci-cd'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-testes-cicd-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'git bisect para encontrar uma regressão de qualidade',
      enunciado:
        'A eval nocturna mostra que a exactidão em «reembolsos» caiu 9 pontos ao longo das últimas duas semanas, com 60 commits pelo meio. Como encontras o commit culpado?',
      minutos: 5,
      dica: 'O bisect precisa de um oráculo bom/mau por commit. O que é que torna esse oráculo fiável quando o modelo não é determinístico?',
      resposta: [
        {
          type: 'p',
          text: 'Uso `git bisect run` com um script que corre uma **eval reduzida da intenção afectada** e devolve 0 (bom) ou 1 (mau). Com 60 commits são ~6 passos (log2 60 ≈ 5,9) em vez de 60 avaliações. O trabalho está em tornar o script um oráculo fiável apesar do ruído.',
        },
        {
          type: 'code',
          lang: 'bash',
          caption: 'Os códigos de saída são os do git bisect run: 0 bom, 1–127 mau (excepto 125), 125 saltar',
          code: `git bisect start HEAD v2026.10.13   # mau, bom
git bisect run ./scripts/bisect_eval.sh

# scripts/bisect_eval.sh
#!/usr/bin/env bash
set -u
uv sync --locked --quiet || exit 125          # commit que não instala: saltar
uv run python -m evals.correr \\
  --intencao reembolsos --amostras 3 --limiar 0.84 || exit 1
exit 0`,
        },
        {
          type: 'p',
          text: 'O limiar fica **a meio** entre o valor bom (~0,90) e o mau (~0,81), não colado ao bom, e cada item corre 3 vezes para reduzir a variância; uso só os itens de reembolsos (~80) para cada passo custar minutos e cêntimos. Antes de começar, confirmo o oráculo: corro o script no commit bom e no mau duas vezes cada e verifico que dá sempre a mesma resposta. Se não der, aumento itens ou amostras antes de bisectar — um oráculo que erra uma vez manda o bisect para o commit errado sem aviso.',
        },
        {
          type: 'p',
          text: 'O bisect só encontra o que está no repositório. Se a regressão vier do fornecedor (versão nova por trás do mesmo alias), de dados re-ingeridos ou de um prompt editado fora do git, todos os commits dão mau e o primeiro commit do intervalo é falsamente culpado. Por isso, primeiro verifico se a eval da *mesma* versão antiga também caiu hoje: se caiu, o problema não está no código.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Git — git-bisect', url: 'https://git-scm.com/docs/git-bisect' },
            { label: 'Pro Git — Debugging with Git', url: 'https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa git bisect run com um script de eval e sabe os códigos de saída (0, 1, 125).',
          'Estima o número de passos (log2 N).',
          'Põe o limiar a meio entre bom e mau e reduz a variância (mais amostras, intenção afectada).',
          'Valida o oráculo antes de bisectar.',
          'Exclui primeiro causas fora do repositório correndo a versão antiga hoje.',
        ],
        fraco: 'Reverte commits um a um, ou não sabe usar o bisect com algo que não é um teste de passa/falha.',
        solido: 'Bisect run com eval da intenção, limiar razoável e saltos para commits que não instalam.',
        excelente: 'Valida a fiabilidade do oráculo, põe o limiar a meio do intervalo, e exclui deriva do fornecedor ou dos dados antes de culpar um commit.',
      },
      seguimento: [
        'E se o culpado for um merge de um ramo com 15 commits?',
        'Como lidas com um commit que muda o formato do conjunto dourado a meio do intervalo?',
        'Quanto custa o bisect inteiro e quanto tempo demora?',
      ],
      sinaisAlarme: [
        'Bisectar com uma eval que dá resultados diferentes no mesmo commit.',
        'Assumir que a regressão está no código sem verificar o fornecedor.',
        'Avaliar todos os 60 commits.',
      ],
      modulos: ['git-fluxo', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-testes-cicd-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Testar um classificador LLM com um modelo falso',
      enunciado:
        'Tens uma função que classifica a intenção de uma mensagem com um LLM e devolve um resultado validado. Escreve os testes pytest, sem rede, que cobrem o caminho feliz e as falhas do modelo.',
      contexto:
        'Assinatura: `classificar(mensagem: str, modelo: Modelo, max_tentativas: int = 2) -> Classificacao`, onde `Modelo` é um Protocol com `completar(prompt: str) -> str` e `Classificacao` é um dataclass com `intencao`, `confianca` e `tentativas`. Intenções válidas: atraso, reembolso, cancelar, outro. JSON inválido tenta outra vez; intenção fora da lista ou confiança fora de [0, 1] vira «outro»; mensagem vazia não chama o modelo. Tens 20 minutos.',
      minutos: 20,
      dica: 'O falso deve falhar o teste se for chamado mais vezes do que esperas.',
      resposta: [
        {
          type: 'p',
          text: 'Faço um modelo falso que devolve respostas **guionadas por ordem** e regista os prompts, e que levanta erro se for chamado sem guião — assim o mesmo objecto verifica o resultado, o número de chamadas e o conteúdo do prompt. Uma fixture devolve uma fábrica para cada teste escolher o seu guião. Tudo corre em milissegundos e é determinístico.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'classificar.py (a função em teste) e test_classificar.py',
          code: `# classificar.py
import json
from dataclasses import dataclass
from typing import Protocol

INTENCOES = ("atraso", "reembolso", "cancelar", "outro")


class Modelo(Protocol):
    def completar(self, prompt: str) -> str: ...


@dataclass(frozen=True)
class Classificacao:
    intencao: str
    confianca: float
    tentativas: int


def classificar(mensagem: str, modelo: Modelo, max_tentativas: int = 2) -> Classificacao:
    texto = mensagem.strip()
    if not texto:
        return Classificacao("outro", 0.0, 0)  # não gasta uma chamada
    prompt = (
        f"Classifica a mensagem numa de: {', '.join(INTENCOES)}.\\n"
        'Responde só JSON: {"intencao": "...", "confianca": 0.0}\\n'
        f"<mensagem>{texto[:2000]}</mensagem>"
    )
    for tentativa in range(1, max_tentativas + 1):
        bruto = modelo.completar(prompt)
        try:
            dados = json.loads(bruto)
            intencao = dados["intencao"]
            confianca = float(dados["confianca"])
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            continue  # saída mal formada: tenta outra vez
        if intencao not in INTENCOES or not 0.0 <= confianca <= 1.0:
            return Classificacao("outro", 0.0, tentativa)
        return Classificacao(intencao, confianca, tentativa)
    return Classificacao("outro", 0.0, max_tentativas)


# test_classificar.py
import pytest

from classificar import Classificacao, classificar


class ModeloFalso:
    """Devolve respostas guionadas por ordem e regista os prompts recebidos."""

    def __init__(self, respostas: list[str]):
        self.respostas = list(respostas)
        self.prompts: list[str] = []

    def completar(self, prompt: str) -> str:
        self.prompts.append(prompt)
        if not self.respostas:
            raise AssertionError("chamada ao modelo não esperada")
        return self.respostas.pop(0)


@pytest.fixture
def modelo_falso():
    def _fabrica(*respostas: str) -> ModeloFalso:
        return ModeloFalso(list(respostas))
    return _fabrica


def test_caminho_feliz(modelo_falso):
    m = modelo_falso('{"intencao": "atraso", "confianca": 0.92}')
    assert classificar("O pedido está 40 min atrasado", m) == Classificacao("atraso", 0.92, 1)
    assert "<mensagem>O pedido está 40 min atrasado</mensagem>" in m.prompts[0]


def test_json_invalido_tenta_de_novo(modelo_falso):
    m = modelo_falso("Claro! A intenção é reembolso.", '{"intencao": "reembolso", "confianca": 0.8}')
    assert classificar("Quero o dinheiro de volta", m) == Classificacao("reembolso", 0.8, 2)
    assert len(m.prompts) == 2


def test_esgota_tentativas(modelo_falso):
    m = modelo_falso("???", "{")
    assert classificar("olá", m) == Classificacao("outro", 0.0, 2)


@pytest.mark.parametrize("bruto", [
    '{"intencao": "apagar_conta", "confianca": 0.99}',  # fora da lista
    '{"intencao": "atraso", "confianca": 7}',            # fora de [0, 1]
])
def test_saida_fora_do_contrato_vira_outro(modelo_falso, bruto):
    assert classificar("algo", modelo_falso(bruto)).intencao == "outro"


def test_mensagem_vazia_nao_chama_o_modelo(modelo_falso):
    m = modelo_falso()  # sem respostas: qualquer chamada falha o teste
    assert classificar("   ", m) == Classificacao("outro", 0.0, 0)
    assert m.prompts == []

# $ python -m pytest -q
# ......                                                                   [100%]
# 6 passed in 0.01s`,
        },
        {
          type: 'p',
          text: 'Os casos-limite cobertos: texto antes do JSON (o modelo «conversador»), JSON truncado, intenção inventada, confiança fora do intervalo, mensagem só com espaços, e o número exacto de chamadas em cada caso. A mensagem vai entre delimitadores e cortada a 2000 caracteres; o teste do caminho feliz confirma que chega lá inteira. Complexidade irrelevante aqui: O(tentativas) chamadas e o resto é parsing.',
        },
        {
          type: 'p',
          text: 'Extensões que o entrevistador costuma pedir: um teste de snapshot do prompt montado; um teste com o falso a levantar a excepção de rate limit do SDK para verificar que o retry de rede não se mistura com o retry de parsing; propriedades com Hypothesis (qualquer string de entrada devolve sempre uma intenção válida); e o mesmo `classificar` corrido contra o modelo real num job de eval separado, com o conjunto dourado de intenções.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pytest — fixtures', url: 'https://docs.pytest.org/en/stable/how-to/fixtures.html' },
            { label: 'pytest — parametrize', url: 'https://docs.pytest.org/en/stable/how-to/parametrize.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Injecta o modelo e usa um falso guionado, sem rede nem patches ao SDK.',
          'Verifica o número de chamadas (o falso falha se for chamado sem guião).',
          'Cobre JSON inválido com retry, esgotar tentativas, saída fora do contrato e entrada vazia.',
          'Usa fixture e parametrize de forma idiomática e mostra o resultado da execução.',
          'Separa estes testes da eval com o modelo real.',
        ],
        fraco: 'Testa só o caminho feliz, ou faz `mock.patch` ao SDK e asserções sobre texto do modelo.',
        solido: 'Falso guionado com fixture, casos de falha principais e asserções sobre o número de chamadas.',
        excelente: 'Acrescenta o falso estrito como detector de chamadas a mais, verifica o conteúdo do prompt, e propõe snapshot do prompt e propriedades com Hypothesis.',
      },
      seguimento: [
        'Como testavas a mesma função se o modelo fosse assíncrono?',
        'E se o classificador passasse a usar tool calling em vez de JSON em texto?',
        'Que teste acrescentavas para a mensagem com mais de 2000 caracteres?',
      ],
      sinaisAlarme: [
        'Chamar o modelo real dentro do pytest.',
        'Não testar a saída mal formada, que é o caso mais comum em produção.',
        'Asserções que passam com qualquer resultado (por exemplo, só `is not None`).',
      ],
      modulos: ['ci-cd', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-testes-cicd-10',
      tipo: 'debug',
      nivel: 'staff',
      titulo: 'O gate de evals falha aleatoriamente em 1 de cada 4 PRs',
      enunciado:
        'Os engenheiros começaram a carregar em «re-run» até o gate de evals passar. Cerca de um em cada quatro PRs falha à primeira, e a maioria passa à segunda sem mudanças. O que investigas e como corriges?',
      contexto:
        'Banco móvel, assistente com 4 intenções. O gate corre em cada PR com o modelo real: 80 itens por intenção, uma amostra por item, temperatura 0,3, juiz LLM para duas intenções. Regra: cada intenção tem de ficar ≥ 85% (a exactidão habitual é ~90%). Jobs em paralelo no GitHub Actions, com a mesma chave de API que os testes de carga de staging.',
      minutos: 12,
      dica: 'Calcula primeiro quantas vezes este gate falharia se o código não mudasse nada.',
      resposta: [
        {
          type: 'p',
          text: 'A causa principal provavelmente **não é um bug, é estatística**: um limiar fixo 5 pontos abaixo de uma exactidão de ~90% com 80 itens falha por acaso cerca de 5% das vezes por intenção, e com quatro intenções ~20% dos PRs — o «1 em 4» observado, somado ao não-determinismo do modelo e do juiz. Depois há suspeitos de infra que pioram o quadro. Corrijo o desenho do gate, não o número do limiar.',
        },
        {
          type: 'steps',
          items: [
            { title: 'H1 — ruído da medição', text: 'Binomial com n = 80 e p = 0,90: P(menos de 68 certos) ≈ 5,4%; 1 − 0,946⁴ ≈ 20%. Confirmo empiricamente: corro o gate 10 vezes no mesmo commit de main e vejo a dispersão por intenção. Se a dispersão cobre o limiar, está explicado.' },
            { title: 'H2 — erros de infra contados como erros de qualidade', text: 'Nos logs do job, procuro 429 e timeouts: com jobs paralelos e a mesma chave dos testes de carga, uma chamada falhada pode estar a contar como resposta errada. Um item que não obteve resposta não é um item errado; é um item inválido.' },
            { title: 'H3 — juiz instável', text: 'Nas duas intenções com juiz, corro o juiz duas vezes sobre as mesmas respostas e meço a concordância consigo próprio. Um juiz com temperatura acima de 0 ou com um critério ambíguo acrescenta a sua própria variância.' },
            { title: 'H4 — linha de base que se move', text: 'Verifico se os itens são amostrados aleatoriamente sem semente, ou se o alias do modelo mudou de versão entre execuções.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcções, por impacto: (1) **comparação pareada** — corro a linha de base de main e o PR nos mesmos itens e decido sobre a diferença (itens que passaram de certo a errado contra o inverso), com um limite derivado do intervalo de confiança, não sobre um valor absoluto; (2) **reduzir variância** — temperatura 0 no sistema e no juiz para o gate, 2–3 amostras por item nas intenções críticas, juiz com rubrica binária e calibrado contra humanos; (3) **separar infra de qualidade** — chave e quota próprias para CI, concorrência limitada, retries com backoff, e o job falha como «erro de infraestrutura» (amarelo) quando mais de 2% dos itens não obtêm resposta; (4) semente fixa e versão do modelo fixada.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão do próprio gate',
          text: 'Medir a taxa de falsos vermelhos do gate como métrica: uma vez por semana corre em main sem mudanças várias vezes; se falhar em mais de ~2% das execuções, o gate está mal calibrado. E o «re-run até passar» deixa de ser possível sem registo: overrides ficam no PR com justificação.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Miller (2024) — Adding Error Bars to Evals', url: 'https://arxiv.org/abs/2411.00640' },
            { label: 'Anthropic — rate limits', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
            { label: 'GitHub Actions — workflow syntax (concurrency)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Calcula ou estima a probabilidade de falso vermelho com o limiar e o tamanho de amostra dados.',
          'Separa erros de infra (429, timeouts) de respostas erradas.',
          'Considera a variância do juiz e do modelo e propõe medi-la.',
          'Propõe comparação pareada com a linha de base e limites derivados do intervalo.',
          'Trata a fiabilidade do gate como métrica e controla os re-runs.',
        ],
        fraco: 'Baixa o limiar para 80% ou aumenta os retries do job.',
        solido: 'Identifica o ruído estatístico, separa infra de qualidade e reduz a variância com temperatura 0 e mais itens.',
        excelente: 'Faz a conta binomial que explica o «1 em 4», muda para comparação pareada com intervalos, isola a quota de CI e mede a taxa de falsos vermelhos do próprio gate.',
      },
      seguimento: [
        'Que teste estatístico usavas na comparação pareada?',
        'Quantos itens precisarias para detectar uma descida de 3 pontos com confiança?',
        'Como lidas com um PR que melhora uma intenção e piora outra?',
      ],
      sinaisAlarme: [
        'Aceitar o re-run como solução.',
        'Baixar o limiar sem perceber porque falha.',
        'Não distinguir um timeout de uma resposta errada.',
      ],
      modulos: ['ci-cd', 'avaliacao-fundamentos', 'llm-como-juiz'],
    },
  ],
};
