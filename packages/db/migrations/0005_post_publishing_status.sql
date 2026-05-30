-- Adds a "publishing" intermediate post status used as a per-row lock during
-- the scheduled-publish job. A worker claims a due post by CAS'ing
-- scheduled→publishing; only one worker can win, preventing double-posting if
-- the cron job overlaps with itself.

ALTER TYPE "post_status" ADD VALUE IF NOT EXISTS 'publishing';
