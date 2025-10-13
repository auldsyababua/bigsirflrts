-- Migration: 002_openproject_schema
-- Description: OpenProject schema with foreign key to FLRTS personnel
-- Date: 2025-01-14
-- PostgreSQL Version: 15.8

-- OpenProject users table (duplicates personnel with FK)
CREATE TABLE IF NOT EXISTS openproject.users (
    id SERIAL PRIMARY KEY,
    flrts_user_id UUID UNIQUE REFERENCES public.personnel(id) ON DELETE CASCADE,
    login TEXT UNIQUE NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    mail TEXT,
    admin BOOLEAN DEFAULT false,
    status INTEGER DEFAULT 1,
    language TEXT DEFAULT 'en',
    created_on TIMESTAMPTZ DEFAULT NOW(),
    updated_on TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_op_users_flrts_id ON openproject.users(flrts_user_id);
CREATE INDEX idx_op_users_login ON openproject.users(login);

-- OpenProject projects table
CREATE TABLE IF NOT EXISTS openproject.projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    identifier TEXT UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT false,
    parent_id INTEGER REFERENCES openproject.projects(id) ON DELETE CASCADE,
    created_on TIMESTAMPTZ DEFAULT NOW(),
    updated_on TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_op_projects_identifier ON openproject.projects(identifier);
CREATE INDEX idx_op_projects_parent ON openproject.projects(parent_id);

-- OpenProject work packages (tasks)
CREATE TABLE IF NOT EXISTS openproject.work_packages (
    id SERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL REFERENCES openproject.projects(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    category_id INTEGER,
    status_id INTEGER NOT NULL,
    assigned_to_id INTEGER REFERENCES openproject.users(id) ON DELETE SET NULL,
    priority_id INTEGER DEFAULT 3,
    author_id INTEGER NOT NULL REFERENCES openproject.users(id),
    lock_version INTEGER DEFAULT 0,
    done_ratio INTEGER DEFAULT 0,
    estimated_hours FLOAT,
    parent_id INTEGER REFERENCES openproject.work_packages(id) ON DELETE CASCADE,
    root_id INTEGER,
    lft INTEGER,
    rgt INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_op_wp_project ON openproject.work_packages(project_id);
CREATE INDEX idx_op_wp_assigned ON openproject.work_packages(assigned_to_id);
CREATE INDEX idx_op_wp_author ON openproject.work_packages(author_id);
CREATE INDEX idx_op_wp_status ON openproject.work_packages(status_id);
CREATE INDEX idx_op_wp_parent ON openproject.work_packages(parent_id);
CREATE INDEX idx_op_wp_due_date ON openproject.work_packages(due_date);

-- ============================================================================
-- REMOVED: Database triggers for bidirectional sync
-- ============================================================================
--
-- Reason: Enforcing API-only architecture to prevent infinite loops and
-- maintain single source of truth (OpenProject).
--
-- Previous triggers removed (10N-171):
-- 1. sync_personnel_to_openproject_trigger
-- 2. sync_openproject_tasks_trigger
--
-- Architecture Decision:
-- - All writes to OpenProject go through sync-service API calls
-- - sync-service is the single source of truth for sync operations
-- - No database triggers to prevent dual-write consistency issues
-- - public.tasks table remains as optional read cache (write-only from sync-service)
--
-- Benefits:
-- - No infinite loop risk when OpenProject UI is manually edited
-- - Single source of truth (OpenProject via API)
-- - Explicit control over all sync operations
-- - Simpler debugging and maintenance
--
-- See: Linear issue 10N-171 for full architectural discussion
-- ============================================================================