import requests
from bs4 import BeautifulSoup

url = "https://ko.wikipedia.org/wiki/2024%EB%85%84_KBO_%EB%A6%AC%EA%B7%B8"
res = requests.get(url)
soup = BeautifulSoup(res.text, "html.parser")
tables = soup.find_all("table", class_="wikitable")
for t in tables:
    header = t.find("tr")
    if not header: continue
    hdr_txt = header.text.strip()
    if "순위" in hdr_txt and "승" in hdr_txt and "패" in hdr_txt:
        print("Found Standings Table!")
        rows = t.find_all("tr")[1:4]
        for r in rows:
            print([c.text.strip() for c in r.find_all(["td", "th"])])
