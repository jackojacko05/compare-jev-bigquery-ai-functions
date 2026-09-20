# compare-jev-bigquery-ai-functions

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/jackojacko05/compare-jev-bigquery-ai-functions/blob/main/notebooks/benchmark.ipynb)

Reproducible companion repository for comparing Jev and Gemini on a bounded text-classification task orchestrated from BigQuery.

All primary model runs use the same execution path:

```text
BigQuery → Remote Function → Cloud Run → Vercel AI Gateway → model
```

The benchmark uses the BigQuery public Stack Overflow table
[`bigquery-public-data.stackoverflow.posts_questions`](https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=stackoverflow&t=posts_questions&page=table).
The 20-label, single-tag setup follows Google Cloud's
[Stack Overflow text-classification example](https://cloud.google.com/blog/products/gcp/intro-to-text-classification-with-keras-automatically-tagging-stack-overflow-posts).

## Pilot results

| Model / pipeline | Accuracy | Correct | p50 latency | BQ job | Theoretical model cost / 200 |
|---|---:|---:|---:|---:|---:|
| Jev | 85.5% | 171/200 | 545ms | 3.753s | $0.00788164 |
| Gemini 2.5 Flash-Lite via Vercel AI Gateway | 86.0% | 172/200 | 1,950ms | 9.483s | $0.01553910 |
| Jev → Gemini 3.1 Pro rerank | 86.0% | 172/200 | — | — | $0.27512564 |
| Gemini 2.5 Flash-Lite → Gemini 3.1 Pro rerank | 84.5% | 169/200 | — | — | $0.27677910 |
| Gemini 3.1 Pro Preview | **88.5%** | **177/200** | 2,853ms | 135.297s | $0.55055400 |

The rerank rows omit latency because their wall time combines a persisted first-stage run with a separate second-stage job.

Costs are calculated from observed tokens and the public prices at experiment time. They exclude BigQuery, Cloud Run, networking, Secret Manager, credits, failed attempts, and retries. The sample is a 200-row pilot, not a general model ranking.

## Data

- Source: [BigQuery Public Datasets](https://docs.cloud.google.com/bigquery/public-data)
- Dataset: [`bigquery-public-data.stackoverflow`](https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=stackoverflow&page=dataset)
- Table: [`posts_questions`](https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=stackoverflow&t=posts_questions&page=table)
- Fields used: `id`, `title`, `body`, `tags`
- Population: questions carrying exactly one of the selected 20 tags
- Sample: 10 questions per tag, selected deterministically with `FARM_FINGERPRINT`
- Input: title plus question text, truncated to the documented limit

Question text is not committed to this repository. Rebuild the sample from the public table with [`sql/01_prepare_stackoverflow.sql`](sql/01_prepare_stackoverflow.sql). Review [Stack Overflow content licensing](https://stackoverflow.com/help/licensing) before redistributing content.

## Repository layout

```text
cloud-run/                 Vercel AI Gateway adapter used by BigQuery Remote Functions
notebooks/benchmark.ipynb  Executed analysis notebook, also usable in Colab
results/summary.csv        Published aggregate results
results/performance.csv    Comparable latency and BigQuery job measurements
sql/                       Dataset preparation and benchmark queries
```

## Reproduce the analysis notebook

The saved notebook reads only `results/summary.csv`, so it runs without cloud credentials:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter nbconvert --execute --to notebook --inplace notebooks/benchmark.ipynb
```

For live model calls, replace `YOUR_PROJECT_ID` and `YOUR_CLOUD_RUN_URL` in the SQL files, deploy `cloud-run/`, and create the BigQuery connection and Remote Functions. Keep the Vercel credential in Google Secret Manager; never add it to the notebook or repository.

## Important operational caveats

- Repeated instructions and label criteria count toward input tokens for every row.
- A trailing `LIMIT 1` does not guarantee that a Remote Function is called only once. Materialize the one-row input first.
- BigQuery can retry Remote Functions, so external inference must be treated as at-least-once execution.
- Persist results and use a run ID to avoid paying again for already completed rows.
- BigQuery-native `AI.GENERATE` results are retained in the CSV as reference runs but are not part of the primary gateway-equalized comparison.

## Security

- No API keys or question bodies are committed.
- `.env.example` contains names only.
- The Cloud Run service reads `AI_GATEWAY_API_KEY` from its runtime environment; use a Secret Manager reference in deployment configuration.

## Sources

- [Jev on Vercel AI Gateway](https://vercel.com/ai-gateway/models/jev)
- [Gemini 2.5 Flash-Lite on Vercel AI Gateway](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite)
- [Gemini 3.1 Pro Preview on Vercel AI Gateway](https://vercel.com/ai-gateway/models/gemini-3.1-pro-preview)
- [BigQuery `AI.GENERATE`](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-ai-generate)
- [BigQuery Remote Functions](https://docs.cloud.google.com/bigquery/docs/remote-functions)

## License

Repository code is licensed under MIT. Stack Overflow content is not included and remains subject to its own license.
