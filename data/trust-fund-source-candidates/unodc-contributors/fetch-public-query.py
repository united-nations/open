"""Read UNODC's public report query API; no authentication or private endpoint."""
import base64
from copy import deepcopy
import json
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parent
capture=json.loads((ROOT/'dashboard-live-capture/requests.json').read_text())
record=next(r for r in capture['records'] if r.get('file')=='response-018.json')
body=json.loads(record['postData'])
share=base64.b64decode(capture['target'].split('r=')[1]+'===')
resource=json.loads(share)['k']
col=lambda key:{'Column':{'Expression':{'SourceRef':{'Source':'f1'}},'Property':key}}
for year in [2023]:
 payload=deepcopy(body)
 q=payload['queries'][0]
 command=q['Query']['Commands'][0]['SemanticQueryDataShapeCommand']
 select=[dict(col(key),Name=f'FACT-Grants.{key}') for key in ['SPONSOR_TXT','YEAR','FUND_TYPE_B','FUND_TYPE']]
 select.append({'Aggregation':{'Expression':col('PLEDGED_AMT'),'Function':0},'Name':'Sum(FACT-Grants.PLEDGED_AMT)'})
 command['Query']['Select']=select
 command['Query']['OrderBy']=[{'Direction':1,'Expression':col('SPONSOR_TXT')}]
 command['Query']['Where']=[{'Condition':{'In':{'Expressions':[col('YEAR')],'Values':[[{'Literal':{'Value':f'{year}L'}}]]}}}]
 command['Binding']={'Primary':{'Groupings':[{'Projections':list(range(5))}]},'DataReduction':{'DataVolume':4,'Primary':{'Window':{'Count':10000}}},'Version':1}
 q.pop('CacheKey',None)
 (ROOT/f'live-{year}-request.json').write_text(json.dumps(payload,indent=2))
 response=requests.post(record['url'],json=payload,headers={'X-PowerBI-ResourceKey':resource,'Origin':'https://app.powerbi.com','Referer':'https://app.powerbi.com/'},timeout=90)
 response.raise_for_status()
 (ROOT/f'live-{year}-response.json').write_text(response.text)
 print(year,response.status_code,len(response.content),response.text[:200])
