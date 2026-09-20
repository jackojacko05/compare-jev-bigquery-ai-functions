"""Validate the canonical Colab notebook and synchronize its repository copy."""

from copy import deepcopy
from pathlib import Path

import nbformat


ROOT = Path(__file__).resolve().parent
CANONICAL = ROOT / "compare-jev-bigquery-ai-functions.ipynb"
COPY = ROOT / "notebooks" / "benchmark.ipynb"

notebook = nbformat.read(CANONICAL, as_version=4)
nbformat.validate(notebook)

assert len(notebook.cells) == 13
assert sum(cell.cell_type == "code" for cell in notebook.cells) == 4
assert any("go.Heatmap" in cell.source for cell in notebook.cells if cell.cell_type == "code")
assert any("要約 / tl;dr" in cell.source for cell in notebook.cells if cell.cell_type == "markdown")

nbformat.write(deepcopy(notebook), COPY)
print(f"Validated {CANONICAL}")
print(f"Synchronized {COPY}")
