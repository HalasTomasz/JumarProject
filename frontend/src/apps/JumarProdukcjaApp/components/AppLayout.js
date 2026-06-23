import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import logo from '../../../assets/logo.png';

const navLinks = [
  { label: 'Start', path: '/', perm: null },
  { label: 'Zlecenia', path: '/zlecenia/planowanie', perm: 'can_edit_orders' },
  { label: 'Produkcja', path: '/production', perm: 'can_manage_production' },
  { label: 'Kalkulator', path: '/kalkulator_formularza_zlecen', perm: 'can_use_calculator' },
  { label: 'Raport 2', path: '/wyt_ordered', perm: 'can_view_reports' },
  { label: 'Raport 3', path: '/reports_workers', perm: 'can_view_reports' },
];

function AppsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M17.5 14v7" />
      <path d="M14 17.5h7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 16l5-4-5-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const perms = user?.permissions || {};
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="Jumar" />
        </div>
        <nav>
          {navLinks.map((link) => {
            const allowed = !link.perm || perms[link.perm];
            if (!allowed) {
              return null;
            }
            return (
              <NavLink
                key={`${link.path}-${link.label}`}
                to={link.path}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' is-active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-actions" aria-label="Akcje użytkownika">
            <button
              type="button"
              className="sidebar-icon-button"
              aria-label="Zmień aplikację"
              title="Zmień aplikację"
              onClick={() => navigate('/apps')}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <AppsIcon />
              </span>
              <span className="sidebar-action-tooltip">Zmień aplikację</span>
            </button>
            <button
              type="button"
              className="sidebar-icon-button sidebar-icon-button-danger"
              aria-label="Wyloguj"
              title="Wyloguj"
              onClick={logout}
            >
              <span className="sidebar-icon" aria-hidden="true">
                <LogoutIcon />
              </span>
              <span className="sidebar-action-tooltip">Wyloguj</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
