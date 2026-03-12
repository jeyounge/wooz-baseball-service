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

def get_todays_games(target_date=None):
    if not target_date:
        target_date = datetime.utcnow().strftime("%Y-%m-%d")
        
    print(f"Fetching games for {target_date}...")
    
    # URL encode the '+' sign as '%2B' for the timezone to avoid 400 Bad Request
    query_url = f"{url}/rest/v1/games?game_date=gte.{target_date}T00:00:00%2B09:00&game_date=lte.{target_date}T23:59:59%2B09:00"
    res = requests.get(query_url, headers=headers)
    if res.status_code != 200:
        print(f"Failed to fetch games: {res.text}")
    res.raise_for_status()
    
    games = res.json()
    return games

def update_games(games):
    if not games:
        print("No games scheduled for today.")
        return

    print(f"Found {len(games)} games today. Simulating status updates...")
    
    current_time = datetime.utcnow()
    
    for game in games:
        # If the game is already canceled or finished, skip it
        if game["status"] in ["canceled", "finished"]:
            print(f"Game {game['id']} is already {game['status']}. Skipping.")
            continue
            
        game_time = datetime.fromisoformat(game["game_date"].replace('Z', '+00:00'))
        
        updates = {}
        
        # Determine if we should update schedule -> live -> finished
        # For simulation, we'll fast forward based on random chance
        # Or you can replace this block with an actual API fetch later
        
        rand_val = random.random()
        
        if rand_val < 0.1:
            # 10% chance of sudden cancellation
            updates["status"] = "canceled"
            updates["cancel_reason"] = random.choice(["우천취소", "미세먼지취소", "그라운드사정"])
            print(f"Game {game['id']} canceled due to {updates['cancel_reason']}.")
        elif rand_val < 0.4:
            # 30% chance of being live
            updates["status"] = "live"
            updates["home_score"] = random.randint(0, 5)
            updates["away_score"] = random.randint(0, 5)
            print(f"Game {game['id']} is now LIVE ({updates['home_score']} : {updates['away_score']}).")
        else:
            # 60% chance of being finished
            updates["status"] = "finished"
            home = random.randint(0, 10)
            away = random.randint(0, 10)
            # Avoid ties for simplicity
            if home == away:
                home += 1
            updates["home_score"] = home
            updates["away_score"] = away
            print(f"Game {game['id']} is FINISHED ({updates['home_score']} : {updates['away_score']}).")
            
        # Push the update to Supabase
        update_url = f"{url}/rest/v1/games?id=eq.{game['id']}"
        try:
            res = requests.patch(update_url, json=updates, headers=headers)
            res.raise_for_status()
        except requests.exceptions.HTTPError as e:
            print(f"Failed to update game {game['id']}: {e.response.text}")
        except Exception as e:
            print(f"Error updating game {game['id']}: {e}")

if __name__ == "__main__":
    # We will test update on March 24, 2026 since we seeded that day.
    # In production, this would just be: get_todays_games()
    test_date = "2026-03-24"
    print(f"Starting Daily Update Job for {test_date} MVP...")
    todays_games = get_todays_games(test_date)
    update_games(todays_games)
    print("Daily Update Job Complete.")
