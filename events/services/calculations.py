"""Computation helpers for order planning and production summaries."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Iterable, Mapping, TYPE_CHECKING

from django.db.models import Avg, Count, Sum

if TYPE_CHECKING:
    from events.models import Zamowienie


THOUSAND = Decimal("1000")
DENSITY_FACTOR = Decimal("0.95")
FOIL_LENGTH_MULTIPLIER_THRESHOLD = Decimal("10")


def _to_decimal(value: Any) -> Decimal | None:
    """Safely convert mixed inputs (str/int/Decimal) into Decimal."""
    if value in (None, ""):
        return None
    if isinstance(value, str):
        value = value.replace(" ", "")
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _safe_divide(numerator: Decimal | None, denominator: Decimal | None) -> Decimal | None:
    if numerator is None or denominator in (None, Decimal("0")):
        return None
    return numerator / denominator


def _resolve_effective_foil_length(
    base_length: Decimal | None,
    correction_value: Any,
) -> Decimal | None:
    """
    Resolve the effective foil length from the manual correction input.

    New data stores the corrected total length in `DlugFoilPlan_Korekta` (mb), while some
    older records used `1` / `1.02`-style multipliers. Support both so edited legacy orders
    do not regress.
    """
    correction = _to_decimal(correction_value)
    if correction is None or correction <= 0:
        return base_length
    if correction <= FOIL_LENGTH_MULTIPLIER_THRESHOLD:
        if base_length is None:
            return None
        return base_length * correction
    return correction


def _build_order_calculations(values: Mapping[str, Any]) -> dict[str, Decimal | None]:
    """Calculate all derived order fields from base inputs."""
    szer_rekawa = _to_decimal(values.get("SzerRekawa"))
    szer_worka = _to_decimal(values.get("SzerWorka"))
    ilosc_zlec = _to_decimal(values.get("IloscZlec"))
    dlug_worka = _to_decimal(values.get("DlugWorka"))
    grub_worka = _to_decimal(values.get("GrubWorka"))
    dlug_foil_plan_korekta = values.get("DlugFoilPlan_Korekta")
    foil_plan_correction = _to_decimal(dlug_foil_plan_korekta)
    ilosc_rolek = _to_decimal(values.get("IloscRolekZlec"))
    dlug_rolki_korekta = _to_decimal(values.get("DlugRolkiZlec_Korekta"))
    tasma = bool(values.get("Tasma"))

    zakladka = None
    if szer_rekawa is not None and szer_worka is not None:
        zakladka = (szer_rekawa - szer_worka) / Decimal("2")

    dlug_foli_plan = None
    if ilosc_zlec is not None and dlug_worka is not None:
        dlug_foli_plan = (ilosc_zlec / THOUSAND) * dlug_worka
    effective_foil_length = _resolve_effective_foil_length(dlug_foli_plan, dlug_foil_plan_korekta)

    waga_foli_zlec = None
    if szer_rekawa is not None and grub_worka is not None and effective_foil_length is not None:
        base_weight = (
            (szer_rekawa / THOUSAND)
            * (grub_worka / THOUSAND)
            * effective_foil_length
            * Decimal("2")
            * DENSITY_FACTOR
        )
        waga_foli_zlec = base_weight / Decimal("2") if tasma else base_weight

    waga_rolki_zlec = _safe_divide(waga_foli_zlec, ilosc_rolek)
    dlug_rolki_plan = _safe_divide(effective_foil_length, ilosc_rolek)

    dlug_foli_zlec_korekta = None
    if dlug_rolki_korekta is not None and ilosc_rolek is not None:
        dlug_foli_zlec_korekta = dlug_rolki_korekta * ilosc_rolek
    elif effective_foil_length is not None and foil_plan_correction is not None and foil_plan_correction > 0:
        dlug_foli_zlec_korekta = effective_foil_length

    return {
        "Zakladka": zakladka,
        "DlugFoliPlan": dlug_foli_plan,
        "WagaFoliZlec": waga_foli_zlec,
        "WagaRolkiZlec": waga_rolki_zlec,
        "DlugRolkiPlan": dlug_rolki_plan,
        "DlugFoliZlec_Korekta": dlug_foli_zlec_korekta,
    }


def apply_order_calculations(order: "Zamowienie") -> None:
    """Populate model fields so persistence logic stays in one place."""
    calculated = _build_order_calculations(
        {
            "SzerRekawa": order.SzerRekawa,
            "SzerWorka": order.SzerWorka,
            "IloscZlec": order.IloscZlec,
            "DlugWorka": order.DlugWorka,
            "GrubWorka": order.GrubWorka,
            "DlugFoilPlan_Korekta": order.DlugFoilPlan_Korekta,
            "IloscRolekZlec": order.IloscRolekZlec,
            "DlugRolkiZlec_Korekta": order.DlugRolkiZlec_Korekta,
            "Tasma": order.Tasma,
        }
    )
    for field, value in calculated.items():
        setattr(order, field, value)


def calculate_foil_parameters(data: Mapping[str, Any]) -> dict[str, Any]:
    """Return calculator payload with computed values used by forms and API."""
    result = dict(data)
    calculated = _build_order_calculations(data)

    result["Zakladka"] = float(calculated["Zakladka"] or Decimal("0"))
    result["DlugFoliPlan"] = float(calculated["DlugFoliPlan"] or Decimal("0"))
    result["WagaFoliZlec"] = float(calculated["WagaFoliZlec"] or Decimal("0"))
    return result


def _build_missing_order_stats() -> dict[str, Any]:
    return {
        "error": "Order not found",
        "weight_produced": 0,
        "weight_remaining": 0,
        "length_produced": 0,
        "length_remaining": 0,
        "rolls_produced": 0,
        "rolls_remaining": 0,
        "progress_percent": 0,
        "avg_weight_per_roll": 0,
        "avg_length_per_roll": 0,
        "status": "Error",
    }


def _build_production_stats_payload(order: "Zamowienie", stats: Mapping[str, Any] | None) -> dict[str, Any]:
    target_weight = _to_decimal(order.WagaFoliZlec) or Decimal("0")
    target_length = (
        _to_decimal(order.DlugFoliZlec_Korekta)
        or _resolve_effective_foil_length(_to_decimal(order.DlugFoliPlan), order.DlugFoilPlan_Korekta)
        or _to_decimal(order.DlugFoliPlan)
        or Decimal("0")
    )
    target_rolls = int(_to_decimal(order.IloscRolekZlec) or Decimal("0"))

    if not stats or not stats.get("roll_count"):
        return {
            "weight_produced": 0,
            "weight_remaining": float(target_weight),
            "length_produced": 0,
            "length_remaining": float(target_length),
            "rolls_produced": 0,
            "rolls_remaining": max(target_rolls, 0),
            "progress_percent": 0,
            "avg_weight_per_roll": 0,
            "avg_length_per_roll": 0,
            "status": "Not started",
        }

    weight_produced = _to_decimal(stats["total_weight"]) or Decimal("0")
    length_produced = _to_decimal(stats["total_length"]) or Decimal("0")
    rolls_produced = int(stats["roll_count"] or 0)

    weight_remaining = max(target_weight - weight_produced, Decimal("0"))
    length_remaining = max(target_length - length_produced, Decimal("0"))
    rolls_remaining = max(target_rolls - rolls_produced, 0)

    progress_percent = Decimal("0")
    if target_length > 0:
        progress_percent = (length_produced / target_length) * Decimal("100")
    elif target_weight > 0:
        progress_percent = (weight_produced / target_weight) * Decimal("100")

    return {
        "weight_produced": float(weight_produced),
        "weight_remaining": float(weight_remaining),
        "length_produced": float(length_produced),
        "length_remaining": float(length_remaining),
        "rolls_produced": rolls_produced,
        "rolls_remaining": rolls_remaining,
        "progress_percent": round(float(progress_percent), 2),
        "avg_weight_per_roll": float(_to_decimal(stats["avg_weight"]) or Decimal("0")),
        "avg_length_per_roll": float(_to_decimal(stats["avg_length"]) or Decimal("0")),
        "status": "Completed" if progress_percent >= 100 else "In progress",
    }


def calculate_production_stats_batch(order_numbers: Iterable[str]) -> dict[str, dict[str, Any]]:
    """Aggregate production metrics for many order identifiers in one query set."""
    from events.models import Rolki, Zamowienie

    normalized_order_numbers: list[str] = []
    seen_order_numbers: set[str] = set()
    for value in order_numbers:
        nr_zp = str(value).strip()
        if nr_zp and nr_zp not in seen_order_numbers:
            normalized_order_numbers.append(nr_zp)
            seen_order_numbers.add(nr_zp)

    if not normalized_order_numbers:
        return {}

    orders = Zamowienie.objects.filter(NrZp__in=normalized_order_numbers)
    order_map = {order.NrZp: order for order in orders}
    roll_stats_map = {
        row["order_id"]: row
        for row in Rolki.objects.filter(order_id__in=normalized_order_numbers)
        .values("order_id")
        .annotate(
            total_weight=Sum("WagaRolkiProd"),
            total_length=Sum("DlugRolkiProd"),
            roll_count=Count("Rolka"),
            avg_weight=Avg("WagaRolkiProd"),
            avg_length=Avg("DlugRolkiProd"),
        )
    }

    return {
        nr_zp: (
            _build_production_stats_payload(order_map[nr_zp], roll_stats_map.get(nr_zp))
            if nr_zp in order_map
            else _build_missing_order_stats()
        )
        for nr_zp in normalized_order_numbers
    }


def calculate_production_stats(nr_zp: str) -> dict[str, Any]:
    """Aggregate production metrics for one order identifier."""
    return calculate_production_stats_batch([nr_zp]).get(nr_zp, _build_missing_order_stats())
