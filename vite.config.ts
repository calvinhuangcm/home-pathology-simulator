import { defineConfig } from 'vite';

// GitHub Pages serves this project below /<repository>/; keep local URLs at /.
const base = process.env.GITHUB_ACTIONS === 'true'
  ? '/home-pathology-simulator/'
  : '/';

export default defineConfig({ base });
