import express from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://thnwlykidzhrsagyjncc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

console.log('Using Supabase URL:', process.env.SUPABASE_URL);
console.log('Service key present:', !!process.env.SUPABASE_SERVICE_KEY);
// Avoid logging any part of secrets in shared logs

// OpenProject API config
const OPENPROJECT_URL = process.env.OPENPROJECT_URL || 'http://localhost:8080';
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY;

// Parameterize project ID via env and fail fast if missing/invalid
const OPENPROJECT_PROJECT_ID = Number.parseInt(
  String(process.env.OPENPROJECT_PROJECT_ID || ''),
  10
);
if (!Number.isFinite(OPENPROJECT_PROJECT_ID)) {
  throw new Error('OPENPROJECT_PROJECT_ID is required and must be a valid integer');
}

// Create axios instance for OpenProject
const openprojectAPI = axios.create({
  baseURL: `${OPENPROJECT_URL}/api/v3`,
  auth: {
    username: 'apikey',
    password: OPENPROJECT_API_KEY!,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

// Map Supabase priority to OpenProject priority
function mapPriority(supabasePriority: string | null): number {
  const priorityMap: Record<string, number> = {
    immediate: 1, // High
    high: 1, // High
    normal: 2, // Normal
    low: 3, // Low
    null: 2, // Default to Normal
  };
  return priorityMap[supabasePriority || 'normal'] || 2;
}

// Map Supabase status to OpenProject status
function mapStatus(supabaseStatus: string): number {
  const statusMap: Record<string, number> = {
    pending: 1, // New
    in_progress: 7, // In progress
    completed: 12, // Closed
    cancelled: 14, // Rejected
  };
  return statusMap[supabaseStatus] || 1;
}

// Sync a single task to OpenProject
async function syncTaskToOpenProject(task: any) {
  try {
    console.log(`Syncing task: ${task.task_title}`);

    // Prepare work package data
    const workPackageData = {
      subject: task.task_title,
      description: {
        format: 'markdown',
        raw: task.task_description_detailed || '',
      },
      _links: {
        type: { href: `/api/v3/types/1` }, // Task type
        status: { href: `/api/v3/statuses/${mapStatus(task.status)}` },
        priority: { href: `/api/v3/priorities/${mapPriority(task.priority)}` },
      },
    };

    // Add due date if present
    if (task.due_date || task.due_at) {
      workPackageData['dueDate'] = task.due_at
        ? new Date(task.due_at).toISOString().split('T')[0]
        : task.due_date;
    }

    let response;

    if (task.openproject_id) {
      // Update existing work package
      console.log(`Updating OpenProject work package ${task.openproject_id}`);
      response = await openprojectAPI.patch(
        `/work_packages/${task.openproject_id}`,
        workPackageData
      );
    } else {
      // Create new work package
      console.log('Creating new OpenProject work package');
      response = await openprojectAPI.post(
        `/projects/${OPENPROJECT_PROJECT_ID}/work_packages`,
        workPackageData
      );
    }

    // Update Supabase with OpenProject ID and sync status
    await supabase
      .from('tasks')
      .update({
        openproject_id: response.data.id,
        openproject_sync_status: 'synced',
        openproject_last_sync: new Date().toISOString(),
      })
      .eq('id', task.id);

    console.log(
      `✅ Successfully synced task ${task.id} to OpenProject work package ${response.data.id}`
    );
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error syncing task ${task.id}:`, error.response?.data || error.message);

    // Update Supabase with error status
    await supabase
      .from('tasks')
      .update({
        openproject_sync_status: 'error',
        openproject_error: error.response?.data?.message || error.message,
        openproject_last_sync: new Date().toISOString(),
      })
      .eq('id', task.id);

    throw error;
  }
}

// Webhook endpoint for Supabase database webhooks
app.post('/webhook/task', async (req, res) => {
  console.log('Received webhook:', req.body.type);

  const { type, record, old_record } = req.body;

  try {
    switch (type) {
      case 'INSERT':
      case 'UPDATE':
        await syncTaskToOpenProject(record);
        break;

      case 'DELETE':
        if (old_record?.openproject_id) {
          // Delete work package in OpenProject
          await openprojectAPI.delete(`/work_packages/${old_record.openproject_id}`);
          console.log(`Deleted OpenProject work package ${old_record.openproject_id}`);
        }
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual sync endpoint (for testing)
app.post('/sync/task/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    console.log(`Fetching task ${taskId} from Supabase...`);
    console.log(
      'Using key that starts with:',
      (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '').substring(0, 30)
    );

    // Fetch task from Supabase
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    console.log('Supabase query error:', error);
    console.log('Supabase query data:', task);

    if (error) throw error;
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await syncTaskToOpenProject(task);
    res.json({ success: true, openproject: result });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk sync endpoint (sync all pending tasks)
app.post('/sync/bulk', async (req, res) => {
  try {
    // Fetch all tasks that need syncing
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .in('openproject_sync_status', ['pending', 'error'])
      .limit(50);

    if (error) throw error;

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const task of tasks || []) {
      try {
        await syncTaskToOpenProject(task);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ taskId: task.id, error: error.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sync-service',
    openproject: OPENPROJECT_URL,
    supabase: process.env.SUPABASE_URL,
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🔄 Sync Service running on http://localhost:${PORT}`);
  console.log(`📝 Webhook endpoint: POST http://localhost:${PORT}/webhook/task`);
  console.log(`🔧 Manual sync: POST http://localhost:${PORT}/sync/task/:id`);
  console.log(`📦 Bulk sync: POST http://localhost:${PORT}/sync/bulk`);
});
