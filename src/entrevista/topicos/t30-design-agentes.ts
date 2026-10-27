import type { TopicoEntrevista } from '../../types';
import { perguntasA } from './t30-design-agentes.parte-a';
import { perguntasB } from './t30-design-agentes.parte-b';

export const topico: TopicoEntrevista = {
  id: 'design-agentes',
  numero: 30,
  bloco: 'rondas',
  titulo: 'System design II: agentes e plataformas',
  resumo:
    'Seis rondas de system design de 45 minutos sobre agentes com efeitos, voz em tempo real, investigação multi-agente e as plataformas internas que os sustentam (gateway de LLM, avaliação contínua). É aqui que se decide se o nível é sénior ou staff.',
  icon: '🧩',
  modulos: ['balcao-ponta-a-ponta', 'entrevista', 'agentes', 'avaliar-agentes'],
  essencial: [
    'Estrutura de 45 min: clarificar (5) → estimar com contas (5) → diagrama (10) → 2–3 componentes a fundo (15) → avaliação e gates (5) → falhas, segurança, custo e v2 (5).',
    'O modelo propõe, o código decide, um executor transaccional executa: limites, valores e identidade nunca vêm do modelo.',
    'Idempotência semântica (entidade + operação + motivo) impede duplicados entre pedidos diferentes; um UUID por pedido não.',
    'Timeout numa chamada com efeito é «estado desconhecido»: consultar antes de repetir; outbox na mesma transacção da decisão.',
    'Lei de Little: concorrência = débito × duração; 120 pedidos/s × 8 s de streaming ≈ 1 000 ligações abertas.',
    'Orçamento de tokens: reservar o máximo antes (entrada + max_tokens), acertar com o uso real no fim.',
    'Voz: no segundo de latência, a maior fatia costuma ser a detecção de fim de turno, não o LLM; barge-in trunca o histórico ao áudio ouvido.',
    'Com 300 casos e p ≈ 0,8, o IC 95% é ±4,5 pontos: o PR apanha regressões grandes e invariantes; a nocturna apanha as pequenas.',
    'Prompt injection: assume que funciona e limita o efeito — quarentena sem ferramentas, contexto de uma só conta, humano nos efeitos, ASR de acção = 0.',
    'Citações verificáveis: excerto literal com snapshot e hash, teste verbatim mais juiz de implicação; URLs só do registo de descargas.',
  ],
  perguntas: [...perguntasA, ...perguntasB],
};
