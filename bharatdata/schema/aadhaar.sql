CREATE TABLE IF NOT EXISTS aadhaar (
  uid TEXT, vid TEXT, name TEXT, dob TEXT, gender TEXT, careof TEXT,
  address TEXT, pincode TEXT, photo_b64 TEXT, mobile_last4 TEXT,
  email_last4 TEXT, reference_id TEXT, _source TEXT
);

CREATE TABLE IF NOT EXISTS aadhaar_offline_kyc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT UNIQUE NOT NULL,
    masked_uid TEXT NOT NULL,
    name_hash TEXT NOT NULL,
    dob_year INTEGER,
    gender TEXT,
    state TEXT,
    pincode TEXT,
    signature_valid BOOLEAN NOT NULL DEFAULT 0,
    parser_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aadhaar_verification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aadhaar_ref ON aadhaar_offline_kyc(reference_id);
CREATE INDEX IF NOT EXISTS idx_aadhaar_masked ON aadhaar_offline_kyc(masked_uid);
