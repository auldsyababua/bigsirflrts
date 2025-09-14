/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://thnwlykidzhrsagyjncc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

console.log('URL:', process.env.SUPABASE_URL);
console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('Anon key exists:', !!process.env.SUPABASE_ANON_KEY);

async function test() {
  try {
    // Try a simple query
    const { data, error } = await supabase.from('tasks').select('id, task_title').limit(1);

    console.log('Query result:', { data, error });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
