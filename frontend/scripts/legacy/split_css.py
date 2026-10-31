#!/usr/bin/env python3
"""
Clean CSS splitting: each original file split independently at its natural boundaries.
Split at exact marker lines, no balance extension.
"""

import os
import json

FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

for subdir in ["style", "theme", "theme-extra", "pages", "layout", "components", "utilities"]:
    os.makedirs(os.path.join(CSS_DIR, subdir), exist_ok=True)

def read_file(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    le = '\r\n' if b'\r\n' in content else '\n'
    lines = content.decode('utf-8').splitlines(keepends=True)
    return lines, le, content

def write_file(filepath, lines, le):
    normalized = []
    for line in lines:
        if line.endswith('\r\n'):
            normalized.append(line)
        elif line.endswith('\n'):
            normalized.append(line[:-1] + le)
        else:
            normalized.append(line + le)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        f.writelines(normalized)

def split_chunk(lines, le, start, end, output_dir, prefix, created_list, max_lines=400):
    """Split a single chunk at exact boundaries, further split large chunks by @media only."""
    chunk = lines[start:end]
    if not chunk or all(l.strip() == '' for l in chunk):
        return

    def write_sub_chunk(sub_chunk, prefix_base):
        """Recursively split and write a chunk, handling large pieces."""
        if len(sub_chunk) <= max_lines:
            fname = f"{prefix_base}{len(created_list)+1:02d}.css"
            fpath = os.path.join(CSS_DIR, output_dir, fname)
            write_file(fpath, sub_chunk, le)
            created_list.append(os.path.join(output_dir, fname))
            print(f"  {fname}: {len(sub_chunk)} lines")
        else:
            # Find @media boundaries ONLY (not @keyframes)
            sub_bounds = [0]
            for j, line in enumerate(sub_chunk):
                if line.strip().startswith("@media"):
                    sub_bounds.append(j)
            sub_bounds.append(len(sub_chunk))
            sub_bounds = sorted(set(sub_bounds))

            if len(sub_bounds) <= 2:
                # No @media found: split by line count at ~350
                for j in range(0, len(sub_chunk), 350):
                    piece = sub_chunk[j:j+350]
                    if piece and not all(l.strip() == '' for l in piece):
                        fname = f"{prefix_base}{len(created_list)+1:02d}.css"
                        fpath = os.path.join(CSS_DIR, output_dir, fname)
                        write_file(fpath, piece, le)
                        created_list.append(os.path.join(output_dir, fname))
                        print(f"  {fname}: {len(piece)} lines")
            else:
                # Split at @media boundaries, then recursively handle each piece
                for k in range(len(sub_bounds) - 1):
                    sk = sub_bounds[k]
                    ek = sub_bounds[k + 1]
                    piece = sub_chunk[sk:ek]
                    if piece and not all(l.strip() == '' for l in piece):
                        write_sub_chunk(piece, prefix_base)

    write_sub_chunk(chunk, prefix)

def split_file_sections(lines, le, markers, section_map, extra_start_idx):
    """Generic section-based splitter at exact marker lines."""
    bounds = [0]
    for i, line in enumerate(lines):
        for m in markers:
            if m in line:
                bounds.append(i)
                break
    bounds.append(len(lines))
    bounds = sorted(set(bounds))

    created = []
    for bounds_idx, (out_dir, prefix) in section_map.items():
        if bounds_idx < len(bounds) - 1:
            split_chunk(lines, le, bounds[bounds_idx], bounds[bounds_idx + 1],
                       out_dir, prefix, created)

    for i in range(extra_start_idx, len(bounds) - 1):
        split_chunk(lines, le, bounds[i], bounds[i + 1],
                   "utilities", f"extra-{i - extra_start_idx + 1:02d}-", created)

    return created

# ============================================================
# 1. SPLIT style.css
# ============================================================
print("Splitting style.css...")
lines, le, _ = read_file(os.path.join(FRONTEND_DIR, "style.css"))

style_section_map = {
    0: ("style", "00-header-"),
    1: ("style", "01-root-vars-"),
    2: ("style", "02-reset-"),
    3: ("style", "03-ambient-"),
    4: ("style", "04-navbar-"),  # Keep for verification
    5: ("components", "01-buttons-"),
    6: ("layout", "01-page-shells-"),
    7: ("layout", "02-hero-"),
    8: ("components", "02-cards-"),
    9: ("components", "03-quiz-"),
    10: ("components", "04-results-"),
    11: ("components", "05-modals-"),
    12: ("pages", "01-auth-dashboard-"),
    13: ("pages", "02-materi-"),
    14: ("utilities", "01-responsive-"),
}

style_parts = split_file_sections(lines, le,
    ["/* --------------------------------------------------------------------------", "/* ========================================================================"],
    style_section_map, 15)

print(f"  style.css -> {len(style_parts)} parts")

# ============================================================
# 2. SPLIT theme.css
# ============================================================
print("\nSplitting theme.css...")
lines, le, _ = read_file(os.path.join(FRONTEND_DIR, "theme.css"))

bounds = [0]
for i, line in enumerate(lines):
    if "/* -------------------------------" in line and len(line.strip()) > 40:
        bounds.append(i)
bounds.append(len(lines))
bounds = sorted(set(bounds))

theme_names = [
    "01-dasar", "02-halaman", "03-tombol", "04-nav", "05-halaman-utama",
    "06-kuis", "07-hasil", "08-auth", "09-dashboard", "10-materi",
    "11-toast", "12-modal", "13-animasi", "14-responsif",
]

theme_parts = []
for i in range(min(len(bounds)-1, len(theme_names))):
    split_chunk(lines, le, bounds[i], bounds[i+1], "theme", f"{theme_names[i]}-", theme_parts)

if len(bounds) > len(theme_names) + 1:
    for i in range(len(theme_names), len(bounds)-1):
        split_chunk(lines, le, bounds[i], bounds[i+1], "theme", f"extra-{i-len(theme_names)+1:02d}-", theme_parts)

print(f"  theme.css -> {len(theme_parts)} parts")

# ============================================================
# 3. SPLIT theme-extra.css - GRUP 1-9 + header
# ============================================================
print("\nSplitting theme-extra.css...")
lines, le, _ = read_file(os.path.join(FRONTEND_DIR, "theme-extra.css"))

grup_bounds = [0]
for i, line in enumerate(lines):
    if "GRUP" in line and ":" in line:
        grup_bounds.append(i)
grup_bounds.append(len(lines))
grup_bounds = sorted(set(grup_bounds))

grup_names = [
    "00-header", "01-navbar-buttons-badge", "02-hero-mascot", "03-modal",
    "04-quiz-screen", "05-results-leaderboard", "06-marquee",
    "07-dashboard", "08-toast", "09-materi-register",
]

extra_parts = []
if len(grup_bounds) > 1:
    split_chunk(lines, le, grup_bounds[0], grup_bounds[1], "theme-extra", f"{grup_names[0]}-", extra_parts)

for i in range(1, min(len(grup_bounds), len(grup_names))):
    start = grup_bounds[i]
    end = grup_bounds[i+1] if i+1 < len(grup_bounds) else len(lines)
    split_chunk(lines, le, start, end, "theme-extra", f"{grup_names[i]}-", extra_parts)

print(f"  theme-extra.css -> {len(extra_parts)} parts")

# ============================================================
# 4. COPY page-specific files
# ============================================================
print("\nCopying page files...")
page_files = {}
for src, dst_dir, dst_prefix in [
    ("home.css", "pages", "home-"),
    ("materi-list.css", "pages", "materi-list-"),
    ("auth.css", "pages", "auth-"),
    ("navbar.css", "layout", "navbar-"),
]:
    src_path = os.path.join(FRONTEND_DIR, src)
    lines, le, _ = read_file(src_path)
    fname = f"{dst_prefix}01.css"
    fpath = os.path.join(CSS_DIR, dst_dir, fname)
    write_file(fpath, lines, le)
    page_files[src] = os.path.join(dst_dir, fname)
    print(f"  {src} -> {dst_dir}/{fname}: {len(lines)} lines")

# Fix trailing newlines for files that originally don't have them
# theme-extra.css and navbar.css end without newline
def strip_trailing_newline(filepath):
    with open(filepath, 'rb') as f:
        content = f.read()
    if content.endswith(b'\r\n'):
        content = content[:-2]
        with open(filepath, 'wb') as f:
            f.write(content)
        print(f"  Stripped trailing CRLF from {filepath}")

# Fix last part of theme-extra
if extra_parts:
    last_part = os.path.join(CSS_DIR, extra_parts[-1])
    strip_trailing_newline(last_part)

# Fix navbar.css
navbar_path = os.path.join(CSS_DIR, page_files["navbar.css"])
strip_trailing_newline(navbar_path)

# ============================================================
# 5. CREATE MANIFEST
# ============================================================
print("\nCreating manifest.json...")

manifest = {
    "version": "1.0",
    "description": "CSS cascade order. Each original file's parts are in sequence.",
    "originalFileOrder": [
        {"file": "style.css", "parts": style_parts},
        {"file": "theme.css", "parts": theme_parts},
        {"file": "theme-extra.css", "parts": extra_parts},
    ],
    "pageOverrides": {
        "index.html": page_files["home.css"],
        "login.html": page_files["auth.css"],
        "materi.html": page_files["materi-list.css"],
        "materi-detail.html": None,
        "register.html": page_files["auth.css"],
    },
    "alwaysLast": page_files["navbar.css"],
}

with open(os.path.join(CSS_DIR, "manifest.json"), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

total_parts = len(style_parts) + len(theme_parts) + len(extra_parts) + len(page_files)
print(f"  Total CSS parts: {total_parts}")

# ============================================================
# 6. UPDATE HTML FILES
# ============================================================
print("\nUpdating HTML files...")

def get_page_css_list(page):
    css_list = []
    for of in manifest["originalFileOrder"]:
        css_list.extend(of["parts"])
    if manifest["pageOverrides"].get(page):
        css_list.append(manifest["pageOverrides"][page])
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
    new_links = '\n'.join(f'    <link rel="stylesheet" href="css/{css.replace(os.sep, "/")}?v=2">' for css in css_list)

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
        print(f"  Updated {html_file}: {len(css_list)} CSS links")
    else:
        print(f"  WARNING: No CSS links in {html_file}")

update_html("index.html", "index.html")
update_html("login.html", "login.html")
update_html("materi.html", "materi.html")
update_html("materi-detail.html", "materi-detail.html")

print("\nDone!")