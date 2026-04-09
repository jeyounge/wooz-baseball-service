import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let geminiKey = '';
envFile.split('\n').forEach(line => {
  if(line.startsWith('GEMINI_API_KEY=')) geminiKey = line.split('=')[1].trim().replace(/['"]/g, '');
});

const genAI = new GoogleGenerativeAI(geminiKey);

async function testModel() {
  const modelName = "gemini-2.0-flash-001";
  console.log("Testing model:", modelName);
  const model = genAI.getGenerativeModel({ model: modelName }, {
     generationConfig: { responseMimeType: "application/json" }
  });
  
  try {
    const prompt = `당신은 야구 전문가입니다. {"test": "ok"} JSON으로 리턴하세요.`;
    const result = await model.generateContent(prompt);
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("DEBUG ERROR:", err);
  }
}

testModel();
