import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying Supabase...');
  const { data: groups } = await supabase.from('groups').select('*');
  console.log('\n--- GROUPS ---');
  console.log(groups);
  
  const { data: members } = await supabase.from('group_members').select('*');
  console.log('\n--- MEMBERS ---');
  console.log(members);
  
  const { data: expenses } = await supabase.from('expenses').select('*');
  console.log('\n--- EXPENSES ---');
  console.log(expenses);
  
  const { data: requests } = await supabase.from('payment_requests').select('*');
  console.log('\n--- PAYMENT REQUESTS ---');
  console.log(requests);
}

run().catch(console.error);
