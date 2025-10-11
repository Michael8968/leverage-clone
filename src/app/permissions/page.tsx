import { AppLayout } from '@/components/app-layout';
import { UserManagementClient } from '@/components/features/user-management-client';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Frown } from 'lucide-react';
import { auth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

async function getUsers() {
    try {
        const usersSnapshot = await getDocs(query(collection(db, 'users')));
        const usersData = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                uid: doc.id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
                last_level_check: data.last_level_check instanceof Timestamp ? data.last_level_check.toDate().toISOString() : null,
                signup_date: data.signup_date instanceof Timestamp ? data.signup_date.toDate().toISOString() : null,
            } as User;
        });
        return usersData;
    } catch (error) {
        console.error("Failed to fetch users on server:", error);
        return [];
    }
}

async function getCurrentUser() {
    try {
        const sessionCookie = cookies().get('__session')?.value;
        if (!sessionCookie) return null;
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
        if (userDoc.exists()) {
             const data = userDoc.data();
             // **CRITICAL FIX**: Serialize all Timestamp objects before returning from Server Component.
             return {
                uid: userDoc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
                last_level_check: data.last_level_check instanceof Timestamp ? data.last_level_check.toDate().toISOString() : null,
                signup_date: data.signup_date instanceof Timestamp ? data.signup_date.toDate().toISOString() : null,
             } as User;
        }
        return null;
    } catch (error) {
        console.error("Failed to get current user on server:", error);
        return null;
    }
}

function PermissionsPageSkeleton() {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
            </header>
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}

function RestrictedAccess() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Frown className="w-16 h-16 mb-4 text-destructive" />
            <h2 className="text-2xl font-bold font-headline mb-2">访问受限</h2>
            <p className="text-muted-foreground">此页面仅对管理员开放。</p>
        </div>
    );
}

export default async function PermissionsPage() {
    // Fetching data on the server
    const initialUsers = await getUsers();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'admin') {
        return <AppLayout><RestrictedAccess /></AppLayout>;
    }

    return (
        <AppLayout>
            <Suspense fallback={<PermissionsPageSkeleton />}>
                {/* Passing serialized data to the Client Component */}
                <UserManagementClient initialUsers={initialUsers} currentUser={currentUser} />
            </Suspense>
        </AppLayout>
    );
}
