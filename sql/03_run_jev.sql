INSERT INTO `YOUR_PROJECT_ID.jev_benchmark.so20_results`
WITH inferred AS (
  SELECT
    *,
    `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_jev_variant`(
      '',
      text_raw,
      'so20_jev_fair_e2e_200_20260920_03',
      CAST(question_id AS STRING),
      'official_criteria',
      ''
    ) AS prediction
  FROM `YOUR_PROJECT_ID.jev_benchmark.so20_pilot200`
)
SELECT
  'so20_jev_fair_e2e_200_20260920_03' AS run_id,
  'typesafe-ai/jev' AS model,
  'gateway_full_20class_official_criteria' AS variant,
  question_id,
  label AS actual_label,
  JSON_VALUE(prediction, '$.label') AS predicted_label,
  SAFE_CAST(JSON_VALUE(prediction, '$.confidence') AS FLOAT64) AS confidence,
  SAFE_CAST(JSON_VALUE(prediction, '$.input_tokens') AS INT64) AS input_tokens,
  SAFE_CAST(JSON_VALUE(prediction, '$.output_tokens') AS INT64) AS output_tokens,
  SAFE_CAST(JSON_VALUE(prediction, '$.gateway_cost_usd') AS NUMERIC) AS provider_cost_usd,
  SAFE_CAST(JSON_VALUE(prediction, '$.latency_ms') AS INT64) AS latency_ms,
  JSON_VALUE(prediction, '$.generation_id') AS generation_id,
  JSON_VALUE(prediction, '$.error') AS error,
  text_raw_sha256 AS text_sha256,
  CURRENT_TIMESTAMP() AS processed_at
FROM inferred;
