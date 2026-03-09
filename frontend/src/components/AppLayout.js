import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import logo from '../assets/logo.png';

const navLinks = [
  { label: 'Start', path: '/', perm: null },
  { label: 'Zlecenia', path: '/orders', perm: 'can_edit_orders' },
  { label: 'Produkcja', path: '/production', perm: 'is_manager' },
  { label: 'Kalkulator', path: '/calculator', perm: null },
  { label: 'Raporty', path: '/reports', perm: 'can_view_reports' },
];

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
                key={link.path}
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
      </aside>
      <div className="app-content">
        <header className="app-header">
          <div>
            <p className="welcome">Witaj, {user?.username}</p>
            <small>{user?.groups?.join(', ') || 'Brak grup'}</small>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => navigate('/apps')}>
              Zmień aplikację
            </button>
            <button className="btn btn-outline" onClick={logout}>
              Wyloguj
            </button>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
