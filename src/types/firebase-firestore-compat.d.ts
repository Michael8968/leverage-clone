// Temporary compatibility shim to ease migration from Firebase Firestore to CloudBase
// This file intentionally declares wide 'any' signatures for common Firestore APIs
// so we can incrementally replace call sites without being blocked by overload/type errors.

declare module 'firebase/firestore' {
  export type DocumentData = any;
  export type Query = any;
  export type CollectionReference<T = any> = any;
  export type DocumentReference<T = any> = any;
  export type WhereFilterOp = any;

  export type DocumentSnapshot<T = any> = {
    id?: string;
    exists: () => boolean;
    data: () => T | undefined;
    get?: (field: string) => any;
  };

  export type QuerySnapshot<T = any> = {
    data: T[];
    docs: Array<DocumentSnapshot<T>>;
    forEach: (cb: (doc: DocumentSnapshot<T>) => void) => void;
    empty?: boolean;
    size?: number;
  };

  export type TimestampLike = Date | number | { toDate?: () => Date };

  export function collection(...args: any[]): any;
  export function doc(...args: any[]): any;
  export function getDocs<T = any>(...args: any[]): Promise<QuerySnapshot<T>>;
  export function getDoc<T = any>(...args: any[]): Promise<DocumentSnapshot<T>>;
  export function addDoc(...args: any[]): Promise<any>;
  export function setDoc(...args: any[]): Promise<any>;
  export function updateDoc(...args: any[]): Promise<any>;
  export function deleteDoc(...args: any[]): Promise<any>;
  export function query(...args: any[]): any;
  export function where(...args: any[]): any;
  export function orderBy(...args: any[]): any;
  export function limit(...args: any[]): any;
  export function serverTimestamp(...args: any[]): Date;
  export function runTransaction(...args: any[]): Promise<any>;
  export function onSnapshot<T = any>(ref: any, cb: (snap: DocumentSnapshot<T> | QuerySnapshot<T> | null) => void): () => void;
  export function increment(n: number): any;
  export function writeBatch(...args: any[]): any;
  export const TcbTimestamp: {
    now: () => Date;
    fromDate: (d: Date) => Date;
    fromMillis: (ms: number) => Date;
    toDate?: (t: any) => Date | undefined;
  };
  export function arrayUnion(...args: any[]): any;
  export function arrayRemove(...args: any[]): any;
  export const Timestamp: {
    now: () => Date;
    fromDate: (d: Date) => Date;
    fromMillis: (ms: number) => Date;
    toDate?: (t: any) => Date | undefined;
  };
}

// Also cover imports that may come from the firebase package paths
declare module 'firebase/firestore/lite' {
  export * from 'firebase/firestore';
}

declare module '@firebase/firestore' {
  export * from 'firebase/firestore';
}

// Allow importing without module path (some files import from 'firebase/firestore' or from '@/lib/cloudbase-compat')
declare module 'firebase' {
  export * from 'firebase/firestore';
}
