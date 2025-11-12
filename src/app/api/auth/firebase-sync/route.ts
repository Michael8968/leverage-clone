
import { NextResponse } from 'next/server';

// Deprecated endpoint; Firebase has been fully removed from the stack.
export async function POST() {
  return NextResponse.json({ error: 'firebase-sync is deprecated and removed.' }, { status: 410 });
}
