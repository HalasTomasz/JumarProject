import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../api/client';
import useAuth from '../../../hooks/useAuth';

const defaultRollForm = {
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

const getNextRollNumber = (existingRolls = []) => {
  if (!Array.isArray(existingRolls) || !existingRolls.length) {
    return 1;
  }
  const maxRollNumber = Math.max(...existingRolls.map((roll) => Number(roll.Rolka) || 0));
  return Number.isFinite(maxRollNumber) ? maxRollNumber + 1 : 1;
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDecimal = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return Number(value).toFixed(2);
};

const buildRollPayload = (form, order) => {
  const numericKeys = ['NrWytl', 'Rodzaj', 'DlugRolkiProd', 'WagaRolkiProd', 'Slimak', 'Walce', 'Wynikowa', 'Wynik'];
  const payload = {
    ...form,
    Rodzaj: Number(order?.Rodzaj ?? form.Rodzaj ?? 0),
  };

  numericKeys.forEach((key) => {
    if (payload[key] === '') {
      payload[key] = null;
      return;
    }
    const numeric = parseNumeric(payload[key]);
    payload[key] = numeric === null ? null : numeric;
  });

  return payload;
};

const buildInitialForm = (order, nextRoll) => ({
  ...defaultRollForm,
  Rolka: nextRoll,
  NrWytl: Number(order?.NrWytl ?? 0),
  Rodzaj: Number(order?.Rodzaj ?? 0),
});

export default function ProductionRollFormPage() {
  const { id, rollId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(rollId);

  const [order, setOrder] = useState(null);
  const [form, setForm] = useState(defaultRollForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: orderData } = await apiClient.get(`orders/${id}/`);
        if (!orderData?.id || !orderData?.NrZp) {
          throw new Error('missing-order');
        }

        const encodedOrderCode = encodeURIComponent(orderData.NrZp);
        const { data: rollData } = await apiClient.get(`production/orders/${encodedOrderCode}/rolls/`);
        const rolls = Array.isArray(rollData) ? rollData : rollData.results || [];

        if (!mounted) {
          return;
        }

        setOrder(orderData);

        if (isEditMode) {
          const { data: existingRoll } = await apiClient.get(
            `production/orders/${encodedOrderCode}/rolls/${rollId}/`
          );
          const nextForm = {
            ...buildInitialForm(orderData, getNextRollNumber(rolls)),
            ...existingRoll,
            Data: existingRoll?.Data || defaultRollForm.Data,
            Zmiana: existingRoll?.Zmiana || 'I',
            Rolka: Number(existingRoll?.Rolka ?? getNextRollNumber(rolls)),
            NrWytl: Number(existingRoll?.NrWytl ?? orderData?.NrWytl ?? 0),
            Rodzaj: Number(orderData?.Rodzaj ?? existingRoll?.Rodzaj ?? 0),
          };
          setForm(nextForm);
          return;
        }

        setForm(buildInitialForm(orderData, getNextRollNumber(rolls)));
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError('Nie udało się załadować formularza dla wybranego zlecenia.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [id, isEditMode, rollId]);

  const derived = useMemo(() => {
    const producedWeight = parseNumeric(form.WagaRolkiProd);
    const targetWeight = parseNumeric(order?.WagaRolkiZlec);
    const targetThickness = parseNumeric(order?.GrubWorka);

    if (producedWeight === null || targetWeight === null || targetThickness === null || targetWeight === 0) {
      return { Wynik: '', Wynikowa: '' };
    }

    const thicknessPercent = (producedWeight / targetWeight) * 100;
    const resultingThickness = (targetThickness * thicknessPercent) / 100;

    return {
      Wynik: formatDecimal(thicknessPercent),
      Wynikowa: formatDecimal(resultingThickness),
    };
  }, [form.WagaRolkiProd, order?.WagaRolkiZlec, order?.GrubWorka]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.Wynik === derived.Wynik && prev.Wynikowa === derived.Wynikowa) {
        return prev;
      }
      return {
        ...prev,
        Wynik: derived.Wynik,
        Wynikowa: derived.Wynikowa,
      };
    });
  }, [derived]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!order) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const encodedOrderCode = encodeURIComponent(order.NrZp);
      const payload = buildRollPayload(form, order);
      if (isEditMode) {
        await apiClient.put(`production/orders/${encodedOrderCode}/rolls/${rollId}/`, payload);
      } else {
        await apiClient.post(`production/orders/${encodedOrderCode}/rolls/`, payload);
      }
      navigate('/production');
    } catch (saveError) {
      const detail =
        saveError.response?.data?.detail ||
        Object.values(saveError.response?.data || {})[0] ||
        'Nie udało się zapisać zmian rolki. Sprawdź pola formularza.';
      setError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-loading">Ładowanie formularza rolki…</div>;
  }

  return (
    <section className="legacy-form production-roll-form-page">
      <header className="section-header">
        <div>
          <h1>{isEditMode ? 'Edytuj rolkę' : 'Dodaj rolkę'}</h1>
          <p>
            {isEditMode
              ? 'Zaktualizuj dane dodanej rolki.'
              : 'Formularz produkcyjny w układzie zbliżonym do klasycznego widoku.'}
          </p>
        </div>
      </header>

      <div className="legacy-form-card">
        <div className="legacy-form-notice">
          <span className="text-danger">Pola obowiązkowe</span>
          <span className="text-info">Pola nieobowiązkowe</span>
          <span className="text-secondary">Pola automatyczne</span>
        </div>
        <p className="legacy-form-warning">Nie używaj przecinków - wpisuj liczby dziesiętne z kropką.</p>

        {error && <div className="callout error">{error}</div>}

        <form onSubmit={handleSubmit} className="legacy-form-layout production-roll-layout">
          <div className="legacy-row">
            <label className="legacy-field auto-field">
              <span>Nr ZP</span>
              <input value={order?.NrZp || ''} readOnly />
            </label>
            <label className="legacy-field auto-field">
              <span>Artykuł</span>
              <input value={order?.Artykul || ''} readOnly />
            </label>
            <label className="legacy-field auto-field">
              <span>DługRolkiZlec korekta [mb]</span>
              <input value={order?.DlugRolkiZlec_Korekta ?? ''} readOnly />
            </label>
            <label className="legacy-field auto-field">
              <span>WagaRolkiZlec [kg]</span>
              <input value={order?.WagaRolkiZlec ?? ''} readOnly />
            </label>
            <label className="legacy-field auto-field">
              <span>Operator</span>
              <input value={user?.username || ''} readOnly />
            </label>
          </div>

          <div className="legacy-row small">
            <label className="legacy-field required">
              <span>Data produkcji</span>
              <input type="date" name="Data" value={form.Data} onChange={handleChange} required />
            </label>
            <label className="legacy-field required">
              <span>Zmiana</span>
              <select name="Zmiana" value={form.Zmiana} onChange={handleChange} required>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>
            </label>
            <label className="legacy-field auto-field">
              <span>Nr rolki</span>
              <input name="Rolka" value={form.Rolka} readOnly />
            </label>
            <label className="legacy-field required">
              <span>NrWytł</span>
              <select name="NrWytl" value={form.NrWytl} onChange={handleChange}>
                <option value={0}>W1</option>
                <option value={1}>W2</option>
                <option value={2}>W3</option>
                <option value={3}>W4</option>
                <option value={4}>W5</option>
              </select>
            </label>
          </div>

          <div className="legacy-row">
            <label className="legacy-field required">
              <span>DługRolkiProd [mb]</span>
              <input
                type="number"
                name="DlugRolkiProd"
                value={form.DlugRolkiProd}
                onChange={handleChange}
                step="0.01"
                required
              />
            </label>
            <label className="legacy-field required">
              <span>WagaRolkiProd [kg]</span>
              <input
                type="number"
                name="WagaRolkiProd"
                value={form.WagaRolkiProd}
                onChange={handleChange}
                step="0.01"
                required
              />
            </label>
            <label className="legacy-field">
              <span>Walce</span>
              <input type="number" name="Walce" value={form.Walce} onChange={handleChange} step="0.01" />
            </label>
            <label className="legacy-field">
              <span>Ślimak</span>
              <input type="number" name="Slimak" value={form.Slimak} onChange={handleChange} step="0.01" />
            </label>
          </div>

          <div className="legacy-row small">
            <label className="legacy-field auto-field">
              <span>Wynikowa grubość [mikrony]</span>
              <input name="Wynikowa" value={form.Wynikowa} readOnly />
            </label>
            <label className="legacy-field auto-field">
              <span>GrubośćWynik %</span>
              <input name="Wynik" value={form.Wynik} readOnly />
            </label>
            <label className="legacy-field">
              <span>Mieszanka</span>
              <input name="Mieszanka" value={form.Mieszanka} onChange={handleChange} maxLength={40} />
            </label>
          </div>

          <label className="legacy-field full production-roll-notes">
            <span>Uwagi</span>
            <textarea
              name="Uwagi"
              value={form.Uwagi}
              onChange={handleChange}
              rows={3}
              maxLength={240}
              placeholder="Dodatkowe informacje o rolce"
            />
          </label>

          <div className="legacy-form-actions production-roll-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/production')}>
              Anuluj
            </button>
            <button className="btn" disabled={saving}>
              {saving ? 'Zapisywanie…' : isEditMode ? 'Zapisz zmiany' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
