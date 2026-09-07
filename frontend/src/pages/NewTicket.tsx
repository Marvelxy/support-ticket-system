import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function NewTicket() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = await api<{ id: string }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
    nav(`/tickets/${t.id}`);
  }
  return (
    <div className="container">
      <div className="card">
        <h2>New ticket</h2>
        <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            rows={6}
            placeholder="Describe the issue..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit">Create (auto-triage runs)</button>
        </form>
      </div>
    </div>
  );
}
