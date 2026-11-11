import { formatCents, formatCount, formatPercent, summarise, type Campaign } from '../domain/campaign';
import './Summary.css';

interface Props {
  campaigns: readonly Campaign[];
}

export function Summary({ campaigns }: Props) {
  const summary = summarise(campaigns);

  return (
    <div className="summary">
      <div className="summary-tile">
        <div className="tile-value">{summary.campaigns}</div>
        <div className="tile-label">Campaigns</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{summary.active}</div>
        <div className="tile-label">Active</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{formatCents(summary.budget)}</div>
        <div className="tile-label">Total Budget</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{formatCents(summary.spend)}</div>
        <div className="tile-label">Total Spend</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{formatPercent(summary.ctr)}</div>
        <div className="tile-label">Portfolio CTR</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{formatCount(summary.impressions)}</div>
        <div className="tile-label">Impressions</div>
      </div>
      <div className="summary-tile">
        <div className="tile-value">{formatCount(summary.clicks)}</div>
        <div className="tile-label">Clicks</div>
      </div>
    </div>
  );
}
