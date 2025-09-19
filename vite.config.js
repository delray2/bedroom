import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        settings: path.resolve(__dirname, 'settings.html'),
        sliders: path.resolve(__dirname, 'sliders.html')
      }
    }
  }
});
