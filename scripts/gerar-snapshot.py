"""Gera src/data/snapshot.ts: resultados pré-calculados do runtime `balcao`
para os widgets (que correm em TypeScript e não esperam pelo Pyodide).

Uso: PYTHONPATH=laboratorio/src python3 scripts/gerar-snapshot.py
"""
import json
import balcao as b
from balcao import didactico as d

def r4(x): return round(float(x), 4)

chunks = {
    'recursivo': b.chunkar_corpus('recursivo'),
    'frases': b.chunkar_corpus('frases', max_frases=3),
    'fixo': b.chunkar_corpus('fixo', tamanho=40, sobreposicao=8),
}
rec = chunks['recursivo']
m = b.embed_lote([c.texto for c in rec])
qs = [p['pergunta'] for p in b.PERGUNTAS]
mq = b.embed_lote(qs)
import numpy as np
todos = np.vstack([m, mq])
xy = b.projectar_2d(todos)

rankings = {}
for p in b.PERGUNTAS:
    rankings[p['id']] = {met: [[c.id, c.doc, r4(s)] for c, s in b.recuperar(p['pergunta'], 10, met)] for met in ['bm25', 'denso', 'hibrido', 'rerank']}

aval = {met: {k: b.avaliar_recuperacao(met, k) for k in (1, 3, 5, 10)} for met in ['bm25', 'denso', 'hibrido', 'rerank']}

snap = {
    'fusoes': [list(f) for f in d._fusoes()],
    'documentos': [{k: doc[k] for k in ('id', 'titulo', 'categoria', 'publico', 'vigente', 'actualizado', 'texto')} for doc in b.DOCUMENTOS],
    'chunks': {k: [{'id': c.id, 'doc': c.doc, 'texto': c.texto} for c in v] for k, v in chunks.items()},
    'perguntas': b.PERGUNTAS,
    'projeccao': {
        'chunks': [[c.id, r4(x), r4(y)] for c, (x, y) in zip(rec, xy[: len(rec)])],
        'perguntas': [[p['id'], r4(x), r4(y)] for p, (x, y) in zip(b.PERGUNTAS, xy[len(rec):])],
    },
    'rankings': rankings,
    'avaliacao': {met: {str(k): v for k, v in ks.items()} for met, ks in aval.items()},
    'logits': b.LOGITS_EXEMPLO,
    'pedidos': b.PEDIDOS,
    'clientes': b.CLIENTES,
    'ferramentas': [v['esquema'] for v in b.FERRAMENTAS.values()],
    'modelos': b.MODELOS,
    'cambio': b.CAMBIO_USD_MZN,
}
cab = '/* GERADO POR scripts/gerar-snapshot.py — NÃO EDITAR À MÃO.\n   Resultados do runtime `balcao` para os widgets. */\n\n'
tipos = '''export interface SnapshotChunk { id: string; doc: string; texto: string }
export interface SnapshotDoc { id: string; titulo: string; categoria: string; publico: string; vigente: boolean; actualizado: string; texto: string }
export interface SnapshotPergunta { id: string; pergunta: string; relevantes: string[]; resposta: string; intencao: string }
/** [chunkId, docId, score] */
export type Linha = [string, string, number];
export interface Snapshot {
  fusoes: [string, string][];
  documentos: SnapshotDoc[];
  chunks: Record<'recursivo' | 'frases' | 'fixo', SnapshotChunk[]>;
  perguntas: SnapshotPergunta[];
  projeccao: { chunks: [string, number, number][]; perguntas: [string, number, number][] };
  rankings: Record<string, Record<'bm25' | 'denso' | 'hibrido' | 'rerank', Linha[]>>;
  avaliacao: Record<string, Record<string, { metodo: string; k: number; recall: number; mrr: number; ndcg: number; n: number }>>;
  logits: Record<string, number>;
  pedidos: Record<string, Record<string, unknown>>;
  clientes: Record<string, Record<string, unknown>>;
  ferramentas: { name: string; description: string; input_schema: Record<string, unknown> }[];
  modelos: Record<string, { entrada: number; saida: number; cache_leitura: number; janela: number }>;
  cambio: number;
}

'''
with open('src/data/snapshot.ts', 'w', encoding='utf-8') as f:
    f.write(cab + tipos + 'export const SNAPSHOT: Snapshot = ' + json.dumps(snap, ensure_ascii=False) + ' as unknown as Snapshot;\n')
print('snapshot:', len(rec), 'chunks,', len(json.dumps(snap)) // 1024, 'KB')
