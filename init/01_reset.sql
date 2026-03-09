-- This is the sql file to drop the tables to reset the application
-- This should be used when the application needs to be restarted from scratch
-- Drop tables (CASCADE removes dependent objects automatically)

DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS volunteer_badges CASCADE;
DROP TABLE IF EXISTS event_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS event_category_links CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS volunteers CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS org_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUM types (must be dropped after dependent tables)

DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;