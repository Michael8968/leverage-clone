
import { AppLayout } from '@/components/app-layout';
import { DesignersClient } from '@/components/features/designers-client';
import { getDesigners } from '@/ai/flows/user-management-flows';
import type { User } from '@/lib/types';

async function getInitialDesigners() {
    try {
        const { designers } = await getDesigners();
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

// 强制动态渲染，避免构建期 SSG 对 no-store fetch 报错
export const dynamic = 'force-dynamic';
export const revalidate = 0;
