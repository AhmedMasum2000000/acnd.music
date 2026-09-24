import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        project: resolve(__dirname, 'project.html'),
        services: resolve(__dirname, 'services.html'),
        about: resolve(__dirname, 'about.html'),
        vision: resolve(__dirname, 'vision.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@barba') || id.includes('node_modules/pixi')) {
            return 'motion';
          }
          return undefined;
        },
      },
    },
  },
});
