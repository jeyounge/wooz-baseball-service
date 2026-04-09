import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function diagnose() {
  console.log("--- 🕵️‍♂️ Gemini 3.1 Pro 정밀 진단 시작 ---");
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    const models = list.models.map(m => m.name);
    console.log("가용 모델 리스트:", models.filter(m => m.includes('gemini')));

    const targetModel = models.find(m => m.includes('3.1-pro')) || "models/gemini-2.0-flash-001";
    console.log(`선택된 테스트 모델: ${targetModel}`);

    const model = genAI.getGenerativeModel({ model: targetModel });
    const result = await model.generateContent("hello");
    console.log("✅ 모델 응답 성공:", result.response.text());
  } catch (err) {
    console.error("❌ 진단 실패 상세 로그:");
    console.error("에러 메시지:", err.message);
    if (err.stack) console.error("스택 추적:", err.stack);
  }
}

diagnose();
