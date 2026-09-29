import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const TITLE_MIN = 3;
const BODY_MIN = 5;
const TITLE_MAX = 120;

export default function NewTicket() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const titleError =
    title.length > 0 && title.trim().length < TITLE_MIN
      ? `Title needs at least ${TITLE_MIN} characters`
      : '';
  const bodyError =
    body.length > 0 && body.trim().length < BODY_MIN
      ? `Description needs at least ${BODY_MIN} characters`
      : '';
  const canSubmit =
    title.trim().length >= TITLE_MIN && body.trim().length >= BODY_MIN && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr('');
    setBusy(true);
    try {
      const t = await api<{ id: string }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      nav(`/tickets/${t.id}`);
    } catch (e) {
      setErr((e as Error).message || 'Could not create the ticket. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container new-ticket">
      <Link to="/" className="back-link">
        ← Back to dashboard
      </Link>

      <header className="dash-header">
        <div>
          <h1>New ticket</h1>
          <p className="muted">Describe the issue — AI triage will categorize it automatically.</p>
        </div>
      </header>

      <div className="new-ticket-grid">
        <form className="card form-card" onSubmit={submit} noValidate>
          <label className="field">
            <div className="field-head">
              <span>Title</span>
              <span className={`char-count ${title.length > TITLE_MAX ? 'over' : ''}`}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              placeholder="e.g. Payment failed at checkout"
              value={title}
              maxLength={TITLE_MAX + 20}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            {titleError && <span className="field-error">{titleError}</span>}
          </label>

          <label className="field">
            <div className="field-head">
              <span>Description</span>
              <span className="char-count">{body.length} chars</span>
            </div>
            <textarea
              rows={8}
              placeholder={'What happened?\nWhat did you expect?\nSteps to reproduce...'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {bodyError && <span className="field-error">{bodyError}</span>}
          </label>

          {err && (
            <p className="form-error" role="alert">
              {err}
            </p>
          )}

          <div className="form-actions">
            <Link to="/" className="btn-ghost">
              Cancel
            </Link>
            <button type="submit" disabled={!canSubmit} className="btn-submit">
              {busy ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>

        <aside className="side-stack">
          <div className="card side-card">
            <h3>✨ What happens next</h3>
            <ol>
              <li>Ticket is created as open</li>
              <li>AI auto-triage sets category &amp; priority</li>
              <li>Low-confidence tickets are flagged for review</li>
            </ol>
          </div>
          <div className="card side-card">
            <h3>💡 Tips for a fast resolution</h3>
            <ul>
              <li>Use a specific title with where it broke</li>
              <li>Include error messages verbatim</li>
              <li>Add steps to reproduce + what you expected</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
