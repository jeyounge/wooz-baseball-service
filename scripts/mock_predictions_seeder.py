import os
import requests
import random
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

def get_games():
    # Fetch all games without predictions
    response = requests.get(f"{url}/rest/v1/games?select=id,status,home_team_id,away_team_id", headers=headers)
    response.raise_for_status()
    return response.json()

def seed_predictions(games):
    if not games:
        print("No games found to predict.")
        return

    print("Seeding AI Predictions (Dummy Data) for games...")
    
    for game in games:
        # Simulate AI algorithm output
        # E.g., home win probability between 30% and 70%
        base_home_prob = random.uniform(30.0, 70.0)
        home_prob = round(base_home_prob, 2)
        away_prob = round(100.0 - home_prob, 2)
        
        # Determine likely score scenario based on probability
        home_score = random.randint(1, 8)
        away_score = random.randint(1, 8)
        
        # Adjust predicted score based on probabilities to look somewhat realistic
        if home_prob > away_prob:
            home_score = max(home_score, away_score + random.randint(1,4))
        else:
            away_score = max(away_score, home_score + random.randint(1,4))
            
        prediction = {
            "game_id": game['id'],
            "home_win_prob": home_prob,
            "away_win_prob": away_prob,
            "predicted_score": f"{home_score}:{away_score}",
            "ai_model_version": "v1.0.0-mvp"
        }

        try:
            # Check if prediction exists to prevent dupes (basic method)
            check = requests.get(f"{url}/rest/v1/predictions?game_id=eq.{game['id']}", headers=headers).json()
            if len(check) == 0:
                response = requests.post(f"{url}/rest/v1/predictions", json=prediction, headers=headers)
                response.raise_for_status()
                print(f"Generated Prediction for Game {game['id']}: H({home_prob}%) vs A({away_prob}%) -> {home_score}:{away_score}")
            else:
                print(f"Prediction for Game {game['id']} already exists. Skipping.")
        except Exception as e:
            print(f"Error predicting game {game['id']}: {e}")

    print("Finished seeding AI Predictions.")

def main():
    print("Starting Woozet ML Simulation Loader...")
    games = get_games()
    seed_predictions(games)

if __name__ == "__main__":
    main()
