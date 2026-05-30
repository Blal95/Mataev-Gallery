CREATE TABLE photos (
  id            TEXT PRIMARY KEY,           -- ULID
  slug          TEXT UNIQUE NOT NULL,       -- short url-safe id
  caption       TEXT,
  taken_at      INTEGER,                    -- epoch ms (EXIF DateTimeOriginal), nullable
  created_at    INTEGER NOT NULL,           -- epoch ms (upload time)
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  aspect        REAL    NOT NULL,           -- width / height (for layout, no image load)
  bytes         INTEGER NOT NULL,           -- original file size
  format        TEXT    NOT NULL,           -- 'jpeg' | 'png' | 'webp'
  color_space   TEXT,                       -- 'Display P3' | 'sRGB' | ...
  camera_make   TEXT,
  camera_model  TEXT,
  lens_model    TEXT,
  focal_length  REAL,                       -- mm
  f_number      REAL,                       -- aperture (f/x)
  exposure_time REAL,                       -- seconds (UI formats as 1/x)
  iso           INTEGER,
  gps_lat       REAL,
  gps_lon       REAL,
  gps_alt       REAL,
  place         TEXT,                       -- locality/city
  country       TEXT,
  country_code  TEXT,                       -- ISO 3166-1 alpha-2 (for flag emoji)
  thumbhash     TEXT,                       -- base64 thumbhash (blur-up placeholder)
  r2_original   TEXT NOT NULL,              -- R2 key
  r2_large      TEXT NOT NULL,              -- R2 key (~1600w WebP)
  r2_thumb      TEXT NOT NULL,              -- R2 key (~500w WebP)
  published     INTEGER NOT NULL DEFAULT 1,
  sort_index    INTEGER                     -- optional manual order; default sort = taken_at desc
);
CREATE INDEX idx_photos_taken     ON photos(taken_at DESC);
CREATE INDEX idx_photos_published ON photos(published);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL                 -- normalized: lowercase, no '#', [a-z0-9-]
);

CREATE TABLE photo_tags (
  photo_id TEXT    NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);
CREATE INDEX idx_phototags_tag ON photo_tags(tag_id);

-- WebAuthn
CREATE TABLE credentials (
  id           TEXT PRIMARY KEY,            -- base64url credential ID
  public_key   BLOB NOT NULL,
  counter      INTEGER NOT NULL,
  transports   TEXT,                        -- JSON array
  device_label TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE TABLE auth_challenges (
  id         TEXT PRIMARY KEY,              -- temp id stored in short-lived cookie
  challenge  TEXT NOT NULL,
  kind       TEXT NOT NULL,                 -- 'register' | 'authenticate'
  expires_at INTEGER NOT NULL
);
