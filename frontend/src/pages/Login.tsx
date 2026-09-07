import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.io');
  const [password, setPassword] = useState('password123');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Demo');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const data = await api<{ token: string }>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(mode === 'login' ? { email, password } : { email, password, name }),
      });
      localStorage.setItem('token', data.token);
      nav('/');
    } catch (e) {
      setErr((e as Error).message);
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
          <button type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
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
