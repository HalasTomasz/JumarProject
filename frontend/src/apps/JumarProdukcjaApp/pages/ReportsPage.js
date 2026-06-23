import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';

const numberFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pageSizeOptions = [10, 20, 40];
const shiftOptions = ['', 'I', 'II', 'III'];

const formatMetric = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numberFormatter.format(numeric) : '—';
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
    items.push({ type: 'ellipsis', key: 'start' });
  }
  for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber += 1) {
    items.push({ type: 'page', value: pageNumber });
  }
  if (rangeEnd < totalPages - 1) {
    items.push({ type: 'ellipsis', key: 'end' });
  }

  items.push({ type: 'page', value: totalPages });
  return items;
};

export default function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workersDateFrom, setWorkersDateFrom] = useState('');
  const [workersDateTo, setWorkersDateTo] = useState('');
  const [workersShiftFilter, setWorkersShiftFilter] = useState('');
  const [workersOperatorFilter, setWorkersOperatorFilter] = useState('');
  const [debouncedOperatorFilter, setDebouncedOperatorFilter] = useState('');
  const [workersSearch, setWorkersSearch] = useState('');
  const [debouncedWorkersSearch, setDebouncedWorkersSearch] = useState('');
  const [workersPageSize, setWorkersPageSize] = useState(20);
  const [workersPage, setWorkersPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedOperatorFilter(workersOperatorFilter.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [workersOperatorFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedWorkersSearch(workersSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [workersSearch]);

  useEffect(() => {
    setWorkersPage(1);
  }, [
    workersDateFrom,
    workersDateTo,
    workersShiftFilter,
    debouncedOperatorFilter,
    debouncedWorkersSearch,
    workersPageSize,
  ]);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('reports/workers/', {
          params: {
            date_from: workersDateFrom || undefined,
            date_to: workersDateTo || undefined,
            shift: workersShiftFilter || undefined,
            operator: debouncedOperatorFilter || undefined,
            q: debouncedWorkersSearch || undefined,
            page: workersPage,
            page_size: workersPageSize,
          },
        });

        if (!active) {
          return;
        }

        setRows(Array.isArray(data?.results) ? data.results : []);
        setPagination({
          count: Number(data?.count) || 0,
          next: data?.next || null,
          previous: data?.previous || null,
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReports();
    return () => {
      active = false;
    };
  }, [
    workersDateFrom,
    workersDateTo,
    workersShiftFilter,
    debouncedOperatorFilter,
    debouncedWorkersSearch,
    workersPage,
    workersPageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil((pagination.count || 0) / workersPageSize));
  const currentPage = Math.min(workersPage, totalPages);
  const startIndex = rows.length ? (currentPage - 1) * workersPageSize : 0;
  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (workersPage > totalPages) {
      setWorkersPage(totalPages);
    }
  }, [workersPage, totalPages]);

  if (loading) {
    return <div className="page-loading">Generowanie raportu...</div>;
  }

  return (
    <section className="orders-page">
      <div className="orders-layout-top">
        <div className="orders-top-main-column">
          <header className="orders-intro-card">
            <div className="orders-intro-heading">
              <h1>Raport 3 - wydajnosc pracownikow</h1>
              <p>Grupowanie: data, zmiana, wytlaczarka i rodzaj folii.</p>
            </div>
            <div className="filters orders-filters orders-intro-filters orders-intro-filters-workers">
              <label>
                Szukaj
                <input
                  type="text"
                  value={workersSearch}
                  onChange={(event) => setWorkersSearch(event.target.value)}
                  placeholder="Data, zmiana, wytlaczarka, operator..."
                />
              </label>
              <label>
                Operator
                <input
                  type="text"
                  value={workersOperatorFilter}
                  onChange={(event) => setWorkersOperatorFilter(event.target.value)}
                  placeholder="Filtruj po operatorze"
                />
              </label>
              <label>
                Data od
                <input
                  type="date"
                  value={workersDateFrom}
                  max={workersDateTo || undefined}
                  onChange={(event) => setWorkersDateFrom(event.target.value)}
                />
              </label>
              <label>
                Data do
                <input
                  type="date"
                  value={workersDateTo}
                  min={workersDateFrom || undefined}
                  onChange={(event) => setWorkersDateTo(event.target.value)}
                />
              </label>
              <label>
                Zmiana
                <select
                  value={workersShiftFilter}
                  onChange={(event) => setWorkersShiftFilter(event.target.value)}
                >
                  {shiftOptions.map((shift) => (
                    <option key={shift || 'all'} value={shift}>
                      {shift || 'Wszystkie'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Wierszy
                <select
                  value={workersPageSize}
                  onChange={(event) => setWorkersPageSize(Number(event.target.value))}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="orders-intro-filter-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setWorkersDateFrom('');
                    setWorkersDateTo('');
                    setWorkersShiftFilter('');
                    setWorkersOperatorFilter('');
                    setWorkersSearch('');
                  }}
                  disabled={
                    !workersDateFrom &&
                    !workersDateTo &&
                    !workersShiftFilter &&
                    !workersOperatorFilter.trim() &&
                    !workersSearch.trim()
                  }
                >
                  Wyczysc filtry
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="report-block report-block-workers">
        <h2>Pracownicy</h2>
        <div className="table-wrapper orders-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nr</th>
                <th>Data</th>
                <th>Zmiana</th>
                <th>Nr Wytl.</th>
                <th>Rodzaj folii</th>
                <th>Dlugosc Produkcja [mb]</th>
                <th>Waga Produkcja [kg]</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.Data}-${row.Zmiana}-${row.NrWytl}-${row.Rodzaj}`}>
                  <td>{startIndex + index + 1}</td>
                  <td>{row.Data}</td>
                  <td>{row.Zmiana}</td>
                  <td>{row.nrwyt_label || row.NrWytl}</td>
                  <td>{row.foil_type_label || row.Rodzaj}</td>
                  <td>{formatMetric(row.total_dlugosc)}</td>
                  <td>{formatMetric(row.total_waga)}</td>
                  <td>{row.operators || '—'}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8}>Brak danych.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!!pagination.count && (
          <div className="table-pagination">
            <div className="table-pagination-info">
              <strong>
                Pozycje {startIndex + 1}-{Math.min(startIndex + rows.length, pagination.count)} z{' '}
                {pagination.count}
              </strong>
              Strona {currentPage} z {totalPages}
            </div>
            <div className="table-pagination-controls">
              <button
                type="button"
                className="btn btn-outline btn-small"
                disabled={!pagination.previous}
                onClick={() => setWorkersPage((previousPage) => Math.max(1, previousPage - 1))}
              >
                Poprzednia
              </button>
              {paginationItems.map((item) => {
                if (item.type === 'ellipsis') {
                  return (
                    <span key={item.key} style={{ padding: '0 4px' }}>
                      ...
                    </span>
                  );
                }

                const isActive = item.value === currentPage;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={() => setWorkersPage(item.value)}
                    style={isActive ? { background: '#2f6fed', color: '#ffffff' } : undefined}
                  >
                    {item.value}
                  </button>
                );
              })}
              <button
                type="button"
                className="btn btn-outline btn-small"
                disabled={!pagination.next}
                onClick={() => setWorkersPage((previousPage) => Math.min(totalPages, previousPage + 1))}
              >
                Nastepna
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
