import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import useAuth from '../../../hooks/useAuth';

const formatGroupLabel = (value = '') =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const createInitialFormState = () => ({
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  group: '',
  phone_number: '',
});

export default function UsersPage() {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.permissions?.can_manage_users);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(() => createInitialFormState());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fullName = useMemo(
    () => `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    [user?.first_name, user?.last_name]
  );

  const isAdminUser = (account = {}) =>
    account.groups?.some((group) => group?.toLowerCase() === 'admin');

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

  const handleDeleteUser = async (userId) => {
    const account = users.find((entry) => entry.id === userId);
    if (!account) {
      return;
    }
    if (isAdminUser(account)) {
      setError('Nie można usunąć administratora.');
      return;
    }
    const displayName =
      account.first_name || account.last_name
        ? `${account.first_name || ''} ${account.last_name || ''}`.trim()
        : account.username;
    const confirmationMessage = `Czy na pewno chcesz usunąć użytkownika ${displayName || account.username}? Tego działania nie można cofnąć.`;
    if (typeof window !== 'undefined' && !window.confirm(confirmationMessage)) {
      return;
    }
    setError('');
    setMessage('');
    setDeletingUserId(userId);
    try {
      await apiClient.delete(`users/${userId}/`);
      await loadUsers();
      setMessage('Użytkownik został usunięty.');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Nie udało się usunąć użytkownika.';
      setError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setDeletingUserId(null);
    }
  };

  const openEditModal = (account) => {
    setEditMessage('');
    setEditingUser(account);
    setEditForm({
      first_name: account.first_name || '',
      last_name: account.last_name || '',
      email: account.email || '',
      group: account.groups?.[0] || '',
      phone_number: account.phone_number || '',
    });
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({});
    setEditError('');
    setEditSaving(false);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await apiClient.patch(`users/${editingUser.id}/`, {
        ...editForm,
        group: editForm.group || null,
      });
      await loadUsers();
      setEditMessage('Dane użytkownika zostały zaktualizowane.');
      closeEditModal();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Nie udało się zaktualizować użytkownika.';
      setEditError(Array.isArray(detail) ? detail.join(' ') : detail);
      setEditSaving(false);
    }
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
        phone_number: form.phone_number || undefined,
        group: form.group || undefined,
      });
      setMessage('Użytkownik został dodany.');
      setForm(createInitialFormState());
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

      <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Imię i nazwisko</th>
                <th>E-mail</th>
                <th>Telefon</th>
                <th>Grupa</th>
                <th>Akcje</th>
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
                  <td>{account.phone_number || '—'}</td>
                  <td>
                    {account.groups?.length
                      ? account.groups.map((group) => formatGroupLabel(group)).join(', ')
                      : '—'}
                  </td>
                  <td className="user-row-actions">
                    <div className="user-row-buttons">
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => openEditModal(account)}
                      >
                        Edytuj
                      </button>
                      {isAdminUser(account) ? (
                        <span className="muted">Administrator</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteUser(account.id)}
                          disabled={deletingUserId === account.id}
                        >
                          {deletingUserId === account.id ? 'Usuwanie…' : 'Usuń'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {editMessage && <div className="callout success">{editMessage}</div>}
          {!users.length && <p className="empty">Brak użytkowników do wyświetlenia.</p>}
          <div className="add-user-toggle">
            <button className="btn" type="button" onClick={() => setShowAddForm((prev) => !prev)}>
              {showAddForm ? 'Ukryj formularz dodawania' : 'Dodaj użytkownika'}
            </button>
          </div>
        </div>

      {(message || error) && (
        <div className="user-feedback">
          {message && <div className="callout success">{message}</div>}
          {error && <div className="callout error">{error}</div>}
        </div>
      )}

      {showAddForm && (
        <div className="user-form">
          <h2>Dodaj użytkownika</h2>
          <p>Uzupełnij podstawowe dane i przypisz grupę.</p>
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
              Telefon
              <input
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="np. 600 700 800"
              />
            </label>
            <label>
              Grupa
              <select name="group" value={form.group} onChange={handleChange}>
                <option value="">Wybierz grupę</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {formatGroupLabel(group)}
                  </option>
                ))}
              </select>
              <small className="muted">Wybierz jedną grupę (np. Kierownik).</small>
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Zapisywanie…' : 'Dodaj użytkownika'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edytuj użytkownika</h3>
              <button type="button" className="modal-close" onClick={closeEditModal}>
                {'\u00d7'}
              </button>
            </div>
            {editError && <div className="callout error">{editError}</div>}
            <form className="modal-form" onSubmit={handleEditSubmit}>
              <label>
                Imię
                <input
                  name="first_name"
                  value={editForm.first_name || ''}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Nazwisko
                <input
                  name="last_name"
                  value={editForm.last_name || ''}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Telefon
                <input
                  name="phone_number"
                  value={editForm.phone_number || ''}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Grupa
                <select name="group" value={editForm.group || ''} onChange={handleEditChange}>
                  <option value="">Brak grupy</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {formatGroupLabel(group)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeEditModal}>
                  Anuluj
                </button>
                <button type="submit" className="btn" disabled={editSaving}>
                  {editSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
