import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'avaliar-agentes',
  numero: 22,
  bloco: 'avaliacao',
  titulo: 'Avaliar agentes e conversas',
  resumo:
    'Como se avalia um sistema que decide, chama ferramentas e muda estado ao longo de vários turnos: resultado contra trajectória, chamadas a ferramentas, fiabilidade com pass^k, utilizadores e ambientes simulados, custo e regressões. É perguntado porque avaliar só o texto final de um agente deixa passar os erros que custam dinheiro.',
  icon: '🧭',
  modulos: ['avaliar-agentes', 'agentes', 'langgraph'],
  essencial: [
    'Avalia o efeito, não o texto: o reembolso existe na base de dados com o valor certo, e nada mais mudou.',
    'Resultado diz se a tarefa ficou feita; trajectória diz se foi feita da forma permitida, a que custo e com que ferramentas.',
    'Tool-call accuracy em três níveis: ferramenta certa, argumentos certos (comparados por campo, normalizados), ordem certa onde há dependência.',
    'pass@k = 1 − C(n−c, k)/C(n, k): pelo menos um sucesso em k tentativas (Chen et al., 2021). Optimista; serve para explorar capacidade.',
    'pass^k = C(c, k)/C(n, k): sucesso nas k tentativas (τ-bench, Yao et al., 2024). Com p = 0,9 por tentativa, p^8 ≈ 0,43.',
    'τ-bench avalia comparando o estado final da base de dados com o estado-objectivo anotado; gpt-4o teve menos de 50% de sucesso e pass^8 abaixo de 25% em retalho.',
    'Métricas de eficiência por tarefa resolvida: passos, tokens, custo e latência em p50 e p95, não só a média.',
    'Utilizador simulado por LLM permite testar multi-turno, mas introduz variância e pode ser mais cooperativo do que clientes reais.',
    'Ferramentas simuladas deterministas para CI rápido; ambiente com estado (BD em sandbox, reposta por teste) para avaliar efeitos.',
    'SWE-bench tem 2294 tarefas de 12 repositórios Python; o SWE-bench Verified tem 500 validadas por humanos. Benchmarks públicos não substituem o teu conjunto.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-avaliar-agentes-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O agente disse que reembolsou: como sabes que reembolsou mesmo',
      enunciado:
        'O teu agente de apoio responde «O seu reembolso de 30 euros foi processado.» O teu eval aprova a resposta. Que está errado neste eval, e o que avalias num agente: o resultado final ou a trajectória?',
      minutos: 5,
      dica: 'Onde é que o reembolso existe de facto?',
      resposta: [
        {
          type: 'p',
          text: 'O eval avalia **o que o agente disse**, não **o que o agente fez**. Num agente com ferramentas que escrevem, o resultado é o **estado final do sistema**: existe um reembolso de 30 euros para aquela encomenda, uma só vez, e nada mais mudou. Avalio os dois níveis — o resultado pelo estado e a trajectória pelas regras que o caminho tem de cumprir.',
        },
        {
          type: 'p',
          text: 'É exactamente o desenho do τ-bench (Yao et al., 2024): no fim da conversa compara o estado da base de dados com o estado-objectivo anotado, em vez de ler a resposta. Um agente que diz «feito» sem chamar a ferramenta, ou que chama `emitir_reembolso` duas vezes, passa num eval de texto e falha num eval de estado.',
        },
        {
          type: 'table',
          head: ['Nível', 'Pergunta', 'Como verifico'],
          rows: [
            ['Resultado (efeito)', 'A tarefa ficou feita?', 'Diff do estado: registos esperados criados, nenhum registo inesperado alterado'],
            ['Trajectória', 'Foi feita da forma permitida?', 'Regras sobre o traço: verificou a encomenda antes de reembolsar, não excedeu o limite, pediu confirmação'],
            ['Eficiência', 'A que custo?', 'Passos, tokens, custo e latência por tarefa'],
            ['Comunicação', 'Disse a verdade ao cliente?', 'Consistência entre a resposta e o estado (juiz ou asserção sobre o valor)'],
          ],
        },
        {
          type: 'p',
          text: 'Não exijo uma trajectória exacta: há vários caminhos válidos, e fixar a sequência de chamadas torna o teste frágil. Exijo **invariantes** — ferramentas proibidas nunca chamadas, pré-condições antes de escritas, limites respeitados. O resultado é a métrica principal; a trajectória é onde estão as regras de negócio e o custo.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'A resposta mente com confiança',
          text: 'Um modelo pode gerar «foi processado» porque é a continuação mais provável da conversa, com ou sem chamada à ferramenta. Por isso também verifico a consistência inversa: se a resposta afirma uma acção, o traço tem de conter a chamada bem-sucedida correspondente.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2024) — τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains', url: 'https://arxiv.org/abs/2406.12045' },
            { label: 'Anthropic — Demystifying evals for AI agents (transcript e outcome)', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que o eval tem de verificar o estado (efeito) e não o texto da resposta.',
          'Distingue resultado de trajectória e diz o que cada um apanha.',
          'Propõe invariantes sobre a trajectória em vez de sequência exacta.',
          'Menciona efeitos indesejados (duplicados, registos alterados que não deviam).',
        ],
        fraco: 'Propõe um juiz que lê a resposta para ver se o reembolso foi feito.',
        solido: 'Verifica o estado final da base de dados e algumas regras sobre o traço.',
        excelente: 'Acrescenta a verificação de efeitos colaterais, a consistência entre resposta e estado e a razão para não fixar trajectórias exactas.',
      },
      seguimento: [
        'Como verificas que nada mais mudou sem comparar a base de dados inteira?',
        'Que regras da trajectória são obrigatórias num agente com dinheiro?',
        'E se a ferramenta for um serviço externo que não podes inspeccionar?',
      ],
      sinaisAlarme: [
        'Avaliar um agente com escrita apenas pelo texto final.',
        'Exigir a sequência exacta de chamadas como critério de sucesso.',
        'Não pensar em chamadas duplicadas.',
      ],
      modulos: ['avaliar-agentes', 'agentes'],
    },
    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-avaliar-agentes-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Medir tool-call accuracy: ferramenta, argumentos e ordem',
      enunciado:
        'Como medes se o agente chama as ferramentas certas? Que comparas exactamente, e como lidas com argumentos que estão certos mas escritos de outra forma?',
      minutos: 5,
      resposta: [
        {
          type: 'p',
          text: 'Meço em três níveis, separados porque falham por razões diferentes: **selecção** (chamou a ferramenta certa, e não chamou as proibidas), **argumentos** (valores correctos, comparados por campo depois de normalizar) e **ordem** (as dependências foram respeitadas). Reporto cada um como taxa sobre os casos anotados, mais uma taxa composta de «todas as chamadas certas».',
        },
        {
          type: 'steps',
          items: [
            { title: 'Selecção', text: 'Precisão e recall sobre o conjunto de chamadas esperadas: chamou o que devia (recall), não chamou o que não devia (precisão). Uma chamada a `emitir_reembolso` num caso em que devia escalar é um erro grave, não só um ponto a menos.' },
            { title: 'Argumentos', text: 'Comparo o objecto de argumentos, não a string JSON. Normalizo antes: datas para ISO 8601, montantes para decimal em cêntimos, identificadores em maiúsculas. Para campos de texto livre (o motivo do reembolso) uso uma regra mais branda ou um juiz.' },
            { title: 'Ordem', text: 'Não exijo a sequência exacta: verifico uma ordem parcial. `consultar_encomenda` antes de `emitir_reembolso`; leituras independentes podem vir em qualquer ordem ou em paralelo.' },
          ],
        },
        {
          type: 'p',
          text: 'É a mesma ideia do Berkeley Function Calling Leaderboard, que compara a chamada pela estrutura (AST) em vez do texto. Na prática escrevo os esperados como especificação por caso: chamadas obrigatórias com os argumentos que importam, chamadas proibidas, e precedências. Argumentos irrelevantes ficam fora da comparação para não chumbar caminhos válidos.',
        },
        {
          type: 'p',
          text: 'Também conto as chamadas **redundantes** (consultar a mesma encomenda três vezes) e as **com erro** (argumentos que o esquema rejeitou). Não tornam o caso falhado, mas medem desperdício e são os primeiros sinais de um prompt ou de uma descrição de ferramenta mal escritos.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Melhorar sem mexer no modelo',
          text: 'Quando a selecção falha entre duas ferramentas parecidas, a correcção mais barata costuma ser a descrição das ferramentas (quando usar, quando não usar) ou fundi-las numa só, e não o prompt de sistema.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Gorilla — Berkeley Function Calling Leaderboard', url: 'https://github.com/ShishirPatil/gorilla' },
            { label: 'Anthropic — tool use', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa selecção, argumentos e ordem como métricas distintas.',
          'Compara argumentos por campo com normalização, não por igualdade de string.',
          'Usa ordem parcial (precedências) em vez de sequência exacta.',
          'Inclui chamadas proibidas, redundantes e com erro.',
        ],
        fraco: '«Comparo a lista de chamadas com a esperada», sem normalização nem tolerância a caminhos válidos diferentes.',
        solido: 'Mede os três níveis separadamente com comparação por campo e ordem parcial.',
        excelente: 'Acrescenta a especificação por caso com chamadas proibidas, o desperdício como sinal e a correcção pela descrição das ferramentas.',
      },
      seguimento: [
        'Como avalias o argumento «motivo» que é texto livre?',
        'O agente chamou as ferramentas em paralelo. Isso muda a tua comparação?',
        'Como anotas as chamadas esperadas de 300 casos sem gastar uma semana?',
      ],
      sinaisAlarme: [
        'Comparar JSON como string.',
        'Exigir uma única sequência de chamadas válida.',
        'Ignorar chamadas a ferramentas que não deviam ter sido feitas.',
      ],
      modulos: ['avaliar-agentes', 'tool-calling'],
    },
    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-avaliar-agentes-03',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Passos, custo e latência como métricas de um agente',
      enunciado:
        'Além da taxa de sucesso, que métricas de eficiência recolhes de um agente, e como as reportas para que sejam úteis?',
      minutos: 4,
      resposta: [
        {
          type: 'p',
          text: 'Recolho, por tarefa: **número de passos** (chamadas ao modelo e a ferramentas), **tokens de entrada e saída**, **custo** e **latência ponta a ponta**, e reporto em **p50 e p95**, e normalizado por **tarefa resolvida**. Um agente pode ter a mesma taxa de sucesso e o dobro do custo, e um eval só de sucesso não vê isso.',
        },
        {
          type: 'p',
          text: 'Os agentes têm distribuições de cauda longa: a maioria das tarefas resolve-se em quatro ou cinco passos, e algumas entram em ciclo até ao limite de iterações. A média esconde isso; o p95 e a contagem de tarefas que batem no limite de passos mostram-no. Os tokens de entrada crescem com cada passo, porque o histórico inteiro volta a entrar no contexto, por isso o custo cresce mais do que linearmente com os passos se não houver cache de prompt ou compactação.',
        },
        {
          type: 'table',
          head: ['Métrica', 'Como reporto', 'O que revela'],
          rows: [
            ['Passos por tarefa', 'p50, p95, fracção que bate no limite', 'Ciclos, ferramentas mal descritas'],
            ['Tokens e custo', 'Por tarefa resolvida, não por tarefa', 'Prompts que crescem, contexto repetido'],
            ['Latência', 'p50 e p95 ponta a ponta, mais tempo em ferramentas', 'Se o problema é o modelo ou a ferramenta'],
            ['Custo de falhas', 'Custo das tarefas falhadas', 'Quanto se gasta para não resolver'],
          ],
        },
        {
          type: 'p',
          text: 'Recolho tudo a partir dos traços, com os atributos das convenções semânticas GenAI do OpenTelemetry (modelo, tokens de entrada e saída por chamada), para que a mesma instrumentação sirva o eval e a produção. E ponho limites no gate: uma alteração que mantém o sucesso mas sobe o custo por tarefa resolvida mais de, por exemplo, 20% precisa de aprovação explícita.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Lista passos, tokens, custo e latência como métricas por tarefa.',
          'Reporta percentis (p50, p95) e não só médias.',
          'Normaliza o custo por tarefa resolvida.',
          'Explica porque os tokens crescem com os passos (histórico reenviado).',
          'Liga as métricas a um limite no gate de CI.',
        ],
        fraco: 'Reporta só tempo médio de resposta.',
        solido: 'Recolhe as quatro métricas em percentis, normalizadas por tarefa resolvida, a partir dos traços.',
        excelente: 'Acrescenta a cauda de tarefas que batem no limite, o crescimento do contexto por passo e um limite de custo no gate.',
      },
      seguimento: [
        'Que limite de passos defines e como o escolhes?',
        'Como separas latência do modelo de latência das ferramentas?',
        'Vale a pena trocar sucesso por custo? Como decides?',
      ],
      sinaisAlarme: [
        'Não medir custo num sistema com várias chamadas por pedido.',
        'Reportar apenas médias.',
        'Não ter limite de iterações.',
      ],
      modulos: ['avaliar-agentes', 'observabilidade-llmops', 'custo-escala'],
    },
    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-avaliar-agentes-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'pass@k contra pass^k: qual importa para um agente em produção',
      enunciado:
        'Qual é a diferença entre pass@k e pass^k? Escreve as fórmulas e diz qual usarias para decidir se um agente de reembolsos vai para produção.',
      minutos: 5,
      dica: 'O cliente escolhe a melhor de k tentativas?',
      resposta: [
        {
          type: 'p',
          text: '**pass@k** é a probabilidade de pelo menos uma de k tentativas ter sucesso; **pass^k** é a probabilidade de as k tentativas terem todas sucesso. Para um agente em produção uso pass^k, porque o cliente não escolhe a melhor de k: recebe a tentativa que calhou, e o sistema vai repetir a mesma tarefa milhares de vezes.',
        },
        {
          type: 'p',
          text: 'Com n tentativas por tarefa e c sucessos, os estimadores não enviesados são `pass@k = 1 − C(n − c, k) / C(n, k)` (Chen et al., 2021, no Codex) e `pass^k = C(c, k) / C(n, k)` (Yao et al., 2024, no τ-bench), com a média sobre as tarefas. Se as tentativas forem independentes com probabilidade p, pass^k aproxima-se de `p^k`, e isso é implacável.',
        },
        {
          type: 'table',
          head: ['Sucesso por tentativa', 'pass^1', 'pass^3', 'pass^8'],
          rows: [
            ['p = 0,75', '0,75', '0,42', '0,10'],
            ['p = 0,90', '0,90', '0,73', '0,43'],
            ['p = 0,99', '0,99', '0,97', '0,92'],
          ],
          caption: 'p^k para tentativas independentes. Uma tarefa com 8 sucessos em 10 tem pass@3 = 1,0 e pass^3 ≈ 0,47.',
        },
        {
          type: 'p',
          text: 'O τ-bench mostrou o efeito em modelos de topo da altura: gpt-4o com menos de 50% de sucesso nas tarefas e pass^8 abaixo de 25% no domínio de retalho. pass@k serve para outra pergunta — «o modelo alguma vez consegue isto?» — útil para explorar capacidade ou quando há um verificador que escolhe entre tentativas (gerar código e correr os testes).',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'A consequência de desenho',
          text: 'Se pass^k de uma tarefa com dinheiro não chega ao nível exigido, a resposta raramente é mais prompt: é tirar a decisão cara do modelo — o valor calculado por código, o limite imposto na ferramenta, aprovação humana acima de um montante.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Chen et al. (2021) — Evaluating Large Language Models Trained on Code (pass@k)', url: 'https://arxiv.org/abs/2107.03374' },
            { label: 'Yao et al. (2024) — τ-bench (pass^k)', url: 'https://arxiv.org/abs/2406.12045' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Define pass@k como pelo menos um sucesso e pass^k como todos os sucessos.',
          'Escreve os estimadores com combinações a partir de n e c.',
          'Mostra numericamente como pass^k decai com k.',
          'Justifica pass^k para produção (o cliente recebe a tentativa que calhou).',
          'Tira uma consequência de desenho (mover decisões caras para código ou humanos).',
        ],
        fraco: 'Confunde as duas métricas ou reporta pass@k como medida de fiabilidade.',
        solido: 'Fórmulas correctas, exemplo numérico e escolha justificada de pass^k para produção.',
        excelente: 'Acrescenta quando pass@k é legítimo (há verificador), cita o resultado do τ-bench e liga a fiabilidade a decisões de arquitectura.',
      },
      seguimento: [
        'Quantas tentativas por tarefa corres no CI, tendo em conta o custo?',
        'Com o modelo a temperatura 0, faz sentido correr várias tentativas?',
        'Que pass^k exigirias para uma tarefa que move dinheiro?',
      ],
      sinaisAlarme: [
        'Reportar pass@5 a um gestor como taxa de sucesso.',
        'Assumir que temperatura 0 torna o agente determinista.',
        'Não saber calcular nenhum dos dois.',
      ],
      modulos: ['avaliar-agentes'],
    },
    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-avaliar-agentes-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Utilizador simulado por LLM: quando ajuda e onde engana',
      enunciado:
        'Para testar conversas de vários turnos, propõem pôr um LLM a fazer de cliente. Que ganhas, que riscos tem, e como os controlas?',
      minutos: 7,
      dica: 'Um cliente real é tão cooperativo como um modelo instruído a sê-lo?',
      resposta: [
        {
          type: 'p',
          text: 'Ganho a capacidade de testar **conversas inteiras** de forma automática — o agente pede um dado, o cliente responde, muda de ideias — que um conjunto de pares pergunta-resposta não cobre. O preço é que o simulador é **outro modelo com variância e vieses próprios**: pode ser mais cooperativo, mais claro e mais paciente do que clientes reais, e pode falhar o papel. Uso-o, mas trato-o como parte do instrumento e calibro-o.',
        },
        {
          type: 'compare',
          left: {
            title: 'O que ganho',
            items: [
              'Conversas multi-turno reprodutíveis em escala',
              'Cobertura de caminhos: cliente que muda de ideias, que dá dados errados, que insiste',
              'Mesma tarefa repetida para medir pass^k',
              'É o desenho usado pelo τ-bench',
            ],
          },
          right: {
            title: 'Riscos',
            items: [
              'Simulador cooperativo de mais: dá toda a informação de uma vez',
              'Revela o objectivo ou aceita respostas que um cliente recusaria',
              'Variância do simulador mistura-se com a do agente',
              'Mesmo fornecedor no agente e no simulador: estilos que se entendem bem de mais',
            ],
          },
        },
        {
          type: 'p',
          text: 'Controlo assim: cada tarefa tem uma **persona e um objectivo escritos**, com a informação que o cliente sabe e só revela quando lhe perguntam; o simulador usa um modelo diferente do agente; e o sucesso **não** é decidido pelo simulador, mas pelo estado final e pelas regras da trajectória. Meço a variância do simulador correndo a mesma tarefa com o mesmo agente várias vezes. E leio conversas: uma amostra de 20 a 30 por semana mostra rapidamente se o simulador quebrou o papel ou se tornou um cliente impossível.',
        },
        {
          type: 'p',
          text: 'Para calibrar o realismo, comparo distribuições com produção: número de turnos, frequência de mudanças de intenção, comprimento das mensagens. Se as conversas reais têm o dobro dos turnos, as minhas personas são demasiado directas. Os casos críticos — ameaças, tentativas de *prompt injection* pelo cliente, dados pessoais — escrevo-os como guiões fixos, porque não quero depender do simulador para os gerar.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O simulador como juiz',
          text: 'Pedir ao simulador que diga se ficou satisfeito mistura dois papéis e herda todos os vieses de um juiz não calibrado. O simulador fala; o estado e as asserções decidem.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2024) — τ-bench (utilizador simulado por LLM)', url: 'https://arxiv.org/abs/2406.12045' },
            { label: 'LangGraph — overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica o ganho: conversas multi-turno automáticas e repetíveis.',
          'Nomeia riscos concretos (cooperação excessiva, quebra de papel, variância, mesmo fornecedor).',
          'Separa o simulador de quem decide o sucesso (estado e regras).',
          'Propõe calibrar o realismo contra produção ou ler conversas.',
          'Mantém os casos críticos como guiões fixos.',
        ],
        fraco: '«O LLM faz de cliente e diz se foi bem atendido», sem riscos nem controlo.',
        solido: 'Personas com objectivo e informação escondida, modelo diferente, sucesso pelo estado final.',
        excelente: 'Acrescenta medição da variância do simulador, comparação de distribuições com produção e guiões fixos para casos adversariais.',
      },
      seguimento: [
        'Como escreverias a persona de um cliente irritado sem que o simulador exagere?',
        'Como separas a variância do simulador da do agente?',
        'Que fazes quando o simulador revela o objectivo na primeira mensagem?',
      ],
      sinaisAlarme: [
        'Deixar o simulador decidir se a conversa foi bem-sucedida.',
        'Nunca ler as conversas simuladas.',
        'Usar exactamente o mesmo modelo e prompt para agente e cliente.',
      ],
      modulos: ['avaliar-agentes', 'langgraph'],
    },
    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-avaliar-agentes-06',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Ferramentas simuladas, ambiente com estado ou serviços reais',
      enunciado:
        'Para avaliar um agente que consulta encomendas e emite reembolsos, as ferramentas no eval são mocks, uma base de dados de teste, ou os serviços reais de staging? Porquê?',
      minutos: 7,
      resposta: [
        {
          type: 'p',
          text: 'Uso duas camadas. **Mocks deterministas** no CI de cada PR, porque são rápidos, grátis e reprodutíveis; e um **ambiente com estado** — base de dados de teste reposta antes de cada tarefa, com as ferramentas reais a correr contra ela — para os evals que verificam efeitos. Serviços reais de staging ficam para testes de integração esporádicos, não para o eval.',
        },
        {
          type: 'table',
          head: ['Opção', 'Velocidade e custo', 'O que apanha', 'O que não apanha'],
          rows: [
            ['Mocks deterministas (respostas fixas por argumentos)', 'Segundos, sem custo de ferramenta', 'Selecção, argumentos, ordem, reacção a erros simulados', 'Efeitos reais, interacções entre escritas'],
            ['Ambiente com estado (BD em sandbox, reposta por tarefa)', 'Minutos; custo de infra pequeno', 'Efeitos, duplicados, estado inconsistente, idempotência', 'Latência e falhas reais de serviços externos'],
            ['Staging real', 'Lento, partilhado, dados mudam', 'Integração e contratos', 'Reprodutibilidade: o mesmo caso dá resultados diferentes'],
          ],
        },
        {
          type: 'p',
          text: 'O mock tem de ser **determinista e fiel ao contrato**: os mesmos argumentos dão a mesma resposta, e os erros também se simulam (encomenda inexistente, timeout, 409 por reembolso duplicado), porque é aí que os agentes falham. Gero os mocks a partir de respostas reais gravadas e anonimizadas, e um teste de contrato garante que o mock não divergiu do serviço.',
        },
        {
          type: 'p',
          text: 'O ambiente com estado é o que me deixa verificar «existe um reembolso e só um». Cada tarefa parte de um estado inicial conhecido (fixture), corre, e no fim comparo o estado com o esperado. O isolamento entre tarefas é obrigatório: uma transacção revertida ou uma base por *worker* — senão os testes interferem e o sucesso depende da ordem. É o desenho do τ-bench, com a base de dados como fonte de verdade.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Determinismo só no ambiente',
          text: 'Mesmo com ferramentas deterministas, o modelo não é: duas corridas podem seguir caminhos diferentes. Mocks deterministas eliminam uma fonte de variância, não todas — continuo a precisar de várias tentativas por tarefa para medir fiabilidade.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Building effective agents (testes em sandbox)', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
            { label: 'pytest — fixtures', url: 'https://docs.pytest.org/en/stable/how-to/fixtures.html' },
            { label: 'Yao et al. (2024) — τ-bench', url: 'https://arxiv.org/abs/2406.12045' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Propõe camadas (mocks no CI, ambiente com estado para efeitos) com a razão de cada uma.',
          'Exige mocks deterministas que também simulam erros.',
          'Explica isolamento e reposição do estado entre tarefas.',
          'Diz porque staging real não serve de eval (reprodutibilidade).',
          'Reconhece que o modelo continua não determinista.',
        ],
        fraco: 'Escolhe staging real «porque é mais realista», sem pensar em reprodutibilidade.',
        solido: 'Mocks deterministas no CI e base de dados em sandbox para efeitos, com reposição por tarefa.',
        excelente: 'Acrescenta mocks gerados de respostas gravadas com testes de contrato, simulação de erros e isolamento por worker.',
      },
      seguimento: [
        'Como evitas que o mock fique desactualizado em relação ao serviço real?',
        'Como simulas um pagamento externo que tem webhooks assíncronos?',
        'Quanto tempo aceitas que o eval com estado demore num PR?',
      ],
      sinaisAlarme: [
        'Correr o eval contra produção.',
        'Mocks que só devolvem o caminho feliz.',
        'Testes que partilham estado e dependem da ordem.',
      ],
      modulos: ['avaliar-agentes', 'ci-cd'],
    },
    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-avaliar-agentes-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Traços de referência como testes de regressão',
      enunciado:
        'Tens milhares de traços de conversas reais do agente. Como os transformas em testes de regressão, e como evitas que esses testes partam sempre que o agente encontra um caminho diferente e válido?',
      minutos: 5,
      resposta: [
        {
          type: 'p',
          text: 'Escolho traços **representativos e com resultado confirmado**, congelo o input (mensagens do cliente e respostas das ferramentas) e, em vez de exigir que o novo traço seja igual ao antigo, verifico **o resultado e as invariantes**. O traço de referência é um exemplo de caminho válido, não o único.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Seleccionar', text: 'Estratifico por intenção e incluo casos difíceis: os que falharam e foram corrigidos, os escalados para humanos, os com erros de ferramenta. Cada incidente de produção vira um caso.' },
            { title: 'Congelar o ambiente', text: 'As respostas das ferramentas gravadas no traço passam a mock indexado pelos argumentos; o estado inicial passa a fixture. Dados pessoais anonimizados antes de entrar no repositório.' },
            { title: 'Anotar o esperado', text: 'Estado final esperado, chamadas obrigatórias e proibidas, limites. Não a sequência literal de mensagens.' },
            { title: 'Comparar', text: 'Passa se o resultado e as invariantes passam. Diferenças de caminho são registadas, não chumbam: um diff de trajectória (passos a mais, ferramenta nova) vai para o relatório do PR.' },
          ],
        },
        {
          type: 'p',
          text: 'Há um problema típico: se o agente novo faz uma chamada que o traço antigo não fez, o mock gravado não tem resposta. Trato isso explicitamente — o mock devolve um erro marcado como «fora do traço», e o caso fica como inconclusivo, não como falhado. Se a fracção de inconclusivos sobe, o conjunto precisa de ambiente com estado em vez de respostas gravadas.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Fechar o ciclo',
          text: 'Cada bug de produção corrigido entra como caso de regressão no mesmo PR que o corrige. O conjunto cresce com o que de facto partiu, e não com o que a equipa imaginou.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangGraph — persistência e threads', url: 'https://docs.langchain.com/oss/python/langgraph/persistence' },
            { label: 'Langfuse — datasets a partir de traços', url: 'https://langfuse.com/docs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Selecciona traços estratificados e com resultado confirmado, incluindo incidentes.',
          'Congela as respostas das ferramentas e o estado inicial.',
          'Verifica resultado e invariantes em vez de igualdade de sequência.',
          'Trata explicitamente chamadas fora do traço gravado.',
          'Anonimiza dados pessoais antes de guardar os casos.',
        ],
        fraco: 'Compara o traço novo com o antigo mensagem a mensagem.',
        solido: 'Congela ferramentas e estado, compara resultado e invariantes, regista diferenças de caminho.',
        excelente: 'Acrescenta o tratamento de chamadas fora do traço como inconclusivo, a regra de cada incidente virar caso e a anonimização.',
      },
      seguimento: [
        'Quantos casos de regressão manténs e como evitas que o conjunto fique lento?',
        'Como lidas com um traço antigo cuja política de negócio entretanto mudou?',
        'Onde guardas os casos e quem os pode alterar?',
      ],
      sinaisAlarme: [
        'Testes de snapshot sobre o texto completo das respostas.',
        'Guardar traços de produção com dados pessoais no repositório.',
        'Apagar casos que falham em vez de os perceber.',
      ],
      modulos: ['avaliar-agentes', 'observabilidade-llmops'],
    },
    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-avaliar-agentes-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'O modelo novo subiu no τ-bench e no SWE-bench: trocamos',
      enunciado:
        'O fornecedor anuncia um modelo com resultados muito melhores no τ-bench e no SWE-bench Verified. O teu director quer trocar já. O que lhe dizes?',
      minutos: 6,
      dica: 'O que mede cada benchmark, e em que domínio?',
      resposta: [
        {
          type: 'p',
          text: 'Que os benchmarks públicos dizem que o modelo **merece ser testado**, não que é melhor **para nós**. A decisão de troca vem do nosso conjunto, com as nossas ferramentas, políticas e clientes, medida em sucesso, pass^k, custo e latência. Proponho correr o candidato no nosso eval esta semana e decidir com esses números.',
        },
        {
          type: 'table',
          head: ['Benchmark', 'O que mede', 'Porque não chega'],
          rows: [
            ['τ-bench (Yao et al., 2024)', 'Agente com ferramentas e política, utilizador simulado; sucesso pelo estado final da BD; domínios retalho e companhia aérea', 'Domínios e políticas que não são os nossos; língua inglesa'],
            ['SWE-bench (Jimenez et al., 2023)', '2294 issues reais de 12 repositórios Python; sucesso se os testes passam', 'Mede engenharia de software, não atendimento ao cliente'],
            ['SWE-bench Verified (OpenAI, 2024)', '500 tarefas do SWE-bench validadas por programadores', 'Subconjunto mais limpo, mesmo domínio'],
          ],
        },
        {
          type: 'p',
          text: 'Há três razões para não confiar só nos números públicos. **Domínio**: o nosso agente fala português, usa as nossas ferramentas com os nossos esquemas e segue a nossa política de reembolsos. **Contaminação e optimização**: benchmarks públicos e populares podem ter entrado nos dados de treino ou ter sido alvo de afinação específica, e o resultado reportado depende do *scaffold* usado. **Métrica**: o anúncio costuma reportar uma taxa média; eu preciso de pass^k nas intenções com dinheiro, custo por tarefa resolvida e p95 de latência.',
        },
        {
          type: 'p',
          text: 'Os benchmarks públicos servem para fazer uma lista curta de candidatos e para perceber em que tipo de tarefa um modelo é forte. O nosso conjunto — algumas centenas de tarefas tiradas de produção, com estado esperado — é o que decide, e é um activo da empresa: é o que nos permite trocar de modelo em dias em vez de meses.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como faço a troca',
          text: 'Eval completo do candidato com várias tentativas por tarefa; comparação intenção a intenção, não só global; se passa, canário com uma fracção pequena do tráfego e as mesmas métricas online; e um caminho de volta configurável sem deploy.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2024) — τ-bench', url: 'https://arxiv.org/abs/2406.12045' },
            { label: 'Jimenez et al. (2023) — SWE-bench: Can Language Models Resolve Real-World GitHub Issues?', url: 'https://arxiv.org/abs/2310.06770' },
            { label: 'OpenAI — Introducing SWE-bench Verified', url: 'https://openai.com/index/introducing-swe-bench-verified/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica o que o τ-bench e o SWE-bench medem e em que domínio.',
          'Dá razões concretas para não decidir só por benchmarks (domínio, contaminação, scaffold, métrica).',
          'Propõe decidir com o próprio conjunto e com pass^k, custo e latência.',
          'Descreve uma troca segura (eval, canário, reversão).',
        ],
        fraco: '«Se é melhor no benchmark, trocamos» ou «benchmarks não valem nada».',
        solido: 'Usa os benchmarks como filtro e decide com o eval próprio e métricas de custo.',
        excelente: 'Acrescenta contaminação e dependência do scaffold, a comparação por intenção, o canário com reversão e o argumento de que o conjunto próprio é um activo que reduz o custo de troca.',
      },
      seguimento: [
        'O candidato é melhor em média mas pior numa intenção crítica. O que decides?',
        'Quanto tempo e dinheiro custa correr o vosso eval completo num modelo novo?',
        'Como convences a direcção a investir em manter o conjunto próprio?',
      ],
      sinaisAlarme: [
        'Trocar de modelo em produção com base num anúncio.',
        'Não saber o que o τ-bench ou o SWE-bench medem.',
        'Ignorar o custo e a latência na comparação.',
      ],
      modulos: ['avaliar-agentes', 'escolher-modelo'],
    },
    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-avaliar-agentes-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Desenha o harness de avaliação de um agente que emite reembolsos',
      enunciado:
        'Desenha o sistema de avaliação de um agente que trata pedidos de reembolso de uma farmácia online. Quero saber que casos tens, como corres, o que medes e o que bloqueia um deploy.',
      contexto:
        'Farmácia online em Portugal, cerca de 2000 pedidos de reembolso por dia por chat. Ferramentas: `consultar_encomenda`, `calcular_reembolso`, `emitir_reembolso`, `escalar_humano`. Reembolsos até 50 euros são automáticos; acima, só com aprovação humana. A equipa faz 5 a 10 PRs por semana ao prompt e às ferramentas. O eval de cada PR tem de terminar em menos de 15 minutos.',
      minutos: 18,
      dica: 'Separa o que corre em cada PR do que corre todas as noites.',
      resposta: [
        {
          type: 'p',
          text: 'Faço um harness em **dois ritmos**: um eval rápido e determinista em cada PR (mocks, uma tentativa, gate em regras críticas) e um eval nocturno com **ambiente com estado, utilizador simulado e várias tentativas por tarefa** para medir pass^k, custo e latência. O que bloqueia um deploy é, primeiro, qualquer violação de invariante com dinheiro; depois, regressões estatisticamente claras no sucesso ou no custo.',
        },
        {
          type: 'h',
          text: 'Perguntas de clarificação e números',
        },
        {
          type: 'p',
          text: 'Pergunto: qual é a taxa de erro aceitável num reembolso automático (valor errado, duplicado)? Há reembolsos parciais? O cálculo do valor é regra de código ou decisão do modelo? Assumo que o valor vem de `calcular_reembolso` (código) e que o limite de 50 euros é imposto dentro de `emitir_reembolso`, não só no prompt. Conjunto: 300 tarefas no início — cerca de 200 tiradas de conversas reais estratificadas por motivo (artigo danificado, não entregue, receita recusada, valor acima do limite, cliente sem encomenda) e 100 adversariais (cliente insiste em valor maior, injecção no campo de motivo, pedido em nome de outra pessoa).',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Harness de avaliação em dois ritmos',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'z-pr', label: 'Cada PR (menos de 15 min)', col: 0, row: 0, colSpan: 5, rowSpan: 1, tone: 'ci' },
              { id: 'z-noite', label: 'Nocturno', col: 0, row: 1, colSpan: 5, rowSpan: 2, tone: 'agente' },
            ],
            nodes: [
              { id: 'casos', label: 'Tarefas versionadas', sub: '300, com estado esperado', col: 0, row: 0, kind: 'data' },
              { id: 'agpr', label: 'Agente', sub: '1 tentativa', col: 1, row: 0, kind: 'agent' },
              { id: 'mock', label: 'Mocks deterministas', sub: 'inclui erros', col: 2, row: 0, kind: 'tool' },
              { id: 'regras', label: 'Invariantes e chamadas', sub: 'asserções sobre o traço', col: 3, row: 0, kind: 'decision' },
              { id: 'gate', label: 'Gate do PR', col: 4, row: 0, kind: 'service' },
              { id: 'sim', label: 'Cliente simulado', sub: 'persona e objectivo', col: 0, row: 1, kind: 'user' },
              { id: 'agn', label: 'Agente', sub: '5 tentativas por tarefa', col: 1, row: 1, kind: 'agent' },
              { id: 'bd', label: 'BD em sandbox', sub: 'reposta por tarefa', col: 2, row: 1, kind: 'data' },
              { id: 'diff', label: 'Diff de estado', col: 3, row: 1, kind: 'decision' },
              { id: 'juiz', label: 'Juiz calibrado', sub: 'tom e verdade da resposta', col: 3, row: 2, kind: 'model' },
              { id: 'rel', label: 'Relatório', sub: 'pass^k, custo, p95', col: 4, row: 1, kind: 'service' },
            ],
            edges: [
              { from: 'casos', to: 'agpr' },
              { from: 'agpr', to: 'mock', dir: 'both' },
              { from: 'mock', to: 'regras' },
              { from: 'regras', to: 'gate' },
              { from: 'sim', to: 'agn', dir: 'both' },
              { from: 'agn', to: 'bd', dir: 'both' },
              { from: 'bd', to: 'diff' },
              { from: 'diff', to: 'rel' },
              { from: 'juiz', to: 'rel' },
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
            { title: 'Especificação por tarefa', text: 'Estado inicial (fixture), persona do cliente, estado final esperado (reembolso com valor X, ou nenhum reembolso e um pedido de escalada), chamadas proibidas e precedências. Versionada no repositório; alterá-la é revisto como código.' },
            { title: 'Invariantes duras', text: 'Nunca `emitir_reembolso` acima de 50 euros; nunca dois reembolsos para a mesma encomenda; nunca reembolso sem `consultar_encomenda` antes; nunca a resposta afirma um reembolso que o estado não tem. Uma única violação chumba o PR.' },
            { title: 'Eval de PR', text: '300 tarefas com mocks, uma tentativa, em paralelo: cabe nos 15 minutos. Gate: zero violações de invariantes; tool-call accuracy e sucesso não descem além do ruído medido no nocturno.' },
            { title: 'Eval nocturno', text: 'Ambiente com estado e cliente simulado de outro fornecedor, 5 tentativas por tarefa: 1500 conversas por noite. Mede pass^1 e pass^5 por motivo, custo e passos por tarefa resolvida, p95 de latência. Um juiz calibrado (kappa contra anotação do apoio) avalia tom e se a explicação ao cliente é verdadeira.' },
          ],
        },
        {
          type: 'table',
          head: ['Métrica', 'Onde', 'Bloqueia deploy?'],
          rows: [
            ['Violações de invariantes', 'PR e nocturno', 'Sim, qualquer uma'],
            ['Sucesso por estado final', 'PR (aprox.) e nocturno', 'Sim, se cair além do IC'],
            ['pass^5 nas intenções com dinheiro', 'Nocturno', 'Sim, abaixo do limiar acordado com o negócio'],
            ['Custo e passos por tarefa resolvida', 'Nocturno', 'Aprovação explícita se subir mais de 20%'],
            ['Tom e veracidade (juiz)', 'Nocturno', 'Não no início; só depois de calibrado'],
          ],
        },
        {
          type: 'h',
          text: 'Falhas, custo e o que fica para depois',
        },
        {
          type: 'p',
          text: 'O custo dominante é o nocturno: 1500 conversas com agente, simulador e juiz. Mantenho-o limitado ao que cabe no orçamento e corro o conjunto completo antes de cada release em vez de todas as noites, se for preciso. O risco principal é o conjunto envelhecer: cada incidente de produção e cada escalada mal tratada viram tarefa nova. Em produção, amostro conversas reais para o mesmo juiz e verifico as invariantes nos traços em tempo real, com alerta. Fica para depois: geração automática de personas adversariais e avaliação de conversas em que o cliente muda de pedido a meio.',
        },
        {
          type: 'adr',
          ref: 'adr-0015',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2024) — τ-bench', url: 'https://arxiv.org/abs/2406.12045' },
            { label: 'Anthropic — Demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
            { label: 'LangGraph — interrupts (aprovação humana)', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa um eval rápido por PR de um eval nocturno mais caro, com números que cabem nas restrições.',
          'Define tarefas com estado inicial e estado final esperado, e avalia pelo estado.',
          'Lista invariantes duras com dinheiro que bloqueiam sem excepção.',
          'Mede fiabilidade com pass^k e custo por tarefa resolvida.',
          'Coloca o limite de 50 euros no código da ferramenta, não só no prompt, e trata o juiz como calibrado antes de bloquear.',
          'Explica como o conjunto cresce a partir de incidentes de produção.',
        ],
        fraco: 'Um conjunto de perguntas e respostas avaliado por um juiz, sem estado, sem invariantes nem orçamento de tempo.',
        solido: 'Dois ritmos, estado esperado por tarefa, invariantes no gate e pass^k no nocturno.',
        excelente: 'Acrescenta as perguntas de clarificação sobre quem calcula o valor, a defesa em profundidade no código da ferramenta, o custo do nocturno, o ciclo incidente para tarefa e o que fica para depois.',
      },
      seguimento: [
        'Como escolhes o limiar de pass^5 com o negócio?',
        'O eval do PR passou e o nocturno falhou. Quem é avisado e o que acontece ao deploy?',
        'Como testas a aprovação humana acima de 50 euros sem um humano no loop?',
      ],
      sinaisAlarme: [
        'Confiar no prompt para impor o limite de dinheiro.',
        'Avaliar só com um juiz a ler respostas.',
        'Não dizer o que bloqueia um deploy.',
      ],
      modulos: ['avaliar-agentes', 'langgraph', 'ci-cd'],
    },
    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-avaliar-agentes-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'Sucesso igual, custo por tarefa a dobrar depois de mudar o prompt',
      enunciado:
        'Mudaram o prompt de sistema do agente para «ser mais cuidadoso a verificar informação». A taxa de sucesso no eval ficou igual, mas o custo médio por tarefa duplicou. Como investigas e o que fazes?',
      contexto:
        'Agente de apoio de uma operadora de telecomunicações com 7 ferramentas (consultar cliente, consultar faturas, consultar consumos, etc.). Eval de 250 tarefas: sucesso 84% antes e 84% depois. Custo médio por tarefa passou de cerca de 2 para cerca de 4 cêntimos de dólar; p95 de latência de 9 para 17 segundos. Os traços guardam cada chamada ao modelo com tokens e cada chamada a ferramenta.',
      minutos: 10,
      dica: 'O custo médio pode duplicar de duas maneiras muito diferentes.',
      resposta: [
        {
          type: 'p',
          text: 'A hipótese principal é que o prompt fez o agente **fazer mais passos** — mais chamadas de verificação a ferramentas, cada uma a reenviar o histórico inteiro — sem mudar o resultado. Antes de concluir, tenho de saber se o custo subiu **em todas as tarefas um pouco ou em algumas muito**, porque as duas têm correcções diferentes.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Decompor o custo', text: 'Dos traços, por tarefa: número de chamadas ao modelo, tokens de entrada e de saída, chamadas por ferramenta. Comparo antes e depois por tarefa, não em média. Se os tokens de entrada por chamada se mantêm e o número de chamadas duplica, são passos; se o número de chamadas é igual e os tokens de saída disparam, é o modelo a escrever mais (raciocínio ou respostas longas).' },
            { title: 'Ver a distribuição', text: 'Histograma de passos por tarefa. Uma cauda nova (tarefas que agora batem no limite de iterações) aponta para ciclos de verificação; uma deslocação uniforme aponta para uma chamada extra sistemática em todas as tarefas.' },
            { title: 'Ler traços', text: 'Leio 20 tarefas com maior aumento. Padrões típicos: consultar o mesmo cliente duas ou três vezes, consultar faturas quando a pergunta era sobre consumos, pedir confirmação ao cliente de dados já confirmados.' },
            { title: 'Verificar o resto', text: 'Confirmo que não mudou mais nada no mesmo deploy (modelo, descrição de ferramentas, cache de prompt). Uma quebra de cache causada pela alteração do prompt também sobe o custo de entrada sem mudar passos.' },
          ],
        },
        {
          type: 'p',
          text: 'Causa provável, dado o p95 quase a duplicar também: chamadas redundantes de verificação. Correcções, da mais barata à mais estrutural: tornar a instrução específica («verifica o NIF uma vez com `consultar_cliente`; não repitas consultas com os mesmos argumentos»); fazer as ferramentas devolverem o que o agente vai precisar a seguir, para eliminar uma segunda consulta; deduplicar chamadas idênticas no código do grafo, devolvendo o resultado em cache dentro da mesma conversa; e um limite de passos mais apertado com escalada. Confirmo com o eval que o sucesso se mantém e o custo volta.',
        },
        {
          type: 'p',
          text: 'Também pergunto se a mudança comprou alguma coisa que o eval não mede: se o objectivo era reduzir respostas com dados errados e o eval não tem casos desses, os 84% iguais não provam que a mudança é inútil. Acrescento casos que medem essa intenção antes de reverter.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'O gate passa a incluir custo e passos por tarefa resolvida (p50 e p95) e a contagem de chamadas redundantes, com limite de aumento aceitável. Uma mudança de prompt que mantém o sucesso e duplica o custo passa a precisar de aprovação explícita, com o ganho que a justifica.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — convenções semânticas GenAI (tokens por chamada)', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Decompõe o custo em passos, tokens de entrada e tokens de saída por tarefa.',
          'Olha para a distribuição (cauda contra deslocação uniforme), não só para a média.',
          'Lê traços concretos para encontrar o padrão de redundância.',
          'Exclui causas concorrentes, incluindo quebra da cache de prompt.',
          'Propõe correcções concretas e acrescenta custo e passos ao gate.',
        ],
        fraco: 'Reverte o prompt sem investigar, ou culpa o fornecedor por ter subido preços.',
        solido: 'Decompõe o custo pelos traços, encontra chamadas redundantes e corrige o prompt e as ferramentas.',
        excelente: 'Distingue cauda de deslocação uniforme, considera a cache de prompt, pergunta se o eval mede o que a mudança pretendia e põe custo por tarefa resolvida no gate.',
      },
      seguimento: [
        'Como deduplicas chamadas idênticas sem esconder mudanças reais de estado?',
        'Que limite de passos escolhias e o que acontece quando é atingido?',
        'O produto aceita pagar o dobro por menos erros de dados. Como medes se compensa?',
      ],
      sinaisAlarme: [
        'Olhar só para a taxa de sucesso e aprovar a mudança.',
        'Reverter sem perceber o que mudou nos traços.',
        'Não ter custo por tarefa no eval.',
      ],
      modulos: ['avaliar-agentes', 'custo-escala', 'observabilidade-llmops'],
    },
  ],
};
