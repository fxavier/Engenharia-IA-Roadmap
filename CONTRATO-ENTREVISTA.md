# Contrato de conteúdo — área «Entrevista» (preparação para entrevista de AI engineer)

Fonte única de verdade para quem escreve tópicos de entrevista. **Lê `src/types.ts` (secção
«entrevista», no fim) e `src/entrevista/blocos.ts` antes de escrever seja o que for.** Lê também
`src/entrevista/exemplo.ts`: é o padrão de qualidade — mesma densidade, mesmo tom, mesma estrutura.

A área «Entrevista» vive dentro do tutorial «Engenharia de IA» (projecto «Balcão»), mas é uma
trilha própria: 33 tópicos em 6 blocos, cada um com perguntas de entrevista, resposta-modelo,
rubrica de auto-avaliação, perguntas de seguimento e sinais de alarme. As perguntas alimentam dois
modos: **praticar por tópico** (respondes, revelas a resposta-modelo, auto-avalias com a rubrica) e
**simulação cronometrada** (uma ronda inteira sem ver respostas, relatório no fim).

## Público e objectivo

O leitor é um **engenheiro de software sénior** (backend Java/Spring/Quarkus, Go, Python,
TypeScript; sistemas distribuídos, bases de dados, cloud, segurança) que se candidata a vagas de
**AI engineer aplicado**: constrói produtos sobre LLMs (RAG, agentes, avaliação, LLMOps), não
treina modelos de fundação. O alvo é passar rondas de nível **sénior** e mostrar sinais de **staff**.

A resposta-modelo é **o que um candidato forte diz em voz alta naquele tempo**, não um capítulo de
livro: começa pela resposta directa, depois mecanismo, depois trade-offs e números, depois o que
faria em produção. Tem de caber no tempo sugerido (`minutos`) se dita a ritmo de conversa —
cerca de 130 palavras por minuto, e a resposta-modelo pode ter até ~1,5× isso porque inclui o
que se escreveria no quadro.

## Regras de ouro

1. **Português europeu**, técnico e directo. Termos técnicos ficam **em inglês** quando é assim
   que se dizem (`token`, `embedding`, `chunk`, `re-ranking`, `tool calling`, `prompt injection`,
   `guardrail`, `eval`, `golden set`, `faithfulness`, `checkpoint`, `streaming`, `backoff`,
   `rate limit`, `canary`, `KV cache`, `fine-tuning`, `LoRA`). Na prosa usa a 2.ª pessoa
   («explicas», «repara»). Nada de «você». A resposta-modelo é escrita na **1.ª pessoa do
   candidato** («Eu começava por…», «No último sistema que pus em produção…») quando isso soa
   natural; caso contrário, impessoal.
2. **Rigor acima de tudo.** Cada afirmação técnica tem de ser verificável em documentação oficial
   ou no artigo original. Nada de «é muito mais rápido»: diz quanto, medido como. Números que mudam
   (preços, janelas de contexto, nomes de modelos) escrevem-se como **ordem de grandeza** com a
   data/versão em que valem, ou usam os escalões `pequeno`/`médio`/`grande`/`local`. **Nunca
   inventes benchmarks, preços exactos nem nomes de modelos.**
3. **Nada de misticismo.** Um LLM não «pensa» nem «sabe»: gera tokens condicionados no contexto.
4. **Sénior, não enciclopédico.** O que separa níveis é: quantificar, nomear trade-offs, saber
   quando *não* usar a técnica, pensar em avaliação e operação desde o início, e ligar a decisão a
   impacto no negócio (custo, risco, tempo). A rubrica tem de reflectir isto.
5. **Exemplos do mundo real.** Usa o «Balcão» (assistente de suporte do «Chega», marketplace de
   entregas em Maputo — números em `src/data/parts.ts` e `src/data/design.ts`) quando ajuda, mas
   **varia**: banco móvel, seguradora, operador de telecomunicações, farmácia online, empresa de
   logística, SaaS B2B multi-tenant, em Moçambique, Portugal ou genérico. Uma entrevista real não
   conhece o «Balcão» — o candidato fala da sua experiência.
6. **Código que corre.** Python 3.13 válido (ou TypeScript/Java/Go quando a pergunta o pede), com
   a API real das bibliotecas. Nada de parâmetros inventados. Em perguntas de `codigo`, a solução é
   completa, com tratamento de casos-limite e um teste ou exemplo de uso com o resultado esperado
   em comentário — e esse resultado tem de estar **certo** (corre-o com `python3` antes de colar).
7. **Sem emojis no texto.** Só `TopicoEntrevista.icon` leva um emoji.
8. **Sem repetição entre perguntas.** Dez perguntas de um tópico cobrem dez ângulos diferentes.
   Antes de escrever, faz a lista dos ângulos e garante que não se sobrepõem. Podes sobrepor-te
   ligeiramente a outros tópicos (um entrevistador também o faz), mas não copies.
9. **Perguntas que se fazem mesmo.** Escreve o enunciado como um entrevistador o diria, incluindo
   as perguntas-armadilha clássicas («Porque não pôr tudo numa janela de 1M tokens?», «O teu
   recall subiu e as queixas também. Porquê?»).

## Ficheiros

Um tópico por ficheiro: `src/entrevista/topicos/tNN-<id>.ts`, com `NN` e `id` da tabela em
`src/entrevista/blocos.ts` (`TABELA_TOPICOS`), exportando:

```ts
import type { TopicoEntrevista } from '../../types';

export const topico: TopicoEntrevista = { ... };
```

O nome exportado é **sempre** `topico`. Se o ficheiro ficar grande (> ~1500 linhas), parte as
perguntas em `tNN-<id>.parte-a.ts` (exporta `export const perguntasA: PerguntaEntrevista[]`) e
importa-as. **Não mexas** em nenhum outro ficheiro fora de `src/entrevista/topicos/`.

## Identificadores e campos

- `TopicoEntrevista.id`, `numero`, `bloco`, `titulo`: exactamente os da `TABELA_TOPICOS`.
- `modulos` (do tópico e das perguntas): ids de módulos do tutorial — `engenharia-ia`,
  `como-funciona-llm`, `apis-de-modelos`, `prompt-engineering`, `tool-calling`, `escolher-modelo`,
  `embeddings`, `bases-vectoriais`, `ingestao-chunking`, `rag-basico`, `pesquisa-hibrida`,
  `rag-avancado`, `langchain-lcel`, `langchain-rag`, `agentes`, `langgraph`,
  `langgraph-persistencia`, `memoria`, `multi-agente-mcp`, `avaliacao-fundamentos`, `avaliar-rag`,
  `llm-como-juiz`, `avaliar-agentes`, `guardrails-seguranca`, `fastapi-servico`, `git-fluxo`,
  `docker`, `ci-cd`, `observabilidade-llmops`, `custo-escala`, `balcao-ponta-a-ponta`, `entrevista`.
- `PerguntaEntrevista.id`: `p-<topicoId>-NN` (01, 02, …), únicos e sequenciais.
- `essencial`: 6 a 10 linhas de cábula — factos, fórmulas, números de ordem de grandeza, frases
  que o candidato tem de saber dizer. Cada linha autónoma, até ~200 caracteres.

## Volume e mistura por tópico

| Tópicos | Perguntas | Mistura obrigatória |
|---|---|---|
| 1–28 (temáticos) | **10** | ≥ 4 `conceito`, ≥ 2 `tradeoff`, ≥ 1 `debug`, ≥ 1 `design` **ou** `codigo` |
| 29–30 (system design) | **6** | todas `design` |
| 31 (código ao vivo) | **10** | todas `codigo` |
| 32 (debugging) | **10** | todas `debug` |
| 33 (comportamental) | **10** | ≥ 7 `comportamental`, o resto `tradeoff` |

Níveis: em cada tópico, pelo menos 2 `pleno`, pelo menos 4 `senior` e pelo menos 1 `staff`
(nos tópicos 29–30 basta ≥ 2 `senior` e ≥ 2 `staff`).

Tempo sugerido (`minutos`) por tipo:

| Tipo | `minutos` |
|---|---|
| `conceito` | 3 a 6 |
| `tradeoff` | 5 a 10 |
| `debug` | 6 a 15 |
| `codigo` | 12 a 35 |
| `design` | 12 a 20 nos temáticos («mini design»); 40 a 50 nos tópicos 29–30 |
| `comportamental` | 4 a 8 |

## Cada pergunta

- `titulo`: até 80 caracteres, sem ponto final.
- `enunciado`: o que o entrevistador diz. Uma a quatro frases.
- `contexto`: obrigatório em `design`, `debug` e `codigo` — o cenário com números (tráfego,
  tamanho do corpus, SLO, orçamento, sintomas observados, assinatura da função pedida).
- `dica`: opcional mas recomendada; nunca dá a resposta.
- `resposta`: blocos (ver abaixo). Comprimento-alvo em palavras (soma do texto dos blocos):

  | Tipo | Palavras |
  |---|---|
  | `conceito` | 150 a 450 |
  | `tradeoff` | 250 a 600 |
  | `debug` | 250 a 700 |
  | `codigo` | 120 a 500 de prosa **mais** um bloco `code` com a solução |
  | `design` (temático) | 350 a 900 |
  | `design` (29–30) | 900 a 2200, com **pelo menos um `diagram`** e uma `table` |
  | `comportamental` | 200 a 500, estruturada em STAR (situação, tarefa, acção, resultado) com números, mais o que o entrevistador está a avaliar |

  Estrutura recomendada: primeiro `p` é a **resposta directa numa a três frases**; depois
  mecanismo/raciocínio; depois trade-offs (`table` ou `compare` quando há opções); depois o que se
  faz em produção; um `callout` `trap` quando há um erro clássico.
  - Design: requisitos e perguntas de clarificação → estimativas (números) → arquitectura (diagram)
    → componentes críticos em profundidade → avaliação e métricas → falhas, segurança, custo →
    trade-offs e o que ficaria para depois. Usa `steps` ou `h` para as fases.
  - Debug: hipóteses ordenadas por probabilidade × custo de verificar → o que medir/olhar
    (traços, métricas, amostras) → causa provável → correcção → como impedir a regressão.
  - Código: abordagem e complexidade → `code` → casos-limite → como testarias → extensões que o
    entrevistador pode pedir.
- `rubrica.criterios`: 3 a 6 pontos **verificáveis** («Menciona que o score do BM25 e o cosseno
  vivem em escalas diferentes»), não vagos («Responde bem»). São a checklist que o leitor marca.
- `rubrica.fraco` / `solido` / `excelente`: uma ou duas frases cada; descrevem respostas
  concretas, não adjectivos. `excelente` tem de dizer o que um sénior/staff acrescenta.
- `seguimento`: 2 a 4 perguntas que o entrevistador faria a seguir (com `?`).
- `sinaisAlarme`: 2 a 4 frases/atitudes que custam a vaga.
- `modulos`: 1 a 3 módulos do tutorial para rever.

## Blocos permitidos na resposta

`p`, `h`, `list`, `code`, `table`, `callout`, `steps`, `compare`, `terms`, `diagram`, `adr`, `refs`
(formas exactas em `src/types.ts`, tipo `Block`).

- `callout.tone`: `info` | `tip` | `warn` | `key` | `trap` | `prod`.
- `code.lang`: `python` | `bash` | `sql` | `yaml` | `toml` | `json` | `http` | `dockerfile` |
  `text` | `ts` | `java` | `ini` | `diff` | `markdown`.
- `diagram`: grelha lógica (`cols`, `rows`; nós com `col`/`row` dentro da grelha, ids únicos;
  `edges` só entre ids existentes). `kind` de nó: `service` | `user` | `data` | `external` |
  `note` | `queue` | `decision` | `model` | `agent` | `tool` | `vector`. `tone` de zona: `cluster`
  | `namespace` | `service` | `data` | `edge` | `external` | `async` | `neutral` | `agente` | `rag`
  | `ci`. Até 6 colunas × 6 linhas fica legível.
- `adr.ref`: só `adr-0001` a `adr-0028` (títulos em `src/data/ids.ts`), e só quando a decisão
  ilustra mesmo a resposta.
- `refs`: 1 a 4 links oficiais. **Obrigatório** em todas as perguntas que não sejam
  `comportamental`. Usa a raiz de uma secção de documentação ou o artigo no arXiv quando não tens
  a certeza do caminho profundo — **um link partido é pior do que nenhum**.

### Marcação inline

Nos campos de texto: `**negrito**`, `*itálico*`, `` `código` `` e `[texto](url)`. Nada mais —
sem listas nem títulos markdown dentro de um `p`, sem `|`.

### Domínios permitidos em `refs` e links

Os do `CONTRATO.md` principal (`docs.python.org`, `arxiv.org`, `docs.anthropic.com`,
`platform.claude.com`, `anthropic.com`, `platform.openai.com`, `openai.com`, `ai.google.dev`,
`huggingface.co`, `sbert.net`, `docs.langchain.com`, `langchain-ai.github.io`, `postgresql.org`,
`github.com`, `qdrant.tech`, `milvus.io`, `faiss.ai`, `weaviate.io`, `opentelemetry.io`,
`langfuse.com`, `owasp.org`, `genai.owasp.org`, `nist.gov`, `modelcontextprotocol.io`,
`docs.ragas.io`, `redis.io`, `kubernetes.io`, `sre.google`, `artificialintelligenceact.eu`,
`eur-lex.europa.eu`, `fastapi.tiangolo.com`, `docs.pydantic.dev`, `docs.docker.com`,
`docs.github.com`, `aclanthology.org`, `ollama.com`, `rfc-editor.org`, `developer.mozilla.org`, …)
mais: `scikit-learn.org`, `pytorch.org`, `docs.vllm.ai`, `mlflow.org`, `developers.google.com`,
`research.google`, `cnpd.pt`, `edpb.europa.eu`, `docs.aws.amazon.com`, `aws.amazon.com`,
`martinfowler.com`, `dl.acm.org`. A lista completa e autoritativa está em `scripts/verificar-entrevista.mjs`.

## Verificação

```bash
node scripts/verificar-entrevista.mjs src/entrevista/topicos/t13-hibrida-rerank.ts
```

Verifica estrutura, ids, volume, mistura, níveis, tempos, palavras, blocos, diagramas, ADRs,
módulos, domínios, marcação proibida e emojis. **Um tópico só está pronto quando o verificador
passa sem erros.** Os avisos (palavras fora do alvo, por exemplo) devem ser revistos um a um.
Corre também `npx tsc -p tsconfig.app.json --noEmit` para garantir que os tipos batem.
