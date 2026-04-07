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
     const { data: existing, error: dbErr } = await supabase.from('predictions').select('*').eq('game_id', gameId).maybeSingle();
     
     const { data: game } = await supabase.from('games').select(`
        id, game_date, stadium, home_pitcher, away_pitcher,
        home:teams!home_team_id(name), away:teams!away_team_id(name)
      `).eq('id', gameId).single();
     if (!game) throw new Error("Game not found");
     
     let predictionData = null;
     if (genAI) {
        console.log("Using Gemini key:", geminiKey.substring(0,5) + "...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const prompt = `...`;
        
        console.log("Generating...");
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        console.log("Gemini Output:", responseText);
        
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
        predictionData = JSON.parse(cleanJson);
     }
     
     console.log("Success", predictionData);
  } catch(e) {
     console.error("CAUGHT:", e);
  }
}
test();
