import type { ReactElement } from 'react';
import type { WidgetId } from '../../types';
import { MapaStack, Tokenizador, AmostragemLab, CustoTokens, ContextoJanela, EsquemaFerramenta, EscolherModelo } from './Fundamentos';
import { Embeddings2d, HnswLab, ChunkingLab, RagPipeline, RrfLab, ReescritaConsulta } from './Rag';
import { LcelLab, ReactCiclo, GrafoEditor, CheckpointReplay, MemoriaLab, McpInspector } from './Orquestracao';
import { EvalPainel, MetricasRetrieval, JuizLab, InjeccaoLab } from './Avaliacao';
import { StreamingSse, GitGrafo, DockerCamadas, PipelineCi, TraceExplorador, CustoEscala } from './Producao';

export const WIDGETS: Record<WidgetId, { name: string; group: string; blurb: string; render: () => ReactElement }> = {
  /* ------------------------------------------------------------------ LLMs */
  'mapa-stack': { name: 'Mapa da stack de IA', group: 'LLMs', blurb: 'Que camada resolve cada intenção do «Balcão», e quando um LLM é a ferramenta errada.', render: () => <MapaStack /> },
  'tokenizador': { name: 'Tokenizador BPE', group: 'LLMs', blurb: 'Escreve texto e vê os tokens, a contagem e o custo; treina as fusões passo a passo.', render: () => <Tokenizador /> },
  'amostragem-lab': { name: 'Temperatura, top-k e top-p', group: 'LLMs', blurb: 'Mexe nos parâmetros de amostragem e vê a distribuição do próximo token mudar.', render: () => <AmostragemLab /> },
  'custo-tokens': { name: 'Calculadora de custo por conversa', group: 'LLMs', blurb: 'Tokens por turno, histórico que cresce, cache de prompt e escalão de modelo.', render: () => <CustoTokens /> },
  'contexto-janela': { name: 'Orçamento da janela de contexto', group: 'LLMs', blurb: 'Sistema, ferramentas, contexto RAG e histórico a disputar a mesma janela.', render: () => <ContextoJanela /> },
  'esquema-ferramenta': { name: 'Construtor de esquema de ferramenta', group: 'LLMs', blurb: 'Constrói o JSON Schema de uma ferramenta e valida chamadas do modelo contra ele.', render: () => <EsquemaFerramenta /> },
  'escolher-modelo': { name: 'Comparador de modelos', group: 'LLMs', blurb: 'Pesa qualidade, latência e custo, e vê que escalão ganha para cada intenção.', render: () => <EscolherModelo /> },

  /* ------------------------------------------------------------------- RAG */
  'embeddings-2d': { name: 'Espaço de embeddings', group: 'RAG', blurb: 'Perguntas e documentos projectados em 2D, com a vizinhança por cosseno.', render: () => <Embeddings2d /> },
  'hnsw-lab': { name: 'HNSW e IVF por dentro', group: 'RAG', blurb: 'Constrói um grafo HNSW, percorre uma pesquisa e troca recall por latência.', render: () => <HnswLab /> },
  'chunking-lab': { name: 'Laboratório de chunking', group: 'RAG', blurb: 'Parte uma política com quatro estratégias e compara tamanho, cortes e recuperação.', render: () => <ChunkingLab /> },
  'rag-pipeline': { name: 'Pipeline RAG passo a passo', group: 'RAG', blurb: 'Uma pergunta a atravessar pesquisa, contexto, prompt e resposta com citações.', render: () => <RagPipeline /> },
  'rrf-lab': { name: 'Fusão híbrida (RRF)', group: 'RAG', blurb: 'Dois rankings, o parâmetro k e o re-ranking, com o resultado final lado a lado.', render: () => <RrfLab /> },
  'reescrita-consulta': { name: 'Reescrita de consulta', group: 'RAG', blurb: 'Multi-query, HyDE e decomposição sobre perguntas reais de clientes.', render: () => <ReescritaConsulta /> },

  /* ------------------------------------------------ LangChain e LangGraph */
  'lcel-lab': { name: 'Compositor LCEL', group: 'LangChain e LangGraph', blurb: 'Encadeia runnables com | e vê o que cada passo recebe e devolve.', render: () => <LcelLab /> },
  'react-ciclo': { name: 'Ciclo de um agente', group: 'LangChain e LangGraph', blurb: 'Pensamento, chamada de ferramenta e observação, passo a passo, com limites.', render: () => <ReactCiclo /> },
  'grafo-editor': { name: 'Editor de grafo', group: 'LangChain e LangGraph', blurb: 'O grafo do «Balcão»: escolhe a mensagem e vê o caminho, o estado e os reducers.', render: () => <GrafoEditor /> },
  'checkpoint-replay': { name: 'Checkpoints, interrupt e replay', group: 'LangChain e LangGraph', blurb: 'Pára o grafo à espera de aprovação, retoma, volta atrás e reexecuta.', render: () => <CheckpointReplay /> },
  'memoria-lab': { name: 'Memória de conversa', group: 'LangChain e LangGraph', blurb: 'Janela, resumo e custo de contexto ao longo de uma conversa comprida.', render: () => <MemoriaLab /> },
  'mcp-inspector': { name: 'Inspector de MCP', group: 'LangChain e LangGraph', blurb: 'As mensagens JSON-RPC entre cliente e servidor MCP do «Balcão».', render: () => <McpInspector /> },

  /* ---------------------------------------------------------- avaliação */
  'eval-painel': { name: 'Painel de avaliação', group: 'Avaliação', blurb: 'Duas versões do sistema no conjunto dourado, por intenção, com intervalo de confiança.', render: () => <EvalPainel /> },
  'metricas-retrieval': { name: 'Métricas de recuperação', group: 'Avaliação', blurb: 'Recall@k, MRR e nDCG calculados à mão sobre um ranking que tu ordenas.', render: () => <MetricasRetrieval /> },
  'juiz-lab': { name: 'Calibrar um juiz', group: 'Avaliação', blurb: 'Compara as notas do juiz com as de humanos e vê o kappa e os vieses.', render: () => <JuizLab /> },
  'injeccao-lab': { name: 'Laboratório de injecção', group: 'Avaliação', blurb: 'Ataques contra as camadas de defesa do «Balcão», uma camada de cada vez.', render: () => <InjeccaoLab /> },

  /* ------------------------------------------------------------ produção */
  'streaming-sse': { name: 'Streaming por SSE', group: 'Produção', blurb: 'Eventos SSE a chegar, TTFT, cancelamento e o que o cliente vê.', render: () => <StreamingSse /> },
  'git-grafo': { name: 'Git visual', group: 'Produção', blurb: 'Branches, merge, rebase e bisect sobre o histórico do repositório do «Balcão».', render: () => <GitGrafo /> },
  'docker-camadas': { name: 'Camadas de uma imagem', group: 'Produção', blurb: 'Ordena as instruções do Dockerfile e vê a cache de build e o tamanho final.', render: () => <DockerCamadas /> },
  'pipeline-ci': { name: 'Pipeline de CI/CD', group: 'Produção', blurb: 'Um PR a atravessar lint, testes, evals, build e canário — e onde pára.', render: () => <PipelineCi /> },
  'trace-explorador': { name: 'Explorador de traços', group: 'Produção', blurb: 'Um turno do «Balcão» em spans gen_ai, com tempo, tokens e custo.', render: () => <TraceExplorador /> },
  'custo-escala': { name: 'Planeador de custo e escala', group: 'Produção', blurb: 'Tráfego, cache, routing e limites do fornecedor: custo mensal e capacidade.', render: () => <CustoEscala /> },
};

export function Widget({ id }: { id: WidgetId; props?: Record<string, unknown> }) {
  const w = WIDGETS[id];
  if (!w) {
    return (
      <p className="my-4 rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        Ferramenta desconhecida: {id}
      </p>
    );
  }
  return w.render();
}
