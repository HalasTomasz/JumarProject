const DENSITY_FACTOR = 0.95;
const FOIL_LENGTH_MULTIPLIER_THRESHOLD = 10;

export function parseOrderNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFixedNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function resolveEffectiveFoilLength(baseLength, correctionValue) {
  const correction = parseOrderNumber(correctionValue);
  if (correction === null || correction <= 0) {
    return baseLength;
  }
  if (correction <= FOIL_LENGTH_MULTIPLIER_THRESHOLD) {
    return baseLength === null ? null : baseLength * correction;
  }
  return correction;
}

export function calculateOrderDerivedValues(order) {
  const szerRekawa = parseOrderNumber(order.SzerRekawa);
  const szerWorka = parseOrderNumber(order.SzerWorka);
  const iloscZlec = parseOrderNumber(order.IloscZlec);
  const dlugWorka = parseOrderNumber(order.DlugWorka);
  const grubWorka = parseOrderNumber(order.GrubWorka);
  const iloscRolek = parseOrderNumber(order.IloscRolekZlec);
  const dlugRolkiKorekta = parseOrderNumber(order.DlugRolkiZlec_Korekta);
  const foilPlanCorrection = parseOrderNumber(order.DlugFoilPlan_Korekta);
  const tasma = toBoolean(order.Tasma);

  const zakladka =
    szerRekawa !== null && szerWorka !== null ? toFixedNumber((szerRekawa - szerWorka) / 2) : null;
  const dlugFoliPlan =
    iloscZlec !== null && dlugWorka !== null ? toFixedNumber((iloscZlec * dlugWorka) / 1000) : null;
  const effectiveFoilLength = resolveEffectiveFoilLength(dlugFoliPlan, order.DlugFoilPlan_Korekta);

  let wagaFoliZlec = null;
  if (szerRekawa !== null && grubWorka !== null && effectiveFoilLength !== null) {
    const baseWeight =
      (szerRekawa / 1000) * (grubWorka / 1000) * effectiveFoilLength * 2 * DENSITY_FACTOR;
    wagaFoliZlec = toFixedNumber(tasma ? baseWeight / 2 : baseWeight);
  }

  const dlugRolkiPlan =
    effectiveFoilLength !== null && iloscRolek !== null ? toFixedNumber(effectiveFoilLength / iloscRolek) : null;
  const wagaRolkiZlec =
    wagaFoliZlec !== null && iloscRolek !== null ? toFixedNumber(wagaFoliZlec / iloscRolek) : null;

  let dlugFoliZlecKorekta = null;
  if (dlugRolkiKorekta !== null && iloscRolek !== null) {
    dlugFoliZlecKorekta = toFixedNumber(dlugRolkiKorekta * iloscRolek);
  } else if (foilPlanCorrection !== null && foilPlanCorrection > 0 && effectiveFoilLength !== null) {
    dlugFoliZlecKorekta = toFixedNumber(effectiveFoilLength);
  }

  return {
    ...order,
    Zakladka: zakladka,
    DlugFoliPlan: dlugFoliPlan,
    WagaFoliZlec: wagaFoliZlec,
    DlugRolkiPlan: dlugRolkiPlan,
    DlugFoliZlec_Korekta: dlugFoliZlecKorekta,
    WagaRolkiZlec: wagaRolkiZlec,
  };
}
