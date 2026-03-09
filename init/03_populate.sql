-- Certain tables come prepopulated for the user to select from
-- This script adds information to those tables
-- Run reset.sql, schema.sql, then popualte.sql. 
-- This information could also be added at the end of schema.sql as well

-- Prepopulate organization categories
INSERT INTO org_categories (name) VALUES
('Environmental'),
('Health & Medical'),
('Education'),
('Community Development'),
('Animal Welfare'),
('Arts & Culture'),
('Human Services'),
('Youth & Mentoring'),
('Disaster Relief'),
('Advocacy & Policy'),
('Religious'),
('Senior Services');

-- Prepopulate event categories
INSERT INTO event_categories (name) VALUES
('Cleanup'),
('Fundraising'),
('Food Distribution'),
('Tutoring'),
('Mentorship'),
('Medical Support'),
('Event Staffing'),
('Construction & Repair'),
('Administrative Support'),
('Outreach'),
('Animal Care'),
('Disaster Response'),
('Workshop & Training'),
('Community Outreach'),
('Arts & Performance');

-- Prepopulate system badges
-- Prepopulate system badges (no image URLs)
INSERT INTO badges (name, description) VALUES
('First Volunteer', 
 'Awarded for completing your first volunteer event.'),
 
('Community Contributor', 
 'Awarded after participating in 5 volunteer events.'),

('Dedicated Volunteer', 
 'Awarded after participating in 10 volunteer events.'),

('Team Player', 
 'Recognized for consistent collaboration and teamwork.'),

('Environmental Hero', 
 'Awarded for participating in environmental cleanup efforts.'),

('Helping Hands', 
 'Awarded for supporting food drives or community aid events.'),

('Mentor', 
 'Awarded for volunteering in mentorship or tutoring programs.'),

('Emergency Responder', 
 'Awarded for participating in disaster response events.'),

('Event Champion', 
 'Awarded for attending 3 events hosted by the same organization.'),

('Volunteer of the Month', 
 'Special recognition for outstanding service.');