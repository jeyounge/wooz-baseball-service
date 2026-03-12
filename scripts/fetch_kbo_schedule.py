import os
import requests
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv("../.env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def get_teams():
    response = requests.get(f"{url}/rest/v1/teams?select=id,name,home_stadium", headers=headers)
    response.raise_for_status()
    teams = response.json()
    return {t['name']: t for t in teams}

def seed_mock_2026_schedule():
    print("Generating Mock 2026 KBO Schedule MVP data...")
    team_dict = get_teams()
    team_names = list(team_dict.keys())
    print(f"Loaded {len(team_names)} teams.")
    
    if len(team_names) < 10:
        print("Error: Need 10 teams loaded in DB.")
        return

    # Generate roughly 2 weeks of fake schedule for demonstration purposes
    # Starting from 2026-03-24 (Typical KBO opening week)
    
    start_date = datetime(2026, 3, 24, 18, 30)
    all_games = []
    
    # Generate 14 days of games
    for day_offset in range(14):
        current_date_dt = start_date + timedelta(days=day_offset)
        # Skip Mondays (usually no KBO games on Monday)
        if current_date_dt.weekday() == 0:
            continue
            
        # We need 5 matchups per day for 10 teams
        daily_teams = team_names.copy()
        random.shuffle(daily_teams)
        
        matchups = [
            (daily_teams[0], daily_teams[1]),
            (daily_teams[2], daily_teams[3]),
            (daily_teams[4], daily_teams[5]),
            (daily_teams[6], daily_teams[7]),
            (daily_teams[8], daily_teams[9])
        ]
        
        # Weekend games start earlier
        if current_date_dt.weekday() == 5: # Sat
            game_time = current_date_dt.replace(hour=17, minute=0)
        elif current_date_dt.weekday() == 6: # Sun
            game_time = current_date_dt.replace(hour=14, minute=0)
        else:
            game_time = current_date_dt
            
        for home_name, away_name in matchups:
            home_team = team_dict[home_name]
            away_team = team_dict[away_name]
            
            game_date_iso = game_time.strftime("%Y-%m-%dT%H:%M:00+09:00")
            
            # Let's add some variety to the status
            # Some earlier games might be canceled for testing the new column
            status = "scheduled"
            cancel_reason = None
            
            if day_offset == 2 and random.random() > 0.5:
                status = "canceled"
                cancel_reason = random.choice(["우천취소", "미세먼지취소", "그라운드사정"])
            
            game = {
                "home_team_id": home_team['id'],
                "away_team_id": away_team['id'],
                "game_date": game_date_iso,
                "stadium": home_team.get('home_stadium', '홈구장'),
                "status": status,
                "cancel_reason": cancel_reason,
                "home_score": 0,
                "away_score": 0
            }
            all_games.append(game)

    print(f"Generated {len(all_games)} mock games for 2026.")

    # Insert games into Supabase
    success_count = 0
    error_count = 0
    
    for idx, game in enumerate(all_games):
        try:
            res = requests.post(f"{url}/rest/v1/games", json=game, headers=headers)
            res.raise_for_status()
            success_count += 1
            if idx % 10 == 0:
                print(f"Inserted {idx} games...")
        except requests.exceptions.HTTPError as e:
            error_count += 1
            print(f"HTTP Error inserting game: {e}")
            if e.response is not None:
                print(e.response.text)
        except Exception as e:
            error_count += 1
            print(f"Error inserting game: {e}")

    print(f"Successfully inserted: {success_count} games.")
    print(f"Errors/Skipped: {error_count} games.")

if __name__ == "__main__":
    seed_mock_2026_schedule()
