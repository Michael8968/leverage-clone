export const TCB_BUCKET = '636c-cloud1-7galmfiu70af91a6';
export const TCB_REGION = 'ap-shanghai';

// Construct the COS URL for a given theme name. Falls back to environment variable
// NEXT_PUBLIC_ASSETS_BASE or NEXT_PUBLIC_TCB_PUBLIC_BASE if present.
export function constructCosUrl(theme: 'light' | 'dark' | 'gradient') {
  const videoPath = `videos/${theme}-bg.mp4`;
  const publicBase = typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_ASSETS_BASE || process.env.NEXT_PUBLIC_TCB_PUBLIC_BASE)
    : undefined;
  const base = publicBase ? String(publicBase).replace(/\/$/, '') : '';
  if (base) return `${base}/videos/${theme}-bg.mp4`;

  // Default COS public URL for the known bucket
  return `https://${TCB_BUCKET}.cos.${TCB_REGION}.myqcloud.com/${videoPath}`;
}

export function getVideoSrcForTheme(theme: string) {
  switch (theme) {
    case 'dark':
      return constructCosUrl('dark');
    case 'gradient':
      return constructCosUrl('gradient');
    case 'light':
    default:
      return constructCosUrl('light');
  }
}
