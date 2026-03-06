import os
import requests
from dotenv import load_dotenv

# Load environment variables from Next.js .env.local
load_dotenv(dotenv_path="../.env.local")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def scrape_kbo_teams():
    print("Scraping KBO Team info (Using REST API fallback)...")
    
    teams = [
        {"name": "KIA 타이거즈", "city": "광주", "founded_year": 1982, "home_stadium": "광주-기아 챔피언스 필드"},
        {"name": "삼성 라이온즈", "city": "대구", "founded_year": 1982, "home_stadium": "대구 삼성 라이온즈 파크"},
        {"name": "LG 트윈스", "city": "서울", "founded_year": 1990, "home_stadium": "서울종합운동장 야구장"},
        {"name": "두산 베어스", "city": "서울", "founded_year": 1982, "home_stadium": "서울종합운동장 야구장"},
        {"name": "KT 위즈", "city": "수원", "founded_year": 2013, "home_stadium": "수원케이티위즈파크"},
        {"name": "SSG 랜더스", "city": "인천", "founded_year": 2000, "home_stadium": "인천SSG랜더스필드"},
        {"name": "롯데 자이언츠", "city": "부산", "founded_year": 1982, "home_stadium": "사직 야구장"},
        {"name": "한화 이글스", "city": "대전", "founded_year": 1985, "home_stadium": "대전 한화생명 이글스파크"},
        {"name": "NC 다이노스", "city": "창원", "founded_year": 2011, "home_stadium": "창원 NC 파크"},
        {"name": "키움 히어로즈", "city": "서울", "founded_year": 2008, "home_stadium": "고척 스카이돔"},
    ]

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    for team in teams:
        print(f"Inserting team: {team['name']}")
        try:
            response = requests.post(f"{url}/rest/v1/teams", json=team, headers=headers)
            response.raise_for_status()
        except Exception as e:
            print(f"Error inserting {team['name']}: {e}")

    print("Finished loading basic team info via REST API.")

def main():
    print("Starting Woozet Initial Data Loader...")
    scrape_kbo_teams()

if __name__ == "__main__":
    main()
