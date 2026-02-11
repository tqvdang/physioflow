-- Rollback: 024_special_tests.sql
-- Description: Remove special tests library tables and seed data

BEGIN;

DROP TABLE IF EXISTS patient_special_test_results CASCADE;
DROP TABLE IF EXISTS special_tests CASCADE;

COMMIT;
