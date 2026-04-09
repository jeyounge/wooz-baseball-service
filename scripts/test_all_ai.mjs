import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Groq } from 'groq-sdk';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

async function testAll() {
  const prompt = "Please reply with {'test': 'success'} in JSON format.";

  // 1. Gemini
  console.log("--- Testing Gemini ---");
  try {
     const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
     const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" }, { generationConfig: { responseMimeType: "application/json" } });
     const res = await model.generateContent(prompt);
     console.log("Gemini:", res.response.text());
  } catch(e) { console.error("Gemini Error:", e.message); }

  // 2. OpenAI
  console.log("\n--- Testing OpenAI ---");
  try {
     const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
     const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
     });
     console.log("OpenAI:", res.choices[0].message.content);
  } catch(e) { console.error("OpenAI Error:", e.message); }

  // 3. Groq
  console.log("\n--- Testing Groq ---");
  try {
     const groq = new Groq({ apiKey: env.GROQ_API_KEY });
     const res = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-70b-8192",
        response_format: { type: "json_object" }
     });
     console.log("Groq:", res.choices[0].message.content);
  } catch(e) { console.error("Groq Error:", e.message); }
}

testAll();
