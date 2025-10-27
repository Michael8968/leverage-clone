// Shared lightweight types to avoid circular runtime imports
// Use `export type` and `import type` where appropriate to keep these purely type-level.

export type Role = 'admin' | 'creator' | 'supplier' | 'user' | 'guest' | 'suspended';

export type SupplementaryField = {
  id: string;
  key: string;
  value: string;
};

export type TimestampLike = any; // placeholder for Date | string | Firestore Timestamp
