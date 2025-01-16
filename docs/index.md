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

<script setup>
import { onMounted } from 'vue';
// Import confetti using import syntax
import confetti from 'canvas-confetti';

onMounted(() => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 170,
      origin: { y: 0.6 },
    });
    console.log('Confetti triggered');
  }
});
</script>

<Confetti />

<style>
.VPHomeHero {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, rgb(14, 190, 255) 50%, rgb(255, 66, 179));
  --vp-home-hero-image-background-image: linear-gradient(-45deg, rgb(14, 190, 255) 50%, rgb(255, 66, 179) 50%);
  --vp-home-hero-image-filter: blur(44px);
  position: relative;
}

/* 图片样式 */
.VPImage.image-src {
  -webkit-mask-image: radial-gradient(circle, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
  border-radius: 30px;
  transform: translate(-50%, -50%); /* 修正定位基准 */
  transform-origin: center center; /* 放大基准点为中心 */
  transition: all 0.3s; /* 平滑过度 */
}

/* 鼠标悬停时图片放大 */
.VPImage.image-src:hover {
  transform: translate(-50%, -50%) scale(1.1); /* 放大时保持居中 */
  border-radius: 34px;
}

/* 背景呼吸灯效果 */
.image-bg {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  height: 150%;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1); /* 初始缩放 */
  animation: breathe-nonlinear 3s infinite alternate; /* 初始动画 */
  z-index: -1; /* 确保背景在图片后面 */
}

@keyframes breathe-nonlinear {
  0% {
    transform: translate(-50%, -50%) scale(0.9); /* 初始状态 */
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.9;
  }
}

.VPImage.image-src:hover ~ .image-bg {
  transform: translate(-50%, -50%) scale(1.2); /* 背景放大 */
}

/* 响应式设置 */
@media (min-width: 640px) {
  .image-bg {
    filter: blur(56px);
  }
}

@media (min-width: 960px) {
  .image-bg {
    filter: blur(68px);
  }
}
</style>

<script>
  if (typeof window !== "undefined") {
    // 随机化动画时长和缩放倍数
    window.addEventListener('DOMContentLoaded', () => {
      const imageBg = document.querySelector('.image-bg');
      
      // 随机设置动画时长 (在 2s 到 5s 之间)
      const randomDuration = (Math.random() * 3 + 2).toFixed(2) + 's';
      imageBg.style.animationDuration = randomDuration;
      
      // 随机设置动画的关键帧变化
      const randomScale = (Math.random() * 0.1 + 0.9).toFixed(2);
      const randomScale2 = (Math.random() * 0.1 + 1.15).toFixed(2);
      
      const keyframes = `
        @keyframes breathe-nonlinear {
          0% {
              transform: translate(-50%, -50%) scale(${randomScale}); /* 初始状态 */
              opacity: 1;
            }
          100% {
              transform: translate(-50%, -50%) scale(${randomScale2});
              opacity: 0.9;
            }
          }
        `;
        
      // 动态注入新的 @keyframes 动画
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.innerText = keyframes;
      document.head.appendChild(styleSheet);
    });
  }
</script>

