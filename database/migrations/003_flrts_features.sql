-- Migration: 003_flrts_features
-- Description: Additional FLRTS features - templates, sharing, notifications
-- Date: 2025-01-14
-- PostgreSQL Version: 15.8

-- List templates table
CREATE TABLE IF NOT EXISTS public.list_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    template_items JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON public.list_templates(category);
CREATE INDEX idx_templates_public ON public.list_templates(is_public);
CREATE INDEX idx_templates_tags ON public.list_templates USING GIN(tags);
CREATE INDEX idx_templates_usage ON public.list_templates(usage_count DESC);

-- List sharing and permissions
CREATE TABLE IF NOT EXISTS public.list_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    shared_with_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit', 'admin')),
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.personnel(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_list_user_share UNIQUE(list_id, shared_with_id)
);

CREATE INDEX idx_shares_list ON public.list_shares(list_id);
CREATE INDEX idx_shares_user ON public.list_shares(shared_with_id);
CREATE INDEX idx_shares_token ON public.list_shares(share_token);
CREATE INDEX idx_shares_expires ON public.list_shares(expires_at);

-- Notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reminder', 'task', 'list', 'system')),
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email', 'sms', 'push')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    payload JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON public.notification_queue(recipient_id);
CREATE INDEX idx_notif_scheduled ON public.notification_queue(scheduled_for);
CREATE INDEX idx_notif_status ON public.notification_queue(status);
CREATE INDEX idx_notif_priority ON public.notification_queue(priority DESC);
CREATE INDEX idx_notif_type_channel ON public.notification_queue(type, channel);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email', 'sms', 'push')),
    enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_days INTEGER[] DEFAULT '{}',
    batch_window_minutes INTEGER DEFAULT 15,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_channel_pref UNIQUE(user_id, channel)
);

CREATE INDEX idx_pref_user ON public.notification_preferences(user_id);
CREATE INDEX idx_pref_channel ON public.notification_preferences(channel);

-- Telegram sessions table
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    context JSONB DEFAULT '{}',
    last_command TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tg_session_user ON public.telegram_sessions(user_id);
CREATE INDEX idx_tg_session_chat ON public.telegram_sessions(chat_id);
CREATE INDEX idx_tg_session_expires ON public.telegram_sessions(expires_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Lists RLS policies
CREATE POLICY "Users can view their own lists" ON public.lists
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view shared lists" ON public.lists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.list_shares
            WHERE list_id = lists.id
            AND shared_with_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own lists" ON public.lists
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own lists" ON public.lists
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own lists" ON public.lists
    FOR DELETE USING (owner_id = auth.uid());

-- Reminders RLS policies
CREATE POLICY "Users can view their own reminders" ON public.reminders
    FOR SELECT USING (owner_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY "Users can create reminders" ON public.reminders
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own reminders" ON public.reminders
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own reminders" ON public.reminders
    FOR DELETE USING (owner_id = auth.uid());

-- Notification preferences RLS policies
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Update triggers for new tables
CREATE TRIGGER update_templates_timestamp BEFORE UPDATE ON public.list_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shares_timestamp BEFORE UPDATE ON public.list_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_preferences_timestamp BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();