import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import './index.css';

const qc = new QueryClient();
const authed = () => !!localStorage.getItem('token');

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <nav>
          <Link to="/">Tickets</Link>
          <Link to="/new">New</Link>
          <Link to="/login">Login</Link>
          <a
            href="#"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            Logout
          </a>
        </nav>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={authed() ? <TicketList /> : <Navigate to="/login" />} />
          <Route path="/new" element={authed() ? <NewTicket /> : <Navigate to="/login" />} />
          <Route
            path="/tickets/:id"
            element={authed() ? <TicketDetail /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
