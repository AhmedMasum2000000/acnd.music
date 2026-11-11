import { useEffect, useState } from 'react';
import { canTransition, transition, type Campaign } from './domain/campaign';
import { CampaignForm } from './components/CampaignForm';
import { CampaignList } from './components/CampaignList';
import { Summary } from './components/Summary';
import { createRepository } from './storage/repository';
import './App.css';

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const repository = createRepository();

  // Load campaigns on mount.
  useEffect(() => {
    (async () => {
      const loaded = await repository.list();
      setCampaigns(loaded);
      setLoading(false);
    })();
  }, []);

  const handleCreateCampaign = async (campaign: Campaign) => {
    await repository.save(campaign);
    setCampaigns([...campaigns, campaign]);
  };

  const handleStatusChange = async (id: string, newStatus: Campaign['status']) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign || !canTransition(campaign.status, newStatus)) {
      return;
    }

    const updated = transition(campaign, newStatus);
    await repository.save(updated);
    setCampaigns(campaigns.map((c) => (c.id === id ? updated : c)));
  };

  const handleDelete = async (id: string) => {
    await repository.delete(id);
    setCampaigns(campaigns.filter((c) => c.id !== id));
  };


  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ad Pro</h1>
        <p>Manage campaigns, track delivery, read the numbers that matter.</p>
      </header>

      <main className="app-main">
        <Summary campaigns={campaigns} />
        <CampaignForm onSubmit={handleCreateCampaign} />
        <CampaignList
          campaigns={campaigns}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </main>

      <footer className="app-footer">
        <p>Ad Pro • Scaffold for content + SEO automation platform</p>
      </footer>
    </div>
  );
}

export default App;
