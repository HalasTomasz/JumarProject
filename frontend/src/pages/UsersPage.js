import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import useAuth from '../hooks/useAuth';

const initialFormState = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  group: '',
};

export default function UsersPage() {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.permissions?.can_manage_users);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fullName = useMemo(
    () => `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    [user?.first_name, user?.last_name]
  );

  const loadUsers = async () => {
    const { data } = await apiClient.get('users/');
    if (Array.isArray(data)) {
      setUsers(data);
    } else if (Array.isArray(data.results)) {
      setUsers(data.results);
    } else {
      setUsers([]);
    }
  };

  const loadGroups = async () => {
    const { data } = await apiClient.get('users/groups/');
    setGroups(data.groups || []);
  };

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadUsers(), loadGroups()])
      .catch(() => {
        setError('Nie udało się pobrać użytkowników.');
      })
      .finally(() => setLoading(false));
  }, [canManageUsers]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.username || !form.password) {
      setError('Login i hasło są wymagane.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('users/', {
        ...form,
        group: form.group || undefined,
      });
      setMessage('Użytkownik został dodany.');
      setForm(initialFormState);
      await loadUsers();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Nie udało się zapisać użytkownika.';
      setError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManageUsers) {
    return (
      <section>
        <h1>Użytkownicy</h1>
        <p>Nie masz uprawnień do zarządzania użytkownikami.</p>
      </section>
    );
  }

  if (loading) {
    return <div className="page-loading">Ładowanie użytkowników…</div>;
  }

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Użytkownicy</h1>
          <p>Zarządzaj kontami i dodawaj nowe osoby do systemu.</p>
        </div>
        <div className="actions">
          <span className="muted">Administrator: {fullName || user?.username}</span>
        </div>
      </header>

      <div className="user-layout">
        <div className="user-form">
          <h2>Dodaj użytkownika</h2>
          <p>Uzupełnij podstawowe dane i przypisz grupę.</p>
          {message && <div className="callout success">{message}</div>}
          {error && <div className="callout error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label>
              Login *
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="np. kowalski"
                required
              />
            </label>
            <label>
              Hasło *
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 znaków"
                required
              />
            </label>
            <label>
              Imię
              <input name="first_name" value={form.first_name} onChange={handleChange} />
            </label>
            <label>
              Nazwisko
              <input name="last_name" value={form.last_name} onChange={handleChange} />
            </label>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="np. pracownik@firma.pl"
              />
            </label>
            <label>
              Grupa
              <select name="group" value={form.group} onChange={handleChange}>
                <option value="">Brak</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Zapisywanie…' : 'Dodaj użytkownika'}
              </button>
            </div>
          </form>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Imię i nazwisko</th>
                <th>E-mail</th>
                <th>Grupy</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>{account.username}</td>
                  <td>
                    {(account.first_name || account.last_name
                      ? `${account.first_name || ''} ${account.last_name || ''}`.trim()
                      : '—')}
                  </td>
                  <td>{account.email || '—'}</td>
                  <td>{account.groups?.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="empty">Brak użytkowników do wyświetlenia.</p>}
        </div>
      </div>
    </section>
  );
}
