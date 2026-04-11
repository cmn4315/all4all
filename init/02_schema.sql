-- A user must be either a VOLUNTEER or an ORGANIZATION.
CREATE TYPE user_role AS ENUM ('VOLUNTEER', 'ORGANIZATION');


-- Event lifecycle status.
-- DRAFT: not visible to public
-- PUBLISHED: visible & open for registration
-- CANCELLED: event cancelled
-- COMPLETED: event has finished
CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');


-- Authentication table.
-- Role is Volunteers or Organizations.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone_number TEXT,
    role user_role NOT NULL,
    image_url TEXT -- URL to stored image
);


-- Categories for organizations (Non-Profit, Environmental, Health, ...).
-- No duplicate names, we provide a list
CREATE TABLE org_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);


-- user_id is UNIQUE
-- ON DELETE CASCADE ensures that deleting a user removes the organization.
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL, -- public description of the organization, on profile
    category_id INTEGER NOT NULL REFERENCES org_categories(id), -- Each organization belongs to one category.
    zip_code TEXT NOT NULL,
    address TEXT
);


-- Same logic as organizations
CREATE TABLE volunteers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    bio TEXT, -- Profile bio shown on volunteer page.
    zip_code TEXT
);


-- Events are created and managed by organizations.
-- If an organization is deleted, its events are deleted.
-- when an event is created it is stored in the DRAFT phase, until it is moved into
-- the PUBLISHED PHASE
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status event_status NOT NULL DEFAULT 'DRAFT',
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code VARCHAR(10) NOT NULL,
    CHECK (end_time > start_time) -- ensures that the end time is after the start time
);


-- Categories used for filtering/searching/tagging events.
CREATE TABLE event_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);


-- Many-to-many relationship between events and categories.
-- Composite primary key prevents duplicate category assignments.
-- if an event or category is deleted, the link is also deleted
CREATE TABLE event_category_links (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_category_id INTEGER NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, event_category_id)
);


-- Volunteer registering for an event.
-- This is a many-to-many relationship between volunteers and events.
-- Prevents duplicate registration for the same event.
CREATE TABLE event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, -- which event is it
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE, -- which volunteer is it
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,    -- When the volunteer registered.
    attended BOOLEAN DEFAULT FALSE,    -- Allows tracking attendance and service hours.
    UNIQUE (event_id, volunteer_id)
);


-- Badges are used by organizations
-- Doesn't support them adding their own badges
-- If we want to add in custom uploads, we need to store the images somewhere, which takes up space
-- But it is possible, small changes like adding in an organization_id field are needed
-- and potentially have a many to many table as well
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT -- URL to stored image
);


-- Defines which badges are attached to which events.
-- Allows multiple badges per event.
CREATE TABLE event_badges (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, badge_id)
);


-- Represents badges actually earned by volunteers.
-- event_badges = potential rewards
-- volunteer_badges = earned rewards
CREATE TABLE volunteer_badges (
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (volunteer_id, badge_id)
);

-- Represents the colors attached to an organizations account
CREATE TABLE org_colors (
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    color_id TEXT NOT NULL,
    PRIMARY KEY (organization_id, color_id)
);


-- All notifications.
-- recipient_user_id references users so both volunteers and organizations are supported.
-- If an event is deleted, the notification is not
-- Allows UI to track unread notifications.
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);


-- Self-referencing many-to-many relationship.
-- Allows users to follow other users.
-- Prevents duplicate follow relationships.
-- Prevents users from following themselves.
CREATE TABLE user_follows (
    follower_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_user_id, following_user_id),
    CHECK (follower_user_id <> following_user_id)
);
