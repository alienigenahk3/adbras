import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.js',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifestFilename: 'manifest.json',
        includeAssets: [
          'favicon-32.png',
          'icon-72.png',
          'icon-96.png',
          'icon-128.png',
          'icon-144.png',
          'icon-152.png',
          'icon-192.png',
          'icon-384.png',
          'icon-512.png',
          'maskable-icon-192.png',
          'maskable-icon-512.png',
          'apple-touch-icon.png'
        ],
        manifest: {
          name: 'Comunidade Cristã ICTUS',
          short_name: 'Igreja ICTUS',
          description: 'Aplicativo oficial da Comunidade Cristã ICTUS',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          id: '/',
          lang: 'pt-BR',
          icons: [
            {
              src: '/icon-72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/maskable-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/maskable-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Ver Agenda',
              url: '/?section=calendar',
              icons: [{ src: '/icon-192.png', sizes: '192x192' }]
            },
            {
              name: 'Pedir Oração',
              url: '/?section=prayer',
              icons: [{ src: '/icon-192.png', sizes: '192x192' }]
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
