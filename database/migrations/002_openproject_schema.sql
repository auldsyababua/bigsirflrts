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

-- Sync function to update OpenProject users when personnel changes
CREATE OR REPLACE FUNCTION sync_personnel_to_openproject()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO openproject.users (
            flrts_user_id,
            login,
            firstname,
            lastname,
            mail,
            admin,
            status
        ) VALUES (
            NEW.id,
            LOWER(REPLACE(NEW.full_name, ' ', '.')),
            SPLIT_PART(NEW.full_name, ' ', 1),
            SPLIT_PART(NEW.full_name, ' ', 2),
            NEW.email,
            CASE WHEN NEW.role = 'admin' THEN true ELSE false END,
            CASE WHEN NEW.is_active THEN 1 ELSE 3 END
        ) ON CONFLICT (flrts_user_id) DO UPDATE SET
            firstname = EXCLUDED.firstname,
            lastname = EXCLUDED.lastname,
            mail = EXCLUDED.mail,
            admin = EXCLUDED.admin,
            status = EXCLUDED.status,
            updated_on = NOW();
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE openproject.users SET
            firstname = SPLIT_PART(NEW.full_name, ' ', 1),
            lastname = SPLIT_PART(NEW.full_name, ' ', 2),
            mail = NEW.email,
            admin = CASE WHEN NEW.role = 'admin' THEN true ELSE false END,
            status = CASE WHEN NEW.is_active THEN 1 ELSE 3 END,
            updated_on = NOW()
        WHERE flrts_user_id = NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Deletion handled by ON DELETE CASCADE
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sync trigger
CREATE TRIGGER sync_personnel_to_openproject_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.personnel
FOR EACH ROW EXECUTE FUNCTION sync_personnel_to_openproject();

-- Sync function to cache OpenProject tasks in FLRTS
CREATE OR REPLACE FUNCTION sync_openproject_tasks_to_flrts()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_id UUID;
    v_assignee_id UUID;
BEGIN
    -- Get FLRTS user IDs
    SELECT flrts_user_id INTO v_owner_id
    FROM openproject.users WHERE id = NEW.author_id;

    SELECT flrts_user_id INTO v_assignee_id
    FROM openproject.users WHERE id = NEW.assigned_to_id;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.tasks (
            openproject_id,
            owner_id,
            assignee_id,
            title,
            description,
            status,
            priority,
            due_date,
            synced_at
        ) VALUES (
            NEW.id,
            v_owner_id,
            v_assignee_id,
            NEW.subject,
            NEW.description,
            NEW.status_id::TEXT,
            NEW.priority_id,
            NEW.due_date,
            NOW()
        ) ON CONFLICT (openproject_id) DO UPDATE SET
            assignee_id = EXCLUDED.assignee_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            due_date = EXCLUDED.due_date,
            synced_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.tasks WHERE openproject_id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create task sync trigger
CREATE TRIGGER sync_openproject_tasks_trigger
AFTER INSERT OR UPDATE OR DELETE ON openproject.work_packages
FOR EACH ROW EXECUTE FUNCTION sync_openproject_tasks_to_flrts();