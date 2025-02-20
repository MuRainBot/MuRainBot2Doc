import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "MuRainBot2 Doc",
  description: "MuRainBot2's Doc",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '文档', link: '/start/about' },
      { text: 'LibAPI文档', link: 'https://mrb2api.xiaosu.icu' },
    ],

    sidebar: [
      {
        text: '快速开始',
        items: [
          { text: '介绍', link: '/start/about' },
          { text: '快速开始', link: '/start/getting-started' },
          { text: '编写插件', link: '/start/plugin'}
        ]
      },
      {
        text: '深入',
        items: [
          { text: '插件配置', link: '/advanced/plugin-config' },
          { text: '插件依赖', link: '/advanced/require-plugin' }
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
