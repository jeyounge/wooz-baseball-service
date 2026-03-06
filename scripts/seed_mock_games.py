import os
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def get_teams():
    # Fetch team IDs to link games
    response = requests.get(f"{url}/rest/v1/teams?select=id,name", headers=headers)
    response.raise_for_status()
    return response.json()

def seed_games(teams):
    if len(teams) < 10:
        print("Team data not fully loaded.")
        return

    print("Seeding MVP Games logic (Dummy recent/live games)...")
    
    # Map teams by name for easy assignment
    team_dict = {t['name']: t['id'] for t in teams}
    
    # Let's create a few scheduled, live, and finished games
    today = datetime.utcnow()
    
    games = [
        # Finished Games
        {
            "home_team_id": team_dict["KIA 타이거즈"], "away_team_id": team_dict["삼성 라이온즈"],
            "game_date": (today - timedelta(days=1)).isoformat(), "stadium": "광주", "status": "finished",
            "home_score": 5, "away_score": 3
        },
        {
            "home_team_id": team_dict["LG 트윈스"], "away_team_id": team_dict["두산 베어스"],
            "game_date": (today - timedelta(days=1)).isoformat(), "stadium": "잠실", "status": "finished",
            "home_score": 2, "away_score": 8
        },
        
        # Live Games
        {
            "home_team_id": team_dict["SSG 랜더스"], "away_team_id": team_dict["NC 다이노스"],
            "game_date": today.isoformat(), "stadium": "문학", "status": "live",
            "home_score": 4, "away_score": 4
        },
        {
            "home_team_id": team_dict["한화 이글스"], "away_team_id": team_dict["롯데 자이언츠"],
            "game_date": today.isoformat(), "stadium": "대전", "status": "live",
            "home_score": 1, "away_score": 0
        },

        # Scheduled Games
        {
            "home_team_id": team_dict["KT 위즈"], "away_team_id": team_dict["키움 히어로즈"],
            "game_date": (today + timedelta(days=1)).isoformat(), "stadium": "수원", "status": "scheduled",
            "home_score": 0, "away_score": 0
        }
    ]

    for game in games:
        try:
            response = requests.post(f"{url}/rest/v1/games", json=game, headers=headers)
            response.raise_for_status()
            print(f"Inserted game: {game['status']} in {game['stadium']}")
        except Exception as e:
            print(f"Error inserting game: {e}")

    print("Finished seeding MVP dummy games via REST API.")

def main():
    print("Starting Woozet Game Seed Loader...")
    teams = get_teams()
    seed_games(teams)

if __name__ == "__main__":
    main()
