/**
 * Data access layer for campaigns.
 *
 * The interface decouples the UI from storage. A localStorage implementation
 * is provided below; for a real backend, swap the implementation (call a REST
 * API, GraphQL endpoint, or Firestore — it does not matter) and swap the
 * function exported at the bottom.
 */

import type { Campaign } from '../domain/campaign';

export interface CampaignRepository {
  list(): Promise<Campaign[]>;
  get(id: string): Promise<Campaign | null>;
  save(campaign: Campaign): Promise<void>;
  delete(id: string): Promise<void>;
}

class LocalStorageRepository implements CampaignRepository {
  private readonly key = 'ad-pro/campaigns';

  async list(): Promise<Campaign[]> {
    const data = localStorage.getItem(this.key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<Campaign | null> {
    const campaigns = await this.list();
    return campaigns.find((c) => c.id === id) ?? null;
  }

  async save(campaign: Campaign): Promise<void> {
    const campaigns = await this.list();
    const index = campaigns.findIndex((c) => c.id === campaign.id);
    if (index >= 0) {
      campaigns[index] = campaign;
    } else {
      campaigns.push(campaign);
    }
    localStorage.setItem(this.key, JSON.stringify(campaigns));
  }

  async delete(id: string): Promise<void> {
    const campaigns = await this.list();
    const filtered = campaigns.filter((c) => c.id !== id);
    localStorage.setItem(this.key, JSON.stringify(filtered));
  }
}

/**
 * The repository used by the app. Swap this function when moving to a
 * different storage backend; the UI does not call storage directly.
 */
export function createRepository(): CampaignRepository {
  return new LocalStorageRepository();
}
