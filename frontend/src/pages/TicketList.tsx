import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
  slaDueAt?: string | null;
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

const PAGE_SIZE = 10;

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

function slaLabel(slaDueAt?: string | null) {
  if (!slaDueAt) return null;
  const ms = new Date(slaDueAt).getTime() - Date.now();
  if (ms < 0) return { text: 'SLA breached', cls: 'sla-breached' };
  const h = Math.floor(ms / 3600000);
  if (h < 1) return { text: `SLA ${Math.max(1, Math.floor(ms / 60000))}m left`, cls: 'sla-urgent' };
  if (h < 8) return { text: `SLA ${h}h left`, cls: 'sla-urgent' };
  return {
    text: `SLA ${Math.floor(h / 24) > 0 ? `${Math.floor(h / 24)}d` : `${h}h`} left`,
    cls: '',
  };
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function TicketList() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [mine, setMine] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q, 350);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, priority, sort, mine, reviewOnly]);

  // Stats are admin/agent only — hide quietly for customers (403).
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<Stats>('/api/dashboard/stats'),
    retry: false,
    staleTime: 30_000,
  });

  const params = new URLSearchParams({
    q: debouncedQ,
    status,
    priority,
    sort,
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(mine ? { mine: 'true' } : {}),
    ...(reviewOnly ? { needsReview: 'true' } : {}),
  });

  const { data, refetch, isLoading, isError, isFetching } = useQuery({
    queryKey: ['tickets', params.toString()],
    queryFn: () =>
      api<{ tickets: Ticket[]; total: number; page: number }>('/api/tickets?' + params),
    placeholderData: (prev) => prev,
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(q || status || priority || mine || reviewOnly);

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
            {total} ticket{total === 1 ? '' : 's'}
            {isFetching && !isLoading ? ' · updating…' : ''}
          </p>
        </div>
        <div className="row">
          <Link to="/board" className="btn-ghost">
            Kanban
          </Link>
          <Link to="/new" className="btn-primary">
            + New ticket
          </Link>
        </div>
      </header>

      {statCards.length > 0 && (
        <section className="stat-grid" aria-label="Ticket stats">
          {statCards.map((s) => (
            <button
              className={`stat-card stat-clickable ${s.cls}`}
              key={s.label}
              onClick={() => {
                if (s.label === 'Needs review') {
                  setReviewOnly((v) => !v);
                  setStatus('');
                }
              }}
              title={s.label === 'Needs review' ? 'Toggle review queue filter' : undefined}
            >
              <span className="stat-icon" aria-hidden>
                {s.icon}
              </span>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">
                  {s.label}
                  {s.label === 'Needs review' && reviewOnly ? ' ✓' : ''}
                </div>
              </div>
            </button>
          ))}
        </section>
      )}

      <section className="toolbar card">
        <div className="toolbar-search">
          <span aria-hidden>⌕</span>
          <input
            placeholder="Search title or description..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
            <option value="sla">SLA due</option>
          </select>
        </div>
        <div className="toolbar-toggles">
          <label className="toggle">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            Mine only
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
            />
            Needs review
          </label>
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
            <h3>{hasFilters ? 'No tickets match your filters' : 'All caught up!'}</h3>
            <p className="muted">
              {hasFilters
                ? 'Try clearing the search or choosing different filters.'
                : 'There are no tickets yet. Create the first one to get started.'}
            </p>
            {hasFilters ? (
              <button
                className="secondary"
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setPriority('');
                  setMine(false);
                  setReviewOnly(false);
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
          {tickets.map((t) => {
            const sla = slaLabel(t.slaDueAt);
            return (
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
                    {sla && <span className={`badge ${sla.cls}`}>{sla.text}</span>}
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
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            <button
              className="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
