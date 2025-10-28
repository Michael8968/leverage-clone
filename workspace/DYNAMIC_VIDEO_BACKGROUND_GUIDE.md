# **动态视频背景 - 技术实现指南**

**版本**: 1.0
**日期**: 2025年9月30日
**目的**: 本文档详细说明了在“AI智能匹配平台”项目中，为不同页面（如登录页、主面板）实现动态视频背景的两种核心技术方法，以便开发者可以在其他项目中快速复用此功能。

---

## **1. 概述与效果**

本项目中的动态视频背景主要实现了两种效果：
1.  **静态视频背景**: 为特定页面（如登录页）提供一个固定的、引人注目的视频背景，以增强第一印象。
2.  **动态主题视频背景**: 在核心工作区（如AI智能匹配页），背景视频会根据用户选择的UI主题（明亮、暗黑、渐变）自动切换，提供高度定制化和沉浸式的体验。

---

## **2. 实现方法一：静态视频背景 (应用于登录页)**

此方法适用于为单个页面设置一个固定的视频背景。

### **2.1. 文件结构**
*   **页面文件**: `src/app/login/page.tsx`
*   **视频资源**: `/public/videos/light-bg.mp4`

### **2.2. 实现步骤**

在页面组件 (`LoginPage`) 的根 `div` 内部，直接嵌入一个 `<video>` 标签。

```tsx
// src/app/login/page.tsx

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      {/* 1. 嵌入 <video> 标签 */}
      <video
        key="/videos/light-bg.mp4" // 使用 key 属性
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/light-bg.mp4" type="video/mp4" />
      </video>
      
      {/* 2. 前景内容 */}
      <div className="w-full max-w-sm relative z-10">
        {/* ... 登录表单等前景内容 ... */}
      </div>
    </div>
  );
}
```

### **2.3. 关键点解析**

*   **`<video>` 标签属性**:
    *   `autoPlay`: 视频自动播放。
    *   `loop`: 视频循环播放。
    *   `muted`: 静音播放（这是大多数现代浏览器自动播放视频的强制要求）。
    *   `playsInline`: 在移动设备上（尤其是iOS）以内联方式播放，而不是全屏。
*   **CSS 类 (Tailwind CSS)**:
    *   `absolute top-0 left-0 w-full h-full`: 让视频元素脱离文档流，并完全填满其父容器（在这里是整个屏幕）。
    *   `object-cover`: 确保视频在拉伸以填充容器时保持其宽高比，多余部分会被裁剪。
    *   `-z-10`: 将视频置于最低的层级，作为背景，避免遮挡前景内容。
*   **前景内容**: 所有需要显示在视频之上的内容（如登录卡片）都必须放在一个拥有更高 `z-index`（默认为 `auto` 或通过如 `z-10` 设置）的容器中。

---

## **3. 实现方法二：动态主题视频背景 (应用于AI智能匹配页)**

此方法适用于需要根据应用主题动态切换背景的场景。核心思想是创建一个可复用的组件来封装这个逻辑。

### **3.1. 文件结构**

*   **页面文件**: `src/app/dashboard/page.tsx`
*   **功能组件**: `src/components/features/shopping-assistant.tsx` (该组件内调用了 `DynamicVideoBackground` 组件)
*   **视频资源**: 
    *   `/public/videos/light-bg.mp4`
    *   `/public/videos/dark-bg.mp4`
    *   `/public/videos/gradient-bg.mp4`

### **3.2. 实现步骤**

#### **步骤 1: 创建 `DynamicVideoBackground` 组件**

在您的主要功能组件（例如 `shopping-assistant.tsx`）内部，创建一个独立的、可复用的 `DynamicVideoBackground` 组件。

```tsx
// src/components/features/shopping-assistant.tsx

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

// 1. 创建独立的背景视频组件
function DynamicVideoBackground() {
  const { theme } = useTheme();
  const [videoSrc, setVideoSrc] = useState('/videos/dark-bg.mp4'); // 默认或备用视频

  useEffect(() => {
    // 2. 使用 useEffect 监听主题变化
    switch (theme) {
      case 'light':
        setVideoSrc('/videos/light-bg.mp4');
        break;
      case 'dark':
        setVideoSrc('/videos/dark-bg.mp4');
        break;
      case 'gradient':
        setVideoSrc('/videos/gradient-bg.mp4');
        break;
      default:
        // 处理 'system' 或未知主题的备用逻辑
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setVideoSrc('/videos/dark-bg.mp4');
        } else {
          setVideoSrc('/videos/light-bg.mp4');
        }
        break;
    }
  }, [theme]); // 依赖项数组中包含 theme

  return (
    <video
      key={videoSrc} // 3. 使用 key 属性强制重新渲染
      className="absolute top-0 left-0 w-full h-full object-cover -z-10"
      autoPlay
      loop
      muted
      playsInline
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
}

// 4. 在主组件中使用 DynamicVideoBackground 组件
export function ShoppingAssistant() {
  return (
    <div className="relative flex flex-col p-4 md:p-8 min-h-[calc(100vh-57px)] md:min-h-screen">
      <DynamicVideoBackground />
      <div className="relative z-10">
        {/* ... AI 购物助手的所有前景内容 ... */}
      </div>
    </div>
  );
}
```

### **3.3. 关键点解析**

*   **`useTheme` 钩子**: 从 `next-themes` 库中导入，用于获取当前激活的主题名称（`light`, `dark`, `gradient`, `system`）。
*   **`useEffect` 监听**: 通过 `useEffect` 钩子来监听 `theme` 状态的变化。当主题切换时，`useEffect` 内部的逻辑会重新执行。
*   **`useState` 管理视频源**: 使用一个 `useState` (`videoSrc`) 来存储当前应该播放的视频文件路径。`useEffect` 的逻辑会根据当前 `theme` 来更新这个 state。
*   **`key` 属性 (关键)**: 在 `<video>` 标签上设置 `key={videoSrc}`。这是一个React的关键技巧。当 `key` 的值发生变化时（即 `videoSrc` 从一个视频路径变为另一个），React会销毁旧的 `<video>` 实例并创建一个全新的实例，而不是仅仅更新 `src` 属性。这确保了视频能够流畅、可靠地切换。
*   **CSS 与 HTML 属性**: 与静态方法完全相同，使用绝对定位和 `z-index` 将视频置于背景层。

---
**文档结束**
