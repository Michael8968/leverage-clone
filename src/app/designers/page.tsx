
import { AppLayout } from '@/components/app-layout';
import { DesignersClient } from '@/components/features/designers-client';
import { getDesigners } from '@/ai/flows/user-management-flows';
import type { User } from '@/lib/types';

async function getInitialDesigners() {
    try {
        const { designers } = await getDesigners(null);
        return designers as User[];
    } catch (error) {
        console.error("Failed to fetch initial designers on the server:", error);
        return [];
    }
}

export default async function DesignersPage() {
    const initialDesigners = await getInitialDesigners();

    return (
        <AppLayout>
            <DesignersClient initialDesigners={initialDesigners} />
        </AppLayout>
    );
}
