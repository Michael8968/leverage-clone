
export type Demand = {
  id: string;
  title: string;
  description: string;
  category: '服装' | '电子产品' | '家居' | '美妆';
  budget: number;
  status: '开放中' | '已匹配' | '已关闭';
  createdAt: string;
  tags?: string[];
};

export type Creative = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: '视频' | '图文' | '直播';
};

export type ProductService = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  supplierId?: string;
};

export type UserProfile = {
  summary: string;
  tags: string[];
}
    
