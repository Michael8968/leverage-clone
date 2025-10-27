import { getStoreKind } from '@/lib/datastore';
import type { User } from '@/lib/types';

export interface ListPagedOptions {
  q?: string; // fuzzy query across name/email
  page?: number; // 1-based
  limit?: number;
  role?: string;
}

export interface ListPagedResult {
  items: User[];
  total: number;
}

export interface UserRepository {
  list(): Promise<User[]>;
  // optional optimized queries; implementations may provide these
  findByEmail?(email: string): Promise<User | null>;
  findByName?(name: string): Promise<User[]>;
  findByUid?(uid: string): Promise<User | null>;
  findByRole?(role: string): Promise<User[]>;
  // pagination + fuzzy search
  listPaged?(opts: ListPagedOptions): Promise<ListPagedResult>;
  // cursor-based pagination: cursor is an opaque string token
  listCursor?(opts: { q?: string; limit?: number; cursor?: string; role?: string }): Promise<{ items: User[]; nextCursor?: string; total?: number }>;
}

export function sanitizeUser(u: any): User {
  // Map TCB/raw document to our User type and strip sensitive fields
  const {
    _id,
    id,
    uid,
    name = '',
    email = '',
    role = 'user',
    avatar = '',
    gender,
    rating,
    status = 'active',
    aiAssistantEnabled,
    alwaysAvailable,
    bio,
    skills,
    createdAt,
    currentQueueSize,
    maxQueueSize,
    assistantRules,
    defaultAssistantPromptKey,
    level = 'New',
    points_balance = 0,
    signup_date,
    last_level_check,
    total_llm_calls = 0,
    // password_hash intentionally omitted
  } = u || {};
  const safe: User = {
    uid: String(uid || _id || id || ''),
    name,
    email,
    role,
    avatar,
    gender,
    rating,
    status,
    aiAssistantEnabled,
    alwaysAvailable,
    bio,
    skills,
    createdAt,
    currentQueueSize,
    maxQueueSize,
    assistantRules,
    defaultAssistantPromptKey,
    level,
    points_balance,
    signup_date,
    last_level_check,
    total_llm_calls,
  };
  return safe;
}

export type RepoKind = 'tcb' | 'json';

export function getUserRepository(): UserRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    // Lazy require to avoid importing Node-only libs on client
    const mod = require('./tcb/users');
    return mod.createTcbUserRepository();
  }
  const jsonMod = require('./json/users');
  return jsonMod.createJsonUserRepository();
}
