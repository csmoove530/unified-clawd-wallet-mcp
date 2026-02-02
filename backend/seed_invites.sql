-- Seed 20 invite codes for initial deployment
-- These are auto-seeded by init_db() if the invite_codes table is empty.
-- Run manually: sqlite3 clawd_domains.db < seed_invites.sql

INSERT OR IGNORE INTO invite_codes (code, amount_usdc, amount_eth, created_at, is_active) VALUES
('CL001', 1.0, 0.001, datetime('now'), 1),
('CL002', 1.0, 0.001, datetime('now'), 1),
('CL003', 1.0, 0.001, datetime('now'), 1),
('CL004', 1.0, 0.001, datetime('now'), 1),
('CL005', 1.0, 0.001, datetime('now'), 1),
('CL006', 1.0, 0.001, datetime('now'), 1),
('CL007', 1.0, 0.001, datetime('now'), 1),
('CL008', 1.0, 0.001, datetime('now'), 1),
('CL009', 1.0, 0.001, datetime('now'), 1),
('CL010', 1.0, 0.001, datetime('now'), 1),
('CL011', 1.0, 0.001, datetime('now'), 1),
('CL012', 1.0, 0.001, datetime('now'), 1),
('CL013', 1.0, 0.001, datetime('now'), 1),
('CL014', 1.0, 0.001, datetime('now'), 1),
('CL015', 1.0, 0.001, datetime('now'), 1),
('CL016', 1.0, 0.001, datetime('now'), 1),
('CL017', 1.0, 0.001, datetime('now'), 1),
('CL018', 1.0, 0.001, datetime('now'), 1),
('CL019', 1.0, 0.001, datetime('now'), 1),
('CL020', 1.0, 0.001, datetime('now'), 1);
