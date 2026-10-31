#!/usr/bin/env python3
import os
import re

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"

def fix_html(html_file):
    html_path = os.path.join(FRONTEND_DIR, html_file)
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix backslashes in CSS hrefs - replace \ with / in href attributes
    def repl(m):
        return m.group(0).replace('\\', '/')
    fixed = re.sub(r'href="[^"]*\\', repl, content)

    if fixed != content:
        with open(html_path, 'w', encoding='utf-8', newline='') as f:
            f.write(fixed)
        print(f"Fixed {html_file}")
    else:
        print(f"No changes needed for {html_file}")

for f in ['index.html', 'login.html', 'materi.html', 'materi-detail.html']:
    fix_html(f)