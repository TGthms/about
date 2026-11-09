CREATE TABLE likes (
  note TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  PRIMARY KEY (note, token_hash)
) WITHOUT ROWID;

CREATE TABLE totals (
  note TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count >= 0)
) WITHOUT ROWID;

CREATE TRIGGER add_like AFTER INSERT ON likes BEGIN
  INSERT INTO totals (note, count) VALUES (NEW.note, 1)
  ON CONFLICT (note) DO UPDATE SET count = count + 1;
END;

CREATE TRIGGER remove_like AFTER DELETE ON likes BEGIN
  UPDATE totals SET count = count - 1 WHERE note = OLD.note;
  DELETE FROM totals WHERE note = OLD.note AND count = 0;
END;
