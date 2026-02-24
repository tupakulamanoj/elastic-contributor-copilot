import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_activity():
    token = os.getenv("GITHUB_TOKEN")
    repo = "elastic/elasticsearch"
    user = "tupakulamanoj"
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json"
    }
    
    print(f"Checking activity for user: @{user} on {repo}\n")
    
    # Check PRs by the user
    pr_url = f"https://api.github.com/search/issues?q=repo:{repo}+author:{user}+type:pr"
    pr_resp = requests.get(pr_url, headers=headers)
    if pr_resp.status_code == 200:
        prs = pr_resp.json().get("items", [])
        if prs:
            print(f"PRs created by @{user}:")
            for pr in prs:
                print(f"  - #{pr['number']}: {pr['title']} ({pr['html_url']})")
        else:
            print(f"No PRs created by @{user}.")
    else:
        print(f"Failed to check PRs: {pr_resp.status_code}")

    # Check comments on specific test PRs
    test_prs = [88901, 95103, 10980]
    for pr_num in test_prs:
        comment_url = f"https://api.github.com/repos/{repo}/issues/{pr_num}/comments"
        resp = requests.get(comment_url, headers=headers)
        if resp.status_code == 200:
            comments = resp.json()
            my_comments = [c for c in comments if c['user']['login'] == user]
            if my_comments:
                print(f"\nComments by @{user} on PR #{pr_num}:")
                for c in my_comments:
                    print(f"  - Comment #{c['id']}: {c['body'][:100]}...")
            else:
                print(f"No comments found for @{user} on PR #{pr_num}.")
        else:
            print(f"Failed to fetch comments for PR #{pr_num}: {resp.status_code}")

if __name__ == "__main__":
    check_activity()
