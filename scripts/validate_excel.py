"""
Utilities for validating and aligning Excel workbooks against a reference template.

Example:
    python scripts/validate_excel.py template.xlsx candidate.xlsx --align-output fixed.xlsx
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Optional

import argparse
import sys

import pandas as pd


@dataclass
class SheetReport:
    """Holds comparison information for a single worksheet."""

    name: str
    missing_columns: list[str] = field(default_factory=list)
    extra_columns: list[str] = field(default_factory=list)
    dtype_mismatches: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Return True when the sheet matches the template expectations."""
        return (
            not self.missing_columns and not self.extra_columns and not self.dtype_mismatches
        )


@dataclass
class ValidationReport:
    """Aggregates validation details for a workbook."""

    template_path: Path
    target_path: Path
    missing_sheets: list[str] = field(default_factory=list)
    extra_sheets: list[str] = field(default_factory=list)
    sheet_reports: list[SheetReport] = field(default_factory=list)
    aligned_output: Optional[Path] = None

    @property
    def is_valid(self) -> bool:
        """Return True when the workbook conforms to the template."""
        return (
            not self.missing_sheets
            and not self.extra_sheets
            and all(sheet.is_valid for sheet in self.sheet_reports)
        )

    def summarize(self) -> str:
        """Create a human readable summary for CLI usage."""
        lines: list[str] = [
            f"Template: {self.template_path}",
            f"Target:   {self.target_path}",
            "",
        ]
        if self.is_valid:
            lines.append("✅ Workbook matches the template.")
        else:
            lines.append("⚠️  Workbook differs from the template:")
            if self.missing_sheets:
                lines.append(f"  • Missing sheets: {', '.join(self.missing_sheets)}")
            if self.extra_sheets:
                lines.append(f"  • Unexpected sheets: {', '.join(self.extra_sheets)}")
            for report in self.sheet_reports:
                if report.is_valid:
                    continue
                lines.append(f"  • Sheet '{report.name}' issues:")
                if report.missing_columns:
                    lines.append(
                        f"     - Missing columns: {', '.join(report.missing_columns)}"
                    )
                if report.extra_columns:
                    lines.append(
                        f"     - Unexpected columns: {', '.join(report.extra_columns)}"
                    )
                if report.dtype_mismatches:
                    lines.append(
                        "     - Column type mismatches:"
                        f" {', '.join(report.dtype_mismatches)}"
                    )
        if self.aligned_output:
            lines.extend(
                [
                    "",
                    f"Aligned copy saved to {self.aligned_output}",
                ]
            )
        return "\n".join(lines)


def _load_excel(path: Path) -> pd.ExcelFile:
    """Load an Excel workbook, raising a descriptive error when the file is invalid."""
    try:
        return pd.ExcelFile(path)
    except ValueError as exc:
        raise ValueError(f"Unable to read Excel file '{path}': {exc}") from exc
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Excel file '{path}' does not exist.") from exc


def _read_header(excel: pd.ExcelFile, sheet_name: str) -> list[str]:
    """Read only the header row for the given sheet."""
    frame = excel.parse(sheet_name=sheet_name, nrows=0)
    return list(frame.columns)


def _read_full_sheet(excel: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
    """Read a full sheet to allow data type comparison."""
    return excel.parse(sheet_name=sheet_name)


def _compare_dtypes(
    template_frame: pd.DataFrame,
    target_frame: pd.DataFrame,
    columns: Iterable[str],
) -> list[str]:
    """Compare pandas dtypes and return formatted mismatch descriptions."""
    mismatches: list[str] = []
    for column in columns:
        if column not in template_frame.columns or column not in target_frame.columns:
            continue
        template_dtype = str(template_frame[column].dtype)
        target_dtype = str(target_frame[column].dtype)
        if template_dtype != target_dtype:
            mismatches.append(f"{column} (expected {template_dtype}, found {target_dtype})")
    return mismatches


def validate_excel(
    template_path: Path,
    target_path: Path,
    *,
    align_output: Optional[Path] = None,
) -> ValidationReport:
    """Validate `target_path` against `template_path` and optionally align it."""
    template_excel = _load_excel(template_path)
    target_excel = _load_excel(target_path)

    report = ValidationReport(template_path=template_path, target_path=target_path)

    template_sheets = set(template_excel.sheet_names)
    target_sheets = set(target_excel.sheet_names)

    report.missing_sheets = sorted(template_sheets - target_sheets)
    report.extra_sheets = sorted(target_sheets - template_sheets)

    shared_sheets = sorted(template_sheets & target_sheets)

    # Cache parsed frames for alignment and dtype checks.
    target_frames: dict[str, pd.DataFrame] = {}
    template_headers: dict[str, list[str]] = {}

    for sheet in shared_sheets:
        template_header = _read_header(template_excel, sheet)
        target_header = _read_header(target_excel, sheet)
        template_headers[sheet] = template_header

        missing_columns = [col for col in template_header if col not in target_header]
        extra_columns = [col for col in target_header if col not in template_header]

        template_frame = _read_full_sheet(template_excel, sheet)
        target_frame = _read_full_sheet(target_excel, sheet)

        target_frames[sheet] = target_frame

        dtype_columns = [col for col in template_header if col in target_header]
        dtype_mismatches = _compare_dtypes(template_frame, target_frame, dtype_columns)

        report.sheet_reports.append(
            SheetReport(
                name=sheet,
                missing_columns=missing_columns,
                extra_columns=extra_columns,
                dtype_mismatches=dtype_mismatches,
            )
        )

    if align_output:
        _create_aligned_copy(
            template_excel=template_excel,
            target_frames=target_frames,
            template_headers=template_headers,
            template_sheet_order=template_excel.sheet_names,
            output_path=align_output,
        )
        report.aligned_output = align_output

    return report


def _create_aligned_copy(
    *,
    template_excel: pd.ExcelFile,
    target_frames: dict[str, pd.DataFrame],
    template_headers: dict[str, list[str]],
    template_sheet_order: Iterable[str],
    output_path: Path,
) -> None:
    """Create a workbook that matches the template's sheet and column layout."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        for sheet in template_sheet_order:
            template_columns = template_headers.get(sheet)
            if template_columns is None:
                template_columns = _read_header(template_excel, sheet)
                template_headers[sheet] = template_columns
            frame = target_frames.get(sheet)
            if frame is None:
                aligned = pd.DataFrame(columns=template_columns)
            else:
                aligned = frame.reindex(columns=template_columns)
            aligned.to_excel(writer, sheet_name=sheet, index=False)


def build_cli_parser() -> argparse.ArgumentParser:
    """Build the argument parser for CLI usage."""
    parser = argparse.ArgumentParser(
        description=(
            "Validate an Excel workbook against a template and optionally create a corrected copy."
        )
    )
    parser.add_argument(
        "template",
        type=Path,
        help="Path to the reference Excel workbook that defines the expected structure.",
    )
    parser.add_argument(
        "target",
        type=Path,
        help="Path to the workbook that should be validated against the template.",
    )
    parser.add_argument(
        "--align-output",
        type=Path,
        default=None,
        help=(
            "When provided, save an aligned copy of the target workbook to this path. "
            "The aligned file will use the template's sheet and column order."
        ),
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    """Entrypoint used by the command line interface."""
    parser = build_cli_parser()
    args = parser.parse_args(argv)

    try:
        report = validate_excel(
            template_path=args.template,
            target_path=args.target,
            align_output=args.align_output,
        )
    except Exception as exc:  # noqa: BLE001 - show raw message to the user.
        parser.error(str(exc))
        return 2

    print(report.summarize())
    return 0 if report.is_valid else 1


if __name__ == "__main__":
    sys.exit(main())
