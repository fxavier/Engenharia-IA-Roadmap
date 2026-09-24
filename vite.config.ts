import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    // O conteudo dos modulos e grande por natureza (e um livro). O que interessa
    // e o que carrega no primeiro ecra, nao o total do bundle.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          // Nada de agrupar o conteúdo: cada módulo é um import dinâmico e fica
          // no seu próprio pedaço, para o primeiro ecrã não descarregar o livro todo.
          if (id.includes('/src/content/meta')) return 'indice';
          if (id.includes('/src/data/repo/g-')) return undefined;
          if (id.includes('/src/data/snapshot')) return 'snapshot';
          if (id.includes('/src/data/balcao-fonte')) return 'balcao-fonte';
          if (id.includes('/src/data/glossary')) return 'glossario';
          if (id.includes('/src/data/adr')) return 'adr';
          if (id.includes('/src/data/api')) return 'api';
          if (id.includes('/src/components/widgets/')) return 'widgets';
        },
      },
    },
  },
})
