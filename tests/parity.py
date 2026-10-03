import json,sys,os
from hyperliquid.utils.signing import action_hash, sign_l1_action
from eth_account import Account
cases=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'parity-cases.json')))
bad=0
for i,c in enumerate(cases):
    act=c['action']
    h=action_hash(act,None,c['nonce'],None).hex()
    jh=c['hash'][2:] if c['hash'].startswith('0x') else c['hash']
    if h!=jh: bad+=1; print('hash mismatch',i,act['type']); continue
    w=Account.from_key(c['key']); sig=sign_l1_action(w,act,None,c['nonce'],None,True)
    if int(sig['r'],16)!=int(c['sig']['r'],16) or int(sig['s'],16)!=int(c['sig']['s'],16) or sig['v']!=c['sig']['v']: bad+=1; print('sig mismatch',i,act['type'])
    if w.address.lower()!=c['addr'].lower(): bad+=1; print('addr mismatch',i)
print(len(cases),'cases (order/cancel/modify/leverage/margin, with and without builder), mismatches:',bad)
