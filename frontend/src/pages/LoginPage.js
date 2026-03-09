import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export function resolvePostLoginPath(from) {
  if (typeof from === 'string') {
    return from.startsWith('/') && from !== '/login' ? from : '/apps';
  }

  if (!from || typeof from !== 'object' || typeof from.pathname !== 'string') {
    return '/apps';
  }

  if (!from.pathname.startsWith('/') || from.pathname === '/login') {
    return '/apps';
  }

  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const credentials = {
      username: String(formData.get('username') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
    };

    if (!credentials.username || !credentials.password) {
      setError('Wprowadź login i hasło.');
      setLoading(false);
      return;
    }

    try {
      await login(credentials);
      navigate(resolvePostLoginPath(location.state?.from), { replace: true });
    } catch (err) {
      setError('Nieprawidłowy login lub hasło.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Panel produkcyjny</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Nazwa użytkownika
          <input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>
        <label>
          Hasło
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn" disabled={loading}>
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </button>
      </form>
    </div>
  );
}
