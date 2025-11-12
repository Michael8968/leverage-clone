import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type VideoInfo = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  contentLength?: number | null;
  error?: string | null;
};

export async function GET() {
  try {
    const publicBase = process.env.NEXT_PUBLIC_ASSETS_BASE || process.env.NEXT_PUBLIC_TCB_PUBLIC_BASE || '';
    const base = publicBase ? String(publicBase).replace(/\/$/, '') : '';

    const pick = (name: string) => base ? `${base}/videos/${name}-bg.mp4` : `/videos/${name}-bg.mp4`;
    const names = ['light', 'dark', 'gradient'];

    const results: VideoInfo[] = await Promise.all(
      names.map(async (n) => {
        const url = pick(n);
        try {
          // Try a HEAD request first to be lightweight
          const res = await fetch(url, { method: 'HEAD' });
          const contentLength = res.headers.get('content-length');
          return {
            name: n,
            url,
            ok: res.ok,
            status: res.status,
            contentLength: contentLength ? Number(contentLength) : null,
            error: null,
          } as VideoInfo;
        } catch (err: any) {
          // If HEAD fails (some CDNs block HEAD), try GET but only read headers
          try {
            const res2 = await fetch(url, { method: 'GET' });
            const contentLength = res2.headers.get('content-length');
            return {
              name: n,
              url,
              ok: res2.ok,
              status: res2.status,
              contentLength: contentLength ? Number(contentLength) : null,
              error: null,
            } as VideoInfo;
          } catch (err2: any) {
            return {
              name: n,
              url,
              ok: false,
              status: undefined,
              contentLength: null,
              error: String(err2?.message || err?.message || 'fetch error'),
            } as VideoInfo;
          }
        }
      })
    );

    return NextResponse.json({ videos: results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
