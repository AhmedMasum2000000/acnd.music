import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  createCampaign,
  flightLengthDays,
  formatCents,
  isValidIsoDate,
  metricsFor,
  pacingFor,
  parseAmountToCents,
  recordDelivery,
  summarise,
  transition,
  type Campaign,
  type CampaignDraft,
} from './campaign';

const draft: CampaignDraft = {
  name: 'Spring launch',
  budget: 100_000,
  startDate: '2025-01-01',
  endDate: '2025-01-10',
};

const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  ...createCampaign(draft, 'c_1'),
  ...overrides,
});

describe('isValidIsoDate', () => {
  it('accepts a real date', () => {
    expect(isValidIsoDate('2025-02-28')).toBe(true);
  });

  it('accepts a leap day in a leap year', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  // The regex alone would pass all of these; only the round-trip catches them.
  it.each(['2025-02-30', '2025-13-01', '2023-02-29', '2025-1-1', '', 'yesterday'])(
    'rejects %j',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('createCampaign', () => {
  it('starts a campaign at zero delivery and draft status', () => {
    const created = createCampaign(draft, 'c_1');
    expect(created).toMatchObject({
      id: 'c_1',
      name: 'Spring launch',
      budget: 100_000,
      spend: 0,
      impressions: 0,
      clicks: 0,
      status: 'draft',
    });
  });

  it('trims the name', () => {
    expect(createCampaign({ ...draft, name: '  Padded  ' }, 'c_1').name).toBe('Padded');
  });

  it('allows a single-day flight', () => {
    const oneDay = { ...draft, startDate: '2025-01-05', endDate: '2025-01-05' };
    expect(() => createCampaign(oneDay, 'c_1')).not.toThrow();
  });

  it.each([
    ['a blank name', { name: '   ' }],
    ['a zero budget', { budget: 0 }],
    ['a negative budget', { budget: -1 }],
    ['a fractional budget', { budget: 10.5 }],
    ['an end date before the start', { endDate: '2024-12-31' }],
    ['an impossible date', { startDate: '2025-02-30' }],
  ])('rejects %s', (_label, patch) => {
    expect(() => createCampaign({ ...draft, ...patch }, 'c_1')).toThrow();
  });
});

describe('status transitions', () => {
  it('treats completed as terminal', () => {
    expect(allowedTransitions('completed')).toEqual([]);
  });

  it('permits pausing and resuming', () => {
    expect(canTransition('active', 'paused')).toBe(true);
    expect(canTransition('paused', 'active')).toBe(true);
  });

  it('refuses to reopen a completed campaign', () => {
    expect(canTransition('completed', 'active')).toBe(false);
    expect(() => transition(campaign({ status: 'completed' }), 'active')).toThrow();
  });

  it('does not mutate the original', () => {
    const original = campaign();
    const moved = transition(original, 'active');
    expect(original.status).toBe('draft');
    expect(moved.status).toBe('active');
  });
});

describe('recordDelivery', () => {
  it('accumulates delivery', () => {
    const after = recordDelivery(campaign(), { spend: 500, impressions: 1000, clicks: 10 });
    expect(after).toMatchObject({ spend: 500, impressions: 1000, clicks: 10 });
  });

  it('clamps spend to the budget so percentages stay sane', () => {
    const after = recordDelivery(campaign(), { spend: 999_999, impressions: 1, clicks: 0 });
    expect(after.spend).toBe(100_000);
    expect(metricsFor(after).budgetUsed).toBe(1);
    expect(metricsFor(after).remaining).toBe(0);
  });

  it('rejects negative figures', () => {
    expect(() => recordDelivery(campaign(), { spend: -1, impressions: 0, clicks: 0 })).toThrow();
  });
});

describe('metricsFor', () => {
  it('returns null rates rather than dividing by zero', () => {
    const metrics = metricsFor(campaign());
    expect(metrics.ctr).toBe(0);
    expect(metrics.cpc).toBeNull();
    expect(metrics.cpm).toBeNull();
  });

  it('computes ctr, cpc and cpm', () => {
    const served = campaign({ spend: 20_000, impressions: 10_000, clicks: 250 });
    const metrics = metricsFor(served);
    expect(metrics.ctr).toBeCloseTo(0.025);
    expect(metrics.cpc).toBe(80);
    expect(metrics.cpm).toBe(2000);
    expect(metrics.budgetUsed).toBeCloseTo(0.2);
    expect(metrics.remaining).toBe(80_000);
  });
});

describe('flightLengthDays', () => {
  it('counts both endpoints', () => {
    expect(flightLengthDays(campaign())).toBe(10);
  });

  it('is 1 for a single-day flight', () => {
    expect(flightLengthDays(campaign({ startDate: '2025-03-04', endDate: '2025-03-04' }))).toBe(1);
  });

  // A naive millisecond division breaks here; the DST shift is not a whole day.
  it('survives a daylight-saving boundary', () => {
    expect(flightLengthDays(campaign({ startDate: '2025-03-08', endDate: '2025-03-10' }))).toBe(3);
  });
});

describe('pacingFor', () => {
  it('reports not-started before the flight opens', () => {
    expect(pacingFor(campaign(), '2024-12-25').verdict).toBe('not-started');
  });

  it('reports ended after the flight closes', () => {
    expect(pacingFor(campaign(), '2025-02-01').verdict).toBe('ended');
  });

  it('is on-track when burn matches time elapsed', () => {
    // Day 5 of 10 -> 50% elapsed; 50% spent.
    const result = pacingFor(campaign({ spend: 50_000 }), '2025-01-05');
    expect(result.elapsed).toBeCloseTo(0.5);
    expect(result.spent).toBeCloseTo(0.5);
    expect(result.verdict).toBe('on-track');
  });

  it('flags overspending when burn runs ahead of time', () => {
    expect(pacingFor(campaign({ spend: 90_000 }), '2025-01-05').verdict).toBe('overspending');
  });

  it('flags underspending when burn lags time', () => {
    expect(pacingFor(campaign({ spend: 5_000 }), '2025-01-08').verdict).toBe('underspending');
  });

  it('tolerates small drift inside the band', () => {
    // 55% spent against 50% elapsed is 5 points of drift — inside the 10 allowed.
    expect(pacingFor(campaign({ spend: 55_000 }), '2025-01-05').verdict).toBe('on-track');
  });
});

describe('summarise', () => {
  it('returns zeroes for an empty portfolio', () => {
    expect(summarise([])).toEqual({
      campaigns: 0,
      active: 0,
      budget: 0,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
    });
  });

  it('totals budgets and counts active campaigns', () => {
    const result = summarise([
      campaign({ id: 'a', status: 'active', spend: 10_000, impressions: 2_000, clicks: 40 }),
      campaign({ id: 'b', status: 'paused', spend: 5_000, impressions: 2_000, clicks: 60 }),
      campaign({ id: 'c', status: 'active', spend: 0 }),
    ]);

    expect(result.campaigns).toBe(3);
    expect(result.active).toBe(2);
    expect(result.budget).toBe(300_000);
    expect(result.spend).toBe(15_000);
    expect(result.ctr).toBeCloseTo(100 / 4000);
  });
});

describe('parseAmountToCents', () => {
  it.each([
    ['1250.50', 125_050],
    ['1,250.50', 125_050],
    ['0.01', 1],
    ['99', 9_900],
  ])('parses %j', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it('rounds rather than truncating sub-cent input', () => {
    expect(parseAmountToCents('0.005')).toBe(1);
  });

  it.each(['', 'abc', '1.2.3', '-5'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeNaN();
  });
});

describe('formatCents', () => {
  it('renders cents as currency', () => {
    expect(formatCents(125_050)).toBe('$1,250.50');
  });
});
