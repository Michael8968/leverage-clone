import 'dotenv/config';

async function main() {
  const { intelligentRoutingFlow } = await import('@/ai/flows/intelligent-routing-flow');
  const samples = [
    '我需要一个高质量的3D产品模型用于电商渲染',
    '请帮我做一组 50 个简洁风格 UI 图标',
    '做一段 30 秒的产品展示动画',
  ];

  for (const demand of samples) {
    try {
      const res = await intelligentRoutingFlow({ demand });
      console.log('RealtimeRouting:', { demand, ...res });
    } catch (e: any) {
      console.error('RealtimeRouting error:', demand, e?.message || e);
    }
  }
}

main().catch((e) => {
  console.error('Run failed:', e?.message || e);
  process.exit(1);
});
