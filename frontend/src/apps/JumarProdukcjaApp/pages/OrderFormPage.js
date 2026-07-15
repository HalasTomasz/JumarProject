import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../api/client';
import { calculateOrderDerivedValues } from '../../../utils/orderCalculations';

const createEmptyOrder = () => ({
  Data: new Date().toISOString().slice(0, 10),
  Artykul: '',
  Kod: '',
  MMK: '',
  Barwnik: '',
  Status: 0,
  Priorytet: 1,
  Rodzaj: 0,
  IloscZlec: '',
  SzerWorka: '',
  SzerRekawa: '',
  Zakladka: '',
  DlugWorka: '',
  GrubWorka: '',
  DlugFoilPlan_Korekta: '',
  WagaFoliZlec: '',
  DlugFoliPlan: '',
  IloscRolekZlec: '',
  DlugRolkiZlec_Korekta: '',
  DlugRolkiPlan: '',
  DlugFoliZlec_Korekta: '',
  WagaRolkiZlec: '',
  NrWytl: 0,
  Tasma: false,
  Uwagi: '',
});

const editableKeys = Object.keys(createEmptyOrder());
const createFormState = () => calculateOrderDerivedValues({ ...createEmptyOrder(), NrZp: '' });

export default function OrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState({ status: [], priority: [], foil_types: [] });
  const [form, setForm] = useState(createFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('meta/orders/').then(({ data }) => setMetadata(data));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiClient.get(`orders/${id}/`).then(({ data }) => {
      const mapped = createEmptyOrder();
      editableKeys.forEach((key) => {
        if (key in data) {
          mapped[key] = data[key];
        }
      });
      mapped.NrZp = data.NrZp;
      setForm(calculateOrderDerivedValues(mapped));
    });
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue = type === 'checkbox' ? checked : value;
    if (name === 'Tasma') {
      nextValue = value === '1';
    }
    setForm((prev) => calculateOrderDerivedValues({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const submitAction = event.nativeEvent?.submitter?.value || 'save';
    setSaving(true);
    setError('');
    try {
      const payload = editableKeys.reduce((acc, key) => {
        const value = form[key];
        return { ...acc, [key]: value === '' ? null : value };
      }, {});
      if (isEdit) {
        await apiClient.put(`orders/${id}/`, payload);
      } else {
        await apiClient.post('orders/', payload);
      }
      if (!isEdit && submitAction === 'save_and_new') {
        setForm(createFormState());
      } else {
        navigate('/zlecenia/planowanie');
      }
    } catch (err) {
      setError('Nie udało się zapisać zlecenia. Sprawdź dane.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`order-form order-form-v2${isEdit ? '' : ' order-form-create'}`}>
      <div className="order-form-frame">
        <aside className="order-form-side">
          <header className="section-header order-form-side-header">
            <div>
              <h1>{isEdit ? 'Edytuj zlecenie' : 'Nowe zlecenie'}</h1>
              {form.NrZp && <p>Nr ZP: {form.NrZp}</p>}
              <p className="order-form-subtitle">
                {isEdit
                  ? 'Zaktualizuj dane i zapisz zmiany.'
                  : 'Wypełnij formularz krok po kroku.'}
              </p>
            </div>
          </header>

          <div className="order-form-notice">
            <span className="text-danger">Pola obowiązkowe</span>
            <span className="text-info">Pola nieobowiązkowe</span>
            <span className="text-secondary">Pola automatyczne</span>
          </div>
          <p className="order-form-warning">
            Nie używaj przecinków tylko kropek w przypadku liczb dziesiętnych.
          </p>
          <div className="order-form-side-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/zlecenia/planowanie')}>
              Anuluj
            </button>
            {!isEdit && (
              <button
                type="submit"
                form="order-form-main"
                className="btn btn-outline"
                value="save_and_new"
                disabled={saving}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz i dodaj kolejne'}
              </button>
            )}
            <button type="submit" form="order-form-main" className="btn" value="save" disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </aside>

        <form id="order-form-main" className="order-form-layout" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="order-form-columns">
            <h2 className="order-form-column-title order-form-column-input">Pola do wpisania</h2>
            <h2 className="order-form-column-title order-form-column-auto">Wyliczane automatycznie</h2>
            <h2 className="order-form-column-title order-form-column-optional">Pola nieobowiązkowe</h2>

            <section className="order-form-group order-form-basic-input">
              <div className="order-input-group">
                <h3>Dane podstawowe</h3>
                <label className="order-field order-required order-field-wide">
                  <span>Artykuł</span>
                  <input name="Artykul" value={form.Artykul || ''} onChange={handleChange} placeholder="Produkowana folia" required />
                </label>
                <label className="order-field order-required">
                  <span>Data</span>
                  <input type="date" name="Data" value={form.Data || ''} onChange={handleChange} required />
                </label>
                <label className="order-field order-required">
                  <span>IlośćZlec [szt. lub mb]</span>
                  <input name="IloscZlec" type="number" value={form.IloscZlec || ''} onChange={handleChange} required />
                </label>
                <label className="order-field order-required">
                  <span>Rodzaj folii</span>
                  <select name="Rodzaj" value={form.Rodzaj} onChange={handleChange}>
                    {metadata.foil_types.length ? metadata.foil_types.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>) : <option value={form.Rodzaj}>Ładowanie…</option>}
                  </select>
                </label>
                <label className="order-field order-required">
                  <span>Status</span>
                  <select name="Status" value={form.Status} onChange={handleChange}>
                    {metadata.status.length ? metadata.status.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>) : <option value={form.Status}>Ładowanie…</option>}
                  </select>
                </label>
              </div>
            </section>

            <section className="order-form-group order-form-basic-optional">
              <div className="order-optional-group">
                <h3>Informacje dodatkowe</h3>
                <label className="order-field order-optional"><span>Kod</span><input name="Kod" value={form.Kod || ''} onChange={handleChange} /></label>
                <label className="order-field order-optional"><span>MMK</span><input name="MMK" value={form.MMK || ''} onChange={handleChange} /></label>
                <label className="order-field order-optional"><span>Barwnik</span><input name="Barwnik" value={form.Barwnik || ''} onChange={handleChange} /></label>
              </div>
            </section>

            <section className="order-form-group order-form-dimensions-input">
              <div className="order-input-group">
                <h3>Wymiary produktu</h3>
                <label className="order-field order-required"><span>SzerWorka [mm]</span><input name="SzerWorka" type="number" value={form.SzerWorka || ''} onChange={handleChange} required /></label>
                <label className="order-field order-required"><span>SzerRękawa [mm]</span><input name="SzerRekawa" type="number" value={form.SzerRekawa || ''} onChange={handleChange} required /></label>
                <label className="order-field order-required"><span>DługWorka [mm]</span><input name="DlugWorka" type="number" value={form.DlugWorka || ''} onChange={handleChange} required /></label>
                <label className="order-field order-required"><span>GrubWorka [μm]</span><input name="GrubWorka" type="number" value={form.GrubWorka || ''} onChange={handleChange} required /></label>
              </div>
            </section>

            <section className="order-form-group order-form-dimensions-auto">
              <div className="order-auto-group">
                <h3>Wyliczenia z wymiarów</h3>
                <label className="order-field order-auto"><span>Zakładka [mm]</span><input name="Zakladka" value={form.Zakladka || ''} readOnly /></label>
                <label className="order-field order-auto"><span>WagaFoilZlec [kg]</span><input name="WagaFoliZlec" type="number" value={form.WagaFoliZlec || ''} readOnly /></label>
                <label className="order-field order-auto"><span>DługFoilPlan [mb]</span><input name="DlugFoliPlan" type="number" value={form.DlugFoliPlan || ''} readOnly /></label>
              </div>
            </section>

            <section className="order-form-group order-form-dimensions-optional">
              <div className="order-optional-group">
                <h3>Wymiary produktu</h3>
                <label className="order-field order-optional"><span>DługFoilPlan korekta [mb]</span><input name="DlugFoilPlan_Korekta" type="number" value={form.DlugFoilPlan_Korekta || ''} onChange={handleChange} /></label>
              </div>
            </section>

            <section className="order-form-group order-form-rolls-input">
              <div className="order-input-group">
                <h3>Plan rolek</h3>
                <label className="order-field order-required"><span>IlośćRolekZlec [szt.]</span><input name="IloscRolekZlec" type="number" value={form.IloscRolekZlec || ''} onChange={handleChange} /></label>
                <label className="order-field order-required"><span>DługRolkiZlec korekta [mb]</span><input name="DlugRolkiZlec_Korekta" type="number" value={form.DlugRolkiZlec_Korekta || ''} onChange={handleChange} /></label>
              </div>
            </section>

            <section className="order-form-group order-form-rolls-auto">
              <div className="order-auto-group">
                <h3>Wyliczenia rolek</h3>
                <label className="order-field order-auto"><span>DługRolkiPlan [mb]</span><input name="DlugRolkiPlan" type="number" value={form.DlugRolkiPlan || ''} readOnly /></label>
                <label className="order-field order-auto"><span>DługFoilZlec korekta [mb]</span><input name="DlugFoliZlec_Korekta" type="number" value={form.DlugFoliZlec_Korekta || ''} readOnly /></label>
                <label className="order-field order-auto"><span>WagaRolkiZlec [kg]</span><input name="WagaRolkiZlec" type="number" value={form.WagaRolkiZlec || ''} readOnly /></label>
              </div>
            </section>

            <section className="order-form-group order-form-settings-input">
              <div className="order-input-group order-input-group-three">
                <h3>Ustawienia produkcji</h3>
                <label className="order-field order-required">
                  <span>Nr Wytł.</span>
                  <select name="NrWytl" value={form.NrWytl ?? 0} onChange={handleChange}>
                    <option value={0}>W1</option><option value={1}>W2</option><option value={2}>W3</option><option value={3}>W4</option><option value={4}>W5</option>
                  </select>
                </label>
                <label className="order-field order-required">
                  <span>Priorytet</span>
                  <select name="Priorytet" value={form.Priorytet} onChange={handleChange}>
                    {metadata.priority.length ? metadata.priority.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>) : <option value={form.Priorytet}>Ładowanie…</option>}
                  </select>
                </label>
                <label className="order-field order-required">
                  <span>Taśma</span>
                  <select name="Tasma" value={Boolean(form.Tasma) ? '1' : '0'} onChange={handleChange}>
                    <option value="0">Nie</option><option value="1">Tak</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="order-form-group order-form-settings-optional">
              <div className="order-optional-group">
                <h3>Uwagi</h3>
              <label className="order-field order-optional order-uwagi"><span>Uwagi</span><textarea name="Uwagi" value={form.Uwagi || ''} onChange={handleChange} rows={6} maxLength={1024} placeholder="Dodatkowe informacje do zlecenia..." /><small>{(form.Uwagi || '').length}/1024</small></label>
              </div>
            </section>
          </div>

        </form>
      </div>
    </section>
  );
}
