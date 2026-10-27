CREATE TABLE IF NOT EXISTS eci (
  elector_name TEXT, relation_name TEXT, relation_type TEXT, epic_number TEXT,
  age TEXT, gender TEXT, ac_no TEXT, ac_name TEXT, part_no TEXT, serial_no TEXT,
  address TEXT, district TEXT, state TEXT, ps_name TEXT, _source TEXT
);

CREATE TABLE IF NOT EXISTS eci_elections (
    election_id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    election_type TEXT NOT NULL,
    state TEXT NOT NULL,
    total_constituencies INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS eci_constituencies (
    constituency_id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    state TEXT NOT NULL,
    constituency_number INTEGER,
    constituency_name TEXT NOT NULL,
    constituency_type TEXT DEFAULT 'GEN',
    total_electors INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    turnout_pct REAL DEFAULT 0.0,
    FOREIGN KEY(election_id) REFERENCES eci_elections(election_id)
);

CREATE TABLE IF NOT EXISTS eci_candidates (
    candidate_id INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id TEXT NOT NULL,
    constituency_id TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    party TEXT NOT NULL,
    party_symbol TEXT,
    votes INTEGER DEFAULT 0,
    vote_pct REAL DEFAULT 0.0,
    rank INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT 0,
    deposit_lost BOOLEAN DEFAULT 0,
    FOREIGN KEY(election_id) REFERENCES eci_elections(election_id),
    FOREIGN KEY(constituency_id) REFERENCES eci_constituencies(constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_eci_cand_name ON eci_candidates(candidate_name);
CREATE INDEX IF NOT EXISTS idx_eci_cand_party ON eci_candidates(party);
CREATE INDEX IF NOT EXISTS idx_eci_const_name ON eci_constituencies(constituency_name);
