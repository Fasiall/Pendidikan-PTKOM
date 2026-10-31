#!/usr/bin/env python3
"""
Split script.js into ~12 files in frontend/js/ preserving CRLF line endings.
"""

import os

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
SRC_FILE = os.path.join(FRONTEND_DIR, "script.js")
DST_DIR = os.path.join(FRONTEND_DIR, "js")

def read_file_preserve_newlines(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    if b'\r\n' in content:
        le = '\r\n'
    elif b'\n' in content:
        le = '\n'
    else:
        le = '\n'
    lines = content.decode('utf-8').splitlines(keepends=True)
    return lines, le, content

def write_file_preserve_newlines(filepath, lines, le):
    normalized = []
    for line in lines:
        if line.endswith('\r\n'):
            normalized.append(line)
        elif line.endswith('\n'):
            normalized.append(line[:-1] + le)
        else:
            normalized.append(line + le)
    with open(filepath, 'wb') as f:
        f.write(''.join(normalized).encode('utf-8'))

lines, le, _ = read_file_preserve_newlines(SRC_FILE)
print(f"Detected line ending: {'CRLF' if le == '\r\n' else 'LF'}")

# Section start lines (0-indexed)
sections = {
    "header_end": 27,    # line 27: blank line after header
    "dom": 28,           # line 28: (1) REFERENSI ELEMEN DOM
    "state": 130,        # line 131: (2) STATUS / VARIABEL GLOBAL
    "api": 149,          # line 150: (3) HELPER API + TOAST
    "nav": 392,          # line 393: (4) NAVIGASI ANTAR HALAMAN
    "decor": 473,        # line 474: (5) HIASAN: JUDUL & LATAR
    "quiz": 548,         # line 549: (6) LOGIKA KUIS
    "anim": 963,         # line 964: (7) ANIMASI & AUDIO INTERAKTIF
    "results": 1139,     # line 1140: (8) HALAMAN HASIL
    "auth": 1222,        # line 1223: (9) LOGIN & DASHBOARD GURU
    "admin": 1933,       # line 1934: (9b) KELOLA MATERI & SOAL (ADMIN)
    "init": 2884,        # line 2885: (11) INISIALISASI PROGRAM
    "end": len(lines),
}

# Header is lines 0-27 (indices 0-27): header comment + blank line
header = lines[:28]

# Define split plan
split_plan = [
    {"file": "js/01-dom-refs.js", "start": sections["dom"], "end": sections["state"], "prepend_header": True},
    {"file": "js/02-state.js", "start": sections["state"], "end": sections["api"]},
    {"file": "js/03-api-helpers.js", "start": sections["api"], "end": sections["nav"]},
    {"file": "js/04-navigation.js", "start": sections["nav"], "end": sections["decor"]},
    {"file": "js/05-decorations.js", "start": sections["decor"], "end": sections["quiz"]},
    {"file": "js/06a-quiz-render.js", "start": sections["quiz"], "end": sections["quiz"] + 207},
    {"file": "js/06b-quiz-answer.js", "start": sections["quiz"] + 207, "end": sections["anim"]},
    {"file": "js/07-animations.js", "start": sections["anim"], "end": sections["results"]},
    {"file": "js/08-results.js", "start": sections["results"], "end": sections["auth"]},
    {"file": "js/09a-auth.js", "start": sections["auth"], "end": sections["auth"] + 355},
    {"file": "js/09b-dashboard.js", "start": sections["auth"] + 355, "end": sections["admin"]},
    {"file": "js/10a-admin-materials.js", "start": sections["admin"], "end": sections["admin"] + 475},
    {"file": "js/10b-admin-questions.js", "start": sections["admin"] + 475, "end": sections["init"]},
    {"file": "js/11-init.js", "start": sections["init"], "end": sections["end"]},
]

for part in split_plan:
    content_lines = lines[part["start"]:part["end"]]
    if part.get("prepend_header"):
        content_lines = header + content_lines
    dst_path = os.path.join(FRONTEND_DIR, part["file"])
    write_file_preserve_newlines(dst_path, content_lines, le)
    print(f"Created {part['file']}: {len(content_lines)} lines")

print("\nDone!")