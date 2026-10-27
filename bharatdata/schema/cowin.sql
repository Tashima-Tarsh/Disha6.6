CREATE TABLE IF NOT EXISTS cowin (
  beneficiary_id TEXT, name TEXT, age TEXT, gender TEXT, pincode TEXT,
  dose_dates TEXT, vaccine TEXT, center TEXT, _source TEXT
);

CREATE TABLE IF NOT EXISTS cowin_state_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date DATE NOT NULL,
    state_id INTEGER NOT NULL,
    state_name TEXT NOT NULL,
    total_doses INTEGER NOT NULL DEFAULT 0,
    dose1 INTEGER NOT NULL DEFAULT 0,
    dose2 INTEGER NOT NULL DEFAULT 0,
    precaution_dose INTEGER NOT NULL DEFAULT 0,
    covishield INTEGER NOT NULL DEFAULT 0,
    covaxin INTEGER NOT NULL DEFAULT 0,
    sputnik_v INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_date, state_id)
);

CREATE TABLE IF NOT EXISTS cowin_district_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date DATE NOT NULL,
    state_id INTEGER NOT NULL,
    district_id INTEGER NOT NULL,
    district_name TEXT NOT NULL,
    total_doses INTEGER NOT NULL DEFAULT 0,
    dose1 INTEGER NOT NULL DEFAULT 0,
    dose2 INTEGER NOT NULL DEFAULT 0,
    precaution_dose INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_date, district_id)
);

CREATE INDEX IF NOT EXISTS idx_cowin_state_date ON cowin_state_daily(state_name, report_date);
CREATE INDEX IF NOT EXISTS idx_cowin_dist_date ON cowin_district_daily(district_name, report_date);
