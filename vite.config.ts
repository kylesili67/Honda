import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function cloudflareStaticMetaPlugin(siteUrl: string): Plugin {
  const normalizedUrl = siteUrl.trim().replace(/\/$/, '');
  return {
    name: 'cloudflare-static-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/%VITE_SITE_URL%/g, normalizedUrl);
      },
    },
    writeBundle(options) {
      const outDir = options.dir || path.resolve(import.meta.dirname, 'dist');
      const robotsPath = path.join(outDir, 'robots.txt');
      if (fs.existsSync(robotsPath)) {
        const sitemapUrl = normalizedUrl ? `${normalizedUrl}/api/sitemap.xml` : '/api/sitemap.xml';
        const content = fs.readFileSync(robotsPath, 'utf8').replace(/^Sitemap:.*$/m, `Sitemap: ${sitemapUrl}`);
        fs.writeFileSync(robotsPath, content, 'utf8');
      }
    },
  };
}

export default defineConfig(() => {
  const siteUrl = process.env.VITE_SITE_URL || '';
  return {
    plugins: [react(), tailwindcss(), cloudflareStaticMetaPlugin(siteUrl)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
