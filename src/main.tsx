import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

// The fallback baked into index.html is real, crawlable content — the full
// bio, every release and every link. It stays in the document until React is
// ready to replace it, so there is never a blank frame before mount and never
// a moment where a crawler sees an empty page.
document.getElementById('fallback')?.remove();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
