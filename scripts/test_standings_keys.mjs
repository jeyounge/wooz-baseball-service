import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function checkStandingsTypes() {
   const { data } = await supabase.from('standings').select('*').limit(1);
   console.log("Standings keys:", Object.keys(data[0]));
}
checkStandingsTypes();
