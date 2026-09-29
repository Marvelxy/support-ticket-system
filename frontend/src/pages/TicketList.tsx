import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  confidence?: number;
  needsReview: boolean;
  createdAt: string;
  createdBy?: { name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
}

interface Stats {
  open: number;
  pending: number;
  critical: number;
  needsReview: number;
  byCategory: { category: string; _count: number }[];
}

const STATUS_META: Record<string, string> = {
  open: 'dot-open',
  pending: 'dot-pending',
  resolved: 'dot-resolved',
  closed: 'dot-closed',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TicketList() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  // Stats are admin/agent only — hide quietly for customers (403).
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<Stats>('/api/dashboard/stats'),
    retry: false,
    staleTime: 30_000,
  });

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ['tickets', status, priority],
    queryFn: () =>
      api<{ tickets: Ticket[]; total: number }>(
        `/api/tickets?status=${status}&priority=${priority}`,
      ),
  });

  // Backend ignores `q`, so filter client-side to make search actually work.
  const tickets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data?.tickets ?? [];
    return (data?.tickets ?? []).filter((t) => t.title.toLowerCase().includes(needle));
  }, [data, q]);

  const statCards = stats
    ? [
        { label: 'Open', value: stats.open, icon: '●', cls: 'stat-open' },
        { label: 'Pending', value: stats.pending, icon: '◐', cls: 'stat-pending' },
        { label: 'Critical', value: stats.critical, icon: '▲', cls: 'stat-critical' },
        { label: 'Needs review', value: stats.needsReview, icon: '✎', cls: 'stat-review' },
      ]
    : [];

  return (
    <div className="container dashboard">
      <header className="dash-header">
        <div>
          <h1>Support dashboard</h1>
          <p className="muted">
            {data ? `${data.total} tickets total` : 'Track, triage, and resolve customer issues'}
          </p>
        </div>
        <Link to="/new" className="btn-primary">
          + New ticket
        </Link>
      </header>

      {statCards.length > 0 && (
        <section className="stat-grid" aria-label="Ticket stats">
          {statCards.map((s) => (
            <div className={`stat-card ${s.cls}`} key={s.label}>
              <span className="stat-icon" aria-hidden>
                {s.icon}
              </span>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="toolbar card">
        <div className="toolbar-search">
          <span aria-hidden>⌕</span>
          <input
            placeholder="Search tickets by title..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && refetch()}
          />
          {q && (
            <button className="link-btn" onClick={() => setQ('')}>
              Clear
            </button>
          )}
        </div>
        <div className="toolbar-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Priority"
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button className="secondary" onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      </section>

      <section aria-label="Tickets">
        {isLoading && (
          <div className="stack">
            {[0, 1, 2].map((i) => (
              <div className="card skeleton" key={i}>
                <div className="sk-line sk-title" />
                <div className="sk-line sk-sub" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="card empty">
            <h3>Couldn't load tickets</h3>
            <p className="muted">Your session may have expired. Try logging in again.</p>
            <div className="row">
              <button className="secondary" onClick={() => refetch()}>
                Retry
              </button>
              <Link to="/login">Go to login</Link>
            </div>
          </div>
        )}

        {!isLoading && !isError && tickets.length === 0 && (
          <div className="card empty">
            <div className="empty-icon" aria-hidden>
              ✓
            </div>
            <h3>{q || status || priority ? 'No tickets match your filters' : 'All caught up!'}</h3>
            <p className="muted">
              {q || status || priority
                ? 'Try clearing the search or choosing different filters.'
                : 'There are no tickets yet. Create the first one to get started.'}
            </p>
            {q || status || priority ? (
              <button
                className="secondary"
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setPriority('');
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link to="/new" className="btn-primary">
                + New ticket
              </Link>
            )}
          </div>
        )}

        <div className="stack">
          {tickets.map((t) => (
            <Link to={`/tickets/${t.id}`} className="ticket-row card" key={t.id}>
              <span
                className={`status-dot ${STATUS_META[t.status] ?? ''}`}
                title={t.status}
                aria-hidden
              />
              <div className="ticket-main">
                <strong className="ticket-title">{t.title}</strong>
                <div className="ticket-meta">
                  <span className={`badge badge-status-${t.status}`}>{t.status}</span>
                  <span className={`badge badge-priority-${t.priority}`}>{t.priority}</span>
                  <span className="badge badge-muted">{t.category}</span>
                  {t.needsReview && <span className="badge badge-review">needs review</span>}
                  {t.assignee?.name && (
                    <span className="badge badge-muted">@{t.assignee.name}</span>
                  )}
                  <span className="ticket-date" title={new Date(t.createdAt).toLocaleString()}>
                    {timeAgo(t.createdAt)}
                    {t.createdBy?.name ? ` · ${t.createdBy.name}` : ''}
                  </span>
                </div>
              </div>
              <span className="chevron" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
