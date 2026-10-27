import type { TopicoEntrevista } from '../../types';

const CODIGO_AGENTE = `import json
from dataclasses import dataclass, field
from typing import Any, Callable

Modelo = Callable[[list[dict]], dict]


@dataclass
class Resultado:
    resposta: str | None
    motivo: str  # "final" | "repeticao" | "limite_passos"
    passos: int
    mensagens: list[dict] = field(default_factory=list)


def correr_agente(
    modelo: Modelo,
    ferramentas: dict[str, Callable[..., Any]],
    pergunta: str,
    max_passos: int = 8,
    max_repeticoes: int = 2,
) -> Resultado:
    if max_passos < 1:
        raise ValueError("max_passos tem de ser >= 1")
    mensagens: list[dict] = [{"role": "user", "content": pergunta}]
    vistos: dict[str, int] = {}
    for passo in range(1, max_passos + 1):
        accao = modelo(mensagens)
        if accao.get("tipo") == "final":
            return Resultado(accao["texto"], "final", passo, mensagens)
        nome, args = accao["ferramenta"], accao.get("args", {})
        # Mesma ferramenta com os mesmos argumentos: assinatura canónica.
        chave = nome + json.dumps(args, sort_keys=True, ensure_ascii=False)
        vistos[chave] = vistos.get(chave, 0) + 1
        if vistos[chave] > max_repeticoes:
            return Resultado(None, "repeticao", passo, mensagens)
        mensagens.append({"role": "assistant", "tool_call": {"name": nome, "args": args}})
        fn = ferramentas.get(nome)
        if fn is None:
            obs = {"erro": f"ferramenta desconhecida: {nome}", "disponiveis": sorted(ferramentas)}
        else:
            try:
                obs = {"ok": fn(**args)}
            except Exception as e:  # o erro volta ao modelo como observação
                obs = {"erro": f"{type(e).__name__}: {e}"}
        mensagens.append({"role": "tool", "name": nome, "content": json.dumps(obs, ensure_ascii=False)})
    return Resultado(None, "limite_passos", max_passos, mensagens)


# ---- teste com um modelo simulado (guião de acções) ----
PEDIDOS = {"PD-1001": {"estado": "entregue", "atraso_min": 53}}


def ler_pedido(pedido_id: str) -> dict:
    if pedido_id not in PEDIDOS:
        raise KeyError(f"pedido {pedido_id} não existe")
    return PEDIDOS[pedido_id]


def guiao(*accoes: dict) -> Modelo:
    it = iter(accoes)
    return lambda mensagens: next(it)


ferr = {"ler_pedido": ler_pedido}

# 1) erro de ferramenta, o modelo corrige o id e termina
r1 = correr_agente(guiao(
    {"ferramenta": "ler_pedido", "args": {"pedido_id": "1001"}},
    {"ferramenta": "ler_pedido", "args": {"pedido_id": "PD-1001"}},
    {"tipo": "final", "texto": "Chegou com 53 min de atraso."},
), ferr, "Onde está o PD-1001?")
print(r1.motivo, r1.passos, r1.mensagens[2]["content"])
# final 3 {"erro": "KeyError: 'pedido 1001 não existe'"}

# 2) o modelo repete a mesma chamada: pára à 3.ª, antes de a executar
r2 = correr_agente(guiao(*[{"ferramenta": "ler_pedido", "args": {"pedido_id": "PD-1001"}}] * 10), ferr, "?")
print(r2.motivo, r2.passos, sum(m["role"] == "tool" for m in r2.mensagens))
# repeticao 3 2

# 3) argumentos sempre diferentes: só o limite de passos o trava
r3 = correr_agente(guiao(*[{"ferramenta": "ler_pedido", "args": {"pedido_id": f"PD-{i}"}} for i in range(20)]), ferr, "?", max_passos=5)
print(r3.motivo, r3.passos)
# limite_passos 5

# 4) ferramenta inexistente vira observação, não excepção
r4 = correr_agente(guiao({"ferramenta": "apagar_conta", "args": {}}, {"tipo": "final", "texto": "Não posso."}), ferr, "?")
print(r4.motivo, r4.mensagens[2]["content"])
# final {"erro": "ferramenta desconhecida: apagar_conta", "disponiveis": ["ler_pedido"]}`;

export const topico: TopicoEntrevista = {
  id: 'agentes',
  numero: 15,
  bloco: 'agentes',
  titulo: 'Agentes: ciclo, ferramentas e limites',
  resumo:
    'O que é um agente em termos operacionais, ReAct, quando um workflow ganha, limites de passos, custo e tempo, erros de ferramenta, planeamento, frameworks e observabilidade. É o tópico onde o entrevistador separa quem já pôs um agente em produção de quem só viu demos.',
  icon: '🔁',
  modulos: ['agentes', 'langchain-lcel', 'langgraph'],
  essencial: [
    'Agente = modelo + ferramentas + ciclo + critério de paragem. O modelo decide o próximo passo; o código decide quando parar à força.',
    'Workflow: o caminho está no código. Agente: o caminho é escolhido pelo modelo em tempo de execução. A pergunta é onde mora a decisão.',
    'ReAct (Yao et al., 2022, arXiv 2210.03629): intercalar raciocínio e acção, com a observação da ferramenta a entrar no contexto seguinte.',
    'Cada passo reenvia sistema, esquemas e histórico: a entrada cresce linearmente com os passos e o custo total cresce com o quadrado.',
    'Limites em camadas: por ferramenta, chamadas ao modelo, passos, tokens, tempo de relógio. O `recursion_limit` do LangGraph é a última rede, não o desenho.',
    'Erro de ferramenta volta ao modelo como resultado estruturado; retries com backoff só para erros transitórios; escritas com chave de idempotência.',
    'Variância: mede a distribuição de passos e custo por tarefa (p50, p95, máximo) e a fiabilidade em k tentativas (pass^k), não só a média.',
    'Plan-and-execute poupa chamadas ao modelo grande e dá um plano auditável; ReAct passo a passo adapta-se melhor quando as observações mudam o plano.',
    'Observabilidade: um trace por turno, um span por chamada ao modelo e por ferramenta, com motivo de paragem, passos, tokens e custo como atributos.',
    'Quando não usar agente: caminho conhecido, acções irreversíveis, SLO de latência apertado, ou quando não há eval para medir o que o agente decide.',
  ],
  perguntas: [
    /* ------------------------------------------------------------------ 01 */
    {
      id: 'p-agentes-01',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'O que é, em termos operacionais, um agente',
      enunciado:
        'Toda a gente chama «agente» a tudo. Dá-me uma definição operacional: que peças tem de ter um sistema para tu lhe chamares agente, e o que é que não chega?',
      minutos: 4,
      dica: 'Pensa no que tem de existir no código, não no que o produto promete.',
      resposta: [
        {
          type: 'p',
          text: 'Para mim um agente tem quatro peças: **um modelo, um conjunto de ferramentas, um ciclo e um critério de paragem**. O modelo, a cada passo, escolhe entre chamar uma ferramenta ou responder; o resultado da ferramenta volta ao contexto; e o ciclo repete até o modelo dar uma resposta final ou um limite imposto pelo código o travar.',
        },
        {
          type: 'p',
          text: 'O que define o agente é **quem decide o caminho**. Um classificador que escolhe entre três ramos fixos usa um modelo, mas o caminho está no código: é um workflow com um router. Uma chamada única com tool calling também não é agente, porque não há ciclo. E um prompt com persona não é agente de todo.',
        },
        {
          type: 'terms',
          items: [
            { term: 'Modelo', def: 'Gera a próxima acção a partir do contexto: uma chamada de ferramenta com argumentos ou a resposta final.' },
            { term: 'Ferramentas', def: 'Funções com nome, descrição e esquema de argumentos; o código executa-as, não o modelo.' },
            { term: 'Ciclo', def: 'Executa a acção, acrescenta a observação às mensagens e volta a chamar o modelo.' },
            { term: 'Paragem', def: 'Natural (o modelo responde sem pedir ferramenta) e forçada (passos, custo, tempo, repetição), sempre com uma saída limpa para o utilizador.' },
          ],
        },
        {
          type: 'p',
          text: 'A peça que mais gente esquece é a quarta. A paragem natural depende do modelo; a forçada depende de mim. Sem ela, um agente que não converge corre até ao limite por omissão do framework ou até a factura avisar.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Autonomia não é um sim ou não',
          text: 'Na prática é um espectro: chamada única, cadeia fixa, router, agente com ferramentas só de leitura, agente com escritas. Dizer em que ponto do espectro está cada intenção do produto é mais útil do que discutir se «aquilo é um agente».',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
            { label: 'LangChain — Agents', url: 'https://docs.langchain.com/oss/python/langchain/agents' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Nomeia as quatro peças: modelo, ferramentas, ciclo e critério de paragem.',
          'Distingue agente de workflow pelo sítio onde o caminho é decidido (modelo vs código).',
          'Separa paragem natural de paragem forçada pelo código.',
          'Dá um contra-exemplo do que não é agente (router, chamada única com tool calling).',
        ],
        fraco: '«Um agente é um LLM que pensa e age sozinho», sem ciclo, sem paragem e sem distinção de workflow.',
        solido: 'Dá as quatro peças, distingue agente de workflow e menciona limites forçados.',
        excelente: 'Acrescenta o espectro de autonomia, diz que a paragem forçada tem de ter uma saída limpa para o utilizador e liga a escolha a custo e risco por intenção.',
      },
      seguimento: [
        'Um router que chama um modelo para classificar e depois corre um de três fluxos fixos é um agente?',
        'Onde é que o critério de paragem vive no teu código, e o que vê o utilizador quando dispara?',
        'Que diferença faz as ferramentas serem só de leitura ou terem escrita?',
      ],
      sinaisAlarme: [
        'Dizer que o agente «pensa» ou «sabe» quando terminou.',
        'Não mencionar nenhuma forma de parar o ciclo além do modelo decidir.',
        'Chamar agente a qualquer chamada a um LLM.',
      ],
      modulos: ['agentes'],
    },

    /* ------------------------------------------------------------------ 02 */
    {
      id: 'p-agentes-02',
      tipo: 'conceito',
      nivel: 'pleno',
      titulo: 'ReAct: o que é e o que mudou face a raciocinar ou agir sozinho',
      enunciado:
        'Explica-me o ReAct. O que é que o artigo mostrou, e como é que isso se traduz no tool calling nativo que as APIs têm hoje?',
      minutos: 5,
      dica: 'Compara com só cadeia de raciocínio e com só acções, sem texto entre elas.',
      resposta: [
        {
          type: 'p',
          text: 'ReAct, de Yao et al. (2022), é **intercalar raciocínio e acção**: o modelo escreve um passo de raciocínio, emite uma acção, recebe a observação dessa acção no contexto e decide o passo seguinte com base nela. O artigo comparou isto com só raciocinar (chain-of-thought) e só agir, em tarefas de perguntas com pesquisa e de decisão interactiva.',
        },
        {
          type: 'p',
          text: 'A intuição: só raciocinar alucina factos porque não consulta nada; só agir não tem onde planear nem corrigir. Intercalando, a observação ancora o raciocínio seguinte e o raciocínio escolhe a próxima acção. Os traços também ficam legíveis, o que ajuda a depurar.',
        },
        {
          type: 'p',
          text: 'Na versão original tudo era texto: `Thought:`, `Action:`, `Observation:`, com o código a fazer parsing da linha de acção. Hoje as APIs têm **tool calling nativo**: o modelo devolve um bloco estruturado com nome e argumentos JSON validados contra o esquema, o código executa e devolve uma mensagem de resultado ligada ao id da chamada. O padrão é o mesmo, só o protocolo mudou, e o parsing frágil desapareceu.',
        },
        {
          type: 'compare',
          left: { title: 'ReAct em texto (2022)', items: ['Formato livre com prefixos', 'Parsing por regex, falha com variações', 'Uma acção por passo', 'Raciocínio sempre visível'] },
          right: { title: 'Tool calling nativo', items: ['Bloco estruturado com id e argumentos JSON', 'Esquema validado pela API ou pelo código', 'Várias chamadas paralelas num só passo, conforme o fornecedor', 'Raciocínio opcional ou separado'] },
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O raciocínio escrito não é a causa',
          text: 'O texto de raciocínio que o modelo gera é mais um condicionamento para os tokens seguintes, não uma explicação fiel do que o levou à acção. Uso-o para depurar, não como prova de que a decisão foi correcta; a prova vem do eval.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2022) — ReAct: Synergizing Reasoning and Acting in Language Models', url: 'https://arxiv.org/abs/2210.03629' },
            { label: 'Wei et al. (2022) — Chain-of-Thought Prompting', url: 'https://arxiv.org/abs/2201.11903' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Descreve o ciclo raciocínio, acção, observação com a observação a entrar no contexto seguinte.',
          'Explica porque intercalar ajuda: ancora factos e permite corrigir.',
          'Liga o ReAct textual ao tool calling nativo (blocos estruturados, ids, esquema).',
          'Não trata o raciocínio escrito como explicação fiel da decisão.',
        ],
        fraco: 'Diz que ReAct é «o modelo pensar antes de responder», sem acções nem observações.',
        solido: 'Explica o ciclo, compara com chain-of-thought e mostra como as APIs actuais implementam o padrão.',
        excelente: 'Acrescenta que o raciocínio é condicionamento e não explicação, menciona chamadas paralelas e diz como isso muda o custo e a depuração.',
      },
      seguimento: [
        'Que vantagem tem pedir ao modelo para escrever o raciocínio antes da chamada, se o custo em tokens sobe?',
        'Como lidas com duas chamadas de ferramenta paralelas em que uma falha?',
        'Onde é que o ReAct falha mais em produção?',
      ],
      sinaisAlarme: [
        'Confundir ReAct com o framework React do frontend.',
        'Não saber que hoje a acção vem como estrutura e não como texto a fazer parsing.',
      ],
      modulos: ['agentes', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 03 */
    {
      id: 'p-agentes-03',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Quando é que NÃO usarias um agente',
      enunciado:
        'O teu PM quer «pôr um agente» no suporte ao cliente. Em que situações dirias que não, e o que propunhas em vez disso?',
      minutos: 7,
      dica: 'Pensa em custo, variância, irreversibilidade e em como mediriam o sucesso.',
      resposta: [
        {
          type: 'p',
          text: 'Não usaria um agente **sempre que o caminho é conhecido de antemão**: aí um workflow (router mais passos fixos) faz o mesmo com menos chamadas ao modelo, menos variância e testes deterministas. Uso agente só onde a sequência de passos depende genuinamente do que se descobre pelo caminho, e mesmo aí com ferramentas e limites apertados.',
        },
        {
          type: 'p',
          text: 'Faço a análise **intenção a intenção**, com os dados de tráfego. Num assistente de suporte de um marketplace de entregas, «onde está o meu pedido» é sempre ler pedido e responder: workflow. «Política de cupões» é RAG. Só um caso como «o pedido veio errado e quero compensação» tem caminho variável (ler pedido, verificar itens, calcular compensação, talvez escalar) e justifica um ciclo com ferramentas.',
        },
        {
          type: 'table',
          head: ['Sinal', 'Escolha', 'Porquê'],
          rows: [
            ['Sequência de passos fixa e conhecida', 'Workflow', '1 a 2 chamadas ao modelo em vez de 3 a 8; teste determinista por ramo'],
            ['Acção irreversível ou com dinheiro', 'Workflow com aprovação, ou agente que só propõe', 'A decisão de executar sai do modelo e vai para código ou humano'],
            ['SLO de latência apertado (p95 de 1 a 2 s)', 'Chamada única ou cadeia curta', 'Cada passo de agente soma a latência de uma chamada ao modelo mais a ferramenta'],
            ['Não existe eval da tarefa', 'Workflow até haver', 'Sem eval não se distingue um agente que melhorou de um que teve sorte'],
            ['Caminho depende do que se observa, muitas ferramentas', 'Agente com limites', 'É onde a flexibilidade paga a variância'],
          ],
        },
        {
          type: 'p',
          text: 'O argumento para o PM é custo e risco: um agente com média de 4 passos reenvia o contexto 4 vezes, e o p95 pode ser o dobro ou o triplo da média. Se 80% do tráfego são intenções de caminho fixo, pôr tudo num agente é pagar essa variância por nada.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'O que proponho em concreto',
          text: 'Um router que classifica a intenção, workflows para as intenções frequentes e previsíveis, e um sub-grafo de agente só para a cauda variável, com ferramentas de leitura livres e escritas atrás de confirmação. Começo pelo workflow, meço, e promovo uma intenção a agente quando o eval mostra que o workflow falha por falta de flexibilidade.',
        },
        {
          type: 'adr',
          ref: 'adr-0013',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Building effective agents (workflows vs agents)', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
            { label: 'LangGraph — overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Diz que um workflow chega quando o caminho é conhecido de antemão.',
          'Analisa por intenção ou caso de uso, não para o produto inteiro.',
          'Quantifica o custo de um agente em chamadas ao modelo e variância de latência.',
          'Trata acções irreversíveis com aprovação ou confirmação fora do modelo.',
          'Propõe uma arquitectura híbrida (router, workflows, agente para a cauda) e critério para promover.',
        ],
        fraco: 'Diz que agentes são sempre melhores porque são mais flexíveis, ou recusa sem propor alternativa.',
        solido: 'Distingue workflow de agente, dá critérios (caminho fixo, latência, irreversibilidade) e propõe router mais workflows.',
        excelente: 'Faz a análise com a distribuição real de intenções, liga a escolha a custo por conversa e a SLO, e define o critério de eval para promover uma intenção a agente.',
      },
      seguimento: [
        'Que dados pedias ao PM antes de decidir?',
        'Como medirias que o workflow está a falhar por falta de flexibilidade e não por outra razão?',
        'O que muda se o modelo ficar dez vezes mais barato?',
      ],
      sinaisAlarme: [
        'Responder «depende» sem dar critérios.',
        'Propor um agente com acesso a escritas sem nenhum controlo humano ou de código.',
        'Ignorar latência e custo na decisão.',
      ],
      modulos: ['agentes', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 04 */
    {
      id: 'p-agentes-04',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'Uma ferramenta falhou: o que vê o modelo e o que faz o código',
      enunciado:
        'A meio de um turno, a API de pedidos devolve um 503 e, noutra chamada, o modelo passa um id com formato errado. Como é que o teu agente lida com cada caso?',
      minutos: 5,
      dica: 'Nem todos os erros devem chegar ao modelo, e nem todos devem ser escondidos dele.',
      resposta: [
        {
          type: 'p',
          text: 'Separo **erros transitórios de infraestrutura**, que o código trata com retry e backoff sem envolver o modelo, de **erros de uso**, que voltam ao modelo como resultado estruturado para ele se corrigir. Em nenhum caso o erro rebenta o ciclo com uma excepção não tratada.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Transitório (503, timeout, rate limit)', text: 'Retry com backoff exponencial e jitter, 2 a 3 tentativas, dentro do orçamento de tempo do turno. Só para leituras, ou escritas com chave de idempotência. Se esgota, devolve ao modelo um erro do tipo «serviço indisponível, não repetir» para ele responder ao utilizador com honestidade.' },
            { title: 'Erro de argumentos (id mal formado, campo em falta)', text: 'Validação com o esquema antes de executar. A mensagem de resultado diz o que falhou e o formato esperado, por exemplo «pedido_id deve ter o formato PD-0000000». O modelo corrige no passo seguinte quase sempre; é a recuperação mais barata que há.' },
            { title: 'Erro de negócio (pedido não existe, sem permissão)', text: 'Resultado estruturado com um código estável (`nao_encontrado`, `proibido`), não a stack trace. O modelo precisa de saber se vale a pena tentar outra coisa ou se deve parar.' },
            { title: 'Erro de programação na ferramenta', text: 'Regista com stack trace no traço, devolve ao modelo um erro genérico e marca o turno para revisão. Não exponho detalhes internos ao modelo nem ao utilizador.' },
          ],
        },
        {
          type: 'p',
          text: 'Duas regras de segurança: a identidade do cliente vem do contexto de execução e não dos argumentos que o modelo gera, e qualquer ferramenta com escrita aceita uma chave de idempotência derivada do turno, para que um retry não emita duas vezes.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Repetir o erro sem lhe dizer nada de novo',
          text: 'Se a mensagem de erro é vaga («Error»), o modelo tende a repetir a mesma chamada. Uma mensagem accionável e um contador de erros por ferramenta, que força a paragem à terceira falha, evitam o ciclo.',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — middleware incluído (ToolRetryMiddleware e outros)', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
            { label: 'Google SRE — Addressing Cascading Failures (retries com backoff exponencial aleatório)', url: 'https://sre.google/sre-book/addressing-cascading-failures/' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Separa erros transitórios (retry no código) de erros de uso (devolvidos ao modelo).',
          'Devolve erros como resultado estruturado e accionável, não como excepção que mata o ciclo.',
          'Limita retries com backoff e orçamento de tempo do turno.',
          'Menciona idempotência das escritas para que retries sejam seguros.',
          'Não deixa o modelo controlar a identidade nem vê detalhes internos.',
        ],
        fraco: 'Faz try/except à volta de tudo e devolve «ocorreu um erro» ao utilizador.',
        solido: 'Distingue transitório de uso, faz retry com backoff e devolve erros de validação ao modelo.',
        excelente: 'Acrescenta códigos de erro estáveis, contador de falhas por ferramenta, idempotência e o caminho da mensagem honesta ao utilizador quando tudo falha.',
      },
      seguimento: [
        'Como escreves a mensagem de erro para o modelo corrigir à primeira?',
        'E se a ferramenta fizer timeout depois de ter executado a escrita?',
        'Onde fica o orçamento de tempo: por ferramenta ou por turno?',
      ],
      sinaisAlarme: [
        'Fazer retry de escritas sem idempotência.',
        'Passar a stack trace completa ao modelo.',
        'Deixar a excepção terminar o turno sem resposta ao utilizador.',
      ],
      modulos: ['agentes', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 05 */
    {
      id: 'p-agentes-05',
      tipo: 'tradeoff',
      nivel: 'senior',
      titulo: 'Plan-and-execute ou ReAct passo a passo',
      enunciado:
        'Tens um agente de operações de uma empresa de logística que, para um pedido de reagendamento, chama 5 a 8 ferramentas. Fazias o modelo planear tudo primeiro e depois executar, ou decidir um passo de cada vez? Porquê?',
      minutos: 8,
      dica: 'Quantas vezes é que o modelo grande precisa de ver o contexto inteiro em cada abordagem?',
      resposta: [
        {
          type: 'p',
          text: 'Depende de **quanto as observações mudam o plano**. Se o plano raramente muda depois de ver os resultados, plan-and-execute é mais barato, mais rápido e auditável. Se cada resultado pode mudar o que se faz a seguir, ReAct passo a passo erra menos. Na prática uso um híbrido: plano, execução, e replaneamento só quando um passo falha ou devolve algo inesperado.',
        },
        {
          type: 'p',
          text: 'No ReAct cada passo é uma chamada ao modelo com todo o histórico; com 7 ferramentas são cerca de 8 chamadas e o contexto cresce a cada uma. No plan-and-execute o modelo grande gera um plano (uma chamada), um executor corre os passos (com código ou um modelo pequeno) e, no fim, uma chamada sintetiza. Variantes como ReWOO (Xu et al., 2023) levam isto mais longe: o plano tem variáveis que referem resultados de passos anteriores, e passos independentes correm em paralelo.',
        },
        {
          type: 'table',
          head: ['', 'ReAct passo a passo', 'Plan-and-execute'],
          rows: [
            ['Chamadas ao modelo grande', 'Uma por passo, com contexto crescente', 'Planear e sintetizar, mais replaneamentos'],
            ['Latência', 'Sequencial', 'Passos independentes em paralelo'],
            ['Adaptação a surpresas', 'Natural, a cada observação', 'Só se houver replaneamento'],
            ['Auditoria e aprovação', 'Difícil: o plano não existe antes', 'O plano pode ser mostrado ou aprovado antes de executar'],
            ['Modo de falha típico', 'Deriva, ciclos, esquecer o objectivo', 'Plano errado executado com confiança'],
          ],
        },
        {
          type: 'p',
          text: 'No caso do reagendamento, os passos (ler encomenda, ver janelas do armazém, ver disponibilidade da frota, propor janelas, confirmar) são quase sempre os mesmos, mas a disponibilidade pode não existir. Eu planeava, executava as leituras em paralelo e replaneava só se não houvesse janela. E perguntava-me se isto não é simplesmente um workflow com um passo de decisão.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'Plano bonito, execução cega',
          text: 'Um plano gerado de uma vez dá sensação de controlo, mas se o executor não verifica pré-condições (a encomenda ainda está no armazém?) o erro propaga-se. Cada passo do plano precisa de uma verificação barata e de um gatilho de replaneamento.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Xu et al. (2023) — ReWOO: Decoupling Reasoning from Observations', url: 'https://arxiv.org/abs/2305.18323' },
            { label: 'Wang et al. (2023) — Plan-and-Solve Prompting', url: 'https://arxiv.org/abs/2305.04091' },
            { label: 'Yao et al. (2022) — ReAct', url: 'https://arxiv.org/abs/2210.03629' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Decide pelo quanto as observações mudam o plano, não por preferência.',
          'Compara o número de chamadas ao modelo e o crescimento do contexto nas duas abordagens.',
          'Menciona execução paralela de passos independentes no plan-and-execute.',
          'Propõe replaneamento como gatilho e não como passo fixo.',
          'Nomeia o modo de falha de cada abordagem.',
        ],
        fraco: 'Escolhe uma das duas sem critério, ou não sabe o que é plan-and-execute.',
        solido: 'Compara custo, latência e adaptabilidade, e propõe um híbrido com replaneamento.',
        excelente: 'Acrescenta a auditabilidade do plano (aprovação antes de executar), verificação de pré-condições em cada passo e questiona se o caso não é um workflow.',
      },
      seguimento: [
        'Quem executa os passos do plano: código, modelo pequeno ou o mesmo modelo?',
        'Como avaliavas a qualidade do plano separadamente da execução?',
        'Mostravas o plano ao utilizador antes de executar?',
      ],
      sinaisAlarme: [
        'Achar que planear primeiro elimina a necessidade de limites.',
        'Não considerar que muitos «planos» são workflows disfarçados.',
      ],
      modulos: ['agentes', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 06 */
    {
      id: 'p-agentes-06',
      tipo: 'conceito',
      nivel: 'staff',
      titulo: 'A média do custo por turno está óptima, a factura não',
      enunciado:
        'O teu agente custa em média 3 cêntimos por turno no staging, mas em produção a factura é o triplo do previsto. Explica-me de onde vem a variância de um agente e como o pões dentro de orçamento.',
      minutos: 6,
      dica: 'Olha para a forma da distribuição, não para a média, e para o que cada passo reenvia.',
      resposta: [
        {
          type: 'p',
          text: 'A média esconde a cauda. Num agente o custo de um turno é **super-linear no número de passos**, porque cada passo reenvia sistema, esquemas e histórico; poucos turnos longos ou em ciclo pesam mais do que muitos curtos. Controlo isso com limites em camadas e medindo a distribuição (p50, p95, máximo), não a média.',
        },
        {
          type: 'p',
          text: 'As contas: se o contexto inicial são 3 000 tokens e cada passo acrescenta 500, o passo n envia cerca de 3 000 + 500n tokens. Um turno de 3 passos envia uns 12 000; um de 12 passos envia uns 75 000, seis vezes mais para quatro vezes os passos. Se 5% dos turnos entram em ciclo até ao limite, dominam a factura. A cache de prompt baixa o preço da parte repetida, mas não o volume nem a latência de gerar.',
        },
        {
          type: 'list',
          items: [
            '**Limite por ferramenta**: no máximo N chamadas a `pesquisar` por turno.',
            '**Limite de chamadas ao modelo** por turno (e por conversa), com saída limpa: uma mensagem honesta e, se for o caso, escalar para humano.',
            '**Orçamento de tokens** por turno e por conversa, verificado antes de cada chamada.',
            '**Tempo de relógio** por turno, para o utilizador não esperar 90 segundos.',
            '**Última rede**: o `recursion_limit` do LangGraph, que por omissão é alto nas versões 1.x e levanta `GraphRecursionError`; não é desenho, é cinto de segurança.',
          ],
        },
        {
          type: 'p',
          text: 'Para fiabilidade, a mesma lógica: um agente que acerta 80% das vezes numa tentativa pode acertar muito menos quando se exige que acerte em k tentativas seguidas. O τ-bench chama a isso pass^k. Meço as duas coisas no eval, por intenção.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Como fecho o orçamento',
          text: 'Dashboard com o histograma de passos e de custo por intenção, alerta no p95 e na taxa de turnos que batem num limite, e um orçamento por tenant. Quando a taxa de limites sobe, é um bug de prompt ou de ferramenta, não um problema de capacidade.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Yao et al. (2024) — τ-bench (pass^k)', url: 'https://arxiv.org/abs/2406.12045' },
            { label: 'LangChain — ModelCallLimitMiddleware e ToolCallLimitMiddleware', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Explica que o custo cresce mais do que linearmente com os passos porque o contexto é reenviado.',
          'Faz uma conta de ordem de grandeza com tokens por passo.',
          'Propõe limites em camadas (ferramenta, chamadas, tokens, tempo) com saída limpa.',
          'Mede a distribuição (p95, máximo, taxa de limites atingidos) e não só a média.',
          'Distingue fiabilidade numa tentativa de fiabilidade em k tentativas.',
        ],
        fraco: 'Propõe trocar para um modelo mais barato ou baixar max_tokens, sem olhar para os passos.',
        solido: 'Explica o reenvio do contexto, mede p95 e põe limites de passos e tokens.',
        excelente: 'Faz as contas, separa a cache de prompt (preço) do volume, trata a taxa de limites atingidos como sinal de bug e mede pass^k por intenção.',
      },
      seguimento: [
        'Que limite escolhias para o número de passos e com que dados?',
        'O que é que o utilizador vê quando o limite de custo dispara a meio de um turno?',
        'A cache de prompt resolve isto?',
      ],
      sinaisAlarme: [
        'Orçamentar só com a média.',
        'Confiar no limite por omissão do framework como desenho.',
        'Não saber dizer porque é que o passo 10 custa mais do que o passo 1.',
      ],
      modulos: ['agentes', 'custo-escala', 'avaliar-agentes'],
    },

    /* ------------------------------------------------------------------ 07 */
    {
      id: 'p-agentes-07',
      tipo: 'tradeoff',
      nivel: 'staff',
      titulo: 'Framework de agentes ou ciclo próprio',
      enunciado:
        'A tua equipa está dividida: uns querem `create_agent` do LangChain, outros LangGraph, outros o SDK de agentes do fornecedor, e um sénior quer escrever o ciclo à mão em 80 linhas. Como decides?',
      minutos: 8,
      dica: 'O ciclo em si é trivial. O que custa é tudo o que vem à volta.',
      resposta: [
        {
          type: 'p',
          text: 'Decido pelo que **o sistema precisa à volta do ciclo**, porque o ciclo em si são 50 linhas. Se preciso de persistência, retomar, aprovação humana e fluxo com ramos explícitos, LangGraph. Se é um agente simples com ferramentas e limites, `create_agent` ou o SDK do fornecedor. Ciclo próprio quando a equipa precisa de controlo total e as necessidades à volta são poucas.',
        },
        {
          type: 'table',
          head: ['Opção', 'Ganhas', 'Pagas'],
          rows: [
            ['Ciclo próprio', 'Controlo total, zero dependências, depuração directa', 'Reescreves persistência, interrupts, retries, streaming e tracing'],
            ['LangChain `create_agent`', 'Ciclo pronto com middleware (limites, retries, aprovação humana, resumos) e qualquer fornecedor', 'Abstracções a aprender, superfície de API que muda entre versões'],
            ['LangGraph', 'Estado explícito, checkpoints, `interrupt`, time travel, fluxos com ramos', 'Mais conceitos (reducers, super-steps), mais código para casos simples'],
            ['SDK do fornecedor', 'Acesso primeiro às funcionalidades do modelo, menos camadas', 'Acoplamento a um fornecedor; trocar de modelo custa mais'],
          ],
        },
        {
          type: 'p',
          text: 'Os critérios que ponho na mesa: precisamos de retomar uma conversa depois de um restart? Há aprovação humana com horas de espera? Vamos trocar de fornecedor ou correr modelos locais? Quanto custa à equipa aprender a ferramenta e quanto custa manter o código próprio daqui a um ano? E consigo exportar traços em OpenTelemetry com qualquer opção?',
        },
        {
          type: 'p',
          text: 'Uma decisão que costumo tomar: o domínio (ferramentas, validação, limites de negócio como o valor máximo de um reembolso) fica em código meu, sem depender do framework. O framework orquestra; as regras não vivem nele. Assim trocar de framework é reescrever a cola, não o produto.',
        },
        {
          type: 'callout',
          tone: 'trap',
          title: 'O argumento das 80 linhas',
          text: 'O protótipo tem 80 linhas; a versão de produção com checkpoints em Postgres, interrupts, streaming de tokens, retries e tracing tem milhares e é tua para manter. Escrever à mão é legítimo, mas com a lista do que se vai reimplementar em cima da mesa.',
        },
        {
          type: 'adr',
          ref: 'adr-0012',
        },
        {
          type: 'refs',
          items: [
            { label: 'LangChain — Agents (create_agent)', url: 'https://docs.langchain.com/oss/python/langchain/agents' },
            { label: 'LangGraph — overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview' },
            { label: 'OpenAI Agents SDK (Python)', url: 'https://github.com/openai/openai-agents-python' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Reconhece que o ciclo é simples e que o custo está à volta (persistência, interrupts, retries, tracing).',
          'Compara as opções com ganhos e custos concretos.',
          'Dá critérios de decisão (retomar, aprovação humana, troca de fornecedor, manutenção).',
          'Separa regras de domínio do framework para reduzir o acoplamento.',
        ],
        fraco: 'Escolhe pelo que está na moda, ou rejeita frameworks «porque são abstracções a mais» sem listar o que se reimplementa.',
        solido: 'Compara as quatro opções e decide pelos requisitos de persistência e aprovação humana.',
        excelente: 'Pensa no custo total de manutenção, isola o domínio do framework, exige traços exportáveis e define o que faria mudar a decisão.',
      },
      seguimento: [
        'O que é que o `create_agent` te dá que um ciclo próprio não dá no primeiro dia?',
        'Como garantias que trocar de LangGraph para outra coisa daqui a um ano não é uma reescrita?',
        'Que parte nunca deixarias o framework decidir?',
      ],
      sinaisAlarme: [
        'Dizer que um framework resolve a fiabilidade do agente.',
        'Pôr as regras de negócio (limites de valor, permissões) dentro do prompt ou do framework.',
        'Não perguntar pelos requisitos antes de escolher.',
      ],
      modulos: ['agentes', 'langchain-lcel', 'langgraph'],
    },

    /* ------------------------------------------------------------------ 08 */
    {
      id: 'p-agentes-08',
      tipo: 'conceito',
      nivel: 'senior',
      titulo: 'O que tens de ver num traço de agente',
      enunciado:
        'Um cliente queixa-se de que o agente da seguradora lhe disse que a apólice não cobria o sinistro, e cobria. O que é que precisas de ter instrumentado para perceber o que aconteceu em cinco minutos?',
      minutos: 5,
      dica: 'Quais são as unidades de trabalho dentro de um turno?',
      resposta: [
        {
          type: 'p',
          text: 'Preciso de **um traço por turno com um span por chamada ao modelo e um por chamada de ferramenta**, com entradas, saídas, tokens, latência e motivo de paragem. Com isso vejo se a ferramenta devolveu a apólice errada, se o modelo leu bem o resultado, ou se o agente parou antes de consultar o que devia.',
        },
        {
          type: 'list',
          items: [
            '**Turno (span raiz)**: id da conversa e do turno, tenant, intenção classificada, versão do prompt e do modelo, número de passos, motivo de paragem (`final`, `limite_passos`, `repeticao`, `orcamento`), custo total.',
            '**Chamada ao modelo**: modelo, parâmetros, tokens de entrada e saída, tokens em cache, latência, a acção escolhida (ferramenta e argumentos, ou resposta).',
            '**Chamada de ferramenta**: nome, argumentos, resultado ou código de erro, latência, retries, chave de idempotência nas escritas.',
            '**Eventos**: guardrail activado, aprovação pedida, escalamento para humano.',
          ],
        },
        {
          type: 'p',
          text: 'Uso as convenções semânticas de GenAI do OpenTelemetry para os atributos, assim o backend (Langfuse, Jaeger ou outro) é intercambiável e os traços do agente ligam-se aos do resto do sistema. Dados pessoais são mascarados antes de ir para o traço.',
        },
        {
          type: 'p',
          text: 'No caso da apólice, o traço responde por ordem: a ferramenta `ler_apolice` foi chamada? Com que id? Devolveu a cobertura certa? Se sim, o erro é de leitura do modelo e vai para o golden set; se não, é bug de dados ou de ferramenta e o eval não tinha como o apanhar.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Métricas agregadas a partir dos traços',
          text: 'Distribuição de passos por intenção, taxa de turnos por motivo de paragem, taxa de erro por ferramenta, chamadas repetidas com os mesmos argumentos por turno. Esta última é o melhor detector de ciclos que conheço.',
        },
        {
          type: 'refs',
          items: [
            { label: 'OpenTelemetry — convenções semânticas de GenAI', url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/' },
            { label: 'Langfuse — documentação', url: 'https://langfuse.com/docs' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Estrutura o traço como turno, chamadas ao modelo e chamadas de ferramenta em spans.',
          'Inclui motivo de paragem, passos, tokens e custo como atributos.',
          'Menciona versão de prompt e de modelo no traço.',
          'Usa o traço para separar erro de ferramenta de erro de leitura do modelo.',
          'Menciona mascarar dados pessoais e um padrão aberto (OpenTelemetry).',
        ],
        fraco: 'Diz que guardava os logs do prompt e da resposta final.',
        solido: 'Descreve spans por passo com entradas, saídas, tokens e latência, e usa-os para localizar o erro.',
        excelente: 'Acrescenta motivo de paragem, versões, métricas agregadas como chamadas repetidas e o ciclo de levar o caso ao golden set.',
      },
      seguimento: [
        'Guardas o conteúdo completo das mensagens nos traços? Durante quanto tempo?',
        'Como ligarias o traço ao feedback do utilizador?',
        'Que alerta montavas a partir destes traços?',
      ],
      sinaisAlarme: [
        'Só ter logs de texto sem estrutura nem correlação.',
        'Guardar dados pessoais em claro nos traços.',
      ],
      modulos: ['agentes', 'observabilidade-llmops'],
    },

    /* ------------------------------------------------------------------ 09 */
    {
      id: 'p-agentes-09',
      tipo: 'codigo',
      nivel: 'senior',
      titulo: 'Escreve o ciclo de um agente com limites e detecção de repetição',
      enunciado:
        'Escreve o ciclo de um agente, sem framework. Quero limite de passos, detecção de chamadas repetidas, erros de ferramenta devolvidos como resultado, e um motivo de paragem no fim. Testa com um modelo simulado.',
      contexto:
        'Assinatura pedida: `correr_agente(modelo, ferramentas, pergunta, max_passos=8, max_repeticoes=2) -> Resultado`. O `modelo` é uma função que recebe a lista de mensagens e devolve `{"tipo": "final", "texto": ...}` ou `{"ferramenta": nome, "args": {...}}`. `ferramentas` é um dicionário nome para função. Python 3.13, só biblioteca padrão. 25 minutos.',
      minutos: 25,
      dica: 'Como reconheces que duas chamadas são «a mesma» se os argumentos vierem por outra ordem?',
      resposta: [
        {
          type: 'p',
          text: 'Um ciclo `for` limitado por `max_passos`, que em cada passo pede uma acção ao modelo, termina se for final, e caso contrário executa a ferramenta e devolve o resultado (ou o erro) como mensagem. A repetição detecta-se com uma assinatura canónica da chamada (nome mais argumentos serializados com chaves ordenadas) e um contador. Complexidade O(passos) chamadas ao modelo e memória O(passos) para o histórico.',
        },
        {
          type: 'code',
          lang: 'python',
          caption: 'Ciclo de agente com limites; os resultados em comentário foram verificados com python3',
          code: CODIGO_AGENTE,
        },
        {
          type: 'list',
          items: [
            '**Repetição**: paro antes de executar a terceira chamada idêntica, para não pagar a ferramenta nem um passo extra. `sort_keys=True` torna `{"a":1,"b":2}` e `{"b":2,"a":1}` a mesma assinatura.',
            '**Erros**: qualquer excepção da ferramenta vira `{"erro": ...}` no resultado; ferramenta desconhecida também, com a lista das disponíveis para o modelo se corrigir.',
            '**Limite de passos**: apanha o ciclo que a detecção de repetição não vê, como argumentos sempre diferentes (teste 3).',
            '**Motivo de paragem**: sempre preenchido, para o chamador decidir a mensagem ao utilizador e para métricas.',
          ],
        },
        {
          type: 'p',
          text: 'Testaria com guiões de modelo para cada caminho (final directo, erro e correcção, repetição, limite, ferramenta desconhecida), que é o que o exemplo faz, e com propriedades: o número de mensagens de ferramenta nunca passa `max_passos`, e o motivo está sempre num conjunto fechado.',
        },
        {
          type: 'p',
          text: 'Extensões que o entrevistador costuma pedir: orçamento de tokens e de tempo (verificados antes de chamar o modelo), retry com backoff só para erros transitórios marcados pela ferramenta, chamadas paralelas num só passo, e em vez de parar à repetição injectar uma mensagem «já chamaste isto com estes argumentos» e dar mais uma oportunidade.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Python — json.dumps (sort_keys)', url: 'https://docs.python.org/3/library/json.html' },
            { label: 'Yao et al. (2022) — ReAct', url: 'https://arxiv.org/abs/2210.03629' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'O ciclo tem limite de passos e devolve sempre um motivo de paragem.',
          'Detecta repetição com uma assinatura canónica (argumentos com chaves ordenadas) e pára antes de executar.',
          'Erros de ferramenta e ferramentas desconhecidas voltam como resultado, sem rebentar o ciclo.',
          'Inclui testes com um modelo simulado que cobrem final, erro, repetição e limite.',
          'Discute extensões: orçamento de tokens e tempo, retries só para transitórios.',
        ],
        fraco: 'Um `while True` sem limite, ou excepções da ferramenta a terminar o ciclo, e nenhum teste.',
        solido: 'Ciclo correcto com limite, try/except por ferramenta, detecção de repetição e um teste por caminho.',
        excelente: 'Assinatura canónica, paragem antes de executar a repetição, motivo de paragem num conjunto fechado, testes de propriedade e uma discussão clara das extensões de orçamento.',
      },
      seguimento: [
        'Como acrescentavas um orçamento de tokens se o modelo devolver o uso em cada resposta?',
        'E se o modelo pedir três ferramentas em paralelo num só passo?',
        'Preferes parar à repetição ou avisar o modelo e continuar? Porquê?',
      ],
      sinaisAlarme: [
        'Comparar argumentos como string sem normalizar a ordem das chaves.',
        'Deixar a excepção de uma ferramenta propagar-se para fora do ciclo.',
        'Não testar o caminho de limite atingido.',
      ],
      modulos: ['agentes', 'tool-calling'],
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'p-agentes-10',
      tipo: 'debug',
      nivel: 'senior',
      titulo: 'O agente chama a mesma ferramenta vinte vezes seguidas',
      enunciado:
        'Desde a última release, cerca de 4% dos turnos do agente de uma farmácia online chegam ao limite de passos. Nos traços, o agente chama `verificar_stock` com os mesmos argumentos vezes sem conta até ser cortado. Como investigas e o que corriges?',
      contexto:
        'Agente com 6 ferramentas, limite de 20 passos, modelo médio. Antes da release a taxa de turnos no limite era 0,3%. A release trouxe uma versão nova do prompt de sistema e uma refactorização da ferramenta `verificar_stock`, que passou a devolver um objecto com paginação. Custo médio por turno subiu 35%.',
      minutos: 10,
      dica: 'O que é que o modelo vê depois de cada chamada? Lê o resultado da ferramenta como se fosses o modelo.',
      resposta: [
        {
          type: 'p',
          text: 'A hipótese mais provável é que **o resultado da ferramenta deixou de dar ao modelo o que ele precisa para avançar**: com a paginação nova, a resposta diz algo como `{"itens": [], "pagina": 1, "mais": true}` e o modelo, sem saber pedir a página seguinte, repete a mesma chamada. É a alteração da release que toca exactamente a ferramenta em ciclo.',
        },
        {
          type: 'steps',
          items: [
            { title: 'Ler os resultados nos traços', text: 'Abro 20 turnos no limite e leio, passo a passo, o que `verificar_stock` devolveu. Se o resultado é vazio, ambíguo ou um erro vago, o modelo não tem informação nova e repete. Comparo com turnos que terminaram bem.' },
            { title: 'Isolar a variável', text: 'Corro o golden set com prompt novo e ferramenta antiga, e com prompt antigo e ferramenta nova. A combinação que reproduz os ciclos diz qual das duas mudanças é a causa. Não reverto as duas às cegas.' },
            { title: 'Verificar o esquema da ferramenta', text: 'Se a ferramenta aceita um parâmetro `pagina` mas a descrição não o explica, o modelo não sabe usá-lo. Vejo também se a descrição e o resultado continuam coerentes com o prompt de sistema.' },
            { title: 'Confirmar que o detector falhou', text: 'Se havia detecção de repetição e não disparou, a assinatura não era canónica (por exemplo, um campo com timestamp nos argumentos) ou não existia de todo.' },
          ],
        },
        {
          type: 'p',
          text: 'Correcção, por ordem: a ferramenta deixa de expor paginação ao modelo e devolve o que interessa (`em_stock`, `quantidade`, `farmacia`) já agregado; se a paginação for inevitável, o resultado diz explicitamente «há mais resultados, chama com pagina=2». No ciclo, a terceira chamada idêntica não é executada e o modelo recebe «já chamaste isto com estes argumentos, o resultado não muda»; à seguinte, paragem com mensagem ao cliente.',
        },
        {
          type: 'callout',
          tone: 'prod',
          title: 'Impedir a regressão',
          text: 'Alerta sobre a taxa de turnos que batem no limite de passos e sobre chamadas idênticas repetidas por turno. No CI, um eval de trajectória que falha se algum caso do golden set ultrapassar N passos ou repetir uma chamada. E as ferramentas passam a ter testes de contrato do resultado, porque são parte do prompt.',
        },
        {
          type: 'refs',
          items: [
            { label: 'Anthropic — Writing effective tools for AI agents', url: 'https://www.anthropic.com/engineering/writing-tools-for-agents' },
            { label: 'LangChain — ToolCallLimitMiddleware', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
          ],
        },
      ],
      rubrica: {
        criterios: [
          'Suspeita primeiro do resultado da ferramenta refactorizada, ligando o sintoma à mudança da release.',
          'Lê os resultados nos traços como o modelo os vê antes de mexer em código.',
          'Isola prompt e ferramenta com experiências separadas no golden set.',
          'Corrige na ferramenta (resultado útil, paginação explícita) e no ciclo (detecção de repetição).',
          'Acrescenta alerta e eval de trajectória para impedir a regressão.',
        ],
        fraco: 'Baixa o limite de passos ou troca o modelo por um maior.',
        solido: 'Encontra o resultado ambíguo nos traços e corrige a ferramenta, com detecção de repetição no ciclo.',
        excelente: 'Isola as duas mudanças experimentalmente, trata o resultado da ferramenta como parte do prompt com testes de contrato, e monta alerta e gate de trajectória.',
      },
      seguimento: [
        'Porque é que a detecção de repetição pode não ter disparado?',
        'Como escreverias um eval que apanhasse isto antes da release?',
        'O custo subiu 35% com só 4% dos turnos afectados. Faz sentido?',
      ],
      sinaisAlarme: [
        'Baixar o limite de passos e dar o problema por resolvido.',
        'Reverter tudo sem saber qual das mudanças causou o problema.',
        'Culpar o modelo sem ler o que a ferramenta lhe devolveu.',
      ],
      modulos: ['agentes', 'avaliar-agentes', 'observabilidade-llmops'],
    },
  ],
};
