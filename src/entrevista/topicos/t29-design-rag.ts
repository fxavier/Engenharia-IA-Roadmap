import type { TopicoEntrevista } from '../../types';
import { perguntasA } from './t29-design-rag.parte-a';
import { perguntasB } from './t29-design-rag.parte-b';

export const topico: TopicoEntrevista = {
  id: 'design-rag',
  numero: 29,
  bloco: 'rondas',
  titulo: 'System design I: pesquisa e RAG',
  resumo:
    'Seis rondas de system design de 45 minutos sobre pesquisa e RAG — apoio ao cliente, enterprise search multi-tenant, regulamentação com auditoria, pesquisa de produtos, extracção em lote e assistente de código — resolvidas como um candidato forte o faz no quadro.',
  icon: '🏗️',
  modulos: ['balcao-ponta-a-ponta', 'entrevista'],
  essencial: [
    'Ordem no quadro: clarificar → números → diagrama → 2–3 componentes a fundo → avaliação e gates → falhas, segurança, custo → trade-offs e v2.',
    'Tokens por pedido = instruções (em cache) + histórico + k × tamanho do chunk + resultados de ferramentas; multiplica por pedidos/dia antes de falar em custo.',
    'Vectores: N × dimensões × 4 bytes em float32 (metade em halfvec, 1/32 em binário). 1M × 1 024 dims ≈ 4 GB em float32.',
    'Dimensiona para o pico (avaria, campanha, segunda de manhã), não para a média; diz o modo degradado que protege a quota do fornecedor.',
    'Permissões: grupos no índice, expansão na consulta, filtro dentro da pesquisa ANN, verificação na fonte só do top-k mostrado.',
    'Filtro selectivo + HNSW com pós-filtro = menos de k resultados; usa filtragem integrada, partição ou força bruta conforme a selectividade.',
    'Auditável não é reexecutável: grava contexto, ids, versões e modelo; o replay com o sistema actual é outra coisa.',
    'Em lote: API batch com ~50% de desconto e janela até 24 h; a taxa de revisão humana, não o modelo, é o que decide o custo total.',
    'Confiança declarada pelo LLM está mal calibrada; combina sinais verificáveis e calibra sobre dados rotulados, com amostra cega dos aceites.',
    'Ferramentas de leitura agem com a identidade de quem pergunta; uma conta de serviço omnipotente é um confused deputy.',
  ],
  perguntas: [...perguntasA, ...perguntasB],
};
