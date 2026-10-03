#!/bin/bash
# 全部の検証を順に回す。ひとつでも失敗したら止まらずに最後まで回して、結果を一覧にする
cd "$(dirname "$0")"
res=()
run(){ local n="$1"; shift; if "$@" > /tmp/hl-test-$n.log 2>&1; then res+=("✓ $n"); else res+=("✗ $n  (/tmp/hl-test-$n.log)"); fi; }
run smoke node smoke.js
run offline node offline.js
run i18n-scan node i18n_scan.js
run flows node flows.js en,ko,ja
run markets node markets.js
run switch node switch.js
run parity-js node parity.js
run parity-sdk bash -c "python3 parity.py | tee /dev/stderr | grep -q 'mismatches: 0'"
run wallet node wallet.js
run parity-agent bash -c "python3 parity_agent.py"
run mobile-pos node mobile_pos.js
run zoom-modal node zoom_modal.js
run indicators node indicators.js
run flip node flip.js
run guide node guide.js
run preview node preview.js
printf '%s\n' "${res[@]}"
