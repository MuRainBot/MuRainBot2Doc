import { defineConfig } from 'vitepress'
import {
    GitChangelog,
    GitChangelogMarkdownSection,
} from '@nolebase/vitepress-plugin-git-changelog/vite'

export default defineConfig({
    vite: {
        plugins: [
            GitChangelog({
                repoURL: () => 'https://github.com/MuRainBot/MuRainBot2Doc',
            }),
            GitChangelogMarkdownSection(),
        ],
    },
    lang: 'zh-CN',
    title: "MuRainBot2 Doc",
    description: "MuRainBot2's Doc",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: '主页', link: '/' },
            { text: '文档', link: '/start/about' },
            { text: '插件商店', link: '/ecosystem/plugins'},
            { text: 'LibAPI文档', link: 'https://mrb2api.xiaosu.icu' }
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
                    { text: '事件处理', link: '/advanced/event-handlers' },
                    { text: '事件管理器', link: '/advanced/event-manager' },
                    { text: '操作', link: '/advanced/actions' },
                    { text: '富文本', link: '/advanced/rich-text' },
                    { text: '数据缓存', link: '/advanced/data-cache' },
                    { text: '插件配置', link: '/advanced/plugin-config' },
                    { text: '插件管理器', link: '/advanced/plugin-manager' },
                    { text: '适配其他协议 (兼容层方案)', link: '/advanced/multi-protocol-adaptation' }
                ]
            },
            {
                text: '生态',
                items: [
                    { text: '插件商店', link: '/ecosystem/plugins' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/MuRainBot/MuRainBot2' }
        ],

        head: [
            ['link', { rel: 'icon', href: '/favicon.ico' }]
        ],

        search: {
          provider: 'local'
        },

        editLink: {
          pattern: 'https://github.com/MuRainBot/MuRainBot2Doc/edit/master/docs/:path',
          text: '帮助我们改进此文档'
        },

        lastUpdated: {
          text: '最后更新于'
        }
    },
    cleanUrls: true
})
