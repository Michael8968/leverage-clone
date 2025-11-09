
import { db } from '@/lib/tcb';

// A basic type for the LLM Connection. This should be expanded based on the actual data model.
export interface LlmConnection {
  _id: string;
  provider: string; 
  model: string; 
  apiKey: string;
  apiBaseUrl?: string;
}

const llmConnectionsCollection = db.collection('llm_connections');

/**
 * Fetches all available LLM connections from the database.
 * @returns A promise that resolves to an array of LLM connections.
 */
export const getLlmConnections = async (): Promise<LlmConnection[]> => {
  try {
    const result = await llmConnectionsCollection.get();
    return result.data as LlmConnection[];
  } catch (error) {
    console.error('Failed to fetch LLM connections:', error);
    return [];
  }
};
