"""Validate the canonical Colab notebook and synchronize its repository copy."""

from copy import deepcopy
from pathlib import Path

import nbformat


ROOT = Path(__file__).resolve().parent
CANONICAL = ROOT / "compare-jev-bigquery-ai-functions.ipynb"
COPY = ROOT / "notebooks" / "benchmark.ipynb"

notebook = nbformat.read(CANONICAL, as_version=4)
nbformat.validate(notebook)

assert len(notebook.cells) >= 20
assert sum(cell.cell_type == "code" for cell in notebook.cells) >= 9
assert any("go.Scatter" in cell.source for cell in notebook.cells if cell.cell_type == "code")
assert any("要約 / tl;dr" in cell.source for cell in notebook.cells if cell.cell_type == "markdown")
assert any("End-to-end live reproduction" in cell.source for cell in notebook.cells if cell.cell_type == "markdown")
assert any("VERCEL_AI_GATEWAY_API_KEY" in cell.source for cell in notebook.cells)
assert any("Repository files" in cell.source for cell in notebook.cells if cell.cell_type == "markdown")

nbformat.write(deepcopy(notebook), COPY)
print(f"Validated {CANONICAL}")
print(f"Synchronized {COPY}")
