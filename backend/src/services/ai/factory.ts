import type { AiProvider } from './types.js';
import { ruleBasedProvider } from './ruleBased.js';
import { createOllamaProvider } from './ollama.js';
import { createGroqProvider } from './groq.js';
import { createGeminiProvider } from './gemini.js';

// AI_PROVIDER=rule | ollama | groq | gemini (default rule = zero-config)
// All providers degrade to rule-based on error/429 so demo never breaks.
export function getAiProvider(): AiProvider {
  const name = (process.env.AI_PROVIDER || 'rule').toLowerCase();
  if (name === 'ollama') return createOllamaProvider();
  if (name === 'groq') return createGroqProvider();
  if (name === 'gemini') return createGeminiProvider();
  return ruleBasedProvider;
}

export function slaDueAt(priority: string): Date {
  const hours =
    priority === 'critical' ? 1 : priority === 'high' ? 4 : priority === 'medium' ? 8 : 24;
  return new Date(Date.now() + hours * 3600 * 1000);
}
