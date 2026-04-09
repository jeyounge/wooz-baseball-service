import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

// .env.local에서 API 키 로드
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key) env[key.trim()] = val.join('=').trim().replace(/['\"]/g, '');
});

const API_KEY = env.GEMINI_API_KEY || ""; 

if (!API_KEY) {
  console.error("❌ 에러: GEMINI_API_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

async function listAvailableModels() {
  try {
    console.log("🔍 [WOOZ-SCAN] 현재 API KEY로 접근 가능한 모델 리스트를 불러오는 중...");
    
    // 유저님이 주신 fetch 방식 적극 활용
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API 호출 에러:", data.error.message);
      return;
    }

    console.log("\n==================================================");
    console.log(`✅ 확인된 모델 총 개수: ${data.models.length}개`);
    console.log("==================================================\n");

    data.models.forEach((model) => {
      // 3.1이나 Pro가 포함된 모델을 우선적으로 로깅
      if (model.name.includes('3.1') || model.name.includes('pro')) {
        console.log(`📌 모델명(ID): ${model.name}`);
        console.log(`   표시 이름: ${model.displayName}`);
        console.log(`   지원 기능: ${model.supportedGenerationMethods.join(", ")}`);
        console.log("--------------------------------------------------");
      }
    });

    // 전체 리스트도 파일로 저장 (분석용)
    fs.writeFileSync('full_models_report.json', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("❌ 예상치 못한 오류 발생:", error);
  }
}

listAvailableModels();
