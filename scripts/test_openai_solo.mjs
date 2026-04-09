import OpenAI from 'openai';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

async function testOpenAI() {
  console.log("Starting OpenAI test...");
  try {
     const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
     const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'working'" }],
     });
     console.log("OpenAI result:", res.choices[0].message.content);
  } catch(e) { 
     console.error("OpenAI FULL ERROR:", e); 
  }
}
testOpenAI();
