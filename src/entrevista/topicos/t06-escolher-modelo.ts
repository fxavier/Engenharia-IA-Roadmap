import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'escolher-modelo',
  numero: 6,
  bloco: 'llm',
  titulo: 'Escolher, hospedar e trocar de modelo',
  resumo:
    'Como se escolhe um modelo com números do teu caso e não de um ranking, quando hospedar open-weights compensa, como encaminhar pedidos entre escalões e fornecedores, e como trocar de modelo sem regressões. O entrevistador quer ver o modelo tratado como dependência com custo, risco e ciclo de vida.',
  icon: '⚖️',
  modulos: ['escolher-modelo', 'custo-escala', 'avaliacao-fundamentos'],
  essencial: [
    'Escolhe-se no teu conjunto de avaliação, por intenção: qualidade, TTFT p95 à hora de ponta, tokens/s, custo por tarefa, tool calling e a tua língua.',
    'Custo por tarefa, não por token: tokenizadores e verbosidade diferentes mudam quantos tokens a mesma tarefa gasta.',
    'Open-weights troca custo variável por capacidade fixa e operação: GPUs pagas ociosas, redundância, drivers, quantização, actualizações.',
    'Residência de dados: onde processa, quanto tempo retém, se treina com os dados, que subcontratados; vale para traços e logs também.',
    'Fixa a versão do modelo em produção; um alias pode avançar sem aviso e mesmo um id fixo pode mudar de comportamento por infraestrutura.',
    'Routing decide antes de gerar; cascata gera no barato e sobe quando um verificador reprova. O limiar escolhe-se num conjunto de validação.',
    'Prompts não são portáveis entre fornecedores: o fallback precisa de variante de prompt própria e de avaliação regular.',
    'Migração: avaliação emparelhada por item e intenção, latência e custo reais, shadow ou canário, reversão por configuração.',
    'Memória dos pesos ≈ parâmetros × bytes por parâmetro: 8 mil milhões em 16 bits ≈ 16 GB, em 4 bits ≈ 4 a 5 GB, mais KV cache.',
    'Quantização perde de forma desigual: línguas e tarefas de raciocínio sofrem mais, e métricas automáticas subestimam a perda.',
  ],
  perguntas: [
    /* ================================================================ 01 */
    {
      id: 'p-escolher-modelo-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Porque não escolher o primeiro do ranking público',
      enunciado:
        'Vais escolher o modelo para um assistente de suporte em português. Porque não pegar no primeiro do leaderboard? Que critérios medes e como?',
      minutos: 5,
      dica: 'Um ranking mede a distribuição de perguntas de outra pessoa.',
      resposta: [
        {
          type: 'p',
          text:
            'Porque um ranking mede tarefas, línguas e prompts que não são os meus, e não mede latência à minha hora de ponta nem custo por conversa. Uso o ranking para escolher **candidatos**; a decisão sai de medir três ou quatro deles no **meu conjunto de avaliação**, com o meu prompt e as minhas ferramentas.',
        },
        {
          type: 'table',
          head: ['Critério', 'Como meço', 'Armadilha'],
          rows: [
            ['Qualidade', 'Conjunto dourado de 200 a 500 casos, por intenção, com juiz calibrado e amostra humana', 'Olhar só para a média e não ver a intenção que regrediu'],
            ['TTFT', 'p50 e p95 com o prompt real (com contexto RAG), em várias janelas horárias', 'Medir com um prompt de 50 tokens às 3 da manhã'],
            ['Tokens/s de saída', 'Medido no streaming real; decide a duração das respostas longas', 'Confundir com throughput agregado do servidor'],
            ['Custo por tarefa', 'Tokens de entrada e saída por conversa real, com cache, vezes o preço do escalão', 'Comparar preço por milhão de tokens com tokenizadores diferentes'],
            ['Tool calling', 'Exactidão de ferramenta e de argumentos no meu catálogo', 'Assumir que «suporta ferramentas» significa que escolhe bem'],
            ['Língua e domínio', 'Casos em português europeu ou de Moçambique, nomes locais, moeda, registo', 'Avaliar em inglês e extrapolar'],
          ],
        },
        {
          type: 'p',
          text:
            'Há ainda restrições que eliminam candidatos antes de qualquer medição: janela de contexto **efectiva** para o meu tamanho de prompt, rate limits suficientes para o pico, suporte de saída estruturada, região de processamento e data de retirada anunciada. E escolho o **mais barato que cumpre** os limiares de qualidade e latência, não o melhor em absoluto: a diferença de custo entre escalões é tipicamente de uma ordem de grandeza.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Preço por token não é custo',
          text: 'Um modelo com preço por token mais baixo pode gastar mais tokens na mesma tarefa, por tokenizar pior o português ou por ser mais verboso. Compara custo por conversa medido, não a tabela de preços.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — escolher um modelo', url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model' },
            { label: 'Zheng et al. (2023) — Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena', url: 'https://arxiv.org/abs/2306.05685' },
            { label: 'OpenAI — modelos', url: 'https://platform.openai.com/docs/models' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa o ranking só para pré-seleccionar e decide no seu próprio conjunto de avaliação.',
          'Distingue TTFT de tokens/s e mede percentis com o prompt real.',
          'Calcula custo por tarefa ou conversa, não por token.',
          'Inclui tool calling e a língua alvo como critérios medidos.',
          'Escolhe o mais barato que cumpre limiares, não o melhor absoluto.',
        ],
        fraco: '«Escolho o melhor do ranking» ou «o mais barato», sem medir no caso real.',
        solido: 'Lista critérios medidos no conjunto próprio, com TTFT, custo por conversa e qualidade por intenção.',
        excelente: 'Acrescenta restrições eliminatórias (região, rate limits, retirada), o efeito do tokenizador no custo e a regra do mais barato que cumpre, com limiares definidos antes de medir.',
      },
      seguimento: [
        'Como defines o limiar de qualidade antes de medir os candidatos?',
        'Quantos casos precisas para distinguir dois modelos com 3 pontos de diferença?',
        'O que fazes se o melhor em qualidade falhar o TTFT por 200 ms?',
      ],
      sinaisAlarme: [
        'Citar um benchmark público como prova suficiente.',
        'Medir latência com prompts curtos e fora de horas.',
        'Não saber o custo por conversa do sistema actual.',
      ],
      modulos: ['escolher-modelo', 'avaliacao-fundamentos'],
    },

    /* ================================================================ 02 */
    {
      id: 'p-escolher-modelo-02',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'API comercial ou open-weights hospedado por ti',
      enunciado:
        'O CFO viu que «modelos abertos são grátis» e quer cortar a factura da API. Como respondes? Quando é que hospedar um modelo open-weights compensa mesmo?',
      minutos: 8,
      dica: 'Os pesos são grátis; o que custa é tudo à volta deles, e está ligado 24 horas por dia.',
      resposta: [
        {
          type: 'p',
          text:
            'Os pesos são gratuitos, a inferência não. Com uma API pagas por token usado; ao hospedar pagas **capacidade** (GPUs ligadas, com redundância, mesmo ociosas) mais **operação**. Compensa quando há volume alto e constante, uma tarefa que um modelo pequeno ou médio resolve com a qualidade exigida, ou uma restrição de dados que a API não satisfaz.',
        },
        {
          type: 'p',
          text:
            'Faço a conta com a mesma estrutura dos dois lados. API: pedidos por mês × tokens por pedido × preço do escalão, menos o efeito da cache. Hospedado: número de GPUs para aguentar o **pico** com margem e redundância (no mínimo duas réplicas para não ter um ponto único de falha) × horas do mês × preço por hora, mais o tempo de engenharia para operar (drivers, servidor de inferência, escala, actualizações, on-call). A utilização média é o número que decide: um servidor com batching contínuo como o vLLM é eficiente quando está cheio, e um tráfego com picos de dia e vale de noite paga a noite inteira.',
        },
        {
          type: 'compare',
          left: {
            title: 'API comercial',
            items: [
              'Custo proporcional ao uso, sem capacidade mínima.',
              'Acesso a escalões grandes que não conseguirias servir.',
              'Rate limits, variância de latência e retirada de versões fora do teu controlo.',
              'Dados saem da tua infraestrutura: contrato, região e retenção a negociar.',
            ],
          },
          right: {
            title: 'Open-weights hospedado (vLLM em produção, Ollama em desenvolvimento)',
            items: [
              'Custo fixo por capacidade; compensa com utilização alta.',
              'Dados não saem; versão congelada até decidires mudar.',
              'Operas GPU, quantização, batching, escala e segurança; precisa de pessoas.',
              'Qualidade em português e em tool calling a medir com cuidado; varia muito por família e tamanho.',
              'Licença dos pesos a ler: algumas restringem uso comercial ou escala.',
            ],
          },
        },
        {
          type: 'p',
          text:
            'Respondia ao CFO com a conta feita para o nosso tráfego real e com o custo de qualidade: se o modelo hospedado cumprir o conjunto dourado em 80% das intenções, o resto continua na API e o custo fixo soma-se. O desenho que mais vezes vi compensar é **híbrido**: um modelo pequeno hospedado para uma tarefa estreita e de muito volume (classificação, extracção, mascaramento de PII), a API para a geração difícil, e Ollama em desenvolvimento e CI para não gastar nem depender de rede.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Comparar o preço da GPU com a factura da API',
          text: 'Uma GPU a 100% de utilização teórica contra a factura real da API é a comparação errada. Usa a utilização medida do tráfego, a redundância e as horas de engenharia.',
        },
        {
          type: 'refs',
          items: [
            { label: 'vLLM — documentação', url: 'https://docs.vllm.ai/' },
            { label: 'Kwon et al. (2023) — PagedAttention / vLLM', url: 'https://arxiv.org/abs/2309.06180' },
            { label: 'Ollama — documentação', url: 'https://docs.ollama.com/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa custo variável da API de custo fixo de capacidade mais operação.',
          'Dimensiona pelo pico com redundância e usa utilização média medida.',
          'Inclui o custo de qualidade: o que o modelo hospedado não resolve continua na API.',
          'Nomeia razões não económicas (dados, versão congelada) e riscos (licença, operação).',
          'Propõe um desenho híbrido por tarefa em vez de tudo ou nada.',
        ],
        fraco: 'Concorda que é grátis ou rejeita sem números, por preferência.',
        solido: 'Faz a conta de capacidade versus uso, inclui operação e mede a qualidade no conjunto próprio.',
        excelente: 'Usa a utilização real e a curva de tráfego como variável decisiva, separa tarefas por escalão e acrescenta licença, pessoas e on-call ao custo total, respondendo ao negócio com um plano híbrido.',
      },
      seguimento: [
        'Como estimas quantas GPUs precisas para 30 pedidos por segundo com 2 000 tokens de entrada?',
        'Que métricas operacionais vigiarias no vLLM?',
        'E se o jurídico exigir que nada saia do datacenter?',
      ],
      sinaisAlarme: [
        '«Open-source é grátis.»',
        'Esquecer redundância, horas ociosas ou on-call.',
        'Assumir que o modelo aberto tem a mesma qualidade sem medir.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ================================================================ 03 */
    {
      id: 'p-escolher-modelo-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Os dados não podem sair da UE: o que perguntas ao fornecedor',
      enunciado:
        'Uma seguradora portuguesa diz que os dados dos clientes não podem sair da UE. O que perguntas ao fornecedor do modelo e o que muda na tua arquitectura?',
      minutos: 5,
      dica: 'O modelo não é o único sítio por onde os dados passam.',
      resposta: [
        {
          type: 'p',
          text:
            'Pergunto, por escrito e com referência ao contrato: **onde processa** e se posso fixar a região, **o que retém e durante quanto tempo** (incluindo logs de monitorização de abuso), **se usa os dados para treino**, e **que subcontratados** os vêem. As respostas estão no acordo de tratamento de dados, não no marketing. Depois verifico que todo o resto do caminho cumpre o mesmo.',
        },
        {
          type: 'p',
          text:
            'O enquadramento é o RGPD: transferências para fora do Espaço Económico Europeu só com decisão de adequação ou garantias como cláusulas contratuais tipo, e dados de saúde (sinistros de saúde, numa seguradora) são categoria especial. As opções práticas são uma API com processamento contratualizado na UE, um modelo servido por uma plataforma cloud numa região da UE, ou um modelo open-weights hospedado por nós. Cada uma tem um catálogo de modelos diferente, e é aí que a restrição reduz a lista de candidatos antes de qualquer avaliação.',
        },
        {
          type: 'list',
          items: [
            '**Traços e observabilidade**: se a ferramenta de traços é SaaS fora da UE, os prompts com dados pessoais saem por aí. Hospedo-a ou escolho região.',
            '**Embeddings e índices** também são dados pessoais quando derivam de texto com dados pessoais; a base vectorial fica na mesma região.',
            '**Conjuntos de avaliação** feitos de conversas reais são cópias dos dados: mascarados, com retenção e acesso controlado.',
            '**Fallback**: o fornecedor de reserva tem de cumprir a mesma restrição; se não houver, a degradação é encaminhar para humano, nunca um fornecedor fora da UE.',
            '**Minimização**: mascarar PII antes do modelo e devolver das ferramentas só os campos necessários reduz a exposição seja qual for a resposta do fornecedor.',
          ],
        },
        {
          type: 'p',
          text:
            'Em produção registo no traço de cada chamada o fornecedor, a região e a versão, e o encaminhamento recusa por configuração uma rota fora da UE para um tenant marcado como UE. Assim a conformidade é verificável, não uma promessa num diagrama.',
        },
        {
          type: 'refs',
          items: [
            { label: 'RGPD — Regulamento (UE) 2016/679', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
            { label: 'EDPB — orientações sobre transferências internacionais', url: 'https://edpb.europa.eu/' },
            { label: 'CNPD — Comissão Nacional de Protecção de Dados', url: 'https://www.cnpd.pt/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Lista as quatro perguntas: região, retenção, treino e subcontratados.',
          'Situa a questão no RGPD (transferências e categorias especiais).',
          'Estende a restrição a traços, embeddings, conjuntos de avaliação e fallback.',
          'Propõe minimização (mascarar PII, ferramentas com campos mínimos).',
          'Torna a conformidade verificável (região no traço, rota recusada por configuração).',
        ],
        fraco: '«Escolho um fornecedor com servidores na Europa» e não fala de retenção, treino nem do resto do caminho.',
        solido: 'Faz as perguntas certas, considera hospedar e estende a restrição a traços e embeddings.',
        excelente: 'Acrescenta o fallback que cumpre a mesma restrição, conjuntos de avaliação como cópias de dados, e controlo por configuração com evidência no traço para auditoria.',
      },
      seguimento: [
        'Como provarias a um auditor que nenhum pedido de um tenant UE saiu da região no último trimestre?',
        'O que muda se os dados forem de saúde?',
        'Mascarar PII antes do modelo estraga a qualidade? Como medias?',
      ],
      sinaisAlarme: [
        'Esquecer que traços e logs também contêm os dados.',
        'Basear a decisão na página de marketing do fornecedor.',
        'Fallback para um fornecedor fora da região «só em emergência».',
      ],
      modulos: ['escolher-modelo', 'guardrails-seguranca'],
    },

    /* ================================================================ 04 */
    {
      id: 'p-escolher-modelo-04',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Cascata ou routing, e como escolhes o limiar',
      enunciado:
        'Queres usar um modelo pequeno na maioria dos pedidos e o grande só quando é preciso. Fazes routing antes de gerar ou cascata depois? E como escolhes o limiar que decide subir?',
      minutos: 8,
      dica: 'O limiar não se escolhe pela intuição: precisa de um conjunto onde sabes se cada escalão acertou.',
      resposta: [
        {
          type: 'p',
          text:
            'Se consigo saber **antes de gerar** quais pedidos são difíceis (intenção, regras, um classificador com precisão medida), faço **routing**: custa uma classificação. Se só sei depois de ver a resposta, faço **cascata** com um verificador barato e fiável: custa duas gerações nos pedidos que sobem. O limiar escolhe-se num conjunto de validação anotado, minimizando custo sujeito a um piso de qualidade.',
        },
        {
          type: 'table',
          head: ['', 'Routing', 'Cascata'],
          rows: [
            ['Decide com', 'O pedido (intenção, comprimento, regras, classificador)', 'A resposta do pequeno (verificador: esquema, citações, juiz)'],
            ['Custo extra', 'Uma classificação por pedido', 'Pequeno mais grande nos que sobem'],
            ['Latência extra', 'A classificação (pode correr em paralelo com o embedding)', 'Toda a geração do pequeno nos que sobem'],
            ['Falha típica', 'Pedido difícil classificado como fácil', 'Verificador que aprova respostas erradas'],
          ],
        },
        {
          type: 'p',
          text:
            'Para o limiar, preciso de um conjunto em que, para cada pedido, sei o score do verificador e se o pequeno e o grande acertaram. Varro limiares, calculo qualidade e custo esperados em cada um e escolho o mais barato cujo **limite inferior** de qualidade ainda cumpre o alvo. O exemplo abaixo usa dados sintéticos e custos relativos, mas a forma é a que uso.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Varrimento do limiar de uma cascata. Dados sintéticos com semente fixa; o resultado está em comentário.',
          code: String.raw`import math
import random

# Validação anotada: score do verificador sobre a resposta do pequeno e se cada
# escalão acertou. Dados sintéticos com semente fixa; no real vêm do dourado.
rng = random.Random(7)
val = []
for _ in range(2000):
    s = rng.random()
    val.append((s, rng.random() < 0.50 + 0.45 * s, rng.random() < 0.93))

CUSTO_PEQ, CUSTO_GRANDE, ALVO = 1.0, 10.0, 0.90   # custos relativos por pedido


def avaliar(limiar: float) -> tuple[float, float, float]:
    """Cascata: sobe ao grande quando o score fica abaixo do limiar."""
    n = len(val)
    sobe = [s < limiar for s, _, _ in val]
    q = sum(g if up else p for (_, p, g), up in zip(val, sobe)) / n
    lb = q - 1.96 * math.sqrt(q * (1 - q) / n)          # limite inferior a 95%
    return q, lb, CUSTO_PEQ + CUSTO_GRANDE * sum(sobe) / n   # quem sobe paga os dois


candidatos = [(t / 20, *avaliar(t / 20)) for t in range(21)]
validos = [c for c in candidatos if c[2] >= ALVO]
t, q, lb, custo = min(validos, key=lambda c: c[3])
print(f"escolhido: limiar {t:.2f}, qualidade {q:.3f} (lb {lb:.3f}), custo {custo:.2f}")
for t, q, _, custo in candidatos[10::4]:
    print(f"  limiar {t:.2f}: qualidade {q:.3f}, custo {custo:.2f}")
# escolhido: limiar 0.70, qualidade 0.921 (lb 0.910), custo 8.09
#   limiar 0.50: qualidade 0.885, custo 6.17
#   limiar 0.70: qualidade 0.921, custo 8.09
#   limiar 0.90: qualidade 0.929, custo 10.04
# só grande (nos mesmos dados): qualidade 0.929, custo 10.00`,
        },
        {
          type: 'p',
          text:
            'Repara no que o resultado ensina: com estes números a cascata poupa só cerca de 19% face a mandar tudo ao grande e, com limiar 0,90, custa mais do que mandar tudo ao grande, porque os que sobem pagam os dois. A cascata só compensa quando a fracção que sobe é pequena; acima de uma fracção da ordem de 30% costuma perder para o routing. Em produção, a fracção que sobe é uma métrica com alerta: se mudar, a distribuição de pedidos ou o modelo mudou, e o limiar tem de ser recalibrado. Também faço o limiar por intenção quando as curvas são muito diferentes.',
        },
        { type: 'adr', ref: 'adr-0004' },
        {
          type: 'refs',
          items: [
            { label: 'Chen, Zaharia e Zou (2023) — FrugalGPT', url: 'https://arxiv.org/abs/2305.05176' },
            { label: 'Ong et al. (2024) — RouteLLM', url: 'https://arxiv.org/abs/2406.18665' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue routing (decide antes) de cascata (decide depois) e o custo de cada.',
          'Escolhe o limiar num conjunto anotado com o acerto de cada escalão.',
          'Formula a escolha como minimizar custo com piso de qualidade, com incerteza (limite inferior).',
          'Nota que na cascata os pedidos que sobem pagam duas gerações e latência dupla.',
          'Monitoriza a fracção que sobe e recalibra quando muda.',
        ],
        fraco: '«Uso a confiança do modelo e subo quando estiver abaixo de 0,8», sem conjunto nem custo.',
        solido: 'Escolhe entre routing e cascata pela informação disponível e calibra o limiar num conjunto de validação.',
        excelente: 'Faz a optimização com intervalo de confiança, mostra quando a cascata deixa de compensar, propõe limiares por intenção e uma métrica de deriva sobre a fracção que sobe.',
      },
      seguimento: [
        'Que verificador usavas para respostas abertas, sem esquema?',
        'Como evitas que o router fique enviesado para o escalão barato com o tempo?',
        'Quantos pedidos anotados precisas para estimar o limiar com confiança?',
      ],
      sinaisAlarme: [
        'Usar a confiança autodeclarada do modelo como verificador sem calibração.',
        'Ignorar o custo dos pedidos que sobem na cascata.',
        'Fixar o limiar uma vez e nunca o voltar a medir.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ================================================================ 05 */
    {
      id: 'p-escolher-modelo-05',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Fallback para outro fornecedor e prompts que não viajam',
      enunciado:
        'O fornecedor principal teve duas horas de 5xx e 429 na semana passada. Querem fallback automático para outro fornecedor. O que te preocupa e como o desenhas?',
      minutos: 8,
      dica: 'Trocar o URL é a parte fácil. O que é que muda no comportamento?',
      resposta: [
        {
          type: 'p',
          text:
            'Preocupa-me que o fallback seja **um sistema diferente que nunca foi avaliado**: o mesmo prompt noutro modelo dá outra qualidade, outro formato de tool calling e outras recusas. Desenho-o como uma rota de primeira classe, com variante de prompt própria, avaliação regular e regras claras de quando dispara, e com a opção explícita de degradar em vez de trocar.',
        },
        {
          type: 'list',
          items: [
            '**Formato da API**: mensagens de sistema, blocos de ferramenta, resultados de ferramenta, prefill e saída estruturada têm formas e regras diferentes; a camada de abstracção tem de as traduzir e testar.',
            '**Comportamento**: o prompt foi afinado para um modelo; noutro, as instruções de formato, tom e recusa podem ser seguidas de outra maneira. Preciso de uma variante de prompt por fornecedor.',
            '**Tokenizador e limites**: o mesmo texto tem outro número de tokens, a janela e o `max_tokens` diferem, e o orçamento por conversa muda.',
            '**Cache**: a cache de prompt do principal não serve no fallback; o custo e o TTFT do primeiro pedido sobem.',
            '**Dados**: o fornecedor de reserva tem de cumprir o mesmo contrato e região.',
          ],
        },
        {
          type: 'table',
          head: ['Decisão', 'Escolha que faço', 'Porquê'],
          rows: [
            ['Quando dispara', '5xx, 429 persistente e timeouts, com circuit breaker; nunca em 400 ou recusa de conteúdo', 'Erros do pedido não se resolvem noutro fornecedor e mascaram bugs'],
            ['A meio de uma resposta em streaming', 'Não troco a meio; falho o turno com mensagem e repito no fallback se nada foi mostrado', 'Juntar dois modelos numa resposta dá incoerência'],
            ['Ferramentas com efeitos', 'Chave de idempotência mantida entre fornecedores', 'O principal pode ter pedido a acção antes de falhar'],
            ['Alternativa', 'Escalão menor do mesmo fornecedor ou encaminhar para humano', 'Às vezes é mais seguro do que um modelo de outra família'],
          ],
        },
        {
          type: 'p',
          text:
            'Operacionalmente: o fallback corre o mesmo conjunto dourado todos os meses e a cada mudança de prompt, com limiar de qualidade próprio; se não passar, fica desligado e a degradação é humano. Recebe uma pequena fracção de tráfego real de forma contínua (ou shadow), porque um caminho que só corre em incidente estará partido no incidente. E o traço regista o fornecedor de cada resposta para separar as métricas.',
        },
        { type: 'adr', ref: 'adr-0003' },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — erros da API', url: 'https://docs.anthropic.com/en/api/errors' },
            { label: 'OpenAI — rate limits', url: 'https://platform.openai.com/docs/guides/rate-limits' },
            { label: 'Google SRE — handling overload', url: 'https://sre.google/sre-book/handling-overload/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica que prompts e formatos de ferramenta não são portáveis e exige variante por fornecedor.',
          'Define que erros disparam o fallback (5xx, 429, timeouts) e quais não (400, recusas).',
          'Trata streaming a meio e idempotência de ferramentas com efeitos.',
          'Exige avaliação regular do fallback e tráfego contínuo para não apodrecer.',
          'Considera degradar (escalão menor, humano) como alternativa e respeita restrições de dados.',
        ],
        fraco: '«Uso uma biblioteca que troca de fornecedor automaticamente» e não fala de qualidade nem de prompts.',
        solido: 'Circuit breaker, variante de prompt por fornecedor e avaliação do fallback no conjunto dourado.',
        excelente: 'Acrescenta streaming a meio, idempotência entre fornecedores, tráfego contínuo no fallback, região de dados e a escolha consciente de degradar para humano.',
      },
      seguimento: [
        'Como testavas o fallback sem esperar por um incidente real?',
        'Que métricas mostravas no dashboard para o fallback?',
        'Quando é que preferias não ter fallback nenhum?',
      ],
      sinaisAlarme: [
        'Assumir que o mesmo prompt dá a mesma qualidade noutro modelo.',
        'Fallback que dispara em erros 400.',
        'Um caminho de reserva que nunca recebe tráfego fora de incidentes.',
      ],
      modulos: ['escolher-modelo', 'apis-de-modelos'],
    },

    /* ================================================================ 06 */
    {
      id: 'p-escolher-modelo-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Migrar para um modelo novo sem regressões',
      enunciado:
        'Saiu uma versão nova do modelo que usas, mais barata e, segundo o fornecedor, melhor. Qual é o teu processo para a pôr em produção?',
      minutos: 6,
      dica: 'Uma média igual pode esconder uma intenção que piorou muito.',
      resposta: [
        {
          type: 'p',
          text:
            'Trato-a como uma actualização de dependência com testes: candidato por configuração, **avaliação emparelhada** no meu conjunto, latência e custo reais, **canário** com métricas de negócio, e promoção ou reversão mudando uma variável. Nenhum código muda; se tiver de mudar, a abstracção sobre o fornecedor está a falhar.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Ler antes de instalar', text: 'Notas de lançamento, mudanças de API (parâmetros retirados, comportamento de ferramentas), preço, janela, região e data de retirada da versão actual, que me dá o prazo.' },
            { title: 'Avaliação emparelhada', text: 'O mesmo conjunto dourado, os casos de segurança e o eval de selecção de ferramentas, nas duas versões, com o prompt actual. Comparo item a item e por intenção, com intervalo de confiança (bootstrap emparelhado ou teste de McNemar para acerto binário). Leio à mão os itens que mudaram de resultado.' },
            { title: 'Prompt ajustado à parte', text: 'Se o novo precisar de ajustes, avalio a variante como segunda candidata. Assim sei quanto vem do modelo e quanto do prompt.' },
            { title: 'Latência e custo com tráfego real', text: 'TTFT p95 e tokens por conversa com prompts reais em várias janelas horárias; o tokenizador ou a verbosidade podem anular a poupança anunciada.' },
            { title: 'Shadow e canário', text: 'Shadow sem mostrar ao utilizador para apanhar erros de formato; depois 5 a 10% do tráfego com resolução, escalamentos, feedback e custo comparados com o controlo.' },
            { title: 'Promover e manter a reversão', text: 'Promover é mudar a configuração; mantenho a versão anterior disponível até à data de retirada, e o traço regista a versão de cada resposta.' },
          ],
        },
        {
          type: 'p',
          text:
            'O critério de promoção fica escrito antes de ver resultados: nenhuma intenção desce além do intervalo de confiança, segurança não piora, TTFT p95 dentro do SLO e custo por conversa igual ou menor. Com 300 casos, uma diferença de 2 a 3 pontos está muitas vezes dentro do ruído, e é por isso que a comparação item a item vale mais do que duas médias.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — IDs de modelo e versões', url: 'https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions' },
            { label: 'Anthropic — deprecação de modelos', url: 'https://platform.claude.com/docs/en/about-claude/model-deprecations' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Muda o modelo por configuração e mantém reversão imediata.',
          'Avalia de forma emparelhada, por intenção, com intervalo de confiança.',
          'Separa o efeito do modelo do efeito de ajustes ao prompt.',
          'Mede latência e custo com prompts e tráfego reais.',
          'Usa shadow ou canário com métricas de negócio e critério de promoção escrito antes.',
        ],
        fraco: '«Testo com umas perguntas e se estiver bem mudo.»',
        solido: 'Avaliação no conjunto dourado, canário e reversão por configuração.',
        excelente: 'Acrescenta comparação emparelhada com teste estatístico, leitura dos itens que mudaram, separação modelo e prompt, e critérios de promoção definidos antes dos resultados.',
      },
      seguimento: [
        'O novo modelo é melhor em média mas pior numa intenção crítica. Promoves?',
        'Como farias o canário num produto com 300 conversas por dia?',
        'Quanto tempo mantinhas a versão antiga disponível?',
      ],
      sinaisAlarme: [
        'Confiar no anúncio do fornecedor como avaliação.',
        'Mudar modelo e prompt no mesmo passo sem separar os efeitos.',
        'Não ter forma de reverter sem deploy.',
      ],
      modulos: ['escolher-modelo', 'ci-cd', 'avaliacao-fundamentos'],
    },

    /* ================================================================ 07 */
    {
      id: 'p-escolher-modelo-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Quando um modelo pequeno ou destilado faz melhor o trabalho',
      enunciado:
        'Classificas 400 mil mensagens por dia em 12 intenções com um modelo médio por API. Alguém sugere destilar para um modelo pequeno. Quando é que isso faz sentido e o que custa?',
      minutos: 5,
      dica: 'Pensa em quão estreita, estável e volumosa é a tarefa.',
      resposta: [
        {
          type: 'p',
          text:
            'Faz sentido quando a tarefa é **estreita, estável e de muito volume**, como esta: um conjunto fechado de etiquetas, distribuição que muda devagar e centenas de milhares de chamadas por dia. Um modelo pequeno afinado para isto muitas vezes iguala o médio com prompt nessa tarefa, a uma fracção do custo e da latência. O que custa é passar a ter um pipeline de dados e treino para manter.',
        },
        {
          type: 'p',
          text:
            'Destilação aqui é prática, não o algoritmo original de Hinton et al. (2015) com as probabilidades do professor: uso o modelo maior para etiquetar dezenas de milhares de mensagens reais, reviso uma amostra com humanos para medir o erro do professor, e afino um modelo pequeno (com LoRA, ou até um classificador do tipo encoder, que para 12 classes pode chegar) nesses dados. Avalio no mesmo conjunto dourado anotado por humanos, por classe, e não contra as etiquetas do professor.',
        },
        {
          type: 'list',
          items: [
            '**Ganhos**: custo por chamada muito menor, latência de dezenas de milissegundos possível, e pode correr dentro da infraestrutura própria, o que resolve questões de dados.',
            '**Custos**: pipeline de etiquetagem, treino, versionamento e serving; reetiquetar e retreinar quando aparece uma intenção nova; perder a capacidade de lidar com o inesperado que o modelo geral tinha.',
            '**Riscos**: herdar os erros do professor; deriva silenciosa quando o produto muda; os termos de alguns fornecedores restringem usar as saídas para treinar modelos concorrentes, por isso leio-os antes.',
          ],
        },
        {
          type: 'p',
          text:
            'Não faço isto quando o volume é baixo (o custo de engenharia não se paga), quando a tarefa muda todos os meses, ou quando precisa de conhecimento geral e raciocínio. E mantenho o modelo médio como rede de segurança para as mensagens em que o pequeno tem baixa confiança calibrada, o que é uma cascata com o pequeno à frente.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Hinton, Vinyals e Dean (2015) — Distilling the Knowledge in a Neural Network', url: 'https://arxiv.org/abs/1503.02531' },
            { label: 'Hu et al. (2021) — LoRA', url: 'https://arxiv.org/abs/2106.09685' },
            { label: 'Hugging Face — PEFT', url: 'https://huggingface.co/docs/peft/index' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica os critérios: tarefa estreita, estável e de alto volume.',
          'Descreve o processo: professor etiqueta, humanos verificam amostra, pequeno é afinado.',
          'Avalia contra anotação humana, não contra as etiquetas do professor.',
          'Nomeia os custos de manutenção (retreino, deriva, pipeline).',
          'Diz quando não fazer e propõe rede de segurança para casos de baixa confiança.',
        ],
        fraco: '«Modelos pequenos são piores, fico com o médio» ou destila sem dizer como avalia.',
        solido: 'Explica destilação prática com etiquetas do professor, avaliação humana e ganhos de custo e latência.',
        excelente: 'Faz a conta do volume que paga a engenharia, considera um classificador encoder, avalia por classe contra humanos, prevê retreino e deriva e menciona os termos de uso das saídas.',
      },
      seguimento: [
        'Como detectas que o pequeno começou a derivar em produção?',
        'Quantos exemplos por classe pedirias ao professor?',
        'Quando é que um classificador sem LLM é a melhor resposta?',
      ],
      sinaisAlarme: [
        'Medir o pequeno contra as etiquetas do professor e chamar a isso exactidão.',
        'Ignorar o custo de manter o pipeline.',
        'Destilar uma tarefa aberta e generalista.',
      ],
      modulos: ['escolher-modelo', 'engenharia-ia'],
    },

    /* ================================================================ 08 */
    {
      id: 'p-escolher-modelo-08',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Quantizar para caber na GPU: o que se perde',
      enunciado:
        'Vais hospedar um modelo de 8 mil milhões de parâmetros e alguém propõe quantizar para 4 bits. O que é que isso faz, quanto poupas e o que perdes?',
      minutos: 5,
      dica: 'Faz a conta da memória dos pesos primeiro.',
      resposta: [
        {
          type: 'p',
          text:
            'Quantizar é guardar os pesos (e às vezes as activações ou a KV cache) com menos bits. Poupa memória e, na geração, que é limitada pela largura de banda de memória, costuma acelerar. Perde-se alguma qualidade, de forma **desigual**: línguas menos representadas e tarefas de raciocínio sofrem mais do que a média sugere.',
        },
        {
          type: 'p',
          text:
            'A conta dos pesos é parâmetros × bytes por parâmetro: 8 mil milhões em 16 bits são cerca de 16 GB; em 8 bits, cerca de 8 GB; em 4 bits, cerca de 4 a 5 GB (há escalas e alguns tensores mantidos em maior precisão). A isso soma-se a KV cache, que cresce com o comprimento do contexto e o número de pedidos em simultâneo, e é muitas vezes o que limita a concorrência. Libertar memória dos pesos deixa mais KV cache, logo mais pedidos por GPU.',
        },
        {
          type: 'table',
          head: ['Método', 'O que faz', 'Onde aparece'],
          rows: [
            ['GGUF com tipos Q4, Q5, Q8', 'Quantização por blocos para CPU e GPU de consumo', 'llama.cpp e Ollama, desenvolvimento e edge'],
            ['GPTQ, AWQ', 'Só pesos, tipicamente 4 bits, calibrados com dados', 'Servidores de inferência como o vLLM'],
            ['FP8', 'Pesos e activações em 8 bits de vírgula flutuante', 'GPUs recentes com suporte nativo'],
            ['KV cache quantizada', 'Reduz a memória por token de contexto', 'Contextos longos e muita concorrência'],
          ],
        },
        {
          type: 'p',
          text:
            'Sobre a perda: Marchisio et al. (2024) mostraram que as métricas automáticas subestimam o dano, com uma queda média de 1,7% em tarefas automáticas de japonês a corresponder a 16% em avaliação humana, e que línguas de escrita não latina e raciocínio matemático degradam mais. Modelos pequenos são em geral mais sensíveis do que grandes. Por isso não aceito «perde 1% no benchmark»: corro o meu conjunto dourado em português, o eval de tool calling e uma amostra com avaliação humana nas duas precisões, e escolho 8 bits se 4 bits falhar o limiar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Marchisio et al. (2024) — How Does Quantization Affect Multilingual LLMs?', url: 'https://arxiv.org/abs/2407.03211' },
            { label: 'Lin et al. (2023) — AWQ', url: 'https://arxiv.org/abs/2306.00978' },
            { label: 'Frantar et al. (2022) — GPTQ', url: 'https://arxiv.org/abs/2210.17323' },
            { label: 'vLLM — documentação (quantização)', url: 'https://docs.vllm.ai/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Calcula a memória dos pesos a partir de parâmetros e bits.',
          'Menciona a KV cache como segundo consumidor de memória e o efeito na concorrência.',
          'Explica que a perda é desigual por língua e tarefa e que métricas automáticas a subestimam.',
          'Nomeia pelo menos dois métodos ou formatos (GGUF, GPTQ, AWQ, FP8).',
          'Decide com avaliação própria nas duas precisões, incluindo humana.',
        ],
        fraco: '«Quantizar não perde nada» ou «perde muito», sem números de memória nem método de avaliação.',
        solido: 'Faz a conta de memória, conhece os formatos e avalia no conjunto próprio.',
        excelente: 'Acrescenta a KV cache como limite da concorrência, a perda desigual em línguas e raciocínio com evidência publicada, e decide com avaliação humana em português.',
      },
      seguimento: [
        'Porque é que a geração é limitada pela largura de banda de memória e não pela computação?',
        'Que impacto tem a quantização no tool calling?',
        'Quando é que preferias um modelo maior em 4 bits a um menor em 16 bits?',
      ],
      sinaisAlarme: [
        'Não saber estimar a memória dos pesos.',
        'Confiar num benchmark em inglês para decidir em português.',
        'Esquecer a KV cache no dimensionamento.',
      ],
      modulos: ['escolher-modelo', 'custo-escala'],
    },

    /* ================================================================ 09 */
    {
      id: 'p-escolher-modelo-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Desenha a camada de routing de modelos de uma plataforma',
      enunciado:
        'Cinco equipas de produto chamam modelos directamente, cada uma com a sua chave e o seu código. Pedem-te uma camada comum de routing de modelos. Desenha-a.',
      contexto:
        'SaaS B2B multi-tenant em Portugal. Pico de 40 pedidos por segundo à plataforma. Três destinos: duas APIs comerciais com processamento na UE e um vLLM interno com um modelo open-weights pequeno. 30% dos tenants têm cláusula «dados só na UE» e 5% «sem terceiros» (só modelo interno). SLO de chat: TTFT p95 abaixo de 1,5 s. Orçamento mensal por equipa. Uma pessoa e meia para operar a plataforma.',
      minutos: 18,
      dica: 'As equipas devem pedir uma capacidade, não um modelo.',
      resposta: [
        {
          type: 'p',
          text:
            'Faço uma camada em que as equipas pedem uma **rota com nome** («chat-suporte», «extraccao-faturas»), e a camada decide fornecedor, modelo, versão e variante de prompt a partir de configuração versionada, aplicando política de dados por tenant, orçamento por equipa e fallback. O modelo deixa de estar no código das equipas e passa a ser uma decisão operacional reversível.',
        },
        {
          type: 'h',
          text: 'Clarificação e números',
        },
        {
          type: 'p',
          text:
            'Pergunto se é biblioteca ou serviço, se há streaming (há, no chat) e quem é dono dos prompts. Com 40 pedidos por segundo no pico, a camada em si é leve; o peso está nas chamadas a jusante. O que dimensiono é a concorrência: com respostas de vários segundos em streaming, são algumas centenas de ligações abertas, o que um serviço assíncrono aguenta numa ou duas réplicas, com mais uma para redundância. A latência que a camada acrescenta tem de ficar em milissegundos para não comer o orçamento de TTFT.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Camada de routing de modelos',
            caption: 'A política corre antes do router: um tenant «sem terceiros» nunca chega a ter uma API externa como opção.',
            cols: 6,
            rows: 4,
            zones: [
              { id: 'zgw', label: 'Camada de routing', col: 1, row: 0, colSpan: 3, rowSpan: 4, tone: 'service' },
              { id: 'zext', label: 'Destinos', col: 4, row: 0, colSpan: 2, rowSpan: 3, tone: 'external' },
            ],
            nodes: [
              { id: 'eq', label: 'Equipas', sub: 'pedem uma rota', col: 0, row: 1, kind: 'user' },
              { id: 'pol', label: 'Política', sub: 'tenant, região, orçamento', col: 1, row: 1, kind: 'decision' },
              { id: 'cfg', label: 'Configuração', sub: 'rotas versionadas', col: 1, row: 3, kind: 'data' },
              { id: 'rt', label: 'Router', sub: 'escalão, fallback, breaker', col: 2, row: 1, kind: 'service' },
              { id: 'ad', label: 'Adaptadores', sub: 'formato e prompt por destino', col: 3, row: 1, kind: 'service' },
              { id: 'obs', label: 'Traços e custos', sub: 'versão, tokens, tenant', col: 3, row: 3, kind: 'data' },
              { id: 'a', label: 'API A', sub: 'UE', col: 4, row: 0, kind: 'external' },
              { id: 'b', label: 'API B', sub: 'UE, reserva', col: 5, row: 1, kind: 'external' },
              { id: 'v', label: 'vLLM interno', sub: 'pequeno', col: 4, row: 2, kind: 'model' },
            ],
            edges: [
              { from: 'eq', to: 'pol' },
              { from: 'pol', to: 'rt' },
              { from: 'cfg', to: 'rt', style: 'dashed' },
              { from: 'rt', to: 'ad' },
              { from: 'ad', to: 'a' },
              { from: 'ad', to: 'b', style: 'dashed', label: 'fallback' },
              { from: 'ad', to: 'v' },
              { from: 'ad', to: 'obs', style: 'dashed' },
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Rotas, não modelos', text: 'Cada rota tem destino principal, fallback, versão fixada, variante de prompt por destino, limites de tokens e timeout. Mudar de modelo é um PR à configuração, com eval associado.' },
            { title: 'Política antes do router', text: 'A partir do tenant, a política filtra destinos permitidos (UE, sem terceiros) e verifica orçamento. Um pedido sem destino permitido falha de forma explícita, não cai num destino qualquer.' },
            { title: 'Router e escalões', text: 'Regras simples primeiro (rota, comprimento, intenção já classificada pela equipa); um classificador só se uma rota o justificar com números. Circuit breaker por destino e fallback apenas em 5xx, 429 e timeouts.' },
            { title: 'Adaptadores', text: 'Traduzem mensagens, ferramentas e saída estruturada para cada API; cada adaptador tem testes de contrato contra o destino real, correndo diariamente.' },
            { title: 'Orçamento e limites', text: 'Token bucket por equipa e por tenant, contagem de custo por resposta; acima de 80% do orçamento, alerta; acima de 100%, a rota degrada para o escalão definido ou recusa, conforme configuração.' },
          ],
        },
        {
          type: 'p',
          text:
            'Avaliação: cada rota tem o seu conjunto de avaliação, dono pela equipa, e a plataforma corre-o em cada mudança de configuração e mensalmente contra o fallback. As métricas da plataforma são TTFT acrescentado pela camada, taxa de fallback por destino, custo por equipa e por tenant, e rejeições por política. Cada resposta leva no traço destino, versão resolvida, variante de prompt, tokens e custo.',
        },
        {
          type: 'p',
          text:
            'Trade-offs: serviço central dá controlo e auditoria mas é um ponto de falha e um salto de rede, por isso corre com redundância e as equipas têm timeout próprio; uma biblioteca evitaria o salto mas espalha chaves e políticas por cinco serviços, e com 30% de tenants com restrição de dados prefiro o ponto único de controlo. Fica para depois: cache semântica, routing aprendido e auto-hospedar mais modelos. Com uma pessoa e meia, cada destino novo é custo de operação, por isso começo com os três e acrescento quando uma rota provar que precisa.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Ong et al. (2024) — RouteLLM', url: 'https://arxiv.org/abs/2406.18665' },
            { label: 'OpenTelemetry — convenções semânticas para GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Martin Fowler — Circuit Breaker', url: 'https://martinfowler.com/bliki/CircuitBreaker.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'As equipas pedem rotas ou capacidades com nome; o modelo e a versão vivem em configuração versionada.',
          'A política de dados por tenant filtra destinos antes do routing e falha de forma explícita.',
          'Inclui fallback com circuit breaker, variante de prompt por destino e testes de contrato dos adaptadores.',
          'Controla orçamento por equipa e tenant com comportamento definido ao esgotar.',
          'Define avaliação por rota, métricas da plataforma e o traço com versão e custo.',
          'Discute serviço central versus biblioteca e o custo operacional para a equipa disponível.',
        ],
        fraco: 'Um proxy que troca o URL do fornecedor, sem política de dados, avaliação nem orçamento.',
        solido: 'Rotas configuráveis, política por tenant, fallback, orçamento e observabilidade por chamada.',
        excelente: 'Acrescenta a ordem política antes do router, testes de contrato diários, avaliação do fallback, decisão justificada entre serviço e biblioteca, e um plano proporcional à equipa que vai operar.',
      },
      seguimento: [
        'Como deixas uma equipa experimentar um modelo novo sem afectar as outras?',
        'Onde guardas os prompts: na plataforma ou nas equipas?',
        'O que fazes quando a camada de routing fica indisponível?',
      ],
      sinaisAlarme: [
        'Deixar as equipas escolherem o modelo por nome no código.',
        'Fallback que ignora a restrição de dados do tenant.',
        'Desenhar routing aprendido antes de ter avaliação por rota.',
      ],
      modulos: ['escolher-modelo', 'observabilidade-llmops', 'custo-escala'],
    },

    /* ================================================================ 10 */
    {
      id: 'p-escolher-modelo-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'A qualidade caiu e ninguém fez deploy',
      enunciado:
        'Desde terça, a taxa de extracções que falham a validação passou de 0,3% para 4%, as respostas ficaram mais longas e o tom mudou. Não houve deploy do vosso lado. Como investigas?',
      contexto:
        'Serviço de extracção de dados de faturas e de resposta a fornecedores numa empresa de logística. Chama um modelo médio por API usando um alias do tipo «-latest» definido numa variável de ambiente. Cerca de 20 mil pedidos por dia, temperatura 0, saída estruturada sem modo estrito. Os traços guardam prompt, resposta e a resposta HTTP completa. Há um conjunto dourado de 250 faturas.',
      minutos: 10,
      dica: 'O que diz o campo de modelo na resposta da API, antes e depois de terça?',
      resposta: [
        {
          type: 'p',
          text:
            'A hipótese mais provável é que **o alias avançou para uma versão nova** do modelo: «sem deploy do nosso lado» não significa «sem mudança», e um alias é uma dependência sem versão fixada. Confirmo pelo modelo resolvido que vem em cada resposta, fixo a versão anterior se ainda existir, e depois trato a nova como uma migração.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Ler o modelo resolvido', text: 'As respostas da API trazem o identificador do modelo que respondeu. Agrupo os traços por esse campo e por dia: se mudou na terça e a taxa de falha acompanha a mudança, a causa está quase confirmada em minutos.' },
            { title: 'Excluir as outras mudanças', text: 'Verifico versões de dependências (uma actualização do SDK pode mudar valores por omissão, como max_tokens), alterações de prompt fora do deploy (prompts em base de dados ou feature flags), e se entrou um cliente novo com faturas de formato diferente. Comparo a taxa por fornecedor de faturas.' },
            { title: 'Reproduzir', text: 'Corro as 250 faturas do conjunto dourado com o identificador antigo fixado e com o novo, mesmo prompt e mesmos parâmetros. Se a diferença se reproduz, é o modelo. Se não se reproduz, olho para o tráfego.' },
            { title: 'Se o id não mudou', text: 'Mesmo com id fixo, a infraestrutura do fornecedor (routing, classificadores, amostragem) pode mudar o comportamento observável, como a documentação da Anthropic reconhece. Abro um pedido ao suporte com exemplos reproduzíveis e, entretanto, mitigo do meu lado.' },
          ],
        },
        {
          type: 'p',
          text:
            'Correcção imediata: fixo o identificador da versão anterior por configuração (sem deploy de código), o que repõe a taxa enquanto essa versão não for retirada. Para as falhas de validação, ligo o modo estrito de saída estruturada se o modelo o suportar e passo a validar com retry limitado. Depois avalio a versão nova pelo processo de migração, com ajuste de prompt para o formato e o comprimento.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'O serviço recusa arrancar com um alias móvel na configuração de produção; o traço regista o modelo resolvido de cada resposta; uma corrida diária de um subconjunto do dourado contra a configuração de produção alerta se a qualidade descer; e há alertas sobre taxa de validação falhada e comprimento médio da resposta, que teriam disparado na terça de manhã.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: '«Temperatura 0 é determinístico, por isso o modelo não mudou»',
          text: 'Temperatura 0 reduz a variação mas não garante resultados idênticos entre chamadas, e muito menos entre versões. Comparar a mesma entrada antes e depois não prova nada sem o identificador do modelo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — IDs de modelo, aliases e snapshots', url: 'https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions' },
            { label: 'OpenAI — modelos e snapshots', url: 'https://platform.openai.com/docs/models' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Suspeita do alias como dependência não fixada e confirma pelo modelo resolvido nas respostas.',
          'Exclui causas concorrentes: SDK, prompts fora do deploy, mudança de tráfego.',
          'Reproduz no conjunto dourado com as duas versões fixadas.',
          'Mitiga por configuração fixando a versão anterior e trata a nova como migração.',
          'Instala prevenção: recusa de aliases, versão no traço, avaliação diária e alertas de comprimento e validação.',
        ],
        fraco: 'Mexe no prompt até a taxa baixar sem saber o que mudou.',
        solido: 'Confirma a mudança de versão pelos traços, fixa a anterior e reproduz no conjunto dourado.',
        excelente: 'Acrescenta a hipótese de mudança de infraestrutura com id fixo, controlo de SDK e tráfego, e um sistema de prevenção que teria detectado a mudança no próprio dia.',
      },
      seguimento: [
        'E se a versão anterior já tiver sido retirada?',
        'Que subconjunto do dourado corrias todos os dias e quanto custa?',
        'Como distinguias uma mudança do modelo de uma mudança no tipo de faturas recebidas?',
      ],
      sinaisAlarme: [
        'Assumir que sem deploy nada mudou.',
        'Começar a reescrever o prompt antes de saber a causa.',
        'Não registar a versão do modelo nos traços.',
      ],
      modulos: ['escolher-modelo', 'observabilidade-llmops', 'apis-de-modelos'],
    },
  ],
};
