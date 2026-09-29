import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';

const CATEGORIES = ['billing', 'technical', 'account', 'feature_request', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function slaDetail(slaDueAt?: string | null) {
  if (!slaDueAt) return null;
  const ms = new Date(slaDueAt).getTime() - Date.now();
  if (ms < 0) return { text: 'SLA breached — reply ASAP', cls: 'sla-breached' };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { text: `SLA due in ${Math.max(1, mins)}m`, cls: 'sla-urgent' };
  const h = Math.floor(mins / 60);
  if (h < 48) return { text: `SLA due in ${h}h`, cls: h < 8 ? 'sla-urgent' : '' };
  return { text: `SLA due in ${Math.floor(h / 24)}d`, cls: '' };
}

const AUDIT_ICON: Record<string, string> = {
  created: '+',
  classified: '✨',
  reviewed: '✓',
  assigned: '👤',
  updated: '✎',
};

export default function TicketDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assignError, setAssignError] = useState('');

  const { data: t } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api<any>(`/api/tickets/${id}`),
    enabled: !!id,
  });

  // Current user role decides whether review controls are shown.
  // Customers see a "waiting for review" note instead (backend also enforces agent/admin).
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ role: string }>('/api/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
  const canReview = me?.role === 'admin' || me?.role === 'agent';

  // Assignable agents for the picker (agent/admin only; 403 for customers).
  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => api<{ id: string; name: string; email: string }[]>('/api/auth/users'),
    retry: false,
    staleTime: 60_000,
    enabled: canReview,
  });

  useEffect(() => {
    if (t) {
      setCategory(t.category ?? '');
      setPriority(t.priority ?? '');
      setAssigneeId(t.assignee?.id ?? '');
    }
  }, [t?.id, t?.category, t?.priority, t?.assignee?.id]);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
  const assign = useMutation({
    mutationFn: () =>
      api(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeId: assigneeId || null }),
      }),
    onSuccess: () => {
      setAssignError('');
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e) => setAssignError((e as Error).message || 'Assignment failed'),
  });
  const review = useMutation({
    mutationFn: () =>
      api(`/api/tickets/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ category, priority }),
      }),
    onSuccess: () => {
      setReviewError('');
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (e) => setReviewError((e as Error).message || 'Review failed'),
  });

  if (!t) return <div className="container">Loading...</div>;
  return (
    <div className="container">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      {t.needsReview && (
        <div className="card review-banner" role="alert">
          <div>
            <strong>✎ Needs review</strong>
            <p className="muted">
              AI confidence
              {typeof t.confidence === 'number' ? ` ${Math.round(t.confidence * 100)}%` : ''} is
              below the 70% threshold. Please verify the category and priority.
            </p>
          </div>
          {canReview ? (
            <form
              className="review-form"
              onSubmit={(e) => {
                e.preventDefault();
                review.mutate();
              }}
            >
              <label>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={review.isPending}>
                {review.isPending ? 'Approving…' : 'Approve triage'}
              </button>
              {reviewError && <span className="field-error">{reviewError}</span>}
            </form>
          ) : (
            <p className="muted">An agent will review the AI categorization shortly.</p>
          )}
        </div>
      )}

      <div className="card">
        <h2>{t.title}</h2>
        <div className="markdown-body">
          <ReactMarkdown>{t.body}</ReactMarkdown>
        </div>
        <div>
          <span className="badge">{t.status}</span>
          <span className="badge">{t.priority}</span>
          <span className="badge">{t.category}</span>
          {t.assignee?.name && <span className="badge badge-muted">@{t.assignee.name}</span>}
          {t.needsReview && <span className="badge badge-review">needs review</span>}
          {typeof t.confidence === 'number' && (
            <span className="badge badge-muted">AI {Math.round(t.confidence * 100)}%</span>
          )}
          {t.slaDueAt &&
            (() => {
              const sla = slaDetail(t.slaDueAt);
              return sla ? (
                <span className={`badge ${sla.cls}`} title={new Date(t.slaDueAt).toLocaleString()}>
                  {sla.text}
                </span>
              ) : null;
            })()}
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
          <div className="draft-box">
            <p>
              <strong>Draft:</strong> {classify.data.suggestedReply}{' '}
              <span className="badge badge-muted">{classify.data.provider}</span>
            </p>
            <button className="secondary" onClick={() => setComment(classify.data.suggestedReply)}>
              Use as reply
            </button>
          </div>
        )}
      </div>
      {canReview && (
        <div className="card">
          <h3>Assignee</h3>
          <form
            className="review-form"
            onSubmit={(e) => {
              e.preventDefault();
              assign.mutate();
            }}
          >
            <label>
              Assigned to
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={assign.isPending}>
              {assign.isPending ? 'Saving…' : 'Save'}
            </button>
            {assignError && <span className="field-error">{assignError}</span>}
          </form>
        </div>
      )}
      <div className="card">
        <h3>Comments</h3>
        {t.comments?.map((c: any) => (
          <div className="comment" key={c.id}>
            <strong>{c.author?.name}:</strong>{' '}
            <span className="markdown-body markdown-inline">
              <ReactMarkdown>{c.body}</ReactMarkdown>
            </span>
          </div>
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
        <div className="timeline">
          {t.audits?.map((a: any) => (
            <div className="timeline-item" key={a.id}>
              <span className="timeline-icon" aria-hidden>
                {AUDIT_ICON[a.action] ?? '•'}
              </span>
              <div>
                <div className="timeline-action">
                  <strong>{a.actor}</strong> — {a.action}
                  <span className="timeline-time" title={new Date(a.createdAt).toLocaleString()}>
                    {' '}
                    · {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                {a.detail && <small className="muted">{a.detail}</small>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
