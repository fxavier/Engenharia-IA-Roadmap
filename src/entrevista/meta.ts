/* GERADO por scripts/gerar-meta-entrevista.mjs — não editar à mão. */

import type { BlocoEntrevistaId, NivelPergunta, TipoPergunta } from '../types';

export interface PerguntaMeta {
  id: string;
  tipo: TipoPergunta;
  nivel: NivelPergunta;
  titulo: string;
  minutos: number;
}

export interface TopicoMeta {
  id: string;
  numero: number;
  bloco: BlocoEntrevistaId;
  titulo: string;
  resumo: string;
  icon: string;
  modulos: string[];
  ficheiro: string;
  perguntas: PerguntaMeta[];
}

export const TOPICOS_META: TopicoMeta[] = [
  {
    "id": "llm-internos",
    "numero": 1,
    "bloco": "llm",
    "titulo": "Como um LLM funciona por dentro",
    "resumo": "Tokenização, embeddings e posição, atenção, geração autoregressiva, KV cache, janela de contexto, MoE e as fases de treino — o mecanismo ao nível que um AI engineer aplicado precisa para prever custo, latência e modos de falha.",
    "icon": "🧠",
    "modulos": [
      "como-funciona-llm",
      "custo-escala",
      "escolher-modelo"
    ],
    "ficheiro": "t01-llm-internos",
    "perguntas": [
      {
        "id": "p-llm-internos-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque é que o modelo não sabe quantos «r» tem uma palavra",
        "minutos": 4
      },
      {
        "id": "p-llm-internos-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Embeddings de token e informação de posição",
        "minutos": 4
      },
      {
        "id": "p-llm-internos-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "A fórmula da atenção, o √d e o custo quadrático",
        "minutos": 5
      },
      {
        "id": "p-llm-internos-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Prefill vs decode: porque TTFT e tokens/s são métricas diferentes",
        "minutos": 5
      },
      {
        "id": "p-llm-internos-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quantas conversas de 32 k cabem numa GPU: o KV cache",
        "minutos": 8
      },
      {
        "id": "p-llm-internos-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Porque não pôr tudo numa janela de 1M tokens",
        "minutos": 7
      },
      {
        "id": "p-llm-internos-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Mixture-of-experts: parâmetros totais vs activos",
        "minutos": 8
      },
      {
        "id": "p-llm-internos-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Pré-treino, SFT e RLHF/DPO: o suficiente para decidir",
        "minutos": 5
      },
      {
        "id": "p-llm-internos-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Implementa atenção causal com softmax estável em numpy",
        "minutos": 20
      },
      {
        "id": "p-llm-internos-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A factura de tokens veio duas vezes acima do orçamento",
        "minutos": 10
      }
    ]
  },
  {
    "id": "amostragem-alucinacao",
    "numero": 2,
    "bloco": "llm",
    "titulo": "Amostragem, determinismo e alucinação",
    "resumo": "Como se escolhe o próximo token (temperatura, top-k, top-p), porque é que temperatura 0 não dá respostas iguais, porque é que os modelos alucinam e como se mitiga e mede isso num produto. É das primeiras coisas que um entrevistador usa para separar quem usa uma API de quem a percebe.",
    "icon": "🎲",
    "modulos": [
      "como-funciona-llm",
      "avaliacao-fundamentos",
      "guardrails-seguranca"
    ],
    "ficheiro": "t02-amostragem-alucinacao",
    "perguntas": [
      {
        "id": "p-amostragem-alucinacao-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Temperatura, top-k e top-p: o que fazem à distribuição",
        "minutos": 5
      },
      {
        "id": "p-amostragem-alucinacao-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Temperatura 0 e seed fixa, e a resposta ainda muda",
        "minutos": 5
      },
      {
        "id": "p-amostragem-alucinacao-03",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque é que um LLM alucina",
        "minutos": 4
      },
      {
        "id": "p-amostragem-alucinacao-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Mitigar alucinação em camadas e quanto custa cada camada",
        "minutos": 8
      },
      {
        "id": "p-amostragem-alucinacao-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Logprobs e calibração: o que dizem e o que não dizem",
        "minutos": 5
      },
      {
        "id": "p-amostragem-alucinacao-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Self-consistency: vale a pena pagar N amostras",
        "minutos": 7
      },
      {
        "id": "p-amostragem-alucinacao-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Structured output: o que a gramática garante e o que não garante",
        "minutos": 5
      },
      {
        "id": "p-amostragem-alucinacao-08",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Medir a taxa de alucinação de um assistente em produção",
        "minutos": 18
      },
      {
        "id": "p-amostragem-alucinacao-09",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A mesma pergunta dá respostas diferentes em produção",
        "minutos": 12
      },
      {
        "id": "p-amostragem-alucinacao-10",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Implementa um amostrador com temperatura, top-k e top-p",
        "minutos": 20
      }
    ]
  },
  {
    "id": "apis-modelos",
    "numero": 3,
    "bloco": "llm",
    "titulo": "APIs de modelos em produção",
    "resumo": "O pedido HTTP por baixo de qualquer produto com LLMs: mensagens, motivo de paragem e uso, streaming, erros e retentativas, timeouts, cache de prompt, lote, rate limits e a camada própria sobre o fornecedor. É onde o entrevistador separa quem fez uma demo de quem já foi acordado por um 429 às dez da noite.",
    "icon": "🔌",
    "modulos": [
      "apis-de-modelos",
      "custo-escala",
      "observabilidade-llmops"
    ],
    "ficheiro": "t03-apis-modelos",
    "perguntas": [
      {
        "id": "p-apis-modelos-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Anatomia de um pedido e de uma resposta de mensagens",
        "minutos": 4
      },
      {
        "id": "p-apis-modelos-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Streaming por SSE: o que muda no cliente",
        "minutos": 5
      },
      {
        "id": "p-apis-modelos-03",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Que erros se repetem e quais nunca",
        "minutos": 4
      },
      {
        "id": "p-apis-modelos-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Timeouts: TTFT, duração total e o stream que parou",
        "minutos": 5
      },
      {
        "id": "p-apis-modelos-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Como funciona a cache de prompt e o que a invalida",
        "minutos": 5
      },
      {
        "id": "p-apis-modelos-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "API de lote ou chamadas síncronas",
        "minutos": 7
      },
      {
        "id": "p-apis-modelos-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Abstracção própria sobre o fornecedor e fallback entre fornecedores",
        "minutos": 8
      },
      {
        "id": "p-apis-modelos-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Rate limits do fornecedor: fila própria ou bater no 429",
        "minutos": 8
      },
      {
        "id": "p-apis-modelos-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Cliente com retentativas, backoff, jitter e Retry-After",
        "minutos": 20
      },
      {
        "id": "p-apis-modelos-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Picos de 429 às sextas à noite com média baixa",
        "minutos": 12
      }
    ]
  },
  {
    "id": "prompt-contexto",
    "numero": 4,
    "bloco": "llm",
    "titulo": "Prompt e context engineering",
    "resumo": "Como se escreve, organiza, versiona e testa o que entra na janela do modelo: prompt de sistema, separação entre instruções e dados, exemplos, raciocínio explícito, orçamento e ordem do contexto, contexto longo contra RAG e regressões ao trocar de modelo. O entrevistador quer ouvir engenharia — medição, versões, custo — e não truques de redacção.",
    "icon": "🧭",
    "modulos": [
      "prompt-engineering",
      "rag-basico",
      "avaliacao-fundamentos"
    ],
    "ficheiro": "t04-prompt-contexto",
    "perguntas": [
      {
        "id": "p-prompt-contexto-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Como estruturas um prompt de sistema de produção",
        "minutos": 4
      },
      {
        "id": "p-prompt-contexto-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Separar instruções de dados e porque isso importa para injecção",
        "minutos": 5
      },
      {
        "id": "p-prompt-contexto-03",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Few-shot: quantos exemplos, quais, e que viés trazem",
        "minutos": 5
      },
      {
        "id": "p-prompt-contexto-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Raciocínio explícito: quando ligar, quanto custa, quem o vê",
        "minutos": 7
      },
      {
        "id": "p-prompt-contexto-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Engenharia de contexto: o que entra, em que ordem, com que orçamento",
        "minutos": 6
      },
      {
        "id": "p-prompt-contexto-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Porque não pôr tudo numa janela de 1M tokens",
        "minutos": 8
      },
      {
        "id": "p-prompt-contexto-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Versionar e testar prompts como código",
        "minutos": 5
      },
      {
        "id": "p-prompt-contexto-08",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Trocar de modelo sem partir os prompts",
        "minutos": 7
      },
      {
        "id": "p-prompt-contexto-09",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O modelo esquece uma instrução do sistema em conversas longas",
        "minutos": 12
      },
      {
        "id": "p-prompt-contexto-10",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Gestão de prompts para cinco equipas",
        "minutos": 18
      }
    ]
  },
  {
    "id": "tool-calling",
    "numero": 5,
    "bloco": "llm",
    "titulo": "Tool calling e saída estruturada",
    "resumo": "Como um modelo pede acções sem as executar, como se desenham, validam e autorizam ferramentas, e quando usar saída estruturada em vez de ferramentas. É aqui que um LLM passa a mexer em dinheiro, pedidos e dados, por isso é onde o entrevistador procura maturidade de engenharia.",
    "icon": "🔧",
    "modulos": [
      "tool-calling",
      "agentes",
      "guardrails-seguranca"
    ],
    "ficheiro": "t05-tool-calling",
    "perguntas": [
      {
        "id": "p-tool-calling-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quem executa a ferramenta: o ciclo de tool use",
        "minutos": 4
      },
      {
        "id": "p-tool-calling-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que faz uma boa definição de ferramenta",
        "minutos": 4
      },
      {
        "id": "p-tool-calling-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "JSON mode, saída estruturada ou tool calling",
        "minutos": 7
      },
      {
        "id": "p-tool-calling-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Se o esquema é garantido, porque continuas a validar",
        "minutos": 5
      },
      {
        "id": "p-tool-calling-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Chamadas paralelas e dependências entre ferramentas",
        "minutos": 5
      },
      {
        "id": "p-tool-calling-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "O reembolso saiu duas vezes: idempotência em ferramentas",
        "minutos": 8
      },
      {
        "id": "p-tool-calling-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Autorização: o system prompt diz para não o fazer, chega?",
        "minutos": 5
      },
      {
        "id": "p-tool-calling-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Sessenta ferramentas e o modelo começa a escolher mal",
        "minutos": 8
      },
      {
        "id": "p-tool-calling-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Escreve um dispatcher de ferramentas com validação e erros estruturados",
        "minutos": 25
      },
      {
        "id": "p-tool-calling-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O modelo inventa números de cliente e chama a ferramenta errada",
        "minutos": 10
      }
    ]
  },
  {
    "id": "escolher-modelo",
    "numero": 6,
    "bloco": "llm",
    "titulo": "Escolher, hospedar e trocar de modelo",
    "resumo": "Como se escolhe um modelo com números do teu caso e não de um ranking, quando hospedar open-weights compensa, como encaminhar pedidos entre escalões e fornecedores, e como trocar de modelo sem regressões. O entrevistador quer ver o modelo tratado como dependência com custo, risco e ciclo de vida.",
    "icon": "⚖️",
    "modulos": [
      "escolher-modelo",
      "custo-escala",
      "avaliacao-fundamentos"
    ],
    "ficheiro": "t06-escolher-modelo",
    "perguntas": [
      {
        "id": "p-escolher-modelo-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque não escolher o primeiro do ranking público",
        "minutos": 5
      },
      {
        "id": "p-escolher-modelo-02",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "API comercial ou open-weights hospedado por ti",
        "minutos": 8
      },
      {
        "id": "p-escolher-modelo-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Os dados não podem sair da UE: o que perguntas ao fornecedor",
        "minutos": 5
      },
      {
        "id": "p-escolher-modelo-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Cascata ou routing, e como escolhes o limiar",
        "minutos": 8
      },
      {
        "id": "p-escolher-modelo-05",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Fallback para outro fornecedor e prompts que não viajam",
        "minutos": 8
      },
      {
        "id": "p-escolher-modelo-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Migrar para um modelo novo sem regressões",
        "minutos": 6
      },
      {
        "id": "p-escolher-modelo-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Quando um modelo pequeno ou destilado faz melhor o trabalho",
        "minutos": 5
      },
      {
        "id": "p-escolher-modelo-08",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quantizar para caber na GPU: o que se perde",
        "minutos": 5
      },
      {
        "id": "p-escolher-modelo-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Desenha a camada de routing de modelos de uma plataforma",
        "minutos": 18
      },
      {
        "id": "p-escolher-modelo-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A qualidade caiu e ninguém fez deploy",
        "minutos": 10
      }
    ]
  },
  {
    "id": "fine-tuning",
    "numero": 7,
    "bloco": "llm",
    "titulo": "Fine-tuning, adaptação e quando não treinar",
    "resumo": "Quando treinar compensa e quando é um projecto caro para resolver o problema errado: o que muda o prompt, o RAG e o fine-tuning, como funcionam SFT, LoRA e preference tuning, como se destila um modelo grande num pequeno e como se avalia e mantém um modelo afinado.",
    "icon": "🎛️",
    "modulos": [
      "escolher-modelo",
      "engenharia-ia",
      "como-funciona-llm"
    ],
    "ficheiro": "t07-fine-tuning",
    "perguntas": [
      {
        "id": "p-fine-tuning-01",
        "tipo": "tradeoff",
        "nivel": "pleno",
        "titulo": "Prompt, RAG ou fine-tuning: o que cada um muda",
        "minutos": 7
      },
      {
        "id": "p-fine-tuning-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "SFT: que dados, em que formato e quantos",
        "minutos": 5
      },
      {
        "id": "p-fine-tuning-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "LoRA e QLoRA: o que treina, rank e memória",
        "minutos": 6
      },
      {
        "id": "p-fine-tuning-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "RLHF e DPO em alto nível",
        "minutos": 5
      },
      {
        "id": "p-fine-tuning-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Catastrophic forgetting e regressões depois de afinar",
        "minutos": 5
      },
      {
        "id": "p-fine-tuning-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Avaliar antes e depois sem contaminar o teste",
        "minutos": 6
      },
      {
        "id": "p-fine-tuning-07",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Afinar o modelo de embeddings para o domínio",
        "minutos": 7
      },
      {
        "id": "p-fine-tuning-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "O custo total de um modelo afinado",
        "minutos": 8
      },
      {
        "id": "p-fine-tuning-09",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Destilar um classificador de intenções de um modelo grande",
        "minutos": 18
      },
      {
        "id": "p-fine-tuning-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O modelo afinado é pior em produção do que no teste",
        "minutos": 12
      }
    ]
  },
  {
    "id": "ml-essencial",
    "numero": 8,
    "bloco": "llm",
    "titulo": "ML essencial para AI engineers",
    "resumo": "O ML clássico que um AI engineer usa todas as semanas mesmo sem treinar modelos de fundação: separar dados sem fuga, escolher métricas e limiares pelo custo dos erros, calibrar, saber quando um classificador simples bate um LLM, ler um teste A/B e reconhecer drift.",
    "icon": "📐",
    "modulos": [
      "engenharia-ia",
      "avaliacao-fundamentos",
      "escolher-modelo"
    ],
    "ficheiro": "t08-ml-essencial",
    "perguntas": [
      {
        "id": "p-ml-essencial-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Treino, validação, teste e as formas de fuga de dados",
        "minutos": 5
      },
      {
        "id": "p-ml-essencial-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Precisão, recall, F1 e ROC-AUC vs PR-AUC",
        "minutos": 5
      },
      {
        "id": "p-ml-essencial-03",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Escolher o limiar de decisão pelo custo dos erros",
        "minutos": 20
      },
      {
        "id": "p-ml-essencial-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Calibração: quando 0,8 quer dizer 80%",
        "minutos": 5
      },
      {
        "id": "p-ml-essencial-05",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Overfitting e as formas de regularizar",
        "minutos": 4
      },
      {
        "id": "p-ml-essencial-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quando um classificador clássico bate um LLM",
        "minutos": 7
      },
      {
        "id": "p-ml-essencial-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Testes A/B: tamanho de amostra e o problema de espreitar",
        "minutos": 6
      },
      {
        "id": "p-ml-essencial-08",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "Data drift e concept drift: detectar e responder",
        "minutos": 6
      },
      {
        "id": "p-ml-essencial-09",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Bias-variance: mais dados, mais features ou modelo maior",
        "minutos": 7
      },
      {
        "id": "p-ml-essencial-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Métricas excelentes offline e más em produção",
        "minutos": 12
      }
    ]
  },
  {
    "id": "embeddings",
    "numero": 9,
    "bloco": "rag",
    "titulo": "Embeddings e similaridade",
    "resumo": "Como um modelo de embeddings é treinado, que similaridade usar, dimensões e Matryoshka, assimetria pergunta/documento, bi- vs cross-encoder, português e domínios difíceis, e como versionar e reindexar sem parar o serviço. É a base de qualquer pergunta de RAG.",
    "icon": "🧭",
    "modulos": [
      "embeddings",
      "bases-vectoriais",
      "pesquisa-hibrida"
    ],
    "ficheiro": "t09-embeddings",
    "perguntas": [
      {
        "id": "p-embeddings-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que é um embedding de texto e como se treina",
        "minutos": 5
      },
      {
        "id": "p-embeddings-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Cosseno, produto interno ou L2 — e porque normalizar",
        "minutos": 4
      },
      {
        "id": "p-embeddings-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Dimensões, Matryoshka e truncar vectores",
        "minutos": 5
      },
      {
        "id": "p-embeddings-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Assimetria pergunta/documento e prefixos de instrução",
        "minutos": 4
      },
      {
        "id": "p-embeddings-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Bi-encoder ou cross-encoder",
        "minutos": 6
      },
      {
        "id": "p-embeddings-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Embeddings para português e para várias línguas",
        "minutos": 7
      },
      {
        "id": "p-embeddings-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Siglas, códigos e domínio: híbrido, glossário ou fine-tuning",
        "minutos": 8
      },
      {
        "id": "p-embeddings-08",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Trocar de modelo de embeddings sem downtime",
        "minutos": 18
      },
      {
        "id": "p-embeddings-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Top-k por cosseno em numpy, vectorizado e robusto",
        "minutos": 20
      },
      {
        "id": "p-embeddings-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Tudo parece relevante: scores altos e misturados",
        "minutos": 12
      }
    ]
  },
  {
    "id": "bases-vectoriais",
    "numero": 10,
    "bloco": "rag",
    "titulo": "Bases vectoriais e pesquisa aproximada",
    "resumo": "Pesquisa exacta vs aproximada, HNSW, IVF e PQ, quantização com re-scoring, filtros e o recall que se perde com eles, pgvector vs base dedicada, dimensionamento e multi-tenancy. É onde um engenheiro de backend sénior mostra que sabe de bases de dados também neste mundo.",
    "icon": "🗄️",
    "modulos": [
      "bases-vectoriais",
      "embeddings",
      "pesquisa-hibrida"
    ],
    "ficheiro": "t10-bases-vectoriais",
    "perguntas": [
      {
        "id": "p-bases-vectoriais-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Pesquisa exacta ou aproximada: quando é que o kNN exacto chega",
        "minutos": 4
      },
      {
        "id": "p-bases-vectoriais-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "HNSW por dentro: M, ef_construction, ef_search, inserções e deletes",
        "minutos": 6
      },
      {
        "id": "p-bases-vectoriais-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "IVF e Product Quantization",
        "minutos": 5
      },
      {
        "id": "p-bases-vectoriais-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quantização: halfvec, int8, binária e re-scoring",
        "minutos": 7
      },
      {
        "id": "p-bases-vectoriais-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Pré-filtro, pós-filtro e filtro dentro do índice",
        "minutos": 5
      },
      {
        "id": "p-bases-vectoriais-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "pgvector ou base vectorial dedicada",
        "minutos": 9
      },
      {
        "id": "p-bases-vectoriais-07",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quanta memória e disco para 10 milhões de vectores",
        "minutos": 5
      },
      {
        "id": "p-bases-vectoriais-08",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Multi-tenancy: filtro, partição ou índice por tenant",
        "minutos": 8
      },
      {
        "id": "p-bases-vectoriais-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Pesquisa vectorial para 50 milhões de vectores com filtros por tenant",
        "minutos": 18
      },
      {
        "id": "p-bases-vectoriais-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O recall caiu a pique quando se adicionou o filtro de categoria",
        "minutos": 10
      }
    ]
  },
  {
    "id": "chunking-ingestao",
    "numero": 11,
    "bloco": "rag",
    "titulo": "Ingestão e chunking",
    "resumo": "Como se parte, enriquece, deduplica e mantém actualizado um corpus para RAG. É perguntado porque a maioria das falhas de RAG em produção nasce na ingestão, não no modelo, e porque separa quem fez um protótipo de quem manteve um índice vivo durante meses.",
    "icon": "✂️",
    "modulos": [
      "ingestao-chunking",
      "rag-avancado"
    ],
    "ficheiro": "t11-chunking-ingestao",
    "perguntas": [
      {
        "id": "p-chunking-ingestao-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Cinco formas de partir um documento e quando usar cada uma",
        "minutos": 5
      },
      {
        "id": "p-chunking-ingestao-02",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Qual é o tamanho de chunk certo? Como escolhes tamanho e sobreposição",
        "minutos": 8
      },
      {
        "id": "p-chunking-ingestao-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Tabelas, listas e PDFs digitalizados na ingestão",
        "minutos": 5
      },
      {
        "id": "p-chunking-ingestao-04",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Que metadados guarda cada chunk e porquê",
        "minutos": 4
      },
      {
        "id": "p-chunking-ingestao-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Cabeçalho contextual com o título ou contexto gerado por LLM",
        "minutos": 7
      },
      {
        "id": "p-chunking-ingestao-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Deduplicar: duplicados exactos e quase-duplicados",
        "minutos": 5
      },
      {
        "id": "p-chunking-ingestao-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Ingestão incremental: o documento mudou ou foi apagado",
        "minutos": 6
      },
      {
        "id": "p-chunking-ingestao-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Versões de documentos: só a vigente ou o histórico com vigência",
        "minutos": 8
      },
      {
        "id": "p-chunking-ingestao-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Pipeline de ingestão para 2 milhões de documentos heterogéneos",
        "minutos": 18
      },
      {
        "id": "p-chunking-ingestao-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "As respostas citam uma política revogada",
        "minutos": 12
      }
    ]
  },
  {
    "id": "rag-falhas",
    "numero": 12,
    "bloco": "rag",
    "titulo": "RAG de ponta a ponta e modos de falha",
    "resumo": "O pipeline indexar, recuperar, aumentar e gerar, e o que fazer quando a resposta sai errada: distinguir falha de recuperação de falha de síntese, validar citações, recusar sem suporte e escolher entre RAG, contexto longo e fine-tuning. É o tema mais perguntado em vagas de AI engineer aplicado.",
    "icon": "🧩",
    "modulos": [
      "rag-basico",
      "langchain-rag",
      "avaliar-rag"
    ],
    "ficheiro": "t12-rag-falhas",
    "perguntas": [
      {
        "id": "p-rag-falhas-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O pipeline RAG de ponta a ponta, fase a fase",
        "minutos": 4
      },
      {
        "id": "p-rag-falhas-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Taxonomia de falhas de RAG e como as distingues pelo traço",
        "minutos": 6
      },
      {
        "id": "p-rag-falhas-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Citações verificáveis e como as validas depois da geração",
        "minutos": 6
      },
      {
        "id": "p-rag-falhas-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Recusar quando não há suporte: limiar, instrução ou verificação",
        "minutos": 8
      },
      {
        "id": "p-rag-falhas-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Escolher k e o limiar de score da recuperação",
        "minutos": 6
      },
      {
        "id": "p-rag-falhas-06",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O orçamento de tokens do contexto e como o divides",
        "minutos": 4
      },
      {
        "id": "p-rag-falhas-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Porque não pôr tudo numa janela de 1M tokens?",
        "minutos": 8
      },
      {
        "id": "p-rag-falhas-08",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "RAG ou fine-tuning para um assistente sobre documentos internos",
        "minutos": 3
      },
      {
        "id": "p-rag-falhas-09",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A citação aponta para um documento que não diz aquilo",
        "minutos": 12
      },
      {
        "id": "p-rag-falhas-10",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "MVP de RAG sobre documentação interna em duas semanas",
        "minutos": 16
      }
    ]
  },
  {
    "id": "hibrida-rerank",
    "numero": 13,
    "bloco": "rag",
    "titulo": "Pesquisa híbrida e re-ranking",
    "resumo": "BM25 e full-text, onde o denso e o lexical falham, como fundir as duas listas e como re-ordenar o topo com cross-encoders ou LLMs dentro de um orçamento de latência. É a parte do RAG onde mais se ganha precisão por milissegundo, e onde mais se nota quem já mediu.",
    "icon": "🔀",
    "modulos": [
      "pesquisa-hibrida",
      "bases-vectoriais",
      "avaliar-rag"
    ],
    "ficheiro": "t13-hibrida-rerank",
    "perguntas": [
      {
        "id": "p-hibrida-rerank-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Explica o BM25: o que fazem k1, b e o IDF",
        "minutos": 5
      },
      {
        "id": "p-hibrida-rerank-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Onde falha o denso e onde falha o lexical",
        "minutos": 4
      },
      {
        "id": "p-hibrida-rerank-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Full-text do PostgreSQL ou um motor de pesquisa dedicado",
        "minutos": 8
      },
      {
        "id": "p-hibrida-rerank-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Soma ponderada ou RRF: quando escolhes cada uma",
        "minutos": 7
      },
      {
        "id": "p-hibrida-rerank-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Como funciona um cross-encoder e quantos candidatos lhe dás",
        "minutos": 6
      },
      {
        "id": "p-hibrida-rerank-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Re-ranking com LLM: o que ganhas e que riscos trazes",
        "minutos": 8
      },
      {
        "id": "p-hibrida-rerank-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "SPLADE e o esparso aprendido, em alto nível",
        "minutos": 5
      },
      {
        "id": "p-hibrida-rerank-08",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Orçamento de latência de um pipeline híbrido com re-ranking",
        "minutos": 15
      },
      {
        "id": "p-hibrida-rerank-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Implementa RRF com k configurável, desempates e listas desiguais",
        "minutos": 20
      },
      {
        "id": "p-hibrida-rerank-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A pesquisa por «CH-48213» devolve documentos irrelevantes",
        "minutos": 10
      }
    ]
  },
  {
    "id": "rag-avancado",
    "numero": 14,
    "bloco": "rag",
    "titulo": "RAG avançado",
    "resumo": "O que se faz quando o RAG básico deixa de chegar: reescrever e multiplicar consultas, HyDE, filtros extraídos pelo modelo, small-to-big, contextual retrieval, compressão, isolamento entre tenants, agentes e grafos. A pergunta de fundo é sempre a mesma: que técnica, para que falha medida, a que custo.",
    "icon": "🧭",
    "modulos": [
      "rag-avancado",
      "avaliar-rag",
      "memoria"
    ],
    "ficheiro": "t14-rag-avancado",
    "perguntas": [
      {
        "id": "p-rag-avancado-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Reescrita de consulta em conversas multi-turno",
        "minutos": 4
      },
      {
        "id": "p-rag-avancado-02",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Multi-query e RAG-Fusion: quando o recall extra se paga",
        "minutos": 7
      },
      {
        "id": "p-rag-avancado-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "HyDE: quando ajuda e quando prejudica",
        "minutos": 5
      },
      {
        "id": "p-rag-avancado-04",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Self-query: deixar o modelo extrair filtros de metadados",
        "minutos": 8
      },
      {
        "id": "p-rag-avancado-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Small-to-big ou compressão de contexto",
        "minutos": 7
      },
      {
        "id": "p-rag-avancado-06",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Contextual retrieval: o que é e quanto custa",
        "minutos": 5
      },
      {
        "id": "p-rag-avancado-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "RAG multi-tenant: onde se aplica o controlo de acesso",
        "minutos": 6
      },
      {
        "id": "p-rag-avancado-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Pipeline fixo, RAG agêntico ou GraphRAG",
        "minutos": 9
      },
      {
        "id": "p-rag-avancado-09",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Mini design: RAG para perguntas que combinam três documentos",
        "minutos": 16
      },
      {
        "id": "p-rag-avancado-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A segunda pergunta da conversa recupera lixo",
        "minutos": 10
      }
    ]
  },
  {
    "id": "agentes",
    "numero": 15,
    "bloco": "agentes",
    "titulo": "Agentes: ciclo, ferramentas e limites",
    "resumo": "O que é um agente em termos operacionais, ReAct, quando um workflow ganha, limites de passos, custo e tempo, erros de ferramenta, planeamento, frameworks e observabilidade. É o tópico onde o entrevistador separa quem já pôs um agente em produção de quem só viu demos.",
    "icon": "🔁",
    "modulos": [
      "agentes",
      "langchain-lcel",
      "langgraph"
    ],
    "ficheiro": "t15-agentes",
    "perguntas": [
      {
        "id": "p-agentes-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que é, em termos operacionais, um agente",
        "minutos": 4
      },
      {
        "id": "p-agentes-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "ReAct: o que é e o que mudou face a raciocinar ou agir sozinho",
        "minutos": 5
      },
      {
        "id": "p-agentes-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quando é que NÃO usarias um agente",
        "minutos": 7
      },
      {
        "id": "p-agentes-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Uma ferramenta falhou: o que vê o modelo e o que faz o código",
        "minutos": 5
      },
      {
        "id": "p-agentes-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Plan-and-execute ou ReAct passo a passo",
        "minutos": 8
      },
      {
        "id": "p-agentes-06",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "A média do custo por turno está óptima, a factura não",
        "minutos": 6
      },
      {
        "id": "p-agentes-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Framework de agentes ou ciclo próprio",
        "minutos": 8
      },
      {
        "id": "p-agentes-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "O que tens de ver num traço de agente",
        "minutos": 5
      },
      {
        "id": "p-agentes-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Escreve o ciclo de um agente com limites e detecção de repetição",
        "minutos": 25
      },
      {
        "id": "p-agentes-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O agente chama a mesma ferramenta vinte vezes seguidas",
        "minutos": 10
      }
    ]
  },
  {
    "id": "grafos-hitl",
    "numero": 16,
    "bloco": "agentes",
    "titulo": "Grafos de estado, persistência e humano no circuito",
    "resumo": "StateGraph, reducers e arestas condicionais; checkpoints por super-step e retomar depois de uma falha; interrupts com aprovação humana; efeitos secundários que correm duas vezes; time travel; durable execution comparada com Temporal e Step Functions. É aqui que se vê quem já operou um fluxo com dinheiro e humanos no meio.",
    "icon": "🕸️",
    "modulos": [
      "langgraph",
      "langgraph-persistencia"
    ],
    "ficheiro": "t16-grafos-hitl",
    "perguntas": [
      {
        "id": "p-grafos-hitl-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "StateGraph: estado, nós, arestas condicionais e reducers",
        "minutos": 5
      },
      {
        "id": "p-grafos-hitl-02",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Grafo explícito ou agente livre com ferramentas",
        "minutos": 7
      },
      {
        "id": "p-grafos-hitl-03",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que guarda um checkpointer e como retomas depois de um crash",
        "minutos": 5
      },
      {
        "id": "p-grafos-hitl-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Aprovação humana com interrupt e Command(resume)",
        "minutos": 6
      },
      {
        "id": "p-grafos-hitl-05",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "Um nó pode correr duas vezes: como desenhas os efeitos secundários",
        "minutos": 6
      },
      {
        "id": "p-grafos-hitl-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Time travel e update_state para corrigir um thread",
        "minutos": 5
      },
      {
        "id": "p-grafos-hitl-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "LangGraph, Temporal ou Step Functions para execução durável",
        "minutos": 9
      },
      {
        "id": "p-grafos-hitl-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Fan-out com Send: processar N itens em paralelo",
        "minutos": 5
      },
      {
        "id": "p-grafos-hitl-09",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Fluxo de aprovação de reembolsos com SLA humano e expiração",
        "minutos": 18
      },
      {
        "id": "p-grafos-hitl-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O reembolso foi emitido duas vezes depois de um restart",
        "minutos": 12
      }
    ]
  },
  {
    "id": "memoria",
    "numero": 17,
    "bloco": "agentes",
    "titulo": "Memória de conversa e de longo prazo",
    "resumo": "Como um sistema sem estado parece lembrar-se: janela, trim e resumo no curto prazo; memória semântica, episódica e procedimental no longo prazo; quando escrever, como recuperar, como esquecer por obrigação legal. Pergunta-se porque é onde custo, qualidade e privacidade colidem na mesma decisão.",
    "icon": "🧠",
    "modulos": [
      "memoria",
      "langgraph-persistencia"
    ],
    "ficheiro": "t17-memoria",
    "perguntas": [
      {
        "id": "p-memoria-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Que tipos de memória tem um assistente e onde vive cada um",
        "minutos": 4
      },
      {
        "id": "p-memoria-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quanto custa um histórico que cresce e porque não usar 1M tokens",
        "minutos": 5
      },
      {
        "id": "p-memoria-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Janela por mensagens, trim por tokens ou resumo incremental",
        "minutos": 8
      },
      {
        "id": "p-memoria-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Escrever memórias no caminho quente ou em background",
        "minutos": 7
      },
      {
        "id": "p-memoria-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Recuperar memórias relevantes sem poluir o contexto",
        "minutos": 5
      },
      {
        "id": "p-memoria-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Factos que mudam: conflitos e actualizações na memória",
        "minutos": 5
      },
      {
        "id": "p-memoria-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "O que nunca guardar e como cumprir o direito ao apagamento",
        "minutos": 9
      },
      {
        "id": "p-memoria-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Como avalias se a memória ajuda ou atrapalha",
        "minutos": 5
      },
      {
        "id": "p-memoria-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Gestor de janela por orçamento de tokens",
        "minutos": 25
      },
      {
        "id": "p-memoria-10",
        "tipo": "debug",
        "nivel": "staff",
        "titulo": "O assistente mostrou a um cliente dados de outro",
        "minutos": 14
      }
    ]
  },
  {
    "id": "multi-agente-mcp",
    "numero": 18,
    "bloco": "agentes",
    "titulo": "Multi-agente e MCP",
    "resumo": "Quando dividir um agente em vários compensa e quando só multiplica custo, latência e erros; e o Model Context Protocol por dentro — arquitectura, primitivas, transportes, autorização e riscos. Pergunta-se porque é a fronteira entre a demo e a plataforma interna que várias equipas usam.",
    "icon": "🕸️",
    "modulos": [
      "multi-agente-mcp",
      "agentes"
    ],
    "ficheiro": "t18-multi-agente-mcp",
    "perguntas": [
      {
        "id": "p-multi-agente-mcp-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Padrões multi-agente: supervisor, handoffs, hierárquico, paralelo",
        "minutos": 5
      },
      {
        "id": "p-multi-agente-mcp-02",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quando um sistema multi-agente não compensa",
        "minutos": 8
      },
      {
        "id": "p-multi-agente-mcp-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Partilha de contexto entre agentes e o telefone estragado",
        "minutos": 6
      },
      {
        "id": "p-multi-agente-mcp-04",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "MCP por dentro: host, cliente, servidor e primitivas",
        "minutos": 5
      },
      {
        "id": "p-multi-agente-mcp-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Transportes MCP: stdio e Streamable HTTP",
        "minutos": 5
      },
      {
        "id": "p-multi-agente-mcp-06",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "Autorização num servidor MCP remoto",
        "minutos": 6
      },
      {
        "id": "p-multi-agente-mcp-07",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "MCP ou function calling directo",
        "minutos": 7
      },
      {
        "id": "p-multi-agente-mcp-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Riscos de segurança do MCP e como os mitigas",
        "minutos": 6
      },
      {
        "id": "p-multi-agente-mcp-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Expor 30 ferramentas internas a vários assistentes via MCP",
        "minutos": 18
      },
      {
        "id": "p-multi-agente-mcp-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O sistema multi-agente custa 6× e é mais lento",
        "minutos": 12
      }
    ]
  },
  {
    "id": "avaliacao",
    "numero": 19,
    "bloco": "avaliacao",
    "titulo": "Avaliação: conjuntos dourados e eval-driven development",
    "resumo": "Como se prova que um sistema com LLM funciona e que uma mudança o melhorou: tipos de avaliação, conjunto dourado, ruído e tamanho da amostra, análise de erros, offline contra online e evals como gate de CI. É o tema que mais separa quem fez uma demo de quem pôs um sistema em produção.",
    "icon": "🎯",
    "modulos": [
      "avaliacao-fundamentos",
      "avaliar-rag",
      "ci-cd"
    ],
    "ficheiro": "t19-avaliacao",
    "perguntas": [
      {
        "id": "p-avaliacao-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque é que «parece bem» não é uma métrica",
        "minutos": 4
      },
      {
        "id": "p-avaliacao-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Asserções, conjunto dourado, humanos e sinais online",
        "minutos": 5
      },
      {
        "id": "p-avaliacao-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Construir um conjunto dourado do zero e decidir o tamanho",
        "minutos": 6
      },
      {
        "id": "p-avaliacao-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Análise de erros: ler traços antes de escolher métricas",
        "minutos": 5
      },
      {
        "id": "p-avaliacao-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Eval-driven development: quando começar e quanto investir",
        "minutos": 7
      },
      {
        "id": "p-avaliacao-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Avaliação offline contra online: A/B e sinais implícitos",
        "minutos": 8
      },
      {
        "id": "p-avaliacao-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Overfitting ao conjunto dourado",
        "minutos": 8
      },
      {
        "id": "p-avaliacao-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Evals como gate de CI quando a métrica tem ruído",
        "minutos": 8
      },
      {
        "id": "p-avaliacao-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "IC por bootstrap da diferença emparelhada entre dois sistemas",
        "minutos": 20
      },
      {
        "id": "p-avaliacao-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A métrica online piora e a offline está estável",
        "minutos": 12
      }
    ]
  },
  {
    "id": "avaliar-rag",
    "numero": 20,
    "bloco": "avaliacao",
    "titulo": "Avaliar RAG",
    "resumo": "Como se mede um RAG peça a peça e de ponta a ponta: métricas de recuperação (recall@k, MRR, nDCG), métricas de geração (faithfulness, relevância, context precision e recall), citações, perguntas sintéticas, anotação barata e comparações com significância. Perguntado porque quase toda a gente tem um RAG e quase ninguém sabe se ele funciona.",
    "icon": "🔎",
    "modulos": [
      "avaliar-rag",
      "avaliacao-fundamentos",
      "llm-como-juiz"
    ],
    "ficheiro": "t20-avaliar-rag",
    "perguntas": [
      {
        "id": "p-avaliar-rag-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Recall@k, precision@k, MRR e nDCG: fórmulas e quando usar cada uma",
        "minutos": 5
      },
      {
        "id": "p-avaliar-rag-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Relevância binária contra relevância graduada",
        "minutos": 4
      },
      {
        "id": "p-avaliar-rag-03",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "O que as métricas do RAGAS medem de facto",
        "minutos": 6
      },
      {
        "id": "p-avaliar-rag-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Avaliar componente a componente ou de ponta a ponta",
        "minutos": 7
      },
      {
        "id": "p-avaliar-rag-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Perguntas sintéticas: o que ganhas e onde enviesam",
        "minutos": 7
      },
      {
        "id": "p-avaliar-rag-06",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Anotar relevância com pouco orçamento",
        "minutos": 9
      },
      {
        "id": "p-avaliar-rag-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Comparar configurações de chunking e pesquisa com significância",
        "minutos": 6
      },
      {
        "id": "p-avaliar-rag-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Precisão e recall de citações",
        "minutos": 5
      },
      {
        "id": "p-avaliar-rag-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Implementar recall@k, MRR e nDCG@k a partir de rankings",
        "minutos": 20
      },
      {
        "id": "p-avaliar-rag-10",
        "tipo": "debug",
        "nivel": "staff",
        "titulo": "Faithfulness alta e utilizadores a dizer que está errado",
        "minutos": 12
      }
    ]
  },
  {
    "id": "llm-juiz",
    "numero": 21,
    "bloco": "avaliacao",
    "titulo": "LLM-como-juiz",
    "resumo": "Quando pôr um modelo a avaliar outro, como escrever a rubrica, que vieses o juiz tem e como provar que ele concorda com humanos. É perguntado porque quase todas as equipas usam juízes e poucas os calibram.",
    "icon": "⚖️",
    "modulos": [
      "llm-como-juiz",
      "avaliacao-fundamentos",
      "avaliar-rag"
    ],
    "ficheiro": "t21-llm-juiz",
    "perguntas": [
      {
        "id": "p-llm-juiz-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quando usar um juiz e quando uma asserção em código chega",
        "minutos": 4
      },
      {
        "id": "p-llm-juiz-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Rubrica binária decomposta ou nota de 1 a 10",
        "minutos": 5
      },
      {
        "id": "p-llm-juiz-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Pointwise, pairwise ou contra uma resposta de referência",
        "minutos": 7
      },
      {
        "id": "p-llm-juiz-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Os vieses conhecidos do juiz e como os mitigas",
        "minutos": 5
      },
      {
        "id": "p-llm-juiz-05",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque é que 90% de concordância pode não valer nada",
        "minutos": 5
      },
      {
        "id": "p-llm-juiz-06",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Implementa o Cohen kappa e a matriz de confusão do juiz",
        "minutos": 15
      },
      {
        "id": "p-llm-juiz-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Que modelo julga, quanto custa e quanto amostras em produção",
        "minutos": 8
      },
      {
        "id": "p-llm-juiz-08",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "O fornecedor actualizou o modelo do juiz: e agora",
        "minutos": 6
      },
      {
        "id": "p-llm-juiz-09",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Juízes de segurança e de tom: offline, online e o custo dos erros",
        "minutos": 5
      },
      {
        "id": "p-llm-juiz-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O juiz aprova 95% e os humanos só 70%",
        "minutos": 10
      }
    ]
  },
  {
    "id": "avaliar-agentes",
    "numero": 22,
    "bloco": "avaliacao",
    "titulo": "Avaliar agentes e conversas",
    "resumo": "Como se avalia um sistema que decide, chama ferramentas e muda estado ao longo de vários turnos: resultado contra trajectória, chamadas a ferramentas, fiabilidade com pass^k, utilizadores e ambientes simulados, custo e regressões. É perguntado porque avaliar só o texto final de um agente deixa passar os erros que custam dinheiro.",
    "icon": "🧭",
    "modulos": [
      "avaliar-agentes",
      "agentes",
      "langgraph"
    ],
    "ficheiro": "t22-avaliar-agentes",
    "perguntas": [
      {
        "id": "p-avaliar-agentes-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O agente disse que reembolsou: como sabes que reembolsou mesmo",
        "minutos": 5
      },
      {
        "id": "p-avaliar-agentes-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Medir tool-call accuracy: ferramenta, argumentos e ordem",
        "minutos": 5
      },
      {
        "id": "p-avaliar-agentes-03",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Passos, custo e latência como métricas de um agente",
        "minutos": 4
      },
      {
        "id": "p-avaliar-agentes-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "pass@k contra pass^k: qual importa para um agente em produção",
        "minutos": 5
      },
      {
        "id": "p-avaliar-agentes-05",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Utilizador simulado por LLM: quando ajuda e onde engana",
        "minutos": 7
      },
      {
        "id": "p-avaliar-agentes-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Ferramentas simuladas, ambiente com estado ou serviços reais",
        "minutos": 7
      },
      {
        "id": "p-avaliar-agentes-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Traços de referência como testes de regressão",
        "minutos": 5
      },
      {
        "id": "p-avaliar-agentes-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "O modelo novo subiu no τ-bench e no SWE-bench: trocamos",
        "minutos": 6
      },
      {
        "id": "p-avaliar-agentes-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Desenha o harness de avaliação de um agente que emite reembolsos",
        "minutos": 18
      },
      {
        "id": "p-avaliar-agentes-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Sucesso igual, custo por tarefa a dobrar depois de mudar o prompt",
        "minutos": 10
      }
    ]
  },
  {
    "id": "seguranca",
    "numero": 23,
    "bloco": "avaliacao",
    "titulo": "Segurança: prompt injection e guardrails",
    "resumo": "O OWASP Top 10 para LLMs, injecção directa e indirecta, exfiltração, excessive agency, PII e segredos, red teaming e modelo de ameaça. É perguntado porque qualquer sistema com ferramentas e dados de clientes é um alvo, e porque a resposta certa é arquitectural, não um filtro.",
    "icon": "🛡️",
    "modulos": [
      "guardrails-seguranca",
      "tool-calling",
      "agentes"
    ],
    "ficheiro": "t23-seguranca",
    "perguntas": [
      {
        "id": "p-seguranca-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O OWASP Top 10 para LLMs aplicado ao teu sistema",
        "minutos": 5
      },
      {
        "id": "p-seguranca-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Injecção directa, indirecta e onde entra o jailbreak",
        "minutos": 5
      },
      {
        "id": "p-seguranca-03",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Porque é que um classificador de injecção não chega",
        "minutos": 8
      },
      {
        "id": "p-seguranca-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Exfiltração de dados por imagens, links e ferramentas",
        "minutos": 5
      },
      {
        "id": "p-seguranca-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Segredos e chaves de API no contexto do modelo",
        "minutos": 4
      },
      {
        "id": "p-seguranca-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Autonomia do agente contra confirmação humana",
        "minutos": 8
      },
      {
        "id": "p-seguranca-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "PII na entrada, nos logs e na saída",
        "minutos": 5
      },
      {
        "id": "p-seguranca-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Como organizas e medes um red team",
        "minutos": 6
      },
      {
        "id": "p-seguranca-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Modelo de ameaça de um assistente que responde a emails",
        "minutos": 18
      },
      {
        "id": "p-seguranca-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O assistente mostrou o system prompt e dados de outro cliente",
        "minutos": 12
      }
    ]
  },
  {
    "id": "governanca",
    "numero": 24,
    "bloco": "avaliacao",
    "titulo": "Privacidade, governança e IA responsável",
    "resumo": "RGPD aplicado a sistemas LLM, AI Act e o seu calendário, NIST AI RMF, documentação, enviesamento, supervisão humana e auditoria. Perguntado porque um AI engineer sénior tem de saber o que o desenho técnico implica legalmente — e quando parar e chamar o DPO.",
    "icon": "⚖️",
    "modulos": [
      "guardrails-seguranca",
      "observabilidade-llmops",
      "avaliacao-fundamentos"
    ],
    "ficheiro": "t24-governanca",
    "perguntas": [
      {
        "id": "p-governanca-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que o RGPD exige de um assistente com LLM",
        "minutos": 5
      },
      {
        "id": "p-governanca-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "AIPD de um sistema LLM: quando e o que lá vai",
        "minutos": 5
      },
      {
        "id": "p-governanca-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "API nos EUA, região UE ou modelo próprio",
        "minutos": 8
      },
      {
        "id": "p-governanca-04",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "A abordagem por risco do AI Act",
        "minutos": 5
      },
      {
        "id": "p-governanca-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Quem cumpre o quê e desde quando no AI Act",
        "minutos": 6
      },
      {
        "id": "p-governanca-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "NIST AI RMF e a documentação que deixas para trás",
        "minutos": 5
      },
      {
        "id": "p-governanca-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Medir enviesamento num assistente sem recolher dados sensíveis",
        "minutos": 9
      },
      {
        "id": "p-governanca-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Supervisão humana que funciona e rastos de auditoria",
        "minutos": 5
      },
      {
        "id": "p-governanca-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Governança mínima para lançar um assistente num banco",
        "minutos": 18
      },
      {
        "id": "p-governanca-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Pedido de apagamento: onde estão os dados do cliente",
        "minutos": 12
      }
    ]
  },
  {
    "id": "servir-modelos",
    "numero": 25,
    "bloco": "producao",
    "titulo": "Servir LLMs: streaming, concorrência e inferência",
    "resumo": "Do endpoint que faz streaming de tokens ao servidor de inferência na GPU: SSE, async em Python, cancelamento, timeouts e backpressure, continuous batching e PagedAttention, memória de GPU, quantização e autoscaling. É onde um engenheiro de backend sénior mostra que sabe aplicar o que já sabe a um recurso caro e lento.",
    "icon": "🚀",
    "modulos": [
      "fastapi-servico",
      "escolher-modelo",
      "custo-escala"
    ],
    "ficheiro": "t25-servir-modelos",
    "perguntas": [
      {
        "id": "p-servir-modelos-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "SSE ou WebSocket para fazer streaming de tokens",
        "minutos": 4
      },
      {
        "id": "p-servir-modelos-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "O que bloqueia o event loop num serviço LLM em Python",
        "minutos": 5
      },
      {
        "id": "p-servir-modelos-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Timeouts e backpressure quando o modelo é o recurso escasso",
        "minutos": 8
      },
      {
        "id": "p-servir-modelos-04",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Continuous batching e PagedAttention: porque sobem o throughput",
        "minutos": 6
      },
      {
        "id": "p-servir-modelos-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Quantas conversas cabem numa GPU de 80 GB",
        "minutos": 6
      },
      {
        "id": "p-servir-modelos-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Quantizar para int4: o que ganhas e o que perdes",
        "minutos": 7
      },
      {
        "id": "p-servir-modelos-07",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "TTFT, throughput e custo por token: o preço do batch grande",
        "minutos": 9
      },
      {
        "id": "p-servir-modelos-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Autoscaling de réplicas com GPU: o que medir e o que esperar",
        "minutos": 8
      },
      {
        "id": "p-servir-modelos-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Endpoint SSE com prazos e cancelamento quando o cliente desliga",
        "minutos": 25
      },
      {
        "id": "p-servir-modelos-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O TTFT p95 dispara com carga moderada",
        "minutos": 12
      }
    ]
  },
  {
    "id": "llmops",
    "numero": 26,
    "bloco": "producao",
    "titulo": "Observabilidade e LLMOps",
    "resumo": "Saber o que o sistema fez e se fez bem, depois de estar em produção: traços OpenTelemetry com as convenções gen_ai, métricas e alertas de qualidade, logs sem dados pessoais, versões de prompts, feedback e avaliações online, e drift das perguntas. É aqui que se vê quem já operou um produto LLM e quem só fez a demo.",
    "icon": "🔭",
    "modulos": [
      "observabilidade-llmops",
      "llm-como-juiz",
      "avaliacao-fundamentos"
    ],
    "ficheiro": "t26-llmops",
    "perguntas": [
      {
        "id": "p-llmops-01",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "O traço de um turno de agente com RAG, span a span",
        "minutos": 6
      },
      {
        "id": "p-llmops-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "As métricas do painel de um produto LLM",
        "minutos": 5
      },
      {
        "id": "p-llmops-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Logs e traços sem dados pessoais, e o que amostrar",
        "minutos": 8
      },
      {
        "id": "p-llmops-04",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Prompts em produção: registo, rollout e rollback",
        "minutos": 7
      },
      {
        "id": "p-llmops-05",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Ligar o feedback do utilizador ao traço",
        "minutos": 5
      },
      {
        "id": "p-llmops-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Avaliação online com juiz: quanto amostrar e quanto custa",
        "minutos": 8
      },
      {
        "id": "p-llmops-07",
        "tipo": "conceito",
        "nivel": "staff",
        "titulo": "Detectar drift nas perguntas e intenções novas",
        "minutos": 6
      },
      {
        "id": "p-llmops-08",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Alertas de qualidade: o que acorda alguém e o que fica para segunda",
        "minutos": 7
      },
      {
        "id": "p-llmops-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Plataforma de observabilidade para 12 aplicações LLM",
        "minutos": 18
      },
      {
        "id": "p-llmops-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "A satisfação caiu 8 pontos e ninguém fez deploy",
        "minutos": 12
      }
    ]
  },
  {
    "id": "custo-latencia",
    "numero": 27,
    "bloco": "producao",
    "titulo": "Custo, latência e escala",
    "resumo": "Quanto custa uma conversa e porquê, as alavancas que o baixam (prompt caching, cache semântica, routing, contexto e saída mais curtos) e o que custam em qualidade, onde vão os milissegundos de um turno, e como aguentar rate limits, picos e falhas do fornecedor sem cair. É o tópico onde se vê se o candidato já pagou uma factura.",
    "icon": "💸",
    "modulos": [
      "custo-escala",
      "observabilidade-llmops",
      "escolher-modelo"
    ],
    "ficheiro": "t27-custo-latencia",
    "perguntas": [
      {
        "id": "p-custo-latencia-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Quanto custa uma conversa e quanto custa por mês",
        "minutos": 6
      },
      {
        "id": "p-custo-latencia-02",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Estruturar o prompt para a cache acertar",
        "minutos": 5
      },
      {
        "id": "p-custo-latencia-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Cache semântica: quanto poupa e o que parte",
        "minutos": 7
      },
      {
        "id": "p-custo-latencia-04",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Routing por custo e cascatas de modelos",
        "minutos": 8
      },
      {
        "id": "p-custo-latencia-05",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Porque não pôr tudo numa janela de 1M tokens",
        "minutos": 5
      },
      {
        "id": "p-custo-latencia-06",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Onde vão os milissegundos de um turno e o que o streaming muda",
        "minutos": 6
      },
      {
        "id": "p-custo-latencia-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Rate limits do fornecedor, filas e backpressure",
        "minutos": 6
      },
      {
        "id": "p-custo-latencia-08",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Degradação graciosa: o que cortas primeiro",
        "minutos": 7
      },
      {
        "id": "p-custo-latencia-09",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Cortar 60% do custo sem perder qualidade",
        "minutos": 18
      },
      {
        "id": "p-custo-latencia-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O custo diário triplicou e o tráfego não mexeu",
        "minutos": 12
      }
    ]
  },
  {
    "id": "testes-cicd",
    "numero": 28,
    "bloco": "producao",
    "titulo": "Testes, CI/CD e releases",
    "resumo": "Como se testa uma aplicação que chama modelos não determinísticos: o que corre sem rede em cada commit, o que é eval com modelo real, como uma eval vira gate de CI sem ser ruído, como se versionam prompts e conjuntos dourados com o código, e como se lança uma mudança de prompt ou de modelo com canary, shadow, flags e rollback. É onde o entrevistador separa quem fez demos de quem mantém um sistema.",
    "icon": "🧪",
    "modulos": [
      "ci-cd",
      "git-fluxo",
      "docker"
    ],
    "ficheiro": "t28-testes-cicd",
    "perguntas": [
      {
        "id": "p-testes-cicd-01",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "A pirâmide de testes de uma aplicação LLM",
        "minutos": 5
      },
      {
        "id": "p-testes-cicd-02",
        "tipo": "conceito",
        "nivel": "pleno",
        "titulo": "Testar código que chama modelos sem rede",
        "minutos": 4
      },
      {
        "id": "p-testes-cicd-03",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Snapshot e golden tests: onde servem e onde mentem",
        "minutos": 7
      },
      {
        "id": "p-testes-cicd-04",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Evals como gate de CI: o que corre no PR e o que corre de noite",
        "minutos": 9
      },
      {
        "id": "p-testes-cicd-05",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Versionar prompts e conjuntos dourados com o código",
        "minutos": 5
      },
      {
        "id": "p-testes-cicd-06",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Lançar um prompt ou modelo novo: canary, shadow ou flag",
        "minutos": 8
      },
      {
        "id": "p-testes-cicd-07",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "Uma imagem Docker reprodutível para o serviço",
        "minutos": 5
      },
      {
        "id": "p-testes-cicd-08",
        "tipo": "conceito",
        "nivel": "senior",
        "titulo": "git bisect para encontrar uma regressão de qualidade",
        "minutos": 5
      },
      {
        "id": "p-testes-cicd-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Testar um classificador LLM com um modelo falso",
        "minutos": 20
      },
      {
        "id": "p-testes-cicd-10",
        "tipo": "debug",
        "nivel": "staff",
        "titulo": "O gate de evals falha aleatoriamente em 1 de cada 4 PRs",
        "minutos": 12
      }
    ]
  },
  {
    "id": "design-rag",
    "numero": 29,
    "bloco": "rondas",
    "titulo": "System design I: pesquisa e RAG",
    "resumo": "Seis rondas de system design de 45 minutos sobre pesquisa e RAG — apoio ao cliente, enterprise search multi-tenant, regulamentação com auditoria, pesquisa de produtos, extracção em lote e assistente de código — resolvidas como um candidato forte o faz no quadro.",
    "icon": "🏗️",
    "modulos": [
      "balcao-ponta-a-ponta",
      "entrevista"
    ],
    "ficheiro": "t29-design-rag",
    "perguntas": [
      {
        "id": "p-design-rag-01",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Assistente de apoio ao cliente de uma operadora com 5M clientes",
        "minutos": 45
      },
      {
        "id": "p-design-rag-02",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Enterprise search multi-tenant com permissões por documento",
        "minutos": 50
      },
      {
        "id": "p-design-rag-03",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Q&A sobre regulamentação bancária com citações, auditoria e versões",
        "minutos": 50
      },
      {
        "id": "p-design-rag-04",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Pesquisa semântica de 5M produtos com filtros abaixo de 200 ms",
        "minutos": 45
      },
      {
        "id": "p-design-rag-05",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Extracção em lote de 200k documentos de sinistros por dia com revisão humana",
        "minutos": 45
      },
      {
        "id": "p-design-rag-06",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Assistente de código e documentação interna para 800 engenheiros",
        "minutos": 50
      }
    ]
  },
  {
    "id": "design-agentes",
    "numero": 30,
    "bloco": "rondas",
    "titulo": "System design II: agentes e plataformas",
    "resumo": "Seis rondas de system design de 45 minutos sobre agentes com efeitos, voz em tempo real, investigação multi-agente e as plataformas internas que os sustentam (gateway de LLM, avaliação contínua). É aqui que se decide se o nível é sénior ou staff.",
    "icon": "🧩",
    "modulos": [
      "balcao-ponta-a-ponta",
      "entrevista",
      "agentes",
      "avaliar-agentes"
    ],
    "ficheiro": "t30-design-agentes",
    "perguntas": [
      {
        "id": "p-design-agentes-01",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Agente de operações com reembolsos, créditos e cancelamentos",
        "minutos": 45
      },
      {
        "id": "p-design-agentes-02",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Gateway interno de LLM para 30 equipas",
        "minutos": 45
      },
      {
        "id": "p-design-agentes-03",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Agente de voz para call center com resposta abaixo de 1 segundo",
        "minutos": 45
      },
      {
        "id": "p-design-agentes-04",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Deep research multi-agente com orçamento, prazo e citações verificadas",
        "minutos": 50
      },
      {
        "id": "p-design-agentes-05",
        "tipo": "design",
        "nivel": "staff",
        "titulo": "Plataforma de avaliação contínua para toda a empresa",
        "minutos": 45
      },
      {
        "id": "p-design-agentes-06",
        "tipo": "design",
        "nivel": "senior",
        "titulo": "Copiloto de email e CRM com prompt injection indirecta como requisito",
        "minutos": 45
      }
    ]
  },
  {
    "id": "codigo-ao-vivo",
    "numero": 31,
    "bloco": "rondas",
    "titulo": "Código ao vivo para AI engineers",
    "resumo": "Dez exercícios de live coding que aparecem em rondas de AI engineer: recuperação (cosseno, BM25, RRF, chunking, métricas), robustez de chamadas a APIs (retentativas, rate limit, streaming SSE), o ciclo de um agente e uma cache semântica. Cada um com solução completa em Python e testes que correm.",
    "icon": "⌨️",
    "modulos": [
      "entrevista",
      "pesquisa-hibrida",
      "agentes",
      "apis-de-modelos",
      "custo-escala"
    ],
    "ficheiro": "t31-codigo-ao-vivo",
    "perguntas": [
      {
        "id": "p-codigo-ao-vivo-01",
        "tipo": "codigo",
        "nivel": "pleno",
        "titulo": "Top-k por cosseno vectorizado com numpy",
        "minutos": 15
      },
      {
        "id": "p-codigo-ao-vivo-02",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "BM25 de raiz com índice invertido",
        "minutos": 25
      },
      {
        "id": "p-codigo-ao-vivo-03",
        "tipo": "codigo",
        "nivel": "pleno",
        "titulo": "Reciprocal Rank Fusion de N listas com desempate determinístico",
        "minutos": 12
      },
      {
        "id": "p-codigo-ao-vivo-04",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Chunker recursivo com sobreposição que não parte palavras",
        "minutos": 25
      },
      {
        "id": "p-codigo-ao-vivo-05",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "recall@k, MRR e nDCG@k com relevância graduada",
        "minutos": 20
      },
      {
        "id": "p-codigo-ao-vivo-06",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Retentativas com backoff exponencial, jitter total e Retry-After",
        "minutos": 20
      },
      {
        "id": "p-codigo-ao-vivo-07",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Rate limiter de token bucket para RPM e TPM em simultâneo",
        "minutos": 30
      },
      {
        "id": "p-codigo-ao-vivo-08",
        "tipo": "codigo",
        "nivel": "staff",
        "titulo": "Ciclo de agente com despacho validado e paragem segura",
        "minutos": 35
      },
      {
        "id": "p-codigo-ao-vivo-09",
        "tipo": "codigo",
        "nivel": "senior",
        "titulo": "Parser incremental de Server-Sent Events para streaming",
        "minutos": 30
      },
      {
        "id": "p-codigo-ao-vivo-10",
        "tipo": "codigo",
        "nivel": "staff",
        "titulo": "Cache semântica com limiar, TTL e despejo LRU",
        "minutos": 30
      }
    ]
  },
  {
    "id": "debugging",
    "numero": 32,
    "bloco": "rondas",
    "titulo": "Debugging e incidentes de produção",
    "resumo": "Dez incidentes reais de sistemas LLM — latência, idioma, JSON partido, pesquisa vazia, injecção indirecta, streams pendurados, deriva sem deploy, 429 em lote, acções indevidas de um agente e custo a disparar. A ronda mede método: localizar antes de corrigir, medir antes de opinar, e fechar com prevenção.",
    "icon": "🧯",
    "modulos": [
      "entrevista",
      "observabilidade-llmops"
    ],
    "ficheiro": "t32-debugging",
    "perguntas": [
      {
        "id": "p-debugging-01",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "O deploy «só mudou o prompt» e o p95 duplicou",
        "minutos": 10
      },
      {
        "id": "p-debugging-02",
        "tipo": "debug",
        "nivel": "pleno",
        "titulo": "Parte das respostas sai em inglês para clientes portugueses",
        "minutos": 8
      },
      {
        "id": "p-debugging-03",
        "tipo": "debug",
        "nivel": "pleno",
        "titulo": "JSON inválido em 2% dos pedidos, só nos documentos longos",
        "minutos": 8
      },
      {
        "id": "p-debugging-04",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Depois da migração do índice, um tenant deixou de ter resultados",
        "minutos": 12
      },
      {
        "id": "p-debugging-05",
        "tipo": "debug",
        "nivel": "staff",
        "titulo": "Um documento recuperado pôs o assistente a enviar um link de phishing",
        "minutos": 15
      },
      {
        "id": "p-debugging-06",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Ligações SSE penduradas esgotam os workers",
        "minutos": 12
      },
      {
        "id": "p-debugging-07",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Escalamento para humanos de 20% para 35% sem nenhum deploy",
        "minutos": 12
      },
      {
        "id": "p-debugging-08",
        "tipo": "debug",
        "nivel": "pleno",
        "titulo": "A reindexação de embeddings passou de 2 h para 11 h e falha com 429",
        "minutos": 10
      },
      {
        "id": "p-debugging-09",
        "tipo": "debug",
        "nivel": "staff",
        "titulo": "O agente está a dar crédito a clientes que não o pediram",
        "minutos": 15
      },
      {
        "id": "p-debugging-10",
        "tipo": "debug",
        "nivel": "senior",
        "titulo": "Activámos memória de conversa e o custo por conversa subiu 4×",
        "minutos": 10
      }
    ]
  },
  {
    "id": "comportamental",
    "numero": 33,
    "bloco": "rondas",
    "titulo": "Comportamental, produto e senioridade",
    "resumo": "A conversa que decide o nível: sistemas que puseste em produção, projectos que falharam, desacordos com produto, incidentes, mentoria e decisões de build vs buy. As respostas-modelo seguem STAR com números — são histórias de exemplo para trocares pelas tuas.",
    "icon": "🧭",
    "modulos": [
      "entrevista"
    ],
    "ficheiro": "t33-comportamental",
    "perguntas": [
      {
        "id": "p-comportamental-01",
        "tipo": "comportamental",
        "nivel": "pleno",
        "titulo": "Conta-me um sistema com LLM que puseste em produção",
        "minutos": 6
      },
      {
        "id": "p-comportamental-02",
        "tipo": "comportamental",
        "nivel": "senior",
        "titulo": "Um projecto de IA que falhou e o que aprendeste",
        "minutos": 6
      },
      {
        "id": "p-comportamental-03",
        "tipo": "comportamental",
        "nivel": "senior",
        "titulo": "Produto quer lançar sem avaliação: como lidaste com isso",
        "minutos": 6
      },
      {
        "id": "p-comportamental-04",
        "tipo": "comportamental",
        "nivel": "staff",
        "titulo": "Convenceste stakeholders de que um LLM não era a solução certa",
        "minutos": 7
      },
      {
        "id": "p-comportamental-05",
        "tipo": "comportamental",
        "nivel": "senior",
        "titulo": "Estimar e entregar com muita incerteza: protótipo vs produção",
        "minutos": 6
      },
      {
        "id": "p-comportamental-06",
        "tipo": "comportamental",
        "nivel": "senior",
        "titulo": "Um incidente em que foste dono do problema",
        "minutos": 7
      },
      {
        "id": "p-comportamental-07",
        "tipo": "comportamental",
        "nivel": "staff",
        "titulo": "Como elevaste a equipa em práticas de avaliação",
        "minutos": 7
      },
      {
        "id": "p-comportamental-08",
        "tipo": "tradeoff",
        "nivel": "staff",
        "titulo": "Build vs buy: plataforma de evals, gateway de modelos, base vectorial",
        "minutos": 8
      },
      {
        "id": "p-comportamental-09",
        "tipo": "tradeoff",
        "nivel": "senior",
        "titulo": "Dívida de prompts e evals vs funcionalidades novas",
        "minutos": 7
      },
      {
        "id": "p-comportamental-10",
        "tipo": "comportamental",
        "nivel": "pleno",
        "titulo": "Porque é que um engenheiro de backend é um bom AI engineer",
        "minutos": 5
      }
    ]
  }
];
