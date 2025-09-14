-- FLRTS Supabase Schema Backup
-- Database: PostgreSQL 15.8.1
-- Exported: 2025-09-13
-- Purpose: Schema backup before migration to PostgreSQL 16+

-- ============================================================================
-- ARCHITECTURE PATTERN: Personnel vs Application Users
-- ============================================================================
-- The `personnel` table is the master record for ALL people in the organization
-- across all systems (FLRTS, accounting, field reports, vendor management, etc.)
-- 
-- Application-specific tables like `flrts_users` extend personnel with app-specific
-- settings, permissions, and preferences. This pattern allows:
-- 
-- 1. Single source of truth for contact info (personnel table)
-- 2. Not everyone needs access to every system
-- 3. App-specific permissions without polluting the master table
-- 4. Different Telegram accounts for different apps if needed
-- 5. Usage tracking per application
--
-- Example: John Smith is in `personnel` as an employee. He has:
-- - A record in `flrts_users` for task management access
-- - A record in `accounting_employees` for payroll/finance access  
-- - No record in `vendor_portal_users` (doesn't need vendor access)
-- ============================================================================

-- ============================================================================
-- CORE FLRTS TABLES
-- ============================================================================

-- Personnel Table (Core user management)
CREATE TABLE IF NOT EXISTS public.personnel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    personnel_id_display VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(50),
    job_title VARCHAR(255),
    personnel_type VARCHAR(50) NOT NULL,
    primary_site_id UUID,
    is_active BOOLEAN DEFAULT true,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    profile_photo_url VARCHAR(1024),
    
    -- Auth & Access
    auth_user_id UUID,
    app_role TEXT DEFAULT 'viewer',
    username VARCHAR(100),
    password_hash VARCHAR(255),
    last_login TIMESTAMPTZ,
    
    -- Telegram Integration
    telegram_id TEXT,
    telegram_username TEXT,
    
    -- Preferences
    timezone TEXT DEFAULT 'America/New_York',
    flrts_permissions JSONB DEFAULT '{"can_edit": true, "can_create": true, "can_delete": false}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    aliases TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks Table (Main task management)
CREATE TYPE task_status_enum_new AS ENUM ('To Do', 'In Progress', 'Done', 'Cancelled', 'Archived');

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id_display VARCHAR(50) NOT NULL UNIQUE,
    task_title VARCHAR(255) NOT NULL,
    task_description_detailed TEXT,
    
    -- Assignments & Relations
    assigned_to_user_id UUID REFERENCES personnel(id),
    site_id UUID,
    related_field_report_id UUID,
    parent_task_id UUID REFERENCES tasks(id),
    
    -- Task Properties
    due_date DATE,
    due_at TIMESTAMPTZ,
    reminder_time TIMESTAMPTZ,
    priority VARCHAR(50),
    status task_status_enum_new DEFAULT 'To Do',
    completion_date TIMESTAMPTZ,
    
    -- External Integrations
    todoist_task_id VARCHAR(255),
    openproject_id INTEGER,
    openproject_sync_status VARCHAR(50) DEFAULT 'pending',
    openproject_type_id INTEGER DEFAULT 1,
    openproject_last_sync TIMESTAMPTZ,
    openproject_error TEXT,
    
    -- Audit Fields
    created_by_user_id UUID REFERENCES personnel(id),
    submitted_by_user_id UUID REFERENCES personnel(id),
    submission_timestamp TIMESTAMPTZ DEFAULT now(),
    last_modified_timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lists Table (Task organization)
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_id_display VARCHAR(50) NOT NULL UNIQUE,
    list_name VARCHAR(255) NOT NULL,
    list_type VARCHAR(50) NOT NULL,
    site_id UUID,
    description TEXT,
    owner_user_id UUID REFERENCES personnel(id),
    status VARCHAR(50) NOT NULL,
    is_master_sop_list BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- List Items Table
CREATE TABLE IF NOT EXISTS public.list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_item_id_display VARCHAR(50) NOT NULL UNIQUE,
    parent_list_id UUID NOT NULL REFERENCES lists(id),
    item_name_primary_text VARCHAR(255) NOT NULL,
    item_detail_1_text VARCHAR(255),
    item_detail_2_text VARCHAR(255),
    item_detail_3_longtext TEXT,
    item_detail_boolean_1 BOOLEAN,
    item_detail_date_1 DATE,
    item_detail_user_link_1 UUID REFERENCES personnel(id),
    item_order INTEGER,
    is_complete_or_checked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reminder_id_display VARCHAR(50) NOT NULL UNIQUE,
    reminder_title VARCHAR(255) NOT NULL,
    reminder_date_time TIMESTAMPTZ NOT NULL,
    user_to_remind_id UUID NOT NULL REFERENCES personnel(id),
    
    -- Relations
    related_task_id UUID REFERENCES tasks(id),
    related_field_report_id UUID,
    related_site_id UUID,
    
    -- Properties
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    notification_channels TEXT[],
    todoist_reminder_id VARCHAR(255),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(255),
    
    -- Audit
    created_by_user_id UUID REFERENCES personnel(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- FLRTS Users Table (App-specific user settings)
-- This table extends personnel for FLRTS-specific functionality
-- Not everyone in personnel needs FLRTS access
CREATE TABLE IF NOT EXISTS public.flrts_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id_display VARCHAR(50) NOT NULL UNIQUE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) UNIQUE, -- One-to-one with personnel
    
    -- FLRTS-specific Telegram settings (overrides personnel table if different)
    telegram_id VARCHAR(255),
    telegram_username VARCHAR(255),
    
    -- FLRTS-specific permissions
    user_role_flrts VARCHAR(50) NOT NULL, -- admin, manager, user, viewer
    can_create_tasks BOOLEAN DEFAULT true,
    can_assign_tasks BOOLEAN DEFAULT false,
    can_delete_tasks BOOLEAN DEFAULT false,
    can_manage_lists BOOLEAN DEFAULT true,
    
    -- FLRTS usage tracking
    last_login_flrts TIMESTAMPTZ,
    is_active_flrts_user BOOLEAN DEFAULT true,
    tasks_created_count INTEGER DEFAULT 0,
    tasks_completed_count INTEGER DEFAULT 0,
    
    -- FLRTS preferences
    preferences_flrts JSONB DEFAULT '{"notifications": true, "auto_assign": false}'::jsonb,
    default_list_id UUID REFERENCES lists(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parsing Logs Table (NLP audit trail)
CREATE TABLE IF NOT EXISTS public.parsing_logs (
    id BIGSERIAL PRIMARY KEY,
    input_text TEXT NOT NULL,
    parsed_output JSONB NOT NULL,
    reasoning TEXT NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    user_id UUID REFERENCES personnel(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Assignment History
CREATE TABLE IF NOT EXISTS public.task_assignment_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),
    assigned_from_user_id UUID REFERENCES personnel(id),
    assigned_to_user_id UUID REFERENCES personnel(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- OpenProject User Mapping
CREATE TABLE IF NOT EXISTS public.openproject_user_mapping (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    personnel_id UUID NOT NULL REFERENCES personnel(id),
    openproject_user_id INTEGER NOT NULL,
    openproject_username VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(personnel_id),
    UNIQUE(openproject_user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Personnel indexes
CREATE INDEX idx_personnel_active ON personnel(is_active);
CREATE INDEX idx_personnel_telegram ON personnel(telegram_id);
CREATE INDEX idx_personnel_auth_user ON personnel(auth_user_id);

-- Tasks indexes
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_openproject ON tasks(openproject_id);
CREATE INDEX idx_tasks_sync_status ON tasks(openproject_sync_status);

-- Lists indexes
CREATE INDEX idx_lists_owner ON lists(owner_user_id);
CREATE INDEX idx_lists_status ON lists(status);

-- List Items indexes
CREATE INDEX idx_list_items_parent ON list_items(parent_list_id);
CREATE INDEX idx_list_items_complete ON list_items(is_complete_or_checked);

-- Reminders indexes
CREATE INDEX idx_reminders_user ON reminders(user_to_remind_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date_time);
CREATE INDEX idx_reminders_status ON reminders(status);

-- Parsing logs indexes
CREATE INDEX idx_parsing_logs_user ON parsing_logs(user_id);
CREATE INDEX idx_parsing_logs_created ON parsing_logs(created_at);
CREATE INDEX idx_parsing_logs_success ON parsing_logs(success);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Tasks with Details View
CREATE OR REPLACE VIEW public.tasks_with_details AS
SELECT 
    t.*,
    p.full_name as assigned_to_name,
    p.telegram_username as assigned_to_telegram,
    creator.full_name as created_by_name,
    submitter.full_name as submitted_by_name
FROM tasks t
LEFT JOIN personnel p ON t.assigned_to_user_id = p.id
LEFT JOIN personnel creator ON t.created_by_user_id = creator.id
LEFT JOIN personnel submitter ON t.submitted_by_user_id = submitter.id;

-- Lists with Details View
CREATE OR REPLACE VIEW public.lists_with_details AS
SELECT 
    l.*,
    p.full_name as owner_name,
    COUNT(li.id) as item_count,
    COUNT(li.id) FILTER (WHERE li.is_complete_or_checked = true) as completed_count
FROM lists l
LEFT JOIN personnel p ON l.owner_user_id = p.id
LEFT JOIN list_items li ON l.id = li.parent_list_id
GROUP BY l.id, p.full_name;

-- FLRTS Active Users View (Joins personnel with flrts_users)
CREATE OR REPLACE VIEW public.flrts_active_users AS
SELECT 
    p.id as personnel_id,
    p.personnel_id_display,
    p.full_name,
    p.email,
    p.phone_number,
    p.job_title,
    p.primary_site_id,
    -- Use FLRTS telegram if set, otherwise fall back to personnel
    COALESCE(f.telegram_id, p.telegram_id) as telegram_id,
    COALESCE(f.telegram_username, p.telegram_username) as telegram_username,
    -- FLRTS specific fields
    f.id as flrts_user_id,
    f.user_role_flrts,
    f.can_create_tasks,
    f.can_assign_tasks,
    f.can_delete_tasks,
    f.can_manage_lists,
    f.last_login_flrts,
    f.tasks_created_count,
    f.tasks_completed_count,
    f.preferences_flrts,
    f.default_list_id
FROM personnel p
INNER JOIN flrts_users f ON p.id = f.personnel_id
WHERE p.is_active = true 
    AND f.is_active_flrts_user = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on key tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (adjust based on your needs)
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid());

CREATE POLICY "Users can create tasks" ON tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with that column
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_items_updated_at BEFORE UPDATE ON list_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flrts_users_updated_at BEFORE UPDATE ON flrts_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_reports_updated_at BEFORE UPDATE ON field_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asics_updated_at BEFORE UPDATE ON asics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OPERATIONAL TABLES (Sites, Partners, Vendors, Field Reports)
-- ============================================================================

-- Sites Table (Location management)
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    site_id_display VARCHAR(50) NOT NULL UNIQUE,
    site_name VARCHAR(255) NOT NULL UNIQUE,
    site_address_street VARCHAR(255),
    site_address_city VARCHAR(255),
    site_address_state VARCHAR(255),
    site_address_zip VARCHAR(50),
    site_latitude NUMERIC,
    site_longitude NUMERIC,
    site_status VARCHAR(50) CHECK (site_status IN ('Commissioning', 'Running', 'In Maintenance', 'Contracted', 'Planned', 'Decommissioned')),
    operator_id UUID REFERENCES operators(id),
    sop_document_link VARCHAR(1024),
    is_active BOOLEAN DEFAULT true,
    initial_site_setup_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    full_site_address TEXT GENERATED ALWAYS AS (
        COALESCE(site_address_street, '') || ', ' || 
        COALESCE(site_address_city, '') || ', ' || 
        COALESCE(site_address_state, '') || ' ' || 
        COALESCE(site_address_zip, '')
    ) STORED
);

-- Partners Table (Business relationships)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    partner_id_display VARCHAR(50) NOT NULL UNIQUE,
    partner_name VARCHAR(255) NOT NULL UNIQUE,
    partner_type VARCHAR(50) CHECK (partner_type IN ('Investor', 'Service Provider', 'Technology Provider', 'Community', 'Government', 'Other')),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    website VARCHAR(1024),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors Table (Supplier management)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id_display VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL UNIQUE,
    vendor_category VARCHAR(50) CHECK (vendor_category IN ('Hardware', 'Software', 'Consumables', 'Services', 'Logistics', 'Other')),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    website VARCHAR(1024),
    preferred_vendor BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Operators Table (Site operators)
CREATE TABLE IF NOT EXISTS public.operators (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operator_id_display VARCHAR(50) NOT NULL UNIQUE,
    operator_name VARCHAR(255) NOT NULL UNIQUE,
    operator_type VARCHAR(50) NOT NULL,
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Field Reports Table (Site visit documentation)
CREATE TABLE IF NOT EXISTS public.field_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id_display VARCHAR(50) NOT NULL UNIQUE,
    site_id UUID NOT NULL REFERENCES sites(id),
    report_date DATE NOT NULL,
    submitted_by_user_id UUID NOT NULL REFERENCES personnel(id),
    submission_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_title_summary VARCHAR(255) NOT NULL,
    report_content_full TEXT NOT NULL,
    report_status VARCHAR(50) NOT NULL,
    last_modified_timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction Tables for Many-to-Many Relationships
CREATE TABLE IF NOT EXISTS public.site_partner_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id),
    partner_id UUID NOT NULL REFERENCES partners(id),
    assignment_date DATE,
    is_primary_partner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(site_id, partner_id)
);

CREATE TABLE IF NOT EXISTS public.site_vendor_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    contract_start_date DATE,
    contract_end_date DATE,
    is_active_vendor BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(site_id, vendor_id)
);

-- Equipment and ASIC Tables
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id_display VARCHAR(50) NOT NULL UNIQUE,
    equipment_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    site_id UUID REFERENCES sites(id),
    status VARCHAR(50),
    installation_date DATE,
    last_maintenance_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asic_id_display VARCHAR(50) NOT NULL UNIQUE,
    asic_model VARCHAR(255),
    serial_number VARCHAR(255),
    hash_rate NUMERIC,
    power_consumption NUMERIC,
    site_id UUID REFERENCES sites(id),
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Field Report Junction Tables
CREATE TABLE IF NOT EXISTS public.field_reports_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_report_id UUID NOT NULL REFERENCES field_reports(id),
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.field_reports_asics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_report_id UUID NOT NULL REFERENCES field_reports(id),
    asic_id UUID NOT NULL REFERENCES asics(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ADDITIONAL INDEXES FOR OPERATIONAL TABLES
-- ============================================================================

-- Sites indexes
CREATE INDEX idx_sites_active ON sites(is_active);
CREATE INDEX idx_sites_status ON sites(site_status);
CREATE INDEX idx_sites_operator ON sites(operator_id);

-- Partners indexes
CREATE INDEX idx_partners_active ON partners(is_active);
CREATE INDEX idx_partners_type ON partners(partner_type);

-- Vendors indexes
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_category ON vendors(vendor_category);
CREATE INDEX idx_vendors_preferred ON vendors(preferred_vendor);

-- Field Reports indexes
CREATE INDEX idx_field_reports_site ON field_reports(site_id);
CREATE INDEX idx_field_reports_user ON field_reports(submitted_by_user_id);
CREATE INDEX idx_field_reports_date ON field_reports(report_date);
CREATE INDEX idx_field_reports_status ON field_reports(report_status);

-- Junction table indexes
CREATE INDEX idx_site_partner_site ON site_partner_assignments(site_id);
CREATE INDEX idx_site_partner_partner ON site_partner_assignments(partner_id);
CREATE INDEX idx_site_vendor_site ON site_vendor_assignments(site_id);
CREATE INDEX idx_site_vendor_vendor ON site_vendor_assignments(vendor_id);

-- Equipment indexes
CREATE INDEX idx_equipment_site ON equipment(site_id);
CREATE INDEX idx_equipment_status ON equipment(status);

-- ASIC indexes
CREATE INDEX idx_asics_site ON asics(site_id);
CREATE INDEX idx_asics_status ON asics(status);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- 1. This schema is from PostgreSQL 15.8.1 and needs to be migrated to 16+
-- 2. The task_status_enum_new type may need adjustment in PostgreSQL 16
-- 3. All UUID fields use uuid_generate_v4() which requires uuid-ossp extension
-- 4. RLS policies shown are basic - production needs more sophisticated policies
-- 5. Additional tables exist for sites, partners, vendors, etc. not shown here
-- 6. OpenProject integration fields are present but not yet populated

-- ============================================================================
-- DATA PRESERVATION QUERIES
-- ============================================================================

-- To export data before migration:
-- pg_dump -h db.thnwlykidzhrsagyjncc.supabase.co -U postgres -d postgres --data-only > flrts_data_backup.sql

-- Count records for validation:
-- SELECT 'personnel' as table_name, COUNT(*) FROM personnel
-- UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL SELECT 'lists', COUNT(*) FROM lists
-- UNION ALL SELECT 'list_items', COUNT(*) FROM list_items
-- UNION ALL SELECT 'reminders', COUNT(*) FROM reminders
-- UNION ALL SELECT 'parsing_logs', COUNT(*) FROM parsing_logs
-- UNION ALL SELECT 'sites', COUNT(*) FROM sites
-- UNION ALL SELECT 'partners', COUNT(*) FROM partners
-- UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
-- UNION ALL SELECT 'operators', COUNT(*) FROM operators
-- UNION ALL SELECT 'field_reports', COUNT(*) FROM field_reports
-- UNION ALL SELECT 'equipment', COUNT(*) FROM equipment
-- UNION ALL SELECT 'asics', COUNT(*) FROM asics
-- UNION ALL SELECT 'site_partner_assignments', COUNT(*) FROM site_partner_assignments
-- UNION ALL SELECT 'site_vendor_assignments', COUNT(*) FROM site_vendor_assignments;