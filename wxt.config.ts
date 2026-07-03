import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Save Image',
    description: 'Click any image on a page to download it.',
    permissions: ['downloads', 'activeTab'],
    host_permissions: ['<all_urls>'],
    browser_specific_settings: {
      gecko: {
        id: 'save-image@example.com',
      },
    },
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
