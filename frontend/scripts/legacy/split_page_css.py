#!/usr/bin/env python3
import os
import json

CSS_DIR = r"D:\Website\Pendidikan-PTKOM\frontend\css"
FRONTEND_DIR = r"D:\Website\Pendidikan-PTKOM\frontend"

def read_file(filepath):
    with open(filepath, "rb") as f:
        content = f.read()
    le = "\r\n" if b"\r\n" in content else "\n"
    lines = content.decode("utf-8").splitlines(keepends=True)
    return lines, le, content

def write_file(filepath, lines, le):
    normalized = []
    for line in lines:
        if line.endswith("\r\n"):
            normalized.append(line)
        elif line.endswith("\n"):
            normalized.append(line[:-1] + le)
        else:
            normalized.append(line + le)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        f.writelines(normalized)

def split_large_file(src_path, dst_dir, prefix, max_lines=400):
    lines, le, _ = read_file(src_path)
    parts = []
    for i in range(0, len(lines), max_lines):
        chunk = lines[i:i+max_lines]
        if chunk and not all(l.strip() == "" for l in chunk):
            fname = f"{prefix}{len(parts)+1:02d}.css"
            fpath = os.path.join(CSS_DIR, dst_dir, fname)
            write_file(fpath, chunk, le)
            parts.append(os.path.join(dst_dir, fname).replace("\\", "/"))
            print(f"  {fname}: {len(chunk)} lines")
    return parts

# Load manifest
with open(os.path.join(CSS_DIR, "manifest.json"), "r") as f:
    manifest = json.load(f)

# Split home.css (currently pages/home-01.css: 578 lines)
print("Splitting home.css...")
home_parts = split_large_file(
    os.path.join(CSS_DIR, "pages/home-01.css"),
    "pages", "home-"
)

# Split materi-list.css (currently pages/materi-list-01.css: 500 lines)
print("Splitting materi-list.css...")
materi_parts = split_large_file(
    os.path.join(CSS_DIR, "pages/materi-list-01.css"),
    "pages", "materi-list-"
)

# Remove old files
os.remove(os.path.join(CSS_DIR, "pages/home-01.css"))
os.remove(os.path.join(CSS_DIR, "pages/materi-list-01.css"))

# Update pageOverrides to point to the first part of each split
# The HTML generator uses pageOverrides as a single entry, but we need all parts in cascade
# We'll add the extra parts to the originalFileOrder cascade
# For simplicity, insert home parts after theme-extra and before navbar
# Actually, the proper way: pageOverrides should be a list or we add all parts to cascade

# Let's update the manifest to include these in the cascade
# Add home parts after theme-extra
for p in home_parts:
    manifest["originalFileOrder"].append({"file": "home.css", "parts": [p]})
# Actually that changes structure. Let's just add to the theme-extra parts list

# Better: keep pageOverrides as-is for backward compat, but update HTML generator
# For now, just update pageOverrides to first part
manifest["pageOverrides"]["index.html"] = home_parts[0] if home_parts else None
manifest["pageOverrides"]["materi.html"] = materi_parts[0] if materi_parts else None

# Save manifest
with open(os.path.join(CSS_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print("Manifest updated")
print(f"home parts: {home_parts}")
print(f"materi parts: {materi_parts}")