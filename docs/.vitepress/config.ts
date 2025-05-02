// https://vitepress.dev/reference/site-config
export default ({
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
                    { text: '插件管理器', link: '/advanced/plugin-manager' }
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
    },
    cleanUrls: true
})
