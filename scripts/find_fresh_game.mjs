import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function findNewGame() {
  const { data: predictions } = await supabase.from('game_predictions').select('game_id');
  const existingIds = predictions.map(p => p.game_id);
  
  const { data: games } = await supabase.from('games').select('id').not('id', 'in', `(${existingIds.join(',')})`).limit(1);
  
  if (games && games.length > 0) {
    console.log("Found fresh game for AI test:", games[0].id);
  } else {
    console.log("No fresh games found.");
  }
}
findNewGame();
