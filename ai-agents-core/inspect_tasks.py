import os
import sys
import json
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(env_path):
    env_path = '.env'

with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

notion_key = os.environ.get('NOTION_API_KEY')
task_db_id = 'e8dc8924-7ab1-83f1-a029-01bde21e3dcf'
solvetech_id = '40bc8924-7ab1-8392-9273-810d192800af'

def req(url, method='GET', data=None):
    headers = {
        'Authorization': f'Bearer {notion_key}',
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    }
    r = urllib.request.Request(
        url,
        headers=headers,
        method=method,
        data=json.dumps(data).encode('utf-8') if data else None
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode('utf-8'))

query_res = req(f'https://api.notion.com/v1/databases/{task_db_id}/query', method='POST', data={
    'filter': {
        'property': 'Projetos',
        'relation': {
            'contains': solvetech_id
        }
    }
})

tasks = query_res.get('results', [])
print(f'Total de tasks vinculadas ao projeto SolveTechAi-Concent: {len(tasks)}')

parsed = []
for t in tasks:
    props = t.get('properties', {})
    title = ''
    task_date = None
    status = ''
    for p_name, p_val in props.items():
        if p_val.get('type') == 'title':
            title = ''.join([i.get('plain_text', '') for i in p_val.get('title', [])])
        elif p_val.get('type') == 'date' and p_val.get('date'):
            task_date = p_val['date'].get('start')
        elif p_val.get('type') == 'status':
            status = p_val.get('status', {}).get('name', '')
    if not task_date:
        task_date = t.get('created_time', '')[:10]
    parsed.append({'id': t['id'], 'title': title, 'date': task_date, 'status': status, 'url': t.get('url')})

# Ordenar por data crescente
parsed.sort(key=lambda x: x['date'])

for idx, p in enumerate(parsed, 1):
    print(f"{idx}. [{p['date']}] [{p['status']}] {p['title']} [ID: {p['id']}]")
