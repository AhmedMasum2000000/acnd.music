import { type Campaign, CAMPAIGN_STATUSES, metricsFor } from '../domain/campaign';
import { CampaignRow } from './CampaignRow';
import './CampaignList.css';

interface Props {
  campaigns: Campaign[];
  onStatusChange: (id: string, status: Campaign['status']) => void;
  onDelete: (id: string) => void;
}

export function CampaignList({ campaigns, onStatusChange, onDelete }: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="empty-state">
        <p>No campaigns yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="campaign-list">
      <table className="campaigns-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Dates</th>
            <th>Budget</th>
            <th>Spend</th>
            <th>CTR</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              metrics={metricsFor(campaign)}
              allowedStatuses={CAMPAIGN_STATUSES.filter(
                (s) => s !== campaign.status && s !== 'draft',
              )}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
