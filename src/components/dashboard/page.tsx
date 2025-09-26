import { AppLayout } from '@/components/app-layout';
import { ShoppingAssistant } from '@/components/features/shopping-assistant';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as React from 'react';

export default function DashboardPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8">
        <div className="lg:col-span-2">
          <ShoppingAssistant />
        </div>
        <div className="hidden lg:block">
            <Card>
                <CardHeader>
                    <CardTitle>日历预览</CardTitle>
                </CardHeader>
                <CardContent>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                    />
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
