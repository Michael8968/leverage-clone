'use client';

import React, { useEffect, useState } from 'react';

type VideoInfo = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  contentLength?: number | null;
  error?: string | null;
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        const json = await res.json();
        if (!mounted) return;
        setVideos(json.videos || []);
      } catch (err) {
        console.error(err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-background text-foreground video-foreground">
      <h1 className="text-2xl font-bold mb-4">视频资源调试</h1>
      {loading && <p>加载中...</p>}
      {!loading && (!videos || videos.length === 0) && (
        <p>未找到视频资源。</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos?.map((v) => (
          <div key={v.name} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.url}</div>
              </div>
              <div className="text-sm">
                {v.ok ? <span className="text-green-500">可用</span> : <span className="text-red-500">不可用</span>}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <a href={v.url} target="_blank" rel="noreferrer" className="underline text-primary">在新标签中打开</a>
              <button className="px-3 py-1 bg-primary text-white rounded" onClick={() => setSelected(v.url)}>在下方播放</button>
              {v.error && <div className="text-xs text-red-500">错误: {v.error}</div>}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-8">
          <h2 className="text-lg mb-2">播放器</h2>
          <video key={selected} src={selected} controls autoPlay className="w-full max-h-[50vh] object-contain rounded" />
          <div className="mt-2">
            <button className="px-3 py-1 bg-secondary text-white rounded" onClick={() => setSelected(null)}>停止播放</button>
          </div>
        </div>
      )}
    </div>
  );
}
