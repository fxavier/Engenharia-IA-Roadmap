import type { TopicoEntrevista } from '../../types';

const RGPD = { label: 'EUR-Lex — Regulamento (UE) 2016/679 (RGPD)', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' };
const AI_ACT = { label: 'EUR-Lex — Regulamento (UE) 2024/1689 (AI Act)', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' };
const OMNIBUS = { label: 'EUR-Lex — Regulamento (UE) 2026/1744 (Digital Omnibus on AI)', url: 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj' };
const EDPB_28 = { label: 'EDPB — Parecer 28/2024 sobre modelos de IA e protecção de dados', url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en' };
const NIST_RMF = { label: 'NIST — AI Risk Management Framework', url: 'https://www.nist.gov/itl/ai-risk-management-framework' };
const CNPD = { label: 'CNPD — Comissão Nacional de Protecção de Dados', url: 'https://www.cnpd.pt/' };

export const topico: TopicoEntrevista = {
  id: 'governanca',
  numero: 24,
  bloco: 'avaliacao',
  titulo: 'Privacidade, governança e IA responsável',
  resumo:
    'RGPD aplicado a sistemas LLM, AI Act e o seu calendário, NIST AI RMF, documentação, enviesamento, supervisão humana e auditoria. Perguntado porque um AI engineer sénior tem de saber o que o desenho técnico implica legalmente — e quando parar e chamar o DPO.',
  icon: '⚖️',
  modulos: ['guardrails-seguranca', 'observabilidade-llmops', 'avaliacao-fundamentos'],
  essencial: [
    'RGPD: cada finalidade precisa de base legal (art. 6.º); responder ao cliente e melhorar o modelo com as conversas são finalidades diferentes.',
    'Minimização (art. 5.º, n.º 1, al. c)) e limitação da conservação (al. e)): o que não entra no prompt, nos logs ou no índice não tem de ser apagado.',
    'AIPD (art. 35.º) quando o tratamento é susceptível de resultar em risco elevado; tecnologia nova, grande escala e dados sensíveis empurram para lá.',
    'Direito ao apagamento (art. 17.º): resposta em um mês, prorrogável por mais dois (art. 12.º, n.º 3). Os dados estão em logs, traços, vectores, caches, evals e backups.',
    'Fornecedor de modelo por API é tipicamente subcontratante: contrato do art. 28.º, lista de subcontratantes, região, retenção e transferências (cap. V).',
    'AI Act: proibido, alto risco (Anexo I e Anexo III), transparência (art. 50.º) e risco mínimo; os modelos de uso geral têm regime próprio (arts. 51.º a 55.º).',
    'Calendário: proibições e literacia desde 2/2/2025; modelos de uso geral desde 2/8/2025; aplicação geral, incluindo art. 50.º, desde 2/8/2026.',
    'Digital Omnibus (Reg. (UE) 2026/1744, em vigor a 27/7/2026): alto risco do Anexo III passa para 2/12/2027 e do Anexo I para 2/8/2028.',
    'NIST AI RMF 1.0 (2023): Govern, Map, Measure, Manage — voluntário, útil para organizar o processo; o perfil de IA generativa é o NIST AI 600-1 (2024).',
    'Frase de sénior: «Não sou jurista; trago o desenho técnico e as perguntas certas, e a decisão legal valido com o DPO e o jurídico.»',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-governanca-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que o RGPD exige de um assistente com LLM',
      enunciado:
        'Vais lançar em Portugal um assistente de apoio ao cliente sobre um modelo de um fornecedor externo. Do ponto de vista do RGPD, o que é que tens de ter resolvido antes de ir para produção?',
      minutos: 5,
      dica: 'Pensa em finalidades, papéis e em cada sítio onde o dado vai parar.',
      resposta: [
        {
          type: 'p',
          text: 'Quatro coisas: **base legal por finalidade**, **papéis e contratos** (quem é responsável e quem é subcontratante), **minimização e retenção** em todo o pipeline, e **capacidade de cumprir os direitos dos titulares** — informação, acesso, rectificação, apagamento e oposição. Não sou jurista: a qualificação final valido com o encarregado da protecção de dados (DPO), mas o desenho técnico tem de a tornar possível.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Finalidades e base legal', text: 'Responder ao cliente sobre o seu contrato apoia-se, em regra, na execução do contrato (art. 6.º, n.º 1, al. b)). Guardar conversas para melhorar prompts e avaliações é outra finalidade: costuma exigir interesse legítimo com teste de ponderação documentado, ou anonimização. Usar conversas para fine-tuning é uma terceira, com análise própria.' },
            { title: 'Papéis e contratos', text: 'A empresa é responsável pelo tratamento; o fornecedor do modelo actua normalmente como subcontratante, com contrato nos termos do art. 28.º. Verifico subcontratantes ulteriores, região de processamento, retenção e se usa os dados para treinar — nos termos em vigor, não de memória.' },
            { title: 'Minimização e retenção', text: 'Só entra no prompt o que a tarefa precisa; PII mascarada antes dos logs; prazos de conservação definidos para conversas, traços, caches e conjuntos de avaliação.' },
            { title: 'Direitos e informação', text: 'Aviso de privacidade que diz que há um sistema de IA e para quê (arts. 13.º e 14.º). Sei encontrar e apagar os dados de um titular em todos os sítios onde estão. Se o assistente tomar decisões com efeitos significativos sem humano, entra o art. 22.º.' },
          ],
        },
        {
          type: 'p',
          text: 'Há um ponto específico dos LLMs: o princípio da **exactidão**. O modelo pode gerar afirmações erradas sobre uma pessoa («o seu pagamento está em atraso») — isso é tratamento de dados pessoais inexactos. Mitigo com respostas ancoradas em dados do sistema (ferramentas e RAG com citação), não em geração livre, e com um caminho para o cliente contestar.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Consentimento para tudo',
          text: 'Pedir consentimento para o tratamento necessário ao serviço é um erro comum: se o cliente o retira, o serviço deixa de funcionar, e o consentimento não é livre quando é condição do serviço. Escolher a base legal certa por finalidade é trabalho com o DPO.',
        },
        { type: 'refs', items: [RGPD, EDPB_28, CNPD] },
      ],
      rubrica: {
        criterios: [
          'Separa finalidades (servir o cliente, melhorar o sistema, treinar) e dá a cada uma a sua base legal.',
          'Identifica o fornecedor do modelo como subcontratante e refere o contrato do art. 28.º.',
          'Aplica minimização e retenção a logs, traços, caches e conjuntos de avaliação, não só ao prompt.',
          'Garante capacidade técnica de cumprir os direitos dos titulares, incluindo apagamento.',
          'Reconhece o limite do seu papel e envolve o DPO.',
        ],
        fraco: '«Pedimos consentimento e anonimizamos», sem distinguir finalidades nem papéis.',
        solido: 'Base legal por finalidade, contrato com o fornecedor, minimização e retenção, aviso de privacidade.',
        excelente: 'Acrescenta exactidão como risco próprio dos LLMs, o art. 22.º quando há decisões automatizadas, e traduz cada obrigação num requisito técnico verificável.',
      },
      seguimento: [
        'Que base legal usarias para construir um conjunto dourado a partir de conversas reais?',
        'O que muda se o assistente atender também clientes em Moçambique?',
        'Como respondes a um pedido de acesso que inclui as respostas geradas pelo modelo?',
      ],
      sinaisAlarme: [
        '«Os dados vão para o fornecedor, por isso o problema é deles.»',
        'Afirmar com certeza qual é a base legal, sem envolver o DPO.',
        'Esquecer que logs e traços também são tratamento de dados pessoais.',
      ],
      modulos: ['guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-governanca-02',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'AIPD de um sistema LLM: quando e o que lá vai',
      enunciado:
        'O DPO pede-te o contributo técnico para a avaliação de impacto sobre a protecção de dados do novo assistente. É obrigatória? E que riscos específicos de LLM é que tu, engenheiro, pões lá?',
      minutos: 5,
      dica: 'O DPO conhece a lei; ele precisa de ti para os riscos que só quem constrói vê.',
      resposta: [
        {
          type: 'p',
          text: 'É obrigatória quando o tratamento é **susceptível de implicar um risco elevado** para os direitos dos titulares (art. 35.º). Num assistente com LLM sobre dados de clientes, a combinação de tecnologia nova, grande escala e, muitas vezes, dados financeiros ou de saúde torna-a quase sempre a decisão prudente — e a CNPD publica uma lista de tratamentos que a exigem. A decisão é do responsável com o DPO; o meu papel é descrever o sistema e os riscos técnicos com rigor.',
        },
        {
          type: 'p',
          text: 'O conteúdo mínimo vem do art. 35.º, n.º 7: descrição sistemática do tratamento e finalidades, necessidade e proporcionalidade, avaliação dos riscos e medidas para os mitigar. As orientações do antigo Grupo do Artigo 29 (WP248, adoptadas pelo EDPB) dão critérios, e a utilização inovadora de tecnologia é um deles. Se o risco residual continuar elevado, há consulta prévia à autoridade (art. 36.º).',
        },
        {
          type: 'table',
          head: ['Risco técnico de LLM', 'Como o descrevo', 'Medida'],
          rows: [
            ['Divulgação entre clientes', 'Injecção, cache ou índice partilhados devolvem dados de outro titular', 'Filtro de cliente em código, testes de isolamento, guarda de saída'],
            ['Inexactidão', 'O modelo afirma factos falsos sobre o titular', 'Respostas ancoradas em ferramentas e citações; caminho de contestação'],
            ['Retenção dispersa', 'Dados copiados para traços, caches, vectores e evals', 'Mapa de dados, mascaramento, prazos por armazenamento'],
            ['Transferências', 'Prompt processado pelo fornecedor fora do EEE', 'Região UE ou garantias do cap. V, contrato e retenção mínima'],
            ['Memorização', 'Fine-tuning com dados pessoais pode regurgitá-los', 'Não treinar com dados pessoais, ou avaliação específica'],
            ['Decisão automatizada', 'Assistente recusa ou aprova algo com efeito significativo', 'Humano no circuito; art. 22.º'],
          ],
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'A AIPD é um documento vivo',
          text: 'Mudar de fornecedor, acrescentar uma ferramenta que escreve dados ou começar a guardar memória de longo prazo são alterações que reabrem a avaliação. Ponho a revisão da AIPD na checklist de mudanças relevantes, ao lado do red team.',
        },
        { type: 'refs', items: [RGPD, CNPD, { label: 'EDPB — Comité Europeu para a Protecção de Dados (orientações e pareceres)', url: 'https://www.edpb.europa.eu/' }] },
      ],
      rubrica: {
        criterios: [
          'Diz que a AIPD é exigida quando há risco elevado provável (art. 35.º) e que a decisão é do responsável com o DPO.',
          'Refere o conteúdo mínimo (descrição, necessidade e proporcionalidade, riscos, medidas).',
          'Traz riscos específicos de LLM: divulgação entre clientes, inexactidão, retenção dispersa, transferências, memorização.',
          'Liga cada risco a uma medida técnica concreta.',
          'Trata a AIPD como documento a rever quando o sistema muda.',
        ],
        fraco: 'Diz que a AIPD é papelada do jurídico e não vê contributo técnico.',
        solido: 'Sabe quando é exigida, o que contém e traz três ou quatro riscos de LLM com medidas.',
        excelente: 'Acrescenta a consulta prévia quando o risco residual é alto, define gatilhos de revisão e mostra como a AIPD se cruza com o red team e as avaliações.',
      },
      seguimento: [
        'Que mudanças no sistema te fariam reabrir a AIPD?',
        'Como quantificas «risco residual» para o DPO?',
        'A AIPD e a avaliação de impacto em direitos fundamentais do AI Act são a mesma coisa?',
      ],
      sinaisAlarme: [
        'Fazer a AIPD depois do lançamento.',
        'Listar só riscos genéricos de segurança informática, sem nenhum específico de LLM.',
        'Achar que anonimizar os logs dispensa a AIPD.',
      ],
      modulos: ['guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-governanca-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'API nos EUA, região UE ou modelo próprio',
      enunciado:
        'Tens três opções para o modelo: a API de um fornecedor processada nos EUA, o mesmo tipo de modelo numa região UE de um fornecedor de cloud, ou um modelo de pesos abertos hospedado por ti. Como pesas a escolha do ponto de vista de protecção de dados?',
      minutos: 8,
      dica: 'Transferência, retenção, subcontratantes e o que perdes em qualidade e operação.',
      resposta: [
        {
          type: 'p',
          text: 'Nenhuma é proibida à partida; o que muda é **quanto trabalho jurídico e operacional** cada uma exige e **que risco residual** fica. A API nos EUA exige um mecanismo de transferência e confiança na retenção do fornecedor; a região UE reduz a questão da transferência mas não a elimina se o fornecedor for de um país terceiro; o modelo próprio elimina o fornecedor, mas passo a ser eu a garantir segurança, disponibilidade e qualidade.',
        },
        {
          type: 'table',
          head: ['', 'API processada nos EUA', 'Região UE de cloud', 'Pesos abertos self-hosted'],
          rows: [
            ['Transferência (cap. V)', 'Sim: decisão de adequação (EU-US Data Privacy Framework, se o fornecedor estiver certificado) ou cláusulas contratuais-tipo com avaliação', 'Dados processados no EEE; acesso remoto de suporte ou lei estrangeira continuam a avaliar-se', 'Só a da minha infraestrutura'],
            ['Retenção pelo fornecedor', 'Varia; muitas vezes retenção limitada para monitorizar abuso, com zero retention sob acordo', 'Varia por serviço; confirmar nos termos', 'Controlada por mim'],
            ['Contrato', 'Art. 28.º, subcontratantes ulteriores', 'Art. 28.º com o fornecedor de cloud', 'Só com o fornecedor de infraestrutura'],
            ['Qualidade e custo', 'Melhores modelos, preço por token', 'Catálogo por região às vezes mais curto ou atrasado', 'Modelos menores, GPU e operação por minha conta'],
          ],
        },
        {
          type: 'p',
          text: 'O que **não faço** é afirmar de memória a política de retenção de um fornecedor: leio os termos em vigor, o contrato de tratamento de dados e a lista de subcontratantes, e confirmo se a opção de zero data retention existe para a minha conta e para os endpoints que uso (algumas funcionalidades com estado guardam dados por natureza). Os principais fornecedores declaram não treinar com dados da API por omissão — mas isso valida-se no contrato, não num blog.',
        },
        {
          type: 'p',
          text: 'Decisão típica que defendo: região UE com contrato e retenção mínima para dados de clientes, minimização antes do modelo (PII mascarada) para baixar o impacto de qualquer opção, e a interface do sistema desenhada para trocar de fornecedor. Modelo próprio só se o volume, a sensibilidade (saúde, por exemplo) ou um requisito regulatório o justificarem, porque o custo de operar bem um modelo é alto.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Se o produto também servir Moçambique',
          text: 'O RGPD deixa de ser o único quadro. Moçambique tem a Lei n.º 3/2017 (Transacções Electrónicas), com disposições sobre dados pessoais em meio electrónico, e uma proposta de lei geral de protecção de dados submetida à Assembleia da República (estado reportado em Agosto de 2026). Regras sectoriais, como as da banca, podem acrescentar requisitos. Não assumo nada: verifico a lei local com jurídico local antes de decidir onde ficam os dados.',
        },
        { type: 'refs', items: [RGPD, { label: 'OpenAI — controlos de dados da API', url: 'https://platform.openai.com/docs/guides/your-data' }, { label: 'AWS — protecção de dados no Amazon Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html' }] },
      ],
      rubrica: {
        criterios: [
          'Identifica o mecanismo de transferência para fora do EEE (adequação ou cláusulas contratuais-tipo).',
          'Separa retenção pelo fornecedor, uso para treino e subcontratantes como questões distintas a verificar no contrato.',
          'Recusa afirmar termos de fornecedores de memória e diz onde os confirmaria.',
          'Pondera qualidade, custo e esforço de operação, não só privacidade.',
          'Propõe minimização antes do modelo como medida que vale para qualquer opção.',
        ],
        fraco: '«Self-hosted é sempre mais seguro» ou «o fornecedor é conforme ao RGPD», sem mais.',
        solido: 'Compara as três opções em transferência, retenção e contrato, e escolhe com justificação.',
        excelente: 'Acrescenta que região UE não elimina todas as questões de jurisdição, mantém a troca de fornecedor possível, e trata a lei local de outros mercados como verificação com jurídico.',
      },
      seguimento: [
        'O que é que muda se o fornecedor só oferecer zero retention em alguns endpoints?',
        'Como provavas a um auditor que os prompts não ficaram guardados?',
        'Em que volume é que o self-hosted começa a compensar?',
      ],
      sinaisAlarme: [
        'Inventar a política de retenção de um fornecedor.',
        'Achar que região UE resolve todas as questões contratuais.',
        'Ignorar que o mesmo produto noutro país tem outra lei.',
      ],
      modulos: ['escolher-modelo', 'apis-de-modelos', 'guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-governanca-04',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'A abordagem por risco do AI Act',
      enunciado:
        'Explica-me a abordagem por risco do AI Act. Onde é que cai um chatbot de apoio ao cliente? E uma ferramenta que faz triagem de CVs?',
      minutos: 5,
      dica: 'Quatro níveis, mais um regime separado para os modelos.',
      resposta: [
        {
          type: 'p',
          text: 'O AI Act (Regulamento (UE) 2024/1689) regula **sistemas de IA pelo uso**, em quatro níveis: práticas **proibidas**, sistemas de **alto risco** com obrigações pesadas, obrigações de **transparência** para certos sistemas e **risco mínimo** sem obrigações específicas. Os **modelos de IA de uso geral** têm um regime à parte. Um chatbot de apoio ao cliente cai, em regra, na transparência; a triagem de CVs é alto risco (emprego, Anexo III).',
        },
        {
          type: 'table',
          head: ['Nível', 'Exemplos', 'Consequência'],
          rows: [
            ['Proibido (art. 5.º)', 'Pontuação social, manipulação que causa dano significativo, reconhecimento de emoções no trabalho e na escola, recolha não direccionada de imagens faciais', 'Não se pode colocar no mercado'],
            ['Alto risco (art. 6.º, Anexos I e III)', 'Recrutamento e gestão de trabalhadores, avaliação de crédito de pessoas singulares, seguros de vida e saúde, educação, acesso a serviços públicos', 'Gestão de risco, dados, documentação, registos, supervisão humana, robustez, avaliação de conformidade'],
            ['Transparência (art. 50.º)', 'Chatbots, conteúdo sintético, deepfakes', 'Informar que se interage com IA; marcar conteúdo gerado'],
            ['Mínimo', 'Filtros de spam, recomendação de artigos de ajuda', 'Sem obrigações específicas (códigos voluntários)'],
          ],
        },
        {
          type: 'p',
          text: 'Para o chatbot, o art. 50.º, n.º 1, obriga o prestador a garantir que as pessoas sabem que estão a interagir com um sistema de IA, salvo quando é óbvio pelo contexto. Se o chatbot começasse a decidir acesso a crédito, mudava de nível — o que conta é o uso, não a tecnologia. O art. 6.º, n.º 3, prevê que um sistema do Anexo III pode não ser alto risco se fizer uma tarefa processual restrita ou preparatória, mas não quando faz definição de perfis de pessoas.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '«Usamos um LLM, logo somos alto risco»',
          text: 'O nível depende da finalidade do sistema, não de usar um LLM. E o contrário também é erro: um assistente «só de apoio» que filtra candidatos antes de um humano os ver está a fazer triagem no Anexo III.',
        },
        { type: 'refs', items: [AI_ACT, { label: 'AI Act — artigo 6.º (classificação de alto risco)', url: 'https://artificialintelligenceact.eu/article/6/' }, { label: 'AI Act — Anexo III', url: 'https://artificialintelligenceact.eu/annex/3/' }, { label: 'AI Act — artigo 50.º (transparência)', url: 'https://artificialintelligenceact.eu/article/50/' }] },
      ],
      rubrica: {
        criterios: [
          'Nomeia os quatro níveis e o regime separado dos modelos de uso geral.',
          'Diz que a classificação depende da finalidade/uso, não da tecnologia.',
          'Coloca o chatbot na transparência (art. 50.º) e a triagem de CVs no alto risco (Anexo III, emprego).',
          'Dá exemplos correctos de práticas proibidas e de áreas do Anexo III.',
          'Refere a excepção do art. 6.º, n.º 3, e que não se aplica à definição de perfis.',
        ],
        fraco: 'Diz que o AI Act proíbe ou regula «os LLMs» e não sabe onde cai um chatbot.',
        solido: 'Explica os níveis com exemplos e classifica bem os dois casos.',
        excelente: 'Acrescenta a excepção do art. 6.º, n.º 3, o risco de deriva de finalidade (um chatbot que passa a decidir) e a distinção entre obrigações do prestador e do responsável pela implantação.',
      },
      seguimento: [
        'Se integrares um modelo de uso geral no teu produto, és prestador de quê?',
        'O que é que muda se o chatbot de um banco começar a pré-aprovar crédito?',
        'Quais são as coimas máximas, por ordem de grandeza?',
      ],
      sinaisAlarme: [
        'Classificar pelo tipo de modelo em vez do uso.',
        'Inventar categorias ou obrigações.',
        'Não saber que chatbots têm de se identificar como IA.',
      ],
      modulos: ['guardrails-seguranca'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-governanca-05',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Quem cumpre o quê e desde quando no AI Act',
      enunciado:
        'Usas um modelo de uso geral por API para construir um assistente. Que obrigações do AI Act são do fornecedor do modelo, quais são tuas, e desde quando se aplicam?',
      minutos: 6,
      dica: 'Prestador do modelo, prestador do sistema, responsável pela implantação. E o calendário mudou em 2026.',
      resposta: [
        {
          type: 'p',
          text: 'O fornecedor do **modelo de uso geral** cumpre os arts. 53.º e seguintes: documentação técnica, informação para quem integra o modelo, política de direitos de autor e resumo dos dados de treino — e, se o modelo tiver risco sistémico, avaliação, gestão de risco e cibersegurança adicionais. Eu, ao construir e pôr em serviço o assistente com o meu nome, sou **prestador do sistema de IA** e, ao usá-lo com os meus clientes, também **responsável pela implantação**. As obrigações do meu sistema dependem do nível de risco dele, não do modelo.',
        },
        {
          type: 'table',
          head: ['Data', 'O que passa a aplicar-se'],
          rows: [
            ['1/8/2024', 'Entrada em vigor do Regulamento (UE) 2024/1689'],
            ['2/2/2025', 'Disposições gerais, incluindo literacia em IA (art. 4.º), e práticas proibidas (art. 5.º)'],
            ['2/8/2025', 'Obrigações dos modelos de uso geral, governação e sanções; modelos já no mercado antes desta data têm até 2/8/2027'],
            ['2/8/2026', 'Aplicação geral, incluindo a transparência do art. 50.º (chatbots identificam-se como IA)'],
            ['2/12/2027', 'Alto risco do Anexo III (data alterada pelo Digital Omnibus)'],
            ['2/8/2028', 'Alto risco ligado a produtos do Anexo I (data alterada pelo Digital Omnibus)'],
          ],
          caption: 'Artigo 113.º, na redacção dada pelo Regulamento (UE) 2026/1744, em vigor desde 27/7/2026.',
        },
        {
          type: 'p',
          text: 'O **Digital Omnibus on AI** (Regulamento (UE) 2026/1744) adiou as obrigações de alto risco e mexeu noutras disposições, incluindo o art. 4.º. Pelo que li, a obrigação de marcação de conteúdo sintético (art. 50.º, n.º 2) tem um período de transição até 2/12/2026 para sistemas já no mercado — é o tipo de detalhe que confirmo no texto consolidado antes de o pôr num plano.',
        },
        {
          type: 'p',
          text: 'Duas armadilhas de papel: se fizer fine-tuning ao modelo, só passo a ser fornecedor de um modelo de uso geral se a modificação for significativa (as orientações da Comissão de 2025 usam um critério de computação de treino); e se modificar substancialmente um sistema de alto risco de terceiros ou lhe puser o meu nome, passo a ter obrigações de prestador (art. 25.º).',
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que digo numa entrevista',
          text: 'Dou o quadro e as datas que confirmei, digo que o calendário foi alterado em 2026 e que a qualificação do meu papel num caso concreto é feita com o jurídico. Saber que as datas mudaram vale mais do que recitá-las.',
        },
        { type: 'refs', items: [AI_ACT, OMNIBUS, { label: 'AI Act — artigo 113.º (calendário)', url: 'https://artificialintelligenceact.eu/article/113/' }, { label: 'AI Act — artigo 53.º (obrigações dos fornecedores de modelos de uso geral)', url: 'https://artificialintelligenceact.eu/article/53/' }] },
      ],
      rubrica: {
        criterios: [
          'Distingue fornecedor do modelo de uso geral, prestador do sistema e responsável pela implantação.',
          'Diz que as obrigações do sistema dependem do seu nível de risco, não do modelo usado.',
          'Dá as datas principais (2/2/2025, 2/8/2025, 2/8/2026) correctamente.',
          'Sabe que o Digital Omnibus de 2026 adiou o alto risco (Anexo III para 2/12/2027, Anexo I para 2/8/2028).',
          'Identifica quando uma modificação muda o seu papel (fine-tuning significativo, art. 25.º).',
        ],
        fraco: '«O fornecedor do modelo é que tem de cumprir o AI Act», ou datas inventadas.',
        solido: 'Separa papéis, dá as obrigações do fornecedor de modelo e o calendário original.',
        excelente: 'Conhece o calendário alterado pelo omnibus, assinala o que ainda confirmaria no texto consolidado e explica como o fine-tuning e a modificação substancial mudam o papel.',
      },
      seguimento: [
        'Que informação pedes ao fornecedor do modelo para cumprir as tuas obrigações?',
        'O que é que o art. 4.º, literacia em IA, implica para a tua equipa de suporte?',
        'Como acompanhas alterações ao regulamento sem depender de blogs?',
      ],
      sinaisAlarme: [
        'Dizer que o AI Act ainda não se aplica a nada.',
        'Afirmar o calendário de 2024 como se não tivesse mudado.',
        'Assumir que usar um modelo de terceiros transfere todas as obrigações.',
      ],
      modulos: ['guardrails-seguranca', 'escolher-modelo'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-governanca-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'NIST AI RMF e a documentação que deixas para trás',
      enunciado:
        'Conheces o NIST AI Risk Management Framework? Como o usarias numa equipa pequena, e que documentação produzes para um sistema LLM em produção?',
      minutos: 5,
      dica: 'Quatro funções; uma delas atravessa as outras.',
      resposta: [
        {
          type: 'p',
          text: 'O AI RMF 1.0 (NIST AI 100-1, 2023) é um quadro **voluntário** com quatro funções: **Govern** (políticas, papéis, responsabilização — atravessa tudo), **Map** (contexto, uso pretendido, quem é afectado), **Measure** (métricas, avaliação, monitorização) e **Manage** (priorizar e tratar riscos, responder a incidentes). Para IA generativa há o perfil NIST AI 600-1 (2024). Numa equipa pequena uso-o como checklist de processo, não como burocracia.',
        },
        {
          type: 'table',
          head: ['Função', 'Na prática, numa equipa de 5', 'Artefacto'],
          rows: [
            ['Govern', 'Dono do sistema, quem aprova mudanças de modelo, quem é chamado num incidente', 'RACI de uma página, política de mudanças'],
            ['Map', 'Uso pretendido e fora de âmbito, utilizadores, impactos, dependências', 'Ficha do sistema, entrada no inventário'],
            ['Measure', 'Golden set, red team, métricas por segmento, monitorização', 'Relatório de avaliação com limiares'],
            ['Manage', 'Registo de riscos com donos, gates de release, runbook de incidente', 'Registo de riscos, registo de decisões'],
          ],
        },
        {
          type: 'p',
          text: 'Documentação: uma **ficha do sistema** inspirada nos model cards (Mitchell et al., 2019), mas ao nível da aplicação — uso pretendido e usos excluídos, modelos e versões, fontes de dados do RAG, resultados de avaliação por segmento, limitações conhecidas, salvaguardas e contactos. Um **registo de decisões** (ADRs curtos) para o que um auditor vai perguntar: porque RAG e não fine-tuning, porque não há memória de longo prazo, porque este fornecedor. E um **histórico de versões** de prompts, modelos e índices ligado aos resultados de avaliação de cada release.',
        },
        {
          type: 'callout',
          tone: 'tip',
          title: 'Documentação que se mantém sozinha',
          text: 'Gero a parte factual da ficha (versões, métricas, data da última avaliação) a partir do pipeline de CI. A parte escrita à mão é curta e revista a cada release relevante. Documentação que ninguém actualiza é pior do que nenhuma, porque engana.',
        },
        { type: 'refs', items: [NIST_RMF, { label: 'NIST AI 600-1 — Generative AI Profile', url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf' }, { label: 'Mitchell et al. (2019) — Model Cards for Model Reporting', url: 'https://arxiv.org/abs/1810.03993' }] },
      ],
      rubrica: {
        criterios: [
          'Nomeia as quatro funções e diz que Govern é transversal.',
          'Diz que o quadro é voluntário e refere o perfil de IA generativa.',
          'Traduz cada função num artefacto concreto para uma equipa pequena.',
          'Descreve uma ficha do sistema com usos excluídos, versões, avaliação por segmento e limitações.',
          'Mantém documentação ligada ao pipeline para não ficar desactualizada.',
        ],
        fraco: 'Conhece o nome mas não as funções, ou propõe um documento enorme feito uma vez.',
        solido: 'Explica as quatro funções e propõe ficha do sistema e registo de decisões.',
        excelente: 'Mostra como o quadro cabe numa equipa pequena com artefactos mínimos, gerados em parte pela CI, e liga o registo de decisões às perguntas de um auditor.',
      },
      seguimento: [
        'Como é que o NIST AI RMF se relaciona com o AI Act?',
        'Que métricas por segmento poriam na ficha de um assistente de suporte?',
        'Quem deve aprovar uma troca de modelo em produção?',
      ],
      sinaisAlarme: [
        'Confundir o NIST AI RMF com uma certificação obrigatória.',
        'Documentação sem versões nem resultados de avaliação.',
        'Não ter usos excluídos definidos.',
      ],
      modulos: ['avaliacao-fundamentos', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-governanca-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Medir enviesamento num assistente sem recolher dados sensíveis',
      enunciado:
        'Suspeitamos que o assistente oferece compensações diferentes conforme o cliente escreve em português de Portugal, do Brasil ou de Moçambique. Como medes isso, e como lidas com o facto de medir enviesamento parecer exigir os dados que o RGPD te diz para não recolher?',
      minutos: 9,
      dica: 'Não precisas de saber a origem de cada cliente para testar se o sistema muda de comportamento.',
      resposta: [
        {
          type: 'p',
          text: 'Mediria primeiro com **testes contrafactuais**: os mesmos casos, variando só a variante linguística, o nome ou a localidade, e comparando a decisão (compensação oferecida, escalamento, recusa) e a qualidade da resposta. Isto não exige dados sensíveis de ninguém. Só depois, se for preciso medir em produção, ponderava recolher ou inferir atributos — e aí o conflito com a minimização é real e decide-se com o DPO.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Definir o dano', text: 'O que seria injusto aqui? Diferença no valor médio de compensação para o mesmo problema, na taxa de escalamento para humano, na taxa de recusa, ou no tom. Escolho duas ou três métricas antes de ver dados.' },
            { title: 'Conjunto contrafactual', text: 'Pego em 300 casos reais anonimizados e reescrevo cada um nas três variantes, com nomes e localidades plausíveis. São 900 pedidos; cada um corre 3 vezes por causa da variância de amostragem.' },
            { title: 'Comparar', text: 'Para cada par, diferença na decisão; no agregado, diferença de médias com intervalo de confiança por bootstrap. A qualidade avalio com juiz calibrado contra humanos que falam as três variantes — um juiz que só conhece pt-PT pode ser ele próprio enviesado.' },
            { title: 'Corrigir e vigiar', text: 'Se houver diferença, procuro a causa (prompt, exemplos few-shot só numa variante, documentos do RAG) e corrijo. O conjunto contrafactual entra no gate de CI.' },
          ],
        },
        {
          type: 'compare',
          left: {
            title: 'Medir sem atributos reais',
            items: [
              'Contrafactuais sintéticos, sem dados sensíveis',
              'Testa o sistema, não a população',
              'Não apanha efeitos que só existem com clientes reais',
              'Fácil de pôr em CI',
            ],
          },
          right: {
            title: 'Medir em produção com atributos',
            items: [
              'Mostra o efeito real nos clientes',
              'Exige recolher ou inferir atributos, alguns de categoria especial (art. 9.º)',
              'Inferir origem a partir da escrita também é tratamento',
              'Precisa de base legal, salvaguardas e acesso restrito',
            ],
          },
        },
        {
          type: 'p',
          text: 'Para sistemas de alto risco, o AI Act (art. 10.º, n.º 5) admite tratar categorias especiais na medida estritamente necessária para detectar e corrigir enviesamentos, com salvaguardas — e o Digital Omnibus de 2026 mexeu neste regime. Não é o caso deste assistente, e em qualquer caso não sou jurista: trago o desenho e a proposta de salvaguardas e o DPO decide. Uma alternativa intermédia é medir por variante linguística detectada no texto apenas em agregado, sem a guardar por cliente.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Igualdade de resultados não é o único critério',
          text: 'Se clientes de uma região têm mais atrasos reais, compensações médias diferentes podem ser justas. Por isso comparo casos iguais (contrafactual) antes de comparar médias de população.',
        },
        { type: 'refs', items: [{ label: 'NIST SP 1270 — Towards a Standard for Identifying and Managing Bias in AI', url: 'https://www.nist.gov/publications/towards-standard-identifying-and-managing-bias-artificial-intelligence' }, { label: 'Parrish et al. (2022) — BBQ: A Hand-Built Bias Benchmark for Question Answering', url: 'https://arxiv.org/abs/2110.08193' }, { label: 'AI Act — artigo 10.º (dados e governação de dados)', url: 'https://artificialintelligenceact.eu/article/10/' }] },
      ],
      rubrica: {
        criterios: [
          'Propõe testes contrafactuais que variam só o atributo suspeito.',
          'Define o dano em métricas concretas antes de medir.',
          'Trata a variância de amostragem (repetições, intervalos de confiança).',
          'Reconhece o conflito entre medir em produção e minimização, e que inferir atributos também é tratamento.',
          'Distingue diferença de resultados em casos iguais de diferença de médias populacionais.',
          'Põe o conjunto em CI e envolve o DPO na decisão de recolher atributos.',
        ],
        fraco: 'Pergunta ao modelo se é enviesado, ou propõe recolher a nacionalidade de todos os clientes.',
        solido: 'Faz contrafactuais com métricas definidas e intervalos de confiança, e reconhece o conflito com o RGPD.',
        excelente: 'Acrescenta o enviesamento do próprio juiz, a distinção entre casos iguais e populações, a alternativa de medição agregada, e transforma a análise num gate permanente.',
      },
      seguimento: [
        'Que diferença no valor médio de compensação considerarias significativa?',
        'Como validavas que o juiz não é enviesado a favor de pt-PT?',
        'Se a causa forem documentos do RAG escritos só para Portugal, o que fazes?',
      ],
      sinaisAlarme: [
        'Medir com um único exemplo por variante.',
        'Recolher atributos sensíveis «para medir» sem base legal.',
        'Declarar o sistema justo porque o modelo base «foi alinhado».',
      ],
      modulos: ['avaliacao-fundamentos', 'llm-como-juiz'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-governanca-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Supervisão humana que funciona e rastos de auditoria',
      enunciado:
        'Pôr um humano a aprovar as decisões do modelo chega como supervisão humana? E o que é que registas para que, daqui a seis meses, consigas explicar porque é que o sistema fez o que fez?',
      minutos: 5,
      dica: 'O AI Act fala explicitamente de um enviesamento dos humanos.',
      resposta: [
        {
          type: 'p',
          text: 'Não chega. Supervisão humana eficaz exige que o humano **perceba o que está a aprovar, tenha tempo e autoridade para discordar, e não aprove por reflexo** — o art. 14.º do AI Act, para sistemas de alto risco, fala explicitamente do enviesamento de automatização. E para explicar uma decisão meses depois preciso de reconstruir **o estado exacto do sistema** naquele momento: versões, contexto, ferramentas e quem aprovou.',
        },
        {
          type: 'list',
          items: [
            'Mostrar ao revisor a evidência, não só a conclusão: as fontes citadas, os dados da ferramenta e o que o modelo propõe fazer.',
            'Medir a taxa de concordância: se é de 99,5% durante meses, ou a supervisão é inútil ou é teatro; injecto casos de controlo com erro conhecido para ver se são apanhados.',
            'Dar ao revisor o poder de parar o sistema e um canal para reportar padrões, não só casos.',
            'No RGPD, decisões só automatizadas com efeitos significativos dão direito a intervenção humana (art. 22.º): o humano tem de poder mudar a decisão de facto.',
          ],
        },
        {
          type: 'table',
          head: ['Registo', 'Para que serve'],
          rows: [
            ['Versão do modelo, do prompt e do índice', 'Reproduzir o comportamento daquela data'],
            ['Documentos recuperados (ids e versões)', 'Saber em que fonte a resposta se apoiou'],
            ['Chamadas a ferramentas e argumentos', 'Saber o que o sistema fez no mundo'],
            ['Decisão humana, quem e quando', 'Responsabilização'],
            ['Resultado dos guardrails', 'Saber o que foi bloqueado e porquê'],
          ],
        },
        {
          type: 'p',
          text: 'O rasto de auditoria é append-only e separado dos traços de depuração: guardo identificadores e metadados durante o prazo de auditoria, e o texto completo das conversas, com PII, só pelo prazo curto definido. Para alto risco, o AI Act exige registo automático de eventos (art. 12.º) e que quem implanta guarde os registos pelo menos seis meses (art. 26.º, n.º 6), salvo outra lei aplicável.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Auditoria contra minimização',
          text: 'Guardar tudo para sempre resolve a auditoria e viola a limitação da conservação. A solução é guardar referências e versões por muito tempo e conteúdo pessoal por pouco, com o prazo de cada um acordado com o DPO.',
        },
        { type: 'refs', items: [{ label: 'AI Act — artigo 14.º (supervisão humana)', url: 'https://artificialintelligenceact.eu/article/14/' }, { label: 'AI Act — artigo 12.º (manutenção de registos)', url: 'https://artificialintelligenceact.eu/article/12/' }, RGPD] },
      ],
      rubrica: {
        criterios: [
          'Diz que aprovação humana sem contexto, tempo e autoridade não é supervisão eficaz.',
          'Refere o enviesamento de automatização e propõe forma de o medir (concordância, casos de controlo).',
          'Lista o que registar: versões, documentos, ferramentas, decisão humana, guardrails.',
          'Separa rasto de auditoria de traços de depuração com retenções diferentes.',
          'Refere art. 14.º e art. 12.º do AI Act e art. 22.º do RGPD no contexto certo.',
        ],
        fraco: '«Um humano aprova tudo, por isso está coberto», e regista só o texto da conversa.',
        solido: 'Explica supervisão eficaz e regista versões, fontes e acções.',
        excelente: 'Mede a supervisão com casos de controlo, separa retenções de auditoria e de conteúdo, e liga tudo às obrigações legais certas sem as exagerar.',
      },
      seguimento: [
        'Como reconstróis a resposta de há seis meses se o fornecedor já retirou o modelo?',
        'Que taxa de concordância te preocuparia?',
        'Onde guardas o rasto de auditoria para que ninguém o possa alterar?',
      ],
      sinaisAlarme: [
        'Guardar conversas completas para sempre «para auditoria».',
        'Não registar a versão do prompt nem do modelo.',
        'Tratar a aprovação humana como garantia automática.',
      ],
      modulos: ['observabilidade-llmops', 'langgraph-persistencia'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-governanca-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Governança mínima para lançar um assistente num banco',
      enunciado:
        'Um banco em Portugal quer lançar, em três meses, um assistente na app que responde a dúvidas sobre produtos e sobre a conta do cliente. Desenha a governança mínima para o lançamento: o que tem de existir, quem decide, e que gates há.',
      contexto:
        'Banco de retalho com 800 mil clientes na app. O assistente consulta saldo, movimentos e estado de pedidos, e explica produtos com base na documentação oficial. Não faz transferências nem decide crédito. Modelo de fornecedor externo via cloud em região UE. Equipa: 4 engenheiros, 1 product manager; existem DPO, compliance, segurança e gestão de risco de modelos.',
      minutos: 18,
      dica: 'Começa por delimitar o que o assistente não faz — é a decisão de governança mais barata.',
      resposta: [
        {
          type: 'p',
          text: 'A governança mínima começa pelo **âmbito**: o assistente informa e consulta, não aconselha investimentos, não decide crédito e não executa operações. Isso mantém-no fora do alto risco do AI Act e fora do aconselhamento regulado. Depois preciso de cinco coisas: donos claros, avaliação de impacto e de risco, contrato e controlo do fornecedor, avaliação com gates, e operação com monitorização e incidentes.',
        },
        {
          type: 'h',
          text: 'Enquadramento (com o jurídico e o DPO)',
        },
        {
          type: 'table',
          head: ['Quadro', 'O que implica aqui', 'Dono'],
          rows: [
            ['AI Act', 'Transparência do art. 50.º (identificar-se como IA); literacia da equipa (art. 4.º). Avaliação de crédito seria Anexo III — fica fora de âmbito por desenho', 'Compliance'],
            ['RGPD', 'Base legal por finalidade, AIPD (dados financeiros, grande escala, tecnologia nova), contrato do art. 28.º, retenção', 'DPO'],
            ['DORA (Reg. (UE) 2022/2554)', 'Fornecedor de modelo e cloud são prestadores de serviços de TIC: registo de informação, requisitos contratuais, gestão de incidentes de TIC', 'Risco de TIC'],
            ['Regulação bancária e de conduta', 'Comunicação com clientes, reclamações, subcontratação; verificar se é preciso informar o supervisor', 'Compliance'],
          ],
        },
        {
          type: 'p',
          text: 'Não sou jurista e não tenho de decidir estes enquadramentos; tenho de os pôr na mesa cedo, porque cada um gera requisitos técnicos — região de dados, retenção, registos, plano de saída do fornecedor.',
        },
        {
          type: 'h',
          text: 'Gates até ao lançamento',
        },
        {
          type: 'steps',
          items: [
            { title: 'Semana 1–2: âmbito e donos', text: 'Ficha do sistema com usos pretendidos e excluídos; RACI (dono de produto, DPO, compliance, segurança, gestão de risco de modelos); entrada no inventário de sistemas de IA do banco; registo de riscos com dono por risco.' },
            { title: 'Semana 2–6: avaliações de impacto e fornecedor', text: 'AIPD com o DPO; due diligence do fornecedor (região, retenção, subcontratantes, não uso para treino, plano de saída); contrato com cláusulas de DORA e do art. 28.º.' },
            { title: 'Semana 4–10: avaliação técnica', text: 'Golden set de 400 perguntas por intenção, com respostas validadas por quem conhece os produtos; métricas de exactidão sobre dados da conta (tolerância zero para saldos errados), faithfulness às fontes, recusa nos temas fora de âmbito; red team com foco em dados de outros clientes e em aconselhamento.' },
            { title: 'Semana 10–12: decisão de lançamento', text: 'Comité com DPO, compliance, segurança e risco aprova com base no relatório de avaliação contra limiares acordados antes. Lançamento a 2% dos clientes, depois 10%, com critérios de paragem escritos.' },
          ],
        },
        {
          type: 'h',
          text: 'Operação',
        },
        {
          type: 'list',
          items: [
            'Transparência: o assistente identifica-se como IA, mostra as fontes e tem passagem para humano sempre visível.',
            'Monitorização semanal: amostra revista por humanos, taxa de passagem para humano, reclamações ligadas ao assistente, guardrails disparados.',
            'Incidentes: runbook que liga ao processo de violação de dados (72 horas, art. 33.º do RGPD) e ao de incidentes de TIC do DORA.',
            'Gestão de mudanças: troca de modelo, prompt relevante ou nova ferramenta passa pelos mesmos gates de avaliação; mudanças de âmbito reabrem a AIPD e a classificação no AI Act.',
            'Registo de decisões: porque este fornecedor, porque não há memória de longo prazo, porque crédito ficou fora.',
          ],
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Governança que chega depois',
          text: 'O erro clássico é construir durante dois meses e pedir aprovação ao DPO e ao compliance na última semana. Cada requisito descoberto tarde — região de dados, retenção, registos — custa semanas. Por isso os donos entram na semana 1.',
        },
        { type: 'refs', items: [AI_ACT, RGPD, { label: 'EUR-Lex — Regulamento (UE) 2022/2554 (DORA)', url: 'https://eur-lex.europa.eu/eli/reg/2022/2554/oj' }, NIST_RMF] },
      ],
      rubrica: {
        criterios: [
          'Delimita o âmbito (sem crédito, sem aconselhamento, sem operações) como decisão de governança.',
          'Classifica correctamente no AI Act (transparência, não alto risco) e explica porquê.',
          'Inclui AIPD, contrato com o fornecedor e requisitos de terceiros de TIC (DORA).',
          'Define donos (RACI) e um comité de decisão com limiares acordados antes da avaliação.',
          'Propõe lançamento gradual com critérios de paragem e monitorização.',
          'Liga incidentes ao processo de violação de dados de 72 horas.',
        ],
        fraco: 'Lista leis sem as traduzir em requisitos, ou trata governança como aprovação no fim.',
        solido: 'Âmbito delimitado, AIPD, contrato, avaliação com gates e lançamento gradual.',
        excelente: 'Acrescenta DORA e plano de saída do fornecedor, limiares definidos antes de ver resultados, gestão de mudanças que reabre a classificação, e põe os donos na semana 1.',
      },
      seguimento: [
        'O que fazes se a avaliação falhar o limiar de exactidão na semana 11?',
        'Como garantes que o assistente não dá aconselhamento de investimento?',
        'Que plano de saída tens se o fornecedor de modelo mudar os termos?',
      ],
      sinaisAlarme: [
        'Incluir decisão de crédito «só como sugestão» sem perceber que muda a classificação.',
        'Deixar DPO e compliance para a última semana.',
        'Não ter critérios de paragem do lançamento.',
      ],
      modulos: ['guardrails-seguranca', 'avaliacao-fundamentos', 'ci-cd'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-governanca-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'Pedido de apagamento: onde estão os dados do cliente',
      enunciado:
        'Uma cliente pede o apagamento de todos os seus dados. O DPO pergunta-te: onde é que eles estão, no sistema de IA? Tens um mês. Como encontras tudo e o que fazes em cada sítio?',
      contexto:
        'Farmácia online em Portugal com assistente LLM há 14 meses. Conversas em PostgreSQL; traços em Langfuse; memória de longo prazo com resumos por cliente num índice vectorial; cache semântica; golden set criado a partir de conversas reais; um modelo pequeno afinado há 6 meses com 20 mil conversas; backups diários com 35 dias; fornecedor de modelo por API sem acordo de zero retention.',
      minutos: 12,
      dica: 'Os dados copiam-se. Procura todas as cópias derivadas, não só a tabela de conversas.',
      resposta: [
        {
          type: 'p',
          text: 'Os dados dela estão em pelo menos oito sítios, e só um é óbvio. Começo pelo **mapa de dados** do sistema (o registo de actividades do art. 30.º, se estiver actualizado); se não existir, procuro pelos identificadores dela em cada armazenamento. Como é uma farmácia, parte disto são dados de saúde (art. 9.º), o que aumenta a urgência e o cuidado. O prazo é de um mês, prorrogável em casos complexos (art. 12.º, n.º 3), e o DPO decide se há excepções do art. 17.º, n.º 3 — por exemplo, obrigações legais de conservação de registos de vendas.',
        },
        {
          type: 'table',
          head: ['Onde', 'Como encontro', 'O que faço'],
          rows: [
            ['Conversas (PostgreSQL)', 'Por id de cliente', 'Apago, ou separo o que tiver obrigação legal de conservação'],
            ['Traços (Langfuse)', 'Por id de utilizador nos metadados; se só houver texto, pesquisa por telefone e email', 'Apago pela API; se a retenção for curta, documento a data de expiração'],
            ['Memória vectorial', 'Filtro por `cliente_id` nos metadados', 'Apago os pontos e compacto o índice (no pgvector, DELETE e VACUUM) para não ficarem só marcados'],
            ['Cache semântica', 'Entradas criadas pelas conversas dela', 'Apago; se não houver id, invalido as entradas do período'],
            ['Golden set', 'Pesquisa no repositório pelos seus dados', 'Removo ou substituo por versão sintética; o histórico do git também tem o dado'],
            ['Modelo afinado', 'Ver se as conversas dela estão no conjunto de treino', 'Retirar do conjunto; re-treinar ou fundamentar a decisão com o DPO'],
            ['Backups (35 dias)', 'Não se pesquisa', 'Ficam fora de uso e expiram; documento o prazo; no restauro, reaplico os apagamentos'],
            ['Fornecedor do modelo', 'Não tenho acesso', 'Retenção do fornecedor segundo o contrato; documento e confirmo o prazo'],
          ],
        },
        {
          type: 'p',
          text: 'O caso difícil é o **modelo afinado**. Não há forma madura de remover de forma verificável um exemplo dos pesos — o machine unlearning ainda é investigação. As opções reais são re-treinar sem os dados dela (caro, mas definitivo) ou, com o DPO, avaliar o risco de o modelo reproduzir os dados (testes de extracção dirigidos) e decidir. A lição é não ter afinado com conversas não anonimizadas.',
        },
        {
          type: 'p',
          text: 'O segundo problema típico é o **git**: um golden set com dados reais commitado deixa o dado no histórico. Reescrever o histórico de um repositório partilhado é disruptivo; por isso conjuntos de avaliação com dados pessoais não devem estar no git, ou só depois de anonimizados.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Para o próximo pedido ser rotina',
          text: 'Cada registo, em cada armazenamento, leva o id pseudonimizado do titular. Um job de apagamento percorre todos os armazenamentos registados e produz uma prova (o quê, onde, quando) sem guardar os dados apagados. Prazos de retenção curtos onde possível, para que a maior parte se apague sozinha. Afinação só com dados anonimizados. Na revisão de cada novo armazenamento, a pergunta é: como apago daqui um titular?',
        },
        {
          type: 'p',
          text: 'Respondo ao DPO com a lista, o estado de cada um e as excepções a avaliar; ele responde à titular. Não sou jurista: a decisão sobre as excepções e sobre o modelo afinado é dele com o jurídico, mas a informação técnica tem de ser exacta.',
        },
        { type: 'refs', items: [RGPD, EDPB_28, { label: 'pgvector — apagamento e manutenção de índices', url: 'https://github.com/pgvector/pgvector' }, { label: 'Langfuse — documentação', url: 'https://langfuse.com/docs' }] },
      ],
      rubrica: {
        criterios: [
          'Encontra cópias derivadas: traços, memória vectorial, cache, golden set, modelo afinado, backups, fornecedor.',
          'Começa pelo mapa de dados (registo de actividades) e pelos identificadores do titular.',
          'Sabe que apagar num índice vectorial pode exigir compactação, não só marcar.',
          'Reconhece que remover dados de um modelo afinado não é trivial e propõe opções reais.',
          'Refere o prazo de um mês e as excepções do art. 17.º, n.º 3, decididas pelo DPO.',
          'Propõe mudanças para tornar o apagamento rotina (id do titular em todo o lado, retenção curta, job com prova).',
        ],
        fraco: 'Apaga a linha na tabela de conversas e responde que está feito.',
        solido: 'Encontra logs, traços, vectores e backups, e trata cada um com a acção certa.',
        excelente: 'Inclui golden set no git, modelo afinado e fornecedor; distingue dados de saúde; propõe o desenho que torna o pedido seguinte automático e com prova.',
      },
      seguimento: [
        'Como provas ao DPO que apagaste, sem guardar o que apagaste?',
        'O que fazes se um backup for restaurado depois do apagamento?',
        'Afinavas outra vez um modelo com conversas de clientes? Em que condições?',
      ],
      sinaisAlarme: [
        'Esquecer os traços e os conjuntos de avaliação.',
        'Dizer que é possível «apagar do modelo» sem re-treinar.',
        'Decidir sozinho as excepções ao apagamento.',
      ],
      modulos: ['memoria', 'observabilidade-llmops', 'bases-vectoriais'],
    },
  ],
};
