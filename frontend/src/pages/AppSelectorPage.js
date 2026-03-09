import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const apps = [
  {
    id: 'production',
    title: 'JumarProdukcjaApp',
    description: 'Monitoruj zlecenia, raporty i produkcję folii w czasie rzeczywistym.',
    action: () => '/'
  },
  {
    id: 'warehouse',
    title: 'JumarMagazynApp',
    description: 'Szybkie zarządzanie stanami magazynowymi: dodawanie, wydania i kontrola braków.',
    action: () => '/magazyn'
  }
];

export default function AppSelectorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="app-selector">
      <header className="section-header">
        <div>
          <h1>Wybierz aplikację Jumar</h1>
          <p>Zalogowano jako {user?.username}. Wybierz moduł, w którym chcesz pracować.</p>
        </div>
      </header>
      <div className="grid cards">
        {apps.map((app) => (
          <button
            key={app.id}
            className="card app-card"
            onClick={() => navigate(app.action())}
          >
            <h2>{app.title}</h2>
            <p>{app.description}</p>
            <span>Przejdź →</span>
          </button>
        ))}
      </div>
    </section>
  );
}
