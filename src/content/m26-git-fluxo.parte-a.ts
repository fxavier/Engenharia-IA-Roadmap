import type { Exercise, Lab, Question, Section, UseCase } from '../types';

export const seccoesGitB: Section[] = [
  /* ============================================================ 4 */
  {
    id: 'artefactos',
    title: 'Prompts, conjuntos dourados, notebooks e ficheiros grandes',
    blocks: [
      {
        type: 'p',
        text:
          'Um prompt é código que o modelo executa, e por isso vive no repositório, ao lado do código que o carrega e das perguntas que o avaliam. O laboratório guarda-os em `prompts/*.md` com um cabeçalho YAML: nome, versão SemVer, data, escalão de modelo, dono e revisor. `carregar_prompt` recusa um ficheiro sem versão, e a etiqueta `sistema@1.4.0` segue para o traço e para o relatório de avaliação. A alternativa — um prompt editável numa plataforma de gestão de prompts — foi rejeitada no adr-0023 porque separa o prompt das evals e deixa-o chegar a produção sem gate.',
      },
      { type: 'file', ref: 'prompts/sistema.md' },
      {
        type: 'code',
        lang: 'markdown',
        caption: 'O cabeçalho do prompt de sistema do laboratório. A versão é lida no arranque e recusada se faltar.',
        code: `---
nome: sistema
versao: 1.4.0
actualizado: 2026-09-15
escalao: medio
dono: engenharia-de-ia
revisto_por: suporte-ao-cliente
---
# Prompt de sistema do «Balcão»

És o assistente de suporte ao cliente do Chega, um serviço de entregas ao domicílio
em Maputo e Matola (restaurantes, mercearias e farmácias). ...`,
      },
      {
        type: 'p',
        text:
          'O conjunto dourado é tratado da mesma forma: `dados/dourado.jsonl`, uma pergunta por linha, com id estável. JSON Lines não é um detalhe: um diff de uma pergunta nova é uma linha nova, a revisão é legível no PR, e dois PRs que acrescentam perguntas diferentes raramente entram em conflito. Um ficheiro JSON único com um array de 240 objectos, pelo contrário, gera diffs ilegíveis e conflitos em cada vírgula. A regra de ouro: nunca mudes a resposta esperada de uma pergunta no mesmo PR que muda o prompt que a faz passar, sem o dizer explicitamente no corpo do commit — é assim que um gate deixa de ser gate.',
      },
      {
        type: 'trace',
        trace: {
          id: 'tr-git-fluxo-01',
          title: 'Um turno atribuível a um commit',
          brief:
            'Os atributos que ligam uma resposta em produção ao commit, ao prompt e ao conjunto dourado com que foi avaliada. É o que torna `git bisect` e o rollback possíveis.',
          spans: [
            { id: 't1', name: 'POST /v1/conversas/{conversa_id}/mensagens', kind: 'pedido', ms: 4390, status: 'ok', attrs: [['service.version', '3f9c2e1'], ['balcao.prompt.versao', 'sistema@1.4.0'], ['balcao.dourado.sha256', '9b1e…c07a']], detail: '`service.version` é o SHA da imagem, que é o SHA do commit (módulo 28).' },
            { id: 't2', parent: 't1', name: 'chat classificar', kind: 'llm', ms: 351, tokensIn: 612, tokensOut: 3, status: 'ok', attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.request.model', 'pequeno'], ['balcao.prompt.versao', 'classificar@1.1.0']] },
            { id: 't3', parent: 't1', name: 'pesquisa_hibrida', kind: 'retriever', ms: 44, status: 'ok', attrs: [['balcao.indice.versao', 'nomic-embed-text@768']] },
            { id: 't4', parent: 't1', name: 'chat responder_rag', kind: 'llm', ms: 3702, tokensIn: 5190, tokensOut: 176, status: 'ok', attrs: [['gen_ai.operation.name', 'chat'], ['gen_ai.request.model', 'medio'], ['gen_ai.usage.input_tokens', '5190'], ['gen_ai.usage.output_tokens', '176'], ['balcao.prompt.versao', 'sistema@1.4.0']] },
          ],
          note: 'Com estes quatro atributos, «esta resposta está errada» transforma-se em «o commit 3f9c2e1, com o prompt 1.4.0, avaliado contra o dourado 9b1e…». O resto é Git.',
        },
      },
      {
        type: 'h',
        text: 'Notebooks: úteis para explorar, péssimos para rever',
      },
      {
        type: 'p',
        text:
          'Um `.ipynb` é JSON com o código, os outputs e metadados de execução. O diff de um notebook onde mudou uma linha é uma parede de base64 de gráficos, e os outputs são o sítio onde a PII entra no repositório sem ninguém dar por isso: uma célula que imprime cinco conversas reais de clientes fica no histórico para sempre. As três regras do «Balcão»: outputs removidos antes do commit (`nbstripout` como hook de pre-commit), código que interessa promovido a módulo em `src/balcao/` com testes, e nenhum notebook lido por CI ou por produção.',
      },
      {
        type: 'table',
        head: ['O quê', 'Tamanho', 'Onde vive', 'Porquê'],
        rows: [
          ['Prompts, conjunto dourado, red team', 'KB', 'Git, texto', 'Revistos em PR, versionados com o código que os usa'],
          ['Corpus de amostra do laboratório (40 documentos)', 'KB', 'Git (`corpus.py`)', 'Os testes e o tutorial precisam dele offline'],
          ['Conversas anotadas para calibrar o juiz', '10–100 MB', 'DVC, com remoto em armazenamento de objectos', 'Versão por hash no Git, conteúdo fora; acesso controlado (têm dados pessoais mascarados)'],
          ['Imagens e PDFs de políticas originais', '100 MB+', 'Armazenamento de objectos da fonte, referenciado por URI', 'A fonte de verdade é o sistema do dono, não o repositório'],
          ['Pesos de modelos locais (Ollama)', 'GB', 'Registo do Ollama / volume', 'Nunca no Git; a versão fixa-se pelo nome e digest do modelo'],
          ['Binários pequenos e estáveis (logótipos, fixtures)', '< 5 MB', 'Git LFS, se forem muitos', 'LFS resolve ficheiros grandes, não versionamento de dados'],
        ],
        caption: 'O hook `check-added-large-files` (500 KB no laboratório) é o que impede a primeira linha errada desta tabela.',
      },
      {
        type: 'decision',
        tree: {
          id: 'dt-git-fluxo-01',
          title: 'Este ficheiro vai para o Git, para o LFS, para o DVC ou para fora?',
          start: 'texto',
          nodes: [
            {
              id: 'texto',
              question: 'É texto que alguém vai rever linha a linha num PR?',
              options: [
                { label: 'Sim', next: 'git' },
                { label: 'Não, é binário ou grande', next: 'dados' },
              ],
            },
            {
              id: 'dados',
              question: 'É um conjunto de dados cuja versão tem de estar ligada a um commit (para reproduzir uma avaliação)?',
              options: [
                { label: 'Sim', next: 'pii' },
                { label: 'Não', next: 'dono' },
              ],
            },
            {
              id: 'pii',
              question: 'Tem dados pessoais, mesmo mascarados?',
              options: [
                { label: 'Sim', next: 'dvc' },
                { label: 'Não, e é pequeno (< 50 MB)', next: 'lfs' },
              ],
            },
            {
              id: 'dono',
              question: 'Tem um sistema dono (CMS, armazenamento da fonte, registo de modelos)?',
              options: [
                { label: 'Sim', next: 'fora' },
                { label: 'Não', next: 'lfs' },
              ],
            },
            { id: 'git', answer: 'Git, em texto (Markdown, JSONL, YAML).', detail: 'Prompts, conjunto dourado, esquemas, configuração.' },
            { id: 'dvc', answer: 'DVC: o `.dvc` com o hash no Git; o conteúdo num remoto com controlo de acesso e retenção.', detail: 'O acesso ao remoto é auditável e revogável; o histórico do Git não o é.' },
            { id: 'lfs', answer: 'Git LFS.', detail: 'Apontadores no Git, conteúdo no servidor LFS. Conta com quotas de armazenamento e largura de banda do fornecedor.' },
            { id: 'fora', answer: 'Fora do repositório, referenciado por URI e versão.', detail: 'Pesos de modelos e documentos originais têm donos próprios.' },
          ],
        },
      },
      {
        type: 'refs',
        items: [
          { label: 'Git LFS', url: 'https://github.com/git-lfs/git-lfs' },
          { label: 'nbstripout', url: 'https://github.com/kynan/nbstripout' },
          { label: 'DVC', url: 'https://github.com/iterative/dvc' },
        ],
      },
    ],
  },

  /* ============================================================ 5 */
  {
    id: 'segredos',
    title: 'Segredos e pre-commit: o histórico não esquece',
    blocks: [
      {
        type: 'p',
        text:
          'Uma chave de API do fornecedor de modelo num commit é um incidente, mesmo que o commit seguinte a apague: o objecto continua no histórico, em todos os clones, e em qualquer fork. Os scanners automáticos de repositórios públicos encontram chaves em minutos. Num sistema LLM a chave tem valor directo — alguém a gastar tokens na tua conta — e o custo aparece na factura antes de aparecer num alarme. A defesa tem três camadas: o `.gitignore` (o `.env` nunca entra), os hooks de pre-commit (antes de o commit existir), e a protecção de push do GitHub (antes de chegar ao remoto).',
      },
      { type: 'file', ref: '.gitignore' },
      { type: 'file', ref: '.pre-commit-config.yaml' },
      {
        type: 'run',
        run: {
          id: 'run-git-fluxo-02',
          title: 'O que um hook de pre-commit vê num commit',
          brief:
            'Um scanner mínimo com as mesmas ideias dos hooks reais: ficheiros proibidos, tamanho máximo, e padrões de segredo e de PII nas linhas adicionadas. Os hooks reais (gitleaks, detect-private-key) têm centenas de regras; o mecanismo é este.',
          code: String.raw`import re

# Um diff "staged" simulado: caminho -> (tamanho em KB, linhas adicionadas)
staged = {
    "prompts/sistema.md": (6, ["versao: 1.5.0", "- Oferece cupão antes de reembolso em atrasos."]),
    ".env": (1, ["ANTHROPIC_API_KEY=sk-ant-api03-Xk2v9QpLr7TzWm4N8bYc"]),
    "notebooks/analise-erros.ipynb": (2400, ['"outputs": [{"text": "Cliente 84 555 0199 pediu reembolso"}]']),
    "dados/dourado.jsonl": (31, ['{"id": "g49", "pergunta": "Cobraram-me duas vezes no M-Pesa"}']),
    "docker-compose.yml": (4, ["POSTGRES_PASSWORD: balcao"]),
}
REGRAS = [
    ("chave de fornecedor", re.compile(r"sk-(ant-)?[A-Za-z0-9-]{20,}")),
    ("chave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("telefone MZ (PII)", re.compile(r"\b8[2-7] ?\d{3} ?\d{4}\b")),
]
PROIBIDOS = [re.compile(r"(^|/)\.env(\..+)?$")]
MAX_KB = 500

bloqueios = 0
for caminho, (kb, linhas) in staged.items():
    problemas = []
    if any(p.search(caminho) for p in PROIBIDOS) and not caminho.endswith(".example"):
        problemas.append("ficheiro de segredos")
    if kb > MAX_KB:
        problemas.append(f"{kb} KB > {MAX_KB} KB")
    for nome, rx in REGRAS:
        if any(rx.search(l) for l in linhas):
            problemas.append(nome)
    bloqueios += bool(problemas)
    print(f"{'BLOQUEADO' if problemas else 'ok':<10} {caminho:<32} {', '.join(problemas)}".rstrip())
print(f"commit {'recusado' if bloqueios else 'aceite'}: {bloqueios} ficheiro(s) com problemas")`,
          expected: `ok         prompts/sistema.md
BLOQUEADO  .env                             ficheiro de segredos, chave de fornecedor
BLOQUEADO  notebooks/analise-erros.ipynb    2400 KB > 500 KB, telefone MZ (PII)
ok         dados/dourado.jsonl
ok         docker-compose.yml
commit recusado: 2 ficheiro(s) com problemas`,
        },
      },
      {
        type: 'p',
        text:
          'Repara no que passou: `POSTGRES_PASSWORD: balcao` no `docker-compose.yml`. É uma palavra-passe de laboratório, só local, e o ficheiro di-lo em comentário; um scanner que a bloqueasse seria desligado na primeira semana. Os scanners vivem de um equilíbrio entre falsos positivos e falsos negativos, como qualquer classificador — e a resposta a um falso positivo é uma excepção explícita e revista (`# gitleaks:allow`, lista de permissões), não desligar o hook.',
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'O `.pre-commit-config.yaml` do laboratório, com dois hooks a mais para uma equipa com notebooks: gitleaks e nbstripout.',
        code: `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: check-yaml
      - id: check-toml
      - id: check-merge-conflict
      - id: check-added-large-files
        args: ["--maxkb=500"]
      - id: detect-private-key

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.16.8
    hooks:
      - id: ruff-check
        args: ["--fix"]
      - id: ruff-format

  # Segredos com regras por fornecedor (chaves de API, tokens, URLs com credenciais)
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks

  # Outputs de notebooks fora do commit: é por lá que a PII entra
  - repo: https://github.com/kynan/nbstripout
    rev: 0.9.1
    hooks:
      - id: nbstripout`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'Apagar a chave no commit seguinte não resolve nada',
        text:
          'O reflexo de quem vê a chave no PR é `git rm --cached .env`, commit, push. A chave continua no commit anterior, no remoto, e em todos os clones e forks. A ordem certa é a inversa da intuição: primeiro **revogar** a chave no fornecedor (é a única acção que acaba com o risco), depois criar uma nova no cofre, e só então limpar o histórico com `git filter-repo` e forçar o push — sabendo que clones e forks existentes continuam a tê-la. A limpeza do histórico é higiene; a revogação é a correcção.',
      },
      {
        type: 'steps',
        items: [
          { title: 'Revogar', text: 'Na consola do fornecedor, revoga a chave exposta. Minutos contam: os scanners públicos são rápidos.' },
          { title: 'Substituir', text: 'Nova chave no cofre de segredos; o CI e o deploy lêem-na de lá (módulo 28: OIDC onde for possível, para nem haver chave longa).' },
          { title: 'Medir o dano', text: 'Consumo da chave no painel do fornecedor desde o commit: pedidos, tokens, origem. É um incidente de segurança com relatório.' },
          { title: 'Limpar o histórico', text: '`git filter-repo --invert-paths --path .env`, push forçado, e aviso à equipa para voltar a clonar.' },
          { title: 'Fechar a porta', text: 'Hook de pre-commit, push protection do GitHub activa, e um teste de CI que falha se `.env` aparecer no índice.' },
        ],
      },
      {
        type: 'refs',
        items: [
          { label: 'GitHub — About push protection', url: 'https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection' },
          { label: 'GitHub — Removing sensitive data from a repository', url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository' },
          { label: 'gitleaks', url: 'https://github.com/gitleaks/gitleaks' },
          { label: 'pre-commit-hooks', url: 'https://github.com/pre-commit/pre-commit-hooks' },
        ],
      },
    ],
  },

  /* ============================================================ 6 */
  {
    id: 'bisect',
    title: '`git bisect` para regressões de qualidade',
    blocks: [
      {
        type: 'p',
        text:
          'Segunda-feira: a avaliação nocturna mostra `recall_at_5` a cair de 0,95 para 0,87 desde a última release, e entre as duas há 15 commits na main — prompts, limiares, uma refactorização da pesquisa, dependências. Ler 15 diffs à procura do culpado é lento e enviesado (toda a gente suspeita do prompt). O `git bisect` faz pesquisa binária sobre o histórico: marcas um commit bom e um mau, e o Git leva-te ao meio até isolar o primeiro commit mau em ⌈log2(15)⌉ = 4 passos. É uma das consequências boas do adr-0023: com prompts e dados versionados no mesmo repositório, uma regressão de qualidade bisecta-se como um bug.',
      },
      {
        type: 'run',
        run: {
          id: 'run-git-fluxo-03',
          title: 'Uma pesquisa binária sobre 16 commits, com a métrica real do `balcao`',
          brief:
            'Cada «commit» fixa a configuração de recuperação em vigor. A partir de c09 alguém trocou a pesquisa híbrida com re-ranking por BM25. O bisect chama `avaliar_recuperacao` sobre as 30 perguntas douradas do runtime didáctico e decide bom ou mau pelo gate de recall@5 ≥ 0,90.',
          code: String.raw`import balcao as b

# 16 commits entre a última release boa (c00) e a main de hoje (c15).
# Cada commit fixa a configuração de recuperação que estava em vigor nesse ponto.
historico = [("rerank", 5)] * 9 + [("bm25", 5)] * 7    # em c09 alguém "simplificou" a pesquisa
cache = {}

def recall_no_commit(i: int) -> float:
    cfg = historico[i]
    if cfg not in cache:                                # evals custam: nunca corras duas vezes a mesma
        cache[cfg] = b.avaliar_recuperacao(cfg[0], cfg[1])["recall"]
    return cache[cfg]

GATE = 0.90
bom, mau = 0, len(historico) - 1                        # git bisect start c15 c00
passos = 0
while mau - bom > 1:
    meio = (bom + mau) // 2
    r = recall_no_commit(meio)
    passos += 1
    veredicto = "good" if r >= GATE else "bad"
    print(f"passo {passos}: c{meio:02d} recall@5={r:.3f} -> git bisect {veredicto}")
    if r >= GATE:
        bom = meio
    else:
        mau = meio
print(f"primeiro commit mau: c{mau:02d} ({historico[mau][0]}); {passos} avaliações em vez de {len(historico) - 1}")`,
          expected: `passo 1: c07 recall@5=0.950 -> git bisect good
passo 2: c11 recall@5=0.867 -> git bisect bad
passo 3: c09 recall@5=0.867 -> git bisect bad
passo 4: c08 recall@5=0.950 -> git bisect good
primeiro commit mau: c09 (bm25); 4 avaliações em vez de 15`,
        },
      },
      {
        type: 'p',
        text:
          'Na prática não se marca cada passo à mão: `git bisect run <script>` corre o script em cada commit e lê o código de saída. **0** quer dizer bom; **1 a 127, excepto 125**, mau; **125** quer dizer «não consigo testar este commit» (não compila, dependências partidas) e o Git salta-o; acima de 127 aborta o bisect. O script tem de ser determinista e de medir só a coisa que regrediu: no «Balcão», o `balcao.avaliacao.correr` com o modelo simulado e um limiar próprio.',
      },
      {
        type: 'code',
        lang: 'bash',
        caption: '`scripts/bisect-recall.sh`: preparar o ambiente do commit, saltar o que não se consegue testar, e decidir pelo gate.',
        code: `#!/usr/bin/env bash
# Uso: git bisect start <mau> <bom> && git bisect run scripts/bisect-recall.sh
set -uo pipefail

# Cada commit tem o seu uv.lock: instala exactamente essas dependências.
uv sync --frozen --quiet || exit 125          # não instala? não é testável: salta

# Só a métrica que regrediu, com o modelo simulado (determinista, sem rede, sem custo).
BALCAO_MODELO_FORNECEDOR=simulado \\
  uv run python -m balcao.avaliacao.correr --conjunto dourado --gate \\
    --min-recall 0.90 --saida /tmp/bisect > /dev/null 2>&1
estado=$?

case $estado in
  0) exit 0 ;;          # gate passa: bom
  1) exit 1 ;;          # gate falha: mau
  *) exit 125 ;;        # outro erro (import, dados): não dá para julgar este commit
esac`,
      },
      {
        type: 'code',
        lang: 'bash',
        caption: 'A sessão completa. No fim, o Git mostra o primeiro commit mau; `git bisect reset` volta ao branch de onde saíste.',
        code: `git bisect start main v1.8.0                 # mau primeiro, bom depois
git bisect run scripts/bisect-recall.sh
# ...
# d31b7e9 is the first bad commit
# refactor(recuperacao): simplificar pesquisa para BM25 puro
git bisect log > bisect-recall.log           # para anexar ao incidente
git bisect reset`,
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Bisect com um modelo real é bisect com ruído',
        text:
          'Com o modelo real e temperatura acima de zero, o mesmo commit pode passar e falhar em corridas diferentes; uma decisão errada a meio manda o bisect para o lado errado e ele encontra, com toda a confiança, um commit inocente. Três defesas: bisectar com o modelo simulado sempre que a regressão é de recuperação ou de fluxo; com o modelo real, correr cada commit várias vezes e decidir pelo intervalo de confiança (módulo 20), com uma margem entre «bom» e «mau»; e usar `exit 125` para os commits ambíguos em vez de forçar um veredicto.',
      },
      {
        type: 'table',
        head: ['Regressão', 'O que o script mede', 'Custo por passo', 'Determinista?'],
        rows: [
          ['Recall caiu', '`avaliar` com `--conjunto dourado`, só recuperação', '≈ 1 s (simulado)', 'Sim'],
          ['Tool-call accuracy caiu', 'Casos de ferramenta com o modelo simulado', 'segundos', 'Sim'],
          ['Faithfulness caiu com o modelo real', 'Subconjunto de 40 perguntas, 3 corridas, IC 95%', 'minutos e tokens pagos', 'Não: usa margem e 125'],
          ['TTFT subiu', 'Teste de carga local de 60 s, p95', 'minutos', 'Quase: repete e usa margem'],
        ],
        caption: 'Quanto mais barato e determinista o passo, mais fácil o bisect. É um argumento a favor de ter um modelo simulado no repositório.',
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'Bisect só funciona se cada commit da main for testável',
        text:
          'Commits intermédios que não compilam, que mudam o prompt sem mudar o código que o lê, ou que só passam com o commit seguinte, transformam o bisect numa sequência de `125`. É mais uma razão para o squash merge: cada commit da main é um PR inteiro que passou o gate, com o `uv.lock` coerente com o código.',
      },
      {
        type: 'refs',
        items: [
          { label: 'git-bisect — documentação', url: 'https://git-scm.com/docs/git-bisect' },
          { label: 'Pro Git — Debugging with Git (bisect)', url: 'https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git' },
        ],
      },
    ],
  },
];

/* ================================================================= quiz */

export const quizM26: Question[] = [
  {
    id: 'q-git-fluxo-01',
    topic: 'git',
    prompt: 'Rebaseaste o teu branch `feat/limiar-recusa`, que o Nelson já tinha puxado e sobre o qual fez dois commits. Fazes `git push --force`. O que acontece?',
    options: [
      'Nada de mal: o rebase preserva os hashes dos commits.',
      'O remoto passa a ter os teus commits novos; se o Nelson tinha empurrado os dele entretanto, perdem-se do remoto, e o próximo pull dele duplica commits.',
      'O Git recusa o push porque o branch foi rebaseado.',
      'O GitHub junta automaticamente as duas versões.',
    ],
    answer: [1],
    explain:
      'Rebase cria commits novos com hashes novos. `--force` substitui o ponteiro remoto sem verificar nada. `--force-with-lease` recusaria se o remoto tivesse avançado desde o teu último fetch; e a regra de base é não rebasear branches partilhados.',
  },
  {
    id: 'q-git-fluxo-02',
    topic: 'git',
    prompt: 'Porque é que um branch de três semanas com «o prompt novo» é pior num sistema LLM do que num serviço CRUD?',
    options: [
      'Porque os prompts ocupam mais espaço no Git.',
      'Porque as evals que passaram no branch foram feitas contra um conjunto dourado e um sistema que entretanto mudaram na main.',
      'Porque o merge de ficheiros Markdown é mais difícil.',
      'Porque os modelos mudam de versão em três semanas e o branch fica incompatível com a API.',
    ],
    answer: [1],
    explain:
      'O custo de um branch longo num sistema LLM não são só conflitos de texto: é divergência de avaliação. O resultado das evals no branch deixa de ser evidência sobre o comportamento depois do merge.',
  },
  {
    id: 'q-git-fluxo-03',
    topic: 'git',
    prompt: 'Que mudanças no prompt de sistema do «Balcão» justificam uma versão MAJOR?',
    options: [
      'Corrigir uma gralha.',
      'Mudar o formato das citações que a guarda de saída valida.',
      'Acrescentar a regra de oferecer cupão antes de reembolso.',
      'Deixar de chamar uma ferramenta que o grafo e as evals de trajectória esperam.',
    ],
    answer: [1, 3],
    explain:
      'MAJOR é quebra do contrato com o código e com as avaliações à volta do prompt. Uma regra nova compatível é MINOR; uma gralha é PATCH — e se uma PATCH mudar resultados no conjunto dourado, a classificação estava errada.',
  },
  {
    id: 'q-git-fluxo-04',
    topic: 'git',
    prompt: 'Um engenheiro faz commit do `.env` com a chave da API do fornecedor e, dois minutos depois, um commit que o apaga. Qual é a primeira acção certa?',
    options: [
      'Reescrever o histórico com `git filter-repo`.',
      'Revogar a chave no fornecedor.',
      'Tornar o repositório privado.',
      'Nada: o segundo commit já resolveu.',
    ],
    answer: [1],
    explain:
      'A chave continua no primeiro commit, no remoto e em todos os clones. Só a revogação acaba com o risco; a limpeza do histórico vem depois, como higiene.',
  },
  {
    id: 'q-git-fluxo-05',
    topic: 'git',
    prompt: 'No script de `git bisect run`, o que deve acontecer quando `uv sync --frozen` falha num commit antigo?',
    options: [
      'Sair com 1, para marcar o commit como mau.',
      'Sair com 125, para o Git saltar o commit.',
      'Sair com 0, para não bloquear o bisect.',
      'Sair com 255, para abortar.',
    ],
    answer: [1],
    explain:
      'Um commit que não se consegue preparar não é bom nem mau em relação à métrica. Marcá-lo como mau desvia a pesquisa para um culpado errado; 125 diz ao Git para o saltar.',
  },
  {
    id: 'q-git-fluxo-06',
    topic: 'git',
    prompt: 'Em que casos um bisect de uma regressão de qualidade dá um resultado enganador?',
    options: [
      'O script usa o modelo real com temperatura 0,7 e uma só corrida por commit.',
      'Há commits intermédios na main que não compilam e o script os marca como maus.',
      'O script usa o modelo simulado e só mede recall.',
      'A main só tem commits de squash que passaram o gate.',
    ],
    answer: [0, 1],
    explain:
      'Ruído num passo manda a pesquisa para o lado errado; marcar como mau um commit que simplesmente não se testa faz o mesmo. Um modelo simulado e uma main só com commits verdes são exactamente as condições em que o bisect funciona bem.',
  },
  {
    id: 'q-git-fluxo-07',
    topic: 'git',
    prompt: 'Onde devem viver as 3 000 conversas anotadas (com PII mascarada) que calibram o LLM-como-juiz?',
    options: [
      'Num ficheiro JSONL no repositório, como o conjunto dourado.',
      'Num remoto de DVC com controlo de acesso, com o ficheiro `.dvc` (o hash) versionado no Git.',
      'No Git LFS, porque são grandes.',
      'Num notebook, com os outputs.',
    ],
    answer: [1],
    explain:
      'O que importa é ligar a versão dos dados ao commit (o hash no Git) sem pôr o conteúdo num histórico que não se consegue apagar nem controlar por pessoa. LFS resolve tamanho, não acesso; e um notebook com outputs é o pior sítio possível.',
  },
  {
    id: 'q-git-fluxo-08',
    topic: 'git',
    prompt: 'Que propriedades ganhas com squash merge na main do «Balcão»?',
    options: [
      'Cada commit da main passou o gate de evals do CI.',
      'Um revert de uma mudança é reverter um único commit.',
      'O histórico mostra todos os commits intermédios de cada PR.',
      'Deixa de ser preciso rever o PR.',
    ],
    answer: [0, 1],
    explain:
      'Squash dá um commit por PR, e esse commit é o estado que o CI verificou. Os commits intermédios ficam no PR, não na main — é esse o custo.',
  },
  {
    id: 'q-git-fluxo-09',
    topic: 'git',
    prompt: 'Uma pessoa do suporte altera a resposta esperada de três perguntas douradas no mesmo PR em que muda o prompt, sem o dizer. Porque é que isto é perigoso?',
    options: [
      'Porque JSONL não aceita alterações de linhas existentes.',
      'Porque o gate pode passar por ter sido ajustado ao comportamento novo, e não porque o comportamento novo está certo.',
      'Porque as perguntas douradas só podem ser alteradas por engenheiros.',
      'Porque o Git não consegue fazer diff de JSONL.',
    ],
    answer: [1],
    explain:
      'Mudar o teste e o código no mesmo passo, sem justificação, é a forma mais simples de um gate deixar de medir alguma coisa. Pode ser legítimo (a política mudou), mas tem de ser explícito no commit e revisto como tal.',
  },
];

/* ============================================================ exercícios */

export const exerciciosM26: Exercise[] = [
  {
    id: 'e-git-fluxo-01',
    title: 'Quantos passos de bisect?',
    statement:
      'Entre a release boa e a main de hoje há 240 commits. Quantas avaliações, no máximo, precisa o `git bisect` para encontrar o primeiro commit mau (sem commits saltados)?',
    kind: 'input',
    accept: ['8'],
    hint: 'É ⌈log2(n)⌉ para n commits candidatos.',
    solution:
      'log2(240) ≈ 7,9, logo 8 avaliações. Com 1 s por avaliação no modelo simulado são 8 s; com 3 corridas do modelo real a 6 minutos cada, são 2,4 horas — e é por isso que se bisecta com o simulado sempre que a métrica o permite.',
    difficulty: 1,
  },
  {
    id: 'e-git-fluxo-02',
    title: 'Três PRs a partir de um pedido grande',
    statement:
      'O produto quer que o «Balcão» passe a responder também sobre o programa de fidelidade «Chega Mais Pontos»: 6 documentos novos, uma intenção nova no classificador, uma ferramenta `ler_pontos`, alterações ao prompt de sistema e 20 perguntas douradas. Parte o trabalho em PRs pequenos que possam entrar na main, cada um verde e sem expor nada incompleto ao cliente. Diz a ordem, o título Conventional Commits de cada um, e o que o protege.',
    kind: 'design',
    solution:
      '1) `test(dourado): perguntas de fidelidade marcadas como pendentes` — as 20 perguntas entram com `pendente: true`, fora do gate; documentam o alvo. 2) `feat(corpus): documentos do programa Chega Mais Pontos` — os 6 documentos com `vigente: false` até ao lançamento; a pesquisa filtra-os. 3) `feat(ferramentas): ler_pontos (só leitura)` — ferramenta com testes, ainda não listada no nó do agente. 4) `feat(prompt-classificar): intenção fidelidade` — MINOR no prompt de classificação, com as perguntas de classificação a passar. 5) `feat(prompt-sistema): responder sobre pontos` — MINOR, liga a ferramenta ao agente e tira o `pendente` das douradas: agora o gate cobre-as. 6) `feat(corpus): activar documentos de fidelidade` no dia do lançamento — um PR de uma linha, reversível. Cada PR passa o gate; nada chega ao cliente antes do 5 e 6.',
    difficulty: 3,
  },
  {
    id: 'e-git-fluxo-03',
    title: 'Revisão de um histórico',
    statement:
      'Classifica cada commit (tipo e efeito na versão do prompt de sistema) e diz qual está mal escrito e porquê: (a) «fix: ajustes»; (b) «feat(prompt-sistema): passar a tratar o cliente por tu»; (c) «chore(deps): actualizar langgraph 1.0.3 para 1.1.0»; (d) «refactor(prompt-sistema): reordenar secções do prompt».',
    kind: 'open',
    solution:
      '(a) Válido no formato, inútil no conteúdo: não diz o quê nem onde; um PATCH sem âmbito. (b) Mudar o tratamento do cliente para a segunda pessoa do singular contraria a política de tom e altera respostas avaliadas pelo juiz: é pelo menos MINOR, e provavelmente precisa de BREAKING CHANGE se as rubricas do juiz verificarem o registo. (c) Não muda o prompt, mas muda o comportamento do grafo: tem de passar as evals, e um salto de versão menor numa dependência central merece `fix` ou `feat` se mudar comportamento. (d) «refactor» num prompt é enganador: reordenar secções muda a distribuição das saídas do modelo (posição no contexto importa). Não existe refactor sem efeito num prompt; é pelo menos PATCH com evals.',
    difficulty: 2,
  },
  {
    id: 'e-git-fluxo-04',
    title: 'O incidente da chave',
    statement:
      'Escreve o runbook de 6 passos para quando o push protection do GitHub não apanhou uma chave de API do fornecedor de modelo que chegou à main há 3 horas. Inclui quem avisas, o que medes e como evitas que se repita.',
    kind: 'open',
    solution:
      '1) Revogar a chave na consola do fornecedor (quem detecta, imediatamente). 2) Criar chave nova no cofre e reiniciar os serviços que a usam; confirmar que o CI e as evals nocturnas lêem a nova. 3) Medir: consumo da chave desde o commit (pedidos, tokens, IPs de origem) e custo; abrir incidente de segurança com a plataforma e o jurídico se houver sinais de uso externo. 4) Limpar o histórico com `git filter-repo`, push forçado coordenado, e pedido à equipa para voltar a clonar; verificar forks e caches de CI. 5) Porque falhou: o formato da chave não estava nas regras? o push foi com bypass? Acrescentar a regra ao gitleaks e ao pre-commit. 6) Reduzir a superfície: o CI passa a obter credenciais por OIDC em vez de segredos longos onde o fornecedor o suporte, e as chaves de fornecedor ficam com limites de gasto.',
    difficulty: 2,
  },
];

/* ================================================================= labs */

export const labsM26: Lab[] = [
  {
    id: 'lab-git-fluxo-01',
    moduleId: 'git-fluxo',
    title: 'Um script de `git bisect run` que não mente',
    brief:
      'O script abaixo marca como mau qualquer commit onde algo corre mal — incluindo commits que nem instalam. Corrige-o: instala as dependências do commit com o lockfile, salta (125) o que não é testável, usa o modelo simulado, e converte o resultado do gate em 0 ou 1.',
    lang: 'bash',
    starter: `#!/usr/bin/env bash
set -e
pip install -e .
python -m balcao.avaliacao.correr --conjunto dourado --gate`,
    checks: [
      { id: 'frozen', label: 'Instala com uv sync --frozen', re: 'uv sync --frozen' },
      { id: 'skip', label: 'Sai com 125 quando o commit não é testável', re: 'exit 125' },
      { id: 'sim', label: 'Força o modelo simulado', re: 'BALCAO_MODELO_FORNECEDOR=simulado' },
      { id: 'gate', label: 'Corre a avaliação com --gate', re: 'balcao\\.avaliacao\\.correr[\\s\\S]*--gate' },
      { id: 'bom', label: 'Sai com 0 quando o gate passa', re: 'exit 0' },
      { id: 'pip', label: 'Não usa pip (ignora o lockfile)', re: 'pip install', forbid: true, why: 'Sem o lockfile, cada commit instala as versões de hoje: estás a testar outra coisa.' },
      { id: 'sete', label: 'Não usa set -e sem tratar os códigos', re: '^set -e\\s*$', forbid: true, why: 'Com `set -e`, qualquer falha sai com o código dessa falha — um erro de instalação vira «mau».' },
    ],
    hints: [
      '`uv sync --frozen || exit 125`: se não instala, não se julga.',
      'Guarda o código de saída da avaliação numa variável e decide com um `case`.',
      'Qualquer código que não seja 0 ou 1 da avaliação é um erro de execução, não uma regressão: 125.',
    ],
    solution: `#!/usr/bin/env bash
set -uo pipefail

uv sync --frozen --quiet || exit 125

BALCAO_MODELO_FORNECEDOR=simulado \\
  uv run python -m balcao.avaliacao.correr --conjunto dourado --gate \\
    --min-recall 0.90 --saida /tmp/bisect > /dev/null 2>&1
estado=$?

case $estado in
  0) exit 0 ;;
  1) exit 1 ;;
  *) exit 125 ;;
esac`,
    difficulty: 2,
  },
  {
    id: 'lab-git-fluxo-02',
    moduleId: 'git-fluxo',
    title: 'Versão do prompt a partir do histórico',
    brief:
      'Escreve `proxima_versao(versao, mensagens)` que aplica SemVer a partir de Conventional Commits: `!` ou rodapé `BREAKING CHANGE:` sobe MAJOR, `feat` sobe MINOR, `fix` e `perf` sobem PATCH, o resto não mexe, e mensagens fora do formato são ignoradas. Só contam commits com âmbito `prompt-sistema`. Os `assert` no fim têm de passar; a solução corre no browser.',
    lang: 'python',
    starter: String.raw`def proxima_versao(versao: str, mensagens: list[str]) -> str:
    ma, mi, pa = map(int, versao.split("."))
    for m in mensagens:
        if m.startswith("feat"):
            mi += 1
    return f"{ma}.{mi}.{pa}"


h = [
    "fix(prompt-sistema): recusar valores sem ferramenta",
    "feat(prompt-classificar): intenção fidelidade",
    "feat(prompt-sistema): cupão antes de reembolso",
    "docs(prompt-sistema): comentar secção de tom",
]
assert proxima_versao("1.4.0", h) == "1.5.0"
assert proxima_versao("1.4.0", h[:1]) == "1.4.1"
assert proxima_versao("1.4.0", ["feat(prompt-sistema)!: citações [id#secção]"]) == "2.0.0"
assert proxima_versao("1.4.0", ["fix(prompt-sistema): x\n\nBREAKING CHANGE: y"]) == "2.0.0"
assert proxima_versao("1.4.0", ["Actualizei o prompt", h[1]]) == "1.4.0"
print("ok")`,
    checks: [
      { id: 're', label: 'Usa uma expressão regular para o cabeçalho', re: 're\\.(compile|match|fullmatch)\\(' },
      { id: 'ambito', label: 'Filtra pelo âmbito prompt-sistema', re: 'prompt-sistema' },
      { id: 'breaking', label: 'Trata o rodapé BREAKING CHANGE', re: 'BREAKING CHANGE' },
      { id: 'reset', label: 'Um MINOR repõe o PATCH a zero', re: '\\.0"|,\\s*0\\s*\\)|pa\\s*=\\s*0' },
      { id: 'startswith', label: 'Não decide por startswith (apanha «feature:» e âmbitos errados)', re: 'startswith\\(\\s*"feat"', forbid: true },
    ],
    hints: [
      'Um padrão como `^(?P<tipo>[a-z]+)(?:\\((?P<ambito>[a-z0-9-]+)\\))?(?P<quebra>!)?: ` separa tipo, âmbito e quebra.',
      'Calcula o maior salto (major > minor > patch) e só depois aplica-o uma vez.',
      'Um salto MINOR dá `ma.mi+1.0`; um MAJOR dá `ma+1.0.0`.',
    ],
    solution: String.raw`import re

RE = re.compile(r"^(?P<tipo>[a-z]+)(?:\((?P<ambito>[a-z0-9-]+)\))?(?P<quebra>!)?: .+")
ORDEM = {"major": 3, "minor": 2, "patch": 1}


def proxima_versao(versao: str, mensagens: list[str]) -> str:
    ma, mi, pa = map(int, versao.split("."))
    salto = 0
    for msg in mensagens:
        cab, _, corpo = msg.partition("\n")
        m = RE.match(cab)
        if not m or m["ambito"] != "prompt-sistema":
            continue
        if m["quebra"] or "BREAKING CHANGE:" in corpo:
            salto = max(salto, ORDEM["major"])
        elif m["tipo"] == "feat":
            salto = max(salto, ORDEM["minor"])
        elif m["tipo"] in ("fix", "perf"):
            salto = max(salto, ORDEM["patch"])
    if salto == 3:
        return f"{ma + 1}.0.0"
    if salto == 2:
        return f"{ma}.{mi + 1}.0"
    if salto == 1:
        return f"{ma}.{mi}.{pa + 1}"
    return versao


h = [
    "fix(prompt-sistema): recusar valores sem ferramenta",
    "feat(prompt-classificar): intenção fidelidade",
    "feat(prompt-sistema): cupão antes de reembolso",
    "docs(prompt-sistema): comentar secção de tom",
]
assert proxima_versao("1.4.0", h) == "1.5.0"
assert proxima_versao("1.4.0", h[:1]) == "1.4.1"
assert proxima_versao("1.4.0", ["feat(prompt-sistema)!: citações [id#secção]"]) == "2.0.0"
assert proxima_versao("1.4.0", ["fix(prompt-sistema): x\n\nBREAKING CHANGE: y"]) == "2.0.0"
assert proxima_versao("1.4.0", ["Actualizei o prompt", h[1]]) == "1.4.0"
print("ok")`,
    difficulty: 2,
    executavel: true,
  },
  {
    id: 'lab-git-fluxo-03',
    moduleId: 'git-fluxo',
    title: 'Pre-commit para uma equipa com notebooks',
    brief:
      'A equipa começou a usar notebooks para análise de erros e alguém já fez commit de um `.env`. Completa o `.pre-commit-config.yaml`: segredos com gitleaks, outputs de notebooks removidos com nbstripout, limite de ficheiros grandes a 500 KB e detecção de chaves privadas.',
    lang: 'yaml',
    starter: `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer`,
    checks: [
      { id: 'grandes', label: 'check-added-large-files com --maxkb=500', re: 'id:\\s*check-added-large-files[\\s\\S]*--maxkb=500' },
      { id: 'chave', label: 'detect-private-key', re: 'id:\\s*detect-private-key' },
      { id: 'gitleaks', label: 'Hook do gitleaks', re: 'repo:\\s*https://github\\.com/gitleaks/gitleaks[\\s\\S]*id:\\s*gitleaks' },
      { id: 'nb', label: 'Hook do nbstripout', re: 'repo:\\s*https://github\\.com/kynan/nbstripout[\\s\\S]*id:\\s*nbstripout' },
      { id: 'rev', label: 'Todas as fontes com rev fixada', re: 'repo:[^\\n]*\\n(?!\\s*rev:)', forbid: true, why: 'Um hook sem `rev` fixada muda de comportamento sem PR.' },
    ],
    hints: [
      'Cada `repo` precisa de `rev` e de uma lista de `hooks` com `id`.',
      'Os argumentos de um hook vão em `args: ["--maxkb=500"]`.',
      '`pre-commit autoupdate` actualiza as `rev` num PR próprio.',
    ],
    solution: `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: check-added-large-files
        args: ["--maxkb=500"]
      - id: detect-private-key

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks

  - repo: https://github.com/kynan/nbstripout
    rev: 0.9.1
    hooks:
      - id: nbstripout`,
    difficulty: 1,
  },
];

/* ============================================================ casos de uso */

export const casosM26: UseCase[] = [
  {
    id: 'uc-git-fluxo-01',
    title: 'Um banco móvel que precisava de dizer ao regulador que prompt respondeu a um cliente',
    area: 'Serviços financeiros · Moçambique',
    level: 2,
    scenario:
      'Um banco móvel em Maputo usa um assistente para responder a dúvidas sobre transferências, limites e comissões. Uma cliente reclama ao regulador que o assistente lhe disse, em Março, que uma transferência internacional não tinha comissão. O regulador pede: a resposta exacta, as instruções que o sistema seguia nessa data, e a prova de que foram testadas. Os prompts viviam numa plataforma de gestão de prompts, editados pelo marketing, sem histórico ligado aos deploys.',
    requirements: [
      'Para qualquer resposta dos últimos 12 meses, identificar a versão do prompt, do modelo e do código.',
      'Mostrar a avaliação que aprovou essa versão antes de entrar em produção.',
      'O marketing continua a poder propor mudanças de tom sem esperar semanas.',
    ],
    constraints: [
      'Retenção de 12 meses para registos de interacções com clientes (requisito do banco).',
      'Equipa de IA de três pessoas.',
    ],
    approach: [
      { title: 'Prompts no repositório com SemVer', text: 'Os prompts passaram para `prompts/*.md` com cabeçalho de versão. O marketing edita pelo editor web do GitHub e abre um PR; `CODEOWNERS` exige compliance em `prompts/produtos/`.' },
      { title: 'Um traço, três versões', text: 'Cada resposta regista o SHA da imagem, a versão do prompt e o hash do conjunto dourado com que foi avaliada; os traços ficam 12 meses.' },
      { title: 'Relatório de avaliação por commit', text: 'O CI guarda o relatório de avaliação como artefacto ligado ao SHA; a retenção dos artefactos foi alargada e copiada para armazenamento do banco.' },
      { title: 'Bisect para reclamações', text: 'Quando uma reclamação revela um erro, uma pergunta dourada nova reproduz o caso e o `git bisect run` diz em que commit o comportamento apareceu.' },
    ],
    diagram: {
      title: 'Da reclamação ao commit',
      caption: 'O traço dá o SHA; o SHA dá o prompt, o código e o relatório de avaliação que o aprovou.',
      cols: 5,
      rows: 2,
      zones: [
        { id: 'prod', label: 'Produção', col: 0, row: 0, colSpan: 2, rowSpan: 2, tone: 'service' },
        { id: 'repo', label: 'Repositório e CI', col: 2, row: 0, colSpan: 3, rowSpan: 2, tone: 'ci' },
      ],
      nodes: [
        { id: 'rec', label: 'Reclamação', sub: 'conversa de 14 de Março', col: 0, row: 0, kind: 'user' },
        { id: 'traco', label: 'Traço', sub: 'sha, prompt@versão, dourado', col: 1, row: 0, kind: 'data' },
        { id: 'commit', label: 'Commit', sub: 'git show <sha>:prompts/…', col: 2, row: 0, kind: 'data' },
        { id: 'pr', label: 'PR', sub: 'revisão de compliance', col: 3, row: 0, kind: 'note' },
        { id: 'rel', label: 'Relatório de avaliação', sub: 'artefacto do CI', col: 4, row: 0, kind: 'data' },
        { id: 'nova', label: 'Pergunta dourada nova', sub: 'reproduz o caso', col: 2, row: 1, kind: 'note' },
        { id: 'bisect', label: 'git bisect run', sub: 'primeiro commit mau', col: 3, row: 1, kind: 'service' },
      ],
      edges: [
        { from: 'rec', to: 'traco' },
        { from: 'traco', to: 'commit', label: 'service.version' },
        { from: 'commit', to: 'pr' },
        { from: 'pr', to: 'rel' },
        { from: 'rec', to: 'nova', style: 'dashed' },
        { from: 'nova', to: 'bisect' },
        { from: 'bisect', to: 'commit', style: 'dashed' },
      ],
    },
    solution:
      'Prompts versionados como código no mesmo repositório que as evals, PRs pequenos com revisão de compliance, SHA e versões em cada traço, e relatórios de avaliação guardados por commit. A resposta ao regulador passou de «não sabemos» para um conjunto de três ligações.',
    tools: [
      { name: 'Git + GitHub', role: 'Prompts, dados de avaliação e código no mesmo histórico' },
      { name: 'CODEOWNERS', role: 'Revisão obrigatória por compliance em prompts de produtos' },
      { name: 'git bisect', role: 'Encontrar o commit que introduziu um comportamento' },
    ],
    rejected: [
      { option: 'Manter a plataforma de prompts e exportar um histórico mensal', why: 'O histórico não se ligava a deploys nem a avaliações: sabia-se o texto, não o que estava em produção nem se tinha sido testado.' },
      { option: 'Congelar os prompts e só mudar por release trimestral', why: 'O marketing contornaria com mudanças no texto das FAQ; o problema mudava de sítio.' },
    ],
    costNote:
      'O custo principal foi a retenção de 12 meses de traços e relatórios: armazenamento pequeno, mas uma política de acesso nova. O ganho foi responder ao regulador em horas em vez de semanas.',
    takeaways: [
      'Se o prompt não está no mesmo histórico que o deploy, não se consegue provar o que respondeu.',
      'O SHA no traço é a chave que abre tudo o resto.',
      'Um PR pelo editor web é atrito suficientemente baixo para equipas não técnicas.',
    ],
    refs: [
      { label: 'GitHub — Editing files', url: 'https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files' },
      { label: 'Semantic Versioning', url: 'https://semver.org/spec/v2.0.0.html' },
    ],
  },
];
