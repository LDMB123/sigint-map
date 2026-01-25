-- Migration: Add track_count column to releases table
-- Date: 2026-01-15
-- Description: Adds the track_count field to store the number of tracks on each release
--              This is a denormalized field for performance (avoids COUNT query on release_tracks)

-- Add track_count column with default of 0
ALTER TABLE releases ADD COLUMN track_count INTEGER DEFAULT 0;

-- Create index for filtering/sorting by track count
CREATE INDEX IF NOT EXISTS idx_releases_track_count ON releases(track_count);

-- Update existing records to calculate track_count from release_tracks
-- (Currently release_tracks is empty, but this will work when data is populated)
UPDATE releases
SET track_count = (
  SELECT COUNT(*)
  FROM release_tracks
  WHERE release_tracks.release_id = releases.id
);
