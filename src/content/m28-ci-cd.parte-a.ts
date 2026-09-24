import type { Section } from '../types';

export const seccoesCiB: Section[] = [
  /* ============================================================ 4 */
  {
    id: 'imagem',
    title: 'Imagem imutável por SHA, SBOM e proveniência',
    blocks: [
      {
        type: 'p',
        text:
          'Quando os três jobs passam num push para a main, o job `imagem` constrói a imagem do módulo 27 e publica-a no GitHub Container Registry com uma única etiqueta: o SHA completo do commit. Essa etiqueta nunca é reutilizada, e é ela que vai no deploy, no traço (`service.version`) e no relatório de avaliação. A pergunta «o que está em produção?» passa a ter uma resposta que é um commit, e o rollback passa a ser «pôr a correr o SHA anterior», uma imagem que já existe e já foi testada.',
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'O job da imagem do laboratório, com as permissões que precisa e só essas. O `GITHUB_TOKEN` chega para publicar no GHCR do próprio repositório.',
        code: `  imagem:
    name: Imagem (GHCR)
    needs: [lint, testes, evals]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v5
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - name: Etiquetas
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository }}
          tags: |
            type=sha,format=long
      - name: Construir e publicar
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true`,
      },
      {
        type: 'p',
        text:
          'Três detalhes fazem este job valer o que custa. `cache-from`/`cache-to` com `type=gha` guardam as camadas no cache do GitHub Actions: com o Dockerfile bem ordenado, um merge que só muda o prompt reconstrói só as camadas de topo. `provenance: true` gera uma atestação de proveniência (que workflow, que commit, que runner produziram a imagem). E o `metadata-action` com `type=sha,format=long` dá a etiqueta `sha-<40 caracteres>` e as `labels` OCI com a origem e a revisão.',
      },
      {
        type: 'table',
        head: ['Etiqueta', 'Muda?', 'Serve para', 'No deploy?'],
        rows: [
          ['`sha-3f9c2e1…` (40 caracteres)', 'Nunca', 'Identificar exactamente o commit', 'Sim — e melhor ainda, pelo digest `@sha256:…`'],
          ['`v1.8.0` (SemVer, de uma tag Git)', 'Não deveria', 'Humanos, changelog, comunicação', 'Pode, se apontar para o mesmo digest'],
          ['`main`', 'A cada merge', 'Ambientes de desenvolvimento', 'Não'],
          ['`latest`', 'A cada push', 'Nada que precise de ser reproduzido', 'Nunca'],
        ],
        caption: 'Uma etiqueta é um ponteiro móvel; o digest é o conteúdo. O deploy grava o digest que resolveu.',
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'Extensão para a imagem de produção: SBOM no build e uma atestação assinada publicada no registo, verificável antes do deploy.',
        code: `    permissions:
      contents: read
      packages: write
      id-token: write           # para assinar a atestação com a identidade do workflow
      attestations: write
    steps:
      # ... checkout, buildx, login, metadata como acima
      - name: Construir e publicar
        id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          sbom: true              # SBOM como atestação da imagem
          provenance: mode=max
      - name: Atestar a imagem
        uses: actions/attest@v4
        with:
          subject-name: ghcr.io/\${{ github.repository }}
          subject-digest: \${{ steps.push.outputs.digest }}
          push-to-registry: true`,
      },
      {
        type: 'callout',
        tone: 'prod',
        title: 'O deploy grava o digest, não a etiqueta',
        text:
          'Mesmo uma etiqueta que «nunca muda» pode ser reescrita por alguém com permissão de escrita no registo. O passo de deploy resolve a etiqueta para o digest uma vez (o `build-push-action` expõe-no em `outputs.digest`) e a partir daí só usa `imagem@sha256:…`. É esse digest que o orquestrador corre, que o canário compara e que o rollback repõe.',
      },
      {
        type: 'code',
        lang: 'bash',
        caption: 'Verificar uma imagem antes de a correr: a atestação tem de ter sido produzida por este repositório.',
        code: `IMG=ghcr.io/chega/balcao@sha256:0b4e…c91d
gh attestation verify "oci://$IMG" --repo chega/balcao
docker buildx imagetools inspect "$IMG" --format '{{ json .SBOM }}' | head -c 400`,
      },
      {
        type: 'refs',
        items: [
          { label: 'docker/build-push-action', url: 'https://github.com/docker/build-push-action' },
          { label: 'docker/metadata-action', url: 'https://github.com/docker/metadata-action' },
          { label: 'actions/attest', url: 'https://github.com/actions/attest' },
          { label: 'Docker — Build attestations', url: 'https://docs.docker.com/build/metadata/attestations/' },
        ],
      },
    ],
  },

  /* ============================================================ 5 */
  {
    id: 'entrega',
    title: 'Ambientes, canário, rollback e OIDC',
    blocks: [
      {
        type: 'p',
        text:
          'As evals medem o comportamento contra perguntas conhecidas; não medem as perguntas que os clientes ainda não fizeram, a latência sob o tráfego real, nem a interacção com um fornecedor que está lento hoje. O canário apanha esse resto: a imagem nova recebe 10% das conversas durante 24 horas (RI-04, adr-0024), com as mesmas métricas que o painel de produção, e só é promovida se não divergir da versão estável. O deploy em si corre num ambiente do GitHub (`producao`) com regras de protecção: só a partir da main, e com aprovação para o passo de promoção.',
      },
      {
        type: 'flow',
        flow: {
          id: 'fl-ci-cd-01',
          title: 'Do merge a 100% do tráfego, e o caminho de volta',
          intro: 'Tempos típicos. O merge não é o deploy: é o início de um processo com pontos de paragem.',
          lanes: [
            { id: 'gh', label: 'GitHub Actions', sub: 'ci.yml + deploy', kind: 'infra' },
            { id: 'reg', label: 'GHCR', kind: 'store' },
            { id: 'cloud', label: 'Nuvem', sub: 'via OIDC', kind: 'external' },
            { id: 'orq', label: 'Orquestrador', sub: 'estável + canário', kind: 'service' },
            { id: 'obs', label: 'Métricas', sub: 'painel e alarmes', kind: 'service' },
            { id: 'humano', label: 'Aprovador', sub: 'ambiente producao', kind: 'human' },
          ],
          steps: [
            { from: 'gh', to: 'reg', label: 'push imagem sha-3f9c…, digest sha256:0b4e…', kind: 'req', ms: 180000 },
            { from: 'gh', to: 'cloud', label: 'pede credenciais com o token OIDC do job', detail: 'Sem segredo guardado: a nuvem confia no emissor do GitHub e valida repositório, branch e ambiente no token.', kind: 'req' },
            { from: 'cloud', to: 'gh', label: 'credenciais temporárias (minutos)', kind: 'res' },
            { from: 'gh', to: 'orq', label: 'canário: 10% das conversas para o digest novo', kind: 'req' },
            { from: 'orq', to: 'obs', label: '24 h de métricas estável vs canário', detail: 'TTFT p95, erros 5xx e eventos erro, recusas, custo por conversa, escaladas, feedback negativo.', kind: 'async', ms: 86400000 },
            { from: 'obs', to: 'gh', label: 'comparação dentro dos limites', kind: 'res' },
            { from: 'gh', to: 'humano', label: 'pede aprovação de promoção', kind: 'req' },
            { from: 'humano', to: 'gh', label: 'aprova (com o relatório de avaliação e o do canário)', kind: 'res' },
            { from: 'gh', to: 'orq', label: 'promove: 100% para o digest novo', kind: 'req' },
            { from: 'obs', to: 'gh', label: 'Variante: TTFT p95 do canário 40% acima do estável', detail: 'O alarme dispara antes das 24 h.', kind: 'err' },
            { from: 'gh', to: 'orq', label: 'rollback: 0% para o canário, estável intacto', detail: 'Não há build nem deploy novo: o estável nunca deixou de correr.', kind: 'err', ms: 60000 },
          ],
          outro: 'O rollback de um canário é um ajuste de pesos, não um deploy. Depois da promoção, o rollback é pôr o digest anterior — que ainda existe no registo e foi o que correu ontem.',
        },
      },
      {
        type: 'run',
        run: {
          id: 'run-ci-cd-02',
          title: 'O que um canário de 10% durante 24 h consegue ver',
          brief:
            'Com 1 150 conversas por dia, o canário vê 115. Simula quantas vezes um teste unilateral a 95% detecta uma queda da resolução autónoma (alvo 68%), para quedas de vários tamanhos.',
          code: String.raw`import numpy as np

# Canário de 10% durante 24 h (adr-0024): quantas conversas vê, e que regressão consegue apanhar?
conversas_dia = 1150
n = int(conversas_dia * 0.10)                    # conversas no canário
base = 0.68                                      # resolução autónoma alvo
rng = np.random.default_rng(7)

def detecta(p_canario: float, corridas: int = 4000) -> float:
    # teste unilateral a 95%: o canário é pior do que a base (conhecida, 100% do tráfego restante)?
    limite = base - 1.645 * np.sqrt(base * (1 - base) / n)
    resolvidas = rng.binomial(n, p_canario, size=corridas) / n
    return float((resolvidas < limite).mean())

print(f"conversas no canário em 24 h: {n}")
for queda in (0.02, 0.05, 0.10, 0.15):
    print(f"resolução {base:.2f} -> {base - queda:.2f}: detectada em {detecta(base - queda):.0%} dos canários")
print(f"falso alarme (sem regressão): {detecta(base):.0%}")`,
          expected: `conversas no canário em 24 h: 115
resolução 0.68 -> 0.66: detectada em 11% dos canários
resolução 0.68 -> 0.63: detectada em 29% dos canários
resolução 0.68 -> 0.58: detectada em 70% dos canários
resolução 0.68 -> 0.53: detectada em 95% dos canários
falso alarme (sem regressão): 4%`,
        },
      },
      {
        type: 'callout',
        tone: 'key',
        title: 'O canário não substitui as evals: apanha outra coisa',
        text:
          'Com 115 conversas, uma queda de 5 pontos na resolução passa despercebida em 71% dos canários. O canário do «Balcão» é poderoso para o que tem sinal forte e contínuo — erros, TTFT, custo por conversa, taxa de eventos `erro` — e fraco para qualidade fina. A qualidade fina é o trabalho das evals no PR, com 240 perguntas escolhidas para isso. Por isso as duas camadas existem, e por isso os critérios de promoção do canário são sobretudo operacionais.',
      },
      {
        type: 'table',
        head: ['Critério de promoção', 'Limite (canário vs estável)', 'Porquê este'],
        rows: [
          ['TTFT p95', 'Não mais de 15% acima e sempre < 1,5 s', 'RNF-01; sinal forte com centenas de turnos'],
          ['Eventos `erro` e 5xx', 'Taxa não mais de 0,5 pontos acima', 'Falhas de integração que as evals simuladas não vêem'],
          ['Custo por conversa', 'Não mais de 10% acima', 'RNF-02 e RI-06: um ciclo de ferramentas novo aparece aqui primeiro'],
          ['Escaladas para humano', 'Não mais de 5 pontos acima', 'Sinal indirecto de qualidade com sinal suficiente'],
          ['Chunks não vigentes citados', 'Zero', 'RI-05: qualquer ocorrência é regressão'],
        ],
        caption: 'Critérios escritos antes do deploy, não interpretados depois de olhar para o painel.',
      },
      {
        type: 'p',
        text:
          'Para falar com a nuvem, o job de deploy não guarda uma chave de acesso de longa duração em `secrets`. Com `permissions: id-token: write`, o GitHub emite para o job um token OIDC assinado com o repositório, o ref, o ambiente e o workflow; o fornecedor de nuvem está configurado para confiar nesse emissor e troca o token por credenciais temporárias de um papel com permissões só para este deploy. Uma chave que não existe não se fuga num log, não se esquece de rodar e não sobrevive a um repositório comprometido.',
      },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'O job de deploy do canário (exemplo com AWS; o padrão é igual noutras nuvens). O ambiente `producao` só aceita a main e pede aprovação para a promoção.',
        code: `  canario:
    needs: [imagem]                     # o job imagem expõe outputs.digest = steps.push.outputs.digest
    runs-on: ubuntu-24.04
    environment: producao               # regras de protecção: só main, revisores obrigatórios
    permissions:
      contents: read
      id-token: write                   # pedir o token OIDC deste job
    steps:
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/balcao-deploy   # confia só em repo:chega/balcao:environment:producao
          aws-region: eu-west-1
      - name: Canário a 10%
        run: |
          ./deploy/canario.sh \\
            --imagem "ghcr.io/\${{ github.repository }}@\${{ needs.imagem.outputs.digest }}" \\
            --peso 10`,
      },
      {
        type: 'callout',
        tone: 'trap',
        title: 'O papel da nuvem que confia em qualquer workflow do repositório',
        text:
          'O OIDC só é tão seguro quanto a condição de confiança do papel na nuvem. Uma condição que aceita `repo:chega/balcao:*` deixa qualquer branch — incluindo o de um PR — assumir o papel de deploy em produção. A condição tem de fixar o ambiente (`environment:producao`) ou o ref (`ref:refs/heads/main`), e o ambiente do GitHub tem de ter regras de protecção; senão trocaste um segredo longo por uma porta aberta.',
      },
      {
        type: 'refs',
        items: [
          { label: 'GitHub — About security hardening with OpenID Connect', url: 'https://docs.github.com/en/actions/concepts/security/openid-connect' },
          { label: 'GitHub — Managing environments for deployment', url: 'https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments' },
          { label: 'aws-actions/configure-aws-credentials', url: 'https://github.com/aws-actions/configure-aws-credentials' },
        ],
      },
    ],
  },

  /* ============================================================ 6 */
  {
    id: 'nocturnas',
    title: 'Evals nocturnas com o modelo real',
    blocks: [
      {
        type: 'p',
        text:
          'O modelo simulado torna o CI determinista, rápido e gratuito — e cego para o que só o modelo real faz: seguir mal uma instrução nova do prompt, mudar de comportamento quando o fornecedor actualiza alguma coisa atrás da mesma versão, gerar uma citação no formato errado. O workflow `evals-nocturnas.yml` corre todas as noites às 02:30 UTC (04:30 em Maputo, fora do pico) o conjunto dourado e o red team contra a versão de modelo fixada, com juiz de outro escalão (adr-0019), e guarda o relatório 30 dias.',
      },
      { type: 'file', ref: '.github/workflows/evals-nocturnas.yml' },
      {
        type: 'code',
        lang: 'yaml',
        caption: 'O essencial das nocturnas: agendamento, disparo manual com escolha do conjunto, nomes de modelo em variáveis e chaves em segredos, e uma verificação que falha cedo se a configuração faltar.',
        code: `on:
  schedule:
    - cron: "30 2 * * *"            # 02:30 UTC = 04:30 em Maputo
  workflow_dispatch:
    inputs:
      conjunto:
        type: choice
        options: [todos, dourado, redteam]
        default: todos

concurrency:
  group: evals-nocturnas
  cancel-in-progress: false         # uma avaliação a meio não se cancela: gastou tokens

jobs:
  avaliar:
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    env:
      BALCAO_MODELO_FORNECEDOR: \${{ vars.BALCAO_MODELO_FORNECEDOR || 'anthropic' }}
      BALCAO_MODELO_CHAT: \${{ vars.BALCAO_MODELO_CHAT }}          # identificador com data, nunca um alias
      BALCAO_MODELO_JUIZ: \${{ vars.BALCAO_MODELO_JUIZ }}
      ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Verificar configuração
        run: |
          if [ -z "$BALCAO_MODELO_CHAT" ]; then
            echo "::error::Define a variável BALCAO_MODELO_CHAT nas variáveis do repositório."
            exit 1
          fi
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --frozen
      - run: uv run python -m balcao.avaliacao.correr --conjunto "\${{ inputs.conjunto || 'todos' }}" --gate --saida relatorios`,
      },
      {
        type: 'compare',
        left: {
          title: 'CI em cada PR (modelo simulado)',
          items: [
            'Determinista: o mesmo commit dá sempre o mesmo resultado.',
            'Segundos, sem custo de tokens, sem chave no CI.',
            'Apanha regressões de recuperação, fluxo, ferramentas e guardas.',
            'Bloqueia o merge.',
          ],
        },
        right: {
          title: 'Nocturnas (modelo real)',
          items: [
            'Com variância: decide por intervalo de confiança, não por um número.',
            'Minutos e tokens pagos, todas as noites.',
            'Apanha o que depende do modelo: instruções mal seguidas, formato, deriva do fornecedor (RI-07).',
            'Não bloqueia um PR: abre um alarme e um issue contra o commit da main.',
          ],
        },
      },
      {
        type: 'p',
        text:
          'Quanto custa isto? Com os números do módulo 30, uma corrida do conjunto de produção são 240 perguntas mais 60 conversas multi-turno e 120 ataques, cada turno com ≈ 5 200 tokens de entrada no modelo médio, mais o juiz no escalão grande. São ≈ 560 turnos × 5 200 ≈ 2,9 M tokens de entrada por noite no modelo médio (≈ 190 MZN sem cache de prompt, aos preços de referência do `balcao`), mais o juiz no escalão grande: algumas centenas de meticais por noite, da ordem de meio dia de custo de modelo em produção (≈ 760 MZN por dia) — contra uma regressão que chegaria a 1 150 conversas por dia. A nocturna também serve para testar o modelo candidato: com `BALCAO_MODELO_CHAT` numa variável, correr a mesma avaliação com a versão nova é um `workflow_dispatch`, e a troca só acontece se a divergência ficar abaixo de 3 pontos (RI-07).',
      },
      {
        type: 'table',
        head: ['Resultado da nocturna', 'O que acontece', 'Quem age'],
        rows: [
          ['Gate passa, sem divergência da noite anterior', 'Relatório guardado 30 dias; nada mais', 'Ninguém'],
          ['Uma intenção cai, sem commit novo na main', 'Repetir a corrida; se confirmar, incidente com o fornecedor (RI-07)', 'Engenharia de IA'],
          ['Uma intenção cai depois de um commit novo', 'Issue contra o commit, com o relatório; `git bisect` com o modelo real se preciso (módulo 26)', 'Autor do commit'],
          ['Red team com um ataque a passar', 'Alarme imediato; o ataque entra no conjunto do CI como caso simulado', 'Engenharia de IA e segurança'],
          ['Modelo candidato (disparo manual) diverge ≤ 3 pontos', 'Pode abrir-se o PR que troca `BALCAO_MODELO_CHAT`', 'Plataforma e produto'],
        ],
        caption: 'A nocturna não bloqueia merges; transforma sinais do modelo real em trabalho com dono.',
      },
      {
        type: 'callout',
        tone: 'warn',
        title: 'Segredos em workflows agendados',
        text:
          'Um workflow com `schedule` corre com o código da branch por omissão e tem acesso aos segredos do repositório. Quem pode alterar esse ficheiro na main pode, em teoria, exfiltrar a chave do fornecedor — mais uma razão para a main só mudar por PR revisto e para a chave das nocturnas ter um limite de gasto próprio no fornecedor, separado da chave de produção.',
      },
      {
        type: 'refs',
        items: [
          { label: 'GitHub Actions — Events: schedule e workflow_dispatch', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows' },
          { label: 'GitHub Actions — Variables', url: 'https://docs.github.com/en/actions/concepts/workflows-and-actions/variables' },
        ],
      },
    ],
  },
];
