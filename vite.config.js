import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/ranking-tenis-das-ruas/',
}));
