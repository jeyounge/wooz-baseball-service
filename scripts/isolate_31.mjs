import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['\"]/g, '');
});

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function isolateTest() {
  console.log("--- 🏁 Gemini 3.1 Pro 격리 테스트 시작 ---");
  const testModels = [
    "models/gemini-3.1-pro",
    "models/gemini-3.1-flash",
    "gemini-3.1-pro",
    "gemini-3.1-flash",
    "models/gemini-2.0-flash-exp", // 2026년 기준 백업
    "models/gemini-1.5-pro-latest"
  ];

  for(const modelName of testModels) {
    try {
      console.log(`\n[테스트] 모델: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("KBO 야구에 대해 한글로 짧게 말해줘.");
      console.log(`✅ ${modelName} 호출 성공! :`, result.response.text().substring(0, 50));
      return; // 하나라도 성공하면 종료
    } catch (err) {
      console.error(`❌ ${modelName} 실패:`, err.message);
    }
  }
}

isolateTest();
