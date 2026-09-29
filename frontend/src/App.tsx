import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import { AuthProvider, useAuth } from './lib/auth';
import './index.css';

const qc = new QueryClient();

function Nav() {
  const { token, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav>
      {token ? (
        <>
          <Link to="/">Tickets</Link>
          <Link to="/new">New</Link>
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
        <Link to="/login">Login</Link>
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
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Nav />
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
