import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);

async function testPredict() {
  const today = '2026-04-08';
  const { data: games } = await supabase
    .from('games')
    .select('id, game_date')
    .gte('game_date', `${today}T00:00:00+09:00`)
    .limit(1);

  if (!games || games.length === 0) {
    console.log("No games found for today.");
    return;
  }

  const gameId = games[0].id;
  console.log("Testing with Game ID:", gameId);

  try {
    const res = await fetch('http://localhost:3000/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testPredict();
