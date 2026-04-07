import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let geminiKey = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const genAI = new GoogleGenerativeAI(geminiKey);

async function test() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
     const result = await model.generateContent("Hello?");
     console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch(e) {
     console.error("Flash failed:", e);
  }
}
test();
