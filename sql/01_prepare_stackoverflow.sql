CREATE OR REPLACE TABLE `YOUR_PROJECT_ID.jev_benchmark.so20_pool`
OPTIONS (
  description = 'Deterministic 20-class Stack Overflow benchmark based on the Google Cloud 2017 example'
)
AS
WITH ranked AS (
  SELECT
    id AS question_id,
    tags AS label,
    title,
    body,
    creation_date,
    ROW_NUMBER() OVER (
      PARTITION BY tags
      ORDER BY FARM_FINGERPRINT(CAST(id AS STRING)), id
    ) AS class_rank
  FROM `bigquery-public-data.stackoverflow.posts_questions`
  WHERE tags IN (
    'javascript', 'java', 'c#', 'php', 'android',
    'jquery', 'python', 'html', 'c++', 'ios',
    'css', 'mysql', 'sql', 'asp.net', 'ruby-on-rails',
    'objective-c', 'c', '.net', 'angularjs', 'iphone'
  )
)
SELECT
  question_id,
  label,
  title,
  body,
  creation_date,
  class_rank,
  IF(class_rank <= 1600, 'train', 'test') AS split,
  REGEXP_REPLACE(
    REGEXP_REPLACE(CONCAT(IFNULL(title, ''), '\n', IFNULL(body, '')), r'<[^>]+>', ' '),
    r'\s+',
    ' '
  ) AS text_raw
FROM ranked
WHERE class_rank <= 2000;

CREATE OR REPLACE TABLE `YOUR_PROJECT_ID.jev_benchmark.so20_eval`
OPTIONS (
  description = '2,000-row deterministic evaluation sample: 100 rows per Stack Overflow tag'
)
AS
SELECT
  question_id,
  label,
  title,
  body,
  creation_date,
  class_rank,
  LEFT(text_raw, 4000) AS text_raw,
  TO_HEX(SHA256(LEFT(text_raw, 4000))) AS text_raw_sha256
FROM `YOUR_PROJECT_ID.jev_benchmark.so20_pool`
WHERE split = 'test'
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY label
  ORDER BY FARM_FINGERPRINT(CONCAT(CAST(question_id AS STRING), ':eval-v1')), question_id
) <= 100;

SELECT
  COUNT(*) AS pool_rows,
  COUNT(DISTINCT label) AS labels,
  COUNTIF(split = 'train') AS train_rows,
  COUNTIF(split = 'test') AS test_rows
FROM `YOUR_PROJECT_ID.jev_benchmark.so20_pool`;

SELECT
  COUNT(*) AS eval_rows,
  COUNT(DISTINCT label) AS labels,
  MIN(rows_per_label) AS min_rows_per_label,
  MAX(rows_per_label) AS max_rows_per_label,
  COUNT(DISTINCT question_id) AS unique_questions
FROM (
  SELECT
    *,
    COUNT(*) OVER (PARTITION BY label) AS rows_per_label
  FROM `YOUR_PROJECT_ID.jev_benchmark.so20_eval`
);

CREATE OR REPLACE TABLE `YOUR_PROJECT_ID.jev_benchmark.so20_pilot200`
OPTIONS (
  description = 'Fixed 200-row pilot materialized before external inference'
)
AS
SELECT *
FROM `YOUR_PROJECT_ID.jev_benchmark.so20_eval`
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY label
  ORDER BY FARM_FINGERPRINT(CONCAT(CAST(question_id AS STRING), ':pilot200-v1')), question_id
) <= 10;

CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.jev_benchmark.so20_results` (
  run_id STRING,
  model STRING,
  variant STRING,
  question_id INT64,
  actual_label STRING,
  predicted_label STRING,
  confidence FLOAT64,
  input_tokens INT64,
  output_tokens INT64,
  provider_cost_usd NUMERIC,
  latency_ms INT64,
  generation_id STRING,
  error STRING,
  text_sha256 STRING,
  processed_at TIMESTAMP
)
PARTITION BY DATE(processed_at)
CLUSTER BY run_id, model, variant, actual_label;
