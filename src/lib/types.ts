
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
  creatorId?: string;
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
  supplierName?: string;
  supplierScore?: number;
  purchaseUrl?: string;
  sku?: string;
  supplementaryFields?: SupplementaryField[];
  creatorId?: string;
  createdAt?: Date;
  status?: '审核中' | '已入库' | '需要修改';
  imageUrl?: string;
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  matchScore: number;
  recommendation: string;
  // Detailed fields for Company Info
  logoUrl?: string;
  licenseUrl?: string;
  contactPerson?: string;
  jobTitle?: string;
  mobile?: string;
  phone?: string;
  customerService?: string;
  email?: string;
  supplementaryFields?: SupplementaryField[];
}

export type UserProfile = {
  summary: string;
  tags: string[];
}
