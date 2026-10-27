import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = {
  id: 'chunking-ingestao',
  numero: 11,
  bloco: 'rag',
  titulo: 'Ingestão e chunking',
  resumo:
    'Como se parte, enriquece, deduplica e mantém actualizado um corpus para RAG. É perguntado porque a maioria das falhas de RAG em produção nasce na ingestão, não no modelo, e porque separa quem fez um protótipo de quem manteve um índice vivo durante meses.',
  icon: '✂️',
  modulos: ['ingestao-chunking', 'rag-avancado'],
  essencial: [
    'O índice só devolve o que a ingestão lá pôs: um chunk sem a condição ou sem a data de vigência produz uma resposta errada com uma citação «correcta».',
    'Estratégias por ordem de custo: tamanho fixo, frases, recursivo (separadores hierárquicos), estrutural (títulos, cláusulas, tabelas), semântico (cortes por distância de embeddings).',
    'Tamanho e sobreposição escolhem-se medindo recall@k e context recall ao nível da passagem num conjunto dourado, não por regra de bolso.',
    'Pesquisar pequeno, entregar grande: parent-child separa a unidade que se vectoriza da unidade que vai para o prompt.',
    'Cada chunk herda do documento: id, fonte, título/caminho, data, versão, valido_de/valido_ate, idioma e ACL. A ACL filtra na consulta, nunca depois da geração.',
    'Contextual retrieval (Anthropic, 2024): 50–100 tokens de contexto por chunk baixaram a falha de recuperação top-20 de 5,7% para 3,7% (só embeddings) e 2,9% (com BM25).',
    'Deduplicação em dois níveis: SHA-256 do texto normalizado para exactos; MinHash + LSH sobre shingles para quase-duplicados.',
    'Ingestão idempotente: ids determinísticos (doc_id + ordem), hash por chunk, upsert do que mudou e apagar o que desapareceu; reprocessar o mesmo input não muda nada.',
    'Apagar na fonte tem de apagar no índice: sem tombstones ou reconciliação periódica, documentos revogados continuam a ser citados.',
    'Versões: guarda-se o histórico com intervalo de vigência e filtra-se pela data relevante (hoje, ou a data do contrato do cliente), não «a mais recente».',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-chunking-ingestao-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Cinco formas de partir um documento e quando usar cada uma',
      enunciado:
        'Que estratégias de chunking conheces? Para cada uma, diz-me em que tipo de documento a usarias e onde ela falha.',
      minutos: 5,
      dica: 'Ordena-as pelo que cada uma sabe sobre o documento: nada, frases, separadores, estrutura, significado.',
      resposta: [
        {
          type: 'p',
          text: 'Uso cinco, por ordem de quanto sabem do documento: **tamanho fixo**, **por frases**, **recursivo**, **estrutural** e **semântico**. O ponto de partida razoável para texto corrido é o recursivo; para documentos com estrutura (políticas, contratos, manuais) é o estrutural; o semântico só entra quando medi que ganha.',
        },
        {
          type: 'table',
          head: ['Estratégia', 'Como corta', 'Bom para', 'Onde falha'],
          rows: [
            ['Tamanho fixo', 'N tokens ou caracteres, com sobreposição', 'Logs, transcrições sem pontuação, baseline', 'Corta a meio de frases, tabelas e condições'],
            ['Frases', 'Agrupa frases até um limite', 'Artigos, FAQ curtas', 'Depende do segmentador; abreviaturas e listas confundem-no'],
            ['Recursivo', 'Tenta separadores hierárquicos (parágrafo, linha, espaço) até caber', 'Texto corrido genérico; o omisso do LangChain', 'Não sabe o que é uma cláusula nem uma tabela'],
            ['Estrutural', 'Por títulos, secções, cláusulas, células de tabela', 'Políticas, contratos, documentação técnica em Markdown/HTML', 'Secções desiguais: uma de 40 tokens, outra de 6000; precisa de fallback recursivo'],
            ['Semântico', 'Corta onde a distância de embeddings entre frases consecutivas salta', 'Texto longo sem estrutura que muda de tema', 'Caro na ingestão, não determinístico entre versões do modelo, ganhos pequenos e inconsistentes'],
          ],
        },
        {
          type: 'p',
          text: 'Na prática combino: estrutural primeiro (cada secção é candidata a chunk, com o caminho de títulos nos metadados) e recursivo dentro das secções que passam do limite. O `RecursiveCharacterTextSplitter` do LangChain usa por omissão os separadores `["\\n\\n", "\\n", " ", ""]` e mede em caracteres; para medir em tokens uso `from_tiktoken_encoder` ou um `length_function` com o tokenizer do modelo de embeddings.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O semântico não é automaticamente melhor',
          text: 'É a resposta que soa sofisticada, mas custa um embedding por frase na ingestão e muda os cortes quando mudas de modelo. Só o adopto se bater o estrutural+recursivo no meu conjunto dourado com margem fora do ruído.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — text splitters', url: 'https://docs.langchain.com/oss/python/integrations/splitters/index' },
            { label: 'LangChain — RecursiveCharacterTextSplitter', url: 'https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia pelo menos quatro estratégias e o critério de corte de cada uma.',
          'Associa cada estratégia a um tipo de documento concreto.',
          'Diz onde o tamanho fixo e o recursivo falham (tabelas, condições partidas).',
          'Propõe combinar estrutural com recursivo como fallback para secções longas.',
          'Diz que a escolha se valida medindo, não por preferência.',
        ],
        fraco: 'Conhece só «partir em 500 tokens com sobreposição» e não sabe dizer quando isso falha.',
        solido: 'Descreve as cinco, associa-as a tipos de documento e propõe estrutural com fallback recursivo.',
        excelente: 'Acrescenta o custo e o não-determinismo do semântico, a diferença entre medir em caracteres e em tokens do modelo de embeddings, e diz como decidiria com um conjunto dourado.',
      },
      seguimento: [
        'Como tratas uma secção de 6000 tokens que é uma única tabela?',
        'Medes o tamanho em caracteres ou em tokens? Porquê?',
        'O que muda quando o corpus é código-fonte?',
      ],
      sinaisAlarme: [
        'Dizer que o chunking semântico é sempre o melhor.',
        'Não conseguir dar um exemplo de documento onde o tamanho fixo parte a informação.',
        'Escolher a estratégia sem falar de avaliação.',
      ],
      modulos: ['ingestao-chunking', 'langchain-rag'],
    },
    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-chunking-ingestao-02',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Qual é o tamanho de chunk certo? Como escolhes tamanho e sobreposição',
      enunciado:
        'Qual é o tamanho de chunk certo? E a sobreposição, quanto pões? Quero saber como chegavas aos números, não só os números.',
      minutos: 8,
      dica: 'O que está em tensão é a precisão do embedding contra a completude do que chega ao modelo.',
      resposta: [
        {
          type: 'p',
          text: 'Não há um tamanho certo universal: **escolho-o medindo** num conjunto dourado com duas métricas — recall@k ao nível do documento e *context recall* ao nível da passagem — e com o custo em tokens por pergunta. Como ponto de partida uso algo entre 256 e 1024 tokens com 10–20% de sobreposição, e depois varro.',
        },
        {
          type: 'h',
          text: 'O que está em tensão',
        },
        {
          type: 'compare',
          left: {
            title: 'Chunks pequenos',
            items: [
              'O embedding representa uma ideia só: a semelhança com a pergunta é mais nítida.',
              'Mais chunks no índice: mais memória e mais vectores no ANN.',
              'Perdem contexto: «até 24 horas» sem dizer de quê.',
              'A resposta precisa de vários chunks, e nem todos entram no top-k.',
            ],
          },
          right: {
            title: 'Chunks grandes',
            items: [
              'Contêm a regra inteira com as excepções.',
              'O embedding é a média de vários temas e dilui-se.',
              'Cada chunk no contexto custa mais tokens; k tem de baixar.',
              'Mais ruído para o modelo filtrar.',
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Conjunto dourado ao nível da passagem', text: 'Cem a duzentas perguntas reais com a passagem que responde anotada (não só o documento). Sem isto, chunks pequenos parecem sempre melhores no recall de documento.' },
            { title: 'Varrimento', text: 'Por exemplo 256, 512, 1024 tokens, sobreposição 0 e ~15%, com o mesmo modelo de embeddings e o mesmo k. Registo recall@k, MRR, context recall e tokens médios no contexto.' },
            { title: 'Leitura de amostras', text: 'Abro 20 chunks ao acaso de cada configuração: se vejo tabelas partidas ou condições separadas da regra, o problema é a estratégia, não o tamanho.' },
            { title: 'Decisão com custo', text: 'Escolho a configuração com melhor context recall dentro do orçamento de tokens; se o melhor recall vem de chunks pequenos e a completude de grandes, passo a parent-child em vez de escolher um meio-termo.' },
          ],
        },
        {
          type: 'p',
          text: 'Sobre a sobreposição: serve para que uma frase que caia na fronteira apareça inteira em pelo menos um chunk. Custa espaço de forma linear (15% de sobreposição é ~15% mais tokens indexados e vectorizados) e cria quase-duplicados no top-k, que gastam lugares no contexto. Com chunking estrutural por secção a sobreposição é quase sempre desnecessária, porque a fronteira já é natural.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Medir ao nível errado',
          text: 'Se o dourado só anota o documento, reduzir o chunk sobe o recall artificialmente: é mais fácil acertar num pedaço qualquer do documento certo. A completude da resposta pode descer ao mesmo tempo.',
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
          'Recusa dar um número universal e diz que escolhe medindo.',
          'Nomeia a tensão entre nitidez do embedding e completude do contexto.',
          'Propõe métricas ao nível da passagem, não só do documento.',
          'Quantifica o custo da sobreposição (tokens indexados, duplicados no top-k).',
          'Sugere parent-child quando as duas métricas puxam em sentidos opostos.',
        ],
        fraco: 'Diz «512 com 50 de sobreposição» porque é o que aparece nos tutoriais, sem método.',
        solido: 'Descreve o varrimento com um conjunto dourado e as métricas, e explica o custo da sobreposição.',
        excelente: 'Aponta a armadilha da anotação ao nível do documento, junta o custo em tokens por pergunta à decisão e resolve o conflito com parent-child em vez de um meio-termo.',
      },
      seguimento: [
        'O teu modelo de embeddings trunca a 512 tokens. Que implicações tem para o chunking?',
        'Como farias o varrimento sem conjunto dourado anotado?',
        'Tamanho igual para todas as fontes ou por tipo de documento?',
      ],
      sinaisAlarme: [
        'Afirmar um tamanho «óptimo» sem dizer como foi medido.',
        'Ignorar que o modelo de embeddings tem um limite de tokens de entrada.',
        'Pôr sobreposição de 50% «para não perder nada».',
      ],
      modulos: ['ingestao-chunking', 'avaliar-rag'],
    },
    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-chunking-ingestao-03',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Tabelas, listas e PDFs digitalizados na ingestão',
      enunciado:
        'Metade do corpus são PDFs: alguns gerados por Word, outros digitalizados, muitos com tabelas de tarifários. Como os transformas em chunks que servem para responder?',
      minutos: 5,
      dica: 'Antes do chunking há uma pergunta: o PDF tem camada de texto?',
      resposta: [
        {
          type: 'p',
          text: 'O trabalho decisivo acontece **antes** do chunking: extrair com estrutura (títulos, listas, tabelas) para um formato intermédio como Markdown, e só depois partir pela estrutura. Um PDF é instruções de desenho, não texto; se o extractor perde a estrutura, nenhum chunker a recupera.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Classificar o PDF', text: 'Verifico se há camada de texto e se ela é plausível (proporção de caracteres válidos, palavras de dicionário). Sem camada ou com lixo, vai para OCR; com camada boa, extracção directa, que é mais barata e mais fiel.' },
            { title: 'Extrair com layout', text: 'Uso um extractor que detecte colunas, cabeçalhos e rodapés repetidos e tabelas. Remover cabeçalho e rodapé de página evita que «Página 3 de 12 — Confidencial» apareça em todos os chunks e polua os embeddings.' },
            { title: 'Tabelas como unidades', text: 'Uma tabela nunca se parte a meio sem repetir o cabeçalho. Se é pequena, é um chunk inteiro com a legenda e o título da secção. Se é grande, parto por grupos de linhas e repito o cabeçalho em cada grupo, ou converto cada linha numa frase («Plano Mais 20: 20 GB, 1500 MT/mês»).' },
            { title: 'Listas com a frase que as introduz', text: '«Estão excluídos:» seguido de seis alíneas tem de ficar junto: um chunk só com as alíneas 4 a 6 perde a palavra «excluídos» e inverte o sentido.' },
            { title: 'OCR com controlo de qualidade', text: 'Guardo a confiança por página do OCR nos metadados, mando as páginas de baixa confiança para revisão amostral, e trato números com cuidado: um 5 lido como 3 numa franquia é um erro caro e invisível para o retriever.' },
          ],
        },
        {
          type: 'p',
          text: 'Para tabelas muito consultadas por valores exactos (tarifas, prazos), considero não as pôr só no índice vectorial: extraio-as para uma tabela relacional e exponho-as como ferramenta. Pesquisa vectorial é boa a encontrar a tabela, má a ler a célula certa.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Validação da conversão',
          text: 'Em produção corro verificações automáticas por documento: número de tabelas detectadas, chunks com tabela sem cabeçalho, proporção de caracteres não alfabéticos, páginas sem texto. Cada fonte nova tem revisão humana das primeiras conversões.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — document loaders (PDF e outros)', url: 'https://docs.langchain.com/oss/python/integrations/document_loaders/index' },
            { label: 'Anthropic — suporte a PDF na API', url: 'https://platform.claude.com/docs/en/build-with-claude/pdf-support' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue PDF com camada de texto de PDF digitalizado e encaminha para OCR só quando necessário.',
          'Diz que tabelas não se partem sem repetir o cabeçalho (ou são linearizadas).',
          'Mantém listas junto da frase que as introduz.',
          'Remove cabeçalhos e rodapés repetidos de página.',
          'Propõe controlo de qualidade da extracção (confiança do OCR, amostras, alarmes).',
        ],
        fraco: 'Usa um loader genérico de PDF, parte o texto em 500 tokens e não sabe o que acontece às tabelas.',
        solido: 'Extrai para Markdown com estrutura, trata tabelas e listas como unidades e encaminha digitalizações para OCR.',
        excelente: 'Acrescenta métricas de qualidade da extracção, revisão amostral por fonte e a alternativa de mover dados tabulares exactos para uma ferramenta estruturada.',
      },
      seguimento: [
        'Como detectarias automaticamente que uma tabela foi mal extraída?',
        'Usarias um modelo multimodal para extrair tabelas? Com que custo e controlo?',
        'O que guardas para poder citar a página do PDF original?',
      ],
      sinaisAlarme: [
        'Não saber que um PDF digitalizado não tem texto.',
        'Partir tabelas por tamanho fixo.',
        'Confiar no OCR sem qualquer verificação em documentos com valores monetários.',
      ],
      modulos: ['ingestao-chunking'],
    },
    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-chunking-ingestao-04',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'Que metadados guarda cada chunk e porquê',
      enunciado:
        'Além do texto e do vector, o que guardas em cada chunk? Dá-me a lista e para que serve cada campo.',
      minutos: 4,
      dica: 'Pensa no que precisas para filtrar, para citar, para actualizar e para depurar.',
      resposta: [
        {
          type: 'p',
          text: 'Cada chunk **herda os metadados do documento** e acrescenta os seus. Organizo-os por função: filtrar (ACL, vigência, idioma, produto), citar (fonte, título, URL, página ou âncora), actualizar (doc_id, versão, hash) e depurar (versão do pipeline e do modelo de embeddings).',
        },
        {
          type: 'table',
          head: ['Campo', 'Para quê'],
          rows: [
            ['doc_id, chunk_id, ordem', 'Ids determinísticos para upsert e apagamento; ordem para reconstruir vizinhos e o pai'],
            ['fonte, url, titulo, caminho de títulos', 'Citação legível e cabeçalho contextual'],
            ['pagina ou ancora', 'Levar o utilizador ao sítio exacto do original'],
            ['versao, valido_de, valido_ate, vigente', 'Filtrar pela política aplicável na data relevante'],
            ['acl (grupos, tenant)', 'Filtro obrigatório na consulta: o utilizador só recupera o que pode ler'],
            ['idioma, produto, tipo de documento', 'Filtros de negócio e encaminhamento'],
            ['hash do conteúdo', 'Ingestão idempotente e deduplicação'],
            ['modelo de embeddings e versão do pipeline', 'Saber o que reindexar quando algo muda'],
          ],
        },
        {
          type: 'p',
          text: 'A ACL é o campo que mais importa acertar. O filtro tem de ser aplicado **dentro da consulta** ao índice, com a identidade do utilizador vinda do token de autenticação e não do prompt. Filtrar depois de recuperar tem dois problemas: o top-k pode ficar vazio, e qualquer erro no código deixa passar texto que o utilizador não podia ver.',
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Filtros restritivos com ANN',
          text: 'Com HNSW, um filtro que só deixa passar 1% dos vectores pode devolver menos do que k resultados se o motor filtrar depois da travessia do grafo. Verifico como o motor que uso trata isto (o pgvector tem iterative index scans desde a 0.8.0; o Qdrant usa índices de payload) e testo com o filtro mais restritivo real.',
        },
        {
          type: 'refs',
          items: [
            { label: 'pgvector — filtragem e iterative index scans', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Qdrant — filtering', url: 'https://qdrant.tech/documentation/concepts/filtering/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que os metadados do documento são herdados por cada chunk.',
          'Inclui ACL e diz que se aplica na consulta, não depois da geração.',
          'Inclui campos de vigência ou versão para filtrar políticas aplicáveis.',
          'Inclui ids determinísticos e hash para actualização idempotente.',
          'Menciona campos para citação (fonte, página ou âncora).',
        ],
        fraco: 'Guarda só o texto e o nome do ficheiro.',
        solido: 'Dá a lista organizada por função, com ACL aplicada na consulta e campos de vigência.',
        excelente: 'Acrescenta o problema de filtros restritivos com ANN, a identidade vinda do token e não do prompt, e a versão do modelo de embeddings para reindexações.',
      },
      seguimento: [
        'Como propagas uma mudança de permissões de um documento para os seus 300 chunks?',
        'Onde guardas a ACL se o índice vectorial não suporta filtros?',
        'Que metadados pões no texto vectorizado e quais ficam só no filtro?',
      ],
      sinaisAlarme: [
        'Filtrar permissões no prompt («não mostres documentos confidenciais»).',
        'Não guardar nada que permita apagar os chunks de um documento.',
      ],
      modulos: ['ingestao-chunking', 'bases-vectoriais', 'guardrails-seguranca'],
    },
    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-chunking-ingestao-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Cabeçalho contextual com o título ou contexto gerado por LLM',
      enunciado:
        'Um chunk diz só «O prazo é de 24 horas.» e ninguém o encontra. Já ouviste falar de contextual retrieval? Fazias isso ou algo mais barato?',
      minutos: 7,
      dica: 'Há uma versão determinística e grátis e uma versão com uma chamada ao modelo por chunk.',
      resposta: [
        {
          type: 'p',
          text: 'Começava pela versão barata e determinística: **pôr o caminho de títulos à frente do texto** que se vectoriza e indexa no BM25 («Política de reembolsos › Carteiras móveis › Prazos»). Só passava para contexto gerado por LLM se o conjunto dourado mostrasse que a versão barata não chega, porque esse custa uma chamada por chunk e torna a ingestão dependente de um modelo.',
        },
        {
          type: 'p',
          text: 'O *contextual retrieval* que a Anthropic publicou em 2024 pede a um modelo, com o documento inteiro no prompt, uma frase de 50 a 100 tokens que situe o chunk, e junta-a ao chunk antes do embedding e do índice BM25. Nos dados deles, a taxa de falhas de recuperação no top-20 desceu de 5,7% para 3,7% só com embeddings contextuais, para 2,9% juntando BM25 contextual, e para 1,9% com re-ranking por cima. Usaram prompt caching para que o documento não seja cobrado a preço cheio em cada chunk.',
        },
        {
          type: 'table',
          head: ['', 'Cabeçalho com títulos', 'Contexto gerado por LLM'],
          rows: [
            ['Custo de ingestão', 'Zero', 'Uma chamada por chunk, com o documento no prompt (mitigado com prompt caching)'],
            ['Determinismo', 'Total: mesmo input, mesmo chunk', 'Varia com o modelo e a versão; reindexar muda os textos'],
            ['Quando ajuda', 'Documentos com títulos bons', 'Documentos sem estrutura útil, ou onde o contexto está no corpo (o nome da empresa e o trimestre num relatório)'],
            ['Risco', 'Títulos genéricos («Notas») não ajudam', 'O contexto gerado pode estar errado e passa a ser pesquisável'],
          ],
        },
        {
          type: 'p',
          text: 'Em produção, se adoptar a versão gerada, guardo o contexto gerado separado do texto original (para mostrar ao utilizador só o original), registo o modelo e o prompt usados nos metadados, e meço com o mesmo dourado antes e depois. O custo calcula-se: número de chunks × (tokens do documento em cache + instruções + ~100 tokens de saída).',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Citar o contexto gerado',
          text: 'Se o texto que vai para o prompt inclui o contexto gerado, o modelo pode citar como facto do documento uma frase que foi o LLM de ingestão a escrever. Envio o original e uso o contexto só para recuperar.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval' },
            { label: 'Anthropic — prompt caching', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Identifica o problema como chunk sem contexto do documento.',
          'Propõe primeiro o cabeçalho determinístico com títulos.',
          'Descreve o contextual retrieval correctamente (frase gerada por chunk, aplicada a embeddings e BM25).',
          'Nomeia o custo (uma chamada por chunk) e a mitigação com prompt caching.',
          'Diz que a decisão se toma com o conjunto dourado.',
        ],
        fraco: 'Sugere aumentar o chunk ou trocar de modelo de embeddings sem perceber o problema.',
        solido: 'Propõe cabeçalho com títulos, conhece o contextual retrieval e o seu custo.',
        excelente: 'Cita a ordem de grandeza dos ganhos publicados, separa o contexto gerado do texto mostrado e citado, e calcula o custo de ingestão a partir do número de chunks.',
      },
      seguimento: [
        'Como calcularias o custo de aplicar isto a 3 milhões de chunks?',
        'E quando o documento é maior do que a janela do modelo de ingestão?',
        'O que acontece ao índice quando trocas o modelo que gera o contexto?',
      ],
      sinaisAlarme: [
        'Aplicar contextual retrieval a todo o corpus sem medir antes.',
        'Não saber que a técnica custa uma chamada ao modelo por chunk.',
        'Mostrar ao utilizador o contexto gerado como se fosse o documento.',
      ],
      modulos: ['ingestao-chunking', 'rag-avancado'],
    },
    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-chunking-ingestao-06',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Deduplicar: duplicados exactos e quase-duplicados',
      enunciado:
        'O corpus tem a mesma FAQ em três sistemas, com pequenas diferenças. Porque é que os duplicados são um problema para RAG e como os detectas?',
      minutos: 5,
      dica: 'O que acontece ao top-5 quando três dos cinco são o mesmo texto?',
      resposta: [
        {
          type: 'p',
          text: 'Duplicados **gastam lugares no top-k** com a mesma informação, empurram para fora a passagem complementar e, quando as cópias divergem («5 dias» numa, «7 dias» noutra), põem contradições no contexto. Detecto em dois níveis: hash do texto normalizado para exactos, MinHash com LSH sobre shingles para quase-duplicados.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Hash exacto após normalização e Jaccard de shingles para quase-duplicados',
          code: `import hashlib, re, unicodedata

def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFC", texto).lower()
    return re.sub(r"\\s+", " ", texto).strip()

def hash_exacto(texto: str) -> str:
    return hashlib.sha256(normalizar(texto).encode()).hexdigest()

def shingles(texto: str, n: int = 5) -> set[str]:
    palavras = normalizar(texto).split()
    if len(palavras) < n:
        return {" ".join(palavras)}
    return {" ".join(palavras[i:i + n]) for i in range(len(palavras) - n + 1)}

def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a | b else 1.0

v1 = "O reembolso é feito em até 5 dias úteis após a confirmação da devolução pelo armazém central."
v2 = "O  reembolso é feito em até 5 dias úteis após a confirmação da devolução pelo armazém central.\\n"
v3 = "O reembolso é feito em até 7 dias úteis após a confirmação da devolução pelo armazém central."
print(hash_exacto(v1) == hash_exacto(v2))              # True: só mudou espaço em branco
print(hash_exacto(v1) == hash_exacto(v3))              # False
print(round(jaccard(shingles(v1), shingles(v3)), 2))   # 0.44
print(round(jaccard(shingles(v1, 3), shingles(v3, 3)), 2))  # 0.67`,
        },
        {
          type: 'p',
          text: 'Repara no 0,44: mudar uma palavra numa frase de 17 palavras derruba o Jaccard com shingles de 5 palavras, porque cada palavra entra em até 5 shingles. O limiar depende do tamanho do texto e de n, por isso calibro-o sobre pares rotulados do meu corpus. À escala, comparar todos os pares é quadrático; MinHash aproxima o Jaccard com uma assinatura de tamanho fixo e LSH só compara candidatos que caem no mesmo balde (a biblioteca `datasketch` implementa ambos).',
        },
        {
          type: 'p',
          text: 'Detectar não é decidir. Para quase-duplicados escolho uma cópia canónica por regra explícita (fonte de autoridade, data mais recente, documento vigente) e guardo as outras como aliases, para poder citar a fonte canónica. Quando as cópias **divergem em factos**, isso é um problema de conteúdo: abro um alerta para o dono do documento em vez de escolher em silêncio.',
        },
        {
          type: 'refs',
          items: [
            { label: 'datasketch — MinHash e LSH em Python', url: 'https://github.com/ekzhu/datasketch' },
            { label: 'Lee et al. (2021) — Deduplicating Training Data Makes Language Models Better', url: 'https://arxiv.org/abs/2107.06499' },
            { label: 'Python — hashlib', url: 'https://docs.python.org/3/library/hashlib.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica o custo dos duplicados: lugares perdidos no top-k e contradições no contexto.',
          'Normaliza o texto antes do hash exacto.',
          'Propõe MinHash/LSH (ou equivalente) para quase-duplicados e explica porquê à escala.',
          'Diz que o limiar se calibra no corpus.',
          'Define uma regra para a cópia canónica e trata divergências de facto como problema de conteúdo.',
        ],
        fraco: 'Propõe só comparar o hash do ficheiro, que falha com qualquer diferença de espaço.',
        solido: 'Hash do texto normalizado mais similaridade de shingles ou de embeddings, com limiar.',
        excelente: 'Explica a sensibilidade do Jaccard ao tamanho e a n, usa MinHash/LSH à escala, define cópia canónica e encaminha divergências para o dono do conteúdo.',
      },
      seguimento: [
        'Porque não usar a similaridade de cosseno dos embeddings para detectar duplicados?',
        'Deduplicas ao nível do documento ou do chunk?',
        'Como fazes isto de forma incremental quando entram 20 mil documentos por dia?',
      ],
      sinaisAlarme: [
        'Achar que duplicados são inofensivos porque «reforçam a resposta».',
        'Comparar todos os pares de 2 milhões de documentos sem perceber a complexidade.',
      ],
      modulos: ['ingestao-chunking'],
    },
    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-chunking-ingestao-07',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Ingestão incremental: o documento mudou ou foi apagado',
      enunciado:
        'A ingestão corre todas as noites. Um documento é editado; outro é apagado na fonte. O que acontece no teu índice, passo a passo? E se o job falhar a meio e voltar a correr?',
      minutos: 6,
      dica: 'Que identificador tem cada chunk e como sabes que um chunk deixou de existir?',
      resposta: [
        {
          type: 'p',
          text: 'Desenho a ingestão para ser **idempotente**: ids de chunk determinísticos (`doc_id` + ordem), um hash por chunk, e um plano por documento que calcula o que inserir, o que actualizar e o que apagar. Correr duas vezes com o mesmo input não muda nada, e um apagamento na fonte tem de chegar ao índice por evento ou por reconciliação.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Plano de actualização por documento',
          code: `import hashlib

def chunk_id(doc_id: str, ordem: int) -> str:
    return f"{doc_id}#{ordem:04d}"

def conteudo_hash(texto: str) -> str:
    return hashlib.sha256(texto.encode()).hexdigest()[:16]

def plano(doc_id: str, chunks_novos: list[str], indice: dict[str, str]) -> dict[str, list[str]]:
    """indice: chunk_id -> hash guardado. Devolve o que inserir, actualizar e apagar."""
    novos = {chunk_id(doc_id, i): conteudo_hash(t) for i, t in enumerate(chunks_novos)}
    antigos = {k: h for k, h in indice.items() if k.startswith(f"{doc_id}#")}
    return {
        "inserir": sorted(novos.keys() - antigos.keys()),
        "actualizar": sorted(k for k in novos.keys() & antigos.keys() if novos[k] != antigos[k]),
        "apagar": sorted(antigos.keys() - novos.keys()),
    }

indice = {chunk_id("pol-12", i): conteudo_hash(t) for i, t in enumerate(["A", "B", "C"])}
print(plano("pol-12", ["A", "B2"], indice))
# {'inserir': [], 'actualizar': ['pol-12#0001'], 'apagar': ['pol-12#0002']}
print(plano("pol-12", [], indice)["apagar"])
# ['pol-12#0000', 'pol-12#0001', 'pol-12#0002']
print(plano("pol-12", ["A", "B", "C"], indice))
# {'inserir': [], 'actualizar': [], 'apagar': []}`,
        },
        {
          type: 'p',
          text: 'Pontos que importam em produção: o hash do documento inteiro evita sequer re-partir o que não mudou; o hash por chunk evita recalcular embeddings do que ficou igual. Ids por ordem têm um defeito — inserir um parágrafo no início desloca todos os ids e reprocessa o documento todo; se isso for caro, uso ids derivados do caminho estrutural (secção 4.2.1) ou do hash do conteúdo. A escrita de um documento faz-se numa transacção (ou com uma versão de documento e troca atómica do ponteiro), para que a pesquisa nunca veja metade dos chunks novos e metade dos antigos.',
        },
        {
          type: 'p',
          text: 'Para apagamentos tenho dois mecanismos: eventos da fonte (webhook, CDC) que geram um tombstone, e uma **reconciliação periódica** que lista os doc_ids da fonte e apaga do índice os que já não existem — porque eventos perdem-se. Mudança de modelo de embeddings não é actualização incremental: é um índice novo construído ao lado e trocado de uma vez.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — retrieval: carregar, partir, indexar', url: 'https://docs.langchain.com/oss/python/langchain/retrieval' },
            { label: 'Python — hashlib', url: 'https://docs.python.org/3/library/hashlib.html' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Usa ids determinísticos e hash por chunk para upsert idempotente.',
          'Trata o apagamento na fonte explicitamente (tombstone ou reconciliação).',
          'Garante que a pesquisa não vê um documento a meio da actualização.',
          'Identifica o problema dos ids por ordem quando se insere conteúdo no início.',
          'Distingue actualização incremental de reindexação por troca de modelo.',
        ],
        fraco: 'Apaga e recria o índice inteiro todas as noites, ou só faz append.',
        solido: 'Ids determinísticos, hash, upsert e apagamento dos chunks que desapareceram.',
        excelente: 'Acrescenta atomicidade por documento, reconciliação periódica para eventos perdidos, o defeito dos ids por ordem e a reindexação blue-green para troca de modelo.',
      },
      seguimento: [
        'Como sabes, amanhã de manhã, que a ingestão desta noite correu bem?',
        'Que SLO de frescura dás ao negócio e como o medes?',
        'O índice é de outra equipa e só aceita inserts. O que fazes?',
      ],
      sinaisAlarme: [
        'Não ter resposta para «o documento foi apagado na fonte».',
        'Gerar ids aleatórios (uuid4) para os chunks em cada ingestão.',
        'Assumir que o job nunca falha a meio.',
      ],
      modulos: ['ingestao-chunking', 'langchain-rag'],
    },
    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-chunking-ingestao-08',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Versões de documentos: só a vigente ou o histórico com vigência',
      enunciado:
        'Uma seguradora revê as condições gerais todos os anos, mas as apólices antigas continuam regidas pela versão com que foram emitidas. Guardas só a versão em vigor ou o histórico? Como garantes que a resposta usa a versão certa?',
      minutos: 8,
      dica: '«Em vigor» em relação a que data?',
      resposta: [
        {
          type: 'p',
          text: 'Guardo **o histórico com intervalos de vigência** (`valido_de`, `valido_ate`) e filtro na consulta pela **data relevante para a pergunta** — que nem sempre é hoje. Para uma pergunta sobre a apólice de um cliente é a data de emissão ou do sinistro; para uma pergunta genérica é a data actual. Guardar só a vigente é mais simples e chega quando nada no negócio depende de versões passadas.',
        },
        {
          type: 'table',
          head: ['Opção', 'Ganha', 'Perde'],
          rows: [
            ['Só a versão vigente', 'Índice pequeno, sem lógica de datas, sem risco de recuperar versões antigas', 'Respostas erradas para contratos antigos; não se consegue auditar o que o assistente disse no passado'],
            ['Histórico com vigência e filtro', 'Responde pela versão aplicável; auditoria; reproduz respostas antigas', 'Filtros obrigatórios em todas as consultas; se o filtro falha, versões antigas competem com a actual'],
            ['Índices separados por versão', 'Isolamento total', 'Explosão de índices; perguntas que atravessam versões ficam difíceis'],
          ],
        },
        {
          type: 'p',
          text: 'Como garanto a versão certa: a data de referência não vem do LLM, vem do sistema. O orquestrador lê a apólice do cliente (ferramenta ou contexto da sessão), determina produto e data, e passa-os como filtro estruturado à pesquisa. A instrução no prompt («usa a versão aplicável») é complemento, não mecanismo. Cada chunk no contexto leva a versão e o intervalo de vigência no cabeçalho, para que a resposta e a citação a mencionem.',
        },
        {
          type: 'p',
          text: 'Do lado da ingestão, revogar uma versão é uma escrita de metadados (`valido_ate` preenchido), não um apagamento. Isso exige que o dono do conteúdo diga quando uma versão substitui outra: sem um campo `substitui` ou um registo de versões na fonte, o pipeline não tem como saber. É uma conversa organizacional, não técnica, e é aqui que um staff se distingue — definir o contrato de dados com as equipas que publicam os documentos.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Ordenar por data em vez de filtrar',
          text: 'Dar um bónus de score aos documentos mais recentes parece resolver, mas uma versão antiga com mais palavras em comum com a pergunta continua a ganhar. Vigência é um filtro duro, não uma preferência.',
        },
        {
          type: 'refs',
          items: [
            { label: 'PostgreSQL — tipos de intervalo (daterange) para vigência', url: 'https://www.postgresql.org/docs/current/rangetypes.html' },
            { label: 'Qdrant — filtering', url: 'https://qdrant.tech/documentation/concepts/filtering/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Distingue a data de referência da pergunta da data actual.',
          'Propõe histórico com intervalos de vigência e filtro duro na consulta.',
          'Diz que a data e o produto vêm do sistema, não do LLM.',
          'Nomeia os custos de cada opção (complexidade, risco de versões antigas, auditoria).',
          'Identifica a necessidade de um contrato de dados com quem publica (campo «substitui»).',
        ],
        fraco: 'Indexa só a mais recente e nem considera contratos antigos, ou indexa tudo sem filtro.',
        solido: 'Histórico com vigência, filtro pela data relevante vinda do sistema.',
        excelente: 'Acrescenta auditoria e reprodutibilidade de respostas passadas, explica porque um bónus de recência não chega, e trata o contrato de dados com os donos do conteúdo como parte da solução.',
      },
      seguimento: [
        'Como reproduzes exactamente o que o assistente respondeu a um cliente há 8 meses?',
        'E quando a pergunta é sobre o que mudou entre a versão de 2025 e a de 2026?',
        'Quem é dono do campo valido_ate e o que acontece quando vem errado?',
      ],
      sinaisAlarme: [
        'Confiar no modelo para escolher a versão pelo texto do documento.',
        'Apagar versões antigas num domínio regulado.',
      ],
      modulos: ['ingestao-chunking', 'rag-avancado'],
    },
    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-chunking-ingestao-09',
      tipo: 'design',
      nivel: 'staff',
      titulo: 'Pipeline de ingestão para 2 milhões de documentos heterogéneos',
      enunciado:
        'Desenha o pipeline de ingestão para o assistente interno de um operador de telecomunicações. São 2 milhões de documentos de origens diferentes e uma parte muda todos os dias.',
      contexto:
        'Fontes: SharePoint (DOCX, PDF), wiki de engenharia (HTML), CRM (artigos de base de conhecimento), PDFs digitalizados de contratos antigos. 2 milhões de documentos, cerca de 1% alterado ou criado por dia, apagamentos frequentes no SharePoint. Permissões por grupos do Active Directory. Requisito do negócio: um documento alterado tem de estar pesquisável em menos de 4 horas. Português e inglês.',
      minutos: 18,
      dica: 'Começa pelas estimativas: quantos chunks, quantos tokens por dia para embeddings, quanto espaço.',
      resposta: [
        {
          type: 'p',
          text: 'Proponho um pipeline **orientado a eventos com reconciliação diária**, dividido em conectores por fonte, uma fila, workers de normalização e chunking idempotentes, e uma escrita atómica por documento no índice híbrido com ACL nos metadados. O ponto crítico não é o volume — é a frescura das permissões e dos apagamentos.',
        },
        {
          type: 'h',
          text: 'Clarificações e estimativas',
        },
        {
          type: 'p',
          text: 'Pergunto: tamanho médio dos documentos, que fracção é digitalizada, se as permissões mudam sem o documento mudar, e qual o modelo de embeddings (dimensão e limite de tokens). Assumindo ~3000 tokens por documento e chunks de ~500 tokens: 6 mil milhões de tokens no total, **~12 milhões de chunks**. A 1024 dimensões em float32 são ~4 KB por vector, ~50 GB só de vectores, mais o grafo HNSW por cima. Por dia: 1% são 20 mil documentos, ~120 mil chunks, ~60 milhões de tokens para embeddings — trivial para uma API ou para uma GPU. A carga inicial (6 mil milhões de tokens) é que precisa de planeamento de rate limits e custo.',
        },
        {
          type: 'diagram',
          diagram: {
            title: 'Pipeline de ingestão',
            cols: 5,
            rows: 3,
            zones: [
              { id: 'z-fontes', label: 'Fontes', col: 0, row: 0, colSpan: 1, rowSpan: 3, tone: 'external' },
              { id: 'z-proc', label: 'Processamento', col: 1, row: 0, colSpan: 3, rowSpan: 3, tone: 'async' },
              { id: 'z-indice', label: 'Índice', col: 4, row: 0, colSpan: 1, rowSpan: 3, tone: 'data' },
            ],
            nodes: [
              { id: 'sp', label: 'SharePoint', sub: 'webhooks + delta', col: 0, row: 0, kind: 'external' },
              { id: 'wiki', label: 'Wiki e CRM', sub: 'API incremental', col: 0, row: 1, kind: 'external' },
              { id: 'recon', label: 'Reconciliação', sub: 'diária, lista ids', col: 0, row: 2, kind: 'service' },
              { id: 'fila', label: 'Fila de eventos', sub: 'upsert / delete / acl', col: 1, row: 1, kind: 'queue' },
              { id: 'extr', label: 'Extracção', sub: 'Markdown, OCR', col: 2, row: 0, kind: 'service' },
              { id: 'chunk', label: 'Chunking e enriquecimento', sub: 'estrutural, metadados, hash', col: 2, row: 1, kind: 'service' },
              { id: 'emb', label: 'Embeddings', sub: 'só chunks com hash novo', col: 3, row: 1, kind: 'model' },
              { id: 'dlq', label: 'DLQ e revisão', col: 2, row: 2, kind: 'note' },
              { id: 'idx', label: 'Índice híbrido', sub: 'vector + BM25 + ACL', col: 4, row: 1, kind: 'vector' },
              { id: 'reg', label: 'Registo de documentos', sub: 'doc_id, hash, versão', col: 4, row: 2, kind: 'data' },
            ],
            edges: [
              { from: 'sp', to: 'fila' },
              { from: 'wiki', to: 'fila' },
              { from: 'recon', to: 'fila', label: 'tombstones', style: 'dashed' },
              { from: 'fila', to: 'extr' },
              { from: 'extr', to: 'chunk' },
              { from: 'chunk', to: 'emb' },
              { from: 'emb', to: 'idx', label: 'escrita atómica' },
              { from: 'chunk', to: 'reg' },
              { from: 'extr', to: 'dlq', style: 'dashed' },
            ],
          },
        },
        {
          type: 'steps',
          items: [
            { title: 'Conectores e eventos', text: 'Cada fonte emite eventos de upsert, delete e mudança de ACL para uma fila. A chave de partição é o doc_id, para que eventos do mesmo documento sejam processados por ordem.' },
            { title: 'Extracção por tipo', text: 'DOCX e HTML convertidos para Markdown com estrutura; PDFs com camada de texto extraídos directamente; digitalizados para OCR com confiança por página. Falhas vão para uma DLQ com o motivo, não bloqueiam a fila.' },
            { title: 'Chunking e metadados', text: 'Estrutural com fallback recursivo, cabeçalho com o caminho de títulos, metadados herdados (fonte, url, idioma, versão, vigência, grupos AD). Hash do documento para saltar o que não mudou; hash por chunk para só vectorizar o novo.' },
            { title: 'Escrita atómica', text: 'Por documento, numa transacção: apagar chunks que desapareceram, upsert dos alterados, actualizar o registo. A pesquisa nunca vê metade de um documento.' },
            { title: 'ACL como caminho rápido', text: 'Uma mudança de permissões não reprocessa o documento: actualiza só os metadados dos seus chunks. É o evento com prioridade mais alta, porque um atraso aqui é uma fuga de dados.' },
            { title: 'Reconciliação', text: 'Uma vez por dia, lista os doc_ids de cada fonte e compara com o registo: o que existe no índice e não na fonte gera tombstone; o que tem hash diferente gera upsert. Apanha eventos perdidos.' },
          ],
        },
        {
          type: 'h',
          text: 'Operação e avaliação',
        },
        {
          type: 'list',
          items: [
            'Frescura: idade do evento mais antigo por processar e percentil 95 do tempo entre evento e documento pesquisável, com alarme abaixo das 4 horas do SLO.',
            'Qualidade: chunks por documento, documentos sem texto, taxa de OCR de baixa confiança, por fonte e por dia; uma fonte que de repente produz 0 chunks é um alarme.',
            'Recuperação: conjunto dourado por fonte corrido depois de cada mudança no pipeline, com recall@k e context recall.',
            'Segurança: teste diário que pesquisa com um utilizador sem acesso a documentos marcados e tem de devolver zero resultados.',
          ],
        },
        {
          type: 'p',
          text: 'Trade-offs que deixo explícitos: eventos mais reconciliação é mais complexo do que um batch nocturno, mas o batch não cumpre 4 horas para apagamentos. Contextual retrieval com LLM fica para depois — sobre 12 milhões de chunks é um custo de ingestão real que só justifico com números do dourado. A troca de modelo de embeddings é uma reindexação completa em paralelo, com troca de alias, planeada como projecto e não como deploy.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — document loaders (conectores por fonte)', url: 'https://docs.langchain.com/oss/python/integrations/document_loaders/index' },
            { label: 'pgvector — índices HNSW e filtros', url: 'https://github.com/pgvector/pgvector' },
            { label: 'Anthropic — Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Faz estimativas de chunks, armazenamento e tokens diários a partir de pressupostos explícitos.',
          'Trata apagamentos e mudanças de ACL como eventos de primeira classe, com reconciliação para eventos perdidos.',
          'Garante idempotência (hash por documento e por chunk) e escrita atómica por documento.',
          'Define métricas de frescura e qualidade com alarmes ligados ao SLO.',
          'Separa a carga inicial (custo, rate limits) da operação diária.',
          'Planeia a troca de modelo de embeddings como reindexação paralela.',
        ],
        fraco: 'Um script que lê tudo, parte em 500 tokens e insere num índice vectorial, sem apagamentos nem permissões.',
        solido: 'Pipeline por eventos com extracção por tipo, chunking estrutural, ACL nos metadados e upsert idempotente.',
        excelente: 'Acrescenta estimativas, o caminho rápido para mudanças de ACL, a reconciliação, testes de fuga de permissões, métricas de frescura ligadas ao SLO e uma ordem clara do que fica para depois.',
      },
      seguimento: [
        'Como farias a carga inicial de 2 milhões sem bloquear as actualizações diárias?',
        'Um grupo do AD muda e afecta 300 mil documentos. O que acontece?',
        'Que parte deste pipeline subcontratavas a um serviço gerido e porquê?',
      ],
      sinaisAlarme: [
        'Ignorar permissões num assistente interno de uma empresa grande.',
        'Não ter forma de propagar apagamentos.',
        'Propor reindexar 2 milhões de documentos todas as noites.',
      ],
      modulos: ['ingestao-chunking', 'bases-vectoriais', 'custo-escala'],
    },
    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-chunking-ingestao-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'As respostas citam uma política revogada',
      enunciado:
        'O assistente de um banco móvel está a responder com as comissões de transferência da tabela antiga, revogada há duas semanas, e cita-a. A nova tabela está no índice. Como investigas?',
      contexto:
        'Assistente de apoio ao cliente de um banco móvel em Maputo. Corpus de ~3000 documentos de produto e preçário, ingestão nocturna a partir do CMS. A nova tabela de comissões foi publicada no CMS como documento novo; a antiga foi «despublicada». Em 200 conversas sobre comissões desde a mudança, a equipa de qualidade encontrou 38 respostas com valores antigos. Os traços guardam consulta, chunks recuperados com ids e scores, e a resposta.',
      minutos: 12,
      dica: 'Começa por saber se o chunk antigo está no índice; depois porque ganha à nova.',
      resposta: [
        {
          type: 'p',
          text: 'Duas perguntas separadas: **porque é que o documento revogado ainda está no índice** e **porque é que ganha ao novo quando ambos são recuperados**. A causa mais provável da primeira é que «despublicar» no CMS não gera um apagamento que a ingestão veja; a da segunda é que não há filtro de vigência e a tabela antiga tem mais texto em comum com as perguntas.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Confirmar nos traços', text: 'Nas 38 conversas, vejo que chunks entraram no contexto. Se o chunk antigo aparece sempre e o novo às vezes também, é competição; se o novo nunca aparece, é um problema de recuperação do documento novo (chunking da tabela, cabeçalho em falta).' },
            { title: 'Verificar o índice directamente', text: 'Procuro o doc_id antigo no índice e no registo de documentos: data da última ingestão, valor de vigente/valido_ate. Se está lá como vigente, a ingestão não soube da revogação.' },
            { title: 'Ver o que o CMS expõe', text: 'Como é que o conector lista documentos? Se pede «todos os documentos alterados desde ontem», um documento despublicado pode simplesmente deixar de aparecer, sem evento. Ausência na listagem não é apagamento se ninguém compara.' },
            { title: 'Explicar a competição', text: 'Com os dois chunks no top-k, comparo scores. Tabelas quase iguais têm embeddings quase iguais; o modelo recebe dois valores para a mesma comissão e escolhe um, às vezes o antigo, sobretudo se aparece primeiro.' },
            { title: 'Excluir outras causas', text: 'Cache de respostas semântica com respostas antigas, FAQ manual que repete os valores antigos, ou o próprio modelo a responder de memória quando nenhum chunk tem a comissão.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcção imediata: marcar o documento antigo com `valido_ate` e reindexar, e invalidar a cache de respostas para as intenções de comissões. Correcção de fundo: **reconciliação** — a ingestão compara a lista completa de ids publicados com o registo e gera tombstones para o que desapareceu; filtro duro de vigência em todas as consultas; e um campo `substitui` no CMS para que a publicação da tabela nova revogue a antiga explicitamente.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Três salvaguardas: um teste no conjunto dourado com perguntas cuja resposta mudou recentemente (o valor antigo na resposta é falha), um alarme quando há dois documentos vigentes do mesmo tipo e produto, e uma métrica diária de documentos no índice sem correspondência na fonte, que deve ser zero.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Apagar à mão e seguir',
          text: 'Apagar o chunk antigo resolve este caso e deixa o mecanismo partido: a próxima revogação repete o incidente. E 38 em 200 é quase uma em cada cinco respostas sobre comissões — num banco é um incidente com impacto em clientes, não um bug cosmético.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — retrieval: carregar, partir, indexar', url: 'https://docs.langchain.com/oss/python/langchain/retrieval' },
            { label: 'Liu et al. (2023) — Lost in the Middle', url: 'https://arxiv.org/abs/2307.03172' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa «porque está no índice» de «porque ganha à versão nova».',
          'Confirma nos traços e no índice antes de mudar código.',
          'Identifica que despublicar sem evento não chega ao índice e propõe reconciliação.',
          'Propõe filtro de vigência e um mecanismo explícito de substituição.',
          'Considera causas concorrentes (cache, FAQ duplicada, resposta sem contexto).',
          'Propõe métricas e testes que impedem a regressão.',
        ],
        fraco: 'Apaga o documento antigo à mão ou acrescenta ao prompt «usa sempre a tabela mais recente».',
        solido: 'Encontra o documento antigo no índice, explica a falta de apagamentos e propõe reconciliação e filtro de vigência.',
        excelente: 'Quantifica o impacto, verifica cache e outras fontes, corrige o contrato com o CMS e acrescenta testes de respostas que mudaram e alarmes de documentos órfãos.',
      },
      seguimento: [
        'Como avisas os clientes que receberam o valor errado nestas duas semanas?',
        'O CMS não tem API de listagem completa. Que alternativas tens?',
        'Como escreverias um teste automático para «resposta desactualizada»?',
      ],
      sinaisAlarme: [
        'Resolver com uma instrução no prompt.',
        'Não olhar para o índice nem para os traços antes de propor a correcção.',
        'Tratar 19% de respostas erradas num banco como pormenor.',
      ],
      modulos: ['ingestao-chunking', 'observabilidade-llmops'],
    },
  ],
};
