const FOIL_CORRECTION_MULTIPLIER_THRESHOLD = 10;
const NO_OP_MULTIPLIER = 1;

const parseNumeric = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const getFoilCorrectionLength = (order) => {
  if (!order) {
    return null;
  }

  const rollBasedCorrection = parseNumeric(order.DlugFoliZlec_Korekta);
  if (rollBasedCorrection !== null && rollBasedCorrection > 0) {
    return rollBasedCorrection;
  }

  const foilCorrection = parseNumeric(order.DlugFoilPlan_Korekta);
  if (foilCorrection === null || foilCorrection <= 0) {
    return null;
  }

  if (foilCorrection <= FOIL_CORRECTION_MULTIPLIER_THRESHOLD) {
    if (Math.abs(foilCorrection - NO_OP_MULTIPLIER) < Number.EPSILON) {
      return null;
    }

    const plannedLength = parseNumeric(order.DlugFoliPlan);
    if (plannedLength === null || plannedLength <= 0) {
      return null;
    }

    return plannedLength * foilCorrection;
  }

  return foilCorrection;
};

export const getEffectivePlannedLength = (order) => {
  const correctedLength = getFoilCorrectionLength(order);
  if (correctedLength !== null) {
    return correctedLength;
  }

  const plannedLength = parseNumeric(order?.DlugFoliPlan);
  if (plannedLength !== null && plannedLength > 0) {
    return plannedLength;
  }

  return null;
};
