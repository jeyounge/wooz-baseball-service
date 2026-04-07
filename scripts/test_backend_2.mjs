import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '', geminiKey = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
  if(line.startsWith('GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const supabase = createClient(url, key);
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

async function test() {
  const gameId = '2316';
  try {
     const { data: existing, error: dbErr } = await supabase.from('game_predictions').select('*').eq('game_id', gameId).maybeSingle();
     
     const { data: game } = await supabase.from('games').select(`
        id, game_date, stadium, home_pitcher, away_pitcher,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `).eq('id', gameId).single();
     
     if (!game) throw new Error("Game not found");
     
     if (genAI) {
        console.log("Using Gemini:", geminiKey.substring(0,5));
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, {
           generationConfig: { responseMimeType: "application/json" }
        });
        const prompt = `당신은 KBO AI입니다. 아래 JSON으로 리턴하세요. {"situation": "test", "starter_pitcher": "test", "bullpen": "test", "batting": "test", "conclusion": "test", "pick_1": "test", "pick_2": "test", "pick_3": "test"}`;
        
        console.log("Generating...");
        const result = await model.generateContent(prompt);
        console.log("Raw Output:", result.response.text());
     }
  } catch(e) {
     console.error("CAUGHT:", e);
  }
}
test();
