CREATE VIEW IF NOT EXISTS v_eci_by_district AS
  SELECT district, COUNT(*) n FROM eci GROUP BY district;

CREATE VIEW IF NOT EXISTS v_eci_by_state AS
  SELECT state, COUNT(*) n FROM eci GROUP BY state;

CREATE VIEW IF NOT EXISTS v_vahan_by_rto AS
  SELECT rto, COUNT(*) n FROM vahan GROUP BY rto;

CREATE VIEW IF NOT EXISTS v_cowin_by_pincode AS
  SELECT pincode, COUNT(*) n FROM cowin GROUP BY pincode;

CREATE VIEW IF NOT EXISTS v_eci_winners AS
SELECT 
    c.election_id,
    e.year,
    e.election_type,
    c.state,
    c.constituency_name,
    cand.candidate_name AS winner_name,
    cand.party AS winning_party,
    cand.votes AS winning_votes,
    cand.vote_pct AS winning_vote_pct
FROM eci_constituencies c
JOIN eci_candidates cand ON c.constituency_id = cand.constituency_id AND cand.is_winner = 1
JOIN eci_elections e ON c.election_id = e.election_id;

CREATE VIEW IF NOT EXISTS v_vahan_ev_share AS
SELECT 
    state_code,
    state_name,
    year,
    SUM(CASE WHEN fuel_type = 'ELECTRIC' THEN total_registered ELSE 0 END) AS ev_count,
    SUM(total_registered) AS total_count,
    ROUND(CAST(SUM(CASE WHEN fuel_type = 'ELECTRIC' THEN total_registered ELSE 0 END) AS REAL) * 100.0 / 
          NULLIF(SUM(total_registered), 0), 2) AS ev_percentage
FROM vahan_state_aggregates
GROUP BY state_code, state_name, year;

CREATE VIEW IF NOT EXISTS v_cowin_state_totals AS
SELECT 
    state_id,
    state_name,
    MAX(report_date) AS latest_date,
    total_doses,
    dose1,
    dose2,
    precaution_dose
FROM cowin_state_daily
GROUP BY state_id, state_name;
