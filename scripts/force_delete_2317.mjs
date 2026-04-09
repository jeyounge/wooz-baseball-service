import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkAndClean() {
  console.log("Checking prediction for 2317...");
  const { data } = await supabase.from('game_predictions').select('*').eq('game_id', 2317).maybeSingle();
  
  if (data) {
    console.log("Found entry. Content snippet:", data.conclusion.substring(0, 50));
    console.log("Deleting...");
    const { error } = await supabase.from('game_predictions').delete().eq('game_id', 2317);
    if (!error) console.log("Successfully deleted 2317.");
    else console.error("Deletion failed:", error);
  } else {
    console.log("No entry found for 2317. It was either already deleted or never existed under this ID.");
  }
}

checkAndClean();
