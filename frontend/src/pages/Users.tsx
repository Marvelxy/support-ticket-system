import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { tickets: number };
}

export default function Users() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<User[]>('/api/auth/admin/users'),
    retry: false,
  });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(`/api/auth/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => setError((e as Error).message || 'Role change failed'),
  });

  return (
    <div className="container">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>
      <header className="dash-header">
        <div>
          <h1>Team</h1>
          <p className="muted">Manage roles. Admins only.</p>
        </div>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isLoading && <p>Loading...</p>}
      {isError && (
        <div className="card empty">
          <h3>Not available</h3>
          <p className="muted">Only admins can view this page.</p>
        </div>
      )}
      <div className="stack">
        {(data ?? []).map((u) => (
          <div className="card user-row" key={u.id}>
            <div>
              <strong>{u.name}</strong>
              <div className="muted small">
                {u.email} · {u._count.tickets} tickets
              </div>
            </div>
            <div className="row">
              <span className="badge">{u.role}</span>
              <select
                value={u.role}
                onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })}
                disabled={setRole.isPending}
                aria-label={`Role for ${u.email}`}
              >
                <option value="customer">customer</option>
                <option value="agent">agent</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
