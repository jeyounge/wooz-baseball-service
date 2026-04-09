import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let geminiKey = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const genAI = new GoogleGenerativeAI(geminiKey);

async function testModel() {
  const modelName = "gemini-1.5-flash"; // Let's try a standard one
  console.log("Testing model:", modelName);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  try {
    const result = await model.generateContent("Hello?");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Failed:", err);
  }
}

testModel();
