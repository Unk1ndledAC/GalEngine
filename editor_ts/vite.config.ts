import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@base': path.resolve(__dirname, 'src/base'),
      '@platform': path.resolve(__dirname, 'src/platform'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@editor': path.resolve(__dirname, 'src/editor'),
      '@workbench': path.resolve(__dirname, 'src/workbench'),
      '@code': path.resolve(__dirname, 'src/code'),
    },
  },
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
          react: ['react', 'react-dom'],
          reactflow: ['reactflow'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['monaco-editor', '@monaco-editor/react'],
  },
});
