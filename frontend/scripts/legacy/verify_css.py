#!/usr/bin/env python3
"""
Verify CSS splitting: concatenate split files and compare with originals.
"""

import os
import hashlib
import json

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

def read_file_bytes(filepath):
    with open(filepath, 'rb') as f:
        return f.read()

def concat_files(file_list, css_dir):
    result = b''
    for rel_path in file_list:
        full_path = os.path.join(css_dir, rel_path)
        if os.path.exists(full_path):
            result += read_file_bytes(full_path)
        else:
            print(f"  MISSING: {rel_path}")
    return result

def count_blocks(content):
    text = content.decode('utf-8') if isinstance(content, bytes) else content
    return {
        'braces': text.count('{'),
        'media': text.count('@media'),
        'keyframes': text.count('@keyframes'),
        'important': text.count('!important'),
    }

def verify_concat(original_bytes, split_files, css_dir, name):
    concatenated = concat_files(split_files, css_dir)
    orig_hash = hashlib.md5(original_bytes).hexdigest()
    concat_hash = hashlib.md5(concatenated).hexdigest()

    print(f"  {name}: orig={len(original_bytes)} concat={len(concatenated)} match={original_bytes==concatenated}")
    if original_bytes != concatenated:
        print(f"    Hashes: orig={orig_hash} concat={concat_hash}")
        orig_counts = count_blocks(original_bytes)
        concat_counts = count_blocks(concatenated)
        print(f"    Blocks: orig={orig_counts} concat={concat_counts}")
        # Find first diff
        for i, (o, c) in enumerate(zip(original_bytes, concatenated)):
            if o != c:
                print(f"    First diff at byte {i}")
                break
    return original_bytes == concatenated

# Load manifest
with open(os.path.join(CSS_DIR, "manifest.json"), 'r') as f:
    manifest = json.load(f)

print("=" * 60)
print("VERIFICATION: Original vs Split Files")
print("=" * 60)

all_ok = True

# Verify each original file
original_files = {}
for of in manifest["originalFileOrder"]:
    original_files[of["file"]] = of["parts"]

for fname, parts in original_files.items():
    orig_bytes = read_file_bytes(os.path.join(FRONTEND_DIR, fname))
    all_ok &= verify_concat(orig_bytes, parts, CSS_DIR, fname)

print("\n" + "=" * 60)
print("PAGE-LEVEL VERIFICATION")
print("=" * 60)

pages = {
    "index.html": ["style.css", "theme.css", "theme-extra.css", "home.css", "navbar.css"],
    "login.html": ["style.css", "theme.css", "theme-extra.css", "auth.css", "navbar.css"],
    "materi.html": ["style.css", "theme.css", "theme-extra.css", "materi-list.css", "navbar.css"],
    "materi-detail.html": ["style.css", "theme.css", "theme-extra.css", "navbar.css"],
}

for html_file, css_files in pages.items():
    print(f"\n=== Page: {html_file} ===")
    original_concat = b''
    for cf in css_files:
        original_concat += read_file_bytes(os.path.join(FRONTEND_DIR, cf))

    # Build split file list for this page
    split_list = []
    for of in manifest["originalFileOrder"]:
        split_list.extend(of["parts"])
    page_override = manifest["pageOverrides"].get(html_file)
    if page_override:
        split_list.append(page_override)
    split_list.append(manifest["alwaysLast"])

    new_concat = concat_files(split_list, CSS_DIR)

    if original_concat == new_concat:
        print(f"  OK IDENTICAL ({len(original_concat)} bytes)")
    else:
        print(f"  FAIL DIFFERENT")
        print(f"  Original: {len(original_concat)} bytes")
        print(f"  New:      {len(new_concat)} bytes")
        orig_counts = count_blocks(original_concat)
        new_counts = count_blocks(new_concat)
        print(f"  Blocks: orig={orig_counts} new={new_counts}")
        all_ok = False

print("\n" + "=" * 60)
print(f"OVERALL: {'ALL PASSED' if all_ok else 'SOME FAILED'}")
print("=" * 60)