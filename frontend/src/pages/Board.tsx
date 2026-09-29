import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  needsReview: boolean;
  assignee?: { name: string } | null;
}

const COLUMNS = ['open', 'pending', 'resolved', 'closed'] as const;

export default function Board() {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['board'],
    queryFn: () => api<{ tickets: Ticket[] }>('/api/tickets?limit=100'),
  });

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['board'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (e) => setError((e as Error).message || 'Move failed'),
  });

  function onDrop(status: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/ticket-id');
    if (id) move.mutate({ id, status });
  }

  const tickets = data?.tickets ?? [];

  return (
    <div className="container board-page">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>
      <header className="dash-header">
        <div>
          <h1>Kanban board</h1>
          <p className="muted">Drag tickets between columns to change status.</p>
        </div>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="board">
          {COLUMNS.map((col) => (
            <div
              key={col}
              className={`board-col${dragOver === col ? ' board-drop' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col);
              }}
              onDragLeave={() => setDragOver((d) => (d === col ? null : d))}
              onDrop={(e) => onDrop(col, e)}
            >
              <h3>
                {col}{' '}
                <span className="muted">({tickets.filter((t) => t.status === col).length})</span>
              </h3>
              <div className="board-cards">
                {tickets
                  .filter((t) => t.status === col)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="board-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/ticket-id', t.id)}
                    >
                      <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                      <div className="ticket-meta">
                        <span className={`badge badge-priority-${t.priority}`}>{t.priority}</span>
                        {t.needsReview && <span className="badge badge-review">review</span>}
                        {t.assignee?.name && (
                          <span className="ticket-date">@{t.assignee.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
