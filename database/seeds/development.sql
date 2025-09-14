-- Development seed data for FLRTS
-- PostgreSQL 15.8

-- Insert test personnel
INSERT INTO public.personnel (telegram_user_id, telegram_username, full_name, phone, email, timezone, role) VALUES
(123456789, 'john_smith', 'John Smith', '+1234567890', 'john@example.com', 'America/New_York', 'admin'),
(987654321, 'jane_doe', 'Jane Doe', '+0987654321', 'jane@example.com', 'America/Chicago', 'supervisor'),
(456789123, 'bob_builder', 'Bob Builder', '+1122334455', 'bob@example.com', 'America/Los_Angeles', 'worker'),
(789123456, 'alice_cooper', 'Alice Cooper', '+5544332211', 'alice@example.com', 'Europe/London', 'worker');

-- Insert test sites
INSERT INTO public.sites (name, code, aliases, location) VALUES
('Main Office', 'HQ001', ARRAY['headquarters', 'main', 'hq'], '{"lat": 40.7128, "lng": -74.0060, "address": "New York, NY"}'::jsonb),
('Warehouse North', 'WH001', ARRAY['warehouse1', 'north'], '{"lat": 41.8781, "lng": -87.6298, "address": "Chicago, IL"}'::jsonb),
('Field Site A', 'FS001', ARRAY['site-a', 'field1'], '{"lat": 34.0522, "lng": -118.2437, "address": "Los Angeles, CA"}'::jsonb);

-- Insert test contractors
INSERT INTO public.contractors (name, code, contact_info) VALUES
('ABC Construction', 'ABC001', '{"phone": "+1234567890", "email": "contact@abc.com"}'::jsonb),
('XYZ Services', 'XYZ001', '{"phone": "+0987654321", "email": "info@xyz.com"}'::jsonb);

-- Insert test list templates
INSERT INTO public.list_templates (name, category, description, template_items, tags, is_public, created_by) VALUES
('Daily Safety Checklist', 'safety', 'Standard daily safety inspection checklist',
    '[{"text": "Hard hats worn", "required": true}, {"text": "Safety barriers in place", "required": true}, {"text": "Equipment inspected", "required": true}]'::jsonb,
    ARRAY['safety', 'daily', 'inspection'], true, (SELECT id FROM public.personnel WHERE telegram_username = 'john_smith')),
('Equipment Inventory', 'inventory', 'Standard equipment inventory template',
    '[{"text": "Excavator", "quantity": true}, {"text": "Bulldozer", "quantity": true}, {"text": "Crane", "quantity": true}]'::jsonb,
    ARRAY['equipment', 'inventory'], true, (SELECT id FROM public.personnel WHERE telegram_username = 'jane_doe'));

-- Insert sample lists
INSERT INTO public.lists (owner_id, name, type, items, tags) VALUES
((SELECT id FROM public.personnel WHERE telegram_username = 'john_smith'), 'Morning Tasks', 'checklist',
    '[{"text": "Check emails", "completed": false}, {"text": "Review schedule", "completed": false}, {"text": "Team briefing", "completed": false}]'::jsonb,
    ARRAY['daily', 'morning']),
((SELECT id FROM public.personnel WHERE telegram_username = 'jane_doe'), 'Supply Order', 'shopping',
    '[{"text": "Safety vests", "quantity": 10}, {"text": "Hard hats", "quantity": 5}, {"text": "Gloves", "quantity": 20}]'::jsonb,
    ARRAY['supplies', 'safety']);

-- Insert sample reminders
INSERT INTO public.reminders (owner_id, assignee_id, title, description, due_at, reminder_at, status) VALUES
((SELECT id FROM public.personnel WHERE telegram_username = 'john_smith'),
 (SELECT id FROM public.personnel WHERE telegram_username = 'bob_builder'),
 'Submit timesheet', 'Weekly timesheet submission',
 NOW() + INTERVAL '3 days', NOW() + INTERVAL '2 days', 'pending'),
((SELECT id FROM public.personnel WHERE telegram_username = 'jane_doe'),
 (SELECT id FROM public.personnel WHERE telegram_username = 'alice_cooper'),
 'Safety training', 'Quarterly safety training session',
 NOW() + INTERVAL '1 week', NOW() + INTERVAL '5 days', 'pending');

-- Insert notification preferences
INSERT INTO public.notification_preferences (user_id, channel, quiet_hours_start, quiet_hours_end, batch_window_minutes) VALUES
((SELECT id FROM public.personnel WHERE telegram_username = 'john_smith'), 'telegram', '22:00'::time, '07:00'::time, 15),
((SELECT id FROM public.personnel WHERE telegram_username = 'jane_doe'), 'telegram', '23:00'::time, '06:00'::time, 30),
((SELECT id FROM public.personnel WHERE telegram_username = 'bob_builder'), 'telegram', '21:00'::time, '08:00'::time, 10),
((SELECT id FROM public.personnel WHERE telegram_username = 'alice_cooper'), 'telegram', '22:00'::time, '07:00'::time, 15);

-- Sample OpenProject data
INSERT INTO openproject.projects (name, description, identifier) VALUES
('Construction Phase 1', 'Main construction project phase 1', 'construction-p1'),
('Maintenance Operations', 'Ongoing maintenance operations', 'maintenance-ops');

-- Note: OpenProject users are automatically created via trigger from personnel inserts

-- Sample work packages (tasks)
INSERT INTO openproject.work_packages (
    type_id, project_id, subject, description, due_date, status_id,
    assigned_to_id, priority_id, author_id
) VALUES
(1, 1, 'Foundation inspection', 'Complete foundation inspection for Building A',
    CURRENT_DATE + 7, 1,
    (SELECT id FROM openproject.users WHERE login = 'bob.builder'),
    3,
    (SELECT id FROM openproject.users WHERE login = 'john.smith')),
(1, 2, 'HVAC maintenance', 'Monthly HVAC system maintenance',
    CURRENT_DATE + 14, 1,
    (SELECT id FROM openproject.users WHERE login = 'alice.cooper'),
    2,
    (SELECT id FROM openproject.users WHERE login = 'jane.doe'));