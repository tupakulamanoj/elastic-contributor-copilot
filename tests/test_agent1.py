# test_agent1.py
from agents.agent1_context_retriever import process_issue

# Paste any real issue number from elastic/elasticsearch-py or your test repo
test_cases = [
    (1001, False),   # a real issue number
    (1002, True),    # a real PR number
]

for number, is_pr in test_cases:
    result = process_issue(number, is_pr=is_pr)
    print(result)
    print()
