import { Groq } from 'groq-sdk';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

async function testGroq() {
  console.log("Starting Groq test...");
  try {
     const groq = new Groq({ apiKey: env.GROQ_API_KEY });
     const res = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Say 'working'" }],
        model: "llama3-70b-8192",
     });
     console.log("Groq result:", res.choices[0].message.content);
  } catch(e) { 
     console.error("Groq FULL ERROR:", e); 
  }
}
testGroq();
