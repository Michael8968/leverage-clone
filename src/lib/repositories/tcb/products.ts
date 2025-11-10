
import { db } from '@/lib/tcb';
import type { Product } from '@/lib/types';

const productsCollection = db.collection('products');

export const getProducts = async () => {
  const result = await productsCollection.get();
  return result.data as Product[];
};

export const getProductById = async (id: string) => {
  const result = await productsCollection.doc(id).get();
  return result.data[0] as Product;
};

export const createProduct = async (product: Omit<Product, '_id'>) => {
  return await productsCollection.add(product);
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  return await productsCollection.doc(id).update(updates);
};

export const deleteProduct = async (id: string) => {
  return await productsCollection.doc(id).remove();
};
