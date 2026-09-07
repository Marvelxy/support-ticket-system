import type { AiProvider, ClassifyResult } from './types.js';
import { ruleBasedProvider } from './ruleBased.js';

// Gemini via AI Studio (free, no card). Best quality + long context.
// Docs: aistudio.google.com - model gemini-2.5-flash
export function createGeminiProvider(): AiProvider {
  return {
    name: 'gemini',
    async classify(title: string, body: string): Promise<ClassifyResult> {
      const key = process.env.GEMINI_API_KEY;
      if (!key)
        return {
          ...(await ruleBasedProvider.classify(title, body)),
          provider: 'gemini-missing-key-rule',
        };
      try {
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
              contents: [
                {
                  parts: [
                    {
                      text: `Classify support ticket as JSON {category, priority, confidence, summary, suggestedReply}. category=billing|technical|account|feature_request|general, priority=critical|high|medium|low.\nTitle: ${title}\nBody: ${body}`,
                    },
                  ],
                },
              ],
            }),
          },
        );
        if (!res.ok) throw new Error(`gemini ${res.status}`);
        const data = (await res.json()) as {
          candidates: { content: { parts: { text: string }[] } }[];
        };
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
        return { ...parsed, provider: 'gemini' };
      } catch {
        const fallback = await ruleBasedProvider.classify(title, body);
        return { ...fallback, provider: 'gemini-fallback-rule' };
      }
    },
  };
}
