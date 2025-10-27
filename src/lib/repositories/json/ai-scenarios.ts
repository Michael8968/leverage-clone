import type { AiScenariosRepository } from '@/lib/repositories/ai-scenarios';
import type { AIScenario } from '@/lib/types';
import path from 'path';
import { promises as fs } from 'fs';

function mapPromptToScenario(p: any): AIScenario {
  return {
    id: String(p.id || p.promptKey),
    name: p.name || p.promptKey || '未命名场景',
    description: p.description || '',
    configuredPromptKey: p.promptKey || '',
    tags: p.scope ? [p.scope] : [],
  };
}

export function createJsonAiScenariosRepository(): AiScenariosRepository {
  return {
    async list() {
      try {
        const file = path.join(process.cwd(), 'data', 'prompts.json');
        const raw = await fs.readFile(file, 'utf-8');
        const prompts = JSON.parse(raw);
        const scenarios: AIScenario[] = Array.isArray(prompts)
          ? prompts.map(mapPromptToScenario)
          : [];
        return scenarios;
      } catch {
        return [];
      }
    },
  };
}
