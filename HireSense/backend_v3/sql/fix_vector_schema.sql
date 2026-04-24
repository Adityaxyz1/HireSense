-- ============================================================
-- FIX: pgvector Extension Schema Migration
-- ============================================================
-- Problem: `ALTER EXTENSION vector SET SCHEMA extensions` moved
-- the vector type to `extensions.vector`, but table columns
-- still reference `public.vector` causing "type does not exist" errors.
--
-- Solution: Update the database search_path to include `extensions`
-- so PostgreSQL can find the vector type automatically.
-- ============================================================

-- Option 1 (RECOMMENDED): Update search_path to include extensions schema
-- This makes all types in the extensions schema visible without schema prefix
ALTER DATABASE postgres SET search_path TO public, extensions;

-- After running this, you need to reconnect or run:
SELECT pg_reload_conf();

-- ============================================================
-- VERIFY: Run this query to confirm the vector type is accessible
-- ============================================================
-- SELECT 'test'::vector;
-- If this returns without error, the fix is working.
