import type { Demand, Creative } from './types';

// This file now serves as a source for initial/mock data.
// In the future, these functions will be replaced with actual database calls.

export const getMockDemands = (): Demand[] => [
  { id: 'D001', title: '夏季时尚T恤设计', description: '寻找能设计符合Z世代审美的夏季T恤的创意，要求原创、潮流。', category: '服装', budget: 5000, status: '开放中', createdAt: '2024-07-20' },
  { id: 'D002', title: '智能家居新品宣传视频', description: '为新款智能夜灯制作一个30秒的宣传短视频，突出其温馨和智能的特点。', category: '电子产品', budget: 15000, status: '开放中', createdAt: '2024-07-19' },
  { id: 'D003', title: '环保材料餐具套装推广', description: '需要一篇高质量的社交媒体图文内容，推广我们的环保竹制餐具。', category: '家居', budget: 3000, status: '已匹配', createdAt: '2024-07-18' },
  { id: 'D004', title: '抗衰老精华液试用报告', description: '寻找美妆博主对我们的新款抗衰老精华液进行试用，并产出详细的测评报告。', category: '美妆', budget: 8000, status: '已关闭', createdAt: '2024-07-15' },
];

export const getMockCreatives = (): Creative[] => [
    { id: 'C01', name: '国潮风插画师 - 李四', description: '擅长将传统元素与现代潮流结合，设计经验丰富。', tags: ['插画', '国潮', 'Z世代'], type: '图文' },
    { id: 'C02', name: '短视频制作团队 - A-Team', description: '专业短视频制作，拥有百万粉丝账号运营经验。', tags: ['短视频', '病毒营销', '剧情'], type: '视频' },
    { id: 'C03', name: '科技产品测评达人 - TechMaster', description: '专注电子产品测评，粉丝粘性高，转化效果好。', tags: ['测评', '数码', '智能家居'], type: '图文' },
    { id: 'C04', name: '生活方式直播 - 悠闲酱', description: '风格清新自然，善于营造温馨的家居氛围。', tags: ['直播带货', '家居好物', '生活美学'], type: '直播' },
];

// Re-exporting mock data for components that still use it directly
export const mockDemands = getMockDemands();
export const mockCreatives = getMockCreatives();
