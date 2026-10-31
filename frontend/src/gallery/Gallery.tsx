import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyTheme } from '../theme';
import { apiClient } from '../services/api';
import { STYLES } from '../styles/registry';

export const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => { applyTheme('light'); }, []);

  useEffect(() => {
    let alive = true;
    const check = () =>
      apiClient.get('/api/health', { timeout: 4000 })
        .then(() => alive && setOnline(true))
        .catch(() => alive && setOnline(false));
    check();
    const id = setInterval(check, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = STYLES[Number(e.key) - 1];
      if (s) navigate(s.base);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-panel-ground text-panel-ink">
      <header className="border-b border-panel-seam bg-panel-raised">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Green Campus AI · Console styles</h1>
            <p className="text-sm text-panel-muted mt-1 max-w-2xl">
              Each style opens the same working console with live L Block data. Pick the layout that suits your team.
            </p>
          </div>
          <span className="ml-auto flex items-center gap-2 text-xs text-panel-muted" title="Backend connection">
            <span className={`w-2 h-2 rounded-full ${online === null ? 'bg-panel-wire' : online ? 'bg-lamp-off' : 'bg-lamp-on'}`} />
            Backend: {online === null ? 'checking' : online ? 'online' : 'offline'}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid gap-5 sm:grid-cols-2">
        {STYLES.map((s, i) => (
          <article key={s.id} className="bg-panel-raised border border-panel-seam rounded-[3px] flex flex-col">
            <Link to={s.base} tabIndex={-1} aria-hidden className="block p-3 pb-0">
              <img
                src={s.thumbnail}
                alt={`${s.name} preview`}
                loading="lazy"
                className="w-full aspect-[16/10] object-cover border border-panel-seam"
              />
            </Link>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-base font-semibold">{s.name}</h2>
                <span className="text-sm text-panel-muted">{s.tagline}</span>
                <span
                  className={`ml-auto text-2xs font-semibold uppercase border px-1.5 py-0.5 rounded-[2px] ${
                    s.status === 'Working' ? 'border-lamp-off text-lamp-off' : 'border-waste text-waste'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {s.tags.map(t => (
                  <li key={t} className="text-2xs border border-panel-seam text-panel-muted px-1.5 py-0.5 rounded-[2px]">{t}</li>
                ))}
              </ul>
              <p className="text-sm text-panel-muted flex-1">{s.description}</p>
              <div className="flex items-center gap-3 mt-1">
                <Link
                  to={s.base}
                  className="bg-accent text-accent-on text-sm font-semibold px-4 py-1.5 rounded-[3px] hover:bg-accent-hover snap"
                >
                  Open
                </Link>
                <span className="text-xs text-panel-muted">
                  Press <kbd className="num border border-panel-wire px-1 rounded-[2px]">{i + 1}</kbd>
                </span>
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs text-panel-muted">
        All live readings are simulated until metering hardware is installed.
      </footer>
    </div>
  );
};

export default Gallery;
