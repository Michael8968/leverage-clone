declare module '@/lib/cloudbase-compat' {
  export type DocumentSnapshot<T = any> = {
    id?: string;
    // Firestore provides exists() as a callable method
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

  export function collection(name: string): any;
  export function doc(coll: string, id: string): any;
  export function getDocs<T = any>(collRef: any): Promise<QuerySnapshot<T>>;
  export function getDoc<T = any>(docRef: any): Promise<DocumentSnapshot<T>>;
  export function addDoc(collRef: any, data: any): Promise<any>;
  export function setDoc(docRef: any, data: any): Promise<any>;
  export function updateDoc(docRef: any, data: any): Promise<any>;
  export function deleteDoc(docRef: any): Promise<any>;
  export function writeBatch(db?: any): any;
  export function query(...args: any[]): any;
  export function where(...args: any[]): any;
  export function orderBy(...args: any[]): any;
  export function limit(n: number): any;
  export function runTransaction(...args: any[]): Promise<any>;
  export function onSnapshot<T = any>(ref: any, cb: (snap: DocumentSnapshot<T> | QuerySnapshot<T> | null) => void): () => void;
  export const TcbTimestamp: {
    now: () => Date;
    fromDate: (d: Date) => Date;
    fromMillis: (ms: number) => Date;
    toDate?: (t: any) => Date | undefined;
  };
  export function serverTimestamp(): Date;
  export const Timestamp: {
    now: () => Date;
    fromDate: (d: Date) => Date;
    fromMillis: (ms: number) => Date;
    toDate?: (t: any) => Date | undefined;
  };
  export function increment(n: number): any;
  export function arrayUnion(...items: any[]): any;
  export function arrayRemove(...items: any[]): any;
  export const db: any;
}

// also allow bare import of cloudbase-compat
declare module 'src/lib/cloudbase-compat' {
  export * from '@/lib/cloudbase-compat';
}
