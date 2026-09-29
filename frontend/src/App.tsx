import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import Login from './pages/Login';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import Board from './pages/Board';
import Users from './pages/Users';
import { AuthProvider, useAuth } from './lib/auth';
import { getSocket } from './lib/socket';
import './index.css';

const qc = new QueryClient();

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) };
}

function RealtimeToasts() {
  const client = useQueryClient();
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    const socket = getSocket();
    const push = (text: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    };
    const onTicket = (label: string) => (p: { id?: string }) => {
      push(`${label}${p?.id ? `: ${String(p.id).slice(0, 8)}…` : ''}`);
      client.invalidateQueries({ queryKey: ['tickets'] });
      client.invalidateQueries({ queryKey: ['board'] });
      client.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (p?.id) client.invalidateQueries({ queryKey: ['ticket', p.id] });
    };
    const created = onTicket('New ticket');
    const updated = onTicket('Ticket updated');
    const commented = onTicket('New comment on');
    socket.on('ticket:created', created);
    socket.on('ticket:updated', updated);
    socket.on('comment:added', commented);
    return () => {
      socket.off('ticket:created', created);
      socket.off('ticket:updated', updated);
      socket.off('comment:added', commented);
    };
  }, [client]);

  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          🔔 {t.text}
        </div>
      ))}
    </div>
  );
}

function Nav({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  const { token, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav>
      {token ? (
        <>
          <Link to="/">Tickets</Link>
          <Link to="/board">Board</Link>
          <Link to="/new">New</Link>
          <Link to="/users">Users</Link>
          <button className="nav-icon" onClick={onToggleTheme} title="Toggle dark mode">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
              nav('/login');
            }}
          >
            Logout
          </a>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <button className="nav-icon" onClick={onToggleTheme} title="Toggle dark mode">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </>
      )}
    </nav>
  );
}

// Guards a page: logged out visitors bounce to /login
function AuthedRoute({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

// Logged in visitors don't need the login form
function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <Login />;
}

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Nav theme={theme} onToggleTheme={toggle} />
          <RealtimeToasts />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route
              path="/"
              element={
                <AuthedRoute>
                  <TicketList />
                </AuthedRoute>
              }
            />
            <Route
              path="/new"
              element={
                <AuthedRoute>
                  <NewTicket />
                </AuthedRoute>
              }
            />
            <Route
              path="/board"
              element={
                <AuthedRoute>
                  <Board />
                </AuthedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AuthedRoute>
                  <Users />
                </AuthedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <AuthedRoute>
                  <TicketDetail />
                </AuthedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
