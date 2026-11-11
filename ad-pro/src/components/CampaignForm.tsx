import { useState } from 'react';
import {
  createCampaign,
  newCampaignId,
  parseAmountToCents,
  validateDraft,
  type Campaign,
  type CampaignDraft,
  type ValidationError,
} from '../domain/campaign';
import './CampaignForm.css';

interface Props {
  onSubmit: (campaign: Campaign) => void;
}

export function CampaignForm({ onSubmit }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const budget = parseAmountToCents(budgetInput);
    const draft: CampaignDraft = { name, budget, startDate, endDate };

    const validation = validateDraft(draft);
    setErrors(validation);

    if (validation.length === 0 && Number.isFinite(budget)) {
      try {
        const campaign = createCampaign(draft, newCampaignId());
        onSubmit(campaign);
        // Reset the form.
        setName('');
        setBudgetInput('');
        setStartDate(today);
        setEndDate(today);
        setErrors([]);
        setSubmitted(false);
      } catch (err) {
        console.error('Failed to create campaign:', err);
      }
    }
  };

  const getFieldError = (field: keyof CampaignDraft): string | null => {
    return errors.find((e) => e.field === field)?.message ?? null;
  };

  const isValidBudget = budgetInput === '' || Number.isFinite(parseAmountToCents(budgetInput));
  const budgetError =
    !isValidBudget && submitted ? 'Must be a valid amount' : getFieldError('budget');

  return (
    <form className="campaign-form" onSubmit={handleSubmit}>
      <h2>New Campaign</h2>

      <div className="form-group">
        <label htmlFor="name">Campaign Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring launch"
          aria-invalid={Boolean(getFieldError('name'))}
          aria-describedby={getFieldError('name') ? 'name-error' : undefined}
        />
        {getFieldError('name') && (
          <div id="name-error" className="error-message">
            {getFieldError('name')}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="budget">Budget (USD) *</label>
        <input
          id="budget"
          type="text"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          placeholder="1,000.00"
          aria-invalid={Boolean(budgetError)}
          aria-describedby={budgetError ? 'budget-error' : undefined}
        />
        {budgetError && (
          <div id="budget-error" className="error-message">
            {budgetError}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="start-date">Start Date *</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-invalid={Boolean(getFieldError('startDate'))}
            aria-describedby={getFieldError('startDate') ? 'start-date-error' : undefined}
          />
          {getFieldError('startDate') && (
            <div id="start-date-error" className="error-message">
              {getFieldError('startDate')}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="end-date">End Date *</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-invalid={Boolean(getFieldError('endDate'))}
            aria-describedby={getFieldError('endDate') ? 'end-date-error' : undefined}
          />
          {getFieldError('endDate') && (
            <div id="end-date-error" className="error-message">
              {getFieldError('endDate')}
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="submit-btn">
        Create Campaign
      </button>
    </form>
  );
}
