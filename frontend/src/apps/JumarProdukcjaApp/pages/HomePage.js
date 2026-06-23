import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import useAuth from '../../../hooks/useAuth';

const cardConfig = [
  { title: 'Formularz 1', description: 'Zlecenia produkcyjne', path: '/formularz_zlecenia_produkcyjne', perm: 'can_edit_orders' },
  { title: 'Planowane zlecenia', description: 'Planowane zlecenia produkcyjne', path: '/zlecenia/planowanie', perm: 'can_edit_orders' },
  { title: 'Raport 1', description: 'Zlecenia w realizacji po wytłaczarkach', path: '/production', perm: 'can_manage_production' },
  { title: 'Formularz 2', description: 'Użytkownicy', path: '/jumar_pracownicy', perm: 'can_manage_users' },
  { title: 'Zlecenia w realizacji', description: 'Zlecenia w realizacji', path: '/zlecenia/w-realizacji', perm: 'can_edit_orders' },
  { title: 'Raport 2', description: 'Zlecenia zrealizowane po wytłaczarkach', path: '/wyt_ordered', perm: 'can_view_reports' },
  { title: 'Kalkulator', description: 'Kalkulator produkcyjny', path: '/kalkulator_formularza_zlecen', perm: 'can_use_calculator' },
  { title: 'Zlecenia zrealizowane lub anulowane', description: 'Zlecenia zrealizowane lub anulowane', path: '/zlecenia/zrealizowane-anulowane', perm: 'can_edit_orders' },
  { title: 'Raport 3', description: 'Wydajność na zmianach', path: '/reports_workers', perm: 'can_view_reports' },
];

const groupDefinitions = [
  {
    key: 'forms',
    title: 'Formularze',
    match: (card) => card.title.startsWith('Formularz') || card.path === '/kalkulator_formularza_zlecen',
  },
  {
    key: 'planning',
    title: 'Planowanie',
    match: (card) => card.path.startsWith('/zlecenia/'),
  },
  {
    key: 'reports',
    title: 'Raporty',
    match: (card) => card.title.startsWith('Raport') || card.path === '/reports' || card.path === '/wyt_ordered',
  },
];

export default function HomePage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    apiClient
      .get('home/summary/')
      .then(({ data }) => {
        if (mounted) {
          setSummary(data);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const permissions = user?.permissions;
    return cardConfig.filter((card) => !card.perm || permissions?.[card.perm]);
  }, [user?.permissions]);
  const statusEntries = useMemo(
    () => Object.entries(summary?.stats?.by_status || {}),
    [summary]
  );
  const groupedCards = useMemo(() => {
    const groups = groupDefinitions.map((group) => ({ ...group, cards: [] }));
    cards.forEach((card) => {
      const targetGroup = groups.find((group) => group.match(card)) || groups[groups.length - 1];
      targetGroup.cards.push(card);
    });
    return groups.filter((group) => group.cards.length);
  }, [cards]);

  if (loading) {
    return <div className="page-loading">Ładowanie danych…</div>;
  }

  return (
    <section className="home-dashboard">
      <header className="home-hero">
        <div>
          <p className="home-kicker">Panel startowy</p>
          <h1>Centrum pracy</h1>
        </div>
        <div className="home-hero-meta">
          <span>Zalogowany użytkownik</span>
          <strong>{user?.username || '—'}</strong>
        </div>
      </header>

      <div className="home-summary-grid">
        <article className="home-total-card">
          <p>Suma zleceń</p>
          <strong>{summary?.stats?.total_orders ?? '—'}</strong>
          <small>Podsumowanie bieżących statusów</small>
        </article>
        {statusEntries.map(([label, value]) => (
          <article className="home-status-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="home-groups">
        {groupedCards.map((group) => (
          <section className="home-group" key={group.key}>
            <div className="home-group-header">
              <h2>{group.title}</h2>
              <span>{group.cards.length}</span>
            </div>
            <p>{group.description}</p>
            <div className="home-group-grid">
              {group.cards.map((card) => (
                <button
                  key={card.title}
                  className="home-action-card"
                  onClick={() => navigate(card.path)}
                >
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <span>Otwórz →</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
