import json
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
query = sys.argv[1].strip()[:160]
url = 'https://map.baidu.com/?qt=s&c=75&wd=' + urllib.parse.quote(query)
try:
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=12) as response:
        data = json.load(response)
    content = data.get('content', [])
    if isinstance(content, dict):
        content = [content]
    places = [{'name': p.get('name'), 'address': p.get('addr', ''), 'geo': p.get('geo', '')}
              for p in content if p and p.get('name') and p.get('geo')]
    print(json.dumps({'places': places[:8]}, ensure_ascii=False))
except Exception as exc:
    print(json.dumps({'error': '地点搜索暂时不可用，请稍后重试，或直接输入经纬度。', 'detail': type(exc).__name__}, ensure_ascii=False))
