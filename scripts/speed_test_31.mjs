import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['\"]/g, '');
});

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function speedTest() {
  console.log("--- ⚡ Gemini 3.1 속도/병목 진단 시작 ---");
  
  const modelsToTest = [
    { name: "models/gemini-3.1-pro-preview", useTools: false },
    { name: "models/gemini-3.1-pro-preview", useTools: true },
    { name: "models/gemini-3.1-flash-lite-preview", useTools: true }
  ];

  for(const config of modelsToTest) {
    try {
      const start = Date.now();
      console.log(`\n[테스트] ${config.name} (Search: ${config.useTools}) 호출 중...`);
      
      const modelOptions = { model: config.name };
      if (config.useTools) {
        modelOptions.tools = [{ googleSearch: {} }];
      }

      const model = genAI.getGenerativeModel(modelOptions, { apiVersion: "v1beta" });
      const result = await model.generateContent("KBO 이번 시즌 주요 이슈는?");
      const end = Date.now();
      
      console.log(`✅ 성공! 소요 시간: ${(end - start) / 1000}초`);
      console.log(`응답 요약: ${result.response.text().substring(0, 50)}...`);
    } catch (err) {
      console.error(`❌ 실패: ${err.message}`);
    }
  }
}

speedTest();
