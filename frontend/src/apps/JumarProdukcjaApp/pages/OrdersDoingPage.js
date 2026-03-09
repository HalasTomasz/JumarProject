import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../../api/client';
import { getFoilCorrectionLength } from '../../../utils/orderMetrics';

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

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: 'page',
      value: index + 1,
    }));
  }

  const items = [{ type: 'page', value: 1 }];
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  if (rangeStart > 2) {
    items.push({ type: 'ellipsis', key: 'left' });
  }
  for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber += 1) {
    items.push({ type: 'page', value: pageNumber });
  }
  if (rangeEnd < totalPages - 1) {
    items.push({ type: 'ellipsis', key: 'right' });
  }
  items.push({ type: 'page', value: totalPages });

  return items;
};

export default function OrdersDoingPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [completionOrders, setCompletionOrders] = useState([]);
  const [completionOrdersLoading, setCompletionOrdersLoading] = useState(false);
  const [completionPagination, setCompletionPagination] = useState({ count: 0, next: null, previous: null });
  const [completionPercentById, setCompletionPercentById] = useState({});
  const [completionPage, setCompletionPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = '1';
  const title = 'OrdersDoing';
  const description = 'Zlecenia w realizacji.';
  const searchTerm = searchParams.get('q') || '';
  const yearFilter = searchParams.get('year') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = Number(searchParams.get('page') || 1);
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 15 }, (_, index) => String(currentYear - index)),
    [currentYear],
  );
  const allowYearFilter = statusFilter === '3';
  const activeYearFilter = allowYearFilter ? yearFilter : '';
  const effectiveDateFrom = activeYearFilter ? `${activeYearFilter}-01-01` : dateFrom;
  const effectiveDateTo = activeYearFilter ? `${activeYearFilter}-12-31` : dateTo;
  const showCompletionFeature = statusFilter === '1' || statusFilter === '3';
  const showCompletionTableFeature = showCompletionFeature;
  const completionPageSize = 15;
  const perPage = Math.max(orders.length, 1);
  const calculatedTotalPages = pagination.next ? Math.ceil(pagination.count / perPage) : page;
  const totalPages = Math.max(calculatedTotalPages, page);
  const pagesLeft = Math.max(totalPages - page, 0);
  const pagesLeftLabel =
    pagesLeft === 0 ? 'Ostatnia strona' : `Pozostało ${pagesLeft} ${getPageWord(pagesLeft)}`;
  const useWytOrderedPager = statusFilter === '3';
  const mainPageItems = useMemo(() => getPaginationItems(page, totalPages), [page, totalPages]);
  const currentPageCount = orders.length;
  const currentPageStartIndex =
    pagination.count && currentPageCount
      ? page === totalPages
        ? Math.max(1, pagination.count - currentPageCount + 1)
        : (page - 1) * currentPageCount + 1
      : 0;
  const currentPageEndIndex =
    currentPageStartIndex > 0
      ? Math.min(pagination.count, currentPageStartIndex + currentPageCount - 1)
      : 0;
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );
  const completionTotalPages = Math.max(1, Math.ceil((completionPagination.count || 0) / completionPageSize));
  const normalizedCompletionPage = Math.min(completionPage, completionTotalPages);
  const completionPageOrders = completionOrders;

  const handleOrderSelect = useCallback((orderId) => {
    setSelectedOrderId(orderId);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('orders/', {
        params: {
          status: statusFilter || undefined,
          q: searchTerm || undefined,
          date_from: effectiveDateFrom || undefined,
          date_to: effectiveDateTo || undefined,
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
  }, [statusFilter, searchTerm, effectiveDateFrom, effectiveDateTo, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (allowYearFilter || !yearFilter) {
      return;
    }
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('year');
      params.set('page', '1');
      return params;
    });
  }, [allowYearFilter, yearFilter, setSearchParams]);

  const handleYearChange = (event) => {
    const value = event.target.value;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set('year', value);
        params.delete('date_from');
        params.delete('date_to');
      } else {
        params.delete('year');
      }
      params.set('page', '1');
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
      params.delete('year');
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set('page', '1');
      return params;
    });
  };

  useEffect(() => {
    if (completionPage !== normalizedCompletionPage) {
      setCompletionPage(normalizedCompletionPage);
    }
  }, [completionPage, normalizedCompletionPage]);

  useEffect(() => {
    if (!showCompletionTableFeature) {
      return;
    }
    setCompletionPage(1);
  }, [showCompletionTableFeature, statusFilter, searchTerm, effectiveDateFrom, effectiveDateTo]);

  useEffect(() => {
    if (!showCompletionTableFeature) {
      setCompletionOrders([]);
      setCompletionPagination({ count: 0, next: null, previous: null });
      setCompletionPercentById({});
      setCompletionPage(1);
      setCompletionOrdersLoading(false);
      return;
    }

    let active = true;
    setCompletionOrdersLoading(true);
    setCompletionPercentById({});

    apiClient
      .get('orders/legacy/', {
        params: {
          status: statusFilter || undefined,
          q: searchTerm || undefined,
          date_from: effectiveDateFrom || undefined,
          date_to: effectiveDateTo || undefined,
          page: normalizedCompletionPage,
          page_size: completionPageSize,
        },
      })
      .then(({ data }) => {
        if (!active) {
          return;
        }
        const nextOrders = Array.isArray(data) ? data : data?.results || [];
        setCompletionOrders(nextOrders);
        setCompletionPagination({
          count: Number(data?.count) || nextOrders.length,
          next: data?.next || null,
          previous: data?.previous || null,
        });
      })
      .catch(() => {
        if (active) {
          setCompletionOrders([]);
          setCompletionPagination({ count: 0, next: null, previous: null });
        }
      })
      .finally(() => {
        if (active) {
          setCompletionOrdersLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [showCompletionTableFeature, statusFilter, searchTerm, effectiveDateFrom, effectiveDateTo, normalizedCompletionPage]);

  useEffect(() => {
    if (!showCompletionTableFeature || !completionPageOrders.length) {
      return;
    }

    const ordersToLoad = completionPageOrders.filter((entry) => completionPercentById[entry.id] === undefined);
    if (!ordersToLoad.length) {
      return;
    }

    let active = true;

    apiClient
      .post('orders/progress/', {
        order_numbers: ordersToLoad.map((entry) => entry.NrZp),
      })
      .then(({ data }) => {
        if (!active) {
          return;
        }
        setCompletionPercentById((prev) => {
          const next = { ...prev };
          ordersToLoad.forEach((entry) => {
            const percent = Number(data?.items?.[entry.NrZp]?.progress_percent);
            next[entry.id] = Number.isFinite(percent)
              ? Math.min(100, Math.max(0, percent))
              : Number(entry.Status) === 2
                ? 100
                : null;
          });
          return next;
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setCompletionPercentById((prev) => {
          const next = { ...prev };
          ordersToLoad.forEach((entry) => {
            next[entry.id] = Number(entry.Status) === 2 ? 100 : null;
          });
          return next;
        });
      });

    return () => {
      active = false;
    };
  }, [showCompletionTableFeature, completionPageOrders, completionPercentById]);

  const setOrderPage = (nextPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextPage <= 0) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      return params;
    });
  };

  const handlePageChange = (direction) => {
    const nextPage = direction === 'next' ? page + 1 : page - 1;
    setOrderPage(nextPage);
  };

  return (
    <section className="orders-page">
      <div className="orders-layout-top">
        <div className="orders-top-main-column">
          <header className="orders-intro-card">
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {allowYearFilter && (
            <div className="orders-year-spotlight">
              <label>
                Wybierz rok
                <select value={yearFilter} onChange={handleYearChange}>
                  <option value="">Wszystkie lata</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="filters orders-filters">
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
      </div>

      <div className="orders-layout-main">
        <div className="orders-table-column">
          {loading ? (
            <div className="page-loading">Ładowanie…</div>
          ) : (
            <div className="table-wrapper orders-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nr ZP</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Artykuł</th>
                    <th>Folia</th>
                    <th>Nr wytłaczarki</th>
                    <th>Ilość</th>
                    <th>Uwagi</th>
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
                    {useWytOrderedPager ? (
                      <>
                        <strong>
                          Pozycje {currentPageStartIndex}-{currentPageEndIndex} z {pagination.count}
                        </strong>
                        <span>
                          Strona {page} z {totalPages}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>{`Strona ${page} z ${totalPages}`}</strong>
                        <span>{pagesLeftLabel}</span>
                      </>
                    )}
                  </div>
                  <div className="table-pagination-controls">
                    <button
                      className={useWytOrderedPager ? 'btn btn-outline btn-small' : 'btn btn-outline'}
                      onClick={() => handlePageChange('prev')}
                      disabled={!pagination.previous && page <= 1}
                    >
                      Poprzednia
                    </button>
                    {useWytOrderedPager ? (
                      mainPageItems.map((item) => {
                        if (item.type === 'ellipsis') {
                          return (
                            <span key={item.key} style={{ padding: '0 4px' }}>
                              ...
                            </span>
                          );
                        }

                        const isActive = item.value === page;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            className="btn btn-outline btn-small"
                            onClick={() => setOrderPage(item.value)}
                            disabled={isActive}
                            style={isActive ? { background: '#2f6fed', color: '#ffffff' } : undefined}
                          >
                            {item.value}
                          </button>
                        );
                      })
                    ) : (
                      <span>Strona {page}</span>
                    )}
                    <button
                      className={useWytOrderedPager ? 'btn btn-outline btn-small' : 'btn'}
                      onClick={() => handlePageChange('next')}
                      disabled={!pagination.next}
                    >
                      Następna
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="orders-side-column">
          {showCompletionTableFeature && (
            <OrdersCompletionTable
              orders={completionPageOrders}
              loading={completionOrdersLoading}
              completionPercentById={completionPercentById}
              totalCount={completionPagination.count}
              page={normalizedCompletionPage}
              totalPages={completionTotalPages}
              onPageChange={setCompletionPage}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleOrderSelect}
            />
          )}
          <OrdersDetailPanel order={selectedOrder} showCompletionFeature={showCompletionFeature} />
        </aside>
      </div>
    </section>
  );
}

function OrdersCompletionTable({
  orders,
  loading,
  completionPercentById,
  totalCount,
  page,
  totalPages,
  onPageChange,
  selectedOrderId,
  onSelectOrder,
}) {
  const pageItems = getPaginationItems(page, totalPages);

  return (
    <section className="orders-completion-table-card">
      <header className="orders-completion-table-header">
        <h3>Procent realizacji</h3>
        <small>{`Rekordy: ${formatNumber(totalCount)}`}</small>
      </header>

      {loading ? (
        <div className="callout info">Ładowanie danych realizacji…</div>
      ) : !totalCount ? (
        <div className="callout info">Brak danych realizacji dla wybranego filtra.</div>
      ) : (
        <>
          <div className="orders-completion-table-wrap">
            <table className="orders-completion-table">
              <thead>
                <tr>
                  <th>Nr ZP</th>
                  <th>Artykuł</th>
                  <th>Procent</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((entry) => {
                  const rawPercent = completionPercentById[entry.id];
                  const percentDisplay =
                    rawPercent === undefined
                      ? '…'
                      : rawPercent === null
                        ? '—'
                        : `${formatNumber(rawPercent)}%`;
                  return (
                    <tr
                      key={entry.id}
                      className={selectedOrderId === entry.id ? 'is-selected' : ''}
                      onClick={() => onSelectOrder(entry.id)}
                    >
                      <td>{entry.NrZp || '—'}</td>
                      <td>{entry.Artykul || '—'}</td>
                      <td>{percentDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="table-pagination" style={{ marginTop: '10px' }}>
              <div className="table-pagination-info">
                <strong>
                  Strona {page} z {totalPages}
                </strong>
              </div>
              <div className="table-pagination-controls">
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Poprzednia
                </button>
                {pageItems.map((item) => {
                  if (item.type === 'ellipsis') {
                    return (
                      <span key={item.key} style={{ padding: '0 4px' }}>
                        ...
                      </span>
                    );
                  }

                  const isActive = item.value === page;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() => onPageChange(item.value)}
                      style={isActive ? { background: '#2f6fed', color: '#ffffff' } : undefined}
                    >
                      {item.value}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                >
                  Następna
                </button>
              </div>
            </div>
          )}
        </>
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
      <td>{order.Artykul || '—'}</td>
      <td>{order.foil_type_label || '—'}</td>
      <td>{order.nrwyt_label || order.nrwyt || order.NrWytl || '—'}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{formatNumber(order.IloscZlec)}</td>
      <td
        title={order.Uwagi || ''}
        style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {order.Uwagi || '—'}
      </td>
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

function OrdersDetailPanel({ order, showCompletionFeature }) {
  const [completionPercent, setCompletionPercent] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCompletion = async () => {
      if (!showCompletionFeature || !order?.NrZp) {
        setCompletionPercent(null);
        setCompletionLoading(false);
        return;
      }

      setCompletionLoading(true);
      try {
        const encodedOrderCode = encodeURIComponent(order.NrZp);
        const { data } = await apiClient.get(`production/orders/${encodedOrderCode}/summary/`);
        const apiPercent = Number(data?.progress_percent);
        if (!active) {
          return;
        }
        if (Number.isFinite(apiPercent)) {
          setCompletionPercent(Math.min(100, Math.max(0, apiPercent)));
        } else if (Number(order.Status) === 2) {
          setCompletionPercent(100);
        } else {
          setCompletionPercent(null);
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setCompletionPercent(Number(order.Status) === 2 ? 100 : null);
      } finally {
        if (active) {
          setCompletionLoading(false);
        }
      }
    };

    loadCompletion();
    return () => {
      active = false;
    };
  }, [order?.NrZp, order?.Status, showCompletionFeature]);

  if (!order) {
    return (
      <aside className="orders-detail-panel">
        <div className="callout info">Wybierz zlecenie z tabeli, aby zobaczyć szczegóły.</div>
      </aside>
    );
  }

  const foilCorrection = getFoilCorrectionLength(order);

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
    <aside className="orders-detail-panel">
      <div className="callout info">
        <header
          className="orders-detail-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ margin: 0 }}>Zlecenie</h2>
          <div className="orders-detail-header-meta">
            <p className="orders-detail-header-article">{order.Artykul || '—'}</p>
            <p className="orders-detail-header-zp">Nr ZP: {order.NrZp || '—'}</p>
          </div>
        </header>
        {showCompletionFeature && (
          <section className="orders-completion-card">
            <div className="orders-completion-header">
              <span>Procent realizacji</span>
              <strong>
                {completionLoading
                  ? 'Ładowanie…'
                  : completionPercent === null
                    ? '—'
                    : `${formatNumber(completionPercent)}%`}
              </strong>
            </div>
            <div className="orders-completion-bar" aria-label="Procent realizacji">
              <span
                className="orders-completion-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, Number(completionPercent) || 0))}%` }}
              />
            </div>
          </section>
        )}
        {sections.map((section) => {
          const isDimensionsSection = section.title === 'Wymiary i parametry folii';
          const isPlanSection = section.title === 'Plan produkcji';
          const isRolesSection = section.title === 'Role';
          const isBaseInfoSection = section.title === 'Podstawowe informacje';
          const isAdditionalInfoSection = section.title === 'Dodatkowe informacje';
          const dimensionsItems = isDimensionsSection ? section.items : [];
          const additionalInfoItems = isAdditionalInfoSection ? section.items : [];
          const baseInfoPlanLabels = ['Priorytet', 'Rodzaj folii', 'Nr wytłaczarki', 'Taśma'];
          const baseInfoPlanItems = isBaseInfoSection
            ? section.items.filter((item) => baseInfoPlanLabels.includes(item.label))
            : [];
          const rolesSectionItems = isPlanSection
            ? sections.find((candidate) => candidate.title === 'Role')?.items || []
            : [];
          const detailItems = (() => {
            if (isDimensionsSection) {
              return [];
            }
            if (isPlanSection) {
              return [];
            }
            if (isRolesSection) {
              return [];
            }
            if (isBaseInfoSection) {
              return section.items.filter((item) => !baseInfoPlanLabels.includes(item.label));
            }
            if (isAdditionalInfoSection) {
              return [];
            }
            return section.items;
          })();

          if (isRolesSection) {
            return null;
          }

          if (isPlanSection) {
            return (
              <section key="plan-role-row" style={{ marginTop: '1.75rem' }}>
                <div className="orders-detail-duo-row">
                  <div className="orders-detail-duo-card">
                    <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>Plan produkcji</h3>
                    <div className="orders-detail-duo-grid">
                      {section.items.map((item) => (
                        <div key={`plan-${item.label}`} className="orders-detail-duo-item">
                          <span className="orders-detail-duo-label">{item.label}</span>
                          <span className="orders-detail-duo-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="orders-detail-duo-card">
                    <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>Role</h3>
                    <div className="orders-detail-duo-grid">
                      {rolesSectionItems.map((item) => (
                        <div key={`roles-${item.label}`} className="orders-detail-duo-item">
                          <span className="orders-detail-duo-label">{item.label}</span>
                          <span className="orders-detail-duo-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          return (
            <section key={section.title} style={{ marginTop: '1.75rem' }}>
              <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>{section.title}</h3>
              {isDimensionsSection && dimensionsItems.length > 0 && (
                <div className="orders-dimensions-grid">
                  {dimensionsItems.map((item) => (
                    <div key={item.label} className="orders-dimensions-item">
                      <span className="orders-dimensions-label">{item.label}</span>
                      <span className="orders-dimensions-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {isAdditionalInfoSection && additionalInfoItems.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1rem',
                    marginTop: '1.25rem',
                  }}
                >
                  {additionalInfoItems.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        textAlign: 'center',
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
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '1.1rem',
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {isBaseInfoSection && baseInfoPlanItems.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${baseInfoPlanItems.length}, minmax(0, 1fr))`,
                    gap: '1rem 1.25rem',
                    textAlign: 'center',
                  }}
                >
                  {baseInfoPlanItems.map((item) => (
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
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '1.1rem',
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {detailItems.length > 0 && (
                <dl
                  className="orders-detail-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '1rem',
                    margin: 0,
                    marginTop: isDimensionsSection && dimensionsItems.length ? '1rem' : 0,
                  }}
                >
                  {detailItems.map((item) => {
                    const shouldStackValue = [
                      'Kod',
                      'MMK',
                      'Barwnik',
                      'Dł. worka [mm]',
                      'Grubość [μm]',
                    ].includes(item.label);

                    return (
                      <div
                        key={item.label}
                        className="orders-detail-item"
                        style={{
                          display: 'flex',
                          gap: shouldStackValue ? '0.35rem' : '0.5rem',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          ...(shouldStackValue
                            ? { flexDirection: 'column', alignItems: 'center', textAlign: 'center' }
                            : { alignItems: 'center', textAlign: 'center' }),
                        }}
                      >
                        <dt
                          style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            margin: 0,
                            color: '#555',
                            letterSpacing: '0.02em',
                            whiteSpace: shouldStackValue ? 'normal' : 'nowrap',
                            ...(shouldStackValue
                              ? { marginBottom: '0.15rem', width: '100%', textAlign: 'center' }
                              : {}),
                          }}
                        >
                          {item.label}
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            fontSize: '1.05rem',
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            textAlign: 'center',
                            flexBasis: '100%',
                          }}
                        >
                          {item.value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {isBaseInfoSection && (
                <section className="orders-detail-notes" style={{ marginTop: '1.5rem' }}>
                  <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>Uwagi</h3>
                  <p style={{ margin: 0 }}>{order.Uwagi || 'Brak dodatkowych uwag.'}</p>
                </section>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
