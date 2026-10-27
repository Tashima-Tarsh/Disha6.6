CREATE TABLE IF NOT EXISTS icmr (
  state TEXT, district TEXT, pincode TEXT, cases TEXT, date TEXT, _source TEXT
);

CREATE TABLE IF NOT EXISTS icmr_lab_network (
    lab_id TEXT PRIMARY KEY,
    lab_name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    lab_type TEXT NOT NULL,
    is_accredited BOOLEAN DEFAULT 1,
    pincode TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icmr_surveillance_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date DATE NOT NULL,
    state TEXT NOT NULL,
    total_samples_tested INTEGER NOT NULL DEFAULT 0,
    positive_samples INTEGER NOT NULL DEFAULT 0,
    test_positivity_rate REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_date, state)
);

CREATE INDEX IF NOT EXISTS idx_icmr_lab_state ON icmr_lab_network(state);
CREATE INDEX IF NOT EXISTS idx_icmr_surv_state_date ON icmr_surveillance_aggregates(state, report_date);
