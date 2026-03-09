import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const densityMap = {
  0: 0.95,
  1: 0.95,
  2: 0.95,
};

const buildDefaultLegacyForm = () => ({
  Artykul: '',
  Kod: '',
  MMK: '',
  Barwnik: '',
  Data: new Date().toISOString().slice(0, 10),
  Status: 0,
  Priorytet: 1,
  Rodzaj: 0,
  IloscZlec: '',
  SzerWorka: '',
  SzerRekawa: '',
  DlugWorka: '',
  GrubWorka: '',
  DolneOdch: '',
  DlugFoilPlan_Korekta: '1',
  IloscRolekZlec: '',
  DlugRolkiZlec_Korekta: '',
  NrWytl: 0,
  Tasma: '0',
  Uwagi: '',
});

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const normalized = String(value).replace(',', '.').replace(/\s+/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDerived = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return Number(value).toFixed(2).replace('.', '.');
};

const calculateDerived = (form) => {
  const szerRekawa = parseNumeric(form.SzerRekawa);
  const szerWorka = parseNumeric(form.SzerWorka);
  const ilosc = parseNumeric(form.IloscZlec);
  const dlugWorka = parseNumeric(form.DlugWorka);
  const korektaFoli = parseNumeric(form.DlugFoilPlan_Korekta);
  const dolneOdch = parseNumeric(form.DolneOdch);
  const iloscRolek = parseNumeric(form.IloscRolekZlec);
  const dlugRolkiKorekta = parseNumeric(form.DlugRolkiZlec_Korekta);
  const tasma = form.Tasma === '1';
  const rodzaj = Number(form.Rodzaj || 0);

  const zakladka =
    szerRekawa !== null && szerWorka !== null ? (szerRekawa - szerWorka) / 2 : null;

  let dlugFoliPlan = null;
  if (ilosc !== null && dlugWorka !== null && korektaFoli !== null) {
    dlugFoliPlan = (ilosc * dlugWorka * korektaFoli) / 1000;
  }

  let wagaFoliZlec = null;
  if (szerRekawa !== null && dolneOdch !== null && dlugFoliPlan !== null) {
    const density = densityMap[rodzaj] ?? 0.95;
    const base = (szerRekawa / 1000) * (dolneOdch / 1000) * dlugFoliPlan * 2 * density;
    wagaFoliZlec = tasma ? base / 2 : base;
  }

  let dlugRolkiPlan = null;
  if (dlugFoliPlan !== null && iloscRolek) {
    dlugRolkiPlan = dlugFoliPlan / iloscRolek;
  }

  let wagaRolkiZlec = null;
  if (wagaFoliZlec !== null && iloscRolek) {
    wagaRolkiZlec = wagaFoliZlec / iloscRolek;
  }

  let dlugFoliZlecKorekta = null;
  if (dlugRolkiKorekta !== null && iloscRolek !== null) {
    dlugFoliZlecKorekta = dlugRolkiKorekta * iloscRolek;
  }

  return {
    Zakladka: formatDerived(zakladka),
    DlugFoliPlan: formatDerived(dlugFoliPlan),
    WagaFoliZlec: formatDerived(wagaFoliZlec),
    DlugRolkiPlan: formatDerived(dlugRolkiPlan),
    WagaRolkiZlec: formatDerived(wagaRolkiZlec),
    DlugFoliZlec_Korekta: formatDerived(dlugFoliZlecKorekta),
  };
};

export default function OrdersLegacyFormPage() {
  const [form, setForm] = useState(() => buildDefaultLegacyForm());
  const [metadata, setMetadata] = useState({ status: [], priority: [], foil_types: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const derived = useMemo(() => calculateDerived(form), [form]);

  useEffect(() => {
    apiClient.get('meta/orders/').then(({ data }) => setMetadata(data));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        ...derived,
        Status: Number(form.Status || 0),
        Priorytet: Number(form.Priorytet || 0),
        Rodzaj: Number(form.Rodzaj || 0),
        NrWytl: Number(form.NrWytl || 0),
        Tasma: form.Tasma === '1',
      };
      const numericFields = [
        'IloscZlec',
        'SzerWorka',
        'SzerRekawa',
        'DlugWorka',
        'GrubWorka',
        'DolneOdch',
        'DlugFoilPlan_Korekta',
        'IloscRolekZlec',
        'DlugRolkiZlec_Korekta',
        'Zakladka',
        'DlugFoliPlan',
        'WagaFoliZlec',
        'DlugRolkiPlan',
        'WagaRolkiZlec',
        'DlugFoliZlec_Korekta',
      ];
      numericFields.forEach((field) => {
        if (payload[field] === '') {
          payload[field] = null;
          return;
        }
        const parsed = parseNumeric(payload[field]);
        payload[field] = parsed === null ? null : parsed;
      });
      await apiClient.post('orders/', payload);
      setSuccess('Zlecenie zostało utworzone.');
      setForm(buildDefaultLegacyForm());
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0] ||
        'Nie udało się zapisać zlecenia.';
      setError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="legacy-form">
      <header className="section-header">
        <div>
          <h1>Formularz legacy</h1>
          <p>Odtworzony układ dodawania zlecenia z poprzedniego systemu.</p>
        </div>
        <div className="actions">
          <Link className="btn btn-outline" to="/orders/zlecenie">
            Powrót do planu
          </Link>
          <button className="btn btn-outline" type="button" onClick={() => navigate('/orders')}>
            Widok nowy
          </button>
        </div>
      </header>

      <div className="legacy-form-card">
        <div className="legacy-form-notice">
          <span className="text-danger">Pola obowiązkowe</span>
          <span className="text-info">Pola nieobowiązkowe</span>
          <span className="text-secondary">Pola automatyczne</span>
        </div>
        <p className="legacy-form-warning">Nie używaj przecinków – wpisuj liczby dziesiętne z kropką.</p>

        {success && <div className="callout success">{success}</div>}
        {error && <div className="callout error">{error}</div>}

        <form onSubmit={handleSubmit} className="legacy-form-grid">
          <label>
            Artykuł *
            <input name="Artykul" value={form.Artykul} onChange={handleChange} required />
          </label>
          <label>
            Kod
            <input name="Kod" value={form.Kod} onChange={handleChange} />
          </label>
          <label>
            MMK
            <input name="MMK" value={form.MMK} onChange={handleChange} />
          </label>
          <label>
            Barwnik
            <input name="Barwnik" value={form.Barwnik} onChange={handleChange} />
          </label>
          <label>
            Data
            <input type="date" name="Data" value={form.Data} onChange={handleChange} required />
          </label>
          <label>
            Status
            <select name="Status" value={form.Status} onChange={handleChange}>
              {metadata.status.length ? (
                metadata.status.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value={form.Status}>Ładowanie…</option>
              )}
            </select>
          </label>
          <label>
            Priorytet
            <select name="Priorytet" value={form.Priorytet} onChange={handleChange}>
              {metadata.priority.length ? (
                metadata.priority.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value={form.Priorytet}>Ładowanie…</option>
              )}
            </select>
          </label>
          <label>
            Rodzaj folii
            <select name="Rodzaj" value={form.Rodzaj} onChange={handleChange}>
              {metadata.foil_types.length ? (
                metadata.foil_types.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value={form.Rodzaj}>Ładowanie…</option>
              )}
            </select>
          </label>
          <label>
            Ilość zlecona [szt]
            <input name="IloscZlec" value={form.IloscZlec} onChange={handleChange} required />
          </label>
          <label>
            Szerokość worka [mm]
            <input name="SzerWorka" value={form.SzerWorka} onChange={handleChange} required />
          </label>
          <label>
            Szerokość rękawa [mm]
            <input name="SzerRekawa" value={form.SzerRekawa} onChange={handleChange} required />
          </label>
          <label>
            Zakładka [mm]
            <input value={derived.Zakladka} readOnly />
          </label>
          <label>
            Długość worka [mm]
            <input name="DlugWorka" value={form.DlugWorka} onChange={handleChange} required />
          </label>
          <label>
            Grubość worka [μm]
            <input name="GrubWorka" value={form.GrubWorka} onChange={handleChange} required />
          </label>
          <label>
            Dolne odchyłki [μm]
            <input name="DolneOdch" value={form.DolneOdch} onChange={handleChange} />
          </label>
          <label>
            Dług. folii plan (korekta) [mb]
            <input
              name="DlugFoilPlan_Korekta"
              value={form.DlugFoilPlan_Korekta}
              onChange={handleChange}
            />
          </label>
          <label>
            Waga folii [kg]
            <input value={derived.WagaFoliZlec} readOnly />
          </label>
          <label>
            Dług. folii plan [mb]
            <input value={derived.DlugFoliPlan} readOnly />
          </label>
          <label>
            Ilość rolek [szt]
            <input name="IloscRolekZlec" value={form.IloscRolekZlec} onChange={handleChange} />
          </label>
          <label>
            Dług. rolki (korekta) [mb]
            <input
              name="DlugRolkiZlec_Korekta"
              value={form.DlugRolkiZlec_Korekta}
              onChange={handleChange}
            />
          </label>
          <label>
            Dług. rolki plan [mb]
            <input value={derived.DlugRolkiPlan} readOnly />
          </label>
          <label>
            Dług. folii korekta [mb]
            <input value={derived.DlugFoliZlec_Korekta} readOnly />
          </label>
          <label>
            Waga rolki [kg]
            <input value={derived.WagaRolkiZlec} readOnly />
          </label>
          <label>
            Nr wytłaczarki
            <select name="NrWytl" value={form.NrWytl} onChange={handleChange}>
              <option value={0}>W1</option>
              <option value={1}>W2</option>
              <option value={2}>W3</option>
            </select>
          </label>
          <label>
            Taśma
            <select name="Tasma" value={form.Tasma} onChange={handleChange}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
          <label className="span-2">
            Uwagi
            <textarea name="Uwagi" value={form.Uwagi} onChange={handleChange} rows={2} />
          </label>
          <div className="form-actions legacy-form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setForm(buildDefaultLegacyForm())}>
              Wyczyść
            </button>
            <button className="btn" disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz zlecenie'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
