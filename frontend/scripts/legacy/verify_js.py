#!/usr/bin/env python3
"""
Verify JS splitting: concatenate split files and compare with original.
"""

import os
import hashlib
import json

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
JS_DIR = os.path.join(FRONTEND_DIR, "js")

with open(os.path.join(JS_DIR, "manifest.json"), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

load_order = manifest["loadOrder"]
original_file = manifest["originalFile"]

def read_file_bytes(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

def concat_files(file_list, base_dir):
    result = b''
    for rel_path in file_list:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            result += read_file_bytes(full_path)
        else:
            print(f"  MISSING: {rel_path}")
    return result

def verify_concat(original_bytes, split_files, base_dir, name):
    concatenated = concat_files(split_files, base_dir)

    orig_hash = hashlib.md5(original_bytes).hexdigest()
    concat_hash = hashlib.md5(concatenated).hexdigest()

    match = original_bytes == concatenated
    print(f"  {name}: orig={len(original_bytes)} concat={len(concatenated)} match={match}")
    if not match:
        print(f"    Hashes: orig={orig_hash} concat={concat_hash}")
        # Find first diff
        for i, (o, c) in enumerate(zip(original_bytes, concatenated)):
            if o != c:
                print(f"    First diff at byte {i}: orig={o} ({chr(o) if 32 <= o < 127 else '?'}) concat={c} ({chr(c) if 32 <= c < 127 else '?'})")
                # Show context
                start = max(0, i-20)
                end = min(len(original_bytes), i+20)
                print(f"    Original context: {original_bytes[start:end]}")
                print(f"    Concat context: {concatenated[start:end]}")
                break
    return match

orig_bytes = read_file_bytes(os.path.join(FRONTEND_DIR, original_file))
print("=" * 60)
print("VERIFICATION: Original script.js vs Split Modules")
print("=" * 60)

ok = verify_concat(orig_bytes, load_order, FRONTEND_DIR, original_file)

print("=" * 60)
print(f"OVERALL: {'ALL PASSED' if ok else 'SOME FAILED'}")
print("=" * 60)