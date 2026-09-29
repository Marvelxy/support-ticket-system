import { describe, expect, it } from 'vitest';
import { ruleBasedProvider } from './ruleBased.js';

describe('ruleBasedProvider', () => {
  it('classifies billing issues', async () => {
    const r = await ruleBasedProvider.classify(
      'Charged twice',
      'My invoice shows a double payment',
    );
    expect(r.category).toBe('billing');
    expect(r.provider).toBe('rule');
  });

  it('flags outages as critical', async () => {
    const r = await ruleBasedProvider.classify('Outage', 'All users down, urgent data loss risk');
    expect(r.priority).toBe('critical');
  });

  it('falls back to general/medium with fixed low confidence', async () => {
    const r = await ruleBasedProvider.classify('Hello', 'Just saying hi');
    expect(r.category).toBe('general');
    expect(r.priority).toBe('medium');
    expect(r.confidence).toBeLessThan(0.7);
  });
});
