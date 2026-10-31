#!/usr/bin/env python3
import os
import json
import re

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

with open(os.path.join(CSS_DIR, "manifest.json"), "r") as f:
    manifest = json.load(f)

def get_page_css_list(page):
    css_list = []
    for of in manifest["originalFileOrder"]:
        css_list.extend(of["parts"])
    # Add page-specific parts
    if page == "index.html":
        css_list.extend(["pages/home-01.css", "pages/home-02.css"])
    elif page == "materi.html":
        css_list.extend(["pages/materi-list-01.css", "pages/materi-list-02.css"])
    elif page == "login.html":
        css_list.append("pages/auth-01.css")
    # materi-detail.html has no page-specific CSS
    css_list.append(manifest["alwaysLast"])
    return css_list

def update_html(html_file, page_key):
    html_path = os.path.join(FRONTEND_DIR, html_file)
    if not os.path.exists(html_path):
        print(f"  WARNING: {html_file} not found")
        return

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    css_list = get_page_css_list(page_key)
    new_links = '\n'.join(f'    <link rel="stylesheet" href="css/{css}?v=2">' for css in css_list)

    # Find the CSS section (between "File styling utama" and </head>)
    # Replace everything between the comment and </head> with new links
    # Pattern: from <!-- File styling utama --> to </head>
    pattern = r'(<!-- File styling utama -->\n)(.*?)(\n  </head>)'
    replacement = r'\1' + new_links + r'\3'
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    if new_content != content:
        with open(html_path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_content)
        print(f"  Updated {html_file}: {len(css_list)} CSS links")
    else:
        print(f"  No change for {html_file}")

update_html("index.html", "index.html")
update_html("login.html", "login.html")
update_html("materi.html", "materi.html")
update_html("materi-detail.html", "materi-detail.html")