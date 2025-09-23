

import type { SupplementaryField } from "@/components/features/supplementary-fields-manager";

export type Demand = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: '开放中' | '进行中' | '已完成';
  createdAt: Date;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
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
  createdAt?: Date; // Firestore Timestamps will be converted to Date objects
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

// Chat-related types
export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: Date;
  isAIMessage?: boolean;
};

export type Chat = {
  id: string; // Corresponds to demandId
  messages: ChatMessage[];
  participants: string[]; // Array of user UIDs
};

export interface LlmConnection {
    id: string;
    modelName: string;
    provider: string;
    apiKey: string;
    priority: number;
    status: '活跃' | '已禁用';
    scope?: '通用' | '专属';
    category?: '文本' | '图像';
}
