#!/usr/bin/env python3
"""
Update HTML files to load split JS modules instead of script.js
"""

import os
import json

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"

with open(os.path.join(FRONTEND_DIR, "js", "manifest.json"), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

load_order = manifest["loadOrder"]
version = 11  # bump from v=10 to v=11

# Generate script tags
script_tags = '\n'.join(f'  <script src="{js}?v={version}"></script>' for js in load_order)

def update_html(html_file):
    html_path = os.path.join(FRONTEND_DIR, html_file)
    if not os.path.exists(html_path):
        print(f"WARNING: {html_file} not found")
        return

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace script.js reference
    lines = content.splitlines(keepends=True)

    # Find the script.js line
    script_idx = -1
    for i, line in enumerate(lines):
        if 'script.js' in line and 'src=' in line:
            script_idx = i
            break

    if script_idx >= 0:
        # Replace script.js with all the new module scripts
        new_lines = lines[:script_idx] + [l + '\n' for l in script_tags.split('\n')] + lines[script_idx+1:]
        with open(html_path, 'w', encoding='utf-8', newline='') as f:
            f.write(''.join(new_lines))
        print(f"Updated {html_file}: replaced script.js with {len(load_order)} modules")
    else:
        print(f"WARNING: No script.js found in {html_file}")

# Update index.html and login.html (they load script.js)
update_html("index.html")
update_html("login.html")

# materi.html and materi-detail.html load materi.js, not script.js
# We'll handle those in Phase C when we split materi.js

print("Done!")