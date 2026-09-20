DECLARE source_run STRING DEFAULT @source_run;
DECLARE target_run STRING DEFAULT @target_run;
DECLARE experiment STRING DEFAULT @experiment;

IF experiment = 'rerank' THEN
  INSERT INTO `YOUR_PROJECT_ID.jev_benchmark.so20_results`
  WITH source AS (
    SELECT
      r.question_id,
      r.actual_label,
      r.predicted_label AS first_label,
      e.title,
      e.text_raw,
      e.text_raw_sha256
    FROM `YOUR_PROJECT_ID.jev_benchmark.so20_results` r
    JOIN `YOUR_PROJECT_ID.jev_benchmark.so20_pilot200` e USING (question_id)
    WHERE r.run_id = source_run
      AND r.predicted_label IN (
        'ios', 'iphone', 'objective-c', '.net', 'c#', 'asp.net',
        'javascript', 'jquery', 'angularjs', 'html', 'css',
        'sql', 'mysql', 'c', 'c++'
      )
  ), inferred AS (
    SELECT
      *,
      `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_pro_rerank`(
        '', text_raw, first_label, target_run, CAST(question_id AS STRING)
      ) AS prediction
    FROM source
  )
  SELECT
    target_run AS run_id,
    JSON_VALUE(prediction, '$.model') AS model,
    CONCAT('pro_rerank_from:', source_run) AS variant,
    question_id,
    actual_label,
    JSON_VALUE(prediction, '$.label') AS predicted_label,
    CAST(NULL AS FLOAT64) AS confidence,
    SAFE_CAST(JSON_VALUE(prediction, '$.input_tokens') AS INT64) AS input_tokens,
    SAFE_CAST(JSON_VALUE(prediction, '$.output_tokens') AS INT64) AS output_tokens,
    SAFE_CAST(JSON_VALUE(prediction, '$.gateway_cost_usd') AS NUMERIC) AS provider_cost_usd,
    SAFE_CAST(JSON_VALUE(prediction, '$.latency_ms') AS INT64) AS latency_ms,
    JSON_VALUE(prediction, '$.generation_id') AS generation_id,
    JSON_VALUE(prediction, '$.error') AS error,
    text_raw_sha256 AS text_sha256,
    CURRENT_TIMESTAMP() AS processed_at
  FROM inferred;
ELSEIF experiment = 'full' THEN
  INSERT INTO `YOUR_PROJECT_ID.jev_benchmark.so20_results`
  WITH inferred AS (
    SELECT
      *,
      `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_pro_full`(
        '', text_raw, target_run, CAST(question_id AS STRING)
      ) AS prediction
    FROM `YOUR_PROJECT_ID.jev_benchmark.so20_pilot200`
  )
  SELECT
    target_run AS run_id,
    JSON_VALUE(prediction, '$.model') AS model,
    'full_20class_official_criteria' AS variant,
    question_id,
    label AS actual_label,
    JSON_VALUE(prediction, '$.label') AS predicted_label,
    CAST(NULL AS FLOAT64) AS confidence,
    SAFE_CAST(JSON_VALUE(prediction, '$.input_tokens') AS INT64) AS input_tokens,
    SAFE_CAST(JSON_VALUE(prediction, '$.output_tokens') AS INT64) AS output_tokens,
    SAFE_CAST(JSON_VALUE(prediction, '$.gateway_cost_usd') AS NUMERIC) AS provider_cost_usd,
    SAFE_CAST(JSON_VALUE(prediction, '$.latency_ms') AS INT64) AS latency_ms,
    JSON_VALUE(prediction, '$.generation_id') AS generation_id,
    JSON_VALUE(prediction, '$.error') AS error,
    text_raw_sha256 AS text_sha256,
    CURRENT_TIMESTAMP() AS processed_at
  FROM inferred;
ELSE
  RAISE USING MESSAGE = 'experiment must be rerank or full';
END IF;
