import { defineConfig } from 'astro/config';
import swup from '@swup/astro';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' && Boolean(repoName);

export default defineConfig({
  output: 'static',
  base: isGitHubPages ? `/${repoName}` : '/',
  integrations: [
    swup({
      theme: 'fade',
      containers: ['main'],
      preload: true,
      accessibility: true,
      smoothScrolling: false,
      updateHead: true,
      reloadScripts: false,
      globalInstance: true,
    }),
  ],
  vite: {
    build: {
      target: 'es2022',
    },
  },
});
