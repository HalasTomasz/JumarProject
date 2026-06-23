import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const getCompletionRowTone = (percent, isSelected) => {
  if (!Number.isFinite(percent) || percent < 60) {
    return isSelected
      ? {
          backgroundColor: '#e9f2ff',
          color: '#0f172a',
          boxShadow: 'inset 0 0 0 2px rgba(37, 99, 235, 0.22)',
        }
      : null;
  }

  const normalized = Math.min(1, Math.max(0, (percent - 60) / 35));
  const lightness = 92 - normalized * 58;
  const saturation = 52 + normalized * 18;
  const backgroundColor = `hsl(142 ${saturation}% ${lightness}%)`;
  const color = normalized >= 0.78 ? '#f8fffb' : '#0f2d1d';

  return {
    backgroundColor,
    color,
    boxShadow: isSelected ? 'inset 0 0 0 2px rgba(15, 118, 110, 0.42)' : 'none',
  };
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

const ORDER_STATUS_OPTIONS = [
  { value: 0, label: 'Planowane' },
  { value: 1, label: 'W realizacji' },
  { value: 2, label: 'Zrealizowane' },
  { value: 3, label: 'Anulowane' },
];

export default function OrdersDoingPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [completionOrders, setCompletionOrders] = useState([]);
  const [completionOrdersLoading, setCompletionOrdersLoading] = useState(false);
  const [, setCompletionPagination] = useState({ count: 0, next: null, previous: null });
  const [completionPercentById, setCompletionPercentById] = useState({});
  const [completionPage, setCompletionPage] = useState(1);
  const [pendingScrollOrderNumber, setPendingScrollOrderNumber] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingStatus, setEditingStatus] = useState(String(ORDER_STATUS_OPTIONS[0].value));
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const orderRowRefs = useRef(new Map());
  const statusFilter = '1';
  const title = 'Zlecenia w realizacji';
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
  const ordersPageSize = 10;
  const completionPageSize = 10;
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
  const selectedOrderNumber = selectedOrder?.NrZp || pendingScrollOrderNumber || null;
  const sortedCompletionOrders = useMemo(() => {
    const getSortablePercent = (entry) => {
      const rawPercent = completionPercentById[entry.id];
      if (rawPercent === undefined) {
        return Number.NEGATIVE_INFINITY;
      }
      if (rawPercent === null) {
        return -1;
      }
      return rawPercent;
    };

    return [...completionOrders].sort((left, right) => {
      const percentDiff = getSortablePercent(right) - getSortablePercent(left);
      if (percentDiff !== 0) {
        return percentDiff;
      }
      return String(left.NrZp || '').localeCompare(String(right.NrZp || ''), 'pl');
    });
  }, [completionOrders, completionPercentById]);
  const completionTotalPages = Math.max(1, Math.ceil(sortedCompletionOrders.length / completionPageSize));
  const normalizedCompletionPage = Math.min(completionPage, completionTotalPages);
  const completionPageOrders = useMemo(() => {
    const startIndex = (normalizedCompletionPage - 1) * completionPageSize;
    return sortedCompletionOrders.slice(startIndex, startIndex + completionPageSize);
  }, [completionPageSize, normalizedCompletionPage, sortedCompletionOrders]);

  const handleOrderSelect = useCallback((orderId) => {
    setSelectedOrderId(orderId);
  }, []);

  const openStatusModal = useCallback((order) => {
    setEditingOrder(order);
    setEditingStatus(String(order?.Status ?? ORDER_STATUS_OPTIONS[0].value));
    setStatusSaving(false);
    setStatusError('');
  }, []);

  const closeStatusModal = useCallback(() => {
    if (statusSaving) {
      return;
    }
    setEditingOrder(null);
    setStatusError('');
  }, [statusSaving]);

  const registerOrderRow = useCallback((orderNumber, node) => {
    if (!orderNumber) {
      return;
    }
    if (node) {
      orderRowRefs.current.set(orderNumber, node);
    } else {
      orderRowRefs.current.delete(orderNumber);
    }
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
          page_size: ordersPageSize,
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
  }, [statusFilter, searchTerm, effectiveDateFrom, effectiveDateTo, page, ordersPageSize]);

  const handleStatusChanged = useCallback(() => {
    loadOrders();
    setRefreshKey((prev) => prev + 1);
  }, [loadOrders]);

  const handleStatusSave = useCallback(
    async (event) => {
      event.preventDefault();
      if (!editingOrder?.id) {
        return;
      }

      setStatusSaving(true);
      setStatusError('');
      try {
        await apiClient.post(`orders/${editingOrder.id}/status/`, { status: Number(editingStatus) });
        setEditingOrder(null);
        handleStatusChanged();
      } catch (error) {
        const detail = error?.response?.data?.detail;
        const statusDetail = error?.response?.data?.Status;
        setStatusError(
          Array.isArray(statusDetail)
            ? statusDetail.join(' ')
            : Array.isArray(detail)
              ? detail.join(' ')
              : detail || 'Nie udało się zmienić statusu.',
        );
      } finally {
        setStatusSaving(false);
      }
    },
    [editingOrder?.id, editingStatus, handleStatusChanged],
  );

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

    const loadCompletionOrders = async () => {
      try {
        const lookupPageSize = 200;
        let nextPage = 1;
        let hasNextPage = true;
        let fetchedOrders = [];

        while (hasNextPage) {
          const { data } = await apiClient.get('orders/legacy/', {
            params: {
              status: statusFilter || undefined,
              q: searchTerm || undefined,
              date_from: effectiveDateFrom || undefined,
              date_to: effectiveDateTo || undefined,
              page: nextPage,
              page_size: lookupPageSize,
            },
          });

          const pageOrders = Array.isArray(data) ? data : data?.results || [];
          fetchedOrders = [...fetchedOrders, ...pageOrders];
          hasNextPage = !Array.isArray(data) && Boolean(data?.next) && pageOrders.length > 0;
          nextPage += 1;
        }

        if (!active) {
          return;
        }

        let nextPercentById = {};
        if (fetchedOrders.length) {
          const { data: progressData } = await apiClient.post('orders/progress/', {
            order_numbers: fetchedOrders.map((entry) => entry.NrZp),
          });

          if (!active) {
            return;
          }

          nextPercentById = fetchedOrders.reduce((acc, entry) => {
            const percent = Number(progressData?.items?.[entry.NrZp]?.progress_percent);
            acc[entry.id] = Number.isFinite(percent)
              ? Math.min(100, Math.max(0, percent))
              : Number(entry.Status) === 2
                ? 100
                : null;
            return acc;
          }, {});
        }

        setCompletionOrders(fetchedOrders);
        setCompletionPercentById(nextPercentById);
        setCompletionPagination({
          count: fetchedOrders.length,
          next: null,
          previous: null,
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setCompletionOrders([]);
        setCompletionPagination({ count: 0, next: null, previous: null });
        setCompletionPercentById({});
      } finally {
        if (active) {
          setCompletionOrdersLoading(false);
        }
      }
    };

    loadCompletionOrders();

    return () => {
      active = false;
    };
  }, [
    showCompletionTableFeature,
    statusFilter,
    searchTerm,
    effectiveDateFrom,
    effectiveDateTo,
    refreshKey,
  ]);

  const setOrderPage = useCallback((nextPage) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextPage <= 0) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      return params;
    });
  }, [setSearchParams]);

  const handlePageChange = (direction) => {
    const nextPage = direction === 'next' ? page + 1 : page - 1;
    setOrderPage(nextPage);
  };

  useEffect(() => {
    if (!pendingScrollOrderNumber) {
      return;
    }

    const matchingOrder = orders.find((order) => order.NrZp === pendingScrollOrderNumber);
    if (!matchingOrder) {
      return;
    }

    setSelectedOrderId(matchingOrder.id);
    const rowNode = orderRowRefs.current.get(pendingScrollOrderNumber);
    if (rowNode) {
      window.requestAnimationFrame(() => {
        rowNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rowNode.focus();
      });
    }
    setPendingScrollOrderNumber(null);
  }, [orders, pendingScrollOrderNumber]);

  const handleCompletionOrderSelect = useCallback(
    async (completionOrder) => {
      const orderNumber = completionOrder?.NrZp;
      if (!orderNumber) {
        return;
      }

      const orderOnCurrentPage = orders.find((order) => order.NrZp === orderNumber);
      setPendingScrollOrderNumber(orderNumber);
      if (orderOnCurrentPage) {
        setSelectedOrderId(orderOnCurrentPage.id);
        return;
      }

      try {
        const lookupPageSize = 200;
        let lookupPage = 1;
        let scannedCount = 0;
        let targetPage = null;

        while (targetPage === null) {
          const { data } = await apiClient.get('orders/', {
            params: {
              status: statusFilter || undefined,
              q: searchTerm || undefined,
              date_from: effectiveDateFrom || undefined,
              date_to: effectiveDateTo || undefined,
              page: lookupPage,
              page_size: lookupPageSize,
            },
          });

          const lookupOrders = Array.isArray(data) ? data : data?.results || [];
          const matchIndex = lookupOrders.findIndex((order) => order.NrZp === orderNumber);
          if (matchIndex !== -1) {
            targetPage = Math.floor((scannedCount + matchIndex) / ordersPageSize) + 1;
            break;
          }

          if (Array.isArray(data) || !data?.next || !lookupOrders.length) {
            break;
          }

          scannedCount += lookupOrders.length;
          lookupPage += 1;
        }

        if (targetPage !== null) {
          setOrderPage(targetPage);
        } else {
          setPendingScrollOrderNumber(null);
        }
      } catch (error) {
        setPendingScrollOrderNumber(null);
      }
    },
    [orders, statusFilter, searchTerm, effectiveDateFrom, effectiveDateTo, ordersPageSize, setOrderPage],
  );

  return (
    <section className="orders-page">
      <div className="orders-layout-top">
        <div className="orders-top-main-column">
          <header className="orders-intro-card">
            <div className="orders-intro-heading">
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <div className="filters orders-filters orders-intro-filters">
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
                      onEditStatus={openStatusModal}
                      registerRow={registerOrderRow}
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
              totalCount={sortedCompletionOrders.length}
              page={normalizedCompletionPage}
              totalPages={completionTotalPages}
              onPageChange={setCompletionPage}
              selectedOrderNumber={selectedOrderNumber}
              onSelectOrder={handleCompletionOrderSelect}
            />
          )}
        </aside>
      </div>

      {!loading && (
        <div className="orders-doing-detail-section">
          <div className="orders-doing-detail-shell">
            <OrdersDetailPanel
              order={selectedOrder}
              showCompletionFeature={showCompletionFeature}
            />
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edytuj status zlecenia</h3>
              <button type="button" className="modal-close" onClick={closeStatusModal} disabled={statusSaving}>
                {'\u00d7'}
              </button>
            </div>
            <p className="orders-status-modal-caption">
              Nr ZP: <strong>{editingOrder.NrZp || '—'}</strong>
            </p>
            {statusError && <div className="callout error">{statusError}</div>}
            <form className="modal-form" onSubmit={handleStatusSave}>
              <label>
                Status
                <select
                  value={editingStatus}
                  onChange={(event) => setEditingStatus(event.target.value)}
                  disabled={statusSaving}
                >
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeStatusModal} disabled={statusSaving}>
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={statusSaving || editingStatus === String(editingOrder.Status)}
                >
                  {statusSaving ? 'Zapisywanie…' : 'Zapisz status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  selectedOrderNumber,
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
                  const isSelected = selectedOrderNumber === entry.NrZp;
                  const percentDisplay =
                    rawPercent === undefined
                      ? '…'
                      : rawPercent === null
                        ? '—'
                        : `${formatNumber(rawPercent)}%`;
                  const rowTone = getCompletionRowTone(rawPercent, isSelected);
                  return (
                    <tr
                      key={entry.id}
                      className={isSelected ? 'is-selected' : ''}
                      onClick={() => onSelectOrder(entry)}
                    >
                      <td style={rowTone || undefined}>{entry.NrZp || '—'}</td>
                      <td style={rowTone || undefined}>{entry.Artykul || '—'}</td>
                      <td style={rowTone ? { ...rowTone, fontWeight: 700 } : undefined}>{percentDisplay}</td>
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

const OrderRow = memo(function OrderRow({ order, isSelected, onSelect, onEditStatus, registerRow }) {
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
      ref={(node) => registerRow(order.NrZp, node)}
      className={`orders-row${isSelected ? ' is-selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-selected={isSelected}
      data-order-number={order.NrZp || ''}
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
        <button type="button" className="btn btn-link" onClick={() => onEditStatus(order)}>
          Edytuj
        </button>
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
        <div className="orders-detail-empty-state callout info">
          <strong>Wybierz zlecenie z tabeli</strong>
          <span>Informacje pojawią się tutaj po zaznaczeniu wiersza.</span>
        </div>
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

  const dimensionsItems = sections.find((section) => section.title === 'Wymiary i parametry folii')?.items || [];
  const planItems = sections.find((section) => section.title === 'Plan produkcji')?.items || [];
  const roleItems = sections.find((section) => section.title === 'Role')?.items || [];
  const additionalInfoItems = sections.find((section) => section.title === 'Dodatkowe informacje')?.items || [];

  const completionValue = completionLoading
    ? 'Ladowanie...'
    : completionPercent === null
      ? '—'
      : `${formatNumber(completionPercent)}%`;

  const topSummaryItems = [
    { label: 'Status', value: <StatusBadge status={order.Status} label={order.status_label} /> },
    { label: 'Priorytet', value: order.priority_label || '—' },
    { label: 'Nr wytlaczarki', value: order.nrwyt_label || order.nrwyt || '—' },
    { label: 'Rodzaj folii', value: order.foil_type_label || '—' },
    { label: 'Tasma', value: order.tasma_label || order.Tasma || '—' },
    ...(showCompletionFeature ? [{ label: 'Realizacja', value: completionValue, highlight: true }] : []),
  ];

  const productionMetrics = [...planItems, ...roleItems];
  const footerMetaItems = additionalInfoItems;
  const orderNotes = order.Uwagi || 'Brak dodatkowych uwag.';

  return (
    <aside className="orders-detail-panel">
      <div className="callout info orders-doing-detail-card">
        <header className="orders-doing-detail-header">
          <div className="orders-doing-detail-heading">
            <span className="orders-doing-detail-kicker">Informacje o zleceniu</span>
            <div className="orders-doing-detail-title-row">
              <h2>{order.Artykul || '—'}</h2>
              <span className="orders-doing-detail-zp">Nr ZP: {order.NrZp || '—'}</span>
              <div className="orders-doing-detail-note">
                <span>Uwagi:</span>
                <p>{orderNotes}</p>
              </div>
            </div>
          </div>
          <div className="orders-doing-detail-summary-strip">
            {topSummaryItems.map((item) => (
              <div
                key={item.label}
                className={`orders-doing-summary-chip${item.highlight ? ' is-highlight' : ''}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </header>

        {showCompletionFeature && (
          <section className="orders-completion-card orders-doing-completion-card">
            <div className="orders-completion-header">
              <span>Procent realizacji</span>
              <strong>{completionValue}</strong>
            </div>
            <div className="orders-completion-bar" aria-label="Procent realizacji">
              <span
                className="orders-completion-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, Number(completionPercent) || 0))}%` }}
              />
            </div>
          </section>
        )}

        <section className="orders-doing-detail-block">
          <div className="orders-doing-detail-block-header">
            <h3 className="orders-detail-section-title">Plan i rolki</h3>
          </div>
          <div className="orders-doing-metrics-grid">
            {productionMetrics.map((item) => (
              <div key={item.label} className="orders-doing-metric-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="orders-doing-detail-row">
          <div className="orders-doing-detail-block">
            <div className="orders-doing-detail-block-header">
              <h3 className="orders-detail-section-title">Wymiary i parametry</h3>
            </div>
            <div className="orders-doing-dimensions-grid">
              {dimensionsItems.map((item) => (
                <div key={item.label} className="orders-doing-dimension-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="orders-doing-detail-block">
            <div className="orders-doing-detail-block-header">
              <h3 className="orders-detail-section-title">Dodatkowe informacje</h3>
            </div>
            <div className="orders-doing-footer-grid">
              {footerMetaItems.map((item) => (
                <div
                  key={item.label}
                  className={`orders-doing-footer-card${item.wide ? ' is-wide' : ''}`}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
