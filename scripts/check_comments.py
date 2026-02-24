import requests, os
from dotenv import load_dotenv
load_dotenv()

token = os.getenv("GITHUB_TOKEN")
headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

# 1. Check who we are
me = requests.get("https://api.github.com/user", headers=headers).json()
print(f"Authenticated as: {me.get('login', 'unknown')}")
print()

# 2. Search for Co-pilot comments across all repos
print("Searching for issue comments by you that mention 'Co-pilot'...")
print("=" * 60)

# Search issue comments authored by the user
r = requests.get(
    "https://api.github.com/search/issues",
    headers=headers,
    params={
        "q": f"commenter:{me['login']} is:issue",
        "sort": "updated",
        "order": "desc",
        "per_page": 10
    }
)
search = r.json()
print(f"Issues/PRs you commented on: {search.get('total_count', 0)}")
print()

# Check each for bot comments
checked = 0
bot_total = 0
for item in search.get("items", [])[:20]:
    repo_url = item["repository_url"]
    repo_name = repo_url.split("repos/")[1]
    number = item["number"]
    
    r2 = requests.get(
        f"https://api.github.com/repos/{repo_name}/issues/{number}/comments?per_page=100",
        headers=headers
    )
    comments = r2.json()
    if not isinstance(comments, list):
        continue
    
    my_comments = [c for c in comments if c["user"]["login"] == me["login"]]
    copilot_comments = [c for c in my_comments if "Co-pilot" in c["body"] or "Elastic Contributor" in c["body"]]
    
    if copilot_comments:
        print(f"📍 {repo_name} #{number}: {item['title'][:60]}")
        for c in copilot_comments:
            bot_total += 1
            preview = c["body"][:120].replace("\n", " ")
            print(f"   🤖 Comment #{bot_total} | {c['created_at']}")
            print(f"      {preview}...")
            print(f"      URL: {c['html_url']}")
            print()
    
    checked += 1

print("=" * 60)
print(f"Checked {checked} issues/PRs")
print(f"Total Co-pilot bot comments found: {bot_total}")

# 3. Also directly check elastic/elasticsearch PR 95103
print()
print("--- Direct check: elastic/elasticsearch #95103 ---")
r3 = requests.get(
    "https://api.github.com/repos/elastic/elasticsearch/issues/95103/comments?per_page=100",
    headers=headers
)
c95103 = r3.json()
my_on_95103 = [c for c in c95103 if isinstance(c, dict) and c.get("user", {}).get("login") == me["login"]]
print(f"Your comments on elastic/elasticsearch#95103: {len(my_on_95103)}")
for c in my_on_95103:
    print(f"  {c['created_at']}: {c['body'][:100].replace(chr(10), ' ')}...")
