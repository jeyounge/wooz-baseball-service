import os
import requests
from bs4 import BeautifulSoup
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

scrape_headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

team_name_map = {
    "KIA": "KIA 타이거즈", "삼성": "삼성 라이온즈", "LG": "LG 트윈스",
    "두산": "두산 베어스", "KT": "KT 위즈", "kt": "KT 위즈",
    "SSG": "SSG 랜더스", "SK": "SSG 랜더스", "롯데": "롯데 자이언츠",
    "한화": "한화 이글스", "NC": "NC 다이노스", "키움": "키움 히어로즈",
    "넥센": "키움 히어로즈", 
}

def get_teams():
    res = requests.get(f"{url}/rest/v1/teams?select=id,name", headers=headers)
    res.raise_for_status()
    return {t['name']: t['id'] for t in res.json()}

def fetch_wiki_standings(year, team_dict):
    print(f"\nFetching {year} standings from Wikipedia...")
    res = requests.get(f"https://ko.wikipedia.org/wiki/{year}년_KBO_리그", headers=scrape_headers)
    soup = BeautifulSoup(res.text, "html.parser")
    tables = soup.find_all("table", class_="wikitable")
    
    standings_data = []
    
    for t in tables:
        header_row = t.find("tr")
        if not header_row: continue
        
        hdr_cols = [c.text.strip() for c in header_row.find_all(["th", "td"])]
        if "순위" not in hdr_cols or "승" not in hdr_cols or "패" not in hdr_cols:
            continue
            
        print(f"[{year}] Found standings table! Headers: {hdr_cols}")
        
        try:
            i_rank = hdr_cols.index("순위")
            i_team = hdr_cols.index("구단") if "구단" in hdr_cols else hdr_cols.index("팀명")
            i_games = hdr_cols.index("경기") if "경기" in hdr_cols else hdr_cols.index("경기수") if "경기수" in hdr_cols else 2
            i_wins = hdr_cols.index("승")
            i_draws = hdr_cols.index("무")
            i_losses = hdr_cols.index("패")
            i_winrate = hdr_cols.index("승률")
            i_behind = hdr_cols.index("승차") if "승차" in hdr_cols else hdr_cols.index("게임차") if "게임차" in hdr_cols else -1
        except Exception as e:
            print(f"[{year}] Header missing error: {e}")
            continue
            
        rows = t.find_all("tr")[1:]
        for row in rows:
            cols = [c.text.strip() for c in row.find_all(["th", "td"])]
            if len(cols) < len(hdr_cols)-2: continue
            if "합계" in cols[i_rank] or "총계" in cols[i_rank]: continue
            
            rank_str = cols[i_rank].replace("위", "").strip()
            if not rank_str.isdigit(): continue
            
            # Map Team
            team_raw = cols[i_team].split("[")[0].strip()
            mapped_name = next((full for k, full in team_name_map.items() if k in team_raw or full == team_raw), team_raw)
            if mapped_name not in team_dict: continue
            
            games_played = int(cols[i_games])
            wins = int(cols[i_wins])
            draws = int(cols[i_draws])
            losses = int(cols[i_losses])
            win_rate = float(cols[i_winrate])
            
            game_behind = 0.0
            if i_behind != -1 and cols[i_behind] and cols[i_behind] != "-":
                try: game_behind = float(cols[i_behind])
                except: pass
                
            standings_data.append({
                "year": year,
                "team_id": team_dict[mapped_name],
                "rank": int(rank_str),
                "games": games_played,
                "wins": wins, "losses": losses, "draws": draws,
                "win_rate": win_rate, "game_behind": game_behind
            })
        break # parsed standings table
    return standings_data

def clear_standings():
    print("Clearing all existing standings...")
    res = requests.delete(f"{url}/rest/v1/standings?year=gt.0", headers=headers)
    if res.status_code == 401:
        print("Warning: Delete unauthorized! Make sure RLS is allowing anon deletes, or table is empty.")
    else:
        res.raise_for_status()

if __name__ == "__main__":
    team_dict = get_teams()
    clear_standings()
    
    all_data = []
    # KBO Historical standings (2015 to 2024). 2026 hasn't started.
    for y in range(2015, 2025):
        all_data.extend(fetch_wiki_standings(y, team_dict))
        
    print(f"\nTotal {len(all_data)} standings records to insert DB.")
    
    success = 0
    errors = 0
    for record in all_data:
        try:
            res = requests.post(f"{url}/rest/v1/standings", json=record, headers=headers)
            if res.status_code == 401:
                # Need to instruct the user to update RLS!
                print(f"Insert error 401 Unauthorized for {record['year']} {record['rank']}위. Check RLS policy.")
                errors += 1
                break
            res.raise_for_status()
            success += 1
        except Exception as e:
            errors += 1
            if errors < 5: print(f"Insert error: {e}")
            
    print(f"\nFinished! Inserted: {success}, Errors: {errors}")
