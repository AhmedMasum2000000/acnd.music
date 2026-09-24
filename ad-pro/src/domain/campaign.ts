/**
 * The campaign model and every rule that operates on it.
 *
 * This module is deliberately pure: no React, no storage, no `Date.now()`,
 * no randomness. Everything that varies is passed in. That is what makes the
 * rules testable without a browser, and it is the reason the UI and the
 * storage layer can both be replaced without touching business logic.
 *
 * If `ad-pro` turns out to be a different product than an ad manager, this is
 * the file to rewrite — the rest of the app talks to it through the types
 * below and does not encode any domain knowledge of its own.
 */

/** Where a campaign is in its lifecycle. Drives filtering and pacing rules. */
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

/** Money is held in whole cents to keep arithmetic exact. */
export type Cents = number;

export interface Campaign {
  id: string;
  name: string;
  /** Total budget for the whole flight, in cents. */
  budget: Cents;
  /** Spend booked so far, in cents. Never exceeds `budget` by construction. */
  spend: Cents;
  impressions: number;
  clicks: number;
  status: CampaignStatus;
  /** Inclusive ISO date (YYYY-MM-DD). */
  startDate: string;
  /** Inclusive ISO date (YYYY-MM-DD). Must not precede `startDate`. */
  endDate: string;
}

/** The fields a human supplies when creating a campaign. */
export interface CampaignDraft {
  name: string;
  budget: Cents;
  startDate: string;
  endDate: string;
}

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
];

// --- validation -------------------------------------------------------------

export interface ValidationError {
  field: keyof CampaignDraft;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a real calendar date in YYYY-MM-DD form.
 *
 * The round-trip through `toISOString` is what rejects the dates that parse
 * but roll over — `2025-02-30` becomes March 2nd, so the formatted result no
 * longer matches the input.
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** Collects every problem with a draft rather than throwing on the first. */
export function validateDraft(draft: CampaignDraft): ValidationError[] {
  const errors: ValidationError[] = [];

  if (draft.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required.' });
  } else if (draft.name.trim().length > 80) {
    errors.push({ field: 'name', message: 'Name must be 80 characters or fewer.' });
  }

  if (!Number.isInteger(draft.budget)) {
    errors.push({ field: 'budget', message: 'Budget must be a whole number of cents.' });
  } else if (draft.budget <= 0) {
    errors.push({ field: 'budget', message: 'Budget must be greater than zero.' });
  }

  if (!isValidIsoDate(draft.startDate)) {
    errors.push({ field: 'startDate', message: 'Start date must be a valid YYYY-MM-DD date.' });
  }
  if (!isValidIsoDate(draft.endDate)) {
    errors.push({ field: 'endDate', message: 'End date must be a valid YYYY-MM-DD date.' });
  }

  // Only meaningful once both dates are known to be well formed.
  if (
    isValidIsoDate(draft.startDate) &&
    isValidIsoDate(draft.endDate) &&
    draft.endDate < draft.startDate
  ) {
    errors.push({ field: 'endDate', message: 'End date cannot be before the start date.' });
  }

  return errors;
}

// --- construction and transitions -------------------------------------------

/**
 * Builds a campaign from a validated draft.
 *
 * `id` is a parameter rather than generated here so this stays pure and tests
 * can assert on exact values; callers use `newCampaignId()`.
 */
export function createCampaign(draft: CampaignDraft, id: string): Campaign {
  const errors = validateDraft(draft);
  if (errors.length > 0) {
    throw new Error(`Invalid campaign draft: ${errors.map((e) => e.message).join(' ')}`);
  }

  return {
    id,
    name: draft.name.trim(),
    budget: draft.budget,
    spend: 0,
    impressions: 0,
    clicks: 0,
    status: 'draft',
    startDate: draft.startDate,
    endDate: draft.endDate,
  };
}

/** Best-available unique id. Impure by nature, so it is kept out of the rules. */
export function newCampaignId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Which statuses a campaign may move to next.
 *
 * `completed` is terminal — reopening a finished flight would make its spend
 * and pacing figures meaningless, so it is not offered.
 */
export function allowedTransitions(status: CampaignStatus): CampaignStatus[] {
  switch (status) {
    case 'draft':
      return ['active'];
    case 'active':
      return ['paused', 'completed'];
    case 'paused':
      return ['active', 'completed'];
    case 'completed':
      return [];
  }
}

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return allowedTransitions(from).includes(to);
}

/** Returns a new campaign with the status applied, or throws if illegal. */
export function transition(campaign: Campaign, to: CampaignStatus): Campaign {
  if (!canTransition(campaign.status, to)) {
    throw new Error(`Cannot move a ${campaign.status} campaign to ${to}.`);
  }
  return { ...campaign, status: to };
}

/**
 * Books delivery against a campaign, clamped so spend can never exceed budget.
 *
 * Over-delivery is a real thing ad servers do, but letting it through here
 * would put every downstream percentage above 100% and make the summary
 * nonsense; clamping keeps the invariant stated on `Campaign.spend`.
 */
export function recordDelivery(
  campaign: Campaign,
  delivery: { spend: Cents; impressions: number; clicks: number },
): Campaign {
  if (delivery.spend < 0 || delivery.impressions < 0 || delivery.clicks < 0) {
    throw new Error('Delivery figures cannot be negative.');
  }

  return {
    ...campaign,
    spend: Math.min(campaign.budget, campaign.spend + delivery.spend),
    impressions: campaign.impressions + delivery.impressions,
    clicks: campaign.clicks + delivery.clicks,
  };
}

// --- derived metrics --------------------------------------------------------

export interface CampaignMetrics {
  /** Clicks per impression, 0–1. Zero when nothing has been served. */
  ctr: number;
  /** Average cost per click in cents, or null when there are no clicks. */
  cpc: Cents | null;
  /** Cost per thousand impressions in cents, or null when none served. */
  cpm: Cents | null;
  /** Share of budget spent, 0–1. */
  budgetUsed: number;
  remaining: Cents;
}

export function metricsFor(campaign: Campaign): CampaignMetrics {
  return {
    ctr: campaign.impressions === 0 ? 0 : campaign.clicks / campaign.impressions,
    cpc: campaign.clicks === 0 ? null : campaign.spend / campaign.clicks,
    cpm: campaign.impressions === 0 ? null : (campaign.spend / campaign.impressions) * 1000,
    // `budget` is validated to be > 0, so this cannot divide by zero.
    budgetUsed: campaign.spend / campaign.budget,
    remaining: campaign.budget - campaign.spend,
  };
}

/** Inclusive length of the flight in days. Always at least 1. */
export function flightLengthDays(campaign: Campaign): number {
  const start = Date.parse(`${campaign.startDate}T00:00:00Z`);
  const end = Date.parse(`${campaign.endDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export type PacingVerdict = 'on-track' | 'underspending' | 'overspending' | 'not-started' | 'ended';

export interface Pacing {
  verdict: PacingVerdict;
  /** Share of the flight elapsed, 0–1. */
  elapsed: number;
  /** Share of the budget spent, 0–1. */
  spent: number;
}

/**
 * Compares budget burn against time elapsed.
 *
 * `today` is injected rather than read from the clock so the result is
 * deterministic — the same campaign always yields the same verdict in tests.
 * The 10-point band stops a campaign flapping between verdicts day to day.
 */
export function pacingFor(campaign: Campaign, today: string): Pacing {
  const spent = campaign.spend / campaign.budget;

  if (today < campaign.startDate) return { verdict: 'not-started', elapsed: 0, spent };
  if (today > campaign.endDate) return { verdict: 'ended', elapsed: 1, spent };

  const total = flightLengthDays(campaign);
  const dayIndex =
    Math.round(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${campaign.startDate}T00:00:00Z`)) /
        86_400_000,
    ) + 1;
  const elapsed = dayIndex / total;

  const drift = spent - elapsed;
  const verdict: PacingVerdict =
    drift > 0.1 ? 'overspending' : drift < -0.1 ? 'underspending' : 'on-track';

  return { verdict, elapsed, spent };
}

// --- collection-level rollups -----------------------------------------------

export interface PortfolioSummary {
  campaigns: number;
  active: number;
  budget: Cents;
  spend: Cents;
  impressions: number;
  clicks: number;
  ctr: number;
}

export function summarise(campaigns: readonly Campaign[]): PortfolioSummary {
  const totals = campaigns.reduce(
    (acc, c) => ({
      budget: acc.budget + c.budget,
      spend: acc.spend + c.spend,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      active: acc.active + (c.status === 'active' ? 1 : 0),
    }),
    { budget: 0, spend: 0, impressions: 0, clicks: 0, active: 0 },
  );

  return {
    campaigns: campaigns.length,
    ...totals,
    ctr: totals.impressions === 0 ? 0 : totals.clicks / totals.impressions,
  };
}

// --- formatting -------------------------------------------------------------

export function formatCents(cents: Cents, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function formatPercent(ratio: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(ratio);
}

export function formatCount(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(value);
}

/** Parses a human-entered amount like "1,250.50" into cents. NaN when unusable. */
export function parseAmountToCents(input: string): Cents {
  const cleaned = input.replace(/[,\s]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return Number.NaN;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(value * 100);
}
