import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let geminiKey = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  try {
     const res = await fetch(url);
     const json = await res.json();
     console.log("Status:", res.status);
     console.log("Models:", json.models ? json.models.map(m=>m.name).slice(0,5) : json);
  } catch(e) {
     console.error("Fetch failed:", e);
  }
}
test();
