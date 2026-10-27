import type { TopicoEntrevista } from '../../types';
import { perguntasA } from './t31-codigo-ao-vivo.parte-a';
import { perguntasB } from './t31-codigo-ao-vivo.parte-b';

export const topico: TopicoEntrevista = {
  id: 'codigo-ao-vivo',
  numero: 31,
  bloco: 'rondas',
  titulo: 'Código ao vivo para AI engineers',
  resumo:
    'Dez exercícios de live coding que aparecem em rondas de AI engineer: recuperação (cosseno, BM25, RRF, chunking, métricas), robustez de chamadas a APIs (retentativas, rate limit, streaming SSE), o ciclo de um agente e uma cache semântica. Cada um com solução completa em Python e testes que correm.',
  icon: '⌨️',
  modulos: ['entrevista', 'pesquisa-hibrida', 'agentes', 'apis-de-modelos', 'custo-escala'],
  essencial: [
    'Antes de escrever: repete o enunciado, fixa a assinatura, pergunta pelos casos-limite e diz a complexidade que vais atingir.',
    'Cosseno: normaliza na ingestão, guarda em float32, um produto matriz-vector e selecção parcial O(n); exclui vectores nulos.',
    'BM25: IDF(t)·f·(k1+1) / (f + k1·(1 − b + b·len(d)/avgdl)), k1 ≈ 1,2–2,0, b ≈ 0,75; IDF com +1 no log para nunca ser negativo.',
    'RRF: soma de w/(k + rank), k = 60, rank a partir de 1; desempate explícito e math.fsum para a soma não depender da ordem das listas.',
    'nDCG@k = DCG/IDCG, com o IDCG dos julgamentos ideais; consultas sem relevantes ficam fora da média, consultas falhadas contam 0.',
    'Retentativas: full jitter uniforme em [0, min(teto, base·2^n)], Retry-After em segundos ou HTTP-date (RFC 9110), prazo total, só 408/429/5xx.',
    'Rate limit: dois token buckets (RPM e TPM), consumo atómico dos dois, dormir fora do lock, acertar a estimativa com o usage real.',
    'SSE: três terminadores de linha, \\r no fim do pedaço fica pendente, descodificador UTF-8 incremental, evento sem linha vazia final é descartado.',
    'Agente: limite de passos, validação antes de executar, erros como mensagens tool, repetição detectada com argumentos canónicos.',
    'Relógio, sono, aleatoriedade, modelo e embedding injectáveis: é isso que torna o código testável em milissegundos.',
  ],
  perguntas: [...perguntasA, ...perguntasB],
};
