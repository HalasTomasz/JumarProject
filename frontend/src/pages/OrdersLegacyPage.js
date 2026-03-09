import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';

const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return numberFormatter.format(numeric);
};

export default function OrdersLegacyPage() {
  const [orders, setOrders] = useState([]);
  const [metadata, setMetadata] = useState({ status: [], priority: [], foil_types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [copyingId, setCopyingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFilter = searchParams.get('status') || '';
  const searchTerm = searchParams.get('q') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('orders/legacy/', {
        params: {
          status: statusFilter || undefined,
          q: searchTerm || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      setOrders(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError('Nie udało się pobrać danych legacy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('meta/orders/').then(({ data }) => setMetadata(data));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm, dateFrom, dateTo]);

  const handleParamChange = (key) => (event) => {
    const value = event.target.value;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      return params;
    });
  };

  const handleCopy = async (id) => {
    setCopyingId(id);
    setActionMessage('');
    setActionError('');
    try {
      await apiClient.post(`orders/${id}/copy/`);
      setActionMessage('Zlecenie zostało skopiowane.');
      await loadOrders();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Nie udało się skopiować zlecenia.';
      setActionError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setCopyingId(null);
    }
  };

  const priorityLabels = useMemo(() => {
    return metadata.priority.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});
  }, [metadata.priority]);

  const statusLabels = useMemo(() => {
    return metadata.status.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});
  }, [metadata.status]);

  return (
    <section className="orders-legacy">
      <header className="section-header">
        <div>
          <h1>Plan zleceń (legacy)</h1>
          <p>Widok zachowujący układ tabeli z poprzedniej aplikacji.</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline" type="button" onClick={() => navigate(-1)}>
            Powrót
          </button>
          <Link className="btn btn-outline" to="/orders">
            Wróć do nowego widoku
          </Link>
          <Link className="btn btn-outline" to="/orders/zlecenie/new">
            Dodaj (legacy)
          </Link>
          <button className="btn" onClick={loadOrders} disabled={loading}>
            {loading ? 'Odświeżanie…' : 'Odśwież'}
          </button>
        </div>
      </header>

      <div className="filters">
        <label>
          Status
          <select value={statusFilter} onChange={handleParamChange('status')}>
            <option value="">Wszystkie</option>
            {metadata.status.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Szukaj po nr ZP
          <input value={searchTerm} onChange={handleParamChange('q')} placeholder="np. 2024/15" />
        </label>
        <label>
          Data od
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={handleParamChange('date_from')} />
        </label>
        <label>
          Data do
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={handleParamChange('date_to')} />
        </label>
      </div>

      {actionMessage && <div className="callout success">{actionMessage}</div>}
      {actionError && <div className="callout error">{actionError}</div>}
      {error && <div className="callout error">{error}</div>}

      {loading ? (
        <div className="page-loading">Ładowanie widoku legacy…</div>
      ) : (
        <div className="table-wrapper legacy-table">
          <div className="legacy-table-scroll">
            <table className="legacy-plan-table">
            <thead>
              <tr>
                <th rowSpan={2}>Nr</th>
                <th rowSpan={2}>NR ZP</th>
                <th rowSpan={2} colSpan={4}>Artykuł</th>
                <th rowSpan={2}>IlośćZlec<br />[szt]</th>
                <th rowSpan={2}>SzerWorka<br />[mm]</th>
                <th rowSpan={2}>SzerRękawa<br />[mm]</th>
                <th rowSpan={2}>Zakładka<br />[mm]</th>
                <th rowSpan={2}>DługWorka<br />[mm]</th>
                <th rowSpan={2}>GrubWorka<br />[μm]</th>
                <th rowSpan={2}>WagaFoilZlec<br />[kg]</th>
                <th rowSpan={2}>DługFoliPlan<br />[mb]</th>
                <th rowSpan={2}>IlośćRolek<br />[szt]</th>
                <th colSpan={2}>DługRolki [mb]</th>
                <th rowSpan={2}>DługFoliZlec<br />korekta [mb]</th>
                <th rowSpan={2}>WagaRolkiZlec<br />[kg]</th>
                <th rowSpan={2}>Rodzaj folii</th>
                <th rowSpan={2}>NrWytł</th>
                <th colSpan={2}>Dane</th>
                <th rowSpan={2}>Uwagi</th>
                <th rowSpan={2}>Status</th>
                <th rowSpan={2}>Funkcje</th>
              </tr>
              <tr>
                <th>Plan</th>
                <th>Korekta</th>
                <th>Priorytet</th>
                <th>Taśma</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <Fragment key={order.id}>
                  <tr key={`${order.id}-main`}>
                    <td rowSpan={4}>{index + 1}</td>
                    <td rowSpan={4}>{order.NrZp}</td>
                    <td className={order.Priorytet === 0 ? 'priority-text' : ''} colSpan={4} rowSpan={3}>
                      {order.Artykul || '—'}
                    </td>
                    <td rowSpan={4}>{formatNumber(order.IloscZlec)}</td>
                    <td rowSpan={4}>{formatNumber(order.SzerWorka)}</td>
                    <td rowSpan={4}>{formatNumber(order.SzerRekawa)}</td>
                    <td rowSpan={4}>{formatNumber(order.Zakladka)}</td>
                    <td rowSpan={2}>{formatNumber(order.DlugWorka)}</td>
                    <td rowSpan={2}>{formatNumber(order.GrubWorka)}</td>
                    <td rowSpan={2}>{formatNumber(order.WagaFoliZlec)}</td>
                    <td rowSpan={2}>{formatNumber(order.DlugFoliPlan)}</td>
                    <td rowSpan={4}>{formatNumber(order.IloscRolekZlec)}</td>
                    <td rowSpan={2}>{formatNumber(order.DlugRolkiPlan)}</td>
                    <td rowSpan={2}>{formatNumber(order.DlugRolkiZlec_Korekta)}</td>
                    <td rowSpan={4}>{formatNumber(order.DlugFoliZlec_Korekta)}</td>
                    <td rowSpan={4}>{formatNumber(order.WagaRolkiZlec)}</td>
                    <td rowSpan={4}>{order.foil_type_label}</td>
                    <td rowSpan={4}>{order.nrwyt_label}</td>
                    <td rowSpan={2}>{priorityLabels[order.Priorytet] || '—'}</td>
                    <td rowSpan={2}>{order.tasma_label}</td>
                    <td rowSpan={4} className="legacy-remarks">
                      {order.Uwagi || '—'}
                    </td>
                    <td rowSpan={4}>
                      <span className={`badge status-${order.Status}`}>
                        {statusLabels[order.Status] || order.status_label}
                      </span>
                    </td>
                    <td rowSpan={4} className="legacy-actions">
                      <Link className="btn btn-outline btn-small" to={`/orders/${order.id}`}>
                        Edytuj
                      </Link>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => handleCopy(order.id)}
                        disabled={copyingId === order.id}
                      >
                        {copyingId === order.id ? 'Kopiowanie…' : 'Kopiuj'}
                      </button>
                    </td>
                  </tr>
                  <tr className="legacy-row-divider" key={`${order.id}-divider-top`}>
                    <td colSpan={27}></td>
                  </tr>
                  <tr className="legacy-row-detail" key={`${order.id}-detail`}>
                    <th>DolneOdch [μm]</th>
                    <td>{formatNumber(order.DolneOdch)}</td>
                    <th>DługFoilPlan korekta [mb]</th>
                    <td>{formatNumber(order.DlugFoilPlan_Korekta)}</td>
                    <th>DługRolkiZlec korekta [mb]</th>
                    <td>{formatNumber(order.DlugRolkiZlec_Korekta)}</td>
                    <th>Data zlecenia</th>
                    <td>{order.Data}</td>
                  </tr>
                  <tr className="legacy-row-divider" key={`${order.id}-divider-bottom`}>
                    <td colSpan={27}></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
            {!orders.length && <p className="empty">Brak zleceń spełniających kryteria.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
