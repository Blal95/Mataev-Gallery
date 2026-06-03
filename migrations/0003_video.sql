-- migrations/0003_video.sql
ALTER TABLE photos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'photo';
ALTER TABLE photos ADD COLUMN duration    REAL;  -- seconds, null for photos
