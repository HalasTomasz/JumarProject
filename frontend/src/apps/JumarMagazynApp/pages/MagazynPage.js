import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import './MagazynPage.css';

const STORAGE_KEY = 'jumar_magazyn_items_v1';

const DEFAULT_FORM = {
  name: '',
  sku: '',
  location: '',
  quantity: '0',
  minQuantity: '0',
  unit: 'szt.'
};

const DATE_FORMATTER = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'short',
  timeStyle: 'short'
});

function createItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function normalizeItem(rawItem) {
  return {
    id: String(rawItem?.id || createItemId()),
    name: String(rawItem?.name || '').trim(),
    sku: String(rawItem?.sku || '').trim(),
    location: String(rawItem?.location || '').trim(),
    quantity: toNonNegativeNumber(rawItem?.quantity),
    minQuantity: toNonNegativeNumber(rawItem?.minQuantity),
    unit: String(rawItem?.unit || 'szt.').trim() || 'szt.',
    updatedAt: rawItem?.updatedAt || new Date().toISOString()
  };
}

function loadItems() {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeItem(item))
      .filter((item) => item.name.length > 0);
  } catch (error) {
    return [];
  }
}

function stockStatus(item) {
  if (item.quantity === 0) {
    return { label: 'Brak', className: 'warehouse-badge-empty' };
  }
  if (item.quantity <= item.minQuantity) {
    return { label: 'Niski', className: 'warehouse-badge-low' };
  }
  return { label: 'OK', className: 'warehouse-badge-ok' };
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return DATE_FORMATTER.format(date);
}

export default function MagazynPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [items, setItems] = useState(loadItems);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [steps, setSteps] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStock = items.filter((item) => item.quantity <= item.minQuantity).length;
    const emptyStock = items.filter((item) => item.quantity === 0).length;
    const latestUpdate = items.reduce((latest, item) => {
      if (!latest || item.updatedAt > latest) {
        return item.updatedAt;
      }
      return latest;
    }, '');
    return {
      positions: items.length,
      totalUnits,
      lowStock,
      emptyStock,
      latestUpdate
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.sku.toLowerCase().includes(normalizedQuery) ||
          item.location.toLowerCase().includes(normalizedQuery);
        if (!matchesQuery) {
          return false;
        }
        if (statusFilter === 'low') {
          return item.quantity <= item.minQuantity;
        }
        if (statusFilter === 'ok') {
          return item.quantity > item.minQuantity;
        }
        if (statusFilter === 'empty') {
          return item.quantity === 0;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [items, query, statusFilter]);

  const updateFormField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
  };

  const saveItem = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setNotice({ type: 'error', text: 'Podaj nazwę produktu.' });
      return;
    }

    const preparedItem = {
      name,
      sku: form.sku.trim(),
      location: form.location.trim(),
      quantity: toNonNegativeNumber(form.quantity),
      minQuantity: toNonNegativeNumber(form.minQuantity),
      unit: form.unit.trim() || 'szt.',
      updatedAt: new Date().toISOString()
    };

    if (editId) {
      setItems((prev) =>
        prev.map((item) => (item.id === editId ? { ...item, ...preparedItem } : item))
      );
      setNotice({ type: 'success', text: 'Pozycja zaktualizowana.' });
    } else {
      setItems((prev) => [{ id: createItemId(), ...preparedItem }, ...prev]);
      setNotice({ type: 'success', text: 'Nowa pozycja dodana.' });
    }
    resetForm();
  };

  const editItem = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      location: item.location,
      quantity: String(item.quantity),
      minQuantity: String(item.minQuantity),
      unit: item.unit
    });
  };

  const removeItem = (item) => {
    if (!window.confirm(`Usunąć pozycję "${item.name}"?`)) {
      return;
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setSteps((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    if (editId === item.id) {
      resetForm();
    }
    setNotice({ type: 'success', text: 'Pozycja usunięta.' });
  };

  const changeStep = (itemId, value) => {
    if (value === '' || /^\d+$/.test(value)) {
      setSteps((prev) => ({ ...prev, [itemId]: value }));
    }
  };

  const changeQuantity = (item, direction) => {
    const step = Math.max(1, toNonNegativeNumber(steps[item.id] || 1));
    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) {
          return entry;
        }
        const nextQuantity =
          direction === 'in'
            ? entry.quantity + step
            : Math.max(0, entry.quantity - step);
        return {
          ...entry,
          quantity: nextQuantity,
          updatedAt: new Date().toISOString()
        };
      })
    );
    setNotice({
      type: 'success',
      text:
        direction === 'in'
          ? `Dodano ${step} ${item.unit} do "${item.name}".`
          : `Wydano ${step} ${item.unit} z "${item.name}".`
    });
  };

  const clearAll = () => {
    if (!items.length) {
      return;
    }
    if (!window.confirm('Wyczyścić cały magazyn? Tej operacji nie da się cofnąć.')) {
      return;
    }
    setItems([]);
    setSteps({});
    resetForm();
    setNotice({ type: 'success', text: 'Magazyn wyczyszczony.' });
  };

  return (
    <section className="warehouse-page">
      <header className="warehouse-hero">
        <div>
          <p className="warehouse-kicker">JumarMagazynApp</p>
          <h1>Magazyn: prosto, szybko, czytelnie</h1>
          <p>
            Sprawdź stan magazynu, dodawaj pozycje i koryguj ilości jednym kliknięciem.
            Zmiany zapisują się lokalnie w przeglądarce.
          </p>
          <p className="warehouse-storage-note">Tryb zapisu: localStorage (bez serwera).</p>
        </div>
        <div className="warehouse-hero-side">
          <div className="warehouse-user-chip">
            <strong>{user?.username}</strong>
            <span>{user?.groups?.join(', ') || 'Użytkownik'}</span>
          </div>
          <div className="warehouse-hero-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/apps')}>
              Wybór aplikacji
            </button>
            <button type="button" className="btn btn-outline" onClick={logout}>
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {notice && <div className={`callout ${notice.type}`}>{notice.text}</div>}

      <div className="warehouse-metrics">
        <article className="warehouse-metric-card">
          <p>Pozycje</p>
          <strong>{stats.positions}</strong>
        </article>
        <article className="warehouse-metric-card">
          <p>Suma sztuk</p>
          <strong>{stats.totalUnits}</strong>
        </article>
        <article className="warehouse-metric-card">
          <p>Niski stan</p>
          <strong>{stats.lowStock}</strong>
        </article>
        <article className="warehouse-metric-card">
          <p>Puste pozycje</p>
          <strong>{stats.emptyStock}</strong>
        </article>
        <article className="warehouse-metric-card warehouse-metric-wide">
          <p>Ostatnia aktualizacja</p>
          <strong>{stats.latestUpdate ? formatTimestamp(stats.latestUpdate) : 'Brak danych'}</strong>
        </article>
      </div>

      <div className="warehouse-layout">
        <article className="warehouse-panel">
          <h2>{editId ? 'Edytuj pozycję' : 'Dodaj nową pozycję'}</h2>
          <form className="warehouse-form" onSubmit={saveItem}>
            <label>
              Nazwa produktu
              <input
                name="name"
                value={form.name}
                onChange={updateFormField}
                placeholder="np. Folia stretch 500 mm"
                required
              />
            </label>
            <label>
              SKU / kod
              <input
                name="sku"
                value={form.sku}
                onChange={updateFormField}
                placeholder="np. FOL-500-ST"
              />
            </label>
            <label>
              Lokalizacja
              <input
                name="location"
                value={form.location}
                onChange={updateFormField}
                placeholder="np. A-01-03"
              />
            </label>
            <label>
              Jednostka
              <input
                name="unit"
                value={form.unit}
                onChange={updateFormField}
                placeholder="szt."
              />
            </label>
            <label>
              Ilość na stanie
              <input
                type="number"
                min="0"
                name="quantity"
                value={form.quantity}
                onChange={updateFormField}
                required
              />
            </label>
            <label>
              Minimalny stan
              <input
                type="number"
                min="0"
                name="minQuantity"
                value={form.minQuantity}
                onChange={updateFormField}
                required
              />
            </label>
            <div className="warehouse-form-actions">
              <button className="btn" type="submit">
                {editId ? 'Zapisz zmiany' : 'Dodaj pozycję'}
              </button>
              {editId && (
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Anuluj
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={clearAll}
                disabled={items.length === 0}
              >
                Wyczyść magazyn
              </button>
            </div>
          </form>
        </article>

        <article className="warehouse-panel warehouse-panel-list">
          <div className="warehouse-list-header">
            <h2>Stan magazynowy</h2>
            <p>
              Widok: {filteredItems.length} / {items.length}
            </p>
          </div>

          <div className="warehouse-filters">
            <label>
              Szukaj
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nazwa, SKU lub lokalizacja"
              />
            </label>
            <label>
              Filtr
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Wszystkie</option>
                <option value="low">Niski stan</option>
                <option value="empty">Braki</option>
                <option value="ok">Powyżej minimum</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-outline warehouse-filter-reset"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              Reset
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty warehouse-empty">
              Brak pozycji. Dodaj pierwszy produkt formularzem po lewej.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty warehouse-empty">
              Brak wyników dla aktualnego filtra.
            </div>
          ) : (
            <div className="warehouse-table-wrap">
              <table className="warehouse-table">
                <thead>
                  <tr>
                    <th>Produkt</th>
                    <th>Lokalizacja</th>
                    <th>Stan</th>
                    <th>Minimum</th>
                    <th>Status</th>
                    <th>Aktualizacja</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const status = stockStatus(item);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="warehouse-product">
                            <strong>{item.name}</strong>
                            <span>{item.sku || 'Brak SKU'}</span>
                          </div>
                        </td>
                        <td>{item.location || '-'}</td>
                        <td>
                          <strong>{item.quantity}</strong> {item.unit}
                        </td>
                        <td>
                          {item.minQuantity} {item.unit}
                        </td>
                        <td>
                          <span className={`warehouse-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>{formatTimestamp(item.updatedAt)}</td>
                        <td>
                          <div className="warehouse-row-actions">
                            <input
                              className="warehouse-step-input"
                              value={steps[item.id] ?? '1'}
                              onChange={(event) => changeStep(item.id, event.target.value)}
                              inputMode="numeric"
                              aria-label={`Krok zmiany dla ${item.name}`}
                            />
                            <button
                              type="button"
                              className="btn btn-small"
                              onClick={() => changeQuantity(item, 'in')}
                            >
                              + Przyjęcie
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-outline"
                              onClick={() => changeQuantity(item, 'out')}
                            >
                              - Wydanie
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-outline"
                              onClick={() => editItem(item)}
                            >
                              Edytuj
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => removeItem(item)}
                            >
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
