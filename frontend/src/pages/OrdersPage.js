import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';

const getPageWord = (value) => {
  if (value === 1) {
    return 'strona';
  }
  const remainder100 = value % 100;
  if (remainder100 >= 12 && remainder100 <= 14) {
    return 'stron';
  }
  const remainder10 = value % 10;
  if (remainder10 >= 2 && remainder10 <= 4) {
    return 'strony';
  }
  return 'stron';
};

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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [metadata, setMetadata] = useState({ status: [] });
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const searchTerm = searchParams.get('q') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = Number(searchParams.get('page') || 1);
  const navigate = useNavigate();
  const perPage = Math.max(orders.length, 1);
  const calculatedTotalPages = pagination.next ? Math.ceil(pagination.count / perPage) : page;
  const totalPages = Math.max(calculatedTotalPages, page);
  const pagesLeft = Math.max(totalPages - page, 0);
  const pagesLeftLabel =
    pagesLeft === 0 ? 'Ostatnia strona' : `Pozostało ${pagesLeft} ${getPageWord(pagesLeft)}`;
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );
  const handleOrderSelect = useCallback((orderId) => {
    setSelectedOrderId(orderId);
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('orders/', {
        params: {
          status: statusFilter || undefined,
          q: searchTerm || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
        },
      });
      let nextOrders = [];
      if (Array.isArray(data?.results)) {
        nextOrders = data.results;
        setPagination({ next: data.next, previous: data.previous, count: data.count });
      } else if (Array.isArray(data)) {
        nextOrders = data;
        setPagination({ next: null, previous: null, count: data.length });
      } else {
        nextOrders = [];
        setPagination({ next: null, previous: null, count: 0 });
      }
      setOrders(nextOrders);
      setSelectedOrderId((prev) => {
        if (!nextOrders.length) {
          return null;
        }
        return nextOrders.some((order) => order.id === prev) ? prev : nextOrders[0].id;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('meta/orders/').then(({ data }) => setMetadata(data));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchTerm, dateFrom, dateTo, page]);

  const handleFilterChange = (event) => {
    const value = event.target.value;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set('status', value);
      } else {
        params.delete('status');
      }
      return params;
    });
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      params.set('page', '1');
      return params;
    });
  };

  const handleDateChange = (key) => (event) => {
    const value = event.target.value;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set('page', '1');
      return params;
    });
  };

  const handlePageChange = (direction) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const current = Number(params.get('page') || 1);
      const nextPage = direction === 'next' ? current + 1 : current - 1;
      if (nextPage <= 0) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      return params;
    });
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Zlecenia</h1>
          <p>Zarządzaj pełnym cyklem zleceń produkcyjnych.</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline" onClick={loadOrders}>
            Odśwież
          </button>
          <Link className="btn btn-outline" to="/orders/zlecenie">
            Widok legacy
          </Link>
          <button className="btn" onClick={() => navigate('/orders/new')}>
            Nowe zlecenie
          </button>
        </div>
      </header>

      <div className="filters">
        <label>
          Status
          <select value={statusFilter} onChange={handleFilterChange}>
            <option value="">Wszystkie</option>
            {metadata.status.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Szukaj po numerze
          <input value={searchTerm} onChange={handleSearch} placeholder="np. 2024/15" />
        </label>
        <label>
          Data od
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={handleDateChange('date_from')}
          />
        </label>
        <label>
          Data do
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={handleDateChange('date_to')}
          />
        </label>
      </div>

      {loading ? (
        <div className="page-loading">Ładowanie…</div>
      ) : (
        <div
          className="orders-layout"
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            flexDirection: 'row',
          }}
        >
          <div
            className="table-wrapper"
            style={{ flex: '1 1 640px', minWidth: '320px', maxWidth: '100%' }}
          >
            <table>
              <thead>
                <tr>
                  <th>Nr ZP</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Priorytet</th>
                  <th>Folia</th>
                  <th>Ilość</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isSelected={order.id === selectedOrderId}
                    onSelect={handleOrderSelect}
                  />
                ))}
              </tbody>
            </table>
            {!orders.length && <p className="empty">Brak zleceń dla wybranych filtrów.</p>}
            {pagination.count > orders.length && (
              <div className="table-pagination">
                <div className="table-pagination-info">
                  <strong>{`Strona ${page} z ${totalPages}`}</strong>
                  <span>{pagesLeftLabel}</span>
                </div>
                <div className="table-pagination-controls">
                  <button
                    className="btn btn-outline"
                    onClick={() => handlePageChange('prev')}
                    disabled={!pagination.previous && page <= 1}
                  >
                    Poprzednia
                  </button>
                  <span>Strona {page}</span>
                  <button
                    className="btn"
                    onClick={() => handlePageChange('next')}
                    disabled={!pagination.next}
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
          <OrdersDetailPanel order={selectedOrder} />
        </div>
      )}
    </section>
  );
}

const OrderRow = memo(function OrderRow({ order, isSelected, onSelect }) {
  const handleClick = useCallback(
    (event) => {
      if (event.target.closest('a, button')) {
        return;
      }
      onSelect(order.id);
    },
    [onSelect, order.id],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(order.id);
      }
    },
    [onSelect, order.id],
  );

  return (
    <tr
      className={`orders-row${isSelected ? ' is-selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-selected={isSelected}
      style={isSelected ? { backgroundColor: 'rgba(37, 99, 235, 0.08)' } : undefined}
    >
      <td>{order.NrZp || '—'}</td>
      <td>{order.Data || '—'}</td>
      <td>
        <StatusBadge status={order.Status} label={order.status_label} />
      </td>
      <td>{order.priority_label || '—'}</td>
      <td>{order.foil_type_label || '—'}</td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNumber(order.IloscZlec)}</td>
      <td>
        <Link className="btn btn-link" to={`/orders/${order.id}`}>
          Edytuj
        </Link>
      </td>
    </tr>
  );
});

const StatusBadge = memo(function StatusBadge({ status, label }) {
  const statusClass = status ? `status-${status}` : 'status-unknown';
  return <span className={`badge ${statusClass}`}>{label || '—'}</span>;
});

function OrdersDetailPanel({ order }) {
  const panelStyle = {
    flex: '1 1 420px',
    minWidth: '340px',
    maxWidth: '520px',
    order: -1,
  };

  if (!order) {
    return (
      <aside className="orders-detail-panel" style={panelStyle}>
        <div className="callout info">Wybierz zlecenie z tabeli, aby zobaczyć szczegóły.</div>
      </aside>
    );
  }

  const foilCorrection = order.DlugFoliZlec_Korekta ?? order.DlugFoilPlan_Korekta;

  const sections = [
    {
      title: 'Podstawowe informacje',
      items: [
        { label: 'Priorytet', value: order.priority_label || '—' },
        { label: 'Rodzaj folii', value: order.foil_type_label || '—' },
        { label: 'Nr wytłaczarki', value: order.nrwyt_label || order.nrwyt || '—' },
        { label: 'Taśma', value: order.tasma_label || order.Tasma || '—' },
      ],
    },
    {
      title: 'Wymiary i parametry folii',
      items: [
        { label: 'Szer. worka [mm]', value: formatNumber(order.SzerWorka) },
        { label: 'Szer. rękawa [mm]', value: formatNumber(order.SzerRekawa) },
        { label: 'Zakładka [mm]', value: formatNumber(order.Zakladka) },
        { label: 'Dł. worka [mm]', value: formatNumber(order.DlugWorka) },
        { label: 'Grubość [μm]', value: formatNumber(order.GrubWorka) },
        { label: 'Dolne odchyłki [μm]', value: formatNumber(order.DolneOdch) },
      ],
    },
    {
      title: 'Plan produkcji',
      items: [
        { label: 'Ilość [szt]', value: formatNumber(order.IloscZlec) },
        { label: 'Waga folii [kg]', value: formatNumber(order.WagaFoliZlec) },
        { label: 'Dług. folii plan [mb]', value: formatNumber(order.DlugFoliPlan) },
        { label: 'Dług. folii korekta [mb]', value: formatNumber(foilCorrection) },
      ],
    },
    {
      title: 'Role',
      items: [
        { label: 'Ilość rolek', value: formatNumber(order.IloscRolekZlec) },
        { label: 'Dług. rolki plan [mb]', value: formatNumber(order.DlugRolkiPlan) },
        { label: 'Dług. rolki korekta [mb]', value: formatNumber(order.DlugRolkiZlec_Korekta) },
        { label: 'Waga rolki [kg]', value: formatNumber(order.WagaRolkiZlec) },
      ],
    },
    {
      title: 'Dodatkowe informacje',
      items: [
        { label: 'Kod', value: order.Kod || '—' },
        { label: 'MMK', value: order.MMK || '—' },
        { label: 'Barwnik', value: order.Barwnik || '—' },
      ],
    },
  ];

  return (
    <aside className="orders-detail-panel" style={panelStyle}>
      <div className="callout info">
        <header
          className="orders-detail-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Zlecenie</h2>
            <p style={{ margin: '0.35rem 0 0' }}>Artykuł: {order.Artykul || '—'}</p>
            <p style={{ margin: '0.2rem 0 0' }}>Nr produkcyjny: {order.NrZp || '—'}</p>
            <p style={{ margin: '0.2rem 0 0' }}>Data zlecenia: {order.Data || '—'}</p>
          </div>
          <StatusBadge status={order.Status} label={order.status_label || '—'} />
        </header>
        {sections.map((section) => {
          const isDimensionsSection = section.title === 'Wymiary i parametry folii';
          const isPlanSection = section.title === 'Plan produkcji';
          const isBaseInfoSection = section.title === 'Podstawowe informacje';
          const dimensionItems = isDimensionsSection ? section.items.slice(0, 3) : [];
          const planRows = isPlanSection
            ? section.items.reduce((rows, item, index) => {
                if (index % 2 === 0) {
                  rows.push([item]);
                } else {
                  rows[rows.length - 1].push(item);
                }
                return rows;
              }, [])
            : [];
          const baseInfoPlanLabels = ['Priorytet', 'Rodzaj folii', 'Nr wytłaczarki', 'Taśma'];
          const baseInfoPlanItems = isBaseInfoSection
            ? section.items.filter((item) => baseInfoPlanLabels.includes(item.label))
            : [];
          const baseInfoPlanRows = isBaseInfoSection
            ? baseInfoPlanItems.reduce((rows, item, index) => {
                if (index % 2 === 0) {
                  rows.push([item]);
                } else {
                  rows[rows.length - 1].push(item);
                }
                return rows;
              }, [])
            : [];
          const detailItems = (() => {
            if (isDimensionsSection) {
              return section.items.slice(3);
            }
            if (isPlanSection) {
              return [];
            }
            if (isBaseInfoSection) {
              return section.items.filter((item) => !baseInfoPlanLabels.includes(item.label));
            }
            return section.items;
          })();

          return (
            <section key={section.title} style={{ marginTop: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>{section.title}</h3>
              {isDimensionsSection && dimensionItems.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${dimensionItems.length}, minmax(0, 1fr))`,
                    gap: '0.5rem 1rem',
                    margin: 0,
                  }}
                >
                  {dimensionItems.map((item) => (
                    <span
                      key={`${item.label}-label`}
                      style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        color: '#555',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </span>
                  ))}
                  {dimensionItems.map((item) => (
                    <span key={`${item.label}-value`} style={{ fontWeight: 600 }}>
                      {item.value}
                    </span>
                  ))}
                </div>
              )}
              {isPlanSection &&
                planRows.map((row, rowIndex) => (
                  <div
                    key={`plan-row-${rowIndex}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                      gap: '0.75rem 1rem',
                      textAlign: 'center',
                      marginTop: rowIndex === 0 ? 0 : '1rem',
                    }}
                  >
                    {row.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            color: '#555',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {item.label}
                        </span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              ))}
              {isBaseInfoSection &&
                baseInfoPlanRows.map((row, rowIndex) => (
                  <div
                    key={`base-info-plan-row-${rowIndex}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                      gap: '0.75rem 1rem',
                      textAlign: 'center',
                      marginTop: rowIndex === 0 ? 0 : '1rem',
                    }}
                  >
                    {row.map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            color: '#555',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {item.label}
                        </span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              {detailItems.length > 0 && (
                <dl
                  className="orders-detail-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    margin: 0,
                    marginTop: isDimensionsSection && dimensionItems.length ? '1rem' : 0,
                  }}
                >
                  {detailItems.map((item) => {
                    const shouldStackValue = [
                      'Kod',
                      'MMK',
                      'Barwnik',
                      'Dł. worka [mm]',
                      'Grubość [μm]',
                      'Dolne odchyłki [μm]',
                    ].includes(item.label);

                    return (
                      <div
                        key={item.label}
                        className="orders-detail-item"
                        style={{
                          display: 'flex',
                          gap: shouldStackValue ? '0.35rem' : '0.5rem',
                          flexWrap: 'wrap',
                          ...(shouldStackValue
                            ? { flexDirection: 'column', alignItems: 'flex-start' }
                            : { alignItems: 'baseline' }),
                        }}
                      >
                        <dt
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            margin: 0,
                            color: '#555',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                            ...(shouldStackValue ? { marginBottom: '0.1rem' } : {}),
                          }}
                        >
                          {item.label}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </section>
          );
        })}
        <section className="orders-detail-notes" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Uwagi</h3>
          <p style={{ margin: 0 }}>{order.Uwagi || 'Brak dodatkowych uwag.'}</p>
        </section>
        <footer
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Link className="btn btn-outline btn-small" to={`/orders/${order.id}`}>
            Otwórz szczegóły
          </Link>
        </footer>
      </div>
    </aside>
  );
}
