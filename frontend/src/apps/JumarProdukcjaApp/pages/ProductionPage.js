import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import { getEffectivePlannedLength } from '../../../utils/orderMetrics';
import {
  getPriorityClassName,
  sortProductionOrders,
  sortProductionRolls,
} from './productionPageUtils';

const numberFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return numberFormatter.format(numeric);
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('pl-PL');
};

const getPlannedLength = (order) => {
  return getEffectivePlannedLength(order);
};

const getPlannedWeight = (order) => {
  if (!order) {
    return null;
  }
  const plannedWeight = Number(order.WagaFoliZlec);
  if (Number.isFinite(plannedWeight) && plannedWeight > 0) {
    return plannedWeight;
  }
  return null;
};

const getRemainingLength = (order, summary) => {
  const apiRemaining = Number(summary?.length_remaining);
  if (Number.isFinite(apiRemaining)) {
    return Math.max(apiRemaining, 0);
  }
  const plannedLength = getPlannedLength(order);
  if (plannedLength === null) {
    return null;
  }
  const producedLength = Number(summary?.length_produced);
  if (!Number.isFinite(producedLength)) {
    return plannedLength;
  }
  return Math.max(plannedLength - producedLength, 0);
};

const getRemainingWeight = (order, summary) => {
  const apiRemaining = Number(summary?.weight_remaining);
  if (Number.isFinite(apiRemaining)) {
    return Math.max(apiRemaining, 0);
  }
  const plannedWeight = getPlannedWeight(order);
  if (plannedWeight === null) {
    return null;
  }
  const producedWeight = Number(summary?.weight_produced);
  if (!Number.isFinite(producedWeight)) {
    return plannedWeight;
  }
  return Math.max(plannedWeight - producedWeight, 0);
};

const getRemainingRolls = (order, summary) => {
  const apiRemaining = Number(summary?.rolls_remaining);
  if (Number.isFinite(apiRemaining)) {
    return Math.max(apiRemaining, 0);
  }
  const targetRolls = Number(order?.IloscRolekZlec);
  if (!Number.isFinite(targetRolls)) {
    return null;
  }
  const producedRolls = Number(summary?.rolls_produced);
  if (!Number.isFinite(producedRolls)) {
    return targetRolls;
  }
  return Math.max(targetRolls - producedRolls, 0);
};

export default function ProductionPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rolls, setRolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    return apiClient
      .get('production/orders/')
      .then(({ data }) => setOrders(sortProductionOrders(data.results || data)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!selected && orders.length) {
      setSelected(orders[0]);
    }
  }, [orders, selected]);

  useEffect(() => {
    setStatusMessage('');
    setStatusError('');
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const encodedOrderCode = encodeURIComponent(selected.NrZp);
    Promise.all([
      apiClient.get(`production/orders/${encodedOrderCode}/rolls/`),
      apiClient.get(`production/orders/${encodedOrderCode}/summary/`),
    ])
      .then(([{ data: rollData }, { data: summaryData }]) => {
        setRolls(sortProductionRolls(rollData.results || rollData));
        setSummary(summaryData);
      })
      .catch(() => {
        setRolls([]);
        setSummary(null);
      });
  }, [selected]);

  const handleOpenRollForm = () => {
    if (!selected) {
      return;
    }
    navigate(`/production/${selected.id}/roll/new`);
  };

  const handleEditRoll = (rollId) => {
    if (!selected || !rollId) {
      return;
    }
    navigate(`/production/${selected.id}/roll/${rollId}/edit`);
  };

  const handleMarkReady = async () => {
    if (!selected) {
      return;
    }
    const confirmed = window.confirm(
      `Czy na pewno oznaczyć zlecenie ${selected.NrZp} jako gotowe?`
    );
    if (!confirmed) {
      return;
    }
    setStatusLoading(true);
    setStatusMessage('');
    setStatusError('');
    try {
      await apiClient.post(`orders/${selected.id}/status/`, { status: 2 });
      setStatusMessage('Zlecenie zostało oznaczone jako zrealizowane.');
      setSelected(null);
      setSummary(null);
      setRolls([]);
      await loadOrders();
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        Object.values(error.response?.data || {})[0] ||
        'Nie udało się zaktualizować statusu.';
      setStatusError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setStatusLoading(false);
    }
  };

  const remainingLength = getRemainingLength(selected, summary);
  const remainingWeight = getRemainingWeight(selected, summary);
  const remainingRolls = getRemainingRolls(selected, summary);

  return (
    <section className="production">
      <header className="section-header">
        <div>
          <h1>Produkcja</h1>
          <p>Zlecenia w realizacji i raport rolki.</p>
        </div>
      </header>

      {loading ? (
        <div className="page-loading">Ładowanie zleceń…</div>
      ) : (
        <div className="production-grid">
          <div className="orders-list">
            <h2>Aktywne zlecenia</h2>
            <div className="production-priority-legend" aria-label="Legenda priorytetów">
              <span className="production-priority-chip is-high-priority">Czerwony: pilne</span>
              <span className="production-priority-chip is-medium-priority">Żółty: średni priorytet</span>
              <span className="production-priority-chip is-low-priority">Biały: bez priorytetu</span>
            </div>
            <ul>
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    className={`production-order-button ${getPriorityClassName(order)}${selected?.id === order.id ? ' is-active' : ''}`}
                    onClick={() => setSelected(order)}
                  >
                    <span className="order-list-main">
                      <strong>{order.Artykul || 'Brak artykułu'}</strong>
                      <small className="production-order-date">{formatDate(order.Data)}</small>
                    </span>
                    <span className="production-order-meta">
                      <small>{order.nrwyt_label || '—'}</small>
                      <span>{order.foil_type_label}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!orders.length && <li className="empty">Brak aktywnych zleceń.</li>}
            </ul>
          </div>

          <div className="production-details">
            {selected ? (
              <>
                <div className="production-order-info">
                  <h2>Zlecenie</h2>
                  <div className="production-order-highlights">
                    <div className="order-focus-card order-focus-article">
                      <p>Artykuł</p>
                      <strong>{selected.Artykul || '—'}</strong>
                      <small>Data: {formatDate(selected.Data)}</small>
                    </div>
                    <div className="order-focus-card order-focus-remaining">
                      <p>Długość do zakończenia [mb]</p>
                      <strong>{formatNumber(remainingLength)}</strong>
                      <small>
                        Planowana długość: {formatNumber(selected.DlugRolkiZlec_Korekta)} mb
                      </small>
                    </div>
                    <div className="order-focus-card order-focus-notes">
                      <p>Uwagi</p>
                      <strong>{selected.Uwagi || 'Brak dodatkowych uwag.'}</strong>
                    </div>
                  </div>
                  <div className="production-order-grid">
                    <div className="order-info-card">
                      <p>SzerWorka [mm]</p>
                      <strong>{formatNumber(selected.SzerWorka)}</strong>
                    </div>
                    <div className="order-info-card">
                      <p>Zakładka [mm]</p>
                      <strong>{formatNumber(selected.Zakladka)}</strong>
                    </div>
                    <div className="order-info-card">
                      <p>GrubWorka [mikr]</p>
                      <strong>{formatNumber(selected.GrubWorka)}</strong>
                    </div>
                    <div className="order-info-card">
                      <p>DługRolkZlec korekta [mb]</p>
                      <strong>{formatNumber(selected.DlugRolkiZlec_Korekta)}</strong>
                    </div>
                    <div className="order-info-card">
                      <p>WagaRolkiZlec [kg]</p>
                      <strong>{formatNumber(selected.WagaRolkiZlec)}</strong>
                    </div>
                    <div className="order-info-card">
                      <p>IlośćRolekZlec [szt]</p>
                      <strong>{formatNumber(selected.IloscRolekZlec)}</strong>
                    </div>
                  </div>
                </div>

                <div className="rolls">
                  <h2>Rolki</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Data</th>
                        <th>Zmiana</th>
                        <th>Nr Wytł</th>
                        <th>Długość</th>
                        <th>Waga</th>
                        <th>GrubośćWynikdoZakl%</th>
                        <th>Operator</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolls.map((roll) => (
                        <tr key={roll.id}>
                          <td>{roll.Rolka}</td>
                          <td>{roll.Data}</td>
                          <td>{roll.Zmiana}</td>
                          <td>{roll.NrWytl}</td>
                          <td>{roll.DlugRolkiProd}</td>
                          <td>{roll.WagaRolkiProd}</td>
                          <td>{roll.Wynik}</td>
                          <td>{roll.UserName}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-small btn-outline"
                              onClick={() => handleEditRoll(roll.id)}
                            >
                              Edytuj
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!rolls.length && (
                        <tr>
                          <td colSpan={9} className="empty">
                            Brak rolek dla wybranego zlecenia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {statusMessage && <div className="callout success">{statusMessage}</div>}
                {statusError && <div className="callout error">{statusError}</div>}
                <div className="production-actions-panel">
                  <button type="button" className="btn" onClick={handleOpenRollForm}>
                    Dodaj rolkę
                  </button>
                  <button
                    type="button"
                    className="btn btn-ready"
                    disabled={statusLoading || !selected}
                    onClick={handleMarkReady}
                  >
                    {statusLoading ? 'Aktualizowanie…' : 'Zrealizuj'}
                  </button>
                </div>
                <div className="summary production-summary">
                  <h2>Podsumowanie</h2>
                  {summary ? (
                    <div className="grid stats">
                      <div className="stat-card">
                        <p>Waga produkcja [kg]</p>
                        <strong>{formatNumber(summary.weight_produced)}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Waga do zakończenia [kg]</p>
                        <strong>{formatNumber(remainingWeight)}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Długość produkcja [mb]</p>
                        <strong>{formatNumber(summary.length_produced)}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Długość do zakończenia [mb]</p>
                        <strong>{formatNumber(remainingLength)}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Rolki produkcja [szt]</p>
                        <strong>{formatNumber(summary.rolls_produced)}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Rolki do zakończenia [szt]</p>
                        <strong>{formatNumber(remainingRolls)}</strong>
                      </div>
                    </div>
                  ) : (
                    <p>Brak danych.</p>
                  )}
                </div>
              </>
            ) : (
              <p>Wybierz zlecenie aby zobaczyć szczegóły produkcji.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
