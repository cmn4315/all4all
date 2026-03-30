-- This file is not intended to be ran, it represents a series of commands which can be ran
-- on the database in order to get a particular results, think of it as a dictionary of
-- queries. Simplifies the process or having to create new ones, since the main queries will be here

-- Returns the user's id and role if credentials match, otherwise returns no rows.
-- Parameters: email, password_hash
SELECT id, role
FROM users
WHERE email = 'user@example.com'
  AND password_hash = 'hashed_password_here';

-- Pulls a singular 
SELECT id, name
FROM users
WHERE email = 'email'
AND password_hash = 'hash';

-- Insert a new user with the VOLUNTEER role.
-- Parameters: email, password_hash
INSERT INTO users (email, password_hash, role)
VALUES ('volunteer@example.com', 'hashed_password_here', 'VOLUNTEER');


-- Insert a new user with the ORGANIZATION role.
-- Parameters: email, password_hash
INSERT INTO users (email, password_hash, role)
VALUES ('org@example.com', 'hashed_password_here', 'ORGANIZATION');

-- Retrieve all organization category names for display in the organization registration form.
-- Displayed in alphabetical order
SELECT id, name
FROM org_categories
ORDER BY name ASC;

-- Insert a new organization profile linked to an existing user.
-- Parameters: user_id, name, phone_number, description, category_id
INSERT INTO organizations (user_id, name, phone_number, description, category_id)
VALUES (1, 'Org Name', '555-555-5555', 'Organization description here', 1);

-- Insert a new volunteer profile linked to an existing user.
-- Parameters: user_id, full_name, phone_number, bio
INSERT INTO volunteers (user_id, full_name, phone_number, bio)
VALUES (1, 'John Doe', '555-555-5555', 'Volunteer bio here');

-- Insert a new event for an organization. Status defaults to DRAFT.
-- Parameters: organization_id, name, description, start_time, end_time, address, city, state, zip_code
INSERT INTO events (organization_id, name, description, start_time, end_time, address, city, state, zip_code)
VALUES (1, 'Event Name', 'Event description here', '2026-06-01 09:00:00-05:00', '2026-06-01 17:00:00-05:00', '123 Main St', 'Rochester', 'NY', '14623');

-- Retrieve all event categories for tagging/filtering events.
SELECT id, name
FROM event_categories
ORDER BY name ASC;

-- Insert a category link for an event. Called once per category selected during event creation.
-- Parameters: event_id, event_category_id
INSERT INTO event_category_links (event_id, event_category_id)
VALUES (1, 2);

-- Retrieve all category names associated with a given event.
-- Parameters: event_id
SELECT ec.id, ec.name
FROM event_categories ec
JOIN event_category_links ecl ON ec.id = ecl.event_category_id
WHERE ecl.event_id = 1;