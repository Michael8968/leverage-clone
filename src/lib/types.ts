

import type { SupplementaryField } from "@/components/features/supplementary-fields-manager";
import type { Role } from "@/store/auth";

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

export type ProductImage = {
  url: string;
  view: '默认' | '前' | '后' | '左' | '右' | '上' | '下' | '整体';
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
  supplementaryFields?: SupplementaryField[]; // Legacy, for general supplier info
  details?: SupplementaryField[]; // New, for product-specific specifications
  creatorId?: string;
  createdAt?: Date; // Firestore Timestamps will be converted to Date objects
  status?: '审核中' | '已入库' | '需要修改';
  imageUrl?: string; // Main image
  images?: ProductImage[]; // New, for multiple product images with views
};

export type Supplier = {
  id: string;
  name:string;
  shortName?: string;
  region?: string;
  address?: string;
  establishedDate?: any; // Can be Date or Firestore Timestamp
  registeredCapital?: string;
  creditCode?: string;
  // Fields from form
  contactPerson?: string;
  jobTitle?: string;
  mobile?: string;
  phone?: string;
  customerService?: string;
  email?: string;
  // Fields from data processing
  category?: string;
  matchScore?: number;
  recommendation?: string;
  supplementaryFields?: SupplementaryField[];
}

export type UserProfile = {
  summary: string;
  tags: string[];
};

export type User = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  rating?: number;
  status?: 'active' | 'suspended';
};

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
    category?: '文本' | '图像' | '推理' | '多模态';
}

export interface LlmProvider {
  providerName: string;
  models: string[];
}

export interface Prompt {
    id: string;
    name: string;
    promptKey: string;
    description: string;
    content: string;
    scope: '通用' | '专属';
    status: '生效中' | '已停用';
    ownerId?: string;
    ownerType?: 'platform' | 'creator';
    modelId?: string;
    priority?: number;
    querySources?: QuerySources;
    sourceTemperatures?: SourceTemperatures;
}

export type QuerySources = {
    suppliers: boolean;
    knowledgeBase: boolean;
    publicResources: boolean;
};

export type SourceTemperatures = {
    suppliers: number;
    knowledgeBase: number;
    publicResources: number;
};

export type AIScenarioRules = {
  repetition?: 'none' | 'daily' | 'weekly';
  daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  startsAt?: any; // Firestore Timestamp
  expiresAt?: any; // Firestore Timestamp
  targetUserRoles?: { [key in Role]?: number[] };
  ruleLogic?: 'and' | 'or';
};


export type AIScenario = {
  id: string;
  name: string;
  description: string;
  configuredPromptKey: string;
  // The rules are now nested in a property
  repetition: AIScenarioRules['repetition'];
  daysOfWeek: AIScenarioRules['daysOfWeek'];
  startTime: AIScenarioRules['startTime'];
  endTime: AIScenarioRules['endTime'];
  startsAt: AIScenarioRules['startsAt'];
  expiresAt: AIScenarioRules['expiresAt'];
  targetUserRoles: AIScenarioRules['targetUserRoles'];
  ruleLogic: AIScenarioRules['ruleLogic'];
};

export type MediaAsset = {
  id: string;
  userId: string;
  storagePath: string;
  publicUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: any; // Firestore Timestamp
  analysis?: string; // Result from AI analysis
}
