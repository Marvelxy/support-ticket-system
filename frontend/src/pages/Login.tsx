import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('admin@demo.io');
  const [password, setPassword] = useState('password123');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Demo');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      nav('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
        <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
          {mode === 'register' && (
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p style={{ color: 'red' }}>{err}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
        <p>
          <button
            className="secondary"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            Switch to {mode === 'login' ? 'register' : 'login'}
          </button>
        </p>
        <p>
          Seed users: admin@demo.io / agent@demo.io / customer@demo.io — password: password123.{' '}
          <Link to="/">Tickets</Link>
        </p>
      </div>
    </div>
  );
}
