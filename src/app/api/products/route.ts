
import { NextResponse } from 'next/server';
import * as z from 'zod';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/repositories/tcb/products';

// GET /api/products - Fetches all products
// GET /api/products?id={id} - Fetches a single product by ID
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const product = await getProductById(id);
      if (!product) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product);
    } else {
      const products = await getProducts();
      return NextResponse.json(products);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products - Creates a new product
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().gt(0),
      category: z.string().optional(),
      supplierId: z.string().optional(),
      creatorId: z.string().optional(),
      images: z.array(z.any()).optional(),
      details: z.array(z.any()).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.format() }, { status: 400 });
    }

    const result = await createProduct(parsed.data);
    return NextResponse.json({ id: result.id, ...parsed.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// PUT /api/products?id={id} - Updates an existing product
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    // Optional schema for updates
    const schema = z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        price: z.number().gt(0).optional(),
        category: z.string().optional(),
        supplierId: z.string().optional(),
        creatorId: z.string().optional(),
      }).partial();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.format() }, { status: 400 });
    }

    await updateProduct(id, parsed.data);
    return NextResponse.json({ message: 'Product updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products?id={id} - Deletes a product by ID
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
    }

    try {
        await deleteProduct(id);
        return NextResponse.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
