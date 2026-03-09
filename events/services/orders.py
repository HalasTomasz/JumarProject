"""Order workflow helpers shared by HTML and API views."""

from __future__ import annotations

from datetime import date
import re
from typing import Any, Mapping

from django.db import IntegrityError, transaction
from django.db.models import Max, QuerySet
from django.forms.models import model_to_dict
from django.utils.dateparse import parse_date

from events.models import DailyOrderCounter, OrderRollCounter, Rolki, Zamowienie


ORDER_SUFFIX_START = 1000


def _extract_order_suffix(number: str) -> int | None:
    match = re.search(r"/(\d+)$", str(number))
    if not match:
        return None
    return int(match.group(1))


def _get_max_order_suffix(date_prefix: str) -> int:
    prefix = f"{date_prefix}/"
    existing_numbers = Zamowienie.objects.filter(NrZp__startswith=prefix).values_list("NrZp", flat=True)

    max_suffix = ORDER_SUFFIX_START
    for number in existing_numbers:
        suffix = _extract_order_suffix(number)
        if suffix is None:
            continue
        max_suffix = max(max_suffix, suffix)
    return max_suffix


def _get_or_create_locked_daily_counter(date_prefix: str) -> DailyOrderCounter:
    while True:
        try:
            return DailyOrderCounter.objects.select_for_update().get(date_prefix=date_prefix)
        except DailyOrderCounter.DoesNotExist:
            try:
                with transaction.atomic():
                    return DailyOrderCounter.objects.create(
                        date_prefix=date_prefix,
                        last_value=_get_max_order_suffix(date_prefix),
                    )
            except IntegrityError:
                continue


def _get_or_create_locked_roll_counter(nr_zp: str) -> OrderRollCounter:
    while True:
        try:
            return OrderRollCounter.objects.select_for_update().get(NrZp=nr_zp)
        except OrderRollCounter.DoesNotExist:
            try:
                with transaction.atomic():
                    current_max = Rolki.objects.filter(NrZp=nr_zp).aggregate(max_roll=Max("Rolka")).get("max_roll") or 0
                    return OrderRollCounter.objects.create(NrZp=nr_zp, last_value=current_max)
            except IntegrityError:
                continue


def generate_next_order_number(current_date: date | None = None) -> str:
    """Build `NrZp` using a transaction-safe daily counter."""
    current_date = current_date or date.today()
    date_prefix = current_date.strftime("%Y%m%d")

    with transaction.atomic():
        counter = _get_or_create_locked_daily_counter(date_prefix)
        counter.last_value = max(counter.last_value, _get_max_order_suffix(date_prefix)) + 1
        counter.save(update_fields=["last_value"])
        return f"{date_prefix}/{counter.last_value}"


def get_next_roll_number(nr_zp: str) -> int:
    """Return the next sequential roll number for an order."""
    with transaction.atomic():
        counter = _get_or_create_locked_roll_counter(nr_zp)
        current_max = Rolki.objects.filter(NrZp=nr_zp).aggregate(max_roll=Max("Rolka")).get("max_roll") or 0
        counter.last_value = max(counter.last_value, current_max) + 1
        counter.save(update_fields=["last_value"])
        return counter.last_value


def build_order_copy_payload(order: Zamowienie) -> dict[str, Any]:
    """Prepare serializer-friendly payload for duplicating an order."""
    payload = model_to_dict(order)
    for field in ("id", "NrZp", "created_at", "updated_at", "created_by"):
        payload.pop(field, None)
    return payload


def apply_order_filters(
    queryset: QuerySet[Zamowienie],
    params: Mapping[str, Any],
) -> QuerySet[Zamowienie]:
    """Apply shared order list filters from request params."""
    status_value = params.get("status")
    search_term = params.get("q")
    date_from = parse_date(params.get("date_from") or "")
    date_to = parse_date(params.get("date_to") or "")

    if status_value not in (None, ""):
        status_text = str(status_value).strip()
        if status_text == str(Zamowienie.StatusChoices.ANULOWANE):
            queryset = queryset.filter(
                Status__in=[
                    Zamowienie.StatusChoices.ZREALIZOWANE,
                    Zamowienie.StatusChoices.ANULOWANE,
                ]
            )
        else:
            queryset = queryset.filter(Status=status_value)
    if search_term:
        queryset = queryset.filter(NrZp__icontains=search_term)
    if date_from:
        queryset = queryset.filter(Data__gte=date_from)
    if date_to:
        queryset = queryset.filter(Data__lte=date_to)

    return queryset


def can_change_order_status(order: Zamowienie, new_status: int) -> bool:
    """
    Prevent moving an order back to PLANOWANE after production rolls exist.
    """
    if new_status != Zamowienie.StatusChoices.PLANOWANE:
        return True
    return not Rolki.objects.filter(NrZp=order.NrZp).exists()
