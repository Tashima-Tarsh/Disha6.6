-- DISHA 6.6 Vehicle Intelligence & VAHAN Engine Migration
-- Version: 202610140001
-- Name: vehicle_intelligence

CREATE TABLE IF NOT EXISTS vehicle_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number VARCHAR(20) NOT NULL,
    normalized_number VARCHAR(20) NOT NULL,
    plate_format VARCHAR(40) NOT NULL DEFAULT 'standard_state',
    status VARCHAR(40) NOT NULL,
    data_type VARCHAR(40) NOT NULL,
    provider_id VARCHAR(60) NOT NULL,
    provider_reference_id VARCHAR(120),
    case_id VARCHAR(80),
    investigator_id VARCHAR(80),
    purpose VARCHAR(255) NOT NULL DEFAULT 'vehicle_registration_verification',
    state_code VARCHAR(10),
    state_name VARCHAR(100),
    rto_code VARCHAR(20),
    rto_name VARCHAR(200),
    vehicle_category VARCHAR(40),
    vehicle_class VARCHAR(100),
    manufacturer VARCHAR(120),
    model VARCHAR(120),
    model_variant VARCHAR(120),
    fuel_type VARCHAR(40),
    color VARCHAR(60),
    manufacturing_year_month VARCHAR(20),
    emission_norms VARCHAR(40),
    engine_capacity_cc INT,
    seating_capacity INT,
    registration_date DATE,
    fitness_valid_until DATE,
    insurance_company VARCHAR(150),
    insurance_policy_number VARCHAR(100),
    insurance_valid_until DATE,
    puc_number VARCHAR(80),
    puc_valid_until DATE,
    tax_valid_until DATE,
    masked_owner_name VARCHAR(120),
    masked_father_name VARCHAR(120),
    masked_chassis_number VARCHAR(60),
    masked_engine_number VARCHAR(60),
    financer VARCHAR(150),
    is_financed BOOLEAN DEFAULT FALSE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_response_hash_sha256 VARCHAR(64) NOT NULL,
    normalized_hash_sha256 VARCHAR(64) NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_norm_num ON vehicle_verifications(normalized_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_case_id ON vehicle_verifications(case_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_verifications_retrieved_at ON vehicle_verifications(retrieved_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES vehicle_verifications(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL,
    action VARCHAR(60) NOT NULL,
    actor_id VARCHAR(80) NOT NULL,
    actor_email VARCHAR(120),
    actor_role VARCHAR(60),
    case_id VARCHAR(80),
    provider_used VARCHAR(60),
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_audit_log_reg_no ON vehicle_audit_log(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_audit_log_timestamp ON vehicle_audit_log(timestamp DESC);
