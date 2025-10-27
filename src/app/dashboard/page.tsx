import { AppLayout } from '@/components/app-layout';
import { ShoppingAssistant } from '@/components/features/shopping-assistant';

export default function DashboardPage() {
  return (
    <AppLayout>
      <ShoppingAssistant />
    </AppLayout>
  );
}
