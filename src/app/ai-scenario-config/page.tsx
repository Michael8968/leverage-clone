
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Puzzle, Edit, Workflow } from 'lucide-react';
import { useState } from 'react';

// This is a placeholder for the real configuration data that will come from Firestore.
const placeholderScenarios = [
  {
    id: 'shopping_assistant',
    name: 'AI购物助手 - 商品推荐',
    description: '在用户输入模糊需求后，负责分析用户画像并推荐商品的默认行为。',
    configuredPromptKey: 'default_recommendation_flow',
    configuredPromptName: '默认推荐流程',
  },
  {
    id: 'demand_matching',
    name: '需求池 - 创意匹配',
    description: '在需求池中，为指定的需求匹配最合适的创意方（产品或供应商）。',
    configuredPromptKey: 'default_creative_matching',
    configuredPromptName: '默认创意匹配流程',
  },
  {
    id: 'chat_ai_assistant',
    name: '聊天对话 - AI助理',
    description: '在供需双方的聊天中，辅助创意者向用户提出澄清问题。',
    configuredPromptKey: 'clarify-demand-details-v1',
    configuredPromptName: '需求细节澄清',
  },
];

export default function AIScenarioConfigPage() {
  // In the future, this state will be managed with data from Firestore.
  const [scenarios, setScenarios] = useState(placeholderScenarios);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
          <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
            <Puzzle />
            AI 场景配置
          </h1>
          <p className="text-muted-foreground">为平台中不同的AI功能场景，配置默认使用的提示词（Prompt）。</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">功能场景列表</CardTitle>
            <CardDescription>
              以下是平台中所有可配置的AI应用场景。您可以为每个场景指定一个默认的提示词，系统在执行相应功能时将优先使用此配置。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AI功能场景</TableHead>
                  <TableHead>当前配置的提示词</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow key={scenario.id}>
                    <TableCell>
                      <p className="font-medium">{scenario.name}</p>
                      <p className="text-xs text-muted-foreground">{scenario.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit">
                          <Workflow className="mr-1.5 h-3 w-3" />
                          {scenario.configuredPromptName}
                        </Badge>
                        <p className="font-mono text-xs text-muted-foreground/80">{scenario.configuredPromptKey}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
