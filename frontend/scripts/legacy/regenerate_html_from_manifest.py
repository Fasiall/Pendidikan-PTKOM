#!/usr/bin/env python3
"""
Regenerate HTML files with correct CSS links from manifest.json
"""

import os
import json

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

with open(os.path.join(CSS_DIR, "manifest.json"), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

version = 4

def get_page_css_list(page):
    css_list = []
    for of in manifest["originalFileOrder"]:
        css_list.extend(of["parts"])
    page_override = manifest["pageOverrides"].get(page)
    if page_override:
        if isinstance(page_override, list):
            css_list.extend(page_override)
        else:
            css_list.append(page_override)
    css_list.append(manifest["alwaysLast"])
    return css_list

def update_html(html_file, page_key):
    html_path = os.path.join(FRONTEND_DIR, html_file)
    if not os.path.exists(html_path):
        print(f"WARNING: {html_file} not found")
        return

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    css_list = get_page_css_list(page_key)
    new_links = '\n'.join(f'    <link rel="stylesheet" href="css/{css}?v={version}">' for css in css_list)

    lines = content.splitlines(keepends=True)
    css_start = -1
    css_end = -1
    for i, line in enumerate(lines):
        if 'rel="stylesheet"' in line and '.css' in line:
            if css_start == -1:
                css_start = i
            css_end = i

    if css_start >= 0:
        new_lines = lines[:css_start] + [l + '\n' for l in new_links.split('\n')] + lines[css_end+1:]
        with open(html_path, 'w', encoding='utf-8', newline='') as f:
            f.write(''.join(new_lines))
        print(f"Updated {html_file}: {len(css_list)} CSS links")
    else:
        print(f"WARNING: No CSS links in {html_file}")

for f, k in [("index.html", "index.html"), ("login.html", "login.html"),
             ("materi.html", "materi.html"), ("materi-detail.html", "materi-detail.html")]:
    update_html(f, k)

print("Done!")