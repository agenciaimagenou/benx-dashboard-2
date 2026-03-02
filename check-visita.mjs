import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('c:/Users/David Pc/.antigravity/Benx/dashboard/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('visita').select('*').limit(3);
if (error) { console.error('ERROR:', error); process.exit(1); }
if (data && data.length > 0) {
  console.log('COLUMNS:', Object.keys(data[0]).join('\n'));
  console.log('\nSAMPLE:', JSON.stringify(data[0], null, 2));
} else {
  console.log('No rows found');
}
