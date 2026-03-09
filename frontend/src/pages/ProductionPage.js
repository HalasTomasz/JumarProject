import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const defaultRoll = {
  Data: new Date().toISOString().slice(0, 10),
  Zmiana: 'I',
  Rolka: 1,
  NrWytl: 0,
  Rodzaj: 0,
  DlugRolkiProd: '',
  WagaRolkiProd: '',
  Slimak: '',
  Walce: '',
  Wynikowa: '',
  Wynik: '',
  Mieszanka: '',
  Uwagi: '',
};

export default function ProductionPage() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rolls, setRolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [rollForm, setRollForm] = useState(defaultRoll);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    apiClient
      .get('production/orders/')
      .then(({ data }) => setOrders(data.results || data))
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
    if (!selected) return;
    apiClient
      .get(`production/orders/${selected.NrZp}/rolls/`)
      .then(({ data }) => setRolls(data.results || data));
    apiClient.get(`production/orders/${selected.NrZp}/summary/`).then(({ data }) => setSummary(data));
    setRollForm((prev) => ({
      ...defaultRoll,
      NrWytl: selected.NrWytl,
      Rodzaj: selected.Rodzaj,
    }));
  }, [selected]);

  const handleRollChange = (event) => {
    const { name, value } = event.target;
    setRollForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRollSubmit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.post(`production/orders/${selected.NrZp}/rolls/`, rollForm);
      setRollForm({
        ...defaultRoll,
        NrWytl: selected.NrWytl,
        Rodzaj: selected.Rodzaj,
      });
      const [{ data: newRolls }, { data: newSummary }] = await Promise.all([
        apiClient.get(`production/orders/${selected.NrZp}/rolls/`),
        apiClient.get(`production/orders/${selected.NrZp}/summary/`),
      ]);
      setRolls(newRolls.results || newRolls);
      setSummary(newSummary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="production">
      <header className="section-header">
        <div>
          <h1>Produkcja</h1>
          <p>Zlecenia w realizacji i raport rolki.</p>
        </div>
        <button className="btn btn-outline" onClick={loadOrders}>
          Odśwież
        </button>
      </header>

      {loading ? (
        <div className="page-loading">Ładowanie zleceń…</div>
      ) : (
        <div className="production-grid">
          <div className="orders-list">
            <h2>Aktywne zlecenia</h2>
            <ul>
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    className={selected?.id === order.id ? 'is-active' : ''}
                    onClick={() => setSelected(order)}
                  >
                    <strong>{order.NrZp}</strong>
                    <span>{order.foil_type_label}</span>
                  </button>
                </li>
              ))}
              {!orders.length && <li className="empty">Brak aktywnych zleceń.</li>}
            </ul>
          </div>

          <div className="production-details">
            {selected ? (
              <>
                <div className="summary">
                  <h2>Podsumowanie</h2>
                  {summary ? (
                    <div className="grid stats">
                      <div className="stat-card">
                        <p>Waga wyprodukowana</p>
                        <strong>{summary.weight_produced} kg</strong>
                      </div>
                      <div className="stat-card">
                        <p>Długość wyprodukowana</p>
                        <strong>{summary.length_produced} m</strong>
                      </div>
                      <div className="stat-card">
                        <p>Rolki</p>
                        <strong>{summary.rolls_produced}</strong>
                      </div>
                      <div className="stat-card">
                        <p>Postęp</p>
                        <strong>{summary.progress_percent}%</strong>
                      </div>
                    </div>
                  ) : (
                    <p>Brak danych.</p>
                  )}
                </div>

                <div className="rolls">
                  <h2>Rolki</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Data</th>
                        <th>Zmiana</th>
                        <th>Długość</th>
                        <th>Waga</th>
                        <th>Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolls.map((roll) => (
                        <tr key={roll.id}>
                          <td>{roll.Rolka}</td>
                          <td>{roll.Data}</td>
                          <td>{roll.Zmiana}</td>
                          <td>{roll.DlugRolkiProd}</td>
                          <td>{roll.WagaRolkiProd}</td>
                          <td>{roll.UserName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form className="roll-form" onSubmit={handleRollSubmit}>
                  <h3>Dodaj rolkę</h3>
                  <div className="form-grid compact">
                    <label>
                      Data
                      <input type="date" name="Data" value={rollForm.Data} onChange={handleRollChange} required />
                    </label>
                    <label>
                      Zmiana
                      <select name="Zmiana" value={rollForm.Zmiana} onChange={handleRollChange}>
                        <option value="I">I</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                      </select>
                    </label>
                    <label>
                      Nr rolki
                      <input name="Rolka" type="number" value={rollForm.Rolka} onChange={handleRollChange} />
                    </label>
                    <label>
                      Długość [m]
                      <input name="DlugRolkiProd" type="number" value={rollForm.DlugRolkiProd} onChange={handleRollChange} />
                    </label>
                    <label>
                      Waga [kg]
                      <input name="WagaRolkiProd" type="number" value={rollForm.WagaRolkiProd} onChange={handleRollChange} />
                    </label>
                  </div>
                  <button className="btn" disabled={saving}>
                    {saving ? 'Zapisywanie…' : 'Dodaj rolkę'}
                  </button>
                </form>
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
