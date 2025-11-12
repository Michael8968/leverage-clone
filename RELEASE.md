# Release v2025.11.12

## Overview
Production-ready release with video background UI fixes and TCB COS integration for video assets.

## Changes

### 🔧 Fixed
- **Video Background Stacking**: Ensured video backgrounds are positioned behind all interactive UI elements (forms, buttons) on login, signup, register, and dashboard pages using proper z-index layering (`z-index: 0` for video, `z-index: 10-20` for foreground).
- **Pointer Events**: Added `pointer-events: none` to video elements to prevent them from intercepting user clicks, ensuring forms remain fully interactive above the video.
- **Accessibility**: Added `aria-hidden` attribute to background videos to hide them from screen readers.

### ✨ Improved
- **Unified Video URLs**: Centralized video resource URL construction via `src/lib/video-urls.ts`, with support for:
  - TCB COS public bucket (636c-cloud1-7galmfiu70af91a6) as default
  - Environment variable overrides (`NEXT_PUBLIC_ASSETS_BASE` / `NEXT_PUBLIC_TCB_PUBLIC_BASE`) for custom CDN domains
- **CSS Architecture**: Added reusable utility classes:
  - `.video-background`: Ensures video stays at the back with proper positioning and non-interactive state
  - `.video-foreground`: Applies to containers that float above video (z-index: 20)
- **Component Structure**: Refactored video background logic to use consistent helper functions across all pages

### 📋 Pages with Video Backgrounds
The following pages intentionally load dynamic video backgrounds (which will be served from TCB COS):
- `/login` — Main login page with dynamic theme support
- `/signup` — User registration page 
- `/register` — Account creation page (admin/user)
- `/dashboard` — AI intelligent matching page (via ShoppingAssistant component)

All other pages remain unaffected and do not load video backgrounds.

### ✅ Quality Assurance
- **TypeScript Check**: Passed (`tsc --noEmit`)
- **ESLint**: 6 warnings (pre-existing, unrelated to video changes; 0 new errors)
- **Production Build**: Successful (`npm run build`)
  - 63 pages pre-rendered as static content
  - No build errors or warnings
  - Total bundle size within acceptable ranges

### 📦 New Files
- `src/lib/video-urls.ts` — Centralized video URL construction helper
- `src/app/admin/videos/page.tsx` — Video resource debugging page (admin only)
- `src/app/api/videos/route.ts` — Video availability check API endpoint

### 📝 Modified Files
- `src/app/globals.css` — Added `.video-background` and `.video-foreground` utility classes
- `src/app/login/page.tsx` — Integrated video background with video-foreground class and TCB COS URL
- `src/app/signup/page.tsx` — Integrated video background with video-foreground class and TCB COS URL
- `src/app/register/page.tsx` — Integrated video background with video-foreground class and TCB COS URL
- `src/components/app-layout.tsx` — Added video-foreground class to main content area
- `src/components/features/shopping-assistant.tsx` — Refactored DynamicVideoBackground to use TCB COS URLs with fallback to env variables

## Deployment Notes

### Video Asset Requirements
Ensure the following MP4 video files are uploaded to TCB COS bucket `636c-cloud1-7galmfiu70af91a6/videos/`:
- `light-bg.mp4` (light theme background video)
- `dark-bg.mp4` (dark theme background video)
- `gradient-bg.mp4` (gradient theme background video)

Make these files publicly accessible (read permissions enabled) so browsers can load them directly.

### Environment Variables (Optional)
If using a custom CDN or different bucket, set:
```env
NEXT_PUBLIC_ASSETS_BASE=https://your-custom-cdn.com
# or
NEXT_PUBLIC_TCB_PUBLIC_BASE=https://your-tcb-bucket.cos.region.myqcloud.com
```

If not set, the application will default to the public COS bucket URL.

### Testing
1. Start dev server: `npm run dev`
2. Navigate to each page (`/login`, `/signup`, `/register`, `/dashboard`)
3. Verify:
   - Videos load and play automatically (or graceful fallback if unavailable)
   - Forms/buttons are clickable and focused properly
   - Theme switching works (light/dark/gradient)
   - No z-index conflicts or visual overlaps

## Breaking Changes
None. This release is backward compatible.

## Contributors
- Video background UI/UX refactoring
- TCB COS integration for scalable video delivery
- CSS architecture improvements for layering management

## Date
Released: 2025-11-12
