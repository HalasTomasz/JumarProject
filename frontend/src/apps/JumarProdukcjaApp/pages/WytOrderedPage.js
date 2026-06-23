import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';

const numberFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const PAGE_SIZE = 15;
const extruderOptions = [
  { value: '', label: 'Wszystkie' },
  { value: '0', label: 'W1' },
  { value: '1', label: 'W2' },
  { value: '2', label: 'W3' },
  { value: '3', label: 'W4' },
  { value: '4', label: 'W5' },
];

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

export default function WytOrderedPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [extruderFilter, setExtruderFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, extruderFilter, debouncedSearchTerm]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('reports/completed-production/', {
          params: {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            extruder: extruderFilter || undefined,
            q: debouncedSearchTerm || undefined,
            page,
            page_size: PAGE_SIZE,
            },
        });

        if (!active) {
          return;
        }

        const nextRows = Array.isArray(data?.results) ? data.results : [];
        setRows(nextRows);
        setPagination({
          count: Number(data?.count) || 0,
          next: data?.next || null,
          previous: data?.previous || null,
        });
        setSelectedRowId((previousId) => {
          if (!nextRows.length) {
            return null;
          }
          return nextRows.some((row) => row.id === previousId) ? previousId : nextRows[0].id;
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, extruderFilter, debouncedSearchTerm, page]);

  const totalPages = Math.max(1, Math.ceil((pagination.count || 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = rows.length ? (currentPage - 1) * PAGE_SIZE : 0;
  const paginationItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  if (loading) {
    return <div className="page-loading">Ladowanie: zlecenia zrealizowane po wytlaczarkach...</div>;
  }

  return (
    <section className="orders-page">
      <div className="orders-layout-top">
        <div className="orders-top-main-column">
          <header className="orders-intro-card">
            <div className="orders-intro-heading">
              <h1>Zlecenia zrealizowane po wytlaczarkach</h1>
              <p>Grupowanie: numer zlecenia, wytlaczarka, operator i parametry wyprodukowanej rolki.</p>
            </div>
            <div className="filters orders-filters orders-intro-filters orders-intro-filters-wyt">
              <label>
                Szukaj
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nr ZP, artykul, operator, uwagi..."
                />
              </label>
              <label>
                Data od
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label>
                Data do
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
              <label>
                Nr Wytl.
                <select
                  value={extruderFilter}
                  onChange={(event) => setExtruderFilter(event.target.value)}
                >
                  {extruderOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="orders-intro-filter-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setExtruderFilter('');
                    setSearchTerm('');
                  }}
                  disabled={!dateFrom && !dateTo && !extruderFilter && !searchTerm.trim()}
                >
                  Wyczysc filtry
                </button>
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="orders-layout-main">
        <div className="orders-table-column">
          <div className="table-wrapper orders-table-wrap">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>NrWytl</th>
                  <th>Artykul</th>
                  <th>NrZP</th>
                  <th>Data</th>
                  <th>Zmiana</th>
                  <th>NrRolki</th>
                  <th>Rodzaj folii</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className={`wyt-data-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedRowId(row.id)}
                    >
                      <td>{startIndex + rowIndex + 1}</td>
                      <td>{row.nrwyt_label || '—'}</td>
                      <td>{row.Artykul || '—'}</td>
                      <td>{row.NrZp || '—'}</td>
                      <td>{row.Data || '—'}</td>
                      <td>{row.Zmiana || '—'}</td>
                      <td>{row.Rolka ?? '—'}</td>
                      <td>{row.foil_type_label || '—'}</td>
                      <td>{row.UserName || '—'}</td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={9}>Brak danych dla wybranych filtrow.</td>
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
                  onClick={() => setPage((previousPage) => Math.max(1, previousPage - 1))}
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
                      onClick={() => setPage(item.value)}
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
                  onClick={() => setPage((previousPage) => Math.min(totalPages, previousPage + 1))}
                >
                  Nastepna
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="orders-side-column">
          {!selectedRow ? (
            <aside className="orders-detail-panel">
              <div className="callout info">Wybierz wiersz z tabeli, aby zobaczyc szczegoly rolki.</div>
            </aside>
          ) : (
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
                  <h2 style={{ margin: 0 }}>{`Zlecenie ${selectedRow.UserName || '—'}`}</h2>
                  <div className="orders-detail-header-meta">
                    <p className="orders-detail-header-article">{selectedRow.Artykul || '—'}</p>
                    <p className="orders-detail-header-zp">Nr ZP: {selectedRow.NrZp || '—'}</p>
                  </div>
                </header>

                <section className="orders-detail-notes" style={{ marginTop: '0.25rem' }}>
                  <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>
                    Uwagi
                  </h3>
                  <p style={{ margin: 0 }}>
                    {selectedRow.Uwagi || selectedRow.order_uwagi || 'Brak dodatkowych uwag.'}
                  </p>
                  <p style={{ margin: '0.5rem 0 0' }}>
                    <strong>Mieszanka:</strong> {selectedRow.Mieszanka || '—'}
                  </p>
                </section>

                <section style={{ marginTop: '0.25rem' }}>
                  <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>
                    Parametry zlecenia
                  </h3>
                  <div className="orders-detail-duo-grid">
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Rodzaj folii</span>
                      <span className="orders-detail-duo-value">{selectedRow.foil_type_label || '—'}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Nr Wytl.</span>
                      <span className="orders-detail-duo-value">{selectedRow.nrwyt_label || '—'}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">SzerWorka [mm]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.SzerWorka)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">SzerRekawa [mm]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.SzerRekawa)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Zakladka [mm]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.Zakladka)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">GrubWorka [mikr]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.GrubWorka)}</span>
                    </div>
                  </div>
                </section>

                <section style={{ marginTop: '1.2rem' }}>
                  <h3 className="orders-detail-section-title" style={{ margin: '0 0 0.5rem' }}>
                    Dane rolki
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '0.75rem',
                      paddingBottom: '0.5rem',
                    }}
                  >
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Data produkcji</span>
                      <span className="orders-detail-duo-value">{selectedRow.Data || '—'}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Zmiana</span>
                      <span className="orders-detail-duo-value">{selectedRow.Zmiana || '—'}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">NrRolki</span>
                      <span className="orders-detail-duo-value">{selectedRow.Rolka ?? '—'}</span>
                    </div>
                  </div>
                  <div className="orders-detail-duo-grid">
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">DlugRolkiProd [mb]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.DlugRolkiProd)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">WagaRolkiProd [kg]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.WagaRolkiProd)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Wynikowa grubosc [mikrony]</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.Wynikowa)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">GruboscWynik doZakl %</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.Wynik)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Slimak</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.Slimak)}</span>
                    </div>
                    <div className="orders-detail-duo-item">
                      <span className="orders-detail-duo-label">Walce</span>
                      <span className="orders-detail-duo-value">{formatNumber(selectedRow.Walce)}</span>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          )}
        </aside>
      </div>
    </section>
  );
}
