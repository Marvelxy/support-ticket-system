import type { AiProvider, Category, ClassifyResult, Priority } from './types.js';

// Zero-dependency fallback. Always works, even with no AI key / no Ollama.
// Also used when hosted providers hit 429 rate limits.
export const ruleBasedProvider: AiProvider = {
  name: 'rule',
  async classify(title: string, body: string): Promise<ClassifyResult> {
    const text = `${title} ${body}`.toLowerCase();

    let category: Category = 'general';
    if (/bill|invoice|charge|refund|payment/.test(text)) {
      category = 'billing';
    } else if (/login|password|account|signup|access|permission/.test(text)) {
      category = 'account';
    } else if (/error|bug|crash|fail|timeout|500|broken|slow/.test(text)) {
      category = 'technical';
    } else if (/feature|request|suggest|add|improve|wish/.test(text)) {
      category = 'feature_request';
    }

    let priority: Priority = 'medium';
    if (/outage|down|critical|urgent|data loss|security|breach|all users/.test(text)) {
      priority = 'critical';
    } else if (/cannot|blocked|failing|broken|payment failed/.test(text)) {
      priority = 'high';
    } else if (/question|how to|when will| Minor|typo/.test(text)) {
      priority = 'low';
    }

    return {
      category,
      priority,
      confidence: 0.55,
      summary: title.slice(0, 140),
      suggestedReply: `Thanks for reporting this ${category} issue. We've set priority to ${priority} and an agent will follow up shortly.`,
      provider: 'rule',
    };
  },
};
