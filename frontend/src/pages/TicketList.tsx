import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
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
}

export default function TicketList() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['tickets', q, status],
    queryFn: () =>
      api<{ tickets: Ticket[] }>(`/api/tickets?q=${encodeURIComponent(q)}&status=${status}`),
  });
  return (
    <div className="container">
      <div className="row">
        <input
          placeholder="Search tickets..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button className="secondary" onClick={() => refetch()}>
          Search
        </button>
        <Link to="/new">+ New ticket</Link>
      </div>
      {isLoading && <p>Loading...</p>}
      {data?.tickets.map((t) => (
        <div className="card" key={t.id}>
          <Link to={`/tickets/${t.id}`}>
            <strong>{t.title}</strong>
          </Link>
          <div>
            <span className="badge">{t.status}</span>
            <span className="badge">{t.priority}</span>
            <span className="badge">{t.category}</span>
            {t.needsReview && <span className="badge">needs review</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
