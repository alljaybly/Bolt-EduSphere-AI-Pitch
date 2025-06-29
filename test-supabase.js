import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL || 'Missing');
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('clerk_id').limit(1);
    if (error) {
      console.error('Supabase error:', error);
      return;
    }
    console.log('Supabase response:', { data });
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

test();