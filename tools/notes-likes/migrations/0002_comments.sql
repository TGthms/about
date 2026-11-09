CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note TEXT NOT NULL,
  submission TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  posted_at INTEGER NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);

CREATE INDEX comments_by_note ON comments (note, id DESC) WHERE removed = 0;
CREATE INDEX comments_for_moderation ON comments (id DESC) WHERE removed = 0;
