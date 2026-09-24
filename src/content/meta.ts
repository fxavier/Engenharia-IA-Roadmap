/* GERADO POR scripts/gerar-meta.mjs — NÃO EDITAR À MÃO.
   Corre `npm run gerar-meta` depois de mexer em qualquer módulo. */

import type { PartId } from '../types';

export interface ModuleMeta {
  id: string;
  number: number;
  part: PartId;
  title: string;
  subtitle: string;
  icon: string;
  minutes: number;
  tags: string[];
  goals: string[];
  sections: { id: string; title: string }[];
  counts: { quiz: number; exercises: number; labs: number; useCases: number; blocks: number };
}

export const META: ModuleMeta[] = [
  {
    id: "engenharia-ia",
    number: 1,
    part: "fundamentos",
    title: "Engenharia de IA e o problema do «Balcão»",
    subtitle: "O que muda quando o componente central do sistema é um modelo pré-treinado que se aluga por token — e o problema concreto que vais resolver ao longo de 32 módulos",
    icon: "🧭",
    minutes: 80,
    tags: [
      "engenharia de IA",
      "stack",
      "requisitos",
      "métricas",
      "Balcão"
    ],
    goals: [
      "Distinguir engenharia de IA de ML engineering pelo artefacto, pelo ciclo de iteração e pelo tipo de falha, e dizer onde o teu instinto de backend ajuda e onde engana.",
      "Nomear as camadas da stack de um sistema LLM (serviço, orquestração, ferramentas, contexto, modelo, avaliação, operação) e situar cada peça do «Balcão» numa delas.",
      "Decidir, intenção a intenção, quando um LLM é a ferramenta errada e o problema se resolve com regras, pesquisa ou ML clássico.",
      "Ler os requisitos do «Balcão» como números mensuráveis e ligar cada métrica de negócio à métrica de sistema que a antecipa.",
      "Fazer a conta de guardanapo de custo e capacidade (conversas, turnos, tokens, meticais) antes de escrever código."
    ],
    sections: [
      {
        id: "o-que-e",
        title: "O que é engenharia de IA, e o que não é"
      },
      {
        id: "stack",
        title: "As camadas da stack: do modelo à operação"
      },
      {
        id: "ferramenta-errada",
        title: "Quando um LLM é a ferramenta errada"
      },
      {
        id: "o-balcao",
        title: "O problema do «Balcão»: intenções, requisitos e números"
      },
      {
        id: "metricas",
        title: "Métricas: do negócio ao sistema"
      },
      {
        id: "caminhos-e-mapa",
        title: "Caminhos de resolução e o mapa dos 32 módulos"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 65
    }
  },
  {
    id: "como-funciona-llm",
    number: 2,
    part: "fundamentos",
    title: "Como um LLM gera texto",
    subtitle: "Tokens, atenção, logits e amostragem: o mecanismo, com o detalhe suficiente para prever custo, latência, variância e alucinações — e para decidir o que fazer com cada uma",
    icon: "🔤",
    minutes: 95,
    tags: [
      "tokens",
      "BPE",
      "atenção",
      "amostragem",
      "KV cache",
      "alucinação"
    ],
    goals: [
      "Explicar como um tokenizador BPE parte texto em tokens e porque é que português, nomes moçambicanos e identificadores como `PD-8841273` custam mais tokens por carácter.",
      "Escrever a fórmula da atenção causal e dizer o que cada termo faz, e ligar a geração autoregressiva às duas latências que medes (TTFT e tokens por segundo) e ao KV cache.",
      "Prever o efeito de temperatura, top-k e top-p numa distribuição de próximo token, e escolher os valores certos para classificar, responder e julgar.",
      "Distinguir determinismo de reprodutibilidade, e explicar porque é que temperatura 0 não garante a mesma resposta duas vezes.",
      "Explicar, sem antropomorfizar, porque é que um modelo alucina e que mecanismos de sistema (contexto, citação, recusa, ferramentas) reduzem o problema.",
      "Distinguir pré-treino, instruction tuning e afinação por preferências o suficiente para decidir entre prompt, RAG e fine-tuning."
    ],
    sections: [
      {
        id: "tokens",
        title: "Tokens: a unidade de tudo"
      },
      {
        id: "atencao",
        title: "Embeddings de tokens e atenção"
      },
      {
        id: "geracao",
        title: "Geração autoregressiva, as duas latências e o KV cache"
      },
      {
        id: "amostragem",
        title: "Logits, temperatura, top-k e top-p"
      },
      {
        id: "janela-alucinacao",
        title: "Janela de contexto e porque é que um modelo alucina"
      },
      {
        id: "treino",
        title: "Pré-treino, instruction tuning e preferências: o suficiente para decidir"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 60
    }
  },
  {
    id: "apis-de-modelos",
    number: 3,
    part: "fundamentos",
    title: "APIs de modelos na prática",
    subtitle: "O pedido HTTP por baixo de tudo: mensagens, motivo de paragem, uso, streaming, erros, retentativas, cache, lote e custo — e a camada fina que mantém o fornecedor fora do teu domínio",
    icon: "🔌",
    minutes: 90,
    tags: [
      "Messages API",
      "streaming",
      "retentativas",
      "prompt caching",
      "custo",
      "init_chat_model"
    ],
    goals: [
      "Ler e escrever um pedido de mensagens nas APIs da Anthropic, da OpenAI (Chat Completions e Responses) e do Ollama, e tratar cada `stop_reason` explicitamente em vez de ler só o texto.",
      "Consumir um stream SSE evento a evento, medir o TTFT no primeiro delta de texto e ler o uso e o motivo de paragem que só chegam no fim.",
      "Classificar erros em permanentes e transitórios, configurar timeout, retentativas com backoff e jitter e um prazo total por turno, com uma só camada de retentativas no sistema.",
      "Usar os SDKs oficiais e `init_chat_model` sabendo o que cada um uniformiza e o que não, e aplicar cache de prompt e processamento em lote onde reduzem custo sem mudar a resposta.",
      "Calcular o custo de cada chamada a partir do `usage` e justificar a interface própria sobre o fornecedor (adr-0003) com o que ela concentra: versão, timeouts, retentativas, escalão e métricas."
    ],
    sections: [
      {
        id: "anatomia",
        title: "Anatomia de um pedido de mensagens"
      },
      {
        id: "streaming",
        title: "Streaming: eventos SSE e o primeiro token"
      },
      {
        id: "erros",
        title: "Erros, retentativas com backoff e timeouts"
      },
      {
        id: "sdks",
        title: "SDKs Python e `init_chat_model`"
      },
      {
        id: "cache-batch",
        title: "Prompt caching e processamento em lote"
      },
      {
        id: "custo-interface",
        title: "Custo por pedido e a interface própria sobre o fornecedor"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 60
    }
  },
  {
    id: "prompt-engineering",
    number: 4,
    part: "fundamentos",
    title: "Prompts e engenharia de contexto",
    subtitle: "O prompt de sistema como especificação testável, os dados sempre delimitados, exemplos e formatos com contrato, raciocínio só onde se paga, e a janela montada por código — versionada como código",
    icon: "📝",
    minutes: 95,
    tags: [
      "prompt de sistema",
      "delimitadores",
      "few-shot",
      "raciocínio",
      "engenharia de contexto",
      "versões"
    ],
    goals: [
      "Escrever e dissecar um prompt de sistema em partes com motivo e teste, usando o prompt do «Balcão» como referência, e reconhecer as instruções que não se conseguem verificar.",
      "Separar instruções de dados com papéis, delimitadores e escape, e explicar porque é que isso reduz mas não elimina a prompt injection.",
      "Usar exemplos few-shot e formatos de saída (texto, JSON, saída estruturada, ferramenta) escolhendo pela garantia que o código precisa, e medir o custo e o enviesamento dos exemplos.",
      "Decidir quando o raciocínio explícito ou *extended thinking* compensa, com números de custo e de latência, e porque é que o texto do raciocínio não é uma explicação fiel.",
      "Montar a janela de contexto por chamada — o que entra, com que orçamento e em que ordem — tendo em conta a cache de prompt e o efeito *lost in the middle*.",
      "Versionar prompts como código, com SemVer, etiqueta no traço, PR com evals e canário."
    ],
    sections: [
      {
        id: "estrutura",
        title: "O prompt de sistema, dissecado"
      },
      {
        id: "instrucoes-dados",
        title: "Instruções, dados e delimitadores"
      },
      {
        id: "exemplos-formatos",
        title: "Exemplos (few-shot) e formatos de saída"
      },
      {
        id: "raciocinio",
        title: "Raciocínio explícito e *extended thinking*"
      },
      {
        id: "contexto",
        title: "Engenharia de contexto: o que entra, e em que ordem"
      },
      {
        id: "versoes",
        title: "Prompts versionados como código"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 57
    }
  },
  {
    id: "tool-calling",
    number: 5,
    part: "fundamentos",
    title: "Tool calling e saída estruturada",
    subtitle: "O modelo escreve um pedido em JSON; o teu código valida, autoriza, executa e responde",
    icon: "🔧",
    minutes: 95,
    tags: [
      "tool calling",
      "JSON Schema",
      "Pydantic",
      "structured output",
      "idempotência"
    ],
    goals: [
      "Descrever o ciclo de tool use ao nível do protocolo (Anthropic e OpenAI): quem emite `tool_use`/`tool_calls`, quem executa, e porque cada chamada exige um resultado com o mesmo identificador.",
      "Escrever esquemas de ferramenta que reduzem erros do modelo: nomes, descrições que dizem quando chamar, `pattern`, `enum`, `additionalProperties: false`, e medir o custo em tokens do catálogo.",
      "Validar argumentos e saídas com Pydantic, usar `with_structured_output` com o método certo para cada fornecedor e devolver erros de ferramenta como resultado, não como excepção.",
      "Tornar as ferramentas de escrita seguras perante retentativas e chamadas paralelas, com chaves de idempotência derivadas no servidor e autorização lida do contexto de execução.",
      "Escolher `tool_choice` e o subconjunto de ferramentas expostas por turno, e justificar o desenho das 12 ferramentas do «Balcão» por efeito, risco e aprovação."
    ],
    sections: [
      {
        id: "ciclo",
        title: "O ciclo de tool use: o modelo pede, o código executa"
      },
      {
        id: "esquemas",
        title: "Esquemas JSON e descrições: a documentação que o modelo lê"
      },
      {
        id: "validacao",
        title: "Validação, saída estruturada e erros como resultado"
      },
      {
        id: "idempotencia",
        title: "Chamadas paralelas, retentativas e idempotência"
      },
      {
        id: "autorizacao",
        title: "Autorização dentro da ferramenta e `tool_choice`"
      },
      {
        id: "catalogo",
        title: "As 12 ferramentas do «Balcão»"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 63
    }
  },
  {
    id: "escolher-modelo",
    number: 6,
    part: "fundamentos",
    title: "Escolher (e trocar) de modelo",
    subtitle: "Qualidade, latência e custo medidos no teu conjunto, não num ranking público",
    icon: "⚖️",
    minutes: 85,
    tags: [
      "escalões",
      "routing",
      "fallback",
      "open-weights",
      "versões fixadas"
    ],
    goals: [
      "Definir os critérios de escolha de um modelo como medidas no teu conjunto dourado e no teu orçamento: qualidade por intenção, TTFT, tokens por segundo, custo por conversa, janela, fiabilidade de tool calling e qualidade em português.",
      "Comparar APIs comerciais com modelos open-weights servidos com Ollama ou vLLM, incluindo privacidade, residência de dados e a estrutura de custos (por token contra capacidade fixa).",
      "Fixar versões de modelo, detectar aliases móveis e tratar uma troca de modelo como um deploy com avaliação, canário e rollback.",
      "Desenhar escalões e routing por dificuldade, e calcular o efeito de cada fracção de tráfego no custo e na latência.",
      "Implementar fallback entre fornecedores só para falhas de disponibilidade, com o modelo de reserva também avaliado.",
      "Seguir um procedimento reprodutível quando sai um modelo novo, com comparação emparelhada e intervalo de confiança."
    ],
    sections: [
      {
        id: "criterios",
        title: "Os critérios, medidos no teu conjunto"
      },
      {
        id: "latencia",
        title: "Latência: TTFT, tokens por segundo e o orçamento de 1,5 s"
      },
      {
        id: "api-vs-local",
        title: "API comercial ou open-weights, e onde ficam os dados"
      },
      {
        id: "versoes",
        title: "Fixar versões: o modelo é uma dependência"
      },
      {
        id: "routing",
        title: "Cascatas e routing por dificuldade"
      },
      {
        id: "fallback-novo-modelo",
        title: "Fallback entre fornecedores e o dia em que sai um modelo novo"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 52
    }
  },
  {
    id: "embeddings",
    number: 7,
    part: "rag",
    title: "Embeddings e similaridade",
    subtitle: "Texto transformado em vectores comparáveis: o que medem, como se treinam e quanto custa trocá-los",
    icon: "🧭",
    minutes: 90,
    tags: [
      "embeddings",
      "cosseno",
      "contrastive",
      "Matryoshka",
      "reindexação"
    ],
    goals: [
      "Explicar o que um modelo de embeddings calcula (tokens, transformer, pooling, normalização) e porque dois textos próximos no espaço vectorial não são necessariamente equivalentes para o cliente.",
      "Descrever o treino contrastivo (InfoNCE com negativos no batch e negativos difíceis) e a diferença entre bi-encoder e cross-encoder.",
      "Escolher entre cosseno, produto interno e distância L2, e saber quando são equivalentes (vectores normalizados) e quando não são.",
      "Reconhecer onde a pesquisa semântica ganha e onde perde para a lexical, e medir isso no conjunto dourado em vez de o supor.",
      "Aplicar prefixos de pergunta e de documento, decidir truncagens Matryoshka e planear uma troca de modelo como reindexação versionada."
    ],
    sections: [
      {
        id: "o-que-e",
        title: "O que é um embedding de texto"
      },
      {
        id: "treino",
        title: "Como se treinam: aprendizagem contrastiva"
      },
      {
        id: "similaridade",
        title: "Cosseno, produto interno e L2: dimensões e normalização"
      },
      {
        id: "semantico-lexical",
        title: "Semântico contra lexical, e o português de Maputo"
      },
      {
        id: "assimetria-matryoshka",
        title: "Assimetria pergunta/documento e Matryoshka"
      },
      {
        id: "versionar-custo",
        title: "Versionar, reindexar e quanto custa"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 51
    }
  },
  {
    id: "bases-vectoriais",
    number: 8,
    part: "rag",
    title: "Bases de dados vectoriais",
    subtitle: "kNN exacto, IVF e HNSW, quantização, filtros e pgvector: o que muda de 2 mil para mil milhões de vectores",
    icon: "🗄️",
    minutes: 100,
    tags: [
      "pgvector",
      "HNSW",
      "IVF",
      "quantização",
      "filtros",
      "Qdrant"
    ],
    goals: [
      "Distinguir pesquisa exacta de pesquisa aproximada (ANN), medir o recall de um índice contra a exacta e decidir quando um índice é necessário.",
      "Explicar IVF (listas e sondas) e HNSW (M, ef_construction, ef_search) ao ponto de prever o efeito de cada parâmetro no recall, na latência, na memória e nas inserções.",
      "Escolher entre `vector`, `halfvec`, quantização binária com re-scoring e product quantization, sabendo o que cada uma custa em recall.",
      "Usar o pgvector 0.8 a sério: tipos, operadores, opclasses, `SET LOCAL hnsw.ef_search`, iterative index scans, índices parciais e partições.",
      "Aplicar filtros de metadados antes do top-k (pré-filtro) e reconhecer o pós-filtro que devolve menos de k resultados ou cita políticas substituídas.",
      "Comparar pgvector com Qdrant, Milvus e serviços geridos, e dimensionar o «Balcão» (5,7 MB) com argumentos de operação e não de escala."
    ],
    sections: [
      {
        id: "knn-ann",
        title: "kNN exacto contra ANN: quando é que precisas de um índice?"
      },
      {
        id: "ivf-hnsw",
        title: "IVF e HNSW por dentro"
      },
      {
        id: "quantizacao",
        title: "Quantização: halfvec, binária e product quantization"
      },
      {
        id: "pgvector",
        title: "pgvector na prática: tipos, operadores, índices e sessão"
      },
      {
        id: "filtros",
        title: "Filtros: pré-filtro, pós-filtro e iterative scans"
      },
      {
        id: "alternativas",
        title: "Qdrant, Milvus, serviços geridos e o tamanho do «Balcão»"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 55
    }
  },
  {
    id: "ingestao-chunking",
    number: 9,
    part: "rag",
    title: "Ingestão e chunking",
    subtitle: "O índice só devolve o que a ingestão lá pôs: fontes limpas, chunks que contêm uma regra inteira e metadados que deixam filtrar",
    icon: "✂️",
    minutes: 90,
    tags: [
      "chunking",
      "ingestão",
      "metadados",
      "idempotência",
      "parent-child"
    ],
    goals: [
      "Decidir o que entra no índice do «Balcão» e o que fica de fora (pedidos, avisos, dados pessoais), e que metadados cada chunk tem de levar para poder ser filtrado.",
      "Comparar chunking fixo, por frases, recursivo, estrutural e semântico pelo que produzem de facto: tamanhos, cortes a meio de frase e respostas que saem desses chunks.",
      "Escolher tamanho e sobreposição com números medidos no conjunto dourado, e perceber porque é que o recall ao nível do documento esconde metade do problema.",
      "Usar parent-child e cabeçalhos contextuais para pesquisar com chunks pequenos e responder com contexto suficiente.",
      "Desenhar uma ingestão incremental e idempotente: hash por documento, substituição transaccional, retirada de versões e reindexação quando o modelo de embeddings muda."
    ],
    sections: [
      {
        id: "fontes",
        title: "Carregar e limpar: o que entra no índice"
      },
      {
        id: "estrategias",
        title: "Cinco formas de partir um documento"
      },
      {
        id: "tamanho",
        title: "Tamanho e sobreposição: medir em vez de adivinhar"
      },
      {
        id: "parent-child",
        title: "Pesquisar pequeno, responder grande: parent-child e cabeçalhos"
      },
      {
        id: "idempotencia",
        title: "Ingestão incremental e idempotente"
      },
      {
        id: "pipeline",
        title: "O pipeline de ingestão do «Balcão»"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 61
    }
  },
  {
    id: "rag-basico",
    number: 10,
    part: "rag",
    title: "RAG de ponta a ponta",
    subtitle: "Indexar, recuperar, aumentar, gerar — e as decisões que separam uma demo de um assistente que cita, recusa e se deixa depurar",
    icon: "🔗",
    minutes: 95,
    tags: [
      "rag",
      "citações",
      "recusa",
      "contexto",
      "falhas"
    ],
    goals: [
      "Descrever as quatro fases de um RAG (indexar, recuperar, aumentar, gerar) e o que cada uma custa em latência e tokens num turno do «Balcão».",
      "Escrever o prompt RAG com contexto delimitado, ids de fonte e citações obrigatórias, e perceber porque é que o contexto vai na mensagem do utilizador e não nas instruções.",
      "Escolher k e o limiar de score com números: orçamento de tokens do contexto, distribuição de scores dentro e fora de âmbito, e o custo de cada erro.",
      "Implementar a recusa como decisão do sistema (limiar e validação de citações no código) e não como pedido ao modelo.",
      "Reconhecer as falhas típicas (recuperação falhada, contexto ruidoso, fonte desactualizada, citação inventada, resposta fiel mas errada) e saber onde cada uma aparece no traço."
    ],
    sections: [
      {
        id: "anatomia",
        title: "Quatro fases, uma pergunta"
      },
      {
        id: "prompt",
        title: "O prompt RAG: contexto delimitado, fontes marcadas, citações exigidas"
      },
      {
        id: "k-limiar",
        title: "Quantos chunks, a partir de que score"
      },
      {
        id: "recusa",
        title: "Recusar quando não há suporte"
      },
      {
        id: "falhas",
        title: "As falhas típicas, e como as ver"
      },
      {
        id: "cadeia",
        title: "A cadeia real, em streaming e com traço"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 56
    }
  },
  {
    id: "pesquisa-hibrida",
    number: 11,
    part: "rag",
    title: "Pesquisa híbrida e re-ranking",
    subtitle: "BM25 para códigos e nomes, vectores para sinónimos, RRF para os fundir sem afinar pesos, e um cross-encoder para acertar a ordem — numa só consulta SQL",
    icon: "🔀",
    minutes: 95,
    tags: [
      "bm25",
      "full-text",
      "rrf",
      "re-ranking",
      "postgresql"
    ],
    goals: [
      "Ler a fórmula do BM25 termo a termo e explicar o que k1, b e o IDF fazem a uma pergunta de cliente.",
      "Usar a pesquisa de texto do PostgreSQL (`tsvector`, `tsquery`, `ts_rank_cd`, dicionário `portuguese`) sabendo o que ela não faz: acentos, códigos com hífen, IDF.",
      "Reconhecer com exemplos do «Balcão» onde a pesquisa densa falha (nomes, códigos, números) e onde a lexical falha (sinónimos, paráfrases).",
      "Fundir rankings com RRF, perceber porque é robusto ao parâmetro k e onde esconde o documento que só um dos métodos encontrou.",
      "Decidir quando um cross-encoder compensa os seus ≈ 180 ms e escrever a pesquisa híbrida completa numa só consulta SQL, com filtros antes do LIMIT."
    ],
    sections: [
      {
        id: "bm25",
        title: "BM25: pesquisa lexical com vinte anos de afinação"
      },
      {
        id: "postgres-fts",
        title: "Full-text no PostgreSQL: `tsvector`, `tsquery` e o dicionário `portuguese`"
      },
      {
        id: "onde-falham",
        title: "Onde o denso falha, onde o lexical falha"
      },
      {
        id: "rrf",
        title: "Reciprocal Rank Fusion"
      },
      {
        id: "re-ranking",
        title: "Re-ranking com cross-encoders"
      },
      {
        id: "sql",
        title: "A consulta híbrida numa só SQL"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 54
    }
  },
  {
    id: "rag-avancado",
    number: 12,
    part: "rag",
    title: "RAG avançado",
    subtitle: "Reescrever a pergunta, filtrar na base de dados, dar contexto aos chunks, controlar o acesso e deixar o modelo decidir quando pesquisar — cada técnica com o seu caso, o seu custo e o seu contra-exemplo",
    icon: "🧭",
    minutes: 100,
    tags: [
      "reescrita",
      "hyde",
      "filtros",
      "multi-tenant",
      "rag agêntico"
    ],
    goals: [
      "Aplicar reescrita conversacional, multi-query, HyDE e decomposição a perguntas do «Balcão», sabendo o que cada uma custa em latência e chamadas ao modelo.",
      "Pôr os filtros de metadados na consulta (adr-0010) e usar self-query só para filtros de conveniência, nunca para filtros de segurança.",
      "Dar contexto aos chunks (cabeçalhos, contextual retrieval, parent document) e cortar contexto inútil antes do modelo (compressão).",
      "Tratar versões de políticas e acesso multi-tenant como propriedades da base de dados (validade, `publico`, row-level security), não do prompt.",
      "Decidir quando o RAG deve passar a ser uma ferramenta que o agente chama, e porque é que GraphRAG raramente compensa num corpus como o do «Chega»."
    ],
    sections: [
      {
        id: "reescrita",
        title: "Reescrever a pergunta antes de pesquisar"
      },
      {
        id: "filtros",
        title: "Filtros de metadados e self-query"
      },
      {
        id: "contexto",
        title: "Chunks com contexto, e contexto sem gordura"
      },
      {
        id: "versoes-acesso",
        title: "Versões de políticas, multi-tenant e controlo de acesso"
      },
      {
        id: "agentico",
        title: "RAG agêntico: a pesquisa como ferramenta"
      },
      {
        id: "graphrag",
        title: "Quando GraphRAG compensa (raramente)"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 53
    }
  },
  {
    id: "langchain-lcel",
    number: 13,
    part: "orquestracao",
    title: "LangChain: runnables e LCEL",
    subtitle: "Uma interface, cinco peças de composição, e a disciplina de saber onde a biblioteca paga o que custa",
    icon: "⛓️",
    minutes: 85,
    tags: [
      "LangChain",
      "LCEL",
      "Runnable",
      "saída estruturada",
      "fallbacks"
    ],
    goals: [
      "Escolher os pacotes do LangChain 1.x de que um serviço precisa, e manter o domínio do «Balcão» fora deles.",
      "Usar a interface `Runnable` (`invoke`, `batch`, `stream`, `ainvoke`, `astream_events`) e a `RunnableConfig` que se propaga a toda a cadeia.",
      "Compor cadeias com `|`, `RunnableParallel`, `RunnablePassthrough.assign`, `RunnableLambda` e `RunnableBranch`, sabendo a forma do valor em cada passo.",
      "Montar prompts com `ChatPromptTemplate` sem cair no erro das chavetas, e obter decisões com `with_structured_output` em vez de interpretar texto.",
      "Configurar `with_retry`, `with_fallbacks`, timeouts e rate limiting sem multiplicar pedidos nem rebentar o orçamento de latência.",
      "Decidir, componente a componente, entre LCEL, LangGraph e o SDK directo."
    ],
    sections: [
      {
        id: "pacotes",
        title: "O que é o LangChain 1.x, e em que pacotes vem"
      },
      {
        id: "runnable",
        title: "A interface Runnable: invoke, batch, stream e as versões assíncronas"
      },
      {
        id: "composicao",
        title: "LCEL: compor com `|`, `RunnableParallel`, `RunnablePassthrough` e `RunnableLambda`"
      },
      {
        id: "prompts-parsers",
        title: "Prompts, parsers e saída estruturada"
      },
      {
        id: "resiliencia",
        title: "Resiliência: `with_retry`, `with_fallbacks`, timeouts e rate limits"
      },
      {
        id: "callbacks-streaming",
        title: "Callbacks, eventos e streaming"
      },
      {
        id: "quando-nao",
        title: "Quando não usar LangChain"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 64
    }
  },
  {
    id: "langchain-rag",
    number: 14,
    part: "orquestracao",
    title: "RAG com LangChain",
    subtitle: "Documentos, splitters, lojas vectoriais e retrievers: o que a biblioteca dá, e o que continua a ser trabalho teu",
    icon: "📚",
    minutes: 90,
    tags: [
      "RAG",
      "retriever",
      "PGVector",
      "splitters",
      "testes"
    ],
    goals: [
      "Representar a base de conhecimento como `Document`s com metadados que funcionam como contrato (público, vigência, id estável, modelo de embeddings).",
      "Partir documentos com `RecursiveCharacterTextSplitter` e ids determinísticos, para que a ingestão seja idempotente.",
      "Escolher entre `InMemoryVectorStore`, `PGVector` e um índice próprio, sabendo onde cada um aplica os filtros.",
      "Configurar retrievers com `search_kwargs` e escrever um `BaseRetriever` próprio para pesquisa híbrida com re-ranking.",
      "Montar a cadeia RAG com histórico, citações validadas e streaming de eventos.",
      "Testar a cadeia sem rede com fakes e simulados, e ligar os testes ao conjunto dourado."
    ],
    sections: [
      {
        id: "documentos",
        title: "`Document`, loaders e metadados como contrato"
      },
      {
        id: "splitters",
        title: "`RecursiveCharacterTextSplitter` e a partição com ids estáveis"
      },
      {
        id: "lojas-vectoriais",
        title: "Embeddings e lojas vectoriais: `OllamaEmbeddings`, `InMemoryVectorStore`, `PGVector`"
      },
      {
        id: "retrievers",
        title: "Retrievers: `as_retriever`, `search_kwargs` e um retriever híbrido próprio"
      },
      {
        id: "cadeia-rag",
        title: "A cadeia RAG em LCEL: histórico, citações e streaming"
      },
      {
        id: "testes",
        title: "Testar a cadeia sem rede: fakes, simulados e o conjunto dourado"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 55
    }
  },
  {
    id: "agentes",
    number: 15,
    part: "orquestracao",
    title: "Agentes: o ciclo com ferramentas",
    subtitle: "Modelo, ferramentas, ciclo e paragem: o que um agente é, quanto custa, e porque o «Balcão» só o usa onde a decisão varia",
    icon: "🔁",
    minutes: 90,
    tags: [
      "agentes",
      "ReAct",
      "create_agent",
      "limites",
      "tool calling"
    ],
    goals: [
      "Definir um agente pelas suas quatro peças (modelo, ferramentas, ciclo, paragem) e distingui-lo de um workflow pelo sítio onde o caminho é decidido.",
      "Explicar o padrão ReAct e o ciclo com tool calling nativo, mensagem a mensagem, incluindo o custo de cada passo.",
      "Usar `create_agent` do LangChain 1.x com middleware de limites, e saber porque não é o fluxo do «Balcão».",
      "Pôr limites em camadas (chamadas, pesquisas, passos, tokens, tempo) e reconhecer o `recursion_limit` como última rede.",
      "Tratar erros de ferramenta como resultado, com idempotência nas escritas e identidade vinda do contexto de execução.",
      "Decidir intenção a intenção entre agente, router e workflow, com custo e variância como critérios."
    ],
    sections: [
      {
        id: "o-que-e",
        title: "O que é um agente: modelo, ferramentas, ciclo e paragem"
      },
      {
        id: "react",
        title: "ReAct e o ciclo com tool calling nativo"
      },
      {
        id: "create-agent",
        title: "`create_agent` no LangChain 1.x"
      },
      {
        id: "paragem",
        title: "Critérios de paragem e limites: passos, tokens, chamadas e tempo"
      },
      {
        id: "erros-ferramentas",
        title: "Erros de ferramenta como resultado, idempotência e autorização"
      },
      {
        id: "agente-vs-workflow",
        title: "Agente ou workflow: porque o «Balcão» usa um grafo com router"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 49
    }
  },
  {
    id: "langgraph",
    number: 16,
    part: "orquestracao",
    title: "LangGraph: grafos de estado",
    subtitle: "Estado com reducers, nós que devolvem parciais, routers testáveis, streaming e fan-out: o fluxo do «Balcão» como grafo explícito",
    icon: "🕸️",
    minutes: 100,
    tags: [
      "LangGraph",
      "StateGraph",
      "reducers",
      "streaming",
      "Send"
    ],
    goals: [
      "Declarar o estado de um grafo com `TypedDict` e escolher, canal a canal, entre substituir, `add_messages` e `operator.add`.",
      "Construir um `StateGraph` com nós, arestas, arestas condicionais, `START`/`END` e `compile`, e testar routers como funções puras.",
      "Ler o grafo do «Balcão» nó a nó e relacionar cada aresta condicional com um requisito ou uma regra de autonomia.",
      "Escolher o modo de `stream` certo para o SSE, para o traço e para a depuração.",
      "Usar `Send` para fan-out com reducer e `Command` para decidir e actualizar num só passo.",
      "Montar o ciclo de ferramentas com `ToolNode`, pôr `recursion_limit` e `RetryPolicy` no sítio certo, e saber quando um subgrafo compensa."
    ],
    sections: [
      {
        id: "estado",
        title: "Estado com `TypedDict` e reducers: `add_messages` e `operator.add`"
      },
      {
        id: "nos-arestas",
        title: "Nós, arestas, arestas condicionais, `START`/`END` e `compile`"
      },
      {
        id: "grafo-balcao",
        title: "O grafo do «Balcão»"
      },
      {
        id: "stream",
        title: "Modos de `stream`: `values`, `updates`, `messages`, `custom`"
      },
      {
        id: "send-command",
        title: "`Send` para fan-out e `Command` para decidir e actualizar num só passo"
      },
      {
        id: "toolnode-subgrafos",
        title: "`ToolNode`, `tools_condition`, `recursion_limit`, `RetryPolicy` e subgrafos"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 2,
      useCases: 1,
      blocks: 51
    }
  },
  {
    id: "langgraph-persistencia",
    number: 17,
    part: "orquestracao",
    title: "Persistência, interrupts e humano no circuito",
    subtitle: "Checkpointers, thread_id, histórico, time travel e o interrupt que pára um reembolso de 2 910 MZN até alguém do suporte decidir — horas depois, noutra réplica",
    icon: "💾",
    minutes: 95,
    tags: [
      "checkpoint",
      "interrupt",
      "PostgresSaver",
      "time travel",
      "idempotência",
      "human-in-the-loop"
    ],
    goals: [
      "Explicar o que um checkpoint do LangGraph guarda (estado, próximos nós, escritas pendentes, metadados) e porque a unidade de persistência é o superstep, com o `thread_id` como chave.",
      "Escolher entre `InMemorySaver` e `PostgresSaver` (e o modo `durability`) para um serviço com várias réplicas, e operar a tabela de checkpoints: `setup()`, pool, retenção de 30 dias.",
      "Usar `get_state`, `get_state_history`, `update_state` e o replay a partir de um `checkpoint_id` para depurar uma conversa real sem a reescrever.",
      "Implementar aprovação humana com `interrupt()` e `Command(resume=...)`, sabendo que o nó recomeça do início na retoma e o que isso obriga a fazer com os efeitos.",
      "Desenhar nós com efeitos externos idempotentes (chaves derivadas do fio e da intenção) para que retomas, retries e replays nunca paguem duas vezes.",
      "Ligar o `stream` do grafo (modos `updates`, `messages`, `custom`) aos eventos SSE da API, incluindo o evento de aprovação pendente."
    ],
    sections: [
      {
        id: "porque-persistir",
        title: "Porque um grafo precisa de estado durável"
      },
      {
        id: "checkpointers",
        title: "InMemorySaver, PostgresSaver e o modo de durabilidade"
      },
      {
        id: "estado-e-historia",
        title: "get_state, histórico, replay e time travel"
      },
      {
        id: "interrupt-e-aprovacao",
        title: "interrupt() e Command(resume=...): a aprovação acima de 500 MZN"
      },
      {
        id: "efeitos-e-idempotencia",
        title: "Nós com efeitos: o que corre duas vezes e como não pagar duas vezes"
      },
      {
        id: "streaming-e-operacao",
        title: "Streaming de eventos e operação de threads suspensos"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 68
    }
  },
  {
    id: "memoria",
    number: 18,
    part: "orquestracao",
    title: "Memória de conversa",
    subtitle: "O modelo não se lembra de nada: tudo o que «lembra» é o que reenvias em cada chamada. Janela recente, resumo incremental, campos estruturados e uma Store que o «Balcão» decidiu não usar para dados pessoais",
    icon: "🧠",
    minutes: 85,
    tags: [
      "memória",
      "trim_messages",
      "resumo",
      "Store",
      "PII",
      "contexto"
    ],
    goals: [
      "Explicar porque um modelo de chat não tem memória entre chamadas e decompor a «memória» de um agente em curto prazo (estado do thread) e longo prazo (Store entre threads).",
      "Medir o custo e a latência de um histórico que cresce e reconhecer que, com 3,4 turnos por conversa, a política de memória protege sobretudo a cauda.",
      "Usar `trim_messages` com `strategy=\"last\"`, `start_on=\"human\"` e um contador de tokens, sem partir pares chamada de ferramenta e resultado.",
      "Implementar resumo incremental com `RemoveMessage` e campos estruturados no estado, e saber quando um resumo perde o detalhe que importa.",
      "Distinguir memória semântica, episódica e procedimental e usar `InMemoryStore`/`PostgresStore` com namespaces, sabendo o que nunca se guarda (PII) e porquê."
    ],
    sections: [
      {
        id: "porque-memoria",
        title: "O modelo não se lembra: a memória é o que reenvias"
      },
      {
        id: "custo-historico",
        title: "O custo de um histórico que cresce"
      },
      {
        id: "janela-trim",
        title: "Janela recente com trim_messages"
      },
      {
        id: "resumo-incremental",
        title: "Resumo incremental, RemoveMessage e campos estruturados"
      },
      {
        id: "longo-prazo",
        title: "Memória de longo prazo: Store, namespaces e os três tipos"
      },
      {
        id: "politica-memoria",
        title: "A política de memória do «Balcão» e o que nunca se guarda"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 51
    }
  },
  {
    id: "multi-agente-mcp",
    number: 19,
    part: "orquestracao",
    title: "Multi-agente e MCP",
    subtitle: "Supervisor, handoffs e hierarquias — e porque o «Balcão» é um só grafo. O Model Context Protocol por dentro (JSON-RPC 2.0, tools, resources, prompts, stdio e Streamable HTTP) e o servidor MCP que expõe só as ferramentas de leitura",
    icon: "🔌",
    minutes: 100,
    tags: [
      "multi-agente",
      "MCP",
      "FastMCP",
      "JSON-RPC",
      "tool poisoning",
      "handoffs"
    ],
    goals: [
      "Distinguir supervisor, handoffs, router e hierarquias, e decidir com números (chamadas, tokens, latência, pontos de falha) quando um sistema multi-agente não compensa.",
      "Implementar os dois padrões em LangGraph: subagentes como ferramentas de um supervisor e handoffs com `Command(goto=..., graph=Command.PARENT)`.",
      "Explicar o MCP ao nível da mensagem: papéis host/cliente/servidor, ciclo de vida `initialize`, capacidades, `tools/list`, `tools/call`, erros de protocolo contra `isError`.",
      "Escolher entre os transportes stdio e Streamable HTTP, conhecendo sessões, cabeçalhos obrigatórios e as exigências de segurança da especificação 2025-11-25.",
      "Construir e consumir o servidor MCP do «Balcão» com `FastMCP` e `langchain-mcp-adapters`, com identidade fora do alcance do modelo.",
      "Mitigar os riscos próprios do MCP: tool poisoning, mudança silenciosa de descrições, permissões excessivas e confused deputy."
    ],
    sections: [
      {
        id: "quando-multi-agente",
        title: "Multi-agente: padrões e quando não compensa"
      },
      {
        id: "padroes-langgraph",
        title: "Supervisor e handoffs em LangGraph"
      },
      {
        id: "mcp-protocolo",
        title: "MCP por dentro: papéis, primitivas e mensagens"
      },
      {
        id: "transportes",
        title: "Transportes: stdio e Streamable HTTP"
      },
      {
        id: "servidor-balcao",
        title: "O servidor MCP do «Balcão» com FastMCP e o cliente com langchain-mcp-adapters"
      },
      {
        id: "riscos-mcp",
        title: "Riscos: tool poisoning, permissões e confused deputy"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 52
    }
  },
  {
    id: "avaliacao-fundamentos",
    number: 20,
    part: "avaliacao",
    title: "Avaliação: porque e como",
    subtitle: "O mesmo sistema dá 0,77 numa corrida e 0,87 na seguinte. Asserções, conjunto dourado, avaliação humana e online; como se constrói, versiona e lê um conjunto dourado; intervalos de confiança por bootstrap; e análise de erros a partir dos casos, não da média",
    icon: "📊",
    minutes: 95,
    tags: [
      "eval",
      "golden set",
      "bootstrap",
      "análise de erros",
      "eval-driven",
      "gate"
    ],
    goals: [
      "Explicar porque é que um sistema LLM exige avaliação estatística: não-determinismo, espaço de entradas aberto e regressões que melhoram a média e pioram uma intenção.",
      "Escolher o tipo de avaliação certo para cada propriedade — asserção determinista, conjunto dourado com referência, revisão humana, sinais online — e ligar cada métrica de sistema a uma métrica de negócio.",
      "Construir um conjunto dourado estratificado por intenção e tipo de caso, com fontes rastreáveis, versionado no repositório e revisto pelo suporte (adr-0018).",
      "Calcular e ler intervalos de confiança por bootstrap, incluindo a diferença emparelhada entre duas versões, e decidir o tamanho do conjunto a partir do erro padrão.",
      "Fazer análise de erros a partir dos casos falhados e dos traços, e transformar cada falha real num caso novo: eval-driven development."
    ],
    sections: [
      {
        id: "porque-avaliar",
        title: "Porque «parece bem» não é uma métrica"
      },
      {
        id: "tipos-avaliacao",
        title: "Tipos de avaliação: asserções, conjunto dourado, humana e online"
      },
      {
        id: "conjunto-dourado",
        title: "Construir o conjunto dourado"
      },
      {
        id: "significancia",
        title: "Significância com bootstrap e o gate por intenção"
      },
      {
        id: "analise-erros",
        title: "Análise de erros: ler os casos, não a média"
      },
      {
        id: "eval-driven",
        title: "Eval-driven development e o lugar das evals no ciclo de entrega"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 50
    }
  },
  {
    id: "avaliar-rag",
    number: 21,
    part: "avaliacao",
    title: "Avaliar RAG",
    subtitle: "Um RAG são duas máquinas em série: uma que encontra e outra que escreve. Mede-se cada uma à parte, ou nunca se sabe qual das duas partiu",
    icon: "🎯",
    minutes: 95,
    tags: [
      "recall@k",
      "nDCG",
      "faithfulness",
      "RAGAS",
      "bootstrap"
    ],
    goals: [
      "Decompor a avaliação de um RAG em recuperação e geração, e saber que métrica apanha cada uma das falhas típicas (documento não encontrado, contexto ruidoso, resposta inventada, resposta fiel mas errada).",
      "Calcular à mão e em código recall@k, precision@k, MRR e nDCG@k, e explicar porque é que duas pesquisas com o mesmo recall podem ter nDCG muito diferente.",
      "Comparar BM25, denso, híbrido e re-ranking com os números reais do `balcao` e decidir, com intervalo de confiança pareado, quando uma diferença é real.",
      "Usar faithfulness, answer relevancy, context precision e context recall (RAGAS), saber o que cada uma mede de facto e onde uma versão lexical barata falha.",
      "Reconhecer as armadilhas clássicas: juiz a avaliar-se a si próprio, relevância mal anotada, métricas ao nível do chunk contra o nível do documento, e perguntas fora de âmbito a contaminar médias."
    ],
    sections: [
      {
        id: "duas-maquinas",
        title: "Avaliar um RAG é avaliar duas máquinas"
      },
      {
        id: "metricas-ordem",
        title: "Métricas de recuperação: presença e ordem"
      },
      {
        id: "numeros-balcao",
        title: "Comparar técnicas com os números do «Balcão»"
      },
      {
        id: "geracao",
        title: "Avaliar a geração: faithfulness, relevância e contexto"
      },
      {
        id: "armadilhas",
        title: "Armadilhas: quando a métrica mente"
      },
      {
        id: "no-laboratorio",
        title: "No laboratório: do JSONL ao gate"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 64
    }
  },
  {
    id: "llm-como-juiz",
    number: 22,
    part: "avaliacao",
    title: "LLM-como-juiz",
    subtitle: "Um modelo a avaliar outro é um instrumento de medida. Antes de confiar no número, mede-se o instrumento",
    icon: "⚖️",
    minutes: 90,
    tags: [
      "LLM-como-juiz",
      "rubrica",
      "Cohen kappa",
      "vieses",
      "pairwise"
    ],
    goals: [
      "Decidir, critério a critério, quando uma asserção determinista chega e quando é preciso um juiz, e explicar porque a asserção ganha sempre que é possível.",
      "Escrever um juiz com rubrica binária por critério, saída estruturada (`with_structured_output`) e conteúdo delimitado como dados.",
      "Distinguir juízes pointwise, pairwise e com referência, e escolher entre escala binária e Likert com base na variância e na facilidade de calibrar.",
      "Reconhecer os vieses de posição, verbosidade e auto-preferência, medi-los e neutralizá-los por construção (troca de ordem, modelo diferente, rubrica).",
      "Calibrar um juiz contra anotação humana com Cohen kappa, perceber porque a concordância bruta engana, e dimensionar o conjunto de anotação."
    ],
    sections: [
      {
        id: "juiz-ou-assercao",
        title: "Juiz ou asserção?"
      },
      {
        id: "rubrica",
        title: "Um juiz com rubrica: formatos e escalas"
      },
      {
        id: "vieses",
        title: "Os vieses do juiz, e como se neutralizam"
      },
      {
        id: "calibrar",
        title: "Calibrar contra humanos: Cohen kappa"
      },
      {
        id: "custo-e-limites",
        title: "Custo, variância e quando o juiz é pior"
      },
      {
        id: "no-laboratorio",
        title: "No laboratório: o juiz heurístico e o juiz real"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 56
    }
  },
  {
    id: "avaliar-agentes",
    number: 23,
    part: "avaliacao",
    title: "Avaliar agentes e conversas",
    subtitle: "Uma resposta certa por um caminho errado é um incidente adiado. Num agente avalia-se o que ele fez, não só o que disse",
    icon: "🧭",
    minutes: 90,
    tags: [
      "trajectória",
      "tool-call accuracy",
      "pass^k",
      "multi-turno",
      "regressão"
    ],
    goals: [
      "Distinguir avaliação do resultado final e avaliação da trajectória, e saber que falhas cada uma apanha num agente com ferramentas de escrita.",
      "Medir tool-call accuracy ao nível do nome e dos argumentos, e escrever invariantes de trajectória (nenhuma escrita sem confirmação, nenhum valor acima do limite) como asserções.",
      "Ler um traço de agente como métrica: passos, chamadas, tokens, custo e latência por turno e por conversa.",
      "Avaliar conversas multi-turno com um utilizador simulado, e perceber porque o sucesso de uma conversa é o produto dos sucessos dos turnos.",
      "Calcular pass@k e pass^k, e explicar porque um sistema de suporte com acções irreversíveis se mede por pass^k.",
      "Usar traços de referência e ferramentas simuladas deterministas como testes de regressão em CI."
    ],
    sections: [
      {
        id: "resultado-e-trajectoria",
        title: "Resultado final contra trajectória"
      },
      {
        id: "tool-calls",
        title: "Tool-call accuracy: nome, argumentos e invariantes"
      },
      {
        id: "passos-custo-latencia",
        title: "Passos, custo e latência como métricas de avaliação"
      },
      {
        id: "multi-turno",
        title: "Conversas multi-turno com utilizador simulado"
      },
      {
        id: "pass-k",
        title: "pass@k e pass^k: capacidade contra fiabilidade"
      },
      {
        id: "regressao",
        title: "Traços de referência e ferramentas simuladas como testes de regressão"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 2,
      useCases: 1,
      blocks: 53
    }
  },
  {
    id: "guardrails-seguranca",
    number: 24,
    part: "avaliacao",
    title: "Guardrails e segurança",
    subtitle: "Nenhum detector apanha todos os ataques. A defesa que funciona é a que não precisa de os apanhar",
    icon: "🛡️",
    minutes: 100,
    tags: [
      "prompt injection",
      "OWASP LLM",
      "guardrails",
      "PII",
      "red teaming"
    ],
    goals: [
      "Mapear o OWASP Top 10 para aplicações LLM (2025) às superfícies concretas do «Balcão» e dizer quais importam mais num assistente com ferramentas de dinheiro.",
      "Distinguir prompt injection directa, indirecta e jailbreak, e explicar porque nenhum prompt de sistema nem nenhum detector são uma defesa suficiente.",
      "Desenhar defesa em camadas (entrada, ferramentas, saída) em que a camada estrutural (privilégio mínimo e limites em código) trava o ataque mesmo quando o detector falha.",
      "Mascarar dados pessoais antes do modelo e dos logs, validar a saída (citações, PII, links) e medir falsos positivos das guardas.",
      "Montar um red team versionado com critério de sucesso no estado do mundo, e saber o que o NIST AI RMF e o AI Act pedem a um assistente de suporte."
    ],
    sections: [
      {
        id: "modelo-de-ameaca",
        title: "O modelo de ameaça de um assistente com ferramentas"
      },
      {
        id: "injeccao",
        title: "Prompt injection directa, indirecta e jailbreaks"
      },
      {
        id: "camadas",
        title: "Defesa em camadas: entrada, ferramentas e saída"
      },
      {
        id: "pii-e-saida",
        title: "Dados pessoais e validação de saída"
      },
      {
        id: "privilegio-minimo",
        title: "Privilégio mínimo e limites em código"
      },
      {
        id: "red-team-e-regulacao",
        title: "Red teaming, NIST AI RMF e AI Act"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 59
    }
  },
  {
    id: "fastapi-servico",
    number: 25,
    part: "producao",
    title: "O serviço FastAPI",
    subtitle: "Do grafo que funciona num notebook a um endpoint que aguenta clientes a desligar a meio da resposta",
    icon: "🛎️",
    minutes: 95,
    tags: [
      "fastapi",
      "sse",
      "streaming",
      "rfc 9457",
      "testes"
    ],
    goals: [
      "Montar uma aplicação FastAPI com `lifespan` que cria modelos, índice, grafo e pools uma vez por processo, e os fecha por ordem inversa.",
      "Desenhar o contrato HTTP com esquemas Pydantic estritos e dependências para autenticação e papéis, sabendo quando uma rota é `def` e quando é `async def`.",
      "Servir um turno do «Balcão» por Server-Sent Events com `StreamingResponse`, eventos nomeados, cabeçalhos anti-buffering e cancelamento quando o cliente desliga.",
      "Devolver erros como Problem Details (RFC 9457), antes e depois do primeiro byte, e separar vivacidade (`/healthz`) de prontidão (`/readyz`).",
      "Testar a API com `TestClient` e `httpx.AsyncClient` sem rede, e escolher entre workers do uvicorn e réplicas do contentor."
    ],
    sections: [
      {
        id: "contrato",
        title: "Do grafo ao serviço: a aplicação e o `lifespan`"
      },
      {
        id: "dependencias",
        title: "Dependências, papéis e a regra do `def` contra `async def`"
      },
      {
        id: "sse",
        title: "Streaming por Server-Sent Events"
      },
      {
        id: "cancelamento",
        title: "Buffering, cancelamento e timeouts"
      },
      {
        id: "erros-saude",
        title: "Erros RFC 9457, vivacidade e prontidão"
      },
      {
        id: "testes-deploy",
        title: "Testar sem rede e correr com uvicorn"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 73
    }
  },
  {
    id: "git-fluxo",
    number: 26,
    part: "producao",
    title: "Git para equipas de IA",
    subtitle: "Quando um prompt, um conjunto dourado e o código mudam juntos, o commit é a unidade de verdade",
    icon: "🌿",
    minutes: 85,
    tags: [
      "git",
      "trunk-based",
      "conventional commits",
      "semver",
      "bisect"
    ],
    goals: [
      "Raciocinar sobre Git como um grafo de commits imutáveis e ponteiros móveis, e escolher entre merge, rebase e squash pelo histórico que deixam.",
      "Trabalhar em trunk-based com PRs pequenos e de vida curta, em que prompt, conjunto dourado e código mudam no mesmo commit.",
      "Escrever Conventional Commits e derivar deles a versão SemVer de um prompt, sabendo o que é uma quebra de contrato num prompt.",
      "Decidir onde vivem notebooks, ficheiros grandes e dados anotados (Git, LFS, DVC ou armazenamento externo) e manter segredos fora do histórico com pre-commit.",
      "Encontrar o commit que partiu uma métrica de qualidade com `git bisect run` e um script de avaliação determinista."
    ],
    sections: [
      {
        id: "modelo",
        title: "O modelo de commits: um grafo imutável e ponteiros que se movem"
      },
      {
        id: "trunk",
        title: "Trunk-based e PRs pequenos: prompt, evals e código no mesmo commit"
      },
      {
        id: "commits-semver",
        title: "Conventional Commits e SemVer — também para prompts"
      },
      {
        id: "artefactos",
        title: "Prompts, conjuntos dourados, notebooks e ficheiros grandes"
      },
      {
        id: "segredos",
        title: "Segredos e pre-commit: o histórico não esquece"
      },
      {
        id: "bisect",
        title: "`git bisect` para regressões de qualidade"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 52
    }
  },
  {
    id: "docker",
    number: 27,
    part: "producao",
    title: "Docker e docker-compose",
    subtitle: "Uma imagem pequena, reprodutível e sem segredos, e um `docker compose up` que espera pelo que tem de esperar",
    icon: "🐳",
    minutes: 90,
    tags: [
      "docker",
      "compose",
      "uv",
      "multi-stage",
      "healthcheck"
    ],
    goals: [
      "Explicar uma imagem como uma pilha de camadas endereçadas por conteúdo e ordenar um Dockerfile para que um PR que só muda o prompt reconstrua em segundos.",
      "Construir a imagem do «Balcão» em multi-stage com uv e `uv sync --frozen`, sobre `python:3.13-slim`, com utilizador não-root e sem ferramentas de build no runtime.",
      "Manter segredos fora da imagem e do contexto de build (`.dockerignore`, `--mount=type=secret`, variáveis em runtime) e definir um `HEALTHCHECK` de vivacidade.",
      "Subir API, PostgreSQL com pgvector e Ollama com `docker compose`, perfis e `depends_on` com condições de saúde, e raciocinar sobre o tempo até ficar pronto.",
      "Escolher volumes, GPU, sistema de ficheiros só de leitura e scan de vulnerabilidades com os trade-offs de cada um."
    ],
    sections: [
      {
        id: "camadas",
        title: "Imagens, camadas e a cache de build"
      },
      {
        id: "multi-stage",
        title: "Multi-stage com uv: construir num sítio, correr noutro"
      },
      {
        id: "seguranca",
        title: "Não-root, `.dockerignore`, segredos e `HEALTHCHECK`"
      },
      {
        id: "compose",
        title: "`docker compose`: API, PostgreSQL com pgvector e Ollama"
      },
      {
        id: "operacao",
        title: "Volumes, GPU, tamanho e scan de imagens"
      }
    ],
    counts: {
      quiz: 8,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 48
    }
  },
  {
    id: "ci-cd",
    number: 28,
    part: "producao",
    title: "CI/CD com evals como gate",
    subtitle: "Um PR só entra se o comportamento não piorar em nenhuma intenção; uma imagem só chega a 100% depois de 24 horas a 10%",
    icon: "🚦",
    minutes: 100,
    tags: [
      "github actions",
      "ci/cd",
      "evals",
      "canário",
      "oidc"
    ],
    goals: [
      "Ler e escrever workflows do GitHub Actions com permissões mínimas, concorrência, cache do uv e serviços (PostgreSQL com pgvector) para os testes.",
      "Pôr as evals no caminho do merge como gate, comparando com a versão em produção por intenção e não só pela média global.",
      "Publicar uma imagem imutável por SHA no GHCR, com SBOM e proveniência, e explicar porque é que `latest` não tem lugar num deploy.",
      "Desenhar a entrega: ambientes com aprovação, canário de 10% durante 24 h, critérios de promoção e rollback, credenciais por OIDC em vez de segredos longos.",
      "Separar o que corre em cada PR (modelo simulado, sem rede) do que corre à noite (modelo real, com custo), e saber o que cada um apanha."
    ],
    sections: [
      {
        id: "actions",
        title: "GitHub Actions: workflows, jobs e o mínimo de permissões"
      },
      {
        id: "qualidade",
        title: "Lint, tipos e testes com serviços"
      },
      {
        id: "evals-gate",
        title: "Evals como gate: por intenção e contra a produção"
      },
      {
        id: "imagem",
        title: "Imagem imutável por SHA, SBOM e proveniência"
      },
      {
        id: "entrega",
        title: "Ambientes, canário, rollback e OIDC"
      },
      {
        id: "nocturnas",
        title: "Evals nocturnas com o modelo real"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 4,
      labs: 3,
      useCases: 1,
      blocks: 51
    }
  },
  {
    id: "observabilidade-llmops",
    number: 29,
    part: "producao",
    title: "Observabilidade e LLMOps",
    subtitle: "Uma resposta errada não levanta excepção: só um traço completo, com tokens, fontes e versões, diz onde nasceu",
    icon: "🔭",
    minutes: 95,
    tags: [
      "opentelemetry",
      "gen_ai",
      "langfuse",
      "prometheus",
      "drift",
      "llmops"
    ],
    goals: [
      "Explicar porque é que um sistema LLM precisa de traços, e não só de logs e métricas, para responder a «porque é que o assistente disse isto?».",
      "Instrumentar um turno do «Balcão» com OpenTelemetry e as convenções `gen_ai.*` (`chat`, `embeddings`, `retrieval`, `execute_tool`, `invoke_workflow`), sabendo o que vai em atributo e o que nunca lá vai.",
      "Definir as métricas de operação (TTFT, duração, tokens, custo, recusas, ferramentas), ler percentis a partir de histogramas Prometheus e escrever alertas que não acordam ninguém por nada.",
      "Manter logs e traços sem dados pessoais, correlacionados por `trace_id`, com retenção de 30 dias.",
      "Ligar o feedback do cliente ao traço no Langfuse e transformar traços maus em casos do conjunto dourado.",
      "Detectar drift na distribuição de perguntas e gerir versões de prompt e de modelo em produção com rastreabilidade de ponta a ponta."
    ],
    sections: [
      {
        id: "porque-tracar",
        title: "Uma resposta errada não levanta excepção"
      },
      {
        id: "otel-gen-ai",
        title: "OpenTelemetry e as convenções gen_ai"
      },
      {
        id: "metricas-alertas",
        title: "Métricas, painéis e alertas"
      },
      {
        id: "logs-pii",
        title: "Logs e traços sem dados pessoais"
      },
      {
        id: "langfuse-feedback",
        title: "Langfuse, feedback e avaliação online"
      },
      {
        id: "drift-versoes",
        title: "Drift de perguntas e versões em produção"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 64
    }
  },
  {
    id: "custo-escala",
    number: 30,
    part: "producao",
    title: "Custo, latência e escala",
    subtitle: "O custo de um sistema LLM é tokens × preço × chamadas; cada alavanca mexe num destes factores e tem um preço em qualidade ou em risco",
    icon: "💸",
    minutes: 100,
    tags: [
      "custo",
      "prompt caching",
      "cache semântica",
      "rate limits",
      "backpressure",
      "fallback"
    ],
    goals: [
      "Calcular o custo por conversa do «Balcão» a partir de tokens, preços e turnos, e explicar porque é que o histórico faz o custo crescer mais do que linearmente.",
      "Usar prompt caching do fornecedor com um prefixo estável, e saber o que o parte.",
      "Decidir onde uma cache semântica é segura e onde serve respostas erradas, e usar routing de modelos, limites de saída e compressão de contexto como alavancas de custo.",
      "Dimensionar contra os rate limits do fornecedor (RPM, ITPM, OTPM) com a lei de Little, e tratar 429 com Retry-After, backoff com jitter e filas com limite.",
      "Escalar o serviço horizontalmente sabendo que o gargalo é o fornecedor e não a CPU.",
      "Desenhar a degradação graciosa: o que o «Balcão» faz quando o fornecedor falha, fica lento ou recusa pedidos."
    ],
    sections: [
      {
        id: "custo-conversa",
        title: "Quanto custa uma conversa"
      },
      {
        id: "prompt-caching",
        title: "Prompt caching: pagar uma vez pelo prefixo"
      },
      {
        id: "alavancas",
        title: "Cache semântica, routing e contexto mais curto"
      },
      {
        id: "rate-limits",
        title: "Rate limits do fornecedor e o que fazer com um 429"
      },
      {
        id: "filas-escala",
        title: "Filas, backpressure e escalar horizontalmente"
      },
      {
        id: "degradacao",
        title: "Degradação graciosa e fallback"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 54
    }
  },
  {
    id: "balcao-ponta-a-ponta",
    number: 31,
    part: "balcao",
    title: "O «Balcão», ponta a ponta",
    subtitle: "Requisitos, arquitectura, grafo, esquema, API, um turno com traço, o laboratório a correr e o relatório de avaliação real",
    icon: "🧩",
    minutes: 110,
    tags: [
      "system design",
      "capstone",
      "langgraph",
      "avaliação",
      "produção"
    ],
    goals: [
      "Apresentar o «Balcão» como um system design completo: requisitos com medida, capacidade, arquitectura de alto nível e as decisões que a justificam.",
      "Ler o desenho detalhado — o grafo de `grafo.py`, o esquema de `sql/001_esquema.sql` e a API em SSE — e explicar cada escolha com o ADR que a sustenta.",
      "Seguir um turno de reembolso acima do limite de ponta a ponta, no fluxo e no traço, até ao interrupt e à retoma.",
      "Correr o laboratório (testes, avaliação, Docker, conversa por curl) e ler o relatório de avaliação real com intervalos de confiança e comparação emparelhada.",
      "Aplicar a checklist de produção e decidir a promoção de um canário com critérios explícitos."
    ],
    sections: [
      {
        id: "requisitos",
        title: "Do problema aos requisitos"
      },
      {
        id: "hld",
        title: "Arquitectura de alto nível e as decisões que a moldam"
      },
      {
        id: "lld",
        title: "Desenho detalhado: grafo, esquema e API"
      },
      {
        id: "turno",
        title: "Um turno de ponta a ponta"
      },
      {
        id: "laboratorio",
        title: "O laboratório a correr"
      },
      {
        id: "relatorio",
        title: "O relatório de avaliação, lido com cuidado"
      },
      {
        id: "producao",
        title: "Checklist de produção e próximos passos"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 66
    }
  },
  {
    id: "entrevista",
    number: 32,
    part: "balcao",
    title: "Preparação para entrevista de AI engineer",
    subtitle: "Perguntas conceptuais com resposta-modelo, dois system designs resolvidos, cenários de debugging, código ao vivo e os sinais que decidem uma vaga sénior",
    icon: "🎯",
    minutes: 105,
    tags: [
      "entrevista",
      "system design",
      "código ao vivo",
      "debugging",
      "senioridade"
    ],
    goals: [
      "Responder às perguntas conceptuais mais comuns (RAG vs fine-tuning, alucinação, determinismo, avaliação, pesquisa híbrida, injecção, agente vs workflow) com mecanismo, trade-off e número.",
      "Conduzir um system design de um sistema LLM pela ordem certa: requisitos com medida, avaliação, estimativas, caminhos, limites, operação e trade-offs.",
      "Resolver dois enunciados clássicos — RAG com controlo de acesso e agente com efeitos financeiros — com diagramas, grafo, código e conjunto de avaliação.",
      "Localizar falhas a partir de traços e métricas antes de propor correcções.",
      "Implementar ao vivo, e verificar, RRF, recall@k e MRR, um chunker recursivo e um ciclo de ferramentas com limite."
    ],
    sections: [
      {
        id: "formato",
        title: "O que uma entrevista de AI engineer sénior avalia"
      },
      {
        id: "conceitos",
        title: "Perguntas conceptuais e respostas-modelo"
      },
      {
        id: "design-rag",
        title: "System design 1: assistente de conhecimento interno com controlo de acesso"
      },
      {
        id: "design-agente",
        title: "System design 2: agente que resolve reclamações e emite créditos"
      },
      {
        id: "debugging",
        title: "Cenários de debugging"
      },
      {
        id: "codigo-ao-vivo",
        title: "Código ao vivo: RRF, recall@k, chunker e ciclo de ferramentas"
      },
      {
        id: "sinais",
        title: "Sinais de senioridade e erros que custam a vaga"
      }
    ],
    counts: {
      quiz: 9,
      exercises: 5,
      labs: 3,
      useCases: 1,
      blocks: 74
    }
  }
];
