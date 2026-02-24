import requests, os
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("GITHUB_TOKEN")
h = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

prs = [90580, 88901, 91823, 84632, 10980]
for p in prs:
    r1 = requests.get(f"https://api.github.com/repos/elastic/elasticsearch/pulls/{p}/comments", headers=h)
    r2 = requests.get(f"https://api.github.com/repos/elastic/elasticsearch/issues/{p}/comments", headers=h)
    print(f"PR #{p}: review={len(r1.json())}, issue={len(r2.json())}")
