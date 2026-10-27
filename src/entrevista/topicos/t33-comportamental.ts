import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'comportamental',
  numero: 33,
  bloco: 'rondas',
  titulo: 'Comportamental, produto e senioridade',
  resumo:
    'A conversa que decide o nível: sistemas que puseste em produção, projectos que falharam, desacordos com produto, incidentes, mentoria e decisões de build vs buy. As respostas-modelo seguem STAR com números — são histórias de exemplo para trocares pelas tuas.',
  icon: '🧭',
  modulos: ['entrevista'],
  essencial: [
    'STAR: Situação (contexto em 2 frases), Tarefa (o teu papel e o objectivo), Acção (o que tu fizeste, na 1.ª pessoa), Resultado (números e o que aprendeste).',
    'Gasta ~60% do tempo na Acção e no Resultado. A Situação é cenário, não a história.',
    'Diz «eu» quando foste tu e «nós» quando foi a equipa. O entrevistador está a medir o teu contributo, não o da equipa.',
    'Cada história precisa de pelo menos um número de negócio (custo, tempo, conversas, receita) e um número técnico (métrica de eval, latência, taxa de erro).',
    'Prepara 6 a 8 histórias que cubram: entrega, falha, conflito, influência sem autoridade, incerteza, incidente, mentoria, decisão técnica difícil.',
    'Sinais de sénior: quantificas, nomeias trade-offs, dizes o que farias diferente. Sinais de staff: mudaste a forma como outros trabalham, para além do teu código.',
    'Falha bem contada: causa que dependia de ti, o custo real, o que mudaste no processo — não «trabalho demasiado».',
    'Em desacordos: discordar com dados, propor uma alternativa com menos risco, e saber «discordar e comprometer-se» quando a decisão não é tua.',
    'Nunca inventes números numa entrevista: arredonda o que mediste e diz «na ordem de» quando não tens o valor exacto.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-comportamental-01',
      tipo: 'comportamental',
      nivel: 'pleno',
      titulo: 'Conta-me um sistema com LLM que puseste em produção',
      enunciado:
        'Fala-me de um sistema com LLM que tenhas posto em produção. O que fazia, qual foi o teu papel e como sabias que estava a funcionar?',
      minutos: 6,
      dica: 'Escolhe um sistema com utilizadores reais e uma métrica que mediste antes e depois.',
      resposta: [
        {
          type: 'p',
          text: 'A resposta forte escolhe **um** sistema, diz o problema de negócio em uma frase, o teu papel concreto, duas ou três decisões técnicas com o porquê, e fecha com números medidos — de produto e de qualidade. História-modelo, para trocares pela tua:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Numa plataforma de entregas em Maputo, o suporte tratava ~1 150 conversas por dia com 14 pessoas, e o tempo de primeira resposta no pico de sexta passava os 20 minutos.' },
            { title: 'Tarefa', text: 'Eu era o engenheiro responsável pelo serviço do assistente: arquitectura, avaliação e operação. O objectivo acordado com operações era resolver sem humano pelo menos metade das conversas de estado do pedido e políticas, sem dar respostas erradas sobre dinheiro.' },
            { title: 'Acção', text: 'Comecei pelo conjunto de avaliação: 240 perguntas reais anotadas com o documento certo, antes de escrever o primeiro prompt. Escolhi RAG com pesquisa híbrida porque as políticas mudavam todas as semanas e tinham de ser citadas. Os valores de reembolso vinham de uma ferramenta determinística, nunca do texto do modelo. Lancei a 10% do tráfego com escalamento fácil para humano e um painel de custo e qualidade por intenção.' },
            { title: 'Resultado', text: 'Em oito semanas, cerca de 68% das conversas passaram a resolver-se sem humano; o tempo de primeira resposta no pico desceu para segundos; o custo de modelo ficou abaixo de 1 MZN por conversa. O recall@3 no dourado passou de 0,83 com só lexical para 0,95 com híbrido e re-ranking. O que faria diferente: instrumentar o feedback do cliente desde o primeiro dia — perdemos duas semanas a reconstruí-lo a partir de logs.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Se sabes distinguir o teu contributo do da equipa; se pensaste em avaliação antes de construir; se mediste impacto de negócio e não só «funciona»; e se sabes dizer uma coisa que farias diferente. Espera perguntas de aprofundamento sobre qualquer número que digas.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Os números acima são de um cenário de exemplo. Usa os teus, arredondados e verdadeiros. Se o teu sistema era interno e pequeno, conta-o na mesma: um sistema modesto com avaliação séria vale mais do que um grande sem números.',
        },
      ],
      rubrica: {
        criterios: [
          'Descreve o problema de negócio e o papel pessoal em menos de um minuto.',
          'Nomeia pelo menos duas decisões técnicas com a razão de cada uma.',
          'Menciona como a qualidade foi avaliada antes e depois do lançamento.',
          'Dá pelo menos um número de negócio e um número de qualidade.',
          'Diz o que faria diferente.',
        ],
        fraco: 'Descreve a arquitectura toda sem dizer o que fez, porque o fez nem que resultado teve.',
        solido: 'Conta uma história STAR com papel claro, decisões justificadas e números de impacto.',
        excelente: 'Acrescenta como o lançamento foi controlado (percentagem de tráfego, escalamento), liga a qualidade a métricas de negócio e mostra autocrítica concreta.',
      },
      seguimento: [
        'Como construíste o conjunto de avaliação e quem o anotou?',
        'Qual foi a decisão técnica de que mais te arrependes?',
        'Como sabias que os 68% eram resoluções reais e não clientes que desistiram?',
      ],
      sinaisAlarme: [
        'Falar só em «nós» sem conseguir dizer o que fez pessoalmente.',
        'Não ter nenhum número.',
        'Contar uma demo interna como se fosse um sistema em produção.',
      ],
      modulos: ['entrevista', 'balcao-ponta-a-ponta'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-comportamental-02',
      tipo: 'comportamental',
      nivel: 'senior',
      titulo: 'Um projecto de IA que falhou e o que aprendeste',
      enunciado:
        'Conta-me um projecto de IA que não correu bem. O que falhou, qual foi a tua parte nisso e o que fazes hoje de forma diferente?',
      minutos: 6,
      dica: 'Escolhe uma falha com uma causa que dependia de ti, e um custo real.',
      resposta: [
        {
          type: 'p',
          text: 'Uma boa resposta assume uma parte da causa, quantifica o custo, e mostra uma mudança de processo que ainda usas. O padrão clássico em IA: **o protótipo brilhava num conjunto que não representava produção**. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Num banco móvel, a abertura de conta exigia que uma equipa de back-office lesse fotografias de documentos de identificação e preenchesse 12 campos. Eram ~2 500 pedidos por dia e uma fila de 3 dias.' },
            { title: 'Tarefa', text: 'Liderei a parte técnica de um piloto de extracção com um modelo multimodal, com objectivo de 90% de campos correctos e revisão humana só nos restantes.' },
            { title: 'Acção', text: 'Construí o conjunto de avaliação com 300 documentos que a equipa de compliance me deu — e só depois percebi que eram os digitalizados em balcão, bem iluminados. Atingimos 94% de campos correctos. Em produção sombra, com fotografias tiradas por telemóvel, a taxa caiu para 71%, sobretudo por reflexos e documentos cortados.' },
            { title: 'Resultado', text: 'Parámos o lançamento ao fim de seis semanas, antes de qualquer cliente ser afectado. Recuperámos parte do valor: a validação de qualidade da imagem no momento da captura (pedir nova fotografia) baixou as rejeições de back-office em cerca de 30%, sem modelo generativo nenhum. O que mudou na forma como trabalho: o conjunto de avaliação sai sempre de uma amostra aleatória de produção, e acordo critérios de paragem antes de começar.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Responsabilidade sem auto-flagelação, capacidade de parar um projecto com base em dados, e aprendizagem transferível. Ganha pontos dizer quando parou e quanto isso poupou; perde pontos culpar o modelo, os dados ou outra equipa.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Qualquer falha real serve, mesmo pequena: um prompt que regrediu em produção, um agente que nunca passou da demo. O que importa é a tua parte na causa e o que mudou depois.',
        },
      ],
      rubrica: {
        criterios: [
          'Assume uma causa que dependia do candidato.',
          'Quantifica a diferença entre o esperado e o real.',
          'Mostra que a decisão de parar ou mudar foi tomada com dados e a tempo.',
          'Descreve uma mudança de processo concreta que ainda aplica.',
        ],
        fraco: 'Escolhe uma «falha» que é um elogio disfarçado ou culpa factores externos.',
        solido: 'Conta uma falha real com causa, custo e lição concreta.',
        excelente: 'Mostra que recuperou valor do projecto falhado, que a lição mudou o processo da equipa e que hoje define critérios de paragem à partida.',
      },
      seguimento: [
        'Quem decidiu parar e como convenceste os outros?',
        'Que sinal terias visto mais cedo se olhasses para produção desde o início?',
        'Como reagiu o patrocinador do projecto?',
      ],
      sinaisAlarme: [
        'Dizer que nunca teve um projecto que falhou.',
        'Culpar o modelo ou outra equipa sem reconhecer nenhuma parte.',
        'Lição genérica do tipo «aprendi a comunicar melhor».',
      ],
      modulos: ['entrevista', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-comportamental-03',
      tipo: 'comportamental',
      nivel: 'senior',
      titulo: 'Produto quer lançar sem avaliação: como lidaste com isso',
      enunciado:
        'Conta-me uma vez em que discordaste do produto sobre lançar uma funcionalidade de IA. Eles queriam lançar já, tu achavas que não estava avaliada. O que fizeste?',
      minutos: 6,
      dica: 'O objectivo não é ganhar a discussão; é baixar o risco sem bloquear o negócio.',
      resposta: [
        {
          type: 'p',
          text: 'A resposta forte mostra que **transformaste uma opinião num número** e propuseste uma alternativa com menos risco que mantinha o prazo do negócio — sem bloquear, e sem ceder em silêncio. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Numa seguradora, o produto queria lançar um assistente de perguntas sobre apólices a todos os clientes antes da campanha de renovações, dali a dez dias. Havia uma demo convincente e nenhum conjunto de avaliação.' },
            { title: 'Tarefa', text: 'Eu era o engenheiro responsável. Tinha de dizer se era seguro lançar, e a opinião «não está avaliado» não ia mudar a data.' },
            { title: 'Acção', text: 'Pedi três dias. Com uma colega da área de sinistros, anotámos 150 perguntas reais tiradas dos e-mails do apoio. Corri o assistente sobre elas: 9% das respostas afirmavam coberturas que a apólice não tinha — o tipo de erro que gera reclamações formais. Levei ao PM e à directora de produto não o «não», mas três opções: lançar a todos e aceitar esse risco; lançar a 10% dos clientes com recusa obrigatória em perguntas de cobertura e encaminhamento para humano; ou adiar.' },
            { title: 'Resultado', text: 'Escolheram a segunda. Lançámos dentro do prazo para 10%; em duas semanas corrigimos a recuperação de cláusulas de exclusão e a taxa de afirmações erradas de cobertura caiu para menos de 1% no mesmo conjunto. Passámos a 100% três semanas depois. O conjunto de 150 perguntas tornou-se o gate de CI de todas as mudanças.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Se discordas com dados e não com autoridade técnica; se ofereces opções com riscos explícitos em vez de um veto; se respeitas que a decisão final pode não ser tua («discordar e comprometer-se»); e se a história termina num processo melhor, não numa vitória pessoal.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Se perdeste a discussão e o lançamento correu mal, essa história também é boa — conta como mitigaste e o que mudou depois. Evita histórias em que o produto aparece como vilão.',
        },
      ],
      rubrica: {
        criterios: [
          'Produz evidência rápida (avaliação mínima) em vez de argumentar por opinião.',
          'Apresenta opções com riscos e custos explícitos, incluindo uma que cumpre o prazo.',
          'Reconhece de quem é a decisão e como se compromete se perder.',
          'O resultado inclui uma mudança permanente (gate, processo).',
        ],
        fraco: 'Conta que bloqueou o lançamento até estar «perfeito», ou que cedeu sem dizer nada.',
        solido: 'Faz uma avaliação rápida, mostra o risco com números e negoceia um lançamento controlado.',
        excelente: 'Enquadra o risco em termos de negócio (reclamações, regulação), mantém a relação com o produto e transforma o episódio em processo que a organização adopta.',
      },
      seguimento: [
        'E se a directora tivesse escolhido lançar a todos?',
        'Como escolheste os 150 casos em três dias?',
        'Como está hoje a tua relação com esse PM?',
      ],
      sinaisAlarme: [
        'Retratar o produto como incompetente.',
        'Tratar a qualidade como responsabilidade exclusiva da engenharia.',
        'Não conseguir dizer como agiria se perdesse a decisão.',
      ],
      modulos: ['entrevista', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-comportamental-04',
      tipo: 'comportamental',
      nivel: 'staff',
      titulo: 'Convenceste stakeholders de que um LLM não era a solução certa',
      enunciado:
        'Fala-me de uma vez em que te pediram uma solução com IA generativa e tu achavas que não era a ferramenta certa. Como lidaste com isso?',
      minutos: 7,
      dica: 'Não é sobre ter razão; é sobre a decisão certa para o negócio e como a tornaste visível.',
      resposta: [
        {
          type: 'p',
          text: 'Um sinal de staff é **saber quando não usar a técnica** e conseguir que a organização o aceite sem perder entusiasmo. A resposta mostra que comparaste alternativas com o mesmo critério, em termos de negócio, e que deixaste o LLM onde ele ganhava. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Numa empresa de logística, a direcção financeira queria «um GPT» para ler ~40 000 faturas de fornecedores por mês e lançar os dados no ERP. Já havia orçamento aprovado e uma apresentação de um fornecedor.' },
            { title: 'Tarefa', text: 'Pediram-me a arquitectura. O meu objectivo era o resultado — faturas lançadas correctamente e mais depressa — não uma tecnologia específica.' },
            { title: 'Acção', text: 'Analisei uma amostra de 500 faturas: 80% vinham de 30 fornecedores recorrentes com layout fixo, e muitas já traziam dados estruturados em PDF com texto. Construí em duas semanas uma comparação no mesmo conjunto: extracção por templates e regras para os recorrentes, e um LLM para os restantes. Apresentei uma tabela com exactidão, custo por fatura, latência e auditabilidade das duas abordagens, e uma terceira híbrida.' },
            { title: 'Resultado', text: 'A híbrida ganhou: regras nos 80% recorrentes com exactidão acima de 99%, LLM nos 20% de cauda com revisão humana quando a confiança era baixa. O custo de modelo ficou a uma fracção do que teria sido com tudo no LLM, e a auditoria aceitou porque os casos recorrentes eram deterministas. A directora financeira apresentou o projecto como «IA aplicada onde faz diferença» — e isso importava para ela.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Pensamento de primeiros princípios (o problema, não a moda), capacidade de influenciar sem autoridade, empatia com a motivação do stakeholder (precisava de uma história de inovação), e humildade técnica — não «LLMs são maus», mas «aqui o LLM ganha nos 20%».',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Exemplos frequentes: classificação com etiquetas fixas onde um modelo clássico chega, pesquisa onde BM25 com filtros resolve, um formulário bem desenhado em vez de um chatbot. Escolhe um em que tenhas medido as alternativas.',
        },
      ],
      rubrica: {
        criterios: [
          'Analisa os dados reais antes de propor a solução.',
          'Compara alternativas no mesmo conjunto com critérios de negócio (custo, exactidão, auditabilidade).',
          'Não rejeita o LLM por princípio; encontra onde ele ganha.',
          'Considera a motivação do stakeholder e ajuda-o a ganhar com a decisão.',
        ],
        fraco: '«Disse-lhes que não precisavam de IA» sem dados nem alternativa, ou fez o que pediram sem questionar.',
        solido: 'Mede alternativas e convence com uma comparação objectiva.',
        excelente: 'Desenha uma solução híbrida que maximiza o valor, gere a narrativa para o stakeholder sair a ganhar e deixa um critério reutilizável para decisões futuras.',
      },
      seguimento: [
        'O que farias se, depois da tua análise, mantivessem a decisão de usar só o LLM?',
        'Como decidiste o limiar de confiança para a revisão humana?',
        'Quanto tempo gastaste na comparação e como justificaste esse tempo?',
      ],
      sinaisAlarme: [
        'Dogmatismo em qualquer direcção: «LLM para tudo» ou «LLMs são hype».',
        'Ignorar o orçamento ou a pressão política do stakeholder.',
        'Não ter medido nada antes de decidir.',
      ],
      modulos: ['entrevista', 'engenharia-ia'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-comportamental-05',
      tipo: 'comportamental',
      nivel: 'senior',
      titulo: 'Estimar e entregar com muita incerteza: protótipo vs produção',
      enunciado:
        'Pediram-te uma estimativa para pôr um assistente com LLM em produção, sem saberes se a qualidade era atingível. Como estimaste e como correu?',
      minutos: 6,
      dica: 'Uma estimativa com incerteza é um plano com pontos de decisão, não um número.',
      resposta: [
        {
          type: 'p',
          text: 'A boa resposta mostra que **separaste a incerteza técnica da incerteza de execução**: um spike curto com critério de saída responde «é possível?», e só depois se estima «quanto custa fazer bem». E que comunicaste intervalos, não promessas. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Num operador de telecomunicações, a direcção pediu uma data para um assistente de faturação no portal de cliente. A demo de um hackathon tinha impressionado, e a pergunta era «isto fica pronto em um mês?».' },
            { title: 'Tarefa', text: 'Eu tinha de dar uma estimativa defensável, sabendo que a demo não tinha avaliação nem acesso a dados reais de faturação.' },
            { title: 'Acção', text: 'Propus duas fases. Fase 1, duas semanas, fixa: conjunto de 200 perguntas reais, protótipo com as ferramentas de faturação reais em modo leitura, e um critério de saída acordado — 85% de respostas correctas e zero valores inventados. Fase 2 estimada só depois, com um intervalo. Expliquei que a distância entre demo e produção está em autenticação, ferramentas, avaliação, observabilidade e guardas — tipicamente mais trabalho do que o próprio prompt.' },
            { title: 'Resultado', text: 'A fase 1 chegou a 81%; o que faltava era um caso de faturas com acertos que exigia uma ferramenta nova. Estimei a fase 2 em 8 a 12 semanas, com a ferramenta nova como maior risco. Entregámos em 11. Como a direcção sabia desde o início que a fase 1 podia dizer «não», ninguém ficou surpreendido com o intervalo.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Se sabes que um protótipo de LLM a 80% está longe de produção; se usas time-boxing e critérios de saída para gerir incerteza; se comunicas intervalos e riscos nomeados; e se cumpriste o que disseste — ou explicas bem porque não.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Se falhaste a estimativa, conta isso: porque falhou, quando avisaste e o que fazes hoje. Uma estimativa falhada mas comunicada cedo é uma história de senioridade.',
        },
      ],
      rubrica: {
        criterios: [
          'Separa a pergunta de viabilidade (spike com critério de saída) da estimativa de entrega.',
          'Nomeia o que separa demo de produção (avaliação, ferramentas, observabilidade, guardas).',
          'Comunica um intervalo com o principal risco identificado.',
          'Compara o estimado com o real e explica a diferença.',
        ],
        fraco: 'Deu uma data com base na demo, ou recusou-se a estimar.',
        solido: 'Usou um spike com critério de saída e deu um intervalo com riscos.',
        excelente: 'Fez da incerteza um instrumento de gestão (pontos de decisão acordados), calibrou a estimativa com dados do spike e geriu expectativas da direcção desde o início.',
      },
      seguimento: [
        'E se a fase 1 tivesse ficado em 60%?',
        'Como dividias o trabalho da fase 2 para mostrar progresso?',
        'Que parte da estimativa falhou mais e porquê?',
      ],
      sinaisAlarme: [
        'Prometer uma data a partir de uma demo.',
        'Não distinguir protótipo de sistema em produção.',
        'Tratar a qualidade do modelo como algo que «se afina no fim».',
      ],
      modulos: ['entrevista', 'avaliacao-fundamentos'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-comportamental-06',
      tipo: 'comportamental',
      nivel: 'senior',
      titulo: 'Um incidente em que foste dono do problema',
      enunciado:
        'Conta-me um incidente de produção em que tu foste o dono do problema — idealmente um causado por uma mudança tua. Como o geriste?',
      minutos: 7,
      dica: 'Linha temporal, impacto quantificado, comunicação, e o que mudou no sistema para não se repetir.',
      resposta: [
        {
          type: 'p',
          text: 'A resposta forte é honesta sobre a causa, mostra uma sequência clara — **conter, medir o impacto, corrigir, comunicar, prevenir** — e termina numa mudança no sistema, não numa promessa de ter mais cuidado. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'No assistente de apoio de uma plataforma de entregas, fiz uma refactorização da consulta de recuperação para juntar pesquisa lexical e vectorial. Ao reescrever a SQL, o filtro que excluía políticas já substituídas ficou só num dos ramos.' },
            { title: 'Tarefa', text: 'Dois dias depois, a equipa de apoio reparou que clientes citavam um valor de reembolso antigo. A mudança era minha e assumi a resolução.' },
            { title: 'Acção', text: 'Reverti o deploy em 20 minutos e confirmei nos traços que as respostas novas citavam a versão em vigor. Depois medi o impacto: 180 conversas nos dois dias tinham recuperado a política antiga, 37 com um valor de reembolso errado. Com a equipa de apoio, contactámos esses 37 clientes e honrámos o valor maior. Escrevi o post-mortem sem culpados: a causa técnica era o filtro, mas a causa de processo era não haver nenhum caso no conjunto de avaliação com documentos substituídos.' },
            { title: 'Resultado', text: 'Três mudanças: os filtros de vigência e visibilidade passaram para uma vista na base de dados, que nenhuma consulta pode esquecer; o conjunto dourado ganhou 25 casos com versões antigas de políticas; e o CI passou a falhar se alguma resposta citar um documento substituído. Nos seis meses seguintes não houve recorrência.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Responsabilidade sem drama, velocidade de contenção, capacidade de quantificar o impacto em clientes, comunicação com áreas não técnicas e prevenção estrutural. Uma cultura de post-mortem sem culpados é um sinal positivo; uma história em que outro errou e tu salvaste o dia é um sinal negativo.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Pode ser um incidente fora de IA — uma migração, uma fila entupida. Liga-o no fim ao que farias num sistema com LLM (traços, avaliação no CI).',
        },
        {
          type: 'refs',
          items: [
            { label: 'Google SRE Book — Postmortem Culture: Learning from Failure', url: 'https://sre.google/sre-book/postmortem-culture/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Assume a causa quando foi sua, sem minimizar.',
          'Contém antes de investigar e diz quanto tempo demorou.',
          'Quantifica o impacto em clientes e descreve a remediação junto deles.',
          'Separa causa técnica de causa de processo no post-mortem.',
          'Descreve uma prevenção estrutural (não «mais cuidado»).',
        ],
        fraco: 'Conta um incidente em que a culpa foi de outro, ou fica pela correcção técnica.',
        solido: 'Contém, corrige, quantifica e escreve post-mortem com acções.',
        excelente: 'Torna o erro impossível por desenho, fecha a lacuna na avaliação e mostra que tratou os clientes afectados como parte da resolução.',
      },
      seguimento: [
        'Como soubeste que eram 37 e não mais?',
        'Quem decidiu honrar o valor maior?',
        'O que mudarias no processo de revisão de código depois disto?',
      ],
      sinaisAlarme: [
        'Escolher um incidente em que não teve responsabilidade nenhuma.',
        'Prevenção do tipo «passei a testar melhor».',
        'Não saber quantos clientes foram afectados.',
      ],
      modulos: ['entrevista', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-comportamental-07',
      tipo: 'comportamental',
      nivel: 'staff',
      titulo: 'Como elevaste a equipa em práticas de avaliação',
      enunciado:
        'Dá-me um exemplo de como melhoraste a forma como a tua equipa — ou outras equipas — trabalha com sistemas de IA. Não o teu código: a prática dos outros.',
      minutos: 7,
      dica: 'Staff mede-se pelo que continua a funcionar quando não estás lá.',
      resposta: [
        {
          type: 'p',
          text: 'A resposta de staff mostra **multiplicação**: identificaste uma lacuna de prática, criaste o caminho mais fácil para fazer o certo, ensinaste, e mediste a adopção — até a prática deixar de depender de ti. História-modelo:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Num banco, três equipas de backend tinham passado a construir funcionalidades com LLM. As mudanças de prompt iam para produção depois de alguém experimentar «umas cinco perguntas» no playground. Num trimestre houve quatro regressões reportadas por clientes.' },
            { title: 'Tarefa', text: 'Não tinha autoridade sobre as outras equipas. O meu objectivo era que avaliar antes de mudar um prompt fosse tão normal como correr testes unitários.' },
            { title: 'Acção', text: 'Comecei pelo caminho fácil: um template de repositório com um harness de avaliação que corria no CI e comentava o pull request com as métricas, por intenção, contra a versão em produção. Fiz sessões de pares de uma hora com cada equipa para construir os primeiros 50 casos a partir de conversas reais. Escrevi um guia de uma página — como anotar, quando usar um juiz e como o calibrar. Depois passei a liderança a uma pessoa de cada equipa, que revia os casos novos.' },
            { title: 'Resultado', text: 'Em dois trimestres, as três equipas tinham conjuntos entre 150 e 400 casos e o gate no CI. O CI bloqueou nove regressões antes de produção e as regressões reportadas por clientes desceram para uma. A métrica de que mais me orgulho: a última equipa a adoptar fê-lo sem mim, com o guia e um colega de outra equipa.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Influência sem autoridade, capacidade de transformar conhecimento em ferramenta e processo, paciência com a adopção, e medição do efeito. A diferença entre sénior e staff está na frase «fizeram-no sem mim».',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Se ainda não tiveste esse alcance, conta mentoria a uma pessoa com o mesmo rigor: o que ela não sabia, o que fizeste, o que ela faz hoje sozinha.',
        },
      ],
      rubrica: {
        criterios: [
          'Identifica uma lacuna de prática com evidência (regressões, incidentes).',
          'Reduz o atrito para fazer o certo (template, ferramenta, CI) em vez de só pregar.',
          'Ensina directamente e transfere a liderança.',
          'Mede a adopção e o efeito com números.',
        ],
        fraco: '«Fiz uma apresentação sobre avaliação» sem adopção medida.',
        solido: 'Cria ferramenta e ensina, com alguma adopção mensurável.',
        excelente: 'Muda a prática de várias equipas, mede o efeito em regressões e deixa a prática auto-sustentada.',
      },
      seguimento: [
        'Que equipa resistiu mais e porquê?',
        'Como evitaste que o gate no CI se tornasse um obstáculo que as pessoas contornavam?',
        'O que farias diferente se fossem dez equipas?',
      ],
      sinaisAlarme: [
        'Confundir mentoria com fazer o trabalho pelos outros.',
        'Não ter nenhuma medida de adopção.',
        'Descrever as outras equipas com desdém.',
      ],
      modulos: ['entrevista', 'avaliacao-fundamentos', 'ci-cd'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-comportamental-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Build vs buy: plataforma de evals, gateway de modelos, base vectorial',
      enunciado:
        'Estás a montar a plataforma de IA de uma empresa média. Para avaliação, gateway de modelos e base vectorial: o que constróis, o que compras ou adoptas, e como decides?',
      minutos: 8,
      dica: 'Começa pelo que te diferencia e pelo custo de operar, não pela lista de funcionalidades.',
      resposta: [
        {
          type: 'p',
          text: 'Construo o que é específico do meu domínio e muda com o produto — **os conjuntos de avaliação, os critérios e o harness que os corre** — e adopto ou compro a infra-estrutura genérica, desde que cumpra residência de dados e não me prenda. A decisão faz-se com quatro perguntas: é diferenciador? quanto custa operar? que dados saem da empresa? quão caro é sair?',
        },
        {
          type: 'table',
          head: ['Componente', 'Inclino-me para', 'Porquê', 'Quando mudo'],
          rows: [
            ['Conjuntos e critérios de avaliação', 'construir (sempre)', 'é conhecimento do domínio; nenhuma ferramenta o traz', 'nunca se compra; no máximo, ferramentas de anotação'],
            ['Harness e traços de avaliação', 'adoptar open-source auto-hospedável (ex.: Langfuse) + código próprio no repositório', 'traços, datasets e scores são problema resolvido; dados ficam em casa', 'construir só se o volume ou a integração o exigirem'],
            ['Gateway de modelos', 'camada fina própria sobre os SDKs, ou proxy open-source', 'retries, timeouts, fallback, orçamento e registo de uso por equipa são poucas centenas de linhas e centrais para custo', 'comprar se houver dezenas de equipas e requisitos de governança que não queres manter'],
            ['Base vectorial', 'pgvector no Postgres que já operas', 'uma base a menos, transacções e filtros SQL, backups existentes', 'base dedicada quando a escala, a latência ou a multitenancy o justificarem e estiver medido'],
          ],
        },
        {
          type: 'p',
          text: 'O custo total de propriedade de construir inclui o que esquecemos: on-call, actualizações de segurança, documentação, a pessoa que sabe como funciona e sai. O custo de comprar inclui o que o fornecedor não mostra: dados de clientes a sair (RGPD, dados de saúde ou financeiros), limites de personalização, preço que sobe com o uso, e o custo de migrar. Por isso, para cada «compra», exijo uma via de saída: formatos abertos (OpenTelemetry nos traços, exportação dos datasets) e uma interface interna que isola o fornecedor.',
        },
        {
          type: 'compare',
          left: { title: 'Sinais para construir', items: ['Diferencia o produto', 'Requisitos de dados que nenhum fornecedor cumpre', 'Peça pequena e estável', 'Equipa com capacidade de operar'] },
          right: { title: 'Sinais para comprar ou adoptar', items: ['Problema genérico e bem resolvido', 'Equipa pequena e ocupada com o produto', 'Necessidade imediata', 'Fornecedor com saída fácil (formatos abertos)'] },
        },
        {
          type: 'p',
          text: 'Num exemplo concreto: numa empresa com 3 equipas de IA e Postgres já em produção, ficaria com pgvector, Langfuse auto-hospedado e um gateway interno fino. Revia a decisão da base vectorial quando passasse algumas dezenas de milhões de vectores ou um p95 de pesquisa fora do SLO, medido.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Construir a plataforma antes do produto',
          text: 'O erro mais comum em equipas de backend sénior: passar seis meses a construir um gateway e um sistema de avaliação genéricos antes de haver dois produtos que os usem. Constrói a segunda vez que precisas, generaliza à terceira.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Langfuse — auto-hospedagem', url: 'https://langfuse.com/self-hosting' },
            { label: 'pgvector', url: 'https://github.com/pgvector/pgvector' },
            { label: 'OpenTelemetry — convenções semânticas GenAI', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa o que é diferenciador (dados e critérios de avaliação) da infra-estrutura genérica.',
          'Inclui custo de operar, residência de dados e custo de saída na decisão.',
          'Dá uma escolha concreta por componente com a condição que a faria mudar.',
          'Exige formatos abertos ou uma interface interna para reduzir o lock-in.',
          'Alerta contra construir plataforma antes de haver produtos que a usem.',
        ],
        fraco: '«Construo tudo para ter controlo» ou «compro tudo para ir depressa», sem critérios.',
        solido: 'Decide por componente com critérios de diferenciação e custo, e escolhe pgvector e uma ferramenta de traços adoptada.',
        excelente: 'Junta o custo total de propriedade dos dois lados, desenha a via de saída, define os gatilhos mensuráveis para rever cada decisão e liga-a ao tamanho e maturidade da organização.',
      },
      seguimento: [
        'Que métrica te faria sair do pgvector?',
        'Um fornecedor de gateway oferece cache semântica incluída. Que riscos vês?',
        'Como convences a direcção a pagar uma ferramenta de avaliação?',
      ],
      sinaisAlarme: [
        'Escolher pela ferramenta da moda sem falar de custo de operação.',
        'Ignorar para onde vão os dados dos clientes.',
        'Achar que a ferramenta de avaliação substitui o trabalho de criar o conjunto.',
      ],
      modulos: ['entrevista', 'observabilidade-llmops', 'bases-vectoriais'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-comportamental-09',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Dívida de prompts e evals vs funcionalidades novas',
      enunciado:
        'Os teus prompts são cópias com pequenas variações, o conjunto de avaliação está desactualizado, e o produto quer três funcionalidades novas neste trimestre. Como decides quanto tempo dás a cada coisa?',
      minutos: 7,
      dica: 'Dívida tem juros. Quanto estás a pagar por mês, em quê?',
      resposta: [
        {
          type: 'p',
          text: 'Não trato a dívida como um projecto à parte que compete com o produto: **meço os juros que estou a pagar** e pago primeiro a dívida que está no caminho das funcionalidades pedidas. Na prática isso costuma dar uma fatia fixa de 15–25% da capacidade, mais o que a próxima funcionalidade exigir.',
        },
        {
          type: 'p',
          text: 'Em sistemas com LLM, a dívida é mais cara do que em código normal porque falha em silêncio. Um prompt copiado em quatro sítios com variações significa que uma correcção chega a um e não aos outros; um conjunto de avaliação desactualizado significa que o CI passa enquanto a produção piora. Os juros medem-se: regressões que chegaram a clientes, tempo médio para mudar um prompt com confiança, horas de avaliação manual por release, incidentes que o conjunto não apanhou.',
        },
        {
          type: 'table',
          head: ['Dívida', 'Juros típicos', 'Prioridade'],
          rows: [
            ['Conjunto de avaliação desactualizado', 'regressões invisíveis; cada funcionalidade nova sem rede', 'alta: paga-se antes da primeira funcionalidade nova'],
            ['Prompts duplicados com variações', 'correcções que não se propagam; comportamento inconsistente', 'alta se as funcionalidades novas tocam nesses prompts'],
            ['Prompts sem versão nem registo nos traços', 'impossível saber que versão gerou uma resposta má', 'média: barato de corrigir, faz-se já'],
            ['Código de orquestração confuso mas estável', 'pouco, se ninguém lhe mexe', 'baixa: deixa-se até ser preciso mudá-lo'],
          ],
        },
        {
          type: 'p',
          text: 'Com o produto, a conversa não é «precisamos de um trimestre de refactorização». É: «a funcionalidade A mexe nos prompts de reembolso; sem actualizar o conjunto de avaliação, não temos como saber se parte o que já existe. Proponho duas semanas para isso antes de A, e a partir daí cada funcionalidade nova traz os seus casos de avaliação.» Assim a dívida paga-se no caminho e a regra impede que volte a crescer.',
        },
        {
          type: 'compare',
          left: { title: 'Pagar a dívida primeiro', items: ['Menos regressões nas funcionalidades novas', 'Mudanças futuras mais rápidas', 'Atrasa a primeira entrega'] },
          right: { title: 'Funcionalidades primeiro', items: ['Valor visível mais cedo', 'Cada funcionalidade aumenta a superfície sem rede', 'Juros compostos: o próximo trimestre é mais lento'] },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Pedir tempo sem números',
          text: '«Precisamos de limpar a dívida técnica» perde sempre contra uma funcionalidade com receita associada. Leva as regressões do trimestre, o tempo que cada uma custou e a funcionalidade que vai pôr em risco.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Martin Fowler — Technical Debt', url: 'https://martinfowler.com/bliki/TechnicalDebt.html' },
            { label: 'Sculley et al. — Hidden Technical Debt in Machine Learning Systems (NIPS 2015)', url: 'https://research.google/pubs/hidden-technical-debt-in-machine-learning-systems/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Quantifica os juros da dívida com métricas concretas (regressões, tempo por mudança).',
          'Explica porque é que dívida em prompts e avaliação falha em silêncio.',
          'Prioriza a dívida que está no caminho das funcionalidades pedidas.',
          'Propõe uma regra que impede a dívida de voltar a crescer (casos de avaliação com cada funcionalidade).',
          'Enquadra a proposta em termos que o produto aceita.',
        ],
        fraco: '«Pararia as funcionalidades até limpar tudo» ou «a dívida fica para depois».',
        solido: 'Mede o impacto, reserva uma fatia de capacidade e prioriza pelo risco.',
        excelente: 'Liga cada item de dívida a uma funcionalidade do roadmap, propõe a regra que estanca a dívida e deixa dívida estável e barata por pagar de propósito.',
      },
      seguimento: [
        'O produto diz não às duas semanas. E agora?',
        'Como deduplicas prompts sem os tornar ilegíveis?',
        'Como sabes que o conjunto de avaliação está desactualizado?',
      ],
      sinaisAlarme: [
        'Tratar dívida técnica como assunto só da engenharia.',
        'Não conseguir pôr números nos juros.',
        'Querer reescrever tudo do zero.',
      ],
      modulos: ['entrevista', 'avaliacao-fundamentos', 'prompt-engineering'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-comportamental-10',
      tipo: 'comportamental',
      nivel: 'pleno',
      titulo: 'Porque é que um engenheiro de backend é um bom AI engineer',
      enunciado:
        'Vens de backend. Porque é que queres fazer AI engineering, e porque é que achas que a tua experiência te prepara para isto?',
      minutos: 5,
      dica: 'Liga competências concretas a problemas concretos de sistemas com LLM, e diz o que ainda estás a aprender.',
      resposta: [
        {
          type: 'p',
          text: 'A resposta forte não diz «porque IA é o futuro». Mostra que **a maior parte do trabalho de um AI engineer aplicado é engenharia de sistemas com uma dependência probabilística no meio**, dá exemplos de competências que transferiste, e é honesta sobre o que teve de aprender. Versão-modelo, com uma mini-história:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Situação', text: 'Passei oito anos em backend — pagamentos, filas, integrações com fornecedores pouco fiáveis. Há dois anos a minha equipa integrou um modelo de linguagem num fluxo de apoio ao cliente.' },
            { title: 'Tarefa', text: 'Fiquei responsável pela integração porque «era só uma API». Rapidamente deixou de ser.' },
            { title: 'Acção', text: 'Tratei o modelo como trato um fornecedor externo: timeouts, retries com backoff, idempotência nas ferramentas que mexiam em dinheiro, traços com tokens e custo por pedido, fallback quando falha. O que tive de aprender de novo foi avaliação: como construir um conjunto dourado, como medir qualidade quando não há uma resposta exacta, como calibrar um juiz contra humanos. Estudei e apliquei isso no mesmo projecto.' },
            { title: 'Resultado', text: 'O serviço manteve-se dentro do SLO de disponibilidade nos primeiros seis meses apesar de duas degradações do fornecedor, porque o fallback funcionou; e o conjunto de avaliação que construí apanhou duas regressões de prompt antes de produção. Foi aí que percebi que é este o trabalho que quero fazer: sistemas fiáveis sobre componentes que não o são.' },
          ],
        },
        {
          type: 'callout',
          tone: 'key',
          title: 'O que o entrevistador avalia',
          text: 'Motivação genuína e específica, auto-conhecimento (o que transfere e o que não), e se já agiste sobre a motivação — projectos, estudo, sistemas reais. Dizer o que ainda estás a aprender (estatística de avaliação, fine-tuning) é sinal de maturidade, não de fraqueza.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Troca pela tua história',
          text: 'Usa a tua experiência real: se vens de dados, fala de pipelines e qualidade de dados; se vens de segurança, de modelos de ameaça e injecção. Fecha sempre com uma prova de que já começaste.',
        },
      ],
      rubrica: {
        criterios: [
          'Liga pelo menos três competências de backend a problemas concretos de sistemas com LLM.',
          'Diz o que teve de aprender de novo (avaliação, comportamento probabilístico).',
          'Apresenta evidência de acção (projecto, sistema, estudo aplicado).',
          'A motivação é específica, não genérica.',
        ],
        fraco: '«Porque IA é o futuro e quero estar na vanguarda.»',
        solido: 'Mapeia competências transferíveis com um exemplo concreto.',
        excelente: 'Mostra o que transferiu, o que aprendeu e um resultado medido, e articula porque o perfil de sistemas é exactamente o que falta em muitas equipas de IA.',
      },
      seguimento: [
        'O que achas mais difícil em IA do que em backend?',
        'Que lacuna tua te preocupa mais para esta função?',
        'Que projecto pessoal fizeste para aprender?',
      ],
      sinaisAlarme: [
        'Motivação só por hype ou salário.',
        'Desvalorizar a parte de avaliação como «coisa de cientistas de dados».',
        'Não conseguir apontar nada que tenha construído com LLMs.',
      ],
      modulos: ['entrevista', 'engenharia-ia'],
    },
  ],
};
