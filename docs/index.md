---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "MuRainBot2"
  text: "基于Python适配OneBot11协议的轻量级QQBot框架"
  tagline: 
  image:
    src: /icon.png
    alt: MuRainBot2
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/about
    - theme: alt
      text: GitHub
      link: https://github.com/MuRainBot/MuRainBot2

features:
  - icon: 🚀
    title: 基于Python
    details: 使用Python开发，效率++
  - icon: 🪶
    title: 轻量化
    details: 没有太多冗杂的功能，内存占用低
  - icon: 🧩
    title: 模块化的插件系统
    details: 框架本身不提供功能，一切功能都是由一个个插件提供的
  - icon: 🗑️
    title: 编不下去了……
    details: "没啥优点<br>你知道的，就正常一个QQBot框架基本该有的功能"
---
<style>
.VPHomeHero {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, rgb(14,190,255) 45%, rgb(255,66,179));

  --vp-home-hero-image-background-image: linear-gradient(-45deg, rgb(14,190,255) 50%, rgb(255,66,179) 50%);
  --vp-home-hero-image-filter: blur(44px);
}

.VPImage {
  -webkit-mask-image: radial-gradient(circle, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
  border-radius: 30px;
}

@media (min-width: 640px) {
  .VPHomeHero {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  .VPHomeHero {
    --vp-home-hero-image-filter: blur(68px);
  }
}
</style>
