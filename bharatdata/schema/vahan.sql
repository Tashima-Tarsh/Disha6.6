CREATE TABLE IF NOT EXISTS vahan (
  reg_no TEXT, owner_name TEXT, owner_serial TEXT, maker TEXT, model TEXT,
  fuel TEXT, reg_date TEXT, insurance_upto TEXT, fitness_upto TEXT,
  puc_upto TEXT, chassis TEXT, engine TEXT, rto TEXT, _source TEXT
);

CREATE TABLE IF NOT EXISTS vahan_state_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL,
    state_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    vehicle_category TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    total_registered INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vahan_rto_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rto_code TEXT NOT NULL,
    rto_name TEXT NOT NULL,
    state_code TEXT NOT NULL,
    vehicle_category TEXT NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    reporting_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vahan_state_period ON vahan_state_aggregates(state_code, year, month);
CREATE INDEX IF NOT EXISTS idx_vahan_rto_code ON vahan_rto_metrics(rto_code);
