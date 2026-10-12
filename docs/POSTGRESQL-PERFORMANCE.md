# PostgreSQL performance

The `pg_stat_statements` integration adds SQL workload trends to the Grafana
infrastructure dashboard. Collection is enabled by default in the observability
stack, independently of the API metrics listener and requires PostgreSQL 17-compatible statistics
columns. No extension is installed by API startup or application migrations.

## Local setup

The standard development Compose service preloads `pg_stat_statements`:

```bash
pnpm dev:infra
```

Fresh databases install the extension through the mounted initialization script.
Existing containers are recreated to apply preload settings, preserving their data
volume. Initialization scripts do not run again for existing volumes. For an
existing local volume, explicitly install the extension with its administrator:

```bash
docker compose exec postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/query-statistics.sql'
```

Start the API with `pnpm dev:logs` and the collector with `pnpm logs:up`.
The collector's local DSN defaults match `.env.example`; export `OBS_POSTGRES_DSN`
when using another database or role. To opt out, remove the `skull-postgres-statements`
scrape job from the Prometheus configuration. No statistics reset or volume removal
is needed.

## Production setup

The database administrator or hosting platform must add `pg_stat_statements` to
`shared_preload_libraries`, preserving other preloaded libraries, enable query
identifiers (`compute_query_id=auto` normally suffices), and restart PostgreSQL.
Install `pg_stat_statements` in the application's database with schema `public`.
The development Compose service demonstrates these settings; deployed databases
remain managed by their administrator or hosting platform.

Configure Alloy's PostgreSQL DSN through the platform's secret mechanism. The
collector role needs read access to `public.pg_stat_statements(false)` and
`public.pg_stat_statements_info`; superuser and `pg_read_all_stats` are unnecessary
for observing its own role. Connect as the application role when retaining the
current-role workload scope, or deliberately adapt the SQL and permissions for a
dedicated monitoring role. Application replicas no longer collect these statistics.

The statements exporter is separate from basic connection observations. Its health
combines scrape success, PostgreSQL connectivity and exporter query errors. A
missing extension triggers a warning and does not fail API readiness. Dashboard
queries hide workload samples while collection is failing. The supplied local DSN
sets a 1.5-second statement timeout, read-only sessions and a two-second connection
timeout; retain equivalent bounds in deployed collector configuration.

## Reading the dashboard

Panels show collection status, SQL executions per second, weighted mean SQL
execution time, shared-buffer hit ratio, temporary block writes, and retained
query-family count. Execution time excludes application/network/pool wait and
does not provide p95/p99. Shared-buffer reads may hit the operating-system cache;
temporary blocks are counts, not bytes. Monitoring statements are included.

The exporter exports only fixed aggregates, never SQL text, bind parameters, query
IDs, database names or role names. Use one collector per database/role. Panels assume one database/role per service
and environment; separate databases need separate monitoring identities. Infrastructure
samples remain available when the API is stopped and ignore API-instance filters.

Source totals can decrease after reset, restart, or entry eviction. Prometheus
handles observed counter resets, but entry churn can distort rates. Use these
as diagnostic trends, not exact accounting or service-level objectives. The
reset timestamp is also exported. Never reset statistics on a shared database
to measure a change; compare snapshots over a known traffic window.

For a private operator investigation, find expensive query families without
returning their SQL text:

```sql
SELECT queryid, calls, total_exec_time, mean_exec_time,
       shared_blks_hit, shared_blks_read, temp_blks_written
FROM public.pg_stat_statements(false)
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND userid = current_user::regrole::oid AND toplevel
ORDER BY total_exec_time DESC
LIMIT 20;
```

## When to use auto_explain

`pg_stat_statements` identifies expensive workload; `auto_explain` records plans
to help explain why a query is slow. Start with a trusted representative query
and plain `EXPLAIN` in staging. Use `auto_explain` temporarily in a privileged
diagnostic session when intermittent slow plans are difficult to reproduce:

```sql
LOAD 'auto_explain';
SET auto_explain.log_min_duration = '1s';
SET auto_explain.sample_rate = 0.1;
SET auto_explain.log_analyze = off;
SET auto_explain.log_timing = off;
SET auto_explain.log_parameter_max_length = 0;
```

These settings concern only that session; they do not instrument the API's
other pooled connections. Disconnect afterwards. Parameter logging is disabled,
but SQL text, literals and plan details may still contain sensitive data. Keep
database logs access-restricted and do not forward them through the sanitized
API log pipeline. `log_analyze` adds execution instrumentation overhead; assess
sampling and overhead before any platform-managed production use. Nothing in
this template enables `auto_explain` automatically.

References: [pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html)
and [auto_explain](https://www.postgresql.org/docs/17/auto-explain.html).
