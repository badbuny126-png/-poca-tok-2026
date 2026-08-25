import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [basicSsl()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
  },
  resolve: {
    alias: {},
  },
});
