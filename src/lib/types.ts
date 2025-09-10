
import type { SupplementaryField } from "@/components/features/supplementary-fields-manager";

export type Demand = {
  id: string;
  title: string;
  description: string;
  category: '礼品定制' | '3D设计' | '智能硬件' | '日用商品';
  budget: number;
  status: '开放中' | '进行中' | '已完成';
  createdAt: Date;
  tags?: string[];
};

export type Creative = {
  id:string;
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
  purchaseUrl?: string;
  sku?: string;
  supplementaryFields?: SupplementaryField[];
};

export type UserProfile = {
  summary: string;
  tags: string[];
}
