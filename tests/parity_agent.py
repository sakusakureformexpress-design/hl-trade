# ウォレットに渡した ApproveAgent の署名データが、公式 SDK が作るものと完全に同じか（ダイジェストまで）
import json, os, sys
from hyperliquid.utils.signing import user_signed_payload
from eth_account.messages import encode_typed_data
from eth_utils import keccak
typed = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'typed-approveAgent.json')))
m = typed['message']
types = [{"name":"hyperliquidChain","type":"string"},{"name":"agentAddress","type":"address"},{"name":"agentName","type":"string"},{"name":"nonce","type":"uint64"}]
action = {"type":"approveAgent","signatureChainId":"0xa4b1","hyperliquidChain":m['hyperliquidChain'],"agentAddress":m['agentAddress'],"agentName":m['agentName'],"nonce":m['nonce']}
sdk = user_signed_payload("HyperliquidTransaction:ApproveAgent", types, action)
sdk_msg = {k: sdk["message"][k] for k in ["hyperliquidChain","agentAddress","agentName","nonce"]}
def digest(t):
    e = encode_typed_data(full_message={"domain":t["domain"],"types":t["types"],"primaryType":t["primaryType"],"message":t["message"]})
    return keccak(b"\x19" + e.version + e.header + e.body).hex()
a = digest({"domain":typed["domain"],"types":typed["types"],"primaryType":typed["primaryType"],"message":typed["message"]})
b = digest({"domain":sdk["domain"],"types":sdk["types"],"primaryType":sdk["primaryType"],"message":sdk_msg})
same = typed["domain"] == sdk["domain"] and typed["types"] == sdk["types"] and typed["message"] == sdk_msg
print("ApproveAgent typed data == SDK:", same, "| digest match:", a == b)
sys.exit(0 if same and a == b else 1)
