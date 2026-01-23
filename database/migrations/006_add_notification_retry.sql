-- Add retry/backoff fields to notification_queue
ALTER TABLE notification_queue
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Refresh status constraint to include dead_letter
ALTER TABLE notification_queue
    DROP CONSTRAINT IF EXISTS notification_queue_status_check;
ALTER TABLE notification_queue
    ADD CONSTRAINT notification_queue_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'suppressed', 'dead_letter'));

-- Index to accelerate polling by next_attempt_at
CREATE INDEX IF NOT EXISTS idx_notification_queue_next_attempt ON notification_queue(next_attempt_at);

-- Backfill next_attempt_at where null
UPDATE notification_queue SET next_attempt_at = COALESCE(next_attempt_at, created_at) WHERE next_attempt_at IS NULL;
