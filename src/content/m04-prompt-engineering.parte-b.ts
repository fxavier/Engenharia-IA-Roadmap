import type { Section } from '../types';

/* Secções 4 a 6 do módulo 4: raciocínio explícito, engenharia de contexto, prompts versionados. */

export const seccoesB: Section[] = [
  /* ================================================================= 4 */
  {
    id: 'raciocinio',
    title: 'Raciocínio explícito e *extended thinking*',
    blocks: [
      {
        type: 'p',
        text:
          'Pedir ao modelo que escreva os passos intermédios antes da resposta — *chain-of-thought* — melhora o desempenho em problemas de vários passos: Wei et al. (2022) mostraram-no com exemplos de raciocínio no prompt, Kojima et al. (2022) com a simples frase «vamos pensar passo a passo». O mecanismo não tem nada de misterioso: cada token gerado passa a fazer parte do contexto dos seguintes, e texto intermédio que decompõe o problema torna mais provável uma resposta final consistente com essa decomposição. É mais computação por pergunta, comprada em tokens.',
      },
      {
        type: 'p',
        text:
          'Os modelos de raciocínio levaram isto para dentro da API. Na Messages API, o parâmetro `thinking` faz o modelo gerar blocos `thinking` antes do texto: em modelos mais antigos com `{"type": "enabled", "budget_tokens": N}` (N ≥ 1 024 e abaixo de `max_tokens`); nos recentes com `{"type": "adaptive"}` e o esforço em `output_config.effort` (`low` a `max`), e em alguns deles o raciocínio nem se pode desligar. Na OpenAI, os modelos de raciocínio aceitam `reasoning={"effort": ...}` e não devolvem o raciocínio, só um resumo opcional e a contagem em `usage.output_tokens_details.reasoning_tokens`. Em todos, **os tokens de raciocínio são cobrados como saída** e geram-se antes da primeira palavra visível.',
      },
      {
        type: 'code',
        lang: 'python',
        caption:
          'Raciocínio explícito nas duas APIs. Com ferramentas, os blocos `thinking` (com a sua assinatura) têm de voltar no histórico sem alterações na volta seguinte; o LangChain faz isso se reenviares a `AIMessage` inteira.',
        code: `# Anthropic: modelo recente, raciocínio adaptativo com esforço baixo
r = cliente.messages.create(
    model=MODELO_GRANDE, max_tokens=4000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "low"},
    system=RUBRICA_JUIZ, messages=[{"role": "user", "content": caso_a_julgar}],
)
pensamento = [b.thinking for b in r.content if b.type == "thinking"]
veredicto = "".join(b.text for b in r.content if b.type == "text")
print(r.usage.output_tokens)          # inclui o raciocínio: é isto que se paga

# OpenAI Responses: o raciocínio não é devolvido, só contado
r = cliente_openai.responses.create(
    model=MODELO_RACIOCINIO, reasoning={"effort": "low"},
    instructions=RUBRICA_JUIZ, input=caso_a_julgar, max_output_tokens=4000, store=False,
)
print(r.usage.output_tokens, r.usage.output_tokens_details.reasoning_tokens)`,
      },
      {
        type: 'run',
        run: {
          id: 'run-prompt-engineering-04',
          title: 'O que custa pensar antes de responder ao cliente',
          brief:
            'O turno de resposta do «Balcão» com raciocínio de 0 a 4 000 tokens. Preços do escalão médio e ≈ 60 tokens por segundo; o cliente só lê a primeira palavra depois de o raciocínio acabar.',
          code: `import balcao as b

# Um turno de resposta no médio: 5 200 de entrada (60% em cache), 180 tokens de resposta visível
tps, ttft_ms = 60, 700                 # ≈ 60 tokens/s e 700 ms até ao primeiro token (escalão médio)
base = b.custo_mzn(5200, 180, "medio", 3120)
print("raciocínio  custo/turno  vs base  1.ª palavra  custo extra/dia")
for pensar in (0, 300, 1024, 4000):
    custo = b.custo_mzn(5200, 180 + pensar, "medio", 3120)   # o raciocínio é cobrado como saída
    visivel = (ttft_ms + pensar / tps * 1000) / 1000           # o cliente só lê depois de o raciocínio acabar
    print(f"{pensar:>10}  {custo:.4f} MZN  {custo / base:5.1f}x  {visivel:8.1f} s  {3900 * (custo - base):8.0f} MZN")`,
          expected: `raciocínio  custo/turno  vs base  1.ª palavra  custo extra/dia
         0  0.2104 MZN    1.0x       0.7 s         0 MZN
       300  0.3062 MZN    1.5x       5.7 s       374 MZN
      1024  0.5375 MZN    2.6x      17.8 s      1276 MZN
      4000  1.4884 MZN    7.1x      67.4 s      4984 MZN`,
        },
      },
      {
        type: 'p',
        text:
          'Com 300 tokens de raciocínio, a primeira palavra passa de 0,7 s para 5,7 s: RNF-01 (p95 abaixo de 1,5 s) deixa de ser possível, e o custo por conversa passa o alvo de 1,00 MZN. O «Balcão» não usa raciocínio explícito para responder ao cliente — e não precisa, porque as partes que exigiriam raciocínio (quanto vale a compensação, se passa o limite) são **cálculo em ferramentas**, não texto. Onde o raciocínio compensa é fora do caminho do cliente.',
      },
      {
        type: 'table',
        head: ['Tarefa', 'Raciocínio explícito?', 'Porquê'],
        rows: [
          ['Classificar a intenção (pequeno)', 'Não', 'Uma etiqueta de um conjunto fechado; latência no caminho crítico; os exemplos resolvem as fronteiras'],
          ['Responder sobre políticas (médio)', 'Não', 'Extrair e citar do contexto; TTFT e custo por conversa impedem-no'],
          ['Calcular uma compensação', 'Não: ferramenta', '`calcular_reembolso` é determinista, testável e auditável; texto não é'],
          ['LLM-como-juiz nas avaliações (grande)', 'Sim, com esforço baixo ou médio', 'Aplicar uma rubrica com vários critérios; fora do caminho do cliente; a justificação ajuda a auditar o juiz (módulo 22)'],
          ['Análise de erros offline e casos difíceis encaminhados (≈ 4%)', 'Talvez', 'Medir no conjunto desses casos se ganha pontos que paguem a latência'],
        ],
        caption: 'Raciocínio é uma alavanca de qualidade com preço em latência e em tokens de saída. Decide-se por papel e mede-se, como a escolha do escalão.',
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O raciocínio escrito não é uma explicação fiel',
        text:
          'Turpin et al. (2023) mostraram que um modelo pode dar uma resposta influenciada por um enviesamento do prompt (por exemplo, a ordem das opções) e escrever um raciocínio plausível que nunca menciona esse enviesamento. O texto do raciocínio é mais uma sequência gerada, útil para depurar e para auditar um juiz, mas não uma prova de porque é que a resposta saiu assim. Não o mostres ao cliente como justificação, e não o uses como evidência numa auditoria de compensações: a evidência é o resultado da ferramenta e a política citada.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Em produção: o raciocínio conta no orçamento de saída',
        text:
          'Com raciocínio ligado, `max_tokens` tem de cobrir o raciocínio **e** a resposta; um tecto calculado só para a resposta dá `stop_reason: "max_tokens"` com zero texto visível. Regista os tokens de raciocínio à parte no traço (`output_tokens_details` quando o fornecedor os separa) para o custo por papel ser explicável, e lembra-te de que o raciocínio não é compatível com prefill e fixa a amostragem do lado do fornecedor.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Wei et al. — Chain-of-Thought Prompting (2022)', url: 'https://arxiv.org/abs/2201.11903' },
          { label: 'Turpin et al. — Language Models Don’t Always Say What They Think (2023)', url: 'https://arxiv.org/abs/2305.04388' },
          { label: 'Anthropic — extended thinking', url: 'https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking' },
          { label: 'OpenAI — modelos de raciocínio', url: 'https://platform.openai.com/docs/guides/reasoning' },
        ],
      },
    ],
  },

  /* ================================================================= 5 */
  {
    id: 'contexto',
    title: 'Engenharia de contexto: o que entra, e em que ordem',
    blocks: [
      {
        type: 'p',
        text:
          'Num turno do «Balcão», o prompt de sistema é menos de um quinto dos 5 200 tokens de entrada. O resto — esquemas de ferramentas, resumo, histórico, excertos recuperados, a pergunta — é montado pelo teu código a cada chamada. **Engenharia de contexto** é esse trabalho: decidir, por chamada, que tokens entram na janela, de que fonte, com que orçamento e em que ordem. É uma decisão de engenharia com os trade-offs de sempre: cada token a mais custa dinheiro e latência de prefill, e contexto irrelevante não é neutro — dilui a atenção e dá ao modelo material para citar mal.',
      },
      {
        type: 'diagram',
        diagram: {
          title: 'A janela de um turno do «Balcão», da esquerda para a direita',
          caption:
            'A ordem vai do mais estável ao mais variável. Tudo à esquerda da linha de cache é igual ao pedido anterior e é cobrado a 10%; tudo à direita é novo em cada turno. Tokens do orçamento de capacidade.',
          cols: 6,
          rows: 2,
          zones: [
            { id: 'z-cache', label: 'Prefixo em cache (≈ 60%)', col: 0, row: 0, colSpan: 3, rowSpan: 2, tone: 'data' },
            { id: 'z-novo', label: 'Novo em cada turno', col: 3, row: 0, colSpan: 3, rowSpan: 2, tone: 'rag' },
          ],
          nodes: [
            { id: 'sis', label: 'Sistema', sub: '≈ 900 tokens · sistema@1.4.0', col: 0, row: 0, kind: 'note' },
            { id: 'esq', label: 'Esquemas de ferramentas', sub: '≈ 1 100 tokens · filtrados por intenção', col: 1, row: 0, kind: 'tool' },
            { id: 'hist', label: 'Resumo + histórico anterior', sub: '≈ 1 120 tokens · janela de 1 500', col: 2, row: 0, kind: 'data' },
            { id: 'ctx', label: '<contexto>', sub: '≈ 2 000 tokens · k = 4 excertos', col: 3, row: 0, kind: 'vector' },
            { id: 'perg', label: 'Pergunta', sub: 'mascarada, no fim', col: 4, row: 0, kind: 'user' },
            { id: 'modelo', label: 'Modelo médio', sub: '≈ 5 200 → 180 tokens', col: 5, row: 0, kind: 'model' },
            { id: 'fora', label: 'Fica de fora', sub: 'PII, documentos internos, versões não vigentes, dados de outros clientes', col: 3, row: 1, span: 2, kind: 'note' },
          ],
          edges: [
            { from: 'sis', to: 'esq' },
            { from: 'esq', to: 'hist' },
            { from: 'hist', to: 'ctx', label: 'linha de cache', style: 'dashed' },
            { from: 'ctx', to: 'perg' },
            { from: 'perg', to: 'modelo' },
          ],
        },
      },
      {
        type: 'p',
        text:
          'Caber na janela não chega. Liu et al. (2023, publicado na TACL em 2024) puseram o documento com a resposta em posições diferentes de um contexto com 10, 20 ou 30 documentos e mediram uma curva em U: o desempenho era mais alto com o documento no início ou no fim, e caía com ele no meio — no GPT-3.5-Turbo com 20 documentos, abaixo do desempenho sem documento nenhum (56,1%). Modelos com janelas alargadas não usavam melhor o contexto do que as versões normais. Os modelos de 2025–2026 são muito melhores em testes de «agulha no palheiro», mas o efeito de posição e o efeito de distracção continuam a aparecer em tarefas que exigem juntar vários factos; mede no teu conjunto antes de confiar numa janela grande.',
      },
      { type: 'widget', id: 'contexto-janela' },
      {
        type: 'run',
        run: {
          id: 'run-prompt-engineering-05',
          title: 'Orçamento e ordem do contexto recuperado',
          brief:
            'Oito excertos candidatos para uma pergunta de cobrança duplicada, um orçamento de 350 tokens para o contexto, e duas ordens: por score, e com os melhores nas pontas (a heurística que responde ao *lost in the middle*). Repara que `pol-reembolso-prazos` aparece em dois chunks diferentes.',
          code: `import balcao as b

pergunta = "Fui cobrado duas vezes no M-Pesa, quando recebo o dinheiro de volta?"
res = b.recuperar(pergunta, k=8, metodo="rerank", filtro={"vigente": True, "publico": "cliente"})
for c, s in res:
    print(f"  {s:.4f} {c.doc:<29} {b.estimar_tokens(c.texto):>3} tokens")

# 1) Orçamento: entram os melhores enquanto couberem
orcamento, usados, escolhidos = 350, 0, []
for c, s in res:
    t = b.estimar_tokens(c.texto) + 6            # + marcador [id] e quebra de linha
    if usados + t <= orcamento:
        escolhidos.append((c, s))
        usados += t
print("por score:", [c.doc for c, _ in escolhidos], f"({usados} tokens)")

# 2) Ordem: os melhores nas pontas, os mais fracos no meio
def pontas(itens):
    frente, tras = [], []
    for i, x in enumerate(itens):
        (frente if i % 2 == 0 else tras).append(x)
    return frente + tras[::-1]

print("pontas:   ", [c.doc for c, _ in pontas(escolhidos)])`,
          expected: `  0.2855 pol-cobranca-duplicada         84 tokens
  0.1703 pol-pagamento-mpesa            84 tokens
  0.1657 pol-reembolso                  90 tokens
  0.1445 pol-reembolso-prazos           47 tokens
  0.1427 pol-cupoes                    113 tokens
  0.1320 pol-reembolso-prazos           85 tokens
  0.0993 faq-objecto-esquecido          64 tokens
  0.0974 pol-cancelamento-restaurante   64 tokens
por score: ['pol-cobranca-duplicada', 'pol-pagamento-mpesa', 'pol-reembolso', 'pol-reembolso-prazos'] (329 tokens)
pontas:    ['pol-cobranca-duplicada', 'pol-reembolso', 'pol-reembolso-prazos', 'pol-pagamento-mpesa']`,
        },
      },
      {
        type: 'p',
        text:
          'Com quatro excertos curtos, a ordem quase não importa: o efeito de posição cresce com o número e o tamanho dos documentos. O que importa já aqui é o que ficou de fora. O orçamento cortou `pol-cupoes` (irrelevante) e os dois últimos (irrelevantes), e o filtro `publico = cliente` na base de dados tirou `int-escalamento` e `int-fraude-sinais`, que um retriever sem filtro teria posto na janela. Menos texto e mais relevante é a regra; o re-ranking (módulo 11) é o que permite usar k = 4 sem perder recall.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-prompt-engineering-01',
          title: 'Montar a janela de um turno de pagamentos',
          intro: 'O nó de resposta do grafo junta cinco fontes. Os tokens são os do orçamento; os tempos, os do orçamento de latência.',
          lanes: [
            { id: 'grafo', label: 'Nó responder', sub: 'grafo.py', kind: 'service' },
            { id: 'estado', label: 'Estado da conversa', sub: 'checkpoint no PostgreSQL', kind: 'store' },
            { id: 'ret', label: 'Recuperador híbrido', sub: 'pgvector + tsvector', kind: 'store' },
            { id: 'modelo', label: 'Modelo médio', sub: 'escalão médio', kind: 'model' },
          ],
          steps: [
            { from: 'grafo', to: 'grafo', label: 'sistema@1.4.0 + esquemas da intenção pagamentos', kind: 'self', tokens: 2000, detail: 'Prompt fixo lido uma vez no arranque. Só os esquemas das ferramentas que a intenção usa (ler_pedido, ler_cliente, pesquisar_conhecimento, transferir_humano).' },
            { from: 'grafo', to: 'estado', label: 'resumo + últimos turnos até 1 500 tokens', kind: 'req', ms: 60, detail: '`janela_tokens_historico` em `config.py`; o resto está no resumo (módulo 18). Mensagens já mascaradas: nada de telefones ou NUIT na janela.' },
            { from: 'estado', to: 'grafo', label: 'histórico', kind: 'res', tokens: 1120 },
            { from: 'grafo', to: 'ret', label: 'consulta reformulada, filtro vigente e público', kind: 'req', ms: 225, detail: 'Filtros na SQL, antes do ranking (adr-0010). Re-ranking dos 20 primeiros; ficam os 4 melhores acima do limiar.' },
            { from: 'ret', to: 'grafo', label: '4 excertos com id e score', kind: 'res', tokens: 2000, detail: 'Abaixo do limiar de relevância, a cadeia recusa sem chamar o modelo (adr-0011).' },
            { from: 'grafo', to: 'grafo', label: 'escapar dados, delimitar, pergunta no fim', kind: 'self', detail: 'Cada excerto como `[id] texto` escapado dentro de `<contexto>`; a mensagem do cliente no fim, depois de «Pergunta:».' },
            { from: 'grafo', to: 'modelo', label: 'pedido com 5 200 tokens', kind: 'req', ms: 700, tokens: 5200, detail: '≈ 3 120 lidos da cache (sistema, esquemas, histórico anterior).' },
          ],
          outro:
            'Nada nesta montagem é do modelo: é código determinista, testável e registado no traço (versão do prompt, ids dos excertos, tokens por parte). Quando uma resposta sai mal, a primeira pergunta é «o que estava na janela?», e o traço responde.',
        },
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Mais contexto não é melhor contexto',
        text:
          'Com janelas de 200 k tokens, a tentação é mandar os 20 excertos do re-ranking, o histórico inteiro e todos os esquemas «para o modelo decidir». O resultado mede-se: custo e TTFT sobem com cada token, a faithfulness desce porque há mais frases parecidas para citar mal, e a versão substituída de uma política aparece ao lado da actual. O orçamento do contexto é um parâmetro com valor por omissão (k = 4, 1 500 tokens de histórico) escolhido nas evals, não o tamanho da janela.',
      },
      {
        type: 'table',
        head: ['Intenção', 'Esquemas na janela', 'Contexto RAG', 'Porquê'],
        rows: [
          ['onde-esta (31%)', '`ler_pedido`, `rastrear_entrega`, `transferir_humano`', 'Nenhum', 'A resposta está no estado do pedido; políticas só distraem'],
          ['politica (18%)', '`transferir_humano`', 'k = 4, `publico = cliente`', 'O caso de livro do RAG'],
          ['compensacao (22%)', 'Pedido, cálculo, emissão, aprovação, humano', 'k = 4', 'Precisa de política e de dados; o valor vem da ferramenta'],
          ['seguranca (4%)', '`transferir_humano`', '`pol-alergenios`, `int-escalamento` (orientação interna)', 'Escalar primeiro; a janela curta reduz a hipótese de seguir o fluxo normal'],
        ],
        caption: 'O contexto certo depende da intenção classificada antes. É uma das razões por que o «Balcão» classifica primeiro e responde depois (adr-0013).',
      },
      {
        type: 'refs',
        items: [
          { label: 'Liu et al. — Lost in the Middle (2023)', url: 'https://arxiv.org/abs/2307.03172' },
          { label: 'Anthropic — engenharia de contexto para agentes', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
          { label: 'Anthropic — prompts com contexto longo', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips' },
        ],
      },
    ],
  },

  /* ================================================================= 6 */
  {
    id: 'versoes',
    title: 'Prompts versionados como código',
    blocks: [
      {
        type: 'p',
        text:
          'Um prompt é código que o modelo executa: muda o comportamento do sistema tanto como uma alteração em `grafo.py`, e às vezes mais. No «Balcão», cada prompt vive em `prompts/<nome>.md` com um cabeçalho (`nome`, `versao` em SemVer, `actualizado`, `escalao`, `dono`, `revisto_por`), é lido no arranque por `carregar_prompt`, e a sua etiqueta (`sistema@1.4.0`) vai para os metadados da cadeia e para cada traço. Com isso, qualquer resposta dos últimos 30 dias é atribuível a uma versão de prompt e a um commit (RNF-06), e `git bisect` funciona para regressões de qualidade (módulo 26).',
      },
      { type: 'file', ref: 'src/balcao/cadeias.py' },
      {
        type: 'run',
        run: {
          id: 'run-prompt-engineering-06',
          title: 'Carregar, identificar e comparar duas versões',
          brief:
            'O que `carregar_prompt` faz, em miniatura: cabeçalho com versão obrigatória, corpo, e um hash do corpo para o traço. O diff é o que o revisor do PR lê — e o que as evals têm de justificar.',
          code: `import difflib
import hashlib
import re

V13 = """---
nome: sistema
versao: 1.3.0
---
Se o contexto não tiver a resposta, diz que não sabes.
Cita a fonte entre parênteses rectos."""
V14 = """---
nome: sistema
versao: 1.4.0
---
Se o contexto não tiver a resposta, diz exactamente: «Não encontrei essa informação nas nossas políticas.»
Cita a fonte entre parênteses rectos, com o id exacto que aparece no contexto."""

def carregar(bruto: str) -> dict:
    """O que cadeias.carregar_prompt faz: cabeçalho com versão obrigatória, corpo, e um hash do corpo."""
    m = re.match(r"^---\\n(.*?)\\n---\\n(.*)$", bruto, re.S)
    cab = dict(linha.split(":", 1) for linha in m.group(1).splitlines())
    texto = m.group(2).strip()
    return {"etiqueta": f"{cab['nome'].strip()}@{cab['versao'].strip()}", "texto": texto,
            "sha": hashlib.sha256(texto.encode()).hexdigest()[:12]}

a, c = carregar(V13), carregar(V14)
for p in (a, c):
    print(p["etiqueta"], "sha256:" + p["sha"], len(p["texto"]), "caracteres")
for linha in difflib.unified_diff(a["texto"].splitlines(), c["texto"].splitlines(),
                                  a["etiqueta"], c["etiqueta"], lineterm="", n=0):
    print(linha)`,
          expected: `sistema@1.3.0 sha256:6cb75c515a3e 92 caracteres
sistema@1.4.0 sha256:c66b487ce988 185 caracteres
--- sistema@1.3.0
+++ sistema@1.4.0
@@ -1,2 +1,2 @@
-Se o contexto não tiver a resposta, diz que não sabes.
-Cita a fonte entre parênteses rectos.
+Se o contexto não tiver a resposta, diz exactamente: «Não encontrei essa informação nas nossas políticas.»
+Cita a fonte entre parênteses rectos, com o id exacto que aparece no contexto.`,
        },
      },
      {
        type: 'table',
        head: ['Mudança', 'Versão', 'Exemplo no «Balcão»', 'O que exige'],
        rows: [
          ['Muda o contrato com o código', 'MAJOR', 'A frase de recusa literal muda; o formato das citações passa de `[id]` para `(fonte: id)`', 'Alterar as guardas no mesmo PR; evals completas; canário'],
          ['Acrescenta ou muda um comportamento', 'MINOR', 'Nova condição de escalamento; regra sobre cupões expirados', 'Evals com gate por intenção; caso novo no conjunto dourado'],
          ['Não devia mudar comportamento', 'PATCH', 'Gralha, reordenar frases sem mudar o sentido', 'Evals na mesma — «não devia» é uma hipótese, e mudar texto parte a cache'],
        ],
        caption: 'SemVer aplicado a prompts. A versão diz ao revisor e aos painéis que tipo de risco a mudança traz; as evals dizem se o risco se materializou.',
      },
      {
        type: 'code',
        lang: 'diff',
        caption: 'O PR que levou o prompt de 1.3.0 a 1.4.0, como o revisor o vê. O relatório de evals vai anexado pelo CI (módulo 28).',
        code: `--- a/laboratorio/prompts/sistema.md
+++ b/laboratorio/prompts/sistema.md
@@ -1,5 +1,5 @@
 ---
 nome: sistema
-versao: 1.3.0
-actualizado: 2026-08-28
+versao: 1.4.0
+actualizado: 2026-09-15
 escalao: medio
@@ -18 +18 @@
-- Se o contexto não tiver a resposta, diz que não sabes.
+- Se o contexto não tiver a resposta, diz exactamente: «Não encontrei essa informação nas nossas políticas.» e oferece passar a conversa a um colega. Não adivinhes.`,
      },
      {
        type: 'steps',
        items: [
          { title: 'Hipótese e caso de teste', text: 'Uma conversa real que correu mal passa a caso no conjunto dourado (anonimizada), com o comportamento esperado. Sem caso, não há mudança de prompt.' },
          { title: 'Mudança num ramo curto', text: 'Edita `prompts/sistema.md`, sobe a versão, corre as evals locais com o modelo real do escalão (as do simulado não medem prompts).' },
          { title: 'PR com relatório', text: 'O CI corre o conjunto dourado e compara com a versão em produção por intenção, com intervalo de confiança; o gate bloqueia regressões (adr-0018).' },
          { title: 'Canário', text: '10% das conversas com a versão nova durante 24 h; comparar feedback, escaladas, taxa de recusa e custo por conversa por etiqueta de prompt.' },
          { title: 'Promover ou reverter', text: 'Reverter é um `git revert` e um deploy; a etiqueta antiga continua nos traços, por isso a comparação fica feita.' },
        ],
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Registo de prompts ou repositório?',
        text:
          'Ferramentas como o Langfuse têm gestão de prompts: o prompt vive num serviço, com versões e etiquetas, e muda sem deploy. Ganha-se velocidade para quem não programa; perde-se o PR, o gate de evals e a ligação entre a versão do prompt e a versão do código que o lê (um prompt que muda o formato das citações parte as guardas). O «Balcão» decidiu pelo repositório (adr-0023); se usares um registo, exige que cada versão publicada tenha passado pelas mesmas evals e que a etiqueta vá para o traço.',
      },
      { type: 'adr', ref: 'adr-0023' },
      {
        type: 'callout',
        tone: 'info',
        title: 'A mesma disciplina para o resto do contexto',
        text:
          'Os esquemas de ferramentas, os exemplos few-shot, a frase de recusa e o template do contexto RAG também são prompt. Vivem no repositório, mudam por PR, e a sua versão (ou o SHA do commit) vai para o traço. Um prompt de sistema versionado com esquemas que mudam sem controlo tem metade da reprodutibilidade.',
      },
      {
        type: 'refs',
        items: [
          { label: 'Semantic Versioning 2.0.0', url: 'https://semver.org/' },
          { label: 'Langfuse — gestão de prompts', url: 'https://langfuse.com/docs/prompt-management/overview' },
          { label: 'Git — git bisect', url: 'https://git-scm.com/docs/git-bisect' },
        ],
      },
    ],
  },
];
