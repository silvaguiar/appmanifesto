import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Redireciona chamadas /api/* do Vite (porta 5173) para o servidor proxy (porta 3456)
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      }
    }
  }
});

