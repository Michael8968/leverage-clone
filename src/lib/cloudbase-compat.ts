/**
 * @file src/lib/cloudbase-compat.ts
 * @description Firebase Firestore compatibility layer for TCB.
 * This file provides a drop-in replacement for Firebase Firestore SDK.
 */

import { getDb } from './services/db';

// Re-export a Firestore-compatible handle
export const firestore = getDb();

// Mock Firebase app for compatibility
export const app = {
  firestore: () => getDb(),
};

// Mock getFirestore function
export function getFirestore(app?: any) {
  return getDb();
}

// Mock initializeApp
export function initializeApp(config: any) {
  console.log('[CloudBase Compat] Mock initializeApp called with config:', config);
  return app;
}

// Mock getApps/getApp
export function getApps() {
  return [app];
}

export function getApp() {
  return app;
}

// Firestore-compatible functions
export function collection(path: string) {
  return getDb().collection(path);
}

export function doc(path: string) {
  const parts = path.split('/');
  if (parts.length === 2) {
    return getDb().collection(parts[0]).doc(parts[1]);
  }
  throw new Error('Invalid document path');
}

export function getDocs(query: any) {
  return query.get();
}

export function getDoc(ref: any) {
  return ref.get();
}

export function addDoc(collectionRef: any, data: any) {
  return collectionRef.add(data);
}

export function setDoc(docRef: any, data: any, options?: any) {
  if (options?.merge) {
    return docRef.update(data);
  }
  return docRef.set(data);
}

export function updateDoc(docRef: any, data: any) {
  return docRef.update(data);
}

export function deleteDoc(docRef: any) {
  return docRef.remove();
}

export function query(collectionRef: any, ...queryConstraints: any[]) {
  let q = collectionRef;
  queryConstraints.forEach(constraint => {
    if (constraint._where) {
      q = q.where(constraint._where.field, constraint._where.op, constraint._where.value);
    } else if (constraint._orderBy) {
      q = q.orderBy(constraint._orderBy.field, constraint._orderBy.direction);
    } else if (constraint._limit) {
      q = q.limit(constraint._limit);
    }
  });
  return q;
}

export function where(field: string, op: string, value: any) {
  return {
    _where: { field, op, value },
    type: 'where'
  };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return {
    _orderBy: { field, direction },
    type: 'orderBy'
  };
}

export function limit(n: number) {
  return {
    _limit: n,
    type: 'limit'
  };
}

export function serverTimestamp() {
  return new Date();
}

export function onSnapshot(ref: any, callback: Function) {
  // TCB doesn't have real-time listeners like Firestore
  // This is a mock implementation
  console.warn('[CloudBase Compat] onSnapshot is not fully supported in TCB. Real-time updates are not available.');
  return () => {}; // Return unsubscribe function
}

export function writeBatch() {
  // TCB doesn't have batch operations like Firestore
  // This is a mock implementation
  console.warn('[CloudBase Compat] writeBatch is not supported in TCB.');
  return {
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {}
  };
}

export function arrayUnion(...values: any[]) {
  return { _arrayUnion: values };
}

export function arrayRemove(...values: any[]) {
  return { _arrayRemove: values };
}

export function increment(n: number) {
  return { _increment: n };
}

export function runTransaction(updateFunction: Function) {
  // TCB doesn't support transactions like Firestore
  console.warn('[CloudBase Compat] runTransaction is not supported in TCB.');
  return updateFunction();
}

// Timestamp compatibility
export const Timestamp = {
  now: () => new Date(),
  fromDate: (date: Date) => date,
  fromMillis: (ms: number) => new Date(ms),
  toDate: (timestamp: any) => timestamp instanceof Date ? timestamp : new Date(timestamp)
};

export const TcbTimestamp = Timestamp;