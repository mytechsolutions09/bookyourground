-- Turf vs Matting for cricket grounds (null for box cricket / other types).
ALTER TABLE grounds
ADD COLUMN IF NOT EXISTS cricket_pitch_surface text;

COMMENT ON COLUMN grounds.cricket_pitch_surface IS 'Cricket ground only: Turf or Matting';
