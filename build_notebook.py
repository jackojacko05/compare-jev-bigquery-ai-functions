import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def markdown(source: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": source.splitlines(True)}


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(True),
    }


cells = [
    markdown("""# Jev vs Gemini from BigQuery

## tl;dr

- Jev: 85.5% accuracy, $0.00788 theoretical model cost for 200 rows.
- Gemini 2.5 Flash-Lite on the same Vercel AI Gateway path: 86.0%, $0.01554.
- Jev p50 latency is 545ms versus 1,950ms for Flash-Lite, about 3.6× faster.
- Gemini 3.1 Pro Preview: 88.5%, $0.55055.
- A broad Pro rerank of similar labels did not improve cost-effectiveness.

This executed notebook is the auditable companion to the article. It contains aggregate results only, not Stack Overflow question text or credentials."""),
    markdown("""## Context & Methods

### Key assumptions

- Source table: [`bigquery-public-data.stackoverflow.posts_questions`](https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=stackoverflow&t=posts_questions&page=table).
- The top-20, single-tag task follows [Google Cloud's Keras example](https://cloud.google.com/blog/products/gcp/intro-to-text-classification-with-keras-automatically-tagging-stack-overflow-posts).
- The evaluation set has 20 tags × 10 questions, selected deterministically.
- Primary runs use the same route: BigQuery → Remote Function → Cloud Run → Vercel AI Gateway.
- Models receive the same question text, instruction, candidate names, and candidate descriptions. API-specific structured-output wrappers necessarily differ.
- Cost is observed tokens × public model price. Infrastructure, failed calls, retries, and credits are excluded."""),
    markdown("""## Data

Question text is intentionally not redistributed. `sql/01_prepare_stackoverflow.sql` rebuilds the evaluation set from the public BigQuery table. The notebook analyzes the committed aggregate result file."""),
    code("""from pathlib import Path
import pandas as pd

repo_root = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
summary_path = repo_root / "results" / "summary.csv"
results = pd.read_csv(summary_path)
performance = pd.read_csv(repo_root / "results" / "performance.csv")
results[["method", "accuracy", "correct", "total", "theoretical_model_cost_usd"]].tail(10)"""),
    markdown("""## Results

The primary table below keeps only the gateway-equalized baseline models, latest Pro, and the two Pro rerank pipelines."""),
    code("""primary_methods = [
    "Jev baseline",
    "Gemini 2.5 Flash-Lite via Vercel AI Gateway",
    "Jev + Gemini 3.1 Pro rerank",
    "Gemini 2.5 Flash-Lite via Gateway + Gemini 3.1 Pro rerank",
    "Gemini 3.1 Pro full",
]

primary = (
    results[results["method"].isin(primary_methods)]
    .assign(
        accuracy_pct=lambda frame: frame["accuracy"] * 100,
        cost_per_1000_usd=lambda frame: frame["theoretical_model_cost_usd"] * 5,
    )
    [["method", "accuracy_pct", "correct", "total", "theoretical_model_cost_usd", "cost_per_1000_usd"]]
    .sort_values("theoretical_model_cost_usd")
)
primary"""),
    code("""import matplotlib.pyplot as plt

plt.style.use("seaborn-v0_8-whitegrid")
colors = ["#0F766E" if "Jev baseline" == name else "#2563EB" for name in primary["method"]]
fig, ax = plt.subplots(figsize=(10, 5.5))
ax.scatter(primary["cost_per_1000_usd"], primary["accuracy_pct"], s=85, c=colors)
for row in primary.itertuples():
    ax.annotate(
        row.method,
        (row.cost_per_1000_usd, row.accuracy_pct),
        xytext=(7, 5),
        textcoords="offset points",
        fontsize=8,
    )
ax.set_xscale("log")
ax.set_title("Accuracy vs theoretical model cost — 200-row Stack Overflow pilot")
ax.set_xlabel("Theoretical model cost per 1,000 rows (USD, log scale)")
ax.set_ylabel("Accuracy (%)")
ax.set_ylim(83.5, 90)
fig.tight_layout()
plt.show()"""),
    code("""speed = performance[performance["method"].isin([
    "Jev baseline",
    "Gemini 2.5 Flash-Lite via Vercel AI Gateway",
    "Gemini 3.1 Pro full",
])]

fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
axes[0].bar(speed["method"], speed["p50_latency_ms"], color=["#0F766E", "#2563EB", "#7C3AED"])
axes[0].set_title("Per-row median latency")
axes[0].set_ylabel("Milliseconds")
axes[0].tick_params(axis="x", rotation=25, labelsize=8)

axes[1].bar(speed["method"], speed["bigquery_job_seconds"], color=["#0F766E", "#2563EB", "#7C3AED"])
axes[1].set_title("BigQuery job wall time")
axes[1].set_ylabel("Seconds")
axes[1].tick_params(axis="x", rotation=25, labelsize=8)
fig.tight_layout()
plt.show()"""),
    markdown("""### Interpretation

Jev and Gemini 2.5 Flash-Lite differ by one correct answer in 200 rows, while Jev's theoretical model cost is about half and its p50 latency is about 3.6× faster. Gemini 3.1 Pro is the most accurate, but its cost is about 70× Jev's for this prompt. The broad rerank rule sends 144–147 rows to Pro and sometimes replaces correct first-stage answers with wrong ones."""),
    markdown("""## Checks"""),
    code("""assert set(primary_methods) == set(primary["method"])
assert len(primary) == 5
assert (primary["total"] == 200).all()
assert primary["accuracy_pct"].between(0, 100).all()
assert primary["theoretical_model_cost_usd"].gt(0).all()

jev = primary.loc[primary["method"] == "Jev baseline"].iloc[0]
flash_lite = primary.loc[primary["method"] == "Gemini 2.5 Flash-Lite via Vercel AI Gateway"].iloc[0]
pro = primary.loc[primary["method"] == "Gemini 3.1 Pro full"].iloc[0]

checks = {
    "Jev correct": int(jev["correct"]),
    "Gateway Flash-Lite correct": int(flash_lite["correct"]),
    "Pro correct": int(pro["correct"]),
    "Jev cost reduction vs Gateway Flash-Lite": 1 - jev["theoretical_model_cost_usd"] / flash_lite["theoretical_model_cost_usd"],
    "Pro / Jev cost multiple": pro["theoretical_model_cost_usd"] / jev["theoretical_model_cost_usd"],
}
checks"""),
    markdown("""## Takeaways

For this closed 20-label task, Jev nearly matches Gemini 2.5 Flash-Lite at materially lower model cost. Pro improves the result by only a few questions and a broad two-stage rule is not selective enough. The practical lesson is to test the full execution path—including retries and per-row prompt repetition—before scaling a SQL proof of concept to hundreds of thousands of rows.

This is a 200-row pilot. Stack Overflow tags are observed user labels, not objective ground truth, and model prices can change."""),
]

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3"},
        "colab": {"name": "benchmark.ipynb", "provenance": []},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

target = ROOT / "notebooks" / "benchmark.ipynb"
target.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(target)
