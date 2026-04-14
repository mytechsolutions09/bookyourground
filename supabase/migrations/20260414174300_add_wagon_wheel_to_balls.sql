-- Add wagon_wheel_area to ball_log for tracking where runs were scored
ALTER TABLE ball_log ADD COLUMN IF NOT EXISTS wagon_wheel_area TEXT;

-- Create an index to help with wagon wheel analysis queries
CREATE INDEX IF NOT EXISTS idx_ball_log_area ON ball_log(wagon_wheel_area);
