import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function testFetch() {
  const gameId = 2605; // Today's ID from previous log
  const { data: game, error } = await supabase
      .from('games')
      .select(`
        id, game_date, stadium, home_pitcher, away_pitcher,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `)
      .eq('id', gameId)
      .single();
      
  console.log("Game:", JSON.stringify(game, null, 2));
  console.log("Error:", error);
}

testFetch();
