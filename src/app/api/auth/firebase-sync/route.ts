
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { db } from '@/lib/tcb';
import type { User } from '@/lib/types';

// --- Initialize Firebase Admin SDK ---
// This service account key is essential for backend Firebase operations.
// IMPORTANT: Store this sensitive JSON data securely in an environment variable.
const serviceAccount = JSON.parse(
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON || '{}'
);

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com` // Optional: for Realtime Database
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
  }
} else {
  // console.log("Firebase Admin SDK already initialized.");
}

export async function POST(request: Request) {
  // In development, this endpoint exchanges a Firebase ID token for a TCB user profile.
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is for development use only.' },
      { status: 403 }
    );
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify the ID token using the Firebase Admin SDK.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
    }

    // Check if the user already exists in the TCB 'users' collection.
    // In TCB, the primary key is often `_id`, so we check that first.
    // We also check by `email` as a fallback.
    const userQuery = db.collection('users').where(
      db.command.or([
        { _id: uid }, // Check if TCB _id matches Firebase uid
        { email: email } // Check if email matches
      ])
    );
    
    const userRes = await userQuery.get();

    let user: User;

    if (userRes.data && userRes.data.length > 0) {
      // User exists, return the existing user profile.
      user = userRes.data[0] as User;
      console.log(`Found existing TCB user for email: ${email}`);
    } else {
      // User does not exist, create a new user profile in TCB.
      console.log(`No TCB user found for email: ${email}. Creating new user...`);
      const newUser: Omit<User, '_id'> = {
        uid: uid, // Use Firebase UID
        email: email,
        name: name || email.split('@')[0], // Use name from token or generate from email
        avatar: picture || '', // Use picture from token or a default
        role: 'user', // Default role
        status: 'active', // Default status
        createdAt: new Date(),
      };

      const addUserRes = await db.collection('users').add(newUser);
      
      if (!addUserRes.id && !addUserRes.insertedId) {
        throw new Error('Failed to create new user in TCB.');
      }

      user = {
        _id: addUserRes.id || addUserRes.insertedId!,
        ...newUser,
      };
      console.log(`Successfully created new TCB user with _id: ${user._id}`);
    }

    // Return the full TCB user profile.
    return NextResponse.json({ user });

  } catch (error: any) {
    console.error('API Error in firebase-sync:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
