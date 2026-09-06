import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [basicSsl()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
});
