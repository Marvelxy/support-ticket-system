import type { AiProvider, ClassifyResult } from './types.js';
import { ruleBasedProvider } from './ruleBased.js';

// Groq hosted free tier (no card). OpenAI-compatible: https://api.groq.com/openai/v1
// Free: ~30 RPM, 1000 req/day on llama-3.1-8b. Best for short classify calls.
export function createGroqProvider(): AiProvider {
  return {
    name: 'groq',
    async classify(title: string, body: string): Promise<ClassifyResult> {
      const key = process.env.GROQ_API_KEY;
      if (!key)
        return {
          ...(await ruleBasedProvider.classify(title, body)),
          provider: 'groq-missing-key-rule',
        };
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You classify support tickets. Reply ONLY JSON: {category, priority, confidence, summary, suggestedReply}. category=billing|technical|account|feature_request|general, priority=critical|high|medium|low.',
              },
              { role: 'user', content: `Title: ${title}\nBody: ${body}` },
            ],
          }),
        });
        if (!res.ok) throw new Error(`groq ${res.status}`);
        const data = (await res.json()) as { choices: { message: { content: string } }[] };
        const parsed = JSON.parse(data.choices[0].message.content);
        return { ...parsed, provider: 'groq' };
      } catch {
        const fallback = await ruleBasedProvider.classify(title, body);
        return { ...fallback, provider: 'groq-fallback-rule' };
      }
    },
  };
}
