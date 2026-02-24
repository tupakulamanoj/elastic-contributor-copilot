import os
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

REPO = "elastic/elasticsearch"
BOT_MARKERS = ["Elastic Co-pilot", "Elastic Contributor Co-pilot"]

def find_and_delete_bot_comments(pr_number):
    url = f"https://api.github.com/repos/{REPO}/issues/{pr_number}/comments"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    
    comments = resp.json()
    deleted = 0
    
    for comment in comments:
        body = comment.get("body", "")
        if any(marker in body for marker in BOT_MARKERS):
            print(f"  Found bot comment #{comment['id']} by @{comment['user']['login']}")
            print(f"  Preview: {body[:100]}...")
            
            # Delete
            del_url = f"https://api.github.com/repos/{REPO}/issues/comments/{comment['id']}"
            del_resp = requests.delete(del_url, headers=HEADERS)
            if del_resp.status_code == 204:
                print(f"  ✅ Deleted!")
                deleted += 1
            else:
                print(f"  ❌ Failed to delete: {del_resp.status_code} {del_resp.text}")
    
    if deleted == 0:
        print(f"  No bot comments found on PR #{pr_number}")
    return deleted

if __name__ == "__main__":
    for pr in [88901, 95103, 10980]:
        print(f"\nPR #{pr}:")
        find_and_delete_bot_comments(pr)
