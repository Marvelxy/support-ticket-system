import { describe, expect, it } from 'vitest';
import { slaDueAt } from './factory.js';

describe('slaDueAt', () => {
  it('gives critical tickets 1 hour', () => {
    const before = Date.now();
    const due = slaDueAt('critical').getTime();
    expect(due - before).toBeGreaterThan(59 * 60 * 1000);
    expect(due - before).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
  });

  it('orders severities critical < high < medium < low', () => {
    expect(slaDueAt('critical').getTime()).toBeLessThan(slaDueAt('high').getTime());
    expect(slaDueAt('high').getTime()).toBeLessThan(slaDueAt('medium').getTime());
    expect(slaDueAt('medium').getTime()).toBeLessThan(slaDueAt('low').getTime());
  });
});
