import { formatCents, formatPercent, type Campaign, type CampaignMetrics } from '../domain/campaign';

interface Props {
  campaign: Campaign;
  metrics: CampaignMetrics;
  allowedStatuses: Campaign['status'][];
  onStatusChange: (id: string, status: Campaign['status']) => void;
  onDelete: (id: string) => void;
}

export function CampaignRow({
  campaign,
  metrics,
  allowedStatuses,
  onStatusChange,
  onDelete,
}: Props) {
  return (
    <tr>
      <td className="name-cell">{campaign.name}</td>
      <td className="dates-cell">
        {campaign.startDate} to {campaign.endDate}
      </td>
      <td className="number-cell">{formatCents(campaign.budget)}</td>
      <td className="number-cell">{formatCents(campaign.spend)}</td>
      <td className="metric-cell">{formatPercent(metrics.ctr)}</td>
      <td className="status-cell">
        <span className={`status-badge status-${campaign.status}`}>{campaign.status}</span>
      </td>
      <td className="actions-cell">
        {allowedStatuses.length > 0 && (
          <select
            className="status-select"
            onChange={(e) => {
              const newStatus = e.target.value as Campaign['status'];
              if (newStatus !== campaign.status) {
                onStatusChange(campaign.id, newStatus);
                e.target.value = campaign.status;
              }
            }}
            defaultValue={campaign.status}
          >
            <option value={campaign.status}>—</option>
            {allowedStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}
        <button
          className="delete-btn"
          onClick={() => {
            if (confirm(`Delete "${campaign.name}"?`)) {
              onDelete(campaign.id);
            }
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
