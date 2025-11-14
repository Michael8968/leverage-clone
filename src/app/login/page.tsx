// src/app/login/page.tsx
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <>
      {/* 强制全局样式：只作用于本页 */}
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100vh !important;
          height: 100dvh !important; /* 适配移动端动态视口 */
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        /* 确保视频撑满 */
        video {
          min-width: 100vw !important;
          min-height: 100vh !important;
        }
      `}</style>

      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* 全屏背景视频 */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/video/light-bg.mp4" type="video/mp4" />
        </video>

        {/* 表单容器 */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '420px',
            margin: '10vh auto',
            padding: '2.5rem',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '1rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <LoginForm />
        </div>
      </div>
    </>
  );
}
