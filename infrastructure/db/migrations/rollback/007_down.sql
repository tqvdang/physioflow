-- Rollback: 007_billing_tables.sql
-- Description: Rollback billing tables (service codes, invoices, payments)
-- Created: 2026-02-11

-- =============================================================================
-- DROP TABLES (in reverse order of dependencies)
-- =============================================================================

DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS pt_service_codes CASCADE;

-- =============================================================================
-- DROP ENUMS
-- =============================================================================

DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
