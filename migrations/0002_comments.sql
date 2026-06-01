CREATE TABLE comments (
  id         TEXT PRIMARY KEY,
  photo_id   TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash    TEXT
);
CREATE INDEX idx_comments_photo ON comments(photo_id, created_at ASC);
