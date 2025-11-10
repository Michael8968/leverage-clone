/**
 * Tencent CloudBase Admin SDK compatibility layer
 * Provides Firebase Admin SDK-like interfaces for TCB operations
 * Supports auth, database (Firestore-like), and storage operations
 */

import { getTcbApp, getTcbDb } from '@/lib/tcb';

// =====================================================================
// Auth Admin Interface
// =====================================================================

/**
 * TCB Auth Admin interface (minimal Firebase Admin Auth compatibility)
 */
class TcbAuthAdmin {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string) {
    // TCB doesn't have a direct "getUser" by UID like Firebase Admin
    // This would typically be fetched from the database or custom user collection
    // For compatibility, return a user object with minimal properties
    console.warn('TCB Auth: getUser() fetches from users collection, not native auth');
    const db = getTcbDb();
    const result = await db.collection('users').doc(uid).get();
    if (!result.data) return null;
    return {
      uid,
      email: result.data[0]?.email,
      displayName: result.data[0]?.name,
      ...result.data[0],
    };
  }

  /**
   * Get user by email (searches users collection)
   */
  async getUserByEmail(email: string) {
    const db = getTcbDb();
    const result = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!result.data || result.data.length === 0) return null;
    const user = result.data[0];
    return {
      uid: user._id || user.id,
      email: user.email,
      displayName: user.name,
      ...user,
    };
  }

  /**
   * Create user (in TCB, this would typically involve creating a user in the users collection)
   */
  async createUser({ email, password, displayName }: any = {}) {
    // TCB doesn't have native user creation like Firebase Admin Auth
    // This is typically handled by custom functions or user collection
    console.warn('TCB Auth: createUser() is not natively supported. Consider using a custom user service.');
    throw new Error('TCB Auth: createUser() requires custom implementation');
  }

  /**
   * Update user (update users collection)
   */
  async updateUser(uid: string, properties: any) {
    const db = getTcbDb();
    await db.collection('users').doc(uid).update(properties);
  }

  /**
   * Delete user (remove from users collection)
   */
  async deleteUser(uid: string) {
    const db = getTcbDb();
    await db.collection('users').doc(uid).remove();
  }

  /**
   * Set custom claims (store in users collection as a field)
   */
  async setCustomUserClaims(uid: string, customClaims: any) {
    const db = getTcbDb();
    await db.collection('users').doc(uid).update({ customClaims });
  }
}

// =====================================================================
// Firestore Admin Interface (Document Store)
// =====================================================================

/**
 * TCB Firestore-like database admin interface
 */
class TcbFirestoreAdmin {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Get a collection reference
   */
  collection(path: string) {
    return new TcbCollectionReference(this.db.collection(path));
  }

  /**
   * Batch write operations
   */
  batch() {
    return new TcbWriteBatch(this.db);
  }

  /**
   * Run a transaction
   */
  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    // TCB transactions are limited; we'll provide a best-effort implementation
    const transaction = {
      set: (ref: any, data: any) => ref.set(data),
      update: (ref: any, data: any) => ref.update(data),
      delete: (ref: any) => ref.remove(),
      get: (ref: any) => ref.get(),
    };
    return await updateFunction(transaction);
  }
}

/**
 * TCB Collection reference (similar to Firestore CollectionReference)
 */
class TcbCollectionReference {
  constructor(private ref: any) {}

  /**
   * Get a document by ID
   */
  doc(id: string) {
    return new TcbDocumentReference(this.ref.doc(id));
  }

  /**
   * Add a new document (auto-generates ID)
   */
  async add(data: any) {
    const result = await this.ref.add(data);
    return new TcbDocumentReference(result);
  }

  /**
   * Query with where clause
   */
  where(field: string, operator: string, value: any) {
    const queryRef = this.ref.where(field, operator, value);
    return new TcbQueryReference(queryRef);
  }

  /**
   * Get all documents in collection
   */
  async get() {
    const result = await this.ref.get();
    return {
      docs: result.data?.map((doc: any) => ({
        id: doc._id || doc.id,
        data: () => doc,
        exists: true,
      })) || [],
      empty: !result.data || result.data.length === 0,
    };
  }
}

/**
 * TCB Document reference
 */
class TcbDocumentReference {
  constructor(private ref: any) {}

  /**
   * Get document data
   */
  async get() {
    const result = await this.ref.get();
    const doc = result.data?.[0];
    return {
      exists: !!doc,
      id: doc?._id || doc?.id,
      data: () => doc,
      ref: this.ref,
    };
  }

  /**
   * Set document data
   */
  async set(data: any, options?: any) {
    if (options?.merge) {
      await this.ref.update(data);
    } else {
      await this.ref.set(data);
    }
  }

  /**
   * Update document data
   */
  async update(data: any) {
    await this.ref.update(data);
  }

  /**
   * Delete document
   */
  async remove() {
    await this.ref.remove();
  }
}

/**
 * TCB Query reference
 */
class TcbQueryReference {
  constructor(private ref: any) {}

  /**
   * Add another where clause
   */
  where(field: string, operator: string, value: any) {
    return new TcbQueryReference(this.ref.where(field, operator, value));
  }

  /**
   * Limit query results
   */
  limit(n: number) {
    return new TcbQueryReference(this.ref.limit(n));
  }

  /**
   * Get query results
   */
  async get() {
    const result = await this.ref.get();
    return {
      docs: result.data?.map((doc: any) => ({
        id: doc._id || doc.id,
        data: () => doc,
        exists: true,
      })) || [],
      empty: !result.data || result.data.length === 0,
      size: result.data?.length || 0,
    };
  }
}

/**
 * TCB Write Batch (similar to Firestore WriteBatch)
 */
class TcbWriteBatch {
  private operations: Array<{ type: string; ref: any; data?: any }> = [];

  constructor(private db: any) {}

  /**
   * Set document in batch
   */
  set(ref: TcbDocumentReference, data: any) {
    this.operations.push({ type: 'set', ref, data });
    return this;
  }

  /**
   * Update document in batch
   */
  update(ref: TcbDocumentReference, data: any) {
    this.operations.push({ type: 'update', ref, data });
    return this;
  }

  /**
   * Delete document in batch
   */
  delete(ref: TcbDocumentReference) {
    this.operations.push({ type: 'delete', ref, data: undefined });
    return this;
  }

  /**
   * Commit all operations
   */
  async commit() {
    for (const op of this.operations) {
      if (op.type === 'set') {
        await (op.ref as any).ref.set(op.data);
      } else if (op.type === 'update') {
        await (op.ref as any).ref.update(op.data);
      } else if (op.type === 'delete') {
        await (op.ref as any).ref.remove();
      }
    }
  }
}

// =====================================================================
// Storage Admin Interface
// =====================================================================

/**
 * TCB Storage Admin interface
 */
class TcbStorageAdmin {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  /**
   * Get storage bucket
   */
  bucket(name?: string) {
    return new TcbStorageBucket(this.app);
  }
}

/**
 * TCB Storage Bucket
 */
class TcbStorageBucket {
  constructor(private app: any) {}

  /**
   * Get file reference
   */
  file(path: string) {
    return new TcbStorageFile(this.app, path);
  }

  get name() {
    return process.env.TCB_STORAGE_BUCKET || 'cloudbase-storage';
  }
}

/**
 * TCB Storage File
 */
class TcbStorageFile {
  constructor(private app: any, private path: string) {}

  /**
   * Get signed URL for upload/download
   */
  async getSignedUrl(options: any) {
    // TCB provides a different mechanism for signed URLs
    // For now, return a placeholder
    console.warn('TCB Storage: getSignedUrl() requires custom implementation');
    const url = `https://tcb-storage.example.com/${this.path}?token=signed`;
    return [url];
  }

  /**
   * Upload file
   */
  async save(data: any, metadata?: any) {
    console.warn('TCB Storage: save() requires custom implementation or Cloud Storage API');
    throw new Error('TCB Storage: save() is not directly supported');
  }

  /**
   * Download file
   */
  async download() {
    console.warn('TCB Storage: download() requires custom implementation');
    throw new Error('TCB Storage: download() is not directly supported');
  }
}

// =====================================================================
// Public API
// =====================================================================

let _authAdmin: TcbAuthAdmin | null = null;
let _firestoreAdmin: TcbFirestoreAdmin | null = null;
let _storageAdmin: TcbStorageAdmin | null = null;

/**
 * Get TCB Auth Admin instance
 */
export function getTcbAuthAdmin(): TcbAuthAdmin {
  if (!_authAdmin) {
    const app = getTcbApp();
    _authAdmin = new TcbAuthAdmin(app);
  }
  return _authAdmin;
}

/**
 * Get TCB Firestore Admin instance
 */
export function getTcbFirestoreAdmin(): TcbFirestoreAdmin {
  if (!_firestoreAdmin) {
    const db = getTcbDb();
    _firestoreAdmin = new TcbFirestoreAdmin(db);
  }
  return _firestoreAdmin;
}

/**
 * Get TCB Storage Admin instance
 */
export function getTcbStorageAdmin(): TcbStorageAdmin {
  if (!_storageAdmin) {
    const app = getTcbApp();
    _storageAdmin = new TcbStorageAdmin(app);
  }
  return _storageAdmin;
}

/**
 * Convenience functions (drop-in replacements for Firebase Admin)
 */
export function auth() {
  return getTcbAuthAdmin();
}

export function firestore() {
  return getTcbFirestoreAdmin();
}

export function storage() {
  return getTcbStorageAdmin();
}
