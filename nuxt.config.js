export default {
  head: {
    title: 'pet-ecommerce-nuxt',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  css: [],

  plugins: ['@/plugins/axios'],

  components: false, // disabled auto import components

  buildModules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/stylelint-module',
    '@nuxtjs/eslint-module',
  ],

  modules: ['@nuxtjs/axios', 'nuxt-helmet'],

  build: {
    extractCSS: process.env.NODE_ENV === 'production',
    hotMiddleware: {
      client: { noInfo: true },
    },
    postcss: {
      plugins: {
        'postcss-nested': {}, // replace postcss-preset-env (use postcss-nesting)
      },
    },
  },

  loading: false,

  server: {
    port: 9000,
  },

  serverMiddleware: process.env.ON_VERCEL
    ? []
    : [{ path: '/', handler: '@/server/index.js' }],

  axios: {
    baseURL: process.env.BASE_URL || 'http://localhost:9000',
  },

  tailwindcss: {
    cssPath: '@/assets/css/all.css',
  },

  eslint: {
    cache: false,
  },
};
