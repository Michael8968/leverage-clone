import { getTcbDb } from '@/lib/tcb';
import { generateWithHunyuan, generateWithOpenAI } from '@/ai/hunyuan-client';
import OpenAI from 'openai';

export type PromptExecutionInput = {
  scenario?: string;
  promptKey?: string;
  modelId?: string; // can be llm_connections id or model name
  userId?: string;
  // backward-compatible: accept a raw prompt string or structured messages
  prompt?: string;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
};

export type PromptExecutionOutput = {
  text: string;
  // backward-compatible fields used by older callers
  output?: string;
  cost?: number;
  usage?: any;
  provider?: string;
};

function nowIsWithinWindow(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return true;
  const pad = (s: string) => s.padStart(5, '0');
  const [sh, sm] = pad(startTime).split(':').map(Number);
  const [eh, em] = pad(endTime).split(':').map(Number);
  const cur = new Date();
  const curMinutes = cur.getHours() * 60 + cur.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (startMinutes <= endMinutes) return curMinutes >= startMinutes && curMinutes <= endMinutes;
  // overnight window
  return curMinutes >= startMinutes || curMinutes <= endMinutes;
}

function userMatchesRoles(userId: string | undefined, targetUserRoles: any): boolean {
  // Simplified: if no rules, match. If rules present but no userId, don't match.
  if (!targetUserRoles) return true;
  if (!userId) return false;
  // For now, match by existence (detailed role lookup requires users collection)
  return true;
}

async function fetchScenario(scenarioId: string) {
  const db = getTcbDb();
  try {
    const res = await db.collection('ai_scenarios').get();
    const list = res.data || [];
    return list.find((s: any) => s.id === scenarioId || s._id === scenarioId || s.scenarioId === scenarioId || s.name === scenarioId) || null;
  } catch (e) {
    return null;
  }
}

async function fetchPromptByKey(promptKey: string) {
  const db = getTcbDb();
  try {
    const res = await db.collection('prompts').get();
    const list = res.data || [];
    return list.find((p: any) => p.promptKey === promptKey || p.id === promptKey) || null;
  } catch (e) {
    return null;
  }
}

async function fetchLlmConnectionById(idOrName: string) {
  const db = getTcbDb();
  try {
    const res = await db.collection('llm_connections').get();
    const list = res.data || [];
    return list.find((c: any) => c.id === idOrName || c._id === idOrName || c.modelName === idOrName) || null;
  } catch (e) {
    return null;
  }
}

async function callVendor(conn: any, messages: { role: string; content: string }[], temperature?: number, model?: string) {
  const provider = (conn.provider || '').toLowerCase();
  const apiKey = conn.apiKey;
  const modelName = model || conn.modelName;

  if (!apiKey) throw new Error('API Key missing on LLm connection');

  // OpenAI-compatible clients
  if (provider.includes('openai') || provider.includes('open')) {
    const res = await generateWithOpenAI(messages, { temperature: temperature ?? 0.7, model: modelName });
    return { text: res.text, usage: res.usage, provider: 'openai' };
  }

  if (provider.includes('tencent') || modelName?.toLowerCase().includes('hunyuan')) {
    // Use OpenAI-compatible Hunyuan client via provided apiKey and baseURL
    const baseURL = conn.apiBaseUrl || process.env.HUNYUAN_BASE_URL;
    const client = new OpenAI({ apiKey, baseURL });
  const chat = await client.chat.completions.create({ model: modelName || process.env.HUNYUAN_MODEL || 'hunyuan-turbos-latest', messages: messages as any, temperature: temperature ?? 0.7 });
    const text = chat.choices?.[0]?.message?.content ?? '';
    const usage = chat.usage ? { promptTokens: chat.usage.prompt_tokens, completionTokens: chat.usage.completion_tokens, totalTokens: chat.usage.total_tokens } : undefined;
    return { text, usage, provider: 'hunyuan' };
  }

  // Generic HTTP POST to apiBaseUrl if provided
  if (conn.apiBaseUrl) {
    const res = await fetch(conn.apiBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelName, messages }),
    });
    if (!res.ok) throw new Error(`Vendor request failed: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || data.result || JSON.stringify(data);
    return { text, usage: data.usage, provider: conn.provider };
  }

  throw new Error('Unsupported provider');
}

export async function executePrompt(input: PromptExecutionInput): Promise<PromptExecutionOutput> {
  // 1. Scenario resolution
  let resolvedPromptKey: string | undefined;
  let resolvedModelId: string | undefined;

  if (input.scenario) {
    const scenario = await fetchScenario(input.scenario);
    if (scenario) {
      // time & user rules
      const timeOk = nowIsWithinWindow(scenario.startTime, scenario.endTime);
      const userOk = userMatchesRoles(input.userId, scenario.targetUserRoles);
      const ruleLogic = scenario.ruleLogic || 'and';
      const matched = ruleLogic === 'and' ? (timeOk && userOk) : (timeOk || userOk);
      if (matched && scenario.configuredPromptKey) {
        resolvedPromptKey = scenario.configuredPromptKey;
      }
    }
  }

  // 2. promptKey override
  if (!resolvedPromptKey && input.promptKey) resolvedPromptKey = input.promptKey;

  // 3. fetch prompt if have key
  let promptDoc: any = null;
  if (resolvedPromptKey) {
    promptDoc = await fetchPromptByKey(resolvedPromptKey);
    if (promptDoc) {
      resolvedModelId = promptDoc.modelId || promptDoc.model || undefined;
    }
  }

  // 4. fallback to input.modelId
  if (!resolvedModelId && input.modelId) resolvedModelId = input.modelId;

  // 5. If we have a model id (or model name), fetch connection and call vendor
  if (resolvedModelId) {
    const conn = await fetchLlmConnectionById(resolvedModelId);
    if (conn) {
      // Build messages
      const messages = input.messages && input.messages.length
        ? input.messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: input.prompt || promptDoc?.content || 'Hello' }];
      try {
        const res = await callVendor(conn, messages as any, input.temperature, conn.modelName || resolvedModelId);
        return { text: res.text, output: res.text, usage: res.usage, provider: res.provider };
      } catch (err: any) {
        // If vendor call fails, fall back to Genkit (Hunyuan wrapper)
        console.warn('Vendor call failed, falling back to Hunyuan generate:', err.message || err);
      }
    }
  }

  // Path B: Genkit fallback -> use generateWithHunyuan
  const messages = input.messages && input.messages.length
    ? input.messages.map(m => ({ Role: (m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system') as 'user' | 'system' | 'assistant', Content: m.content }))
    : [{ Role: 'user' as const, Content: input.prompt || promptDoc?.content || 'Hello' }];
  const gen = await generateWithHunyuan({ messages: messages as any, temperature: input.temperature ?? 0.7 });
  return { text: gen.text, output: gen.text, usage: gen.usage, provider: 'hunyuan-fallback' };
}

export default executePrompt;
