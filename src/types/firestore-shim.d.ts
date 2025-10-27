// Temporary Firestore type shim to reduce tsc noise during CloudBase migration
// This file intentionally declares common Firestore functions and overloads as any
// backed by our compat adapter. Remove this shim once all call-sites are migrated.

declare module '@/lib/cloudbase-compat' {
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

  export const Timestamp: {
    now: () => Date;
    fromDate: (d: Date) => Date;
    fromMillis: (ms: number) => Date;
    toDate?: (t: any) => Date | undefined;
  };

  export function collection(...args: any[]): any;
  export function doc(...args: any[]): any;
  export function getDocs<T = any>(...args: any[]): Promise<QuerySnapshot<T>>;
  export function getDoc<T = any>(...args: any[]): Promise<DocumentSnapshot<T>>;
  export function addDoc(...args: any[]): Promise<any>;
  export function setDoc(...args: any[]): Promise<any>;
  export function updateDoc(...args: any[]): Promise<any>;
  export function deleteDoc(...args: any[]): Promise<any>;
  export function writeBatch(...args: any[]): any;
  export function serverTimestamp(...args: any[]): Date;
  export const increment: any;
  export const arrayUnion: any;
  export const arrayRemove: any;
}
