CREATE OR REPLACE FUNCTION `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_with_jev`(
  title STRING,
  body STRING,
  run_id STRING,
  item_id STRING
)
RETURNS JSON
REMOTE WITH CONNECTION `YOUR_PROJECT_ID.us.jev_remote_connection`
OPTIONS (
  endpoint = 'https://YOUR_CLOUD_RUN_URL/stackoverflow',
  max_batching_rows = 5
);

CREATE OR REPLACE FUNCTION `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_jev_variant`(
  title STRING,
  body STRING,
  run_id STRING,
  item_id STRING,
  variant STRING,
  first_label STRING
)
RETURNS JSON
REMOTE WITH CONNECTION `YOUR_PROJECT_ID.us.jev_remote_connection`
OPTIONS (
  endpoint = 'https://YOUR_CLOUD_RUN_URL/stackoverflow-variant',
  max_batching_rows = 5
);

CREATE OR REPLACE FUNCTION `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_pro_rerank`(
  title STRING,
  body STRING,
  first_label STRING,
  run_id STRING,
  item_id STRING
)
RETURNS JSON
REMOTE WITH CONNECTION `YOUR_PROJECT_ID.us.jev_remote_connection`
OPTIONS (
  endpoint = 'https://YOUR_CLOUD_RUN_URL/stackoverflow-pro-rerank',
  max_batching_rows = 5
);

CREATE OR REPLACE FUNCTION `YOUR_PROJECT_ID.jev_benchmark.classify_stackoverflow_pro_full`(
  title STRING,
  body STRING,
  run_id STRING,
  item_id STRING
)
RETURNS JSON
REMOTE WITH CONNECTION `YOUR_PROJECT_ID.us.jev_remote_connection`
OPTIONS (
  endpoint = 'https://YOUR_CLOUD_RUN_URL/stackoverflow-pro-full',
  max_batching_rows = 5
);
