-- sync_logs: records request/response from football-data.org on every sync run
-- Retention: 5 days (auto-deleted via pg_cron)

CREATE TABLE sync_logs (
  id           bigserial   PRIMARY KEY,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL CHECK (status IN ('ok', 'error')),
  duration_ms  integer,
  fd_status    integer,     -- HTTP status code from football-data.org
  match_count  integer,     -- number of matches returned by the API
  upserted     integer,     -- number of rows upserted into the matches table
  error        text,        -- error message (only when status='error')
  details      jsonb        -- reserved for additional debug info
);

-- Index for time-range queries (DESC so the latest logs appear first)
CREATE INDEX idx_sync_logs_triggered_at ON sync_logs(triggered_at DESC);

-- RLS is intentionally disabled: this table is only accessed via the service role and is not exposed publicly

-- ─── Auto-cleanup: delete logs older than 5 days ─────────────────────────────
-- Requires the pg_cron extension to be enabled first (Supabase Dashboard → Database → Extensions)
--
-- SELECT cron.schedule(
--   'cleanup-sync-logs',        -- job name
--   '0 3 * * *',               -- daily at 03:00 UTC
--   $$
--     DELETE FROM sync_logs
--     WHERE triggered_at < now() - INTERVAL '5 days';
--   $$
-- );
--
-- Note: uncomment and run the SQL above in the Supabase SQL Editor
-- after enabling the pg_cron extension
