'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type VideoTheme = 'light' | 'dark' | 'gradient';

interface VideoBackgroundProps {
  theme: VideoTheme;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  fallbackImage?: string;
  onVideoLoad?: (theme: VideoTheme, src: string) => void;
  onVideoError?: (theme: VideoTheme, error: Event) => void;
  onVideoReady?: (theme: VideoTheme) => void;
}

interface VideoState {
  isLoading: boolean;
  hasError: boolean;
  isReady: boolean;
  currentSrc: string;
  errorMessage?: string;
}

/**
 * 增强的视频背景组件 - 支持TCB COS URL，错误处理和主题切换
 * 包含完整的错误捕获、状态监控和fallback机制
 */
export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  theme,
  className,
  autoPlay = true,
  muted = true,
  loop = true,
  fallbackImage = '/placeholder-video.jpg',
  onVideoLoad,
  onVideoError,
  onVideoReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<VideoState>({
    isLoading: true,
    hasError: false,
    isReady: false,
    currentSrc: '',
  });

  // TCB COS URL配置
  const COS_CONFIG = {
    bucket: process.env.NEXT_PUBLIC_TCB_COS_BUCKET || 'd565-static-leverage-test-abc123-9bn41a84185-1382937545',
    region: process.env.NEXT_PUBLIC_TCB_COS_REGION || 'ap-shanghai',
    baseUrl: `https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com`,
  };

  // 视频文件映射（public/video）
  const VIDEO_FILES = {
    light: 'video/light-bg.mp4',
    dark: 'video/dark-bg.mp4',
    gradient: 'video/gradient-bg.mp4',
  };

  /**
   * 构造TCB COS URL
   */
  const constructCosUrl = useCallback((theme: VideoTheme): string => {
    const videoPath = VIDEO_FILES[theme];
    const url = `${COS_CONFIG.baseUrl}/${videoPath}`;

    console.log(`🎬 VideoBackground: 构造COS URL`, {
      theme,
      videoPath,
      url,
      cosConfig: COS_CONFIG,
    });

    return url;
  }, []);

  // 公共资源基础 URL（可由环境变量覆盖）。优先使用 NEXT_PUBLIC_ASSETS_BASE 或 NEXT_PUBLIC_TCB_PUBLIC_BASE。
  const publicBaseRaw = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_ASSETS_BASE || process.env.NEXT_PUBLIC_TCB_PUBLIC_BASE) : undefined;
  const publicBase = publicBaseRaw ? publicBaseRaw.replace(/\/$/, '') : '';

  /**
   * 根据优先级生成视频资源 URL：
   * 1. 如果设置了 publicBase，使用 `${publicBase}/videos/...`
   * 2. 否则优先使用相对路径 `/videos/...`（适合项目内 `public/videos`）
   * 3. 若以上都不可用，回退到 COS URL
   */
    const resolveVideoSrc = useCallback((theme: VideoTheme): string => {
    // 优先使用相对路径 /video/...（适用于本地 dev、容器以及大多数部署），
    // 这避免了错误或过期的 publicBase 导致页面上引用到不可访问的外部域名。
    return `/video/${theme}-bg.mp4`;
    }, []);

  /**
   * 验证COS URL格式
   */
  const validateCosUrl = useCallback((url: string): boolean => {
    // 接受 /video/ 和 /videos/ 两种历史路径的 COS URL（兼容旧配置）
    const cosUrlPattern = /^https:\/\/[a-zA-Z0-9-]+-static-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.cos\.[a-zA-Z0-9-]+\.myqcloud\.com\/(?:video|videos)\/[a-zA-Z0-9_-]+\.mp4$/;

    const isValid = cosUrlPattern.test(url);
    console.log(`🔍 VideoBackground: COS URL验证`, {
      url,
      isValid,
      pattern: cosUrlPattern.toString(),
    });

    return isValid;
  }, []);

  /**
   * 处理视频加载事件
   */
  const handleLoadStart = useCallback(() => {
    console.log(`📺 VideoBackground: 视频开始加载`, {
      theme,
      src: videoState.currentSrc,
      timestamp: new Date().toISOString(),
    });

    setVideoState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
    }));
  }, [theme, videoState.currentSrc]);

  /**
   * 处理视频加载完成事件
   */
  const handleLoadedData = useCallback(() => {
    console.log(`✅ VideoBackground: 视频数据加载完成`, {
      theme,
      src: videoState.currentSrc,
      duration: videoRef.current?.duration,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight,
      timestamp: new Date().toISOString(),
    });

    setVideoState(prev => ({
      ...prev,
      isLoading: false,
      isReady: true,
    }));

    onVideoLoad?.(theme, videoState.currentSrc);
  }, [theme, videoState.currentSrc, onVideoLoad]);

  /**
   * 处理视频可以播放事件
   */
  const handleCanPlay = useCallback(() => {
    console.log(`🎵 VideoBackground: 视频可以播放`, {
      theme,
      src: videoState.currentSrc,
      readyState: videoRef.current?.readyState,
      networkState: videoRef.current?.networkState,
      timestamp: new Date().toISOString(),
    });

    setVideoState(prev => ({
      ...prev,
      isReady: true,
    }));

    onVideoReady?.(theme);
  }, [theme, videoState.currentSrc, onVideoReady]);

  /**
   * 处理视频错误事件
   */
  const handleError = useCallback((event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = event.target as HTMLVideoElement;
    const error = videoElement.error;

    const errorDetails = {
      code: error?.code,
      message: error?.message,
      theme,
      src: videoState.currentSrc,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      timestamp: new Date().toISOString(),
    };

    console.error(`❌ VideoBackground: 视频加载失败`, errorDetails);

    setVideoState(prev => ({
      ...prev,
      isLoading: false,
      hasError: true,
      errorMessage: `视频加载失败: ${error?.message || '未知错误'}`,
    }));

    onVideoError?.(theme, event.nativeEvent);
  }, [theme, videoState.currentSrc, onVideoError]);

  /**
   * 处理视频播放事件
   */
  const handlePlay = useCallback(() => {
    console.log(`▶️ VideoBackground: 视频开始播放`, {
      theme,
      src: videoState.currentSrc,
      timestamp: new Date().toISOString(),
    });
  }, [theme, videoState.currentSrc]);

  /**
   * 处理视频暂停事件
   */
  const handlePause = useCallback(() => {
    console.log(`⏸️ VideoBackground: 视频暂停`, {
      theme,
      src: videoState.currentSrc,
      timestamp: new Date().toISOString(),
    });
  }, [theme, videoState.currentSrc]);

  /**
   * 处理视频结束事件
   */
  const handleEnded = useCallback(() => {
    console.log(`🏁 VideoBackground: 视频播放结束`, {
      theme,
      src: videoState.currentSrc,
      timestamp: new Date().toISOString(),
    });
  }, [theme, videoState.currentSrc]);

  /**
   * 切换主题时更新视频源
   */
  useEffect(() => {
  const newSrc = resolveVideoSrc(theme);
  const isValidUrl = validateCosUrl(newSrc) || newSrc.startsWith('/') || !!publicBase;

    if (!isValidUrl) {
      console.warn(`⚠️ VideoBackground: COS URL格式无效`, {
        theme,
        src: newSrc,
      });
    }

    console.log(`🔄 VideoBackground: 主题切换`, {
      from: videoState.currentSrc ? 'previous' : 'initial',
      to: theme,
      newSrc,
      isValidUrl,
      timestamp: new Date().toISOString(),
    });

    setVideoState(prev => ({
      ...prev,
      currentSrc: newSrc,
      isLoading: true,
      hasError: false,
      isReady: false,
    }));

    // 更新video元素src
    if (videoRef.current) {
      videoRef.current.src = newSrc;
      videoRef.current.load(); // 强制重新加载
    }
  }, [theme, constructCosUrl, validateCosUrl]);

  /**
   * 渲染fallback内容
   */
  const renderFallback = () => {
    if (videoState.hasError && fallbackImage) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <img
              src={fallbackImage}
              alt="视频加载失败"
              className="max-w-md max-h-64 mx-auto mb-4 rounded-lg opacity-50"
            />
            <p className="text-sm opacity-75">
              {videoState.errorMessage || '视频暂时无法加载'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* 视频元素 */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          videoState.isLoading && "opacity-0",
          videoState.isReady && "opacity-100",
          videoState.hasError && "opacity-0"
        )}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        <source src={videoState.currentSrc} type="video/mp4" />
        <track kind="captions" srcLang="zh-CN" label="中文" />
        您的浏览器不支持视频标签。
      </video>

      {/* 加载状态指示器 */}
      {videoState.isLoading && !videoState.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">视频加载中...</p>
          </div>
        </div>
      )}

      {/* 错误fallback */}
      {renderFallback()}

      {/* 调试信息 (仅开发环境显示) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded max-w-xs">
          <div>主题: {theme}</div>
          <div>状态: {videoState.isLoading ? '加载中' : videoState.isReady ? '就绪' : videoState.hasError ? '错误' : '未知'}</div>
          <div className="truncate">URL: {videoState.currentSrc}</div>
          {videoState.errorMessage && (
            <div className="text-red-400 truncate">错误: {videoState.errorMessage}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoBackground;