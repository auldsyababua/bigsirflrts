-- Migration: 001_initial_schema
-- Description: Initial FLRTS database schema setup
-- Date: 2025-01-14
-- PostgreSQL Version: 15.8

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS openproject;
COMMENT ON SCHEMA openproject IS 'OpenProject tables and data';

-- Personnel table (FLRTS users)
CREATE TABLE IF NOT EXISTS public.personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_user_id BIGINT UNIQUE NOT NULL,
    telegram_username TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'worker', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personnel_telegram_user_id ON public.personnel(telegram_user_id);
CREATE INDEX idx_personnel_role ON public.personnel(role);
CREATE INDEX idx_personnel_active ON public.personnel(is_active);

-- Sites table
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    location JSONB,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_code ON public.sites(code);
CREATE INDEX idx_sites_aliases ON public.sites USING GIN(aliases);

-- Contractors table
CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_info JSONB DEFAULT '{}',
    sites UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contractors_code ON public.contractors(code);

-- Lists table
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checklist', 'shopping', 'inventory', 'custom')),
    items JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    is_shared BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_list_name_per_owner UNIQUE(owner_id, name)
);

CREATE INDEX idx_lists_owner ON public.lists(owner_id);
CREATE INDEX idx_lists_type ON public.lists(type);
CREATE INDEX idx_lists_tags ON public.lists USING GIN(tags);
CREATE INDEX idx_lists_items ON public.lists USING GIN(items);

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    reminder_at TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_owner ON public.reminders(owner_id);
CREATE INDEX idx_reminders_assignee ON public.reminders(assignee_id);
CREATE INDEX idx_reminders_due_at ON public.reminders(due_at);
CREATE INDEX idx_reminders_status ON public.reminders(status);

-- Tasks cache table (synced from OpenProject)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    openproject_id INTEGER UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority INTEGER DEFAULT 3,
    due_date DATE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_openproject_id ON public.tasks(openproject_id);
CREATE INDEX idx_tasks_owner ON public.tasks(owner_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_personnel_timestamp BEFORE UPDATE ON public.personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sites_timestamp BEFORE UPDATE ON public.sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contractors_timestamp BEFORE UPDATE ON public.contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lists_timestamp BEFORE UPDATE ON public.lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reminders_timestamp BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_timestamp BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();