import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';

export default function TicketDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const { data: t } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api<any>(`/api/tickets/${id}`),
    enabled: !!id,
  });
  const classify = useMutation({
    mutationFn: () => api<any>(`/api/tickets/${id}/classify`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  });
  const addComment = useMutation({
    mutationFn: () =>
      api(`/api/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment }),
      }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
  const setStatus = useMutation({
    mutationFn: (status: string) =>
      api(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  });

  if (!t) return <div className="container">Loading...</div>;
  return (
    <div className="container">
      <div className="card">
        <h2>{t.title}</h2>
        <p>{t.body}</p>
        <div>
          <span className="badge">{t.status}</span>
          <span className="badge">{t.priority}</span>
          <span className="badge">{t.category}</span>
          {t.summary && (
            <p>
              <em>AI: {t.summary}</em>
            </p>
          )}
        </div>
        <div className="row">
          <button className="secondary" onClick={() => setStatus.mutate('pending')}>
            Pending
          </button>
          <button className="secondary" onClick={() => setStatus.mutate('resolved')}>
            Resolve
          </button>
          <button className="secondary" onClick={() => setStatus.mutate('closed')}>
            Close
          </button>
          <button onClick={() => classify.mutate()}>
            {classify.isPending ? 'Classifying...' : 'Re-run AI triage'}
          </button>
        </div>
        {classify.data?.suggestedReply && (
          <p>
            <strong>Draft:</strong> {classify.data.suggestedReply}{' '}
            <em>({classify.data.provider})</em>
          </p>
        )}
      </div>
      <div className="card">
        <h3>Comments</h3>
        {t.comments?.map((c: any) => (
          <p key={c.id}>
            <strong>{c.author?.name}:</strong> {c.body}
          </p>
        ))}
        <div className="row">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add comment..."
          />
          <button onClick={() => addComment.mutate()}>Send</button>
        </div>
      </div>
      <div className="card">
        <h3>Audit</h3>
        {t.audits?.map((a: any) => (
          <p key={a.id}>
            <small>
              {a.actor} — {a.action} {a.detail || ''}
            </small>
          </p>
        ))}
      </div>
    </div>
  );
}
