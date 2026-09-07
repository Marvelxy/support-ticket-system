import type { AiProvider, ClassifyResult } from './types.js';
import { ruleBasedProvider } from './ruleBased.js';

// Local Ollama - 100% free. Tested on 16GB Intel with llama3.2:3b.
// Expects Ollama running: `ollama serve` + `ollama pull llama3.2:3b`
export function createOllamaProvider(
  url = process.env.OLLAMA_URL || 'http://localhost:11434',
  model = process.env.OLLAMA_MODEL || 'llama3.2:3b',
): AiProvider {
  return {
    name: 'ollama',
    async classify(title: string, body: string): Promise<ClassifyResult> {
      try {
        const prompt = `Classify this support ticket. Reply ONLY valid JSON with keys: category (billing|technical|account|feature_request|general), priority (critical|high|medium|low), confidence (0-1), summary (1 sentence), suggestedReply (2 sentences).\n\nTitle: ${title}\nBody: ${body}`;
        const res = await fetch(`${url}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: { temperature: 0.2, num_ctx: 4096 },
          }),
        });
        if (!res.ok) throw new Error(`ollama ${res.status}`);
        const data = (await res.json()) as { response?: string };
        const jsonText = (data.response || '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(
          jsonText.slice(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1),
        );
        return { ...parsed, provider: 'ollama' };
      } catch {
        const fallback = await ruleBasedProvider.classify(title, body);
        return { ...fallback, provider: 'ollama-fallback-rule' };
      }
    },
  };
}
