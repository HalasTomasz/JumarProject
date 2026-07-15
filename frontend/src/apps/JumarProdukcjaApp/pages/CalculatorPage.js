import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DENSITY = 0.95;
const BAG_LENGTH_MM = 1000;

const initialForm = {
  Rodzaj: '0',
  Tasma: '0',
  SzerWorka: '',
  SzerRekawa: '',
  GrubWorka: '',
  WagaProdukcja: '',
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const normalized = String(value).replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatWithSpaces = (value, digits) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  const fixed = Number(value).toFixed(digits);
  const [integerPart, decimalPart] = fixed.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decimalPart ? `${grouped}.${decimalPart}` : grouped;
};

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);

  const waga1mb = useMemo(() => {
    const szerRekawa = parseNumeric(form.SzerRekawa);
    const grubWorka = parseNumeric(form.GrubWorka);
    if (szerRekawa === null || grubWorka === null) {
      return null;
    }

    const baseWeight =
      (szerRekawa / 1000) * (grubWorka / 1000) * (BAG_LENGTH_MM / 1000) * 2 * DENSITY;
    return form.Tasma === '1' ? baseWeight / 2 : baseWeight;
  }, [form.SzerRekawa, form.GrubWorka, form.Tasma]);

  const iloscZlec = useMemo(() => {
    const wagaProdukcja = parseNumeric(form.WagaProdukcja);
    if (wagaProdukcja === null || waga1mb === null || waga1mb === 0) {
      return null;
    }
    return wagaProdukcja / waga1mb;
  }, [form.WagaProdukcja, waga1mb]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setForm(initialForm);
  };

  const handleCreateOrder = () => {
    if (iloscZlec === null) {
      return;
    }

    navigate('/formularz_zlecenia_produkcyjne', {
      state: {
        prefill: {
          Rodzaj: Number(form.Rodzaj),
          Tasma: form.Tasma === '1',
          SzerWorka: form.SzerWorka,
          SzerRekawa: form.SzerRekawa,
          GrubWorka: form.GrubWorka,
          DlugWorka: String(BAG_LENGTH_MM),
          IloscZlec: iloscZlec.toFixed(2),
        },
      },
    });
  };

  return (
    <section className="calculator-legacy">
      <div className="calculator-legend">
        <span className="text-danger">Pola obowiązkowe</span>
        <span className="text-info">Pola nieobowiązkowe</span>
        <span className="text-secondary">Pola automatycznie</span>
      </div>

      <p className="calculator-warning">
        Nie używaj przecinków tylko kropek w przypadku liczb dziesiętnych.
      </p>

      <form className="calculator-legacy-form" onSubmit={(event) => event.preventDefault()}>
        <div className="calculator-row">
          <label htmlFor="id_Rodzaj">Rodzaj folii</label>
          <select
            id="id_Rodzaj"
            name="Rodzaj"
            value={form.Rodzaj}
            onChange={handleChange}
            className="calc-input required"
          >
            <option value="0">HDPE</option>
            <option value="1">LDPE</option>
            <option value="2">MDPE</option>
          </select>
        </div>

        <div className="calculator-row">
          <label htmlFor="id_Tasma">Taśma</label>
          <select
            id="id_Tasma"
            name="Tasma"
            value={form.Tasma}
            onChange={handleChange}
            className="calc-input required"
          >
            <option value="0">Nie</option>
            <option value="1">Tak</option>
          </select>
        </div>

        <div className="calculator-row">
          <label htmlFor="id_SzerWorka">SzerWorka [mm]</label>
          <input
            id="id_SzerWorka"
            name="SzerWorka"
            value={form.SzerWorka}
            onChange={handleChange}
            className="calc-input required"
            inputMode="decimal"
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_SzerRekawa">SzerRękawa [mm]</label>
          <input
            id="id_SzerRekawa"
            name="SzerRekawa"
            value={form.SzerRekawa}
            onChange={handleChange}
            className="calc-input required"
            inputMode="decimal"
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_GrubWorka">GrubWorka [mikr]</label>
          <input
            id="id_GrubWorka"
            name="GrubWorka"
            value={form.GrubWorka}
            onChange={handleChange}
            className="calc-input required"
            inputMode="decimal"
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_DlugWorka">DługWorka [mm]</label>
          <input
            id="id_DlugWorka"
            value={formatWithSpaces(BAG_LENGTH_MM, 0)}
            className="calc-input auto"
            readOnly
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_gestosc">Gęstość</label>
          <input
            id="id_gestosc"
            value={DENSITY.toFixed(2)}
            className="calc-input auto"
            readOnly
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_waga1mb">Waga 1 mb [kg]</label>
          <input
            id="id_waga1mb"
            value={waga1mb === null ? '' : formatWithSpaces(waga1mb, 5)}
            className="calc-input auto"
            readOnly
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_wagaProdukcja">Waga produkcja [kg]</label>
          <input
            id="id_wagaProdukcja"
            name="WagaProdukcja"
            value={form.WagaProdukcja}
            onChange={handleChange}
            className="calc-input required"
            inputMode="decimal"
          />
        </div>

        <div className="calculator-row">
          <label htmlFor="id_IloscZlec">IlośćZlec [szt lub mb]</label>
          <input
            id="id_IloscZlec"
            value={iloscZlec === null ? '' : formatWithSpaces(iloscZlec, 2)}
            className="calc-input auto"
            readOnly
          />
        </div>

        <p className="calculator-hint">
          <strong>Podpowiedź:</strong> Waga 1 mb oblicza się na podstawie{' '}
          <strong>SzerRękawa</strong>, <strong>GrubWorka</strong> i opcji <strong>Taśma</strong>.{' '}
          <br />
          IlośćZlec oblicza się na podstawie <strong>Waga produkcja</strong> i{' '}
          <strong>Waga 1 mb</strong>.
        </p>

        <div className="calculator-actions-row">
          <button type="button" className="btn calculator-back-btn" onClick={() => navigate('/')}>
            Powrót
          </button>
          <button type="button" className="btn btn-outline" onClick={handleClear}>
            Wyczyść
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCreateOrder} disabled={iloscZlec === null}>
            Utwórz zlecenie
          </button>
        </div>
      </form>
    </section>
  );
}
