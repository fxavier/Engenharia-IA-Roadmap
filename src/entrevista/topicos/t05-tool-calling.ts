import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'tool-calling',
  numero: 5,
  bloco: 'llm',
  titulo: 'Tool calling e saída estruturada',
  resumo:
    'Como um modelo pede acções sem as executar, como se desenham, validam e autorizam ferramentas, e quando usar saída estruturada em vez de ferramentas. É aqui que um LLM passa a mexer em dinheiro, pedidos e dados, por isso é onde o entrevistador procura maturidade de engenharia.',
  icon: '🔧',
  modulos: ['tool-calling', 'agentes', 'guardrails-seguranca'],
  essencial: [
    'O modelo nunca executa nada: gera um bloco com nome e argumentos em JSON; o teu código valida, autoriza, executa e devolve o resultado.',
    'O ciclo: pedido com ferramentas → resposta com tool_use → executas → tool_result com o mesmo id → nova chamada, até o modelo terminar ou atingires o limite de voltas.',
    'Nome, descrição e esquema de cada ferramenta são prompt: o modelo escolhe e preenche argumentos só com base neles. Versiona-os e avalia-os como prompt.',
    'Argumentos inválidos não são excepção: devolvem-se como tool_result com is_error e detalhes por campo, para o modelo corrigir na volta seguinte.',
    'JSON mode garante JSON válido; saída estruturada com esquema estrito garante o esquema; nenhum dos dois garante que os valores estão certos.',
    'Constrained decoding mascara tokens que violariam a gramática; não impõe regras de negócio, não sobrevive a um corte por max_tokens e suporta só um subconjunto de JSON Schema.',
    'Ferramentas com efeitos levam chave de idempotência derivada do negócio ou do id da chamada, nunca inventada pelo modelo.',
    'Autorização vive dentro da ferramenta, com a identidade da sessão; o cliente_id nunca é argumento que o modelo preenche.',
    'Com dezenas de ferramentas a escolha degrada e os esquemas custam tokens em cada pedido; OpenAI sugere menos de 20 por turno, Anthropic aponta degradação acima de 30 a 50 (Out. 2026).',
  ],
  perguntas: [
    /* ================================================================ 01 */
    {
      id: 'p-tool-calling-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quem executa a ferramenta: o ciclo de tool use',
      enunciado:
        'Explica-me o que acontece, mensagem a mensagem, quando um utilizador pergunta «onde está o meu pedido?» a um assistente com uma ferramenta `estado_pedido`. Quem executa o quê?',
      minutos: 4,
      dica: 'Conta quantas chamadas à API do modelo há e o que vai em cada uma.',
      resposta: [
        {
          type: 'p',
          text:
            'O modelo **nunca executa** a ferramenta: gera texto estruturado que representa um pedido de chamada (nome e argumentos em JSON). Quem executa é a minha aplicação, que depois devolve o resultado ao modelo numa segunda chamada. São pelo menos duas chamadas à API por cada pergunta que precisa de uma ferramenta.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Pedido com catálogo', text: 'Envio as mensagens e a lista de ferramentas (nome, descrição, JSON Schema dos argumentos). O catálogo entra no contexto como qualquer outro token.' },
            { title: 'O modelo pede', text: 'A resposta termina com um motivo de paragem do tipo `tool_use` e contém um bloco com `id`, `name` e `input`, por exemplo `{"pedido_id": "PD-000123"}`.' },
            { title: 'A aplicação decide', text: 'Valido os argumentos contra o esquema, verifico se esta sessão pode ver aquele pedido, executo a função e capturo o resultado ou o erro.' },
            { title: 'Devolvo o resultado', text: 'Acrescento ao histórico a mensagem do assistente tal como veio e um `tool_result` com o mesmo `id`. Chamo o modelo outra vez com tudo isso.' },
            { title: 'O modelo responde ou pede mais', text: 'Ou gera a resposta final ao utilizador, ou pede outra ferramenta. Repito até terminar ou até ao limite de voltas que imponho (tipicamente 5 a 10).' },
          ],
        },
        {
          type: 'p',
          text:
            'Daqui saem três consequências práticas. Primeiro, **a fronteira de segurança é o meu código**: o que o modelo gera é uma proposta, e tudo o que entra na função passa por validação e autorização. Segundo, cada volta custa uma ida e volta ao modelo (centenas de milissegundos a segundos) e o histórico cresce com os resultados, por isso as ferramentas devolvem só o necessário. Terceiro, o ciclo precisa de limites: número máximo de voltas, timeout por ferramenta e um orçamento de tokens por conversa.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '«O modelo chamou a API»',
          text: 'Dizer que o modelo chamou o serviço confunde quem tem credenciais. O modelo não tem rede nem segredos; se uma acção indevida aconteceu, foi o código do orquestrador que a executou sem verificar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — tool use, visão geral', url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview' },
            { label: 'OpenAI — function calling', url: 'https://platform.openai.com/docs/guides/function-calling' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz explicitamente que o modelo só gera o pedido e que a aplicação executa.',
          'Descreve as duas (ou mais) chamadas à API e o emparelhamento do resultado pelo id da chamada.',
          'Coloca validação e autorização no código, antes da execução.',
          'Menciona limites do ciclo: número de voltas, timeout ou orçamento de tokens.',
        ],
        fraco: 'Diz que o modelo «chama a função» ou «acede à base de dados», sem distinguir geração de execução.',
        solido: 'Descreve o ciclo completo com tool_use e tool_result, quem executa e onde se valida.',
        excelente: 'Acrescenta o custo do ciclo (latência por volta, crescimento do contexto), os limites de voltas e trata o resultado do modelo como entrada não confiável, ligando isso a segurança.',
      },
      seguimento: [
        'O que acontece se não devolveres o tool_result de uma das chamadas pedidas?',
        'Como limitas um ciclo que entra em loop a chamar a mesma ferramenta?',
        'Onde é que o streaming complica este ciclo?',
      ],
      sinaisAlarme: [
        'Afirmar que o modelo executa código ou acede a sistemas por si.',
        'Não saber que o resultado tem de voltar ao modelo numa nova chamada.',
        'Ciclo sem qualquer limite de voltas.',
      ],
      modulos: ['tool-calling', 'agentes'],
    },

    /* ================================================================ 02 */
    {
      id: 'p-tool-calling-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que faz uma boa definição de ferramenta',
      enunciado:
        'Mostra-me como escreverias a definição de uma ferramenta `consultar_fatura` para um assistente de operadora. O que é que o modelo realmente lê e o que é que mete na descrição?',
      minutos: 4,
      dica: 'O modelo não vê o teu código, só o que está no pedido.',
      resposta: [
        {
          type: 'p',
          text:
            'O modelo decide **se** chama e **com que argumentos** apenas a partir do nome, da descrição e do JSON Schema. Isso é prompt, não documentação para humanos: tem de dizer o que a ferramenta faz, quando usar e quando não usar, o que significa cada parâmetro e em que formato. A documentação da Anthropic diz que descrições detalhadas são de longe o factor mais importante e sugere pelo menos 3 a 4 frases por ferramenta.',
        },
        {
          type: 'code',
          lang: 'json',
          caption: 'Identidade fora do esquema, enum em vez de texto livre, padrão no identificador e a fronteira com a ferramenta vizinha escrita na descrição.',
          code: `{
  "name": "faturacao_consultar_fatura",
  "description": "Devolve o resumo de uma fatura do cliente autenticado: período, valor total, estado de pagamento e as 5 maiores rubricas. Usa quando o cliente pergunta quanto pagou, porque é que a fatura subiu ou se está paga. Não uses para alterar tarifário nem para pagamentos: para isso existem outras ferramentas. Se o cliente não indicar o mês, usa a fatura mais recente omitindo 'mes'.",
  "input_schema": {
    "type": "object",
    "properties": {
      "mes": {
        "type": "string",
        "pattern": "^\\\\d{4}-\\\\d{2}$",
        "description": "Mês da fatura no formato AAAA-MM, por exemplo 2026-09."
      },
      "detalhe": {
        "type": "string",
        "enum": ["resumo", "rubricas"],
        "description": "resumo por omissão; rubricas só se o cliente pedir a decomposição."
      }
    },
    "additionalProperties": false
  }
}`,
        },
        {
          type: 'list',
          items: [
            '**Não peças o que já sabes**: o número de cliente vem da sessão, não do modelo. Cada argumento que o modelo preenche é um argumento que pode inventar.',
            '**Enums e padrões** em vez de texto livre: reduzem o espaço de erro e dão erros de validação legíveis.',
            '**Nomes com prefixo de domínio** (`faturacao_`, `tarifario_`) e verbo explícito: desambiguam quando o catálogo cresce.',
            '**Gero o esquema do código** (por exemplo `model_json_schema()` de um modelo Pydantic) para a validação e a definição não divergirem.',
          ],
        },
        {
          type: 'p',
          text:
            'Em produção, as descrições vivem no repositório com versão e qualquer alteração corre o conjunto de avaliação de selecção de ferramentas: mudar uma frase pode mudar quantas vezes o modelo escolhe a ferramenta errada. E custam tokens em todos os pedidos, por isso uma descrição longa justifica-se pela taxa de acerto, não por gosto.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — definir ferramentas', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools' },
            { label: 'Pydantic — JSON Schema', url: 'https://docs.pydantic.dev/latest/concepts/json_schema/' },
            { label: 'JSON Schema — Understanding JSON Schema', url: 'https://json-schema.org/understanding-json-schema' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que nome, descrição e esquema são o único sinal que o modelo tem para escolher e preencher.',
          'Inclui na descrição quando usar e quando não usar a ferramenta.',
          'Retira do esquema os dados de identidade que vêm da sessão.',
          'Usa enum, pattern ou additionalProperties false para restringir argumentos.',
          'Trata a descrição como prompt versionado e avaliado.',
        ],
        fraco: 'Uma descrição de uma linha («consulta faturas») e um parâmetro numero_cliente preenchido pelo modelo.',
        solido: 'Descrição com propósito, fronteiras e formato; esquema restrito com enum e padrão; identidade fora do esquema.',
        excelente: 'Acrescenta a geração do esquema a partir do código, o custo em tokens por pedido e a avaliação de selecção de ferramentas como gate para mudanças de descrição.',
      },
      seguimento: [
        'Quando é que vale a pena incluir exemplos de entrada na definição da ferramenta?',
        'Como mediste que uma descrição nova melhorou a selecção?',
        'O que fazes quando duas ferramentas têm descrições que se sobrepõem?',
      ],
      sinaisAlarme: [
        'Pôr o identificador do cliente como argumento que o modelo preenche.',
        'Achar que a descrição é comentário para a equipa e não afecta o comportamento.',
        'Parâmetros de texto livre para coisas que têm um conjunto fechado de valores.',
      ],
      modulos: ['tool-calling', 'prompt-engineering'],
    },

    /* ================================================================ 03 */
    {
      id: 'p-tool-calling-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'JSON mode, saída estruturada ou tool calling',
      enunciado:
        'Precisas de extrair de e-mails de clientes um objecto com tipo de pedido, número de apólice e urgência. Usas JSON mode, saída estruturada com esquema, ou defines uma ferramenta e forças o modelo a chamá-la? E se depois quiseres que ele também consulte a apólice?',
      minutos: 7,
      dica: 'Separa «a resposta é dados» de «o modelo precisa de agir a meio».',
      resposta: [
        {
          type: 'p',
          text:
            'Para extracção pura, quando o próprio resultado é o objecto, escolho **saída estruturada com esquema estrito**: é o mecanismo feito para isso. Ferramentas servem para o modelo **pedir uma acção ou informação a meio** da resposta; quando ele tiver de consultar a apólice, passo a ter um ciclo de tool calling, e a extracção final continua a poder ser saída estruturada. JSON mode só uso como recurso quando o modelo ou fornecedor não suporta esquema.',
        },
        {
          type: 'table',
          head: ['Mecanismo', 'O que garante', 'Quando uso', 'Custo e riscos'],
          rows: [
            ['JSON mode', 'JSON sintacticamente válido, sem garantia de esquema', 'Modelos sem suporte de esquema; protótipos', 'Campos em falta ou com nomes diferentes; validação e nova tentativa obrigatórias'],
            ['Saída estruturada (esquema estrito)', 'A resposta segue o esquema, dentro do subconjunto suportado', 'Extracção, classificação, resumo com campos fixos', 'Não garante valores certos; esquema com restrições próprias do fornecedor'],
            ['Tool calling (auto)', 'Argumentos no esquema se a ferramenta for estrita; o modelo decide se chama', 'O modelo precisa de dados ou de agir antes de responder', 'Uma volta extra por chamada; selecção errada; autorização e idempotência a teu cargo'],
            ['Ferramenta forçada como extractor', 'Uma chamada àquela ferramenta', 'Padrão antigo para extrair JSON antes de existir saída estruturada', 'Sem texto nem raciocínio antes da chamada; em alguns modelos recentes não é suportado'],
          ],
        },
        {
          type: 'p',
          text:
            'O controlo é o `tool_choice`. Na API da Anthropic há `auto` (o modelo decide), `any` (tem de usar uma qualquer), `tool` (uma em particular) e `none`; na da OpenAI, `auto`, `required`, `none` ou uma função nomeada. A documentação da Anthropic nota que, ao forçar, a API pré-preenche a resposta para começar na chamada, por isso o modelo não escreve explicação nem raciocínio antes, e em Outubro de 2026 lista modelos recentes em que `any` e `tool` devolvem erro e recomenda `auto` com ferramentas estritas. Ou seja, forçar ferramenta para obter JSON é um padrão que está a sair.',
        },
        {
          type: 'p',
          text:
            'Com qualquer das opções, valido do meu lado com o mesmo modelo Pydantic que gerou o esquema, porque o mecanismo garante forma, não conteúdo: um número de apólice com o formato certo pode não existir. Para os e-mails, meço a exactidão por campo num conjunto anotado de algumas centenas de e-mails e a taxa de respostas que falham a validação, e escolho o mecanismo e o escalão de modelo por esses números.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Usar uma ferramenta «resposta_final» para tudo',
          text: 'Forçar uma ferramenta como forma de terminar cada turno mistura acção com resposta, esconde a escolha real do modelo e torna as métricas de selecção de ferramentas inúteis. Se a resposta é dados, usa saída estruturada.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI — structured outputs', url: 'https://platform.openai.com/docs/guides/structured-outputs' },
            { label: 'Anthropic — definir ferramentas e tool_choice', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools' },
            { label: 'LangChain — structured output', url: 'https://docs.langchain.com/oss/python/langchain/structured-output' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue JSON válido de JSON conforme a um esquema.',
          'Associa ferramentas a acções ou dados a meio e saída estruturada a respostas que são dados.',
          'Conhece os valores de tool_choice e o efeito de forçar (sem texto antes da chamada).',
          'Valida do lado da aplicação mesmo com esquema estrito.',
          'Propõe medir exactidão por campo e taxa de falhas de validação para decidir.',
        ],
        fraco: '«Uso JSON mode e faço json.loads», sem validação nem distinção entre os mecanismos.',
        solido: 'Escolhe saída estruturada para extracção, ferramentas para consultar a apólice e valida com Pydantic.',
        excelente: 'Discute tool_choice e as suas consequências, sabe que forçar ferramenta é um padrão em declínio, e decide com métricas por campo num conjunto anotado.',
      },
      seguimento: [
        'Como combinas no mesmo turno uma consulta à apólice e uma saída final estruturada?',
        'O que fazes quando 3% das respostas falham a validação?',
        'E se o fornecedor de reserva não suportar esquemas estritos?',
      ],
      sinaisAlarme: [
        'Achar que JSON mode garante os campos pedidos.',
        'Confiar no esquema estrito e não validar valores.',
        'Escolher o mecanismo por hábito, sem dizer como se mede.',
      ],
      modulos: ['tool-calling', 'apis-de-modelos'],
    },

    /* ================================================================ 04 */
    {
      id: 'p-tool-calling-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Se o esquema é garantido, porque continuas a validar',
      enunciado:
        'O fornecedor diz que, em modo estrito, a saída segue sempre o teu JSON Schema. Como é que isso funciona por dentro e porque é que continuas a ter um Pydantic do outro lado?',
      minutos: 5,
      dica: 'Pensa no que o mecanismo controla em cada passo de geração e no que não consegue ver.',
      resposta: [
        {
          type: 'p',
          text:
            'Funciona por **constrained decoding**: o esquema é compilado numa gramática e, a cada token, o motor de inferência mascara os tokens que tornariam a saída inválida, de modo que só se amostra entre os permitidos. Isso garante a forma. Não garante a verdade dos valores, as regras de negócio, nem uma saída completa, e é por isso que valido.',
        },
        {
          type: 'p',
          text:
            'O mecanismo vem do trabalho de geração guiada por máquinas de estados (Willard e Louf, 2023, a base do Outlines): JSON Schema, expressões regulares ou gramáticas são transformados num autómato e, a cada passo, só os tokens que mantêm um estado válido ficam com probabilidade não nula. Os fornecedores de API fazem o equivalente do lado deles, com um subconjunto de JSON Schema que muda de fornecedor para fornecedor.',
        },
        {
          type: 'list',
          items: [
            '**Semântica**: um `pedido_id` com o padrão certo pode não existir; um enum pode ter o valor errado. O modelo continua a poder inventar, só que dentro da forma.',
            '**Regras entre campos**: «data_fim depois de data_inicio» ou «valor até 20% do total» não se exprimem no subconjunto suportado; ficam num validador.',
            '**Subconjunto do esquema**: palavras-chave como intervalos numéricos, formatos ou padrões podem não ser impostas por todos os fornecedores; o que não é imposto pela gramática tem de ser verificado por ti.',
            '**Cortes e recusas**: se a geração para por `max_tokens`, o JSON fica incompleto; se o modelo recusa, pode vir uma recusa em vez do objecto. Verifico sempre o motivo de paragem.',
            '**Qualidade**: obrigar a responder logo no formato pode piorar tarefas de raciocínio; Tam et al. (2024) mediram quedas com formatos restritos, e o resultado é discutido. Ponho um campo de justificação antes do campo de decisão e meço no meu caso.',
          ],
        },
        {
          type: 'p',
          text:
            'Em produção o Pydantic é o contrato: gera o esquema que envio, valida o que recebo e, quando falha, a falha é métrica (taxa de validação falhada por versão de modelo e de prompt) e não excepção silenciosa. Se o modo estrito estiver ligado e a taxa não for praticamente zero, há bug no meu esquema ou no motivo de paragem, não azar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Willard e Louf (2023) — Efficient Guided Generation for Large Language Models', url: 'https://arxiv.org/abs/2307.09702' },
            { label: 'Tam et al. (2024) — Let Me Speak Freely? Format restrictions and LLM performance', url: 'https://arxiv.org/abs/2408.02442' },
            { label: 'OpenAI — structured outputs', url: 'https://platform.openai.com/docs/guides/structured-outputs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica o mascaramento de tokens com base numa gramática compilada do esquema.',
          'Separa garantia de forma de garantia de conteúdo, com um exemplo de valor válido mas errado.',
          'Menciona regras entre campos ou de negócio que o esquema não exprime.',
          'Menciona truncagem por max_tokens ou recusas e a verificação do motivo de paragem.',
          'Refere o efeito possível na qualidade e uma mitigação (ordem dos campos, medir).',
        ],
        fraco: '«Se é estrito não preciso de validar», ou não sabe explicar como o fornecedor garante o esquema.',
        solido: 'Explica o mascaramento, dá exemplos de valores errados mas válidos e valida com Pydantic.',
        excelente: 'Acrescenta o subconjunto de esquema por fornecedor, truncagem e recusas, o efeito na qualidade com a mitigação da ordem dos campos, e transforma falhas de validação em métrica.',
      },
      seguimento: [
        'Porque é que a ordem dos campos no esquema pode mudar a qualidade da resposta?',
        'Como farias constrained decoding num modelo que hospedas tu?',
        'O que fazes quando a validação falha: repetes, degradas ou escalas?',
      ],
      sinaisAlarme: [
        'Confundir constrained decoding com o modelo «ter aprendido» o formato.',
        'Descartar a validação porque o fornecedor dá garantias.',
        'Ignorar o motivo de paragem da geração.',
      ],
      modulos: ['tool-calling', 'como-funciona-llm'],
    },

    /* ================================================================ 05 */
    {
      id: 'p-tool-calling-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Chamadas paralelas e dependências entre ferramentas',
      enunciado:
        'O cliente pergunta «o meu pedido PD-1 e o PD-2 já saíram?». O modelo devolve duas chamadas na mesma resposta. Como as executas? E quando é que desligavas as chamadas paralelas?',
      minutos: 5,
      dica: 'O que acontece se uma das duas falhar? E se a segunda precisasse do resultado da primeira?',
      resposta: [
        {
          type: 'p',
          text:
            'Executo-as **concorrentemente**, cada uma com o seu timeout, e devolvo **um resultado por cada id de chamada** na mensagem seguinte, incluindo os erros. Desligo o paralelismo quando há ferramentas com efeitos cuja ordem importa ou quando não controlo a concorrência do serviço do outro lado.',
        },
        {
          type: 'p',
          text:
            'Uma resposta com vários blocos de chamada significa que o modelo considerou as chamadas independentes. Correr duas leituras em sequência na aplicação custa a soma das latências; em paralelo, o máximo. O ganho maior é noutro sítio: se o modelo não pudesse pedir as duas de uma vez, precisava de uma volta extra ao modelo, que custa tipicamente mais do que a própria ferramenta. Em Python uso `asyncio.TaskGroup` ou `gather` com `return_exceptions=True` e converto cada excepção em `tool_result` com erro; uma falha não pode apagar o resultado da outra.',
        },
        {
          type: 'p',
          text:
            'Quando há **dependência real** (descobrir o pedido mais recente e depois o seu estado), o modelo não tem o valor e tem de fazer duas voltas; o risco é ele adivinhar o argumento da segunda chamada e emiti-la em paralelo. Detecto isso porque o id não veio de nenhum resultado anterior, e a ferramenta recusa ids que não pertencem ao cliente. Também posso dar uma ferramenta composta (`ultimo_pedido_com_estado`) quando a sequência é sempre a mesma: menos voltas e menos espaço para erro.',
        },
        {
          type: 'table',
          head: ['Situação', 'Paralelo?', 'Porquê'],
          rows: [
            ['Várias leituras independentes', 'Sim', 'Menos latência e menos voltas ao modelo'],
            ['Escritas no mesmo recurso (cancelar e reembolsar)', 'Não', 'A ordem importa e uma falha parcial deixa estado inconsistente'],
            ['Serviço externo com rate limit apertado', 'Limitado', 'Semáforo por ferramenta para não gerar 429 em rajada'],
          ],
        },
        {
          type: 'p',
          text:
            'Para desligar há parâmetros explícitos: `disable_parallel_tool_use` dentro do `tool_choice` na API da Anthropic e `parallel_tool_calls: false` na da OpenAI. Mesmo assim, o orquestrador não deve assumir uma chamada por resposta: o código trata sempre uma lista.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — implementar tool use', url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use' },
            { label: 'OpenAI — function calling', url: 'https://platform.openai.com/docs/guides/function-calling' },
            { label: 'Python — asyncio.TaskGroup', url: 'https://docs.python.org/3/library/asyncio-task.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Executa concorrentemente e devolve um resultado por id, incluindo erros.',
          'Isola falhas: uma ferramenta a falhar não impede o resultado das outras.',
          'Explica que dependências obrigam a voltas sequenciais e o risco de argumentos adivinhados.',
          'Sabe quando e como desligar o paralelismo (efeitos com ordem, rate limits).',
        ],
        fraco: 'Executa só a primeira chamada ou falha o turno inteiro quando uma delas dá erro.',
        solido: 'Concorrência com timeout, resultado por id, erros como tool_result e paralelismo desligado para escritas.',
        excelente: 'Quantifica o ganho em voltas ao modelo, detecta argumentos não provenientes de resultados anteriores, propõe ferramentas compostas e limita concorrência por serviço.',
      },
      seguimento: [
        'Que timeout dás a cada ferramenta se o orçamento total do turno é 4 s?',
        'Como apresentas no traço duas chamadas concorrentes?',
        'Quando é que uma ferramenta composta é pior do que duas simples?',
      ],
      sinaisAlarme: [
        'Assumir uma única chamada por resposta.',
        'Deixar uma excepção de uma ferramenta abortar o turno sem resposta ao modelo.',
        'Paralelizar escritas sem pensar em ordem ou consistência.',
      ],
      modulos: ['tool-calling', 'agentes'],
    },

    /* ================================================================ 06 */
    {
      id: 'p-tool-calling-06',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'O reembolso saiu duas vezes: idempotência em ferramentas',
      enunciado:
        'Num banco móvel, o assistente tem uma ferramenta `reembolsar_comissao`. Houve um timeout, um retry, e o cliente recebeu duas vezes. De onde vem a chave de idempotência — do modelo, do orquestrador ou do negócio? Que garantias dá cada escolha?',
      minutos: 8,
      dica: 'Enumera todas as fontes de repetição, não só o retry HTTP.',
      resposta: [
        {
          type: 'p',
          text:
            'Nunca do modelo. Uso **duas camadas**: uma chave derivada do **id da chamada** de ferramenta para apanhar repetições técnicas, e uma **restrição de negócio** (no máximo um reembolso por movimento e motivo) para apanhar repetições que o modelo decide fazer. A segunda é a que protege o dinheiro.',
        },
        {
          type: 'p',
          text:
            'As repetições vêm de cinco sítios: o retry do cliente HTTP para o serviço de pagamentos; o retry do orquestrador quando a ferramenta deu timeout mas executou; a nova volta em que o modelo, ao ver um erro, emite **uma chamada nova** com outro id; o utilizador que repete o pedido («e o reembolso?») noutro turno; e a retoma de um grafo a partir de um checkpoint que re-executa o passo. Uma única chave não cobre tudo.',
        },
        {
          type: 'table',
          head: ['Origem da chave', 'Apanha', 'Não apanha', 'Risco'],
          rows: [
            ['Gerada pelo modelo', 'Quase nada', 'Tudo: o modelo pode gerar uma chave nova a cada tentativa ou repetir a mesma em operações diferentes', 'Dá falsa segurança'],
            ['id da chamada de ferramenta', 'Retries HTTP e do orquestrador para a mesma chamada', 'Nova chamada do modelo, novo turno do utilizador', 'Baixo; é o mínimo'],
            ['Derivada do negócio: hash de cliente, movimento, tipo e valor', 'Todas as anteriores', 'Pedidos legítimos repetidos (dois reembolsos devidos no mesmo movimento)', 'Bloqueia casos legítimos raros; precisam de caminho humano'],
          ],
        },
        {
          type: 'p',
          text:
            'Do lado do serviço, a chave é guardada com o resultado (numa tabela com restrição única, numa transacção com o efeito) e uma repetição devolve o mesmo resultado com um indicador `repetido: true`, para o modelo não dizer ao cliente que reembolsou duas vezes. Se o serviço de pagamentos aceitar um cabeçalho `Idempotency-Key`, passo-lhe a chave de negócio; se não aceitar, a tabela local antes da chamada mais a reconciliação são a protecção. O rascunho do IETF para este cabeçalho é a referência para semântica de expiração e de conflito.',
        },
        {
          type: 'p',
          text:
            'O trade-off de staff é decidir **quem paga o caso raro**: com chave de negócio, um segundo reembolso legítimo no mesmo movimento vai para um humano; sem ela, o duplicado vai para a reconciliação depois do dinheiro sair. Num banco, prefiro o primeiro e meço quantas vezes acontece. Em ferramentas só de leitura, nada disto é preciso.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Teste que exijo',
          text: 'Simular timeout depois do efeito e antes da resposta, seguido de nova chamada do modelo com outro id: o teste passa só se houver um único movimento no ledger.',
        },
        {
          type: 'refs',
          items: [
            { label: 'IETF — The Idempotency-Key HTTP Header Field (rascunho)', url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/' },
            { label: 'OWASP — LLM06 Excessive Agency', url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Recusa chaves geradas pelo modelo e explica porquê.',
          'Enumera fontes de repetição além do retry HTTP (nova chamada do modelo, novo turno, retoma de checkpoint).',
          'Propõe uma chave derivada do negócio ou restrição única, guardada atomicamente com o efeito.',
          'Devolve o resultado original numa repetição, sinalizando que é repetido.',
          'Nomeia o custo da chave de negócio (casos legítimos bloqueados) e quem o absorve.',
        ],
        fraco: '«Uso o id da chamada como chave» e considera o problema resolvido.',
        solido: 'Combina id da chamada com chave de negócio guardada com o efeito e devolve o resultado original.',
        excelente: 'Mapeia todas as fontes de repetição incluindo retoma de checkpoints, decide explicitamente quem paga o caso legítimo bloqueado e exige um teste que simula o timeout depois do efeito.',
      },
      seguimento: [
        'Quanto tempo guardas as chaves e o que acontece depois de expirarem?',
        'Como reconcilias quando o serviço externo não suporta idempotência?',
        'O que diz o modelo ao cliente quando recebe repetido: true?',
      ],
      sinaisAlarme: [
        'Pedir ao modelo que «não repita» no prompt como mecanismo de protecção.',
        'Guardar a chave depois do efeito, fora da mesma transacção.',
        'Não distinguir ferramentas com efeitos de ferramentas de leitura.',
      ],
      modulos: ['tool-calling', 'langgraph-persistencia'],
    },

    /* ================================================================ 07 */
    {
      id: 'p-tool-calling-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Autorização: o system prompt diz para não o fazer, chega?',
      enunciado:
        'O system prompt diz «só podes consultar pedidos do próprio cliente». Um colega acha que chega. Porque não, e onde pões a autorização?',
      minutos: 5,
      dica: 'Quem mais escreve no contexto do modelo além de ti?',
      resposta: [
        {
          type: 'p',
          text:
            'Não chega porque o prompt é uma **instrução probabilística** num contexto que também contém texto do utilizador, de documentos e de resultados de ferramentas, e qualquer um deles pode conter instruções que o modelo segue. Autorização é código determinístico **dentro da ferramenta**, com a identidade vinda da sessão autenticada.',
        },
        {
          type: 'list',
          items: [
            '**Identidade fora do esquema**: o `cliente_id` vem do token da sessão e é injectado pelo orquestrador; o modelo não o vê como argumento e não o pode trocar.',
            '**Verificação de posse em cada chamada**: a ferramenta carrega o recurso e confirma que pertence ao cliente; para recursos de outros devolve «não encontrado», a mesma resposta que para inexistentes, para não permitir enumeração.',
            '**Credenciais do utilizador, não do serviço**: a ferramenta chama a API interna com um token com o âmbito do utilizador (por exemplo via OAuth token exchange), não com uma conta técnica que vê tudo. Se a verificação falhar no meu código, a API de baixo recusa na mesma.',
            '**Mínimo privilégio no catálogo**: o assistente de WhatsApp não tem ferramentas de pagamento; o que não está no catálogo não se pede por injecção.',
            '**Confirmação humana** para acções de impacto (alterar morada de entrega, cancelar contrato), com o resumo da acção gerado pelo código e não pelo modelo.',
          ],
        },
        {
          type: 'p',
          text:
            'O prompt continua útil para a **experiência**: evita que o modelo tente e falhe, e dá-lhe a frase certa para recusar. Mas meço a segurança pelo que acontece quando o prompt é contornado: um conjunto de ataques de prompt injection directa e indirecta em CI, com a métrica «acções executadas sobre recursos de outro cliente», que tem de ser zero porque a ferramenta recusa, não porque o modelo obedeceu.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Filtrar a resposta em vez da acção',
          text: 'Um guardrail de saída que esconde dados de outro cliente na resposta não desfaz uma escrita já executada. A autorização tem de estar antes do efeito.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OWASP — LLM06 Excessive Agency', url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/' },
            { label: 'RFC 8693 — OAuth 2.0 Token Exchange', url: 'https://www.rfc-editor.org/rfc/rfc8693' },
            { label: 'OWASP — Top 10 para aplicações LLM', url: 'https://genai.owasp.org/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que o prompt pode ser contornado por injecção directa ou indirecta.',
          'Tira a identidade do esquema e injecta-a a partir da sessão.',
          'Verifica posse do recurso dentro da ferramenta em cada chamada.',
          'Usa credenciais com âmbito do utilizador ou mínimo privilégio, não uma conta técnica total.',
          'Propõe testar com ataques e medir acções indevidas executadas.',
        ],
        fraco: 'Aceita o prompt como controlo ou propõe um guardrail de saída como solução.',
        solido: 'Identidade da sessão, verificação de posse na ferramenta e confirmação para acções de impacto.',
        excelente: 'Acrescenta defesa em profundidade com token do utilizador até à API de baixo, resposta não enumerável, catálogo mínimo por canal e uma métrica de segurança em CI que não depende do modelo obedecer.',
      },
      seguimento: [
        'Como tratas um agente que actua em nome de um funcionário de backoffice com mais permissões?',
        'O que registas no audit log de cada chamada de ferramenta?',
        'Quando é que a confirmação humana é teatro e não controlo?',
      ],
      sinaisAlarme: [
        '«O modelo é bem comportado, nunca vi acontecer.»',
        'Ferramentas a usar uma conta de serviço com acesso a todos os clientes sem verificação.',
        'Deixar o modelo preencher o identificador do utilizador.',
      ],
      modulos: ['tool-calling', 'guardrails-seguranca'],
    },

    /* ================================================================ 08 */
    {
      id: 'p-tool-calling-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Sessenta ferramentas e o modelo começa a escolher mal',
      enunciado:
        'O assistente interno de uma seguradora começou com 8 ferramentas e agora tem 60, vindas de quatro equipas. A taxa de ferramenta errada subiu e cada pedido leva milhares de tokens de esquemas. O que fazes?',
      minutos: 8,
      dica: 'Há três alavancas: menos ferramentas, ferramentas mostradas por pedido, ou mais do que um agente.',
      resposta: [
        {
          type: 'p',
          text:
            'Primeiro meço onde está o erro, depois reduzo **o que o modelo vê em cada pedido**: consolido ferramentas sobrepostas e passo a mostrar só um subconjunto relevante, por selecção dinâmica ou por um encaminhamento por domínio. A OpenAI sugere, como indicação suave, menos de 20 funções disponíveis no início de um turno, e a documentação de tool search da Anthropic diz que a escolha degrada a partir de cerca de 30 a 50 ferramentas (Out. 2026). Com 60, é de esperar confusões entre vizinhas e custo fixo alto.',
        },
        {
          type: 'p',
          text:
            'Diagnóstico: com um conjunto de algumas centenas de pedidos anotados com a ferramenta certa, construo a matriz de confusão das escolhas. Quase sempre o erro concentra-se em pares com descrições sobrepostas (`consultar_apolice` e `consultar_sinistro_apolice`) e não está espalhado. Os esquemas custam centenas de tokens cada; 60 ferramentas são facilmente uma ordem de grandeza de 10 mil tokens por pedido antes de o utilizador dizer nada. O prompt caching baixa o custo desse prefixo, mas não resolve a escolha.',
        },
        {
          type: 'table',
          head: ['Alavanca', 'Ganho', 'Custo', 'Quando escolho'],
          rows: [
            ['Consolidar e desambiguar', 'Menos pares confundíveis; descrições com fronteiras', 'Coordenação entre equipas; ferramentas mais genéricas pedem argumentos melhores', 'Sempre, primeiro'],
            ['Selecção dinâmica (pesquisa sobre descrições, top-k)', 'Contexto pequeno e estável por pedido', 'Se a ferramenta certa não for recuperada, a falha é silenciosa; muda o prefixo e reduz cache', 'Catálogo grande e plano, pedidos de domínio variado'],
            ['Router por domínio ou sub-agentes', 'Cada agente vê 8 a 15 ferramentas da sua área', 'Mais uma decisão e mais latência; pedidos que atravessam domínios', 'Domínios com fronteiras claras e donos diferentes'],
          ],
        },
        {
          type: 'p',
          text:
            'Na selecção dinâmica, a métrica nova é o **recall@k da ferramenta certa** no recuperador; se for 0,95 com k = 8, 5% dos pedidos nunca podem acertar, e isso entra no orçamento de erro. Mantenho sempre visíveis as ferramentas transversais (procurar cliente, escalar para humano). Alguns fornecedores já oferecem isto como funcionalidade, com ferramentas carregadas sob pedido; avalio-a igual.',
        },
        {
          type: 'p',
          text:
            'O ponto organizacional é que 60 ferramentas de quatro equipas são um **catálogo com governação**: prefixo por domínio no nome, dono por ferramenta, revisão de descrições e um eval de selecção que corre quando qualquer equipa muda uma ferramenta. Sem isso, a próxima ferramenta volta a estragar as outras.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenAI — function calling (boas práticas)', url: 'https://platform.openai.com/docs/guides/function-calling' },
            { label: 'Anthropic — tool search', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool' },
            { label: 'Patil et al. (2023) — Gorilla: LLM connected with massive APIs', url: 'https://arxiv.org/abs/2305.15334' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Mede antes de mudar: matriz de confusão das escolhas num conjunto anotado.',
          'Quantifica o custo em tokens dos esquemas por pedido e o efeito (e limite) do prompt caching.',
          'Compara consolidação, selecção dinâmica e router ou sub-agentes com custos de cada.',
          'Introduz o recall do recuperador de ferramentas como nova fonte de erro a medir.',
          'Propõe governação do catálogo entre equipas (nomes, donos, eval como gate).',
        ],
        fraco: '«Passo para um modelo maior» ou «ponho tudo no prompt e explico melhor».',
        solido: 'Consolida sobrepostas e propõe selecção dinâmica ou sub-agentes com uma avaliação de selecção.',
        excelente: 'Diagnostica pares confundidos, quantifica tokens e cache, mede o recall do recuperador como limite superior de acerto e trata o catálogo como produto com donos e gate de avaliação.',
      },
      seguimento: [
        'Como constróis o conjunto anotado de selecção de ferramentas sem semanas de trabalho?',
        'O que fazes com pedidos que precisam de ferramentas de dois domínios?',
        'Como é que a selecção dinâmica interage com o prompt caching?',
      ],
      sinaisAlarme: [
        'Resolver com um modelo maior sem medir onde está o erro.',
        'Selecção dinâmica sem medir se a ferramenta certa chega ao contexto.',
        'Não ver o problema de coordenação entre equipas.',
      ],
      modulos: ['tool-calling', 'multi-agente-mcp', 'custo-escala'],
    },

    /* ================================================================ 09 */
    {
      id: 'p-tool-calling-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Escreve um dispatcher de ferramentas com validação e erros estruturados',
      enunciado:
        'Escreve o componente que recebe uma chamada de ferramenta do modelo (id, nome, argumentos) e devolve o tool_result. Tem de validar argumentos, aplicar autorização e nunca rebentar o ciclo.',
      contexto:
        'Python 3.13 com Pydantic v2. Assinatura: `Registo.executar(chamada_id, nome, argumentos, ctx) -> dict`, onde `argumentos` pode chegar como dict (formato Anthropic) ou string JSON (formato OpenAI) e `ctx` traz o `cliente_id` da sessão. Duas ferramentas: `estado_pedido(pedido_id)` e `emitir_cupao(pedido_id, valor_mzn 1..500, motivo enum)`, com cupão limitado a 20% do total do pedido. 25 minutos.',
      minutos: 25,
      dica: 'Lista primeiro todas as formas de a chamada correr mal antes de chegar à função.',
      resposta: [
        {
          type: 'p',
          text:
            'Faço um registo de ferramentas em que cada uma tem um modelo Pydantic de argumentos (que gera o esquema enviado ao modelo e valida o que volta) e uma função que recebe os argumentos validados e o contexto da sessão. O dispatcher **nunca levanta**: todos os caminhos devolvem um `tool_result`, com `is_error` e um corpo com código, mensagem e se vale a pena tentar outra vez. Custo por chamada: O(tamanho dos argumentos) na validação, mais a função.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Corre como está (Python 3.13, Pydantic 2.x). O resultado do teste está em comentário no fim.',
          code: String.raw`import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

log = logging.getLogger("ferramentas")


@dataclass(frozen=True)
class Contexto:
    """Vem da sessão autenticada. O modelo nunca escreve aqui."""
    cliente_id: str


class ErroFerramenta(Exception):
    def __init__(self, codigo: str, mensagem: str, recuperavel: bool):
        super().__init__(mensagem)
        self.codigo, self.mensagem, self.recuperavel = codigo, mensagem, recuperavel


@dataclass(frozen=True)
class Ferramenta:
    nome: str
    descricao: str
    args: type[BaseModel]
    fn: Callable[[Any, Contexto], dict]

    def esquema(self) -> dict:
        return {"name": self.nome, "description": self.descricao,
                "input_schema": self.args.model_json_schema()}


class Registo:
    def __init__(self, ferramentas: list[Ferramenta]):
        self._f = {f.nome: f for f in ferramentas}

    def esquemas(self) -> list[dict]:
        return [f.esquema() for f in self._f.values()]

    def executar(self, chamada_id: str, nome: str, argumentos: str | dict,
                 ctx: Contexto) -> dict:
        """Nunca levanta: devolve sempre um tool_result para o modelo."""
        def erro(codigo: str, msg: str, recuperavel: bool, **extra) -> dict:
            corpo = {"erro": codigo, "mensagem": msg, "recuperavel": recuperavel, **extra}
            return {"type": "tool_result", "tool_use_id": chamada_id,
                    "is_error": True, "content": json.dumps(corpo, ensure_ascii=False)}

        f = self._f.get(nome)
        if f is None:
            return erro("ferramenta_desconhecida", f"Não existe '{nome}'.", True,
                        disponiveis=sorted(self._f))
        if isinstance(argumentos, str):
            try:
                argumentos = json.loads(argumentos or "{}")
            except json.JSONDecodeError as e:
                return erro("json_invalido", f"Argumentos não são JSON: {e.msg}.", True)
        try:
            args = f.args.model_validate(argumentos)
        except ValidationError as e:
            detalhes = [{"campo": ".".join(map(str, d["loc"])) or "(raiz)", "erro": d["msg"]}
                        for d in e.errors(include_url=False)]
            return erro("argumentos_invalidos", "Corrige os campos e tenta outra vez.",
                        True, detalhes=detalhes)
        try:
            resultado = f.fn(args, ctx)
        except ErroFerramenta as e:
            return erro(e.codigo, e.mensagem, e.recuperavel)
        except Exception:
            log.exception("falha em %s (%s)", nome, chamada_id)  # o traço fica no log
            return erro("interno", "Falha temporária; não repitas mais de uma vez.", True)
        return {"type": "tool_result", "tool_use_id": chamada_id, "is_error": False,
                "content": json.dumps(resultado, ensure_ascii=False)}


# ---- duas ferramentas de exemplo -----------------------------------------
PEDIDOS = {"PD-000123": {"cliente": "C-1", "estado": "a caminho", "total_mzn": 1450},
           "PD-000999": {"cliente": "C-2", "estado": "entregue", "total_mzn": 800}}


class EstadoPedidoArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pedido_id: str = Field(pattern=r"^PD-\d{6}$", description="Id do pedido, ex. PD-000123.")


class EmitirCupaoArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pedido_id: str = Field(pattern=r"^PD-\d{6}$")
    valor_mzn: int = Field(ge=1, le=500, description="Valor em MZN, 1 a 500.")
    motivo: Literal["atraso", "artigo_em_falta", "artigo_danificado"]


def _pedido_do_cliente(pedido_id: str, ctx: Contexto) -> dict:
    p = PEDIDOS.get(pedido_id)
    if p is None or p["cliente"] != ctx.cliente_id:   # mesma resposta: não revela existência
        raise ErroFerramenta("nao_encontrado", "Pedido não encontrado para este cliente.", False)
    return p


def estado_pedido(a: EstadoPedidoArgs, ctx: Contexto) -> dict:
    p = _pedido_do_cliente(a.pedido_id, ctx)
    return {"pedido_id": a.pedido_id, "estado": p["estado"]}


def emitir_cupao(a: EmitirCupaoArgs, ctx: Contexto) -> dict:
    p = _pedido_do_cliente(a.pedido_id, ctx)
    if a.valor_mzn > p["total_mzn"] * 0.2:
        raise ErroFerramenta("acima_do_limite", "Máximo: 20% do total do pedido.", True)
    return {"cupao": f"CP-{a.pedido_id[3:]}", "valor_mzn": a.valor_mzn}


registo = Registo([
    Ferramenta("estado_pedido", "Estado actual de um pedido do cliente.", EstadoPedidoArgs, estado_pedido),
    Ferramenta("emitir_cupao", "Emite um cupão de compensação. Só depois de confirmar o problema.",
               EmitirCupaoArgs, emitir_cupao),
])

# ---- teste --------------------------------------------------------------
ctx = Contexto(cliente_id="C-1")
casos = [
    ("t1", "estado_pedido", '{"pedido_id": "PD-000123"}'),       # string (formato OpenAI)
    ("t2", "estado_pedido", {"pedido_id": "PD-000999"}),         # pedido de outro cliente
    ("t3", "emitir_cupao", {"pedido_id": "PD-000123", "valor_mzn": 900, "motivo": "atraso"}),
    ("t4", "emitir_cupao", {"pedido_id": "PD-000123", "valor_mzn": 300, "motivo": "atraso"}),
    ("t5", "emitir_cupao", {"pedido_id": "PD-000123", "valor_mzn": 250, "motivo": "atraso"}),
    ("t6", "emitir_cupao", {"pedido_id": "123", "valor_mzn": 50, "motivo": "frio", "nota": "x"}),
    ("t7", "cancelar_pedido", {}),
    ("t8", "estado_pedido", '{"pedido_id": '),
]
for cid, nome, args in casos:
    r = registo.executar(cid, nome, args, ctx)
    corpo = json.loads(r["content"])
    print(cid, corpo.get("erro", "ok"), [d["campo"] for d in corpo.get("detalhes", [])])
# t1 ok []
# t2 nao_encontrado []
# t3 argumentos_invalidos ['valor_mzn']
# t4 acima_do_limite []
# t5 ok []
# t6 argumentos_invalidos ['pedido_id', 'motivo', 'nota']
# t7 ferramenta_desconhecida []
# t8 json_invalido []`,
        },
        {
          type: 'p',
          text:
            'Casos-limite cobertos: ferramenta inexistente (devolvo a lista das disponíveis para o modelo se corrigir), argumentos em string com JSON truncado, campos fora do esquema (`extra="forbid"`), vários erros de validação de uma vez com o nome do campo, regra de negócio que o esquema não exprime (20% do total), recurso de outro cliente com a mesma resposta que um inexistente, e excepção inesperada convertida em erro genérico sem expor o stack trace ao modelo.',
        },
        {
          type: 'p',
          text:
            'O campo `recuperavel` é o que o orquestrador e o modelo usam para decidir: `nao_encontrado` não se repete com o mesmo argumento, `argumentos_invalidos` sim. Testaria com pytest parametrizado por estes oito casos, mais um teste de propriedade de que `executar` nunca levanta para qualquer dict, e mediria em produção a taxa de cada código de erro por ferramenta e por versão de prompt.',
        },
        {
          type: 'p',
          text:
            'Extensões que o entrevistador pode pedir: chave de idempotência em `emitir_cupao` derivada de cliente, pedido e motivo; timeout por ferramenta com `asyncio.timeout`; execução concorrente de várias chamadas; limite de chamadas por conversa; e um span OpenTelemetry por chamada com nome, duração e código de erro.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Pydantic — modelos e validação', url: 'https://docs.pydantic.dev/latest/concepts/models/' },
            { label: 'Anthropic — implementar tool use (tool_result e is_error)', url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Todos os caminhos devolvem um tool_result com o id da chamada; nada levanta para o ciclo.',
          'Valida com um modelo que também gera o esquema, rejeitando campos extra.',
          'Devolve erros de validação por campo, legíveis pelo modelo.',
          'Autoriza com a identidade do contexto e não revela a existência de recursos de outros.',
          'Distingue erros recuperáveis de não recuperáveis.',
          'Inclui um teste com os casos-limite e o resultado esperado.',
        ],
        fraco: 'Um dicionário de funções chamado com **kwargs do modelo, sem validação, e excepções a subir até ao ciclo.',
        solido: 'Validação Pydantic, erros como tool_result, autorização na ferramenta e testes dos casos principais.',
        excelente: 'Acrescenta erros classificados como recuperáveis, protecção contra enumeração, regra de negócio fora do esquema, logging interno sem fuga para o modelo e um plano de métricas por código de erro.',
      },
      seguimento: [
        'Como acrescentavas idempotência a emitir_cupao sem mudar a interface?',
        'O que muda se as ferramentas forem async e corridas em paralelo?',
        'Como evitarias que o modelo entre em ciclo a repetir a mesma chamada inválida?',
      ],
      sinaisAlarme: [
        'Usar eval ou getattr sobre o nome vindo do modelo sem lista branca.',
        'Devolver o stack trace completo ao modelo.',
        'Deixar uma excepção abortar a conversa sem tool_result.',
      ],
      modulos: ['tool-calling', 'fastapi-servico'],
    },

    /* ================================================================ 10 */
    {
      id: 'p-tool-calling-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O modelo inventa números de cliente e chama a ferramenta errada',
      enunciado:
        'Depois de acrescentarem três ferramentas ao assistente de uma operadora, 6% das chamadas a `consultar_fatura` levam um `numero_cliente` que não existe, e às vezes o modelo chama `alterar_tarifario` quando o cliente só perguntou o preço. Como investigas?',
      contexto:
        'Operadora em Portugal, assistente na app com 14 ferramentas, ≈ 9 000 conversas por dia, modelo médio por API com versão fixada. O deploy de terça trouxe `alterar_tarifario`, `simular_tarifario` e `consultar_tarifario`, e um exemplo novo no system prompt. `consultar_fatura` tem `numero_cliente` como argumento obrigatório. Os traços guardam prompt, catálogo, chamadas e resultados. Nenhuma alteração indevida de tarifário chegou a executar porque há confirmação.',
      minutos: 10,
      dica: 'Porque é que o modelo preenche um campo que devia vir da sessão?',
      resposta: [
        {
          type: 'p',
          text:
            'São dois problemas com a mesma raiz: o catálogo pede ao modelo coisas que ele não devia decidir. O `numero_cliente` inventado vem quase de certeza de **um argumento de identidade no esquema** (e provavelmente de um exemplo no prompt com um número fictício), e a escolha errada vem de **três ferramentas novas com nomes e descrições sobrepostos**.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Separar os dois sintomas nos traços', text: 'Filtro as chamadas com `numero_cliente` inexistente e vejo se o valor aparece em algum sítio do contexto (prompt, mensagens, resultados). Se for o número do exemplo novo ou uma variação dele, está confirmado o copiar do exemplo. Se não aparecer em lado nenhum, o modelo está a gerar um valor plausível porque o campo é obrigatório e ele não tem a informação.' },
            { title: 'Confirmar a origem temporal', text: 'Comparo a taxa antes e depois de terça. O modelo está fixado, por isso as diferenças vêm do deploy: catálogo e prompt. Reproduzo offline 200 conversas antigas com o catálogo de segunda e com o de terça, mantendo o resto igual.' },
            { title: 'Matriz de confusão das ferramentas', text: 'Para as perguntas de preço, conto que ferramenta foi escolhida. Se `alterar_tarifario` aparece sobretudo quando a pergunta tem verbos como «mudar» ou «passar para», a descrição não separa simular, consultar e alterar.' },
            { title: 'Ver o que volta ao modelo', text: 'Verifico se o erro de `numero_cliente` inexistente volta como tool_result legível ou se é engolido. Um erro genérico leva o modelo a tentar outro número em vez de parar.' },
          ],
        },
        {
          type: 'p',
          text:
            'Correcções, por ordem de impacto: retiro `numero_cliente` do esquema e injecto-o da sessão (o problema desaparece por construção); tiro do prompt os identificadores fictícios dos exemplos ou substituo-os por marcadores evidentes; reescrevo as três descrições com fronteiras explícitas («só simula, não altera nada»; «altera, usa apenas depois de o cliente confirmar que quer mudar») e prefixo comum `tarifario_`; e mantenho a confirmação de `alterar_tarifario` gerada pelo código.',
        },
        {
          type: 'p',
          text:
            'Para não voltar: um conjunto de avaliação de selecção com 150 a 300 pedidos anotados (ferramenta esperada e argumentos esperados), que corre em CI quando muda o catálogo ou o prompt, com dois gates — exactidão de ferramenta por intenção e taxa de argumentos que não vêm do contexto. E um alerta em produção sobre a taxa de `nao_encontrado` por ferramenta, que teria apanhado isto na terça à tarde.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Trocar de modelo primeiro',
          text: 'Um modelo maior pode inventar menos, mas mantém o campo que não devia existir e custa mais em cada pedido. A causa está no contrato das ferramentas, não na capacidade.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — definir ferramentas', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools' },
            { label: 'OpenAI — function calling', url: 'https://platform.openai.com/docs/guides/function-calling' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica o argumento de identidade no esquema como causa da invenção e propõe injectá-lo da sessão.',
          'Suspeita do exemplo novo no prompt e verifica se o valor inventado vem do contexto.',
          'Usa a fixação do modelo para isolar o deploy e reproduz offline com catálogos antigo e novo.',
          'Diagnostica selecção errada com matriz de confusão e descrições sobrepostas.',
          'Propõe um eval de selecção e argumentos como gate em CI e um alerta em produção.',
        ],
        fraco: 'Acrescenta ao prompt «não inventes números» ou troca de modelo.',
        solido: 'Retira o identificador do esquema, reescreve as descrições sobrepostas e acrescenta testes.',
        excelente: 'Separa os dois sintomas, confirma cada hipótese com traços e reprodução controlada, corrige por construção e instala gate de selecção e alerta de erros por ferramenta.',
      },
      seguimento: [
        'Como mediste «argumentos que não vêm do contexto» automaticamente?',
        'Que fazias se fosse impossível tirar o identificador do esquema (ferramenta de backoffice)?',
        'Como decidias se simular e consultar tarifário deviam ser uma só ferramenta?',
      ],
      sinaisAlarme: [
        'Resolver com mais uma frase no system prompt.',
        'Mudar catálogo, prompt e modelo ao mesmo tempo.',
        'Não olhar para traços reais antes de propor a correcção.',
      ],
      modulos: ['tool-calling', 'avaliar-agentes', 'observabilidade-llmops'],
    },
  ],
};
