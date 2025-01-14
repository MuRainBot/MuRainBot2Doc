import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "MuRainBot2 Doc",
  description: "MuRainBot2's Doc",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '文档', link: '/guide/about' }
    ],

    sidebar: [
      {
        text: '快速开始',
        items: [
          { text: '介绍', link: '/guide/about' },
          { text: '快速开始', link: '/guide/getting-started' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/MuRainBot/MuRainBot2' }
    ],

    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ]
  },
  cleanUrls: true
})
