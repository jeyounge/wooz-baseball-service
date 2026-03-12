import os
import requests
import json
from bs4 import BeautifulSoup
from datetime import datetime
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

team_name_map = {
    "KIA": "KIA 타이거즈",
    "삼성": "삼성 라이온즈",
    "LG": "LG 트윈스",
    "두산": "두산 베어스",
    "KT": "KT 위즈",
    "SSG": "SSG 랜더스",
    "롯데": "롯데 자이언츠",
    "한화": "한화 이글스",
    "NC": "NC 다이노스",
    "키움": "키움 히어로즈",
}

def get_teams():
    res = requests.get(f"{url}/rest/v1/teams?select=id,name", headers=headers)
    res.raise_for_status()
    teams = res.json()
    return {t['name']: t['id'] for t in teams}

def fetch_real_kbo_month(year, month, team_dict):
    print(f"Fetching real KBO schedule from ASMX API for {year}-{month}...")
    api_url = "https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList"
    
    # KBO parameters
    data = {
        "leId": "1", # KBO Regular Season usually? 1=KBO, 2=Futures? Or maybe 1 is regular
        "srIdList": "0,9", # 0,9,6 for regular, exhibition, postseason etc.
        "seasonId": str(year),
        "gameMonth": str(month).zfill(2),
        "teamId": ""
    }
    
    try:
        res = requests.post(api_url, data=data)
        res_json = res.json()
        
        # The response has a "rows" array. Each row has a "row" array which represents the columns (td equivalent)
        games = []
        seen_games = set()
        
        if not res_json.get('rows'):
            return []
            
        current_date_str = ""
        
        for row_item in res_json['rows']:
            cols = row_item.get('row', [])
            if not cols:
                continue
            
            # The structure from KBO is exactly like the HTML table.
            # 1st game of the day has 9 items (includes Date column)
            # Subsequent games have 8 items
            
            # Let's clean the HTML tags from the Text values
            clean_cols = [BeautifulSoup(c.get('Text', ''), 'html.parser').get_text(separator=' ', strip=True) for c in cols]
            
            if len(clean_cols) == 9:
                date_part = clean_cols[0][:5] # e.g. "04.01"
                current_date_str = f"{year}-{date_part.replace('.', '-')}"
                time_str = clean_cols[1]
                play_str = clean_cols[2]
                stadium = clean_cols[7]
                status_summary = clean_cols[8]
            elif len(clean_cols) == 8:
                time_str = clean_cols[0]
                play_str = clean_cols[1]
                stadium = clean_cols[6]
                status_summary = clean_cols[7]
            else:
                continue
                
            if "프로야구 경기가 없습니다" in play_str or "vs" not in play_str:
                continue
                
            away_raw, home_raw = [t.strip() for t in play_str.split("vs")]
            away_team_name = team_name_map.get(away_raw, away_raw)
            home_team_name = team_name_map.get(home_raw, home_raw)

            if away_team_name not in team_dict or home_team_name not in team_dict:
                continue
                
            home_id = team_dict[home_team_name]
            away_id = team_dict[away_team_name]
            
            status = "scheduled"
            cancel_reason = None
            home_score = 0
            away_score = 0
            
            if "취소" in status_summary:
                status = "canceled"
                cancel_reason = status_summary
            elif "특별 콜드" in status_summary or "종료" in status_summary or len(status_summary) <= 2:
                # Need to check if there are scores in the team names? KBO puts scores usually somewhere else, but for future games score is 0
                # Wait, KBO ASMX puts the scores inside play_str if played? e.g. "KIA 5 vs 3 삼성"
                # Let's use regex to extract possible scores
                import re
                score_match = re.search(r'([^\d]+)\s*(\d+)\s*vs\s*(\d+)\s*([^\d]+)', play_str)
                if score_match:
                    away_raw = score_match.group(1).strip()
                    away_score = int(score_match.group(2))
                    home_score = int(score_match.group(3))
                    home_raw = score_match.group(4).strip()
                    status = "finished"
                    
            try:
                if ":" in time_str:
                    game_date_iso = f"{current_date_str}T{time_str}:00+09:00"
                else:
                    game_date_iso = f"{current_date_str}T18:30:00+09:00"
            except:
                game_date_iso = f"{current_date_str}T00:00:00+09:00"
                
            # Filter out exhibition games (Starts March 28th)
            if game_date_iso < "2026-03-28T00:00:00+09:00":
                continue
                
            game_sig = f"{home_id}-{away_id}-{game_date_iso}"
            if game_sig in seen_games:
                continue
            seen_games.add(game_sig)
                
            game = {
                "home_team_id": home_id,
                "away_team_id": away_id,
                "game_date": game_date_iso,
                "stadium": stadium,
                "status": status,
                "cancel_reason": cancel_reason,
                "home_score": home_score,
                "away_score": away_score
            }
            games.append(game)
            
        return games
    except Exception as e:
        print(f"Error parse API for month {month}: {e}")
        return []

def clear_existing_games():
    # Empty the table to replace mock data with real data
    # (Using a broad condition, like game_date >= 2026 - simple delete endpoint if possible)
    print("Clearing mock games...")
    try:
        delete_headers = headers.copy()
        delete_headers["Prefer"] = "return=minimal"
        
        # 1. Delete predictions first to avoid foreign key conflicts
        print("Clearing related predictions...")
        pred_url = f"{url}/rest/v1/predictions?id=gt.0"
        res_pred = requests.delete(pred_url, headers=delete_headers)
        if res_pred.status_code not in [200, 204]:
             print("Warning: failed to clear predictions", res_pred.text)
             
        # 2. Delete the games
        delete_url = f"{url}/rest/v1/games?id=gt.0" # Clear all games for clean state
        res = requests.delete(delete_url, headers=delete_headers)
        res.raise_for_status()
        print("All games cleared.")
    except Exception as e:
        print("Error clearing games:", e)

def seed_real_season_games(year):
    print(f"Starting Real Data Loader for KBO {year} Season...")
    team_dict = get_teams()
    
    clear_existing_games()
    
    all_games = []
    # 2026 Season starts late March
    for month in range(3, 11):
        month_games = fetch_real_kbo_month(year, month, team_dict)
        all_games.extend(month_games)
        
    print(f"Total {len(all_games)} REAL games found for {year} season.")
    
    success_count = 0
    error_count = 0
    
    for idx, game in enumerate(all_games):
        try:
            res = requests.post(f"{url}/rest/v1/games", json=game, headers=headers)
            res.raise_for_status()
            success_count += 1
        except Exception as e:
            error_count += 1
            if error_count < 5:
                print(f"Error inserting: {e}")

    print(f"Successfully inserted: {success_count} games.")
    print(f"Errors/Skipped: {error_count} games.")

if __name__ == "__main__":
    seed_real_season_games("2026")
