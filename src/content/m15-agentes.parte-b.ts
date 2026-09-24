import type { Section } from '../types';

/* Secções 4 a 6 do módulo 15: paragem e limites, erros de ferramenta, agente vs workflow. */

export const seccoesB: Section[] = [
  /* ================================================================= 4 */
  {
    id: 'paragem',
    title: 'Critérios de paragem e limites: passos, tokens, chamadas e tempo',
    blocks: [
      {
        type: 'p',
        text:
          'Um agente pára de uma de duas maneiras: o modelo responde sem pedir ferramentas, ou um limite teu corta o ciclo. A primeira é o caso normal e não a controlas. A segunda é o que separa um protótipo de um sistema em produção, e tem de existir **antes** do primeiro cliente, porque o caso patológico (um modelo que pede sempre mais uma consulta) aparece com uma frequência pequena mas não nula, e custa muito quando aparece.',
      },
      {
        type: 'run',
        run: {
          id: 'run-agentes-02',
          title: 'Um agente em fuga: o que o pára, e quanto custa até parar',
          brief:
            'Didáctico: um modelo que pede sempre `ler_pedido`. Cada passo reenvia o histórico todo, por isso a entrada cresce linearmente e o acumulado cresce com o quadrado dos passos. Duas paragens: por número de passos e por orçamento de tokens.',
          code: `# Um agente em fuga: o modelo pede sempre mais uma leitura. O que o pára?
import json
import balcao as b


class ModeloGuloso(b.ModeloSimulado):
    def gerar(self, mensagens, ferramentas=None):
        entrada = sum(b.estimar_tokens(str(m.get("content", ""))) for m in mensagens)
        entrada += sum(b.estimar_tokens(json.dumps(f)) for f in ferramentas or [])
        chamada = {"name": "ler_pedido", "arguments": {"pedido_id": "PD-8841273"}}
        return b.Resposta("", [chamada], {"entrada": entrada, "saida": 18}, "tool_use")


def agente(modelo, max_passos, orcamento_tokens):
    msgs = [{"role": "user", "content": "Onde está o PD-8841273?"}]
    esquemas = [b.FERRAMENTAS["ler_pedido"]["esquema"]]
    gasto = 0
    for passo in range(1, max_passos + 1):
        r = modelo.gerar(msgs, esquemas)
        gasto += r.uso["entrada"] + r.uso["saida"]
        print(f"passo {passo}: entrada {r.uso['entrada']:>4} tokens, acumulado {gasto:>5}")
        if gasto > orcamento_tokens:
            return f"parado pelo orçamento ({gasto} > {orcamento_tokens})"
        if not r.chamadas:
            return r.texto
        msgs.append({"role": "assistant", "content": "", "tool_calls": r.chamadas})
        for c in r.chamadas:
            msgs.append({"role": "tool", "name": c["name"],
                         "content": json.dumps(b.executar_ferramenta(c), ensure_ascii=False)})
    return f"parado pelo limite de {max_passos} passos"


print(agente(ModeloGuloso(), max_passos=6, orcamento_tokens=100_000))
print(agente(ModeloGuloso(), max_passos=50, orcamento_tokens=4_000))`,
          expected: `passo 1: entrada   92 tokens, acumulado   110
passo 2: entrada  212 tokens, acumulado   340
passo 3: entrada  332 tokens, acumulado   690
passo 4: entrada  452 tokens, acumulado  1160
passo 5: entrada  572 tokens, acumulado  1750
passo 6: entrada  692 tokens, acumulado  2460
parado pelo limite de 6 passos
passo 1: entrada   92 tokens, acumulado   110
passo 2: entrada  212 tokens, acumulado   340
passo 3: entrada  332 tokens, acumulado   690
passo 4: entrada  452 tokens, acumulado  1160
passo 5: entrada  572 tokens, acumulado  1750
passo 6: entrada  692 tokens, acumulado  2460
passo 7: entrada  812 tokens, acumulado  3290
passo 8: entrada  932 tokens, acumulado  4240
parado pelo orçamento (4240 > 4000)`,
        },
      },
      {
        type: 'p',
        text:
          'Com uma só ferramenta e sem prompt de sistema, cada passo acrescenta ≈ 120 tokens. No «Balcão» real, cada chamada ao modelo leva ≈ 900 tokens de sistema e ≈ 1 100 de esquemas: com 5 200 tokens por chamada, 20 voltas do ciclo são mais de 100 000 tokens de entrada **num só turno**, ≈ 6,4 MZN no escalão médio sem cache. O alvo é menos de 1 MZN por conversa inteira (RNF-02). Um ciclo em fuga paga o orçamento de seis conversas.',
      },
      {
        type: 'table',
        head: ['Limite', 'Onde vive no «Balcão»', 'Valor', 'O que acontece ao atingi-lo'],
        rows: [
          ['Chamadas de ferramentas por turno', 'nó `agente` (`max_chamadas_ferramentas`)', '6', 'descarta as chamadas pedidas e escala para humano com resumo'],
          ['Pesquisas por turno', 'política de autonomia', '3', 'a quarta pesquisa não corre; o modelo responde com o que tem'],
          ['Passos do grafo', '`recursion_limit` na config de cada turno', '25', '`GraphRecursionError`: a última rede, tratada pela API como erro e escalamento'],
          ['Tokens por conversa', 'orçamento na API (adr-0027)', 'por conversa', 'o turno seguinte vai para humano'],
          ['Tempo', 'timeout do modelo e das ferramentas', '30 s modelo; p95 por ferramenta', 'erro como resultado, fallback ou escalamento'],
        ],
        caption: 'Limites em camadas, do mais específico ao mais geral. O mais específico actua primeiro e degrada com elegância; o mais geral (`recursion_limit`) é para bugs.',
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O erro clássico: confiar no `recursion_limit` por omissão',
        text:
          'Muitos exemplos antigos assumem que o LangGraph corta um ciclo aos 25 passos. No LangGraph 1.2.x o valor por omissão é **10 007** (configurável pela variável de ambiente `LANGGRAPH_DEFAULT_RECURSION_LIMIT`), o que dá mais de cinco mil voltas modelo-ferramentas antes do `GraphRecursionError`. Mede-o na versão que tens instalada e passa sempre `recursion_limit` explícito na config de cada execução; e não o uses como mecanismo de negócio, porque quando dispara já não tens estado limpo para responder ao cliente.',
      },
      {
        type: 'code',
        lang: 'python',
        caption: 'O orçamento de chamadas dentro do nó do agente (de `grafo.py`). Uma chamada sem resultado parte o histórico nos fornecedores reais, por isso a resposta com chamadas a mais nem entra no estado.',
        code: `def agente(estado: EstadoBalcao, config: RunnableConfig) -> dict:
    resp = modelo.bind_tools(permitidas).invoke([prefixo, *historico], config)
    usadas = estado.get("chamadas_ferramentas", 0)
    pedidas = len(resp.tool_calls or [])
    if pedidas and usadas + pedidas > cfg.max_chamadas_ferramentas:    # 6 por turno
        observabilidade.LIMITES.inc()
        return {"origem": "agente", "intencao": "humano"}             # router -> escalar
    return {"messages": [resp], "chamadas_ferramentas": usadas + pedidas, "origem": "agente"}`,
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Mede passos por turno, não só custo por dia',
        text:
          'O custo diário esconde a cauda: mil turnos normais e um turno com 40 passos têm uma média aceitável. O painel do «Balcão» mostra o p99 de passos por turno e de chamadas de ferramentas por turno, por intenção e por versão do prompt, com alarme quando o p99 passa 4. Um prompt novo que faz o modelo pesquisar «por precaução» aparece aqui dias antes de aparecer na factura.',
      },
      {
        type: 'refs',
        items: [
          { label: 'LangGraph — GRAPH_RECURSION_LIMIT', url: 'https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT' },
          { label: 'LangChain — middleware incorporado (limites)', url: 'https://docs.langchain.com/oss/python/langchain/middleware/built-in' },
        ],
      },
    ],
  },

  /* ================================================================= 5 */
  {
    id: 'erros-ferramentas',
    title: 'Erros de ferramenta como resultado, idempotência e autorização',
    blocks: [
      {
        type: 'p',
        text:
          'Num serviço normal, uma excepção sobe a pilha e vira um 500. Num agente, isso é quase sempre a resposta errada: o modelo que pediu `ler_pedido("PD-0000000")` pode corrigir o número, pedir ao cliente que o confirme, ou passar a um humano, **se souber o que falhou**. A convenção é devolver o erro como resultado da ferramenta, com uma mensagem que o modelo consiga usar e um código que o código consiga usar.',
      },
      {
        type: 'run',
        run: {
          id: 'run-agentes-03',
          title: 'Quatro erros que voltam ao modelo em vez de rebentar o ciclo',
          brief:
            'Didáctico: `executar_ferramenta` valida o esquema e apanha excepções; a ferramenta de reembolso aplica o limite de 500 MZN no código. No fim, o `ModeloSimulado` redige a resposta a partir do erro.',
          code: `# Erros de ferramenta como resultado: o ciclo continua e o modelo vê o erro.
import json
import balcao as b

chamadas = [
    {"name": "ler_pedido", "arguments": {"pedido_id": "PD-0000000"}},
    {"name": "ler_pedido", "arguments": {"pedido": "PD-8841273"}},
    {"name": "cancelar_tudo", "arguments": {}},
    {"name": "emitir_reembolso", "arguments": {"pedido_id": "PD-8842507", "valor_mzn": 2910,
                                               "chave_idempotencia": "c-77|PD-8842507|2910"}},
]
modelo = b.ModeloSimulado()
for c in chamadas:
    res = b.executar_ferramenta(c)
    print(c["name"], "->", res.get("erro"), res.get("codigo", ""))

msgs = [{"role": "user", "content": "Onde está o PD-0000000?"},
        {"role": "tool", "name": "ler_pedido",
         "content": json.dumps(b.executar_ferramenta(chamadas[0]), ensure_ascii=False)}]
print(modelo.gerar(msgs).texto)`,
          expected: `ler_pedido -> pedido PD-0000000 não encontrado
ler_pedido -> argumentos inválidos: a mais ['pedido'], em falta ['pedido_id']
cancelar_tudo -> ferramenta desconhecida: cancelar_tudo
emitir_reembolso -> acima do limite autónomo: requer aprovação humana APROVACAO_NECESSARIA
Não consegui concluir: pedido PD-0000000 não encontrado. Vou passar a conversa a um colega.`,
        },
      },
      {
        type: 'p',
        text:
          'Repara na quarta linha. O modelo pediu um reembolso de 2 910 MZN; a ferramenta recusou com `APROVACAO_NECESSARIA`, e isso não depende de o prompt ter dito «não passes os 500 MZN». É a conversa de referência «Reembolso acima do limite»: no grafo do «Balcão», o `calcular_reembolso` devolve `precisa_aprovacao` e o router nem deixa o modelo tentar emitir, vai directo para o `interrupt` (módulo 17). A recusa dentro da ferramenta é a segunda camada, para o caso de o router falhar ou de uma injecção empurrar o modelo.',
      },
      { type: 'tool', ref: 'emitir-reembolso' },
      {
        type: 'code',
        lang: 'python',
        caption: 'No LangGraph, o `ToolNode` converte excepções em `ToolMessage` de erro (`handle_tool_errors`) e aceita um interceptor à volta de cada chamada (`wrap_tool_call`). O «Balcão» usa-o para a última palavra de política.',
        code: `import json
from langchain_core.messages import ToolMessage
from langgraph.prebuilt import ToolNode

def politica_ferramentas(request, executar):
    nome = request.tool_call["name"]
    suspeita = (request.state or {}).get("injeccao", {}).get("suspeita")
    if suspeita and nome not in LEITURA:                 # turno suspeito: só leituras
        return ToolMessage(
            content=json.dumps({"erro": "acção não permitida neste turno", "codigo": "POLITICA"}),
            name=nome, tool_call_id=request.tool_call["id"], status="error",
        )
    return executar(request)

ferramentas = ToolNode(dep.ferramentas, wrap_tool_call=politica_ferramentas,
                       handle_tool_errors=True)`,
      },
      {
        type: 'list',
        items: [
          '**Identidade vem do contexto, não do modelo.** As ferramentas do «Balcão» lêem o cliente autenticado de `config["configurable"]["cliente_id"]`; nenhum esquema aceita `cliente_id` (há um teste que falha se aceitar). Um modelo manipulado não pode pedir os pedidos de outra pessoa.',
          '**Escritas idempotentes.** A chave de `emitir_reembolso` é o SHA-256 de (conversa, operação, pedido, valor): o ciclo que repete a chamada, o grafo que retoma depois de um crash ou o cliente que carrega duas vezes recebem o mesmo reembolso, não dois.',
          '**O valor é da política, não do modelo.** `emitir_reembolso` recalcula com `calcular_reembolso` e recusa um valor diferente (`VALOR_INVALIDO`). O modelo escolhe quando; nunca quanto.',
          '**Erros com código.** `NAO_ENCONTRADO`, `APROVACAO_NECESSARIA`, `REVISAO_HUMANA`, `POLITICA`: o texto é para o modelo, o código é para o router e para as métricas.',
        ],
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Retentar uma escrita sem idempotência',
        text:
          'Um timeout numa chamada de escrita não diz se a escrita aconteceu. Retentar `emitir_reembolso` sem chave de idempotência é pagar duas vezes um em cada N timeouts. O `ToolRetryMiddleware` e o `RetryPolicy` do LangGraph retentam sem saber o que a ferramenta faz: usa-os em leituras, e em escritas só quando a API do outro lado aceita uma chave de idempotência.',
      },
      { type: 'file', ref: 'tests/test_ferramentas.py' },
      {
        type: 'refs',
        items: [
          { label: 'LangChain — tools (erros e runtime)', url: 'https://docs.langchain.com/oss/python/langchain/tools' },
          { label: 'OWASP — Top 10 para aplicações LLM', url: 'https://genai.owasp.org/llm-top-10/' },
        ],
      },
    ],
  },

  /* ================================================================= 6 */
  {
    id: 'agente-vs-workflow',
    title: 'Agente ou workflow: porque o «Balcão» usa um grafo com router',
    blocks: [
      {
        type: 'p',
        text:
          'A pergunta de desenho não é «devo usar agentes?», é **onde é que a decisão varia de caso para caso o suficiente para justificar variância e custo**. As intenções do «Balcão» respondem por si: 31% das mensagens são «onde está o meu pedido», que se resolve com uma chamada a `ler_pedido`; 18% são perguntas sobre regras, RAG puro; 4% são saúde, segurança ou fraude, que têm de ir para um humano antes de qualquer modelo decidir o que quer que seja. Só compensação (22%) e pagamentos (14%) têm combinações que não cabem num `if`.',
      },
      {
        type: 'table',
        head: ['', 'Agente ReAct livre (12 ferramentas)', 'Grafo com router (adr-0013)'],
        rows: [
          ['Pergunta sobre regras (18%)', '≥ 2 chamadas ao médio com 900 + 1 100 tokens fixos cada, uma delas com o contexto da pesquisa: ≈ 8 000 tokens', 'classificação no pequeno (≈ 340) e uma chamada ao médio sem esquemas: ≈ 4 000 tokens'],
          ['Onde está (31%)', '2 chamadas ao médio com esquemas', 'o mesmo subciclo, mas só com ferramentas de pedido ligadas'],
          ['Saúde e segurança (4%)', 'depende de o modelo não pesquisar políticas primeiro', 'regra antes do modelo: escala sempre, com prioridade urgente'],
          ['Variância', 'o caminho muda entre corridas em todas as intenções', 'só dentro do subciclo de compensação e pagamentos'],
          ['Testes', 'avaliação por trajectória em todos os casos (módulo 23)', 'asserções exactas por nó nos caminhos fixos; trajectória só no subciclo'],
        ],
        caption: 'Estimativas por turno com os números de capacidade do «Balcão» (900 tokens de sistema, 1 100 de esquemas, ≈ 2 000 de contexto RAG). A diferença de ≈ 4 000 tokens em 18% dos 3 900 turnos diários é ≈ 2,8 M tokens por dia no escalão médio.',
      },
      {
        type: 'diagram',
        diagram: {
          title: 'O agente só onde a decisão varia',
          caption: 'Router determinista por intenção; o subciclo de agente recebe apenas as ferramentas da intenção; saúde e segurança nunca passam por ele.',
          cols: 5,
          rows: 3,
          zones: [
            { id: 'za', label: 'subciclo de agente', col: 3, row: 1, colSpan: 2, rowSpan: 1, tone: 'agente' },
          ],
          nodes: [
            { id: 'msg', label: 'mensagem', col: 0, row: 1, kind: 'user' },
            { id: 'guarda', label: 'guardas + regras', sub: 'saúde, humano, PII', col: 1, row: 1, kind: 'service' },
            { id: 'cls', label: 'classificar', sub: 'modelo pequeno', col: 2, row: 1, kind: 'model' },
            { id: 'rag', label: 'cadeia RAG', sub: 'politica, outros', col: 3, row: 0, kind: 'vector' },
            { id: 'ag', label: 'agente', sub: 'compensacao, pagamentos, onde-esta', col: 3, row: 1, kind: 'agent' },
            { id: 'tools', label: 'ferramentas', sub: 'filtradas por intenção', col: 4, row: 1, kind: 'tool' },
            { id: 'hum', label: 'humano', sub: 'seguranca, conta', col: 3, row: 2, kind: 'user' },
          ],
          edges: [
            { from: 'msg', to: 'guarda' },
            { from: 'guarda', to: 'cls' },
            { from: 'guarda', to: 'hum', label: 'saúde: sempre', style: 'dashed' },
            { from: 'cls', to: 'rag' },
            { from: 'cls', to: 'ag' },
            { from: 'cls', to: 'hum' },
            { from: 'ag', to: 'tools', dir: 'both' },
          ],
        },
      },
      {
        type: 'callout',
        tone: 'info',
        title: 'O router também é um ponto de falha',
        text:
          'O adr-0013 regista a consequência má: um erro do classificador manda o caso pelo caminho errado, e o agente nunca o vê. Mitiga-se com regras antes do modelo para os casos graves, com a heurística como rede quando o classificador falha, e medindo o recall por intenção no conjunto dourado em cada pull request.',
      },
      { type: 'adr', ref: 'adr-0013' },
      {
        type: 'decision',
        tree: {
          id: 'dt-agentes-01',
          title: 'Esta intenção precisa de um agente?',
          intro: 'Aplica-se intenção a intenção, com dados das conversas reais, não ao sistema inteiro.',
          start: 'q1',
          nodes: [
            { id: 'q1', question: 'Há risco para a saúde, a segurança ou dinheiro acima do limite?', options: [{ label: 'Sim', next: 'humano' }, { label: 'Não', next: 'q2' }] },
            { id: 'q2', question: 'A resposta sai sempre dos mesmos passos (uma ferramenta, ou uma pesquisa)?', options: [{ label: 'Sim', next: 'workflow' }, { label: 'Não, depende do caso', next: 'q3' }] },
            { id: 'q3', question: 'Consegues enumerar as combinações de passos numa árvore de menos de ~10 ramos?', options: [{ label: 'Sim', next: 'arvore' }, { label: 'Não', next: 'q4' }] },
            { id: 'q4', question: 'Os efeitos de escrita têm limites em código, idempotência e confirmação?', options: [{ label: 'Sim', next: 'agente' }, { label: 'Ainda não', next: 'primeiro' }] },
            { id: 'humano', answer: 'Humano, com regra determinista antes de qualquer modelo.', detail: 'Intenção `seguranca`: recall medido a 100% no conjunto de escalamento.' },
            { id: 'workflow', answer: 'Workflow: ferramenta directa ou cadeia RAG.', detail: 'Mais barato, previsível, testável com asserções.' },
            { id: 'arvore', answer: 'Router com ramos explícitos no grafo.', detail: 'Cada ramo é um nó testável; a árvore é documentação do comportamento.' },
            { id: 'agente', answer: 'Subciclo de agente com ferramentas filtradas e limites.', detail: 'É o caso de compensação e pagamentos no «Balcão».' },
            { id: 'primeiro', answer: 'Ainda não: primeiro os limites nas ferramentas.', detail: 'Um agente com escritas sem limites em código é um incidente à espera de acontecer.' },
          ],
        },
      },
      {
        type: 'p',
        text:
          'Sobre variância: a mesma conversa corrida cinco vezes com temperatura 0 num fornecedor comercial não dá garantidamente a mesma trajectória, porque a inferência em lote não é bit a bit determinista. Num workflow isso muda palavras; num agente muda **quais ferramentas correm**. É por isso que o módulo 23 avalia agentes com pass^k (todas as k corridas certas) e não só pass@k, e com traços de referência por trajectória.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
          { label: 'LangGraph — pensar em LangGraph', url: 'https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph' },
          { label: 'Yao et al. — τ-bench e pass^k (2024)', url: 'https://arxiv.org/abs/2406.12045' },
        ],
      },
    ],
  },
];
