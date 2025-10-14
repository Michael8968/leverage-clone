

import type { SupplementaryField } from "@/components/features/supplementary-fields-manager";
import type { Role } from "@/store/auth";
import type { Timestamp } from 'firebase/firestore';

export type Demand = {
  id: string;
  type: 'public' | 'private';
  title: string;
  description:string;
  category: string;
  budget: number;
  status: '开放中' | '进行中' | '已完成';
  createdAt: any; // Can be Date, string, or Firestore Timestamp
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
  mediaAssetId?: string; // To link with the media_assets collection for analysis
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
  details?: SupplementaryField[]; // For product-specific specifications
  creatorId?: string;
  createdAt?: any; // Can be Date, string, or Firestore Timestamp
  status?: '审核中' | '已入库' | '需要修改';
  imageUrl?: string; // Main image
  thumbnailUrl?: string; // Small image
  images?: ProductImage[]; // For multiple product images with views
};

export type Supplier = {
  id: string;
  name:string;
  shortName?: string | null;
  region?: string | null;
  address?: string | null;
  establishedDate?: any; // Can be Date, string, or Firestore Timestamp or null
  registeredCapital?: string | null;
  creditCode?: string | null;
  email?: string;
  supplementaryFields?: SupplementaryField[];
  category?: string; // Added to satisfy schema, populated from name.
  matchScore?: number;
}

export type UserProfile = {
  summary: string;
  tags: string[];
};

// Represents a rule for when a creator's AI assistant should use a specific prompt.
export type AssistantRule = {
    id: string;
    name: string;
    priority: number;
    // Conditions for the rule to be active
    conditions: {
        ruleLogic: 'and' | 'or';
        // Time-based conditions
        repetition?: 'none' | 'daily' | 'weekly';
        daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
        startTime?: string; // HH:mm format
        endTime?: string; // HH:mm format
        startsAt?: any; // Can be Date, string, or Firestore Timestamp
        expiresAt?: any; // Can be Date, string, or Firestore Timestamp
        targetUserRoles?: { [key in Role]?: number[] };
    };
    // Action to take when conditions are met
    action: {
        type: 'use_prompt';
        promptKey: string; // The key of the prompt to use
    };
}

export type User = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  gender?: 'male' | 'female' | 'other';
  rating?: number;
  status?: 'active' | 'inactive' | 'suspended';
  aiAssistantEnabled?: boolean;
  alwaysAvailable?: boolean;
  bio?: string;
  skills?: string[];
  createdAt?: any; // Can be Date, string, or Firestore Timestamp
  currentQueueSize?: number;
  maxQueueSize?: number;
  assistantRules?: AssistantRule[];
  defaultAssistantPromptKey?: string;
  // New fields for points system
  level: 'New' | 'Regular' | 'Pro';
  points_balance: number;
  signup_date: any; // Can be Date, string, or Firestore Timestamp
  last_level_check: any; // Can be Date, string, or Firestore Timestamp
  total_llm_calls: number;
};

// Chat-related types
export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: any; // Can be Date, string, or Firestore Timestamp
  isAIMessage?: boolean;
};

export type Chat = {
  id: string; // Corresponds to demandId
  messages: ChatMessage[];
  participants: string[]; // Array of user UIDs
};

export type TestResultStatus = 'untested' | 'success' | 'failed' | 'testing';

export interface LlmConnection {
    id: string;
    modelName: string;
    provider: string;
    apiKey: string;
    priority: number;
    status: '活跃' | '已禁用';
    scope?: '通用' | '专属';
    category?: '文本' | '图像' | '多模态' | '推理';
    lastTestStatus?: 'success' | 'failed' | 'untested';
    lastTestTimestamp?: any; // Can be Date, string, or Firestore Timestamp
    createdAt?: any; // Can be Date, string, or Firestore Timestamp
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
    createdAt?: any; // Can be Date, string, or Firestore Timestamp
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
  startsAt?: any; // Can be Date, string, or Firestore Timestamp
  expiresAt?: any; // Can be Date, string, or Firestore Timestamp
  targetUserRoles?: { [key in Role]?: number[] };
  ruleLogic?: 'and' | 'or';
};


export type AIScenario = {
  id: string;
  name: string;
  description: string;
  configuredPromptKey: string;
  tags?: string[];
  repetition?: AIScenarioRules['repetition'];
  daysOfWeek?: AIScenarioRules['daysOfWeek'];
  startTime?: AIScenarioRules['startTime'];
  endTime?: AIScenarioRules['endTime'];
  startsAt?: AIScenarioRules['startsAt'];
  expiresAt?: AIScenarioRules['expiresAt'];
  targetUserRoles?: AIScenarioRules['targetUserRoles'];
  ruleLogic?: AIScenarioRules['ruleLogic'];
};

export type MediaAsset = {
  id: string;
  userId: string;
  storagePath: string;
  publicUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: any; // Can be Date, string, or Firestore Timestamp
  analysis?: string; // Result from AI analysis
}

export interface Resource {
    id: string;
    name: string;
    sourceUrl: string;
    category: string;
    tags: string[];
    updateFrequency: '实时' | '每日' | '每周' | '每月';
    status: '可用' | '已停用';
    createdAt?: any; // Can be Date, string, or Firestore Timestamp
    matchScore?: number;
    recommendation?: string;
    apiKey?: string;
}

// New types for Appointment scheduling
export interface Availability {
  creatorId: string;
  slots: Timestamp[]; // Array of Firestore Timestamps
}

export interface Appointment {
  id: string;
  creatorId: string;
  requesterId: string;
  requesterName: string;
  appointmentTime: any; // Can be Date, string, or Firestore Timestamp
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  createdAt: any; // Can be Date, string, or Firestore Timestamp
}

// New types for Intelligent Routing Strategy
export type DecisionFactor = {
    id: string;
    name: string;
    description: string;
    icon: string; // Lucide icon name
};

export type StrategyRule = {
    id: string;
    name: string;
    priority: number;
    conditions: {
        ruleLogic: 'and' | 'or';
        repetition?: 'none' | 'daily' | 'weekly';
        daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
        startTime?: string;
        endTime?: string;
        startsAt?: any; // Can be Date, string, or Firestore Timestamp
        expiresAt?: any; // Can be Date, string, or Firestore Timestamp
        targetUserRoles?: { [key in Role]?: number[] };
    };
    actions: {
        type: 'apply_weights'; // For now, only this type
        factorTemperatures?: { [key: string]: number };
    } | {
        type: 'force_route';
        target: 'designer' | 'skill_group';
        targetId: string;
    } | {
        type: 'force_ai';
    };
};

export interface IntelligentRoutingStrategy {
    id: 'main_strategy'; // Singleton document
    strategyText: string;
    factors: DecisionFactor[];
    factorTemperatures: { [key: string]: number; };
    advancedRules: StrategyRule[];
    updatedAt: any; // Can be Date, string, or Firestore Timestamp
}

// New types for Points and Payment System
export interface PointsTransaction {
    id: string;
    uid: string;
    type: 'gift' | 'deduct' | 'manual' | 'renewal' | 'recharge';
    amount: number; // Can be positive or negative
    reason: string;
    timestamp: any; // Can be Date, string, or Firestore Timestamp
    llm_action?: string; // e.g., 'chat_message', 'ai_match'
    batchId?: string; // To group manual grant operations
    status?: 'pending' | 'approved' | 'rejected' | 'revoked'; // For approval workflow
    approvers?: string[]; // Array of admin UIDs who approved
}

export interface PaymentOrder {
    id: string; // out_trade_no
    uid: string;
    amount_rpb: number;
    points_to_add: number;
    status: 'pending' | 'paid' | 'failed' | 'proof_uploaded';
    type: 'alipay' | 'wechat' | 'bank';
    timestamp: any; // Can be Date, string, or Firestore Timestamp
    proof_url?: string; // GS path for bank transfer proof
}

export type PricingRule = {
    id: string;
    name: string;
    priority: number;
    conditions: {
        ruleLogic: 'and' | 'or';
        repetition?: 'none' | 'daily' | 'weekly';
        daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
        startTime?: string;
        endTime?: string;
        startsAt?: any; // Can be Date, string, or Firestore Timestamp
        expiresAt?: any; // Can be Date, string, or Firestore Timestamp
        targetUserRoles?: { [key in Role]?: number[] };
    };
    action: {
        type: 'per_call' | 'per_minute' | 'free' | 'add' | 'subtract';
        value: number; 
    };
}

export interface PointsConfig {
    defaultPricing: {
        [key: string]: number;
    };
    rules: {
        [action: string]: PricingRule[];
    }
}

export type TokenConversionConfig = {
    [key: string]: any;
    tokens_per_point?: number;
    actions?: {
        [key: string]: number;
    }
}


export type RoleGiftsConfig = {
    [key: string]: number; // e.g. "user_new": 5000
};


export interface BillingStatement {
    id: string;
    uid: string;
    month: string; // YYYY-MM
    totalConsumption: number;
    transactions: PointsTransaction[];
    invoice_status: '未开票' | '已开票' | '已作废';
    invoice_id?: string;
    generatedAt: any; // Can be Date, string, or Firestore Timestamp
}

export interface PointsApprovalConfig {
    approverUids: string[];
}
