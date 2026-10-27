CREATE VIEW IF NOT EXISTS v_person_join AS
  SELECT a.uid, a.name, a.dob, e.epic_number, e.district, e.state
  FROM aadhaar a
  JOIN eci e ON a.name = e.elector_name AND a.dob = e.age;

CREATE VIEW IF NOT EXISTS v_geo_state_alignment AS
SELECT 
    v.state_name AS state_name,
    v.state_code AS state_code,
    COALESCE(c.total_doses, 0) AS total_vaccine_doses,
    COALESCE(v.total_vehicles, 0) AS total_registered_vehicles,
    COALESCE(i.total_labs, 0) AS total_accredited_labs
FROM (
    SELECT 
        state_name, 
        state_code, 
        SUM(total_registered) AS total_vehicles
    FROM vahan_state_aggregates
    GROUP BY state_name, state_code
) v
LEFT JOIN (
    SELECT 
        state_name, 
        SUM(total_doses) AS total_doses
    FROM cowin_state_daily
    GROUP BY state_name
) c ON UPPER(TRIM(v.state_name)) = UPPER(TRIM(c.state_name))
LEFT JOIN (
    SELECT 
        state, 
        COUNT(*) AS total_labs
    FROM icmr_lab_network
    WHERE is_accredited = 1
    GROUP BY state
) i ON UPPER(TRIM(v.state_name)) = UPPER(TRIM(i.state));
