#!/usr/bin/env python3
"""
Split script.js into ~12 files in frontend/js/
Based on section markers in the original file.
"""

import os

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
SRC_FILE = os.path.join(FRONTEND_DIR, "script.js")
DST_DIR = os.path.join(FRONTEND_DIR, "js")

with open(SRC_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Section start lines (0-indexed)
# These are the actual section markers in the file
sections = {
    "dom": 27,        # line 28: (1) REFERENSI ELEMEN DOM
    "state": 130,     # line 131: (2) STATUS / VARIABEL GLOBAL
    "api": 149,       # line 150: (3) HELPER API + TOAST
    "nav": 392,       # line 393: (4) NAVIGASI ANTAR HALAMAN
    "decor": 473,     # line 474: (5) HIASAN: JUDUL & LATAR
    "quiz": 548,      # line 549: (6) LOGIKA KUIS
    "anim": 963,      # line 964: (7) ANIMASI & AUDIO INTERAKTIF
    "results": 1139,  # line 1140: (8) HALAMAN HASIL
    "auth": 1222,     # line 1223: (9) LOGIN & DASHBOARD GURU
    "admin": 1933,    # line 1934: (9b) KELOLA MATERI & SOAL (ADMIN)
    "init": 2884,     # line 2885: (11) INISIALISASI PROGRAM
    "end": len(lines),
}

print("Section boundaries:")
for name, line in sections.items():
    print(f"  {name}: line {line+1}")

# Define split plan: map section ranges to output files
split_plan = [
    # File 1: DOM references
    {"file": "js/01-dom-refs.js", "start": sections["dom"], "end": sections["state"]},

    # File 2: Global state
    {"file": "js/02-state.js", "start": sections["state"], "end": sections["api"]},

    # File 3: API helpers + toast
    {"file": "js/03-api-helpers.js", "start": sections["api"], "end": sections["nav"]},

    # File 4: Navigation
    {"file": "js/04-navigation.js", "start": sections["nav"], "end": sections["decor"]},

    # File 5: Decorations
    {"file": "js/05-decorations.js", "start": sections["decor"], "end": sections["quiz"]},

    # File 6a: Quiz logic - first half (rendering, ~207 lines)
    {"file": "js/06a-quiz-render.js", "start": sections["quiz"], "end": sections["quiz"] + 207},

    # File 6b: Quiz logic - second half (answer handling, ~208 lines)
    {"file": "js/06b-quiz-answer.js", "start": sections["quiz"] + 207, "end": sections["anim"]},

    # File 7: Animations
    {"file": "js/07-animations.js", "start": sections["anim"], "end": sections["results"]},

    # File 8: Results page
    {"file": "js/08-results.js", "start": sections["results"], "end": sections["auth"]},

    # File 9a: Auth (login/register, ~355 lines)
    {"file": "js/09a-auth.js", "start": sections["auth"], "end": sections["auth"] + 355},

    # File 9b: Teacher dashboard (~356 lines)
    {"file": "js/09b-dashboard.js", "start": sections["auth"] + 355, "end": sections["admin"]},

    # File 10a: Admin - materials management (~475 lines)
    {"file": "js/10a-admin-materials.js", "start": sections["admin"], "end": sections["admin"] + 475},

    # File 10b: Admin - questions management (~476 lines)
    {"file": "js/10b-admin-questions.js", "start": sections["admin"] + 475, "end": sections["admin"] + 951},

    # File 10c: Admin - sets management (rest of admin section)
    {"file": "js/10c-admin-sets.js", "start": sections["admin"] + 951, "end": sections["init"]},

    # File 11: Initialization
    {"file": "js/11-init.js", "start": sections["init"], "end": sections["end"]},
]

# Write each file
for part in split_plan:
    content = ''.join(lines[part["start"]:part["end"]])
    # Ensure file ends with newline
    if not content.endswith('\n'):
        content += '\n'
    dst_path = os.path.join(FRONTEND_DIR, part["file"])
    with open(dst_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Created {part['file']}: {part['end']-part['start']} lines")

print("\nDone!")